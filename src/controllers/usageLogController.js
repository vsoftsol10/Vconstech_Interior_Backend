// src/controllers/usageLogController.js
import { PrismaClient } from '../../generated/prisma/index.js';
import { determineProjectMaterialStatus } from '../utils/generateId.js';

const prisma = new PrismaClient();

/**
 * Get usage logs for a project
 * GET /api/usage-logs?projectId=1
 */
export const getUsageLogs = async (req, res) => {
  try {
    const { projectId } = req.query;
    const { companyId } = req.user;

    if (!projectId) {
      return res.status(400).json({ 
        success: false,
        error: 'Project ID is required' 
      });
    }

    // Verify project belongs to company
    const project = await prisma.project.findFirst({
      where: {
        id: parseInt(projectId),
        companyId
      }
    });

    if (!project) {
      return res.status(404).json({ 
        success: false,
        error: 'Project not found' 
      });
    }

    const usageLogs = await prisma.materialUsage.findMany({
      where: { projectId: parseInt(projectId) },
      include: {
        material: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      },
      orderBy: { date: 'desc' }
    });

    res.json({ 
      success: true,
      count: usageLogs.length,
      usageLogs 
    });
  } catch (error) {
    console.error('Get usage logs error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch usage logs',
      details: error.message 
    });
  }
};

/**
 * Create usage log
 * POST /api/usage-logs
 */
export const createUsageLog = async (req, res) => {
  try {
    const { id: userId, companyId } = req.user;
    const { projectId, materialId, quantity, remarks, date } = req.body;

    // Validation
    if (!projectId || !materialId || !quantity) {
      return res.status(400).json({ 
        success: false,
        error: 'Project ID, material ID, and quantity are required' 
      });
    }

    // Verify project belongs to company
    const project = await prisma.project.findFirst({
      where: {
        id: parseInt(projectId),
        companyId
      }
    });

    if (!project) {
      return res.status(404).json({ 
        success: false,
        error: 'Project not found' 
      });
    }

    // Check if material is assigned to project
    const projectMaterial = await prisma.projectMaterial.findFirst({
      where: {
        projectId: parseInt(projectId),
        materialId: parseInt(materialId)
      }
    });

    if (!projectMaterial) {
      return res.status(400).json({ 
        success: false,
        error: 'Material is not assigned to this project' 
      });
    }

    const usageQuantity = parseFloat(quantity);
    const newUsed = projectMaterial.used + usageQuantity;

    // Warning if exceeds assigned (but still allow it)
    let warning = null;
    if (newUsed > projectMaterial.assigned) {
      warning = `Usage exceeds assigned quantity. Assigned: ${projectMaterial.assigned}, Used: ${newUsed}`;
    }

    // Create usage log and update project material in transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create usage log
      const usageLog = await tx.materialUsage.create({
        data: {
          projectId: parseInt(projectId),
          materialId: parseInt(materialId),
          userId,
          quantity: usageQuantity,
          remarks: remarks || null,
          date: date ? new Date(date) : new Date()
        },
        include: {
          material: true,
          user: {
            select: {
              name: true,
              email: true
            }
          }
        }
      });

      // Update project material used quantity
      const newStatus = determineProjectMaterialStatus(projectMaterial.assigned, newUsed);
      
      await tx.projectMaterial.update({
        where: { id: projectMaterial.id },
        data: {
          used: newUsed,
          status: newStatus
        }
      });

      return usageLog;
    });

    res.status(201).json({ 
      success: true,
      message: 'Usage logged successfully',
      warning,
      usageLog: result 
    });
  } catch (error) {
    console.error('Create usage log error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to log usage',
      details: error.message 
    });
  }
};

/**
 * Update usage log
 * PUT /api/usage-logs/:id
 */
export const updateUsageLog = async (req, res) => {
  try {
    const { id } = req.params;
    const { companyId } = req.user;
    const { quantity, remarks, date } = req.body;

    const existingLog = await prisma.materialUsage.findUnique({
      where: { id: parseInt(id) },
      include: {
        project: true,
        material: true
      }
    });

    if (!existingLog) {
      return res.status(404).json({ 
        success: false,
        error: 'Usage log not found' 
      });
    }

    if (existingLog.project.companyId !== companyId) {
      return res.status(403).json({ 
        success: false,
        error: 'Unauthorized' 
      });
    }

    // Update in transaction
    const result = await prisma.$transaction(async (tx) => {
      const oldQuantity = existingLog.quantity;
      const newQuantity = quantity !== undefined ? parseFloat(quantity) : oldQuantity;
      const quantityDiff = newQuantity - oldQuantity;

      // Update usage log
      const updatedLog = await tx.materialUsage.update({
        where: { id: parseInt(id) },
        data: {
          quantity: newQuantity,
          remarks: remarks !== undefined ? remarks : existingLog.remarks,
          date: date ? new Date(date) : existingLog.date
        },
        include: {
          material: true,
          user: {
            select: {
              name: true,
              email: true
            }
          }
        }
      });

      // Update project material if quantity changed
      if (quantityDiff !== 0) {
        const projectMaterial = await tx.projectMaterial.findFirst({
          where: {
            projectId: existingLog.projectId,
            materialId: existingLog.materialId
          }
        });

        if (projectMaterial) {
          const newUsed = projectMaterial.used + quantityDiff;
          const newStatus = determineProjectMaterialStatus(projectMaterial.assigned, newUsed);
          
          await tx.projectMaterial.update({
            where: { id: projectMaterial.id },
            data: {
              used: newUsed,
              status: newStatus
            }
          });
        }
      }

      return updatedLog;
    });

    res.json({ 
      success: true,
      message: 'Usage log updated successfully',
      usageLog: result 
    });
  } catch (error) {
    console.error('Update usage log error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to update usage log',
      details: error.message 
    });
  }
};

/**
 * Delete usage log
 * DELETE /api/usage-logs/:id
 */
export const deleteUsageLog = async (req, res) => {
  try {
    const { id } = req.params;
    const { companyId } = req.user;

    const existingLog = await prisma.materialUsage.findUnique({
      where: { id: parseInt(id) },
      include: {
        project: true
      }
    });

    if (!existingLog) {
      return res.status(404).json({ 
        success: false,
        error: 'Usage log not found' 
      });
    }

    if (existingLog.project.companyId !== companyId) {
      return res.status(403).json({ 
        success: false,
        error: 'Unauthorized' 
      });
    }

    // Delete in transaction
    await prisma.$transaction(async (tx) => {
      // Delete usage log
      await tx.materialUsage.delete({
        where: { id: parseInt(id) }
      });

      // Update project material
      const projectMaterial = await tx.projectMaterial.findFirst({
        where: {
          projectId: existingLog.projectId,
          materialId: existingLog.materialId
        }
      });

      if (projectMaterial) {
        const newUsed = Math.max(0, projectMaterial.used - existingLog.quantity);
        const newStatus = determineProjectMaterialStatus(projectMaterial.assigned, newUsed);
        
        await tx.projectMaterial.update({
          where: { id: projectMaterial.id },
          data: {
            used: newUsed,
            status: newStatus
          }
        });
      }
    });

    res.json({ 
      success: true,
      message: 'Usage log deleted successfully' 
    });
  } catch (error) {
    console.error('Delete usage log error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to delete usage log',
      details: error.message 
    });
  }
};