// src/routes/engineerRoute.js
import express from 'express';
import { PrismaClient } from '../../generated/prisma/index.js';
import { authenticateToken } from '../middlewares/authMiddlewares.js';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

const router = express.Router();
const prisma = new PrismaClient();

// Configure multer for image uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'uploads/engineers';
    // Create directory if it doesn't exist
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

// Get all engineers for the authenticated user's company
router.get('/', authenticateToken, async (req, res) => {
  try {
    const engineers = await prisma.engineer.findMany({
      where: {
        companyId: req.user.companyId
      },
      orderBy: {
        createdAt: 'desc'
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
    const { name, phone, alternatePhone, empId, address } = req.body;

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
        companyId: req.user.companyId
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
    const { name, phone, alternatePhone, empId, address } = req.body;

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
        profileImage: profileImagePath
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