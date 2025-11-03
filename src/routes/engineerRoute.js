// src/routes/engineerRoute.js
import express from 'express';
import { PrismaClient } from '../../generated/prisma/index.js';
import { authenticateToken } from '../middlewares/authMiddlewares.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

const router = express.Router();
const prisma = new PrismaClient();

// Configure multer for image uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'uploads/engineers';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'engineer-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files are allowed (jpeg, jpg, png, gif)'));
    }
  }
});

// ============================================
// ENGINEER LOGIN ENDPOINT (NEW)
// ============================================
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    // Validation
    if (!username || !password) {
      return res.status(400).json({ 
        success: false,
        error: 'Username and password are required' 
      });
    }

    // Find engineer by username
    const engineer = await prisma.engineer.findFirst({
      where: {
        username: username
      },
      include: {
        company: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    if (!engineer) {
      return res.status(401).json({ 
        success: false,
        error: 'Invalid username or password' 
      });
    }

    // Check if engineer has credentials set
    if (!engineer.password) {
      return res.status(401).json({ 
        success: false,
        error: 'No credentials set for this engineer. Please contact your administrator.' 
      });
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, engineer.password);

    if (!isPasswordValid) {
      return res.status(401).json({ 
        success: false,
        error: 'Invalid username or password' 
      });
    }

    // Generate JWT token
    const token = jwt.sign(
      { 
        id: engineer.id,
        username: engineer.username,
        name: engineer.name,
        companyId: engineer.companyId,
        role: 'Site_Engineer',
        type: 'engineer'
      },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '7d' }
    );

    // Return success response
    res.json({
      success: true,
      message: 'Login successful',
      token,
      engineer: {
        id: engineer.id,
        name: engineer.name,
        username: engineer.username,
        empId: engineer.empId,
        phone: engineer.phone,
        profileImage: engineer.profileImage,
        companyId: engineer.companyId,
        companyName: engineer.company.name
      }
    });

  } catch (error) {
    console.error('Engineer login error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Login failed. Please try again.' 
    });
  }
});

// ============================================
// ADMIN ROUTES (Protected)
// ============================================

// Get all engineers for the authenticated user's company
router.get('/', authenticateToken, async (req, res) => {
  try {
    const engineers = await prisma.engineer.findMany({
      where: {
        companyId: req.user.companyId
      },
      orderBy: {
        createdAt: 'desc'
      },
      select: {
        id: true,
        name: true,
        empId: true,
        phone: true,
        alternatePhone: true,
        address: true,
        profileImage: true,
        username: true,
        // Don't send password hash to frontend
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            projects: true
          }
        }
      }
    });

    res.json({ 
      success: true,
      engineers 
    });
  } catch (error) {
    console.error('Error fetching engineers:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch engineers' 
    });
  }
});

// Get single engineer by ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const engineer = await prisma.engineer.findFirst({
      where: {
        id: parseInt(id),
        companyId: req.user.companyId
      },
      select: {
        id: true,
        name: true,
        empId: true,
        phone: true,
        alternatePhone: true,
        address: true,
        profileImage: true,
        username: true,
        createdAt: true,
        updatedAt: true,
        projects: {
          select: {
            id: true,
            name: true,
            projectId: true,
            status: true
          }
        }
      }
    });

    if (!engineer) {
      return res.status(404).json({ 
        success: false,
        error: 'Engineer not found' 
      });
    }

    res.json({ 
      success: true,
      engineer 
    });
  } catch (error) {
    console.error('Error fetching engineer:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch engineer' 
    });
  }
});

// Create new engineer
router.post('/', authenticateToken, upload.single('profileImage'), async (req, res) => {
  try {
    const { name, phone, alternatePhone, empId, address, username, password } = req.body;

    console.log('=== CREATE ENGINEER REQUEST ===');
    console.log('Headers:', {
      'content-type': req.headers['content-type'],
      'authorization': req.headers.authorization ? 'Bearer ***' : 'MISSING'
    });
    console.log('Body fields:', Object.keys(req.body));
    console.log('Body values:', {
      name: name || 'MISSING',
      phone: phone || 'MISSING',
      alternatePhone: alternatePhone || 'empty',
      empId: empId || 'MISSING',
      address: address || 'MISSING',
      username: username || 'MISSING',
      password: password ? '***' : 'MISSING',
      hasFile: !!req.file
    });
    console.log('================================');


        const missingFields = [];
    if (!name || !name.trim()) missingFields.push('name');
    if (!phone || !phone.trim()) missingFields.push('phone');
    if (!empId || !empId.trim()) missingFields.push('empId');
    if (!address || !address.trim()) missingFields.push('address');
    if (!username || !username.trim()) missingFields.push('username');
    if (!password) missingFields.push('password');

    if (missingFields.length > 0) {
      console.log('Missing fields:', missingFields); // ✅ LOG MISSING FIELDS
      return res.status(400).json({ 
        success: false,
        error: `Missing required fields: ${missingFields.join(', ')}`,
        missingFields
      });
    }

    // Validation
   if (!name || !phone || !empId || !address || !username || !password) {
      return res.status(400).json({ 
        success: false,
        error: 'Name, phone, employee ID, address, username, and password are required' 
      });
    }

    // Validate phone number format
    const phoneRegex = /^\d{10}$/;
    if (!phoneRegex.test(phone)) {
      return res.status(400).json({ 
        success: false,
        error: 'Phone number must be 10 digits' 
      });
    }

    // Validate alternate phone if provided
    if (alternatePhone && !phoneRegex.test(alternatePhone)) {
      return res.status(400).json({ 
        success: false,
        error: 'Alternate phone number must be 10 digits' 
      });
    }

    // Check if employee ID already exists in company
    const existingEngineer = await prisma.engineer.findFirst({
      where: {
        empId: empId,
        companyId: req.user.companyId
      }
    });

    if (existingEngineer) {
      return res.status(400).json({ 
        success: false,
        error: 'Employee ID already exists' 
      });
    }

    // Validate username if provided
    if (username) {
      // Validate username
    if (username.length < 4) {
      return res.status(400).json({ 
        success: false,
        error: 'Username must be at least 4 characters' 
      });
    }

    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      return res.status(400).json({ 
        success: false,
        error: 'Username can only contain letters, numbers, and underscores' 
      });
    }

       // Check if username already exists in company
    const existingUsername = await prisma.engineer.findFirst({
      where: {
        username: username,
        companyId: req.user.companyId
      }
    });

    if (existingUsername) {
      return res.status(400).json({ 
        success: false,
        error: 'Username already exists in your company' 
      });
    }

      // If username is provided, password must be provided
      if (!password) {
        return res.status(400).json({ 
          success: false,
          error: 'Password is required when username is provided' 
        });
      }

      if (password.length < 6) {
      return res.status(400).json({ 
        success: false,
        error: 'Password must be at least 6 characters' 
      });
    }
    
    }

    // Hash password if provided
    let hashedPassword = null;
    if (password && username) {
      hashedPassword = await bcrypt.hash(password, 10);
    }

    // Get profile image path if uploaded
    const profileImagePath = req.file ? `/uploads/engineers/${req.file.filename}` : null;

    // Create engineer
   const engineer = await prisma.engineer.create({
      data: {
        name,
        empId,
        phone,
        alternatePhone: alternatePhone || null,
        address,
        profileImage: profileImagePath,
        username: username,
        password: hashedPassword,
        companyId: req.user.companyId
      },
      select: {
        id: true,
        name: true,
        empId: true,
        phone: true,
        alternatePhone: true,
        address: true,
        profileImage: true,
        username: true,
        createdAt: true,
        updatedAt: true
      }
    });

    res.status(201).json({ 
      success: true,
      message: 'Engineer added successfully',
      engineer 
    });
  } catch (error) {
    console.error('Error creating engineer:', error);
    
    // Delete uploaded file if there was an error
    if (req.file) {
      fs.unlink(req.file.path, (err) => {
        if (err) console.error('Error deleting file:', err);
      });
    }

    res.status(500).json({ 
      success: false,
      error: 'Failed to create engineer' 
    });
  }
});

// Update engineer
router.put('/:id', authenticateToken, upload.single('profileImage'), async (req, res) => {
  try {
    const { id } = req.params;
    const { name, phone, alternatePhone, empId, address, username, password } = req.body;

    // Check if engineer exists and belongs to user's company
    const existingEngineer = await prisma.engineer.findFirst({
      where: {
        id: parseInt(id),
        companyId: req.user.companyId
      }
    });

    if (!existingEngineer) {
      return res.status(404).json({ 
        success: false,
        error: 'Engineer not found' 
      });
    }

    // Validation
    if (!name || !phone || !empId || !address) {
      return res.status(400).json({ 
        success: false,
        error: 'Name, phone, employee ID, and address are required' 
      });
    }

    // Validate phone number format
    const phoneRegex = /^\d{10}$/;
    if (!phoneRegex.test(phone)) {
      return res.status(400).json({ 
        success: false,
        error: 'Phone number must be 10 digits' 
      });
    }

    // Validate alternate phone if provided
    if (alternatePhone && !phoneRegex.test(alternatePhone)) {
      return res.status(400).json({ 
        success: false,
        error: 'Alternate phone number must be 10 digits' 
      });
    }

    // Check if employee ID already exists (excluding current engineer)
    const duplicateEngineer = await prisma.engineer.findFirst({
      where: {
        empId: empId,
        companyId: req.user.companyId,
        NOT: {
          id: parseInt(id)
        }
      }
    });

    if (duplicateEngineer) {
      return res.status(400).json({ 
        success: false,
        error: 'Employee ID already exists' 
      });
    }

    // Validate username if provided
    if (username) {
      if (username.length < 4) {
        return res.status(400).json({ 
          success: false,
          error: 'Username must be at least 4 characters' 
        });
      }

      if (!/^[a-zA-Z0-9_]+$/.test(username)) {
        return res.status(400).json({ 
          success: false,
          error: 'Username can only contain letters, numbers, and underscores' 
        });
      }

      // Check if username already exists (excluding current engineer)
      const duplicateUsername = await prisma.engineer.findFirst({
        where: {
          username: username,
          companyId: req.user.companyId,
          NOT: {
            id: parseInt(id)
          }
        }
      });

      if (duplicateUsername) {
        return res.status(400).json({ 
          success: false,
          error: 'Username already exists in your company' 
        });
      }
    }

    // Hash password if new password provided
    let hashedPassword = existingEngineer.password; // Keep existing password
    if (password) {
      if (password.length < 6) {
        return res.status(400).json({ 
          success: false,
          error: 'Password must be at least 6 characters' 
        });
      }
      hashedPassword = await bcrypt.hash(password, 10);
    }

    // Get profile image path if uploaded
    let profileImagePath = existingEngineer.profileImage;
    if (req.file) {
      // Delete old image if exists
      if (existingEngineer.profileImage) {
        const oldImagePath = path.join(process.cwd(), existingEngineer.profileImage);
        if (fs.existsSync(oldImagePath)) {
          fs.unlinkSync(oldImagePath);
        }
      }
      profileImagePath = `/uploads/engineers/${req.file.filename}`;
    }

    // Update engineer
    const engineer = await prisma.engineer.update({
      where: { id: parseInt(id) },
      data: {
        name,
        empId,
        phone,
        alternatePhone: alternatePhone || null,
        address,
        profileImage: profileImagePath,
        username: username || null,
        password: hashedPassword
      },
      select: {
        id: true,
        name: true,
        empId: true,
        phone: true,
        alternatePhone: true,
        address: true,
        profileImage: true,
        username: true,
        createdAt: true,
        updatedAt: true
      }
    });

    res.json({ 
      success: true,
      message: 'Engineer updated successfully',
      engineer 
    });
  } catch (error) {
    console.error('Error updating engineer:', error);
    
    // Delete uploaded file if there was an error
    if (req.file) {
      fs.unlink(req.file.path, (err) => {
        if (err) console.error('Error deleting file:', err);
      });
    }

    res.status(500).json({ 
      success: false,
      error: 'Failed to update engineer' 
    });
  }
});

// Delete engineer
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    // Check if engineer exists and belongs to user's company
    const engineer = await prisma.engineer.findFirst({
      where: {
        id: parseInt(id),
        companyId: req.user.companyId
      }
    });

    if (!engineer) {
      return res.status(404).json({ 
        success: false,
        error: 'Engineer not found' 
      });
    }

    // Delete profile image if exists
    if (engineer.profileImage) {
      const imagePath = path.join(process.cwd(), engineer.profileImage);
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
      }
    }

    // Delete engineer
    await prisma.engineer.delete({
      where: { id: parseInt(id) }
    });

    res.json({ 
      success: true,
      message: 'Engineer deleted successfully' 
    });
  } catch (error) {
    console.error('Error deleting engineer:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to delete engineer' 
    });
  }
});

export default router;