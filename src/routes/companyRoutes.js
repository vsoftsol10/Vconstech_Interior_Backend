// src/routes/companyRoutes.js
import express from 'express';
import { PrismaClient } from '../../generated/prisma/index.js';
import { authenticateToken } from '../middlewares/authMiddlewares.js';

const router = express.Router();
const prisma = new PrismaClient();

// GET /api/companies/:id - Get company by ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Verify user has access to this company
    if (req.user.companyId !== id) {
      return res.status(403).json({ 
        error: 'Access denied. You can only view your own company.' 
      });
    }
    
    const company = await prisma.company.findUnique({
      where: { id },
      select: { 
        id: true,
        name: true,
        createdAt: true,
        updatedAt: true
      }
    });
    
    if (!company) {
      return res.status(404).json({ error: 'Company not found' });
    }
    
    res.json(company);
  } catch (error) {
    console.error('Error fetching company:', error);
    res.status(500).json({ 
      error: 'Failed to fetch company',
      details: error.message 
    });
  }
});

export default router;