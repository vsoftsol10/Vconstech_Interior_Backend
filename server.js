// server.js
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import authRoutes from './src/routes/authRoute.js';
import projectRoutes from './src/routes/projectRoute.js';
import engineerRoutes from './src/routes/engineerRoute.js';
import userRoute from './src/routes/userRoute.js';
import { authenticateToken, authorizeRole } from './src/middlewares/authMiddlewares.js';
import { PrismaClient } from './generated/prisma/index.js';

// ES module dirname workaround
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files for uploaded images
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes - ORDER MATTERS!
app.use('/api/auth', authRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/engineers', engineerRoutes);
app.use('/api/users', userRoute);  // ✅ Keep it as /api/users

// ✅ ADD THIS SINGLE employees ENDPOINT HERE (outside of routes)
app.get('/api/employees', 
  authenticateToken, 
  async (req, res) => {
    try {
      const companyId = req.user.companyId;

      console.log('==================');
      console.log('Fetching engineers for companyId:', companyId);
      console.log('==================');

      // ✅ Fetch from Engineer table (not User table!)
      const employees = await prisma.engineer.findMany({
        where: {
          companyId
        },
        select: {
          id: true,
          name: true,
          empId: true,
          phone: true,
          alternatePhone: true
        },
        orderBy: {
          name: 'asc'
        }
      });

      console.log('Found engineers:', employees.length);
      console.log('Engineers:', employees);

      res.json({ 
        count: employees.length,
        employees 
      });
    } catch (error) {
      console.error('Get employees error:', error);
      res.status(500).json({ 
        error: 'Failed to fetch employees',
        details: error.message 
      });
    }
  }
);

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

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', message: 'Server is running' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  
  // Handle multer errors
  if (err.name === 'MulterError') {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ 
        success: false,
        error: 'File size too large. Maximum size is 5MB' 
      });
    }
    return res.status(400).json({ 
      success: false,
      error: err.message 
    });
  }
  
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

export default app;