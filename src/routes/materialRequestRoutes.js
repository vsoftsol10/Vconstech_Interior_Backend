// routes/materialRequestRoutes.js
import express from 'express';
import {
  getAllRequests,
  getMyRequests,
  getPendingRequests,
  createMaterialRequest,
  approveMaterialRequest,
  rejectMaterialRequest
} from '../controllers/materialRequestController.js';
import { authenticateToken, authorizeRole } from '../middlewares/authMiddlewares.js';

const router = express.Router();

// ✅ All routes require authentication
router.use(authenticateToken);

// ✅ IMPORTANT: Specific routes BEFORE parameterized routes
router.get('/my-requests', getMyRequests);
router.get('/pending', authorizeRole('Admin'), getPendingRequests);

// ✅ Admin-only routes
router.get('/', authorizeRole('Admin'), getAllRequests);
router.post('/', createMaterialRequest);

// ✅ CRITICAL: These are the routes failing with 403
router.put('/:id/approve', authorizeRole('Admin'), approveMaterialRequest);
router.put('/:id/reject', authorizeRole('Admin'), rejectMaterialRequest);

export default router;