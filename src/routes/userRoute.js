// src/routes/userRoute.js
import express from 'express';
import { getEmployees, getAllUsers } from '../controllers/userController.js';
import { authenticateToken, authorizeRole } from '../middlewares/authMiddlewares.js';

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// Get employees (Site Engineers) - accessible by all authenticated users
router.get('/employees', getEmployees);

// Get all users in company - Admin only
router.get('/', authorizeRole('Admin'), getAllUsers);

export default router;