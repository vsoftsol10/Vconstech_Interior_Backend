import { PrismaClient } from '../../generated/prisma/index.js';

const prisma = new PrismaClient();

// Get all engineers in the same company
export const getEmployees = async (req, res) => {
  
  try {
    const companyId = req.user.companyId;

    console.log('==================');
    console.log('Logged in user:', req.user); // ✅ See the full user object
    console.log('Looking for companyId:', companyId); // ✅ See what companyId we're searching for
    console.log('==================');

    // ✅ Fetch from Engineer table
    const employees = await prisma.engineer.findMany({
      where: {
        companyId
      },
      select: {
        id: true,
        name: true,
        empId: true,
        phone: true,
        alternatePhone: true,
        companyId: true  // ✅ Also return companyId to compare
      },
      orderBy: {
        name: 'asc'
      }
    });

    console.log('Found engineers:', employees.length); // ✅ How many found
    console.log('Engineers data:', employees); // ✅ See the full data

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

// Keep your getAllUsers function as is...
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