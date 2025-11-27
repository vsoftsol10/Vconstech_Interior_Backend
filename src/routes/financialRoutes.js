// src/routes/financialRoutes.js
import express from 'express';
import { authenticateToken } from '../middlewares/authMiddlewares.js';
import { PrismaClient } from '../../generated/prisma/index.js';

const router = express.Router();
const prisma = new PrismaClient();

// ============ GET ALL PROJECTS WITH FINANCIAL DATA ============
router.get('/projects', authenticateToken, async (req, res) => {
  try {
    const companyId = req.user.companyId;

    const projects = await prisma.project.findMany({
      where: { companyId },
      include: {
        expenses: {
          orderBy: { createdAt: 'desc' }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    // Transform data to match frontend structure
    const transformedProjects = projects.map(project => ({
      id: project.id,
      name: project.name,
      budget: project.budget || 0,
      dueDate: project.dueDate || project.endDate,
      quotationAmount: project.quotationAmount || project.budget || 0,
      expenses: project.expenses.map(exp => ({
        id: exp.id,
        category: exp.category,
        amount: exp.amount
      }))
    }));

    res.json({
      success: true,
      projects: transformedProjects,
      count: transformedProjects.length
    });
  } catch (error) {
    console.error('Get financial projects error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch projects',
      details: error.message
    });
  }
});

// ============ GET SINGLE PROJECT WITH EXPENSES ============
router.get('/projects/:id', authenticateToken, async (req, res) => {
  try {
    const projectId = parseInt(req.params.id);
    const companyId = req.user.companyId;

    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
        companyId
      },
      include: {
        expenses: {
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    if (!project) {
      return res.status(404).json({
        success: false,
        error: 'Project not found'
      });
    }

    const transformedProject = {
      id: project.id,
      name: project.name,
      budget: project.budget || 0,
      dueDate: project.dueDate || project.endDate,
      quotationAmount: project.quotationAmount || project.budget || 0,
      expenses: project.expenses.map(exp => ({
        id: exp.id,
        category: exp.category,
        amount: exp.amount
      }))
    };

    res.json({
      success: true,
      project: transformedProject
    });
  } catch (error) {
    console.error('Get project error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch project',
      details: error.message
    });
  }
});

// ============ ADD NEW PROJECT ============
router.post('/projects', authenticateToken, async (req, res) => {
  try {
    const { name, budget, quotationAmount, dueDate } = req.body;
    const companyId = req.user.companyId;

    // Validation
    if (!name || !budget || !quotationAmount || !dueDate) {
      return res.status(400).json({
        success: false,
        error: 'Name, budget, quotation amount, and due date are required'
      });
    }

    // Generate unique projectId
    const projectCount = await prisma.project.count({
      where: { companyId }
    });
    const projectId = `PRJ-${Date.now()}-${projectCount + 1}`;

    const project = await prisma.project.create({
      data: {
        projectId,
        name,
        budget: parseFloat(budget),
        quotationAmount: parseFloat(quotationAmount),
        dueDate: new Date(dueDate),
        clientName: 'N/A', // Required field
        projectType: 'Interior', // Default value
        companyId,
        status: 'ONGOING'
      },
      include: {
        expenses: true
      }
    });

    const transformedProject = {
      id: project.id,
      name: project.name,
      budget: project.budget,
      dueDate: project.dueDate,
      quotationAmount: project.quotationAmount,
      expenses: []
    };

    res.status(201).json({
      success: true,
      message: 'Project created successfully',
      project: transformedProject
    });
  } catch (error) {
    console.error('Create project error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create project',
      details: error.message
    });
  }
});

// ============ ADD EXPENSE TO PROJECT ============
router.post('/projects/:id/expenses', authenticateToken, async (req, res) => {
  try {
    const projectId = parseInt(req.params.id);
    const { category, amount } = req.body;
    const companyId = req.user.companyId;

    // Validation
    if (!category || !amount) {
      return res.status(400).json({
        success: false,
        error: 'Category and amount are required'
      });
    }

    // Verify project belongs to user's company
    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
        companyId
      }
    });

    if (!project) {
      return res.status(404).json({
        success: false,
        error: 'Project not found'
      });
    }

    // Create expense
    const expense = await prisma.projectExpense.create({
      data: {
        projectId,
        category,
        amount: parseFloat(amount)
      }
    });

    res.status(201).json({
      success: true,
      message: 'Expense added successfully',
      expense: {
        id: expense.id,
        category: expense.category,
        amount: expense.amount
      }
    });
  } catch (error) {
    console.error('Add expense error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to add expense',
      details: error.message
    });
  }
});

// ============ UPDATE EXPENSE ============
router.put('/expenses/:id', authenticateToken, async (req, res) => {
  try {
    const expenseId = parseInt(req.params.id);
    const { category, amount } = req.body;
    const companyId = req.user.companyId;

    // Validation
    if (!category || !amount) {
      return res.status(400).json({
        success: false,
        error: 'Category and amount are required'
      });
    }

    // Verify expense belongs to user's company project
    const expense = await prisma.projectExpense.findFirst({
      where: { id: expenseId },
      include: { project: true }
    });

    if (!expense || expense.project.companyId !== companyId) {
      return res.status(404).json({
        success: false,
        error: 'Expense not found'
      });
    }

    // Update expense
    const updatedExpense = await prisma.projectExpense.update({
      where: { id: expenseId },
      data: {
        category,
        amount: parseFloat(amount)
      }
    });

    res.json({
      success: true,
      message: 'Expense updated successfully',
      expense: {
        id: updatedExpense.id,
        category: updatedExpense.category,
        amount: updatedExpense.amount
      }
    });
  } catch (error) {
    console.error('Update expense error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update expense',
      details: error.message
    });
  }
});

// ============ DELETE EXPENSE ============
router.delete('/expenses/:id', authenticateToken, async (req, res) => {
  try {
    const expenseId = parseInt(req.params.id);
    const companyId = req.user.companyId;

    // Verify expense belongs to user's company project
    const expense = await prisma.projectExpense.findFirst({
      where: { id: expenseId },
      include: { project: true }
    });

    if (!expense || expense.project.companyId !== companyId) {
      return res.status(404).json({
        success: false,
        error: 'Expense not found'
      });
    }

    // Delete expense
    await prisma.projectExpense.delete({
      where: { id: expenseId }
    });

    res.json({
      success: true,
      message: 'Expense deleted successfully'
    });
  } catch (error) {
    console.error('Delete expense error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete expense',
      details: error.message
    });
  }
});

// ============ GET FINANCIAL SUMMARY ============
router.get('/summary', authenticateToken, async (req, res) => {
  try {
    const companyId = req.user.companyId;

    const projects = await prisma.project.findMany({
      where: { companyId },
      include: {
        expenses: true
      }
    });

    let totalBudget = 0;
    let totalSpent = 0;
    let totalProjects = projects.length;
    let projectsOverBudget = 0;

    projects.forEach(project => {
      const budget = project.budget || 0;
      const spent = project.expenses.reduce((sum, exp) => sum + exp.amount, 0);
      
      totalBudget += budget;
      totalSpent += spent;
      
      if (spent > budget) {
        projectsOverBudget++;
      }
    });

    res.json({
      success: true,
      summary: {
        totalBudget,
        totalSpent,
        totalRemaining: totalBudget - totalSpent,
        totalProjects,
        projectsOverBudget,
        utilizationPercentage: totalBudget > 0 ? ((totalSpent / totalBudget) * 100).toFixed(2) : 0
      }
    });
  } catch (error) {
    console.error('Get summary error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch summary',
      details: error.message
    });
  }
});

export default router;