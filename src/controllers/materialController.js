// src/controllers/materialController.js
import { PrismaClient } from '../../generated/prisma/index.js';
import { generateMaterialId } from '../utils/generateId.js';

const prisma = new PrismaClient();

/**
 * Get all materials for a company
 * GET /api/materials
 */
export const getAllMaterials = async (req, res) => {
  try {
    const { companyId } = req.user;
    const { category, search } = req.query;

    const where = { companyId };

    // Filter by category
    if (category && category !== 'All') {
      where.category = category;
    }

    // Search by name or vendor
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { vendor: { contains: search, mode: 'insensitive' } }
      ];
    }

    const materials = await prisma.material.findMany({
      where,
      orderBy: { createdAt: 'desc' }
    });

    res.json({ 
      success: true,
      count: materials.length,
      materials 
    });
  } catch (error) {
    console.error('Get materials error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch materials',
      details: error.message 
    });
  }
};

/**
 * Get single material by ID
 * GET /api/materials/:id
 */
export const getMaterialById = async (req, res) => {
  try {
    const { id } = req.params;
    const { companyId } = req.user;

    const material = await prisma.material.findFirst({
      where: {
        id: parseInt(id),
        companyId
      },
      include: {
        projectMaterials: {
          include: {
            project: {
              select: {
                id: true,
                name: true,
                projectId: true
              }
            }
          }
        },
        usages: {
          take: 10,
          orderBy: { date: 'desc' },
          include: {
            project: {
              select: {
                name: true,
                projectId: true
              }
            },
            user: {
              select: {
                name: true,
                email: true
              }
            }
          }
        }
      }
    });

    if (!material) {
      return res.status(404).json({ 
        success: false,
        error: 'Material not found' 
      });
    }

    res.json({ 
      success: true,
      material 
    });
  } catch (error) {
    console.error('Get material error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch material',
      details: error.message 
    });
  }
};

/**
 * Create new material (Admin only - from approved request)
 * POST /api/materials
 */
export const createMaterial = async (req, res) => {
  try {
    const { companyId } = req.user;
    const { name, category, unit, defaultRate, vendor, description } = req.body;

    // Validation
    if (!name || !category || !unit) {
      return res.status(400).json({ 
        success: false,
        error: 'Name, category, and unit are required' 
      });
    }

    // Generate unique material ID
    const materialId = await generateMaterialId();

    const material = await prisma.material.create({
      data: {
        materialId,
        name,
        category,
        unit,
        defaultRate: defaultRate ? parseFloat(defaultRate) : null,
        vendor,
        description,
        companyId
      }
    });

    res.status(201).json({ 
      success: true,
      message: 'Material created successfully',
      material 
    });
  } catch (error) {
    console.error('Create material error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to create material',
      details: error.message 
    });
  }
};

/**
 * Update material
 * PUT /api/materials/:id
 */
export const updateMaterial = async (req, res) => {
  try {
    const { id } = req.params;
    const { companyId } = req.user;
    const { name, category, unit, defaultRate, vendor, description } = req.body;

    // Check if material exists and belongs to company
    const existingMaterial = await prisma.material.findFirst({
      where: {
        id: parseInt(id),
        companyId
      }
    });

    if (!existingMaterial) {
      return res.status(404).json({ 
        success: false,
        error: 'Material not found' 
      });
    }

    const material = await prisma.material.update({
      where: { id: parseInt(id) },
      data: {
        name: name || existingMaterial.name,
        category: category || existingMaterial.category,
        unit: unit || existingMaterial.unit,
        defaultRate: defaultRate !== undefined ? parseFloat(defaultRate) : existingMaterial.defaultRate,
        vendor: vendor !== undefined ? vendor : existingMaterial.vendor,
        description: description !== undefined ? description : existingMaterial.description
      }
    });

    res.json({ 
      success: true,
      message: 'Material updated successfully',
      material 
    });
  } catch (error) {
    console.error('Update material error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to update material',
      details: error.message 
    });
  }
};

/**
 * Delete material
 * DELETE /api/materials/:id
 */
export const deleteMaterial = async (req, res) => {
  try {
    const { id } = req.params;
    const { companyId } = req.user;

    // Check if material exists and belongs to company
    const material = await prisma.material.findFirst({
      where: {
        id: parseInt(id),
        companyId
      }
    });

    if (!material) {
      return res.status(404).json({ 
        success: false,
        error: 'Material not found' 
      });
    }

    // Check if material is used in any project
    const usageCount = await prisma.projectMaterial.count({
      where: { materialId: parseInt(id) }
    });

    if (usageCount > 0) {
      return res.status(400).json({ 
        success: false,
        error: 'Cannot delete material that is assigned to projects' 
      });
    }

    await prisma.material.delete({
      where: { id: parseInt(id) }
    });

    res.json({ 
      success: true,
      message: 'Material deleted successfully' 
    });
  } catch (error) {
    console.error('Delete material error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to delete material',
      details: error.message 
    });
  }
};

/**
 * Get material categories
 * GET /api/materials/categories
 */
export const getCategories = async (req, res) => {
  try {
    const { companyId } = req.user;

    const materials = await prisma.material.findMany({
      where: { companyId },
      select: { category: true },
      distinct: ['category']
    });

    const categories = ['All', ...materials.map(m => m.category).filter(Boolean)];

    res.json({ 
      success: true,
      categories 
    });
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch categories',
      details: error.message 
    });
  }
};