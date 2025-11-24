// src/controllers/materialController.js
import { PrismaClient } from '../../generated/prisma/index.js';
import { generateMaterialId } from '../utils/generateId.js';

const prisma = new PrismaClient();

/**
 * Get dashboard data (metrics + recent usage logs)
 * GET /api/materials/dashboard
 */
export const getDashboard = async (req, res) => {
  try {
    const { companyId } = req.user;

    // Get total materials count
    const totalMaterials = await prisma.material.count({
      where: { companyId }
    });

    // Get active materials in projects (materials assigned to ongoing/pending projects)
    const activeMaterialsData = await prisma.projectMaterial.groupBy({
      by: ['materialId'],
      where: {
        status: 'ACTIVE',
        project: {
          companyId,
          status: {
            in: ['PENDING', 'ONGOING']
          }
        }
      }
    });
    const activeMaterials = activeMaterialsData.length;

    // Calculate total cost of used materials
    const materialUsages = await prisma.materialUsage.findMany({
      where: {
        project: { companyId }
      },
      include: {
        material: {
          select: {
            defaultRate: true
          }
        }
      }
    });

    const totalCost = materialUsages.reduce((sum, usage) => {
      const rate = usage.material.defaultRate || 0;
      return sum + (usage.quantity * rate);
    }, 0);

    // ✅ FIXED: Get recent material usage logs (last 10)
    // Changed 'user' to 'engineer'
    const recentUsageLogs = await prisma.materialUsage.findMany({
      where: {
        project: { companyId }
      },
      include: {
        material: {
          select: {
            id: true,
            name: true,
            unit: true
          }
        },
        project: {
          select: {
            id: true,
            name: true
          }
        },
        engineer: {  // ✅ Changed from 'user' to 'engineer'
          select: {
            id: true,
            name: true
          }
        }
      },
      orderBy: {
        date: 'desc'
      },
      take: 10
    });

    // ✅ FIXED: Format usage logs
    // Changed 'log.user' to 'log.engineer' and 'userId' to 'engineerId'
    const formattedUsageLogs = recentUsageLogs.map(log => ({
      id: log.id,
      date: log.date.toISOString().split('T')[0],
      projectId: log.projectId,
      projectName: log.project.name,
      materialId: log.materialId,
      materialName: log.material.name,
      quantity: log.quantity,
      unit: log.material.unit,
      remarks: log.remarks,
      engineerId: log.engineerId,  // ✅ Changed from 'userId'
      userName: log.engineer.name   // ✅ Changed from 'log.user.name'
    }));

    res.json({
      success: true,
      data: {
        metrics: {
          totalMaterials,
          activeMaterials,
          totalCost: Math.round(totalCost * 100) / 100
        },
        usageLogs: formattedUsageLogs
      }
    });
  } catch (error) {
    console.error('Get dashboard error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch dashboard data',
      details: error.message
    });
  }
};

/**
 * Get material usage statistics
 * GET /api/materials/usage-stats
 */
export const getUsageStats = async (req, res) => {
  try {
    const { companyId } = req.user;
    const { projectId, materialId, startDate, endDate } = req.query;

    const whereClause = {
      project: { companyId }
    };

    if (projectId) {
      whereClause.projectId = parseInt(projectId);
    }

    if (materialId) {
      whereClause.materialId = parseInt(materialId);
    }

    if (startDate || endDate) {
      whereClause.date = {};
      if (startDate) {
        whereClause.date.gte = new Date(startDate);
      }
      if (endDate) {
        whereClause.date.lte = new Date(endDate);
      }
    }

    const usageStats = await prisma.materialUsage.groupBy({
      by: ['materialId'],
      where: whereClause,
      _sum: {
        quantity: true
      },
      _count: {
        id: true
      }
    });

    // Enrich with material details
    const enrichedStats = await Promise.all(
      usageStats.map(async (stat) => {
        const material = await prisma.material.findUnique({
          where: { id: stat.materialId }
        });

        const totalCost = (stat._sum.quantity || 0) * (material?.defaultRate || 0);

        return {
          materialId: stat.materialId,
          materialName: material?.name,
          unit: material?.unit,
          totalQuantityUsed: stat._sum.quantity || 0,
          usageCount: stat._count.id,
          totalCost: Math.round(totalCost * 100) / 100
        };
      })
    );

    res.json({
      success: true,
      stats: enrichedStats
    });
  } catch (error) {
    console.error('Get usage stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch usage statistics',
      details: error.message
    });
  }
};

/**
 * Get project-wise material usage summary
 * GET /api/materials/project-summary
 */
export const getProjectSummary = async (req, res) => {
  try {
    const { companyId } = req.user;

    const projects = await prisma.project.findMany({
      where: { companyId },
      include: {
        materialUsages: {
          include: {
            material: true
          }
        }
      }
    });

    const summary = projects.map(project => {
      const totalCost = project.materialUsages.reduce((sum, usage) => {
        const rate = usage.material.defaultRate || 0;
        return sum + (usage.quantity * rate);
      }, 0);

      return {
        projectId: project.id,
        projectName: project.name,
        projectType: project.projectType,
        status: project.status,
        materialsUsedCount: new Set(project.materialUsages.map(u => u.materialId)).size,
        totalUsageCount: project.materialUsages.length,
        totalCost: Math.round(totalCost * 100) / 100
      };
    });

    res.json({
      success: true,
      summary
    });
  } catch (error) {
    console.error('Get project summary error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch project summary',
      details: error.message
    });
  }
};

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
            engineer: {  // ✅ Changed from 'user' to 'engineer'
              select: {
                name: true,
                empId: true  // ✅ Changed from 'email' to 'empId' (Engineer doesn't have email)
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

    const categories = materials.map(m => m.category).filter(Boolean);

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