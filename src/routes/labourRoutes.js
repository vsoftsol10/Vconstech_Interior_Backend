// src/routes/labourRoutes.js
import express from 'express';
import { 
  getAllLabourers,
  getLabourerById,
  createLabourer,
  updateLabourer,
  deleteLabourer,
  addPayment,
  getLabourerPayments,
  deletePayment,
  getLabourersByProject,
  getLabourStatistics
} from '../controllers/labourController.js'; // ✅ Import from CONTROLLER, not service
import { authenticateToken } from '../middlewares/authMiddlewares.js';

const router = express.Router();

// Apply authentication to all routes
router.use(authenticateToken);

// Labour CRUD operations
router.get('/', getAllLabourers);
router.get('/statistics', getLabourStatistics);
router.get('/:id', getLabourerById);
router.post('/', createLabourer);
router.put('/:id', updateLabourer);
router.delete('/:id', deleteLabourer);

// Payment operations
router.post('/:id/payments', addPayment);
router.get('/:id/payments', getLabourerPayments);
router.delete('/:labourId/payments/:paymentId', deletePayment);

// Project-specific operations
router.get('/project/:projectId', getLabourersByProject);

export default router;