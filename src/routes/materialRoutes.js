import express from 'express';
import { 
  getAllMaterials,
  getMaterialById,
  createMaterial,
  updateMaterial,
  deleteMaterial,
  getCategories,
  getDashboard,
  getUsageStats,
  getProjectSummary
} from '../controllers/materialController.js';
import { authenticateToken, authorizeRole } from '../middlewares/authMiddlewares.js';

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// ============ NEW DASHBOARD ROUTES ============
// GET /api/materials/dashboard - Get dashboard metrics and recent usage
router.get('/dashboard', getDashboard);

// GET /api/materials/usage-stats - Get material usage statistics
router.get('/usage-stats', getUsageStats);

// GET /api/materials/project-summary - Get project-wise summary
router.get('/project-summary', getProjectSummary);

// ============ EXISTING ROUTES ============
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