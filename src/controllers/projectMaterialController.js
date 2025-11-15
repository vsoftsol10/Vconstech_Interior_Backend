// src/controllers/projectMaterialController.js
import { PrismaClient } from '../../generated/prisma/index.js';
import { determineProjectMaterialStatus } from '../utils/generateId.js';

const prisma = new PrismaClient();

/**
 * Get all materials for a project
 * GET /api/project-materials/:projectId
 */
export const getProjectMaterials = async (req, res) => {
  try {
    const { projectId } = req.params;
    const { companyId } = req.user;

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

    const projectMaterials = await prisma.projectMaterial.findMany({
      where: { projectId: parseInt(projectId) },
      include: {
        material: true
      },
      orderBy: { createdAt: 'desc' }
    });

    // Add remaining calculation
    const materialsWithRemaining = projectMaterials.map(pm => ({
      ...pm,
      remaining: pm.assigned - pm.used
    }));

    res.json({ 
      success: true,
      count: materialsWithRemaining.length,
      projectMaterials: materialsWithRemaining 
    });
  } catch (error) {
    console.error('Get project materials error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch project materials',
      details: error.message 
    });
  }
};

/**
 * Add material to project (Admin approval creates this)
 * POST /api/project-materials
 */
export const addMaterialToProject = async (req, res) => {
  try {
    const { companyId } = req.user;
    const { projectId, materialId, assigned } = req.body;

    // Validation
    if (!projectId || !materialId || !assigned) {
      return res.status(400).json({ 
        success: false,
        error: 'Project ID, material ID, and assigned quantity are required' 
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

    // Verify material belongs to company
    const material = await prisma.material.findFirst({
      where: {
        id: parseInt(materialId),
        companyId
      }
    });

    if (!material) {
      return res.status(404).json({ 
        success: false,
        error: 'Material not found' 
      });
    }

    // Check if material already assigned to project
    const existing = await prisma.projectMaterial.findFirst({
      where: {
        projectId: parseInt(projectId),
        materialId: parseInt(materialId)
      }
    });

    if (existing) {
      return res.status(400).json({ 
        success: false,
        error: 'Material already assigned to this project' 
      });
    }

    const projectMaterial = await prisma.projectMaterial.create({
      data: {
        projectId: parseInt(projectId),
        materialId: parseInt(materialId),
        assigned: parseFloat(assigned),
        used: 0,
        status: 'NOT_USED'
      },
      include: {
        material: true,
        project: true
      }
    });

    res.status(201).json({ 
      success: true,
      message: 'Material added to project successfully',
      projectMaterial 
    });
  } catch (error) {
    console.error('Add material to project error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to add material to project',
      details: error.message 
    });
  }
};

/**
 * Update project material quantity
 * PUT /api/project-materials/:id
 */
export const updateProjectMaterial = async (req, res) => {
  try {
    const { id } = req.params;
    const { companyId } = req.user;
    const { assigned, used } = req.body;

    // Get project material with project info
    const projectMaterial = await prisma.projectMaterial.findUnique({
      where: { id: parseInt(id) },
      include: {
        project: true
      }
    });

    if (!projectMaterial) {
      return res.status(404).json({ 
        success: false,
        error: 'Project material not found' 
      });
    }

    // Verify project belongs to company
    if (projectMaterial.project.companyId !== companyId) {
      return res.status(403).json({ 
        success: false,
        error: 'Unauthorized' 
      });
    }

    const newAssigned = assigned !== undefined ? parseFloat(assigned) : projectMaterial.assigned;
    const newUsed = used !== undefined ? parseFloat(used) : projectMaterial.used;

    // Determine new status
    const newStatus = determineProjectMaterialStatus(newAssigned, newUsed);

    const updated = await prisma.projectMaterial.update({
      where: { id: parseInt(id) },
      data: {
        assigned: newAssigned,
        used: newUsed,
        status: newStatus
      },
      include: {
        material: true
      }
    });

    res.json({ 
      success: true,
      message: 'Project material updated successfully',
      projectMaterial: {
        ...updated,
        remaining: newAssigned - newUsed
      }
    });
  } catch (error) {
    console.error('Update project material error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to update project material',
      details: error.message 
    });
  }
};

/**
 * Remove material from project
 * DELETE /api/project-materials/:id
 */
export const removeProjectMaterial = async (req, res) => {
  try {
    const { id } = req.params;
    const { companyId } = req.user;

    // Get project material with project info
    const projectMaterial = await prisma.projectMaterial.findUnique({
      where: { id: parseInt(id) },
      include: {
        project: true
      }
    });

    if (!projectMaterial) {
      return res.status(404).json({ 
        success: false,
        error: 'Project material not found' 
      });
    }

    // Verify project belongs to company
    if (projectMaterial.project.companyId !== companyId) {
      return res.status(403).json({ 
        success: false,
        error: 'Unauthorized' 
      });
    }

    // Check if material has been used
    if (projectMaterial.used > 0) {
      return res.status(400).json({ 
        success: false,
        error: 'Cannot remove material that has usage records' 
      });
    }

    await prisma.projectMaterial.delete({
      where: { id: parseInt(id) }
    });

    res.json({ 
      success: true,
      message: 'Material removed from project successfully' 
    });
  } catch (error) {
    console.error('Remove project material error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to remove material from project',
      details: error.message 
    });
  }
};