// src/controllers/projectController.js
import { PrismaClient } from '../../generated/prisma/index.js';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const prisma = new PrismaClient();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

    console.log('Creating project with data:', req.body);

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
        error: 'Engineer assignment is required' 
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

    // Verify assigned engineer exists and belongs to same company
    const assignedEngineer = await prisma.engineer.findFirst({
      where: {
        id: parseInt(assignedUserId),
        companyId: req.user.companyId
      }
    });

    if (!assignedEngineer) {
      return res.status(400).json({ 
        error: 'Invalid Engineer selected or engineer does not belong to your company' 
      });
    }

    // Get company ID from authenticated user
    const companyId = req.user.companyId;

    // Create project with engineer assignment
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
        companyId,
        assignedEngineerId: parseInt(assignedUserId)
      },
      include: {
        assignedEngineer: {
          select: {
            id: true,
            name: true,
            empId: true,
            phone: true,
            alternatePhone: true
          }
        }
      }
    });

    console.log('Project created successfully:', project);

    res.status(201).json({
      message: 'Project created successfully',
      project
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
        assignedEngineer: {
          select: {
            id: true,
            name: true,
            empId: true,
            phone: true,
            alternatePhone: true
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
        assignedEngineer: {
          select: {
            id: true,
            name: true,
            empId: true,
            phone: true,
            alternatePhone: true,
            address: true
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

    console.log('Updating project with data:', req.body);

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

    // Verify assigned engineer if provided
    if (assignedUserId) {
      const assignedEngineer = await prisma.engineer.findFirst({
        where: {
          id: parseInt(assignedUserId),
          companyId: req.user.companyId
        }
      });

      if (!assignedEngineer) {
        return res.status(400).json({ 
          error: 'Invalid Engineer selected or engineer does not belong to your company' 
        });
      }
    }

    // Build update data object
    const updateData = {};
    
    if (name !== undefined) updateData.name = name;
    if (clientName !== undefined) updateData.clientName = clientName;
    if (projectType !== undefined) updateData.projectType = projectType;
    if (budget !== undefined) updateData.budget = budget ? parseFloat(budget) : null;
    if (description !== undefined) updateData.description = description;
    if (location !== undefined) updateData.location = location;
    if (startDate !== undefined) updateData.startDate = startDate ? new Date(startDate) : null;
    if (endDate !== undefined) updateData.endDate = endDate ? new Date(endDate) : null;
    if (status !== undefined) updateData.status = status;
    if (assignedUserId !== undefined) {
      updateData.assignedEngineerId = assignedUserId ? parseInt(assignedUserId) : null;
    }

    const updatedProject = await prisma.project.update({
      where: { id: parseInt(id) },
      data: updateData,
      include: {
        assignedEngineer: {
          select: {
            id: true,
            name: true,
            empId: true,
            phone: true,
            alternatePhone: true
          }
        }
      }
    });

    console.log('Project updated successfully:', updatedProject);

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
      },
      include: {
        files: true
      }
    });

    if (!project) {
      return res.status(404).json({ 
        error: 'Project not found' 
      });
    }

    // Delete associated files from filesystem
    if (project.files && project.files.length > 0) {
      project.files.forEach(file => {
        const filePath = path.join(__dirname, '../../', file.fileUrl);
        if (fs.existsSync(filePath)) {
          try {
            fs.unlinkSync(filePath);
          } catch (err) {
            console.error('Error deleting file:', err);
          }
        }
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

// Upload project file
export const uploadProjectFile = async (req, res) => {
  try {
    const { id } = req.params;
    const companyId = req.user.companyId;
    const userId = req.user.userId;

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

    // Check if file was uploaded
    if (!req.file) {
      return res.status(400).json({ 
        error: 'No file uploaded' 
      });
    }

    // Save file info to database
    const file = await prisma.file.create({
      data: {
        projectId: parseInt(id),
        uploadedBy: userId,
        fileUrl: `/uploads/project-files/${req.file.filename}`,
        fileName: req.file.originalname
      },
      include: {
        user: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    res.status(201).json({
      message: 'File uploaded successfully',
      file
    });

  } catch (error) {
    console.error('Upload file error:', error);
    
    // Clean up uploaded file if database save fails
    if (req.file) {
      const filePath = path.join(__dirname, '../../uploads/project-files', req.file.filename);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }
    
    res.status(500).json({ 
      error: 'Failed to upload file',
      details: error.message 
    });
  }
};

// Get all files for a project
export const getProjectFiles = async (req, res) => {
  try {
    const { id } = req.params;
    const companyId = req.user.companyId;

    // Verify project belongs to user's company
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

    const files = await prisma.file.findMany({
      where: {
        projectId: parseInt(id)
      },
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
    });

    res.json({
      count: files.length,
      files
    });

  } catch (error) {
    console.error('Get files error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch files',
      details: error.message 
    });
  }
};

// Delete file
export const deleteProjectFile = async (req, res) => {
  try {
    const { id, fileId } = req.params;
    const companyId = req.user.companyId;

    // Verify project belongs to user's company
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

    // Get file info
    const file = await prisma.file.findFirst({
      where: {
        id: parseInt(fileId),
        projectId: parseInt(id)
      }
    });

    if (!file) {
      return res.status(404).json({ 
        error: 'File not found' 
      });
    }

    // Delete file from filesystem
    const filePath = path.join(__dirname, '../../', file.fileUrl);
    if (fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath);
      } catch (err) {
        console.error('Error deleting file from filesystem:', err);
      }
    }

    // Delete from database
    await prisma.file.delete({
      where: { id: parseInt(fileId) }
    });

    res.json({
      message: 'File deleted successfully'
    });

  } catch (error) {
    console.error('Delete file error:', error);
    res.status(500).json({ 
      error: 'Failed to delete file',
      details: error.message 
    });
  }
};