import express from 'express';
import { 
  createProject, 
  getProjectById, 
  updateProject, 
  deleteProject,
  getProjectsByCompany,
  uploadProjectFile,
  getProjectFiles,
  deleteProjectFile
} from '../controllers/projectController.js';
import { authenticateToken, authorizeRole } from '../middlewares/authMiddlewares.js';
import { upload } from '../config/multerConfig.js';

const router = express.Router();

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

// Delete project (Admin only)
router.delete('/:id', authorizeRole('Admin'), deleteProject);

// File upload routes
router.post('/:id/files', authorizeRole('Admin'), upload.single('file'), uploadProjectFile);
router.get('/:id/files', getProjectFiles);
router.delete('/:id/files/:fileId', authorizeRole('Admin'), deleteProjectFile);

export default router;