import express from 'express';
import { 
  getProjectMaterials,
  addMaterialToProject,
  updateProjectMaterial,
  removeProjectMaterial
} from '../controllers/projectMaterialController.js';
import { authenticateToken, authorizeRole } from '../middlewares/authMiddlewares.js';

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// GET /api/project-materials/:projectId
router.get('/:projectId', getProjectMaterials);

// POST /api/project-materials (Admin only)
router.post('/', authorizeRole('Admin'), addMaterialToProject);

// PUT /api/project-materials/:id (Admin only)
router.put('/:id', authorizeRole('Admin'), updateProjectMaterial);

// DELETE /api/project-materials/:id (Admin only)
router.delete('/:id', authorizeRole('Admin'), removeProjectMaterial);

export default router;