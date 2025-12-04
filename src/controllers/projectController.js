// src/controllers/projectController.js
import { PrismaClient } from '../../generated/prisma/index.js';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const prisma = new PrismaClient();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

    console.log('========================================');
    console.log('📥 CREATE PROJECT REQUEST');
    console.log('Body:', JSON.stringify(req.body, null, 2));
    console.log('User:', req.user);
    console.log('========================================');

    // Validation
    if (!projectId || !name || !clientName) {
      console.log('❌ Validation failed: Missing required fields');
      return res.status(400).json({ 
        error: 'Project ID, name, and client name are required' 
      });
    }

    if (!location) {
      console.log('❌ Validation failed: Missing location');
      return res.status(400).json({ 
        error: 'Project location is required' 
      });
    }

    if (!assignedUserId) {
      console.log('❌ Validation failed: Missing engineer assignment');
      return res.status(400).json({ 
        error: 'Engineer assignment is required' 
      });
    }

    // Check if project ID already exists
    console.log('🔍 Checking for duplicate project ID:', projectId);
    const existingProject = await prisma.project.findUnique({
      where: { projectId }
    });

    if (existingProject) {
      console.log('❌ Duplicate project ID found:', existingProject.id);
      return res.status(400).json({ 
        error: 'Project ID already exists' 
      });
    }

    // Verify assigned engineer exists and belongs to same company
    console.log('🔍 Verifying engineer:', assignedUserId);
    const assignedEngineer = await prisma.engineer.findFirst({
      where: {
        id: parseInt(assignedUserId),
        companyId: req.user.companyId
      }
    });

    if (!assignedEngineer) {
      console.log('❌ Engineer not found or wrong company');
      return res.status(400).json({ 
        error: 'Invalid Engineer selected or engineer does not belong to your company' 
      });
    }

    // Get company ID from authenticated user
    const companyId = req.user.companyId;
    console.log('✅ All validations passed. Creating project...');

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
        actualProgress: 0, // ✅ Initialize with 0% progress
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

    console.log('✅✅✅ PROJECT CREATED SUCCESSFULLY ✅✅✅');
    console.log('Project DB ID:', project.id);
    console.log('Project ID:', project.projectId);
    console.log('========================================');

    res.status(201).json({
      message: 'Project created successfully',
      project
    });

  } catch (error) {
    console.error('💥💥💥 CREATE PROJECT ERROR 💥💥💥');
    console.error('Error:', error);
    console.error('Stack:', error.stack);
    console.error('========================================');
    
    res.status(500).json({ 
      error: 'Failed to create project',
      details: error.message 
    });
  }
};

export const getProjectsByCompany = async (req, res) => {
  try {
    const companyId = req.user.companyId;
    const { status, projectType } = req.query;

    console.log('=== Get Projects By Company ===');
    console.log('Company ID:', companyId);
    console.log('Filters - Status:', status, 'Type:', projectType);

    const whereClause = { companyId };
    
    if (status) {
      whereClause.status = status;
    }
    
    if (projectType) {
      whereClause.projectType = projectType;
    }

    console.log('Where clause:', JSON.stringify(whereClause, null, 2));

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
            materialUsages: true,
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

    console.log('Projects found:', projects.length);
    console.log('Project IDs:', projects.map(p => ({ id: p.id, projectId: p.projectId, name: p.name })));

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

// ✅ NEW: Update project progress with role-based authorization
export const updateProjectProgress = async (req, res) => {
  try {
    const { id } = req.params;
    const { actualProgress } = req.body;
    const userId = req.user.id;
    const userRole = req.user.role;
    const companyId = req.user.companyId;

    console.log('=== Update Project Progress ===');
    console.log('Project ID:', id);
    console.log('User ID:', userId);
    console.log('User Role:', userRole);
    console.log('Progress:', actualProgress);

    // Validate progress value
    if (actualProgress === undefined || actualProgress === null) {
      return res.status(400).json({ 
        error: 'Progress value is required' 
      });
    }

    const progress = parseInt(actualProgress);
    if (isNaN(progress) || progress < 0 || progress > 100) {
      return res.status(400).json({ 
        error: 'Progress must be a number between 0 and 100' 
      });
    }

    // Get project with company and engineer info
    const project = await prisma.project.findFirst({
      where: {
        id: parseInt(id),
        companyId: companyId
      },
      include: {
        assignedEngineer: {
          select: {
            id: true,
            name: true,
            empId: true
          }
        }
      }
    });

    if (!project) {
      return res.status(404).json({ 
        error: 'Project not found' 
      });
    }

    // ✅ AUTHORIZATION CHECK
    // Admin: Can update any project
    // Site Engineer: Can ONLY update assigned projects
    if (userRole === 'Site_Engineer') {
      if (project.assignedEngineerId !== userId) {
        console.log('❌ Engineer not assigned to this project');
        return res.status(403).json({ 
          error: 'Access denied. You can only update progress for projects assigned to you.',
          assignedEngineer: project.assignedEngineer?.name || 'None',
          yourId: userId
        });
      }
      console.log('✅ Engineer is assigned to this project');
    } else if (userRole === 'Admin') {
      console.log('✅ Admin has access to all projects');
    } else {
      return res.status(403).json({ 
        error: 'Invalid user role' 
      });
    }

    // Update the progress
    const updatedProject = await prisma.project.update({
      where: { id: parseInt(id) },
      data: { actualProgress: progress },
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

    console.log('✅ Progress updated successfully:', updatedProject.actualProgress);

    res.json({
      success: true,
      message: 'Project progress updated successfully',
      project: updatedProject
    });

  } catch (error) {
    console.error('Update progress error:', error);
    res.status(500).json({ 
      error: 'Failed to update project progress',
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

export const uploadProjectFile = async (req, res) => {
  try {
    console.log('=== FILE UPLOAD DEBUG ===');
    console.log('req.file:', req.file);
    console.log('req.body:', req.body);
    console.log('req.user:', {
      id: req.user.id,
      role: req.user.role,
      companyId: req.user.companyId,
      name: req.user.name,
      type: req.user.type
    });
    console.log('=======================');
    
    const { id } = req.params;
    const companyId = req.user.companyId;
    const userId = req.user.id;
    const userRole = req.user.role;
    const userType = req.user.type;
    const { documentType } = req.body;

    // Verify project exists and belongs to company
    const project = await prisma.project.findFirst({
      where: {
        id: parseInt(id),
        companyId
      }
    });

    if (!project) {
      if (req.file) {
        const filePath = path.join(__dirname, '../../uploads/project-files', req.file.filename);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      }
      return res.status(404).json({ 
        success: false,
        error: 'Project not found' 
      });
    }

    if (!req.file) {
      return res.status(400).json({ 
        success: false,
        error: 'No file uploaded' 
      });
    }

    const fileSize = req.file.size;

    const fileData = {
      projectId: parseInt(id),
      fileUrl: `/uploads/project-files/${req.file.filename}`,
      fileName: req.file.originalname,
      documentType: documentType || null,
      fileSize: fileSize
    };

    if (userType === 'engineer' || userRole === 'Site_Engineer') {
      fileData.uploadedByEngineerId = userId;
      console.log('👷 Engineer upload - ID:', userId);
    } else {
      fileData.uploadedBy = userId;
      console.log('👤 Admin upload - ID:', userId);
    }

    console.log('📝 Creating file with data:', fileData);

    const file = await prisma.file.create({
      data: fileData,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            role: true
          }
        },
        engineer: {
          select: {
            id: true,
            name: true,
            empId: true
          }
        }
      }
    });

    const uploaderName = file.user?.name || file.engineer?.name || 'Unknown';
    
    console.log('✅ File uploaded successfully');
    console.log('📄 File details:', {
      id: file.id,
      fileName: file.fileName,
      documentType: file.documentType,
      uploadedBy: uploaderName,
      uploaderType: file.user ? 'Admin' : 'Engineer'
    });

    res.status(201).json({
      success: true,
      message: 'File uploaded successfully',
      file
    });

  } catch (error) {
    console.error('💥 Upload file error:', error);
    console.error('Error stack:', error.stack);
    
    if (req.file) {
      const filePath = path.join(__dirname, '../../uploads/project-files', req.file.filename);
      if (fs.existsSync(filePath)) {
        try {
          fs.unlinkSync(filePath);
          console.log('🗑️ Cleaned up uploaded file after error');
        } catch (cleanupError) {
          console.error('Error cleaning up file:', cleanupError);
        }
      }
    }
    
    res.status(500).json({ 
      success: false,
      error: 'Failed to upload file',
      details: error.message 
    });
  }
};

export const getProjectFiles = async (req, res) => {
  try {
    const { id } = req.params;
    const companyId = req.user.companyId;

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
            name: true,
            role: true
          }
        },
        engineer: {
          select: {
            id: true,
            name: true,
            empId: true
          }
        }
      },
      orderBy: {
        uploadedAt: 'desc'
      }
    });

    const formattedFiles = files.map(file => ({
      ...file,
      uploaderName: file.user?.name || file.engineer?.name || 'Unknown',
      uploaderType: file.user ? 'Admin' : 'Engineer',
      uploaderRole: file.user?.role || 'Site_Engineer'
    }));

    res.json({
      count: formattedFiles.length,
      files: formattedFiles
    });

  } catch (error) {
    console.error('Get files error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch files',
      details: error.message 
    });
  }
};

export const deleteProjectFile = async (req, res) => {
  try {
    const { id, fileId } = req.params;
    const companyId = req.user.companyId;

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

    const filePath = path.join(__dirname, '../../', file.fileUrl);
    if (fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath);
        console.log('🗑️ File deleted from filesystem');
      } catch (err) {
        console.error('Error deleting file from filesystem:', err);
      }
    }

    await prisma.file.delete({
      where: { id: parseInt(fileId) }
    });

    console.log('✅ File deleted successfully from database');

    res.json({
      success: true,
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