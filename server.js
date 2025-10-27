// server.js
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './src/routes/authRoute.js';
import projectRoutes from './src/routes/projectRoute.js';
import { authenticateToken, authorizeRole } from './src/middlewares/authMiddlewares.js';
import { PrismaClient } from './generated/prisma/index.js';

dotenv.config();

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/projects', projectRoutes);

// Protected route - any authenticated user
app.get('/api/profile', authenticateToken, (req, res) => {
  res.json({ user: req.user });
});

// Admin-only route - get all users in company
app.get('/api/admin/users', 
  authenticateToken, 
  authorizeRole('Admin'), 
  async (req, res) => {
    try {
      const users = await prisma.user.findMany({
        where: {
          companyId: req.user.companyId
        },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          createdAt: true
        }
      });
      res.json({ users });
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch users' });
    }
  }
);

// Get employees for assignment dropdown (Site Engineers only)
app.get('/api/employees', 
  authenticateToken, 
  async (req, res) => {
    try {
      const employees = await prisma.user.findMany({
        where: {
          companyId: req.user.companyId,
          role: 'Site_Engineer'
        },
        select: {
          id: true,
          name: true,
          email: true
        },
        orderBy: {
          name: 'asc'
        }
      });
      res.json({ employees });
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch employees' });
    }
  }
);

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', message: 'Server is running' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    error: 'Something went wrong!',
    details: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Graceful shutdown
process.on('SIGINT', async () => {
  await prisma.$disconnect();
  process.exit(0);
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});