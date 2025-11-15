import express from 'express';
import { 
  getNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  clearReadNotifications
} from '../controllers/notificationController.js';
import { authenticateToken } from '../middlewares/authMiddlewares.js';

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// GET /api/notifications
router.get('/', getNotifications);

// PUT /api/notifications/read-all
router.put('/read-all', markAllAsRead);

// PUT /api/notifications/:id/read
router.put('/:id/read', markAsRead);

// DELETE /api/notifications/clear-read
router.delete('/clear-read', clearReadNotifications);

// DELETE /api/notifications/:id
router.delete('/:id', deleteNotification);

export default router;