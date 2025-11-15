import express from 'express';
import { 
  getAllMaterials,
  getMaterialById,
  createMaterial,
  updateMaterial,
  deleteMaterial,
  getCategories
} from '../controllers/materialController.js';
import { authenticateToken, authorizeRole } from '../middlewares/authMiddlewares.js';

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// GET /api/materials/categories
router.get('/categories', getCategories);

// GET /api/materials
router.get('/', getAllMaterials);

// GET /api/materials/:id
router.get('/:id', getMaterialById);

// POST /api/materials (Admin only)
router.post('/', authorizeRole('Admin'), createMaterial);

// PUT /api/materials/:id (Admin only)
router.put('/:id', authorizeRole('Admin'), updateMaterial);

// DELETE /api/materials/:id (Admin only)
router.delete('/:id', authorizeRole('Admin'), deleteMaterial);

export default router;

