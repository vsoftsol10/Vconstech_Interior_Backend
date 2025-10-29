// src/controllers/projectController.js
import { PrismaClient } from '../../generated/prisma/index.js';

const prisma = new PrismaClient();

// Create a new project
export const createProject = async (req, res) => {
  try {
    const {
      projectId,
      name,
      clientName,
      projectType,
      budget,
      description,
      startDate,
      endDate,
      location,
      assignedUserId
    } = req.body;

    // Validation
    if (!projectId || !name || !clientName) {
      return res.status(400).json({ 
        error: 'Project ID, name, and client name are required' 
      });
    }

    if (!location) {
      return res.status(400).json({ 
        error: 'Project location is required' 
      });
    }

    if (!assignedUserId) {
      return res.status(400).json({ 
        error: 'Site Engineer assignment is required' 
      });
    }

    // Check if project ID already exists
    const existingProject = await prisma.project.findUnique({
      where: { projectId }
    });

    if (existingProject) {
      return res.status(400).json({ 
        error: 'Project ID already exists' 
      });
    }

    // Verify assigned user exists and is a Site Engineer
    const assignedUser = await prisma.user.findFirst({
      where: {
        id: parseInt(assignedUserId),
        role: 'Site_Engineer',
        companyId: req.user.companyId
      }
    });

    if (!assignedUser) {
      return res.status(400).json({ 
        error: 'Invalid Site Engineer selected' 
      });
    }

    // Get company ID from authenticated user
    const companyId = req.user.companyId;

    // Create project
    const project = await prisma.project.create({
      data: {
        projectId,
        name,
        clientName,
        projectType: projectType || 'Residential',
        budget: budget ? parseFloat(budget) : null,
        description,
        location,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        status: 'PENDING',
        companyId
      }
    });

    // Create assignment
    await prisma.projectAssignment.create({
      data: {
        projectId: project.id,
        userId: parseInt(assignedUserId)
      }
    });

    // Fetch the created project with relations
    const createdProject = await prisma.project.findUnique({
      where: { id: project.id },
      include: {
        assignments: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                role: true
              }
            }
          }
        }
      }
    });

    res.status(201).json({
      message: 'Project created successfully',
      project: createdProject
    });

  } catch (error) {
    console.error('Create project error:', error);
    res.status(500).json({ 
      error: 'Failed to create project',
      details: error.message 
    });
  }
};

// Get all projects for user's company
export const getProjectsByCompany = async (req, res) => {
  try {
    const companyId = req.user.companyId;
    const { status, projectType } = req.query;

    const whereClause = { companyId };
    
    if (status) {
      whereClause.status = status;
    }
    
    if (projectType) {
      whereClause.projectType = projectType;
    }

    const projects = await prisma.project.findMany({
      where: whereClause,
      include: {
        assignments: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                role: true
              }
            }
          }
        },
        _count: {
          select: {
            materialUsed: true,
            contracts: true,
            finances: true,
            files: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    res.json({
      count: projects.length,
      projects
    });

  } catch (error) {
    console.error('Get projects error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch projects',
      details: error.message 
    });
  }
};

// Get single project by ID
export const getProjectById = async (req, res) => {
  try {
    const { id } = req.params;
    const companyId = req.user.companyId;

    const project = await prisma.project.findFirst({
      where: {
        id: parseInt(id),
        companyId
      },
      include: {
        assignments: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                role: true
              }
            }
          }
        },
        materialUsed: {
          include: {
            material: true,
            user: {
              select: {
                id: true,
                name: true
              }
            }
          },
          orderBy: {
            date: 'desc'
          }
        },
        contracts: true,
        finances: {
          orderBy: {
            date: 'desc'
          }
        },
        files: {
          include: {
            user: {
              select: {
                id: true,
                name: true
              }
            }
          },
          orderBy: {
            uploadedAt: 'desc'
          }
        }
      }
    });

    if (!project) {
      return res.status(404).json({ 
        error: 'Project not found' 
      });
    }

    res.json({ project });

  } catch (error) {
    console.error('Get project error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch project',
      details: error.message 
    });
  }
};

// Update project
export const updateProject = async (req, res) => {
  try {
    const { id } = req.params;
    const companyId = req.user.companyId;
    const {
      name,
      clientName,
      projectType,
      budget,
      description,
      startDate,
      endDate,
      location,
      status,
      assignedUserId
    } = req.body;

    // Check if project exists and belongs to user's company
    const existingProject = await prisma.project.findFirst({
      where: {
        id: parseInt(id),
        companyId
      }
    });

    if (!existingProject) {
      return res.status(404).json({ 
        error: 'Project not found' 
      });
    }

    // Verify assigned user if provided
    if (assignedUserId) {
      const assignedUser = await prisma.user.findFirst({
        where: {
          id: parseInt(assignedUserId),
          role: 'Site_Engineer',
          companyId: req.user.companyId
        }
      });

      if (!assignedUser) {
        return res.status(400).json({ 
          error: 'Invalid Site Engineer selected' 
        });
      }
    }

    // Update project
    const updateData = {};
    
    if (name) updateData.name = name;
    if (clientName) updateData.clientName = clientName;
    if (projectType) updateData.projectType = projectType;
    if (budget !== undefined) updateData.budget = budget ? parseFloat(budget) : null;
    if (description !== undefined) updateData.description = description;
    if (location !== undefined) updateData.location = location;
    if (startDate) updateData.startDate = new Date(startDate);
    if (endDate) updateData.endDate = new Date(endDate);
    if (status) updateData.status = status;

    const project = await prisma.project.update({
      where: { id: parseInt(id) },
      data: updateData,
      include: {
        assignments: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true
              }
            }
          }
        }
      }
    });

    // Handle assignment update if provided
    if (assignedUserId !== undefined) {
      // Remove existing assignments
      await prisma.projectAssignment.deleteMany({
        where: { projectId: project.id }
      });

      // Create new assignment if userId provided
      if (assignedUserId) {
        await prisma.projectAssignment.create({
          data: {
            projectId: project.id,
            userId: parseInt(assignedUserId)
          }
        });
      }
    }

    // Fetch updated project with relations
    const updatedProject = await prisma.project.findUnique({
      where: { id: parseInt(id) },
      include: {
        assignments: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                role: true
              }
            }
          }
        }
      }
    });

    res.json({
      message: 'Project updated successfully',
      project: updatedProject
    });

  } catch (error) {
    console.error('Update project error:', error);
    res.status(500).json({ 
      error: 'Failed to update project',
      details: error.message 
    });
  }
};

// Delete project
export const deleteProject = async (req, res) => {
  try {
    const { id } = req.params;
    const companyId = req.user.companyId;

    // Check if project exists and belongs to user's company
    const project = await prisma.project.findFirst({
      where: {
        id: parseInt(id),
        companyId
      }
    });

    if (!project) {
      return res.status(404).json({ 
        error: 'Project not found' 
      });
    }

    // Delete project (cascade will handle related records)
    await prisma.project.delete({
      where: { id: parseInt(id) }
    });

    res.json({
      message: 'Project deleted successfully'
    });

  } catch (error) {
    console.error('Delete project error:', error);
    res.status(500).json({ 
      error: 'Failed to delete project',
      details: error.message 
    });
  }
};