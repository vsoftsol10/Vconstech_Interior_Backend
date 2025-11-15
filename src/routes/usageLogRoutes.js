import express from 'express';
import { 
  getUsageLogs,
  createUsageLog,
  updateUsageLog,
  deleteUsageLog
} from '../controllers/usageLogController.js';
import { authenticateToken, authorizeRole } from '../middlewares/authMiddlewares.js';

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// GET /api/usage-logs?projectId=1
router.get('/', getUsageLogs);

// POST /api/usage-logs (Employee can create)
router.post('/', createUsageLog);

// PUT /api/usage-logs/:id (Admin or creator)
router.put('/:id', updateUsageLog);

// DELETE /api/usage-logs/:id (Admin only)
router.delete('/:id', authorizeRole('Admin'), deleteUsageLog);

export default router;