import express from 'express';
import { 
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

// GET /api/material-requests/my-requests (Employee)
router.get('/my-requests', getMyRequests);

// GET /api/material-requests/pending (Admin only)
router.get('/pending', authorizeRole('Admin'), getPendingRequests);

// POST /api/material-requests (Employee)
router.post('/', createMaterialRequest);

// PUT /api/material-requests/:id/approve (Admin only)
router.put('/:id/approve', authorizeRole('Admin'), approveMaterialRequest);

// PUT /api/material-requests/:id/reject (Admin only)
router.put('/:id/reject', authorizeRole('Admin'), rejectMaterialRequest);

export default router;
