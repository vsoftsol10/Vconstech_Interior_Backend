// src/controllers/userController.js
import { PrismaClient } from '../../generated/prisma/index.js';

const prisma = new PrismaClient();

// Get all site engineers in the same company
export const getEmployees = async (req, res) => {
  try {
    const companyId = req.user.companyId;

    // Fetch users with 'Site Engineer' role from the same company
    const employees = await prisma.user.findMany({
      where: {
        companyId,
        role: 'Site_Engineer'
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true
      },
      orderBy: {
        name: 'asc'
      }
    });

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
};

// Get all users in the company (for Admin)
export const getAllUsers = async (req, res) => {
  try {
    const companyId = req.user.companyId;

    const users = await prisma.user.findMany({
      where: {
        companyId
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true
      },
      orderBy: {
        name: 'asc'
      }
    });

    res.json({
      count: users.length,
      users
    });

  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch users',
      details: error.message 
    });
  }
};