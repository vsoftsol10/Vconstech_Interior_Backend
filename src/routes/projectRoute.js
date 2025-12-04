import express from 'express';
import { 
  createProject, 
  getProjectById, 
  updateProject, 
  deleteProject,
  getProjectsByCompany,
  uploadProjectFile,
  getProjectFiles,
  deleteProjectFile,
  updateProjectProgress  // ✅ NEW: Import progress update function
} from '../controllers/projectController.js';
import { authenticateToken, authorizeRole } from '../middlewares/authMiddlewares.js';
import { upload } from '../config/multerConfig.js';
import { PrismaClient } from '../../generated/prisma/index.js';

const router = express.Router();
const prisma = new PrismaClient();

// ============================================
// CUSTOM MIDDLEWARE FOR PROJECT ACCESS
// ============================================

// Middleware to check if user has access to project (Admin or Assigned Engineer)
const checkProjectAccess = async (req, res, next) => {
  try {
    const projectId = parseInt(req.params.id);
    const userId = req.user.id;
    const userRole = req.user.role;
    const companyId = req.user.companyId;

    console.log('🔐 Checking project access:', {
      projectId,
      userId,
      userRole,
      companyId
    });

    // ✅ ADMINS: Have access to ALL projects in their company
    if (userRole === 'Admin') {
      const project = await prisma.project.findFirst({
        where: {
          id: projectId,
          companyId: companyId
        }
      });

      if (!project) {
        console.log('❌ Project not found or not in admin\'s company');
        return res.status(404).json({
          success: false,
          error: 'Project not found'
        });
      }

      console.log('✅ Admin access granted to project');
      return next();
    }

    // ✅ ENGINEERS: Only have access to ASSIGNED projects
    if (userRole === 'Site_Engineer') {
      const project = await prisma.project.findFirst({
        where: {
          id: projectId,
          companyId: companyId
        }
      });

      if (!project) {
        console.log('❌ Project not found');
        return res.status(404).json({
          success: false,
          error: 'Project not found'
        });
      }

      // Check if engineer is assigned to this project
      let hasAccess = false;

      // Method 1: Check via assignedEngineerId field
      if (project.assignedEngineerId === userId) {
        hasAccess = true;
        console.log('✅ Engineer access granted (assigned via assignedEngineerId)');
      }

      // Method 2: Check via many-to-many relation (if you have it)
      if (!hasAccess) {
        try {
          const projectWithEngineer = await prisma.project.findFirst({
            where: {
              id: projectId,
              companyId: companyId,
              engineers: {
                some: {
                  id: userId
                }
              }
            }
          });

          if (projectWithEngineer) {
            hasAccess = true;
            console.log('✅ Engineer access granted (assigned via engineers relation)');
          }
        } catch (error) {
          console.log('Many-to-many check skipped (relation may not exist)');
        }
      }

      if (hasAccess) {
        return next();
      }

      console.log('❌ Engineer not assigned to this project');
      return res.status(403).json({
        success: false,
        error: 'Access denied. You are not assigned to this project.'
      });
    }

    // Unknown user role
    console.log('❌ Unknown user role:', userRole);
    return res.status(403).json({
      success: false,
      error: 'Invalid user role'
    });

  } catch (error) {
    console.error('💥 Error checking project access:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to verify project access',
      details: error.message
    });
  }
};

// ============================================
// ROUTES
// ============================================

// All routes require authentication
router.use(authenticateToken);

// Create new project (Admin only)
router.post('/', authorizeRole('Admin'), createProject);

// Get all projects for user's company
router.get('/', getProjectsByCompany);

// Get single project by ID
router.get('/:id', getProjectById);

// Update project (Admin only)
router.put('/:id', authorizeRole('Admin'), updateProject);

// ✅ NEW: Update project progress
// Admin: Can update any project progress
// Site Engineer: Can ONLY update assigned project progress
router.patch('/:id/progress', checkProjectAccess, updateProjectProgress);

// Delete project (Admin only)
router.delete('/:id', authorizeRole('Admin'), deleteProject);

// ============================================
// FILE ROUTES - Admin: All Projects | Engineer: Assigned Projects Only
// ============================================

// Upload file - Admin (any project) or Assigned Engineer (only assigned projects)
router.post('/:id/files', checkProjectAccess, upload.single('file'), uploadProjectFile);

// Get project files - Admin (any project) or Assigned Engineer (only assigned projects)
router.get('/:id/files', checkProjectAccess, getProjectFiles);

// Delete file - Admin (any project) or Assigned Engineer (only assigned projects)
router.delete('/:id/files/:fileId', checkProjectAccess, deleteProjectFile);

export default router;