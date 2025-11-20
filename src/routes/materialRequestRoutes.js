import express from 'express';
import { 
  getAllRequests,        // ✅ ADD THIS IMPORT
  getMyRequests,
  getPendingRequests,
  createMaterialRequest,
  approveMaterialRequest,
  rejectMaterialRequest
} from '../controllers/materialRequestController.js';
import { authenticateToken, authorizeRole } from '../middlewares/authMiddlewares.js';

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// ✅ IMPORTANT: Put specific routes BEFORE general routes
// GET /api/material-requests/my-requests (Employee)
router.get('/my-requests', getMyRequests);

// GET /api/material-requests/pending (Admin only)
router.get('/pending', authorizeRole('Admin'), getPendingRequests);

// ✅ ADD THIS: GET /api/material-requests (Admin only - Get ALL requests)
router.get('/', authorizeRole('Admin'), getAllRequests);

// POST /api/material-requests (Employee)
router.post('/', createMaterialRequest);

// PUT /api/material-requests/:id/approve (Admin only)
router.put('/:id/approve', authorizeRole('Admin'), approveMaterialRequest);

// PUT /api/material-requests/:id/reject (Admin only)
router.put('/:id/reject', authorizeRole('Admin'), rejectMaterialRequest);

export default router;