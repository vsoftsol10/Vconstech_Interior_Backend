import { PrismaClient } from '../../generated/prisma/index.js';
import { generateRequestId, generateMaterialId, createNotification } from '../utils/generateId.js';

const prisma = new PrismaClient();

export const getMyRequests = async (req, res) => {
  try {
    const userId = req.user?.id || req.user?.userId;
    
    if (!userId) {
      return res.status(400).json({ 
        success: false,
        error: 'User ID not found in request',
        debug: { user: req.user }
      });
    }

    console.log('Fetching requests for user ID:', userId);

    // ✅ FIX: Keep as string, don't convert to Int
    const requests = await prisma.materialRequest.findMany({
      where: { employeeId: String(userId) },
      include: {
        project: {
          select: {
            id: true,
            name: true,
            projectId: true
          }
        },
        material: {
          select: {
            id: true,
            materialId: true,
            name: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    }).catch(err => {
      console.error('Prisma query error:', err);
      return [];
    });

    const requestsWithProjectName = requests.map(req => ({
      ...req,
      projectName: req.project?.name || null
    }));

    res.json({ 
      success: true,
      count: requestsWithProjectName.length,
      requests: requestsWithProjectName 
    });
  } catch (error) {
    console.error('Get my requests error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch requests',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

export const getPendingRequests = async (req, res) => {
  try {
    const { companyId } = req.user;

    if (!companyId) {
      return res.status(400).json({ 
        success: false,
        error: 'Company ID not found' 
      });
    }

    const requests = await prisma.materialRequest.findMany({
      where: {
        status: 'PENDING',
        employee: {
          companyId: String(companyId)
        }
      },
      include: {
        employee: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        project: {
          select: {
            id: true,
            name: true,
            projectId: true
          }
        },
        material: {
          select: {
            id: true,
            materialId: true,
            name: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    }).catch(err => {
      console.error('Prisma query error:', err);
      return [];
    });

    const requestsWithProjectName = requests.map(req => ({
      ...req,
      projectName: req.project?.name || null
    }));

    res.json({ 
      success: true,
      count: requestsWithProjectName.length,
      requests: requestsWithProjectName 
    });
  } catch (error) {
    console.error('Get pending requests error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch pending requests',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

export const createMaterialRequest = async (req, res) => {
  try {
    const userId = req.user?.id || req.user?.userId;
    
    if (!userId) {
      return res.status(400).json({ 
        success: false,
        error: 'User ID not found' 
      });
    }

    const { 
      name, category, unit, defaultRate, vendor, 
      description, type, projectId, materialId, quantity 
    } = req.body;

    if (!name || !category || !unit || !defaultRate || !type) {
      return res.status(400).json({ 
        success: false,
        error: 'Name, category, unit, defaultRate, and type are required' 
      });
    }

    if (!['GLOBAL', 'PROJECT', 'PROJECT_MATERIAL'].includes(type)) {
      return res.status(400).json({ 
        success: false,
        error: 'Invalid request type' 
      });
    }

    if (type === 'PROJECT' && (!projectId || !quantity)) {
      return res.status(400).json({ 
        success: false,
        error: 'Project ID and quantity are required for project-specific materials' 
      });
    }

    if (type === 'PROJECT_MATERIAL' && (!projectId || !materialId || !quantity)) {
      return res.status(400).json({ 
        success: false,
        error: 'Project ID, material ID, and quantity are required' 
      });
    }

    const requestId = await generateRequestId();

    // ✅ Determine if projectId/materialId should be Int or String
    const projectIdValue = projectId ? (isNaN(projectId) ? projectId : parseInt(projectId)) : null;
    const materialIdValue = materialId ? (isNaN(materialId) ? materialId : parseInt(materialId)) : null;

    const request = await prisma.materialRequest.create({
      data: {
        requestId,
        employeeId: String(userId), // ✅ Keep as string
        name,
        category,
        unit,
        defaultRate: parseFloat(defaultRate),
        vendor: vendor || null,
        description: description || null,
        type,
        projectId: projectIdValue,
        materialId: materialIdValue,
        quantity: quantity ? parseFloat(quantity) : null,
        status: 'PENDING',
        requestDate: new Date()
      },
      include: {
        project: {
          select: {
            name: true
          }
        }
      }
    });

    await createNotification(
      String(userId), // ✅ Keep as string
      `Material request for "${name}" has been submitted for approval`,
      'INFO'
    );

    res.status(201).json({ 
      success: true,
      message: 'Material request submitted successfully',
      request: {
        ...request,
        projectName: request.project?.name || null
      }
    });
  } catch (error) {
    console.error('Create material request error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to create material request',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

export const approveMaterialRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const reviewerId = req.user?.id || req.user?.userId;
    const { companyId } = req.user;
    const { approvalNotes } = req.body;

    if (!reviewerId || !companyId) {
      return res.status(400).json({ 
        success: false,
        error: 'User information not found' 
      });
    }

    const requestIdValue = isNaN(id) ? id : parseInt(id);

    const request = await prisma.materialRequest.findUnique({
      where: { id: requestIdValue },
      include: {
        employee: true,
        project: true
      }
    });

    if (!request) {
      return res.status(404).json({ 
        success: false,
        error: 'Request not found' 
      });
    }

    if (request.employee.companyId !== String(companyId)) {
      return res.status(403).json({ 
        success: false,
        error: 'Unauthorized' 
      });
    }

    if (request.status !== 'PENDING') {
      return res.status(400).json({ 
        success: false,
        error: 'Request has already been reviewed' 
      });
    }

    const result = await prisma.$transaction(async (tx) => {
      const updatedRequest = await tx.materialRequest.update({
        where: { id: requestIdValue },
        data: {
          status: 'APPROVED',
          reviewDate: new Date(),
          approvalNotes: approvalNotes || null,
          reviewedBy: String(reviewerId) // ✅ Keep as string
        }
      });

      if (request.type === 'GLOBAL') {
        const materialId = await generateMaterialId();
        await tx.material.create({
          data: {
            materialId,
            name: request.name,
            category: request.category,
            unit: request.unit,
            defaultRate: request.defaultRate,
            vendor: request.vendor,
            description: request.description,
            companyId: String(companyId) // ✅ Keep as string
          }
        });
      } else if (request.type === 'PROJECT') {
        const materialId = await generateMaterialId();
        const newMaterial = await tx.material.create({
          data: {
            materialId,
            name: request.name,
            category: request.category,
            unit: request.unit,
            defaultRate: request.defaultRate,
            vendor: request.vendor,
            description: request.description,
            companyId: String(companyId) // ✅ Keep as string
          }
        });

        await tx.projectMaterial.create({
          data: {
            projectId: request.projectId,
            materialId: newMaterial.id,
            assigned: request.quantity,
            used: 0,
            status: 'NOT_USED'
          }
        });
      } else if (request.type === 'PROJECT_MATERIAL') {
        await tx.projectMaterial.create({
          data: {
            projectId: request.projectId,
            materialId: request.materialId,
            assigned: request.quantity,
            used: 0,
            status: 'NOT_USED'
          }
        });
      }

      return updatedRequest;
    });

    await createNotification(
      request.employeeId, // Already a string from DB
      `Your request for "${request.name}" has been approved`,
      'SUCCESS'
    );

    res.json({ 
      success: true,
      message: 'Request approved successfully',
      request: result 
    });
  } catch (error) {
    console.error('Approve request error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to approve request',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

export const rejectMaterialRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const reviewerId = req.user?.id || req.user?.userId;
    const { companyId } = req.user;
    const { rejectionReason } = req.body;

    if (!reviewerId || !companyId) {
      return res.status(400).json({ 
        success: false,
        error: 'User information not found' 
      });
    }

    if (!rejectionReason) {
      return res.status(400).json({ 
        success: false,
        error: 'Rejection reason is required' 
      });
    }

    const requestIdValue = isNaN(id) ? id : parseInt(id);

    const request = await prisma.materialRequest.findUnique({
      where: { id: requestIdValue },
      include: {
        employee: true
      }
    });

    if (!request) {
      return res.status(404).json({ 
        success: false,
        error: 'Request not found' 
      });
    }

    if (request.employee.companyId !== String(companyId)) {
      return res.status(403).json({ 
        success: false,
        error: 'Unauthorized' 
      });
    }

    if (request.status !== 'PENDING') {
      return res.status(400).json({ 
        success: false,
        error: 'Request has already been reviewed' 
      });
    }

    const updatedRequest = await prisma.materialRequest.update({
      where: { id: requestIdValue },
      data: {
        status: 'REJECTED',
        reviewDate: new Date(),
        rejectionReason,
        reviewedBy: String(reviewerId) // ✅ Keep as string
      }
    });

    await createNotification(
      request.employeeId, // Already a string from DB
      `Your request for "${request.name}" has been rejected`,
      'ERROR'
    );

    res.json({ 
      success: true,
      message: 'Request rejected successfully',
      request: updatedRequest 
    });
  } catch (error) {
    console.error('Reject request error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to reject request',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};