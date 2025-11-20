import { PrismaClient } from '../../generated/prisma/index.js';
import { generateRequestId, generateMaterialId, createNotification } from '../utils/generateId.js';

const prisma = new PrismaClient();

export const getMyRequests = async (req, res) => {
  try {
    const userId = req.user?.id || req.user?.userId;
    
    if (!userId) {
      return res.status(400).json({ 
        success: false,
        error: 'User ID not found in request'
      });
    }

    console.log('Fetching requests for user ID:', userId);

    // ✅ FIX: employeeId is Int, not String
    const requests = await prisma.materialRequest.findMany({
      where: { employeeId: parseInt(userId) },
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
    
    console.log('📝 Creating request with data:', req.body);
    console.log('👤 User ID:', userId);
    
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

    const request = await prisma.materialRequest.create({
      data: {
        requestId,
        employeeId: parseInt(userId), // ✅ FIX: Convert to Int
        name,
        category,
        unit,
        defaultRate: parseFloat(defaultRate),
        vendor: vendor || null,
        description: description || null,
        type,
        projectId: projectId ? parseInt(projectId) : null,
        materialId: materialId ? parseInt(materialId) : null,
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

    console.log('✅ Request created successfully:', request.id);

    // Create notification
    await createNotification(
      parseInt(userId), // ✅ FIX: Convert to Int
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
    console.error('❌ Create material request error:', error);
    console.error('Error details:', error.message);
    res.status(500).json({ 
      success: false,
      error: 'Failed to create material request',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};
// Add this function to your materialRequestController.js

export const getAllRequests = async (req, res) => {
  try {
    const { companyId } = req.user;

    if (!companyId) {
      return res.status(400).json({ 
        success: false,
        error: 'Company ID not found' 
      });
    }

    console.log('Fetching all requests for company:', companyId);

    // Fetch ALL requests (not just pending) for the company
    const requests = await prisma.materialRequest.findMany({
      where: {
        employee: {
          companyId: String(companyId)
        }
      },
      include: {
        employee: {
          select: {
            id: true,
            name: true,
            empId: true
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
        },
        reviewer: {
          select: {
            id: true,
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

    console.log(`Found ${requestsWithProjectName.length} total requests`);

    res.json({ 
      success: true,
      count: requestsWithProjectName.length,
      requests: requestsWithProjectName 
    });
  } catch (error) {
    console.error('Get all requests error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch requests',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};
export const approveMaterialRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const { approvalNotes } = req.body;
    
    console.log('📝 Approving request ID:', id);
    console.log('👤 Request user:', req.user);
    
    // ✅ FIX: Use engineerId instead of user id
    const reviewerId = req.user?.engineerId;
    const { companyId } = req.user;

    if (!reviewerId) {
      return res.status(403).json({ 
        success: false,
        error: 'Your account is not linked to an engineer profile. Please contact administrator.' 
      });
    }

    if (!companyId) {
      return res.status(400).json({ 
        success: false,
        error: 'Company ID not found' 
      });
    }
    
    console.log('✅ Reviewer Engineer ID:', reviewerId);

    const request = await prisma.materialRequest.findUnique({
      where: { id: parseInt(id) },
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
        where: { id: parseInt(id) },
        data: {
          status: 'APPROVED',
          reviewDate: new Date(),
          approvalNotes: approvalNotes || null,
          reviewedBy: reviewerId // ✅ NOW THIS IS AN INTEGER (Engineer ID)
        },
        include: {
          employee: true,
          project: true,
          material: true,
          reviewer: true
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
            companyId: String(companyId)
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
            companyId: String(companyId)
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
      request.employeeId,
      `Your request for "${request.name}" has been approved`,
      'SUCCESS'
    );

    console.log('✅ Request approved successfully');

    res.json({ 
      success: true,
      message: 'Request approved successfully',
      request: result 
    });
  } catch (error) {
    console.error('❌ Approve request error:', error);
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
    const { rejectionReason } = req.body;
    
    console.log('📝 Rejecting request ID:', id);
    console.log('👤 Request user:', req.user);
    
    // ✅ FIX: Use engineerId instead of user id
    const reviewerId = req.user?.engineerId;
    const { companyId } = req.user;

    if (!reviewerId) {
      return res.status(403).json({ 
        success: false,
        error: 'Your account is not linked to an engineer profile. Please contact administrator.' 
      });
    }

    if (!companyId) {
      return res.status(400).json({ 
        success: false,
        error: 'Company ID not found' 
      });
    }

    if (!rejectionReason || !rejectionReason.trim()) {
      return res.status(400).json({ 
        success: false,
        error: 'Rejection reason is required' 
      });
    }
    
    console.log('✅ Reviewer Engineer ID:', reviewerId);

    const request = await prisma.materialRequest.findUnique({
      where: { id: parseInt(id) },
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
      where: { id: parseInt(id) },
      data: {
        status: 'REJECTED',
        reviewDate: new Date(),
        rejectionReason: rejectionReason.trim(),
        reviewedBy: reviewerId // ✅ NOW THIS IS AN INTEGER (Engineer ID)
      },
      include: {
        employee: true,
        project: true,
        material: true,
        reviewer: true
      }
    });

    await createNotification(
      request.employeeId,
      `Your request for "${request.name}" has been rejected: ${rejectionReason}`,
      'ERROR'
    );

    console.log('✅ Request rejected successfully');

    res.json({ 
      success: true,
      message: 'Request rejected successfully',
      request: updatedRequest 
    });
  } catch (error) {
    console.error('❌ Reject request error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to reject request',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};