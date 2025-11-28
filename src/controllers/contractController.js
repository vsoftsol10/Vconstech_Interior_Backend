// src/controllers/contractController.js
import { PrismaClient } from '../../generated/prisma/index.js';

const prisma = new PrismaClient();

// GET all contracts for the company
export const getAllContracts = async (req, res) => {
  try {
    const companyId = req.user.companyId;

    const contracts = await prisma.contract.findMany({
      where: {
        project: {
          companyId: companyId
        }
      },
      include: {
        project: {
          select: {
            id: true,
            name: true,
            projectId: true,
            status: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    // Transform data to match frontend format
    const transformedContracts = contracts.map(contract => ({
      id: contract.id,
      projectId: contract.projectId,
      projectName: contract.project.name,
      contractorName: contract.contractorName,
      contactNumber: contract.contactNumber,
      contractAmount: contract.contractAmount,
      workStatus: contract.workStatus,
      startDate: contract.startDate,
      endDate: contract.endDate,
      details: contract.details,
      createdAt: contract.createdAt
    }));

    res.json({
      success: true,
      count: transformedContracts.length,
      contracts: transformedContracts
    });
  } catch (error) {
    console.error('Get contracts error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch contracts',
      details: error.message
    });
  }
};

// GET single contract by ID
export const getContractById = async (req, res) => {
  try {
    const { id } = req.params;
    const companyId = req.user.companyId;

    const contract = await prisma.contract.findFirst({
      where: {
        id: parseInt(id),
        project: {
          companyId: companyId
        }
      },
      include: {
        project: {
          select: {
            id: true,
            name: true,
            projectId: true
          }
        }
      }
    });

    if (!contract) {
      return res.status(404).json({
        success: false,
        error: 'Contract not found'
      });
    }

    res.json({
      success: true,
      contract: {
        id: contract.id,
        projectId: contract.projectId,
        projectName: contract.project.name,
        contractorName: contract.contractorName,
        contactNumber: contract.contactNumber,
        contractAmount: contract.contractAmount,
        workStatus: contract.workStatus,
        startDate: contract.startDate,
        endDate: contract.endDate,
        details: contract.details
      }
    });
  } catch (error) {
    console.error('Get contract error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch contract',
      details: error.message
    });
  }
};

// GET contracts by project ID
export const getContractsByProject = async (req, res) => {
  try {
    const { projectId } = req.params;
    const companyId = req.user.companyId;

    // Verify project belongs to company
    const project = await prisma.project.findFirst({
      where: {
        id: parseInt(projectId),
        companyId: companyId
      }
    });

    if (!project) {
      return res.status(404).json({
        success: false,
        error: 'Project not found'
      });
    }

    const contracts = await prisma.contract.findMany({
      where: {
        projectId: parseInt(projectId)
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    res.json({
      success: true,
      count: contracts.length,
      contracts
    });
  } catch (error) {
    console.error('Get project contracts error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch project contracts',
      details: error.message
    });
  }
};

// POST create new contract
export const createContract = async (req, res) => {
  try {
    const {
      projectId,
      contractorName,
      contactNumber,
      contractAmount,
      workStatus,
      startDate,
      endDate,
      details
    } = req.body;

    const companyId = req.user.companyId;

    // Validate required fields
    if (!projectId || !contractorName || !contactNumber || !contractAmount) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: projectId, contractorName, contactNumber, contractAmount'
      });
    }

    // Verify project exists and belongs to company
    const project = await prisma.project.findFirst({
      where: {
        id: parseInt(projectId),
        companyId: companyId
      }
    });

    if (!project) {
      return res.status(404).json({
        success: false,
        error: 'Project not found or access denied'
      });
    }

    // Create contract
    const contract = await prisma.contract.create({
      data: {
        projectId: parseInt(projectId),
        contractorName,
        contactNumber,
        contractAmount: parseFloat(contractAmount),
        workStatus: workStatus || 'Pending',
        startDate: startDate ? new Date(startDate) : new Date(),
        endDate: endDate ? new Date(endDate) : new Date(),
        details: details || null
      },
      include: {
        project: {
          select: {
            id: true,
            name: true,
            projectId: true
          }
        }
      }
    });

    res.status(201).json({
      success: true,
      message: 'Contract created successfully',
      contract: {
        id: contract.id,
        projectId: contract.projectId,
        projectName: contract.project.name,
        contractorName: contract.contractorName,
        contactNumber: contract.contactNumber,
        contractAmount: contract.contractAmount,
        workStatus: contract.workStatus,
        startDate: contract.startDate,
        endDate: contract.endDate,
        details: contract.details
      }
    });
  } catch (error) {
    console.error('Create contract error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create contract',
      details: error.message
    });
  }
};

// PUT update contract
export const updateContract = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      contractorName,
      contactNumber,
      contractAmount,
      workStatus,
      startDate,
      endDate,
      details
    } = req.body;

    const companyId = req.user.companyId;

    // Verify contract exists and belongs to company
    const existingContract = await prisma.contract.findFirst({
      where: {
        id: parseInt(id),
        project: {
          companyId: companyId
        }
      }
    });

    if (!existingContract) {
      return res.status(404).json({
        success: false,
        error: 'Contract not found or access denied'
      });
    }

    // Update contract
    const contract = await prisma.contract.update({
      where: {
        id: parseInt(id)
      },
      data: {
        contractorName: contractorName || existingContract.contractorName,
        contactNumber: contactNumber || existingContract.contactNumber,
        contractAmount: contractAmount ? parseFloat(contractAmount) : existingContract.contractAmount,
        workStatus: workStatus || existingContract.workStatus,
        startDate: startDate ? new Date(startDate) : existingContract.startDate,
        endDate: endDate ? new Date(endDate) : existingContract.endDate,
        details: details !== undefined ? details : existingContract.details
      },
      include: {
        project: {
          select: {
            id: true,
            name: true,
            projectId: true
          }
        }
      }
    });

    res.json({
      success: true,
      message: 'Contract updated successfully',
      contract: {
        id: contract.id,
        projectId: contract.projectId,
        projectName: contract.project.name,
        contractorName: contract.contractorName,
        contactNumber: contract.contactNumber,
        contractAmount: contract.contractAmount,
        workStatus: contract.workStatus,
        startDate: contract.startDate,
        endDate: contract.endDate,
        details: contract.details
      }
    });
  } catch (error) {
    console.error('Update contract error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update contract',
      details: error.message
    });
  }
};

// DELETE contract
export const deleteContract = async (req, res) => {
  try {
    const { id } = req.params;
    const companyId = req.user.companyId;

    // Verify contract exists and belongs to company
    const contract = await prisma.contract.findFirst({
      where: {
        id: parseInt(id),
        project: {
          companyId: companyId
        }
      }
    });

    if (!contract) {
      return res.status(404).json({
        success: false,
        error: 'Contract not found or access denied'
      });
    }

    // Delete contract
    await prisma.contract.delete({
      where: {
        id: parseInt(id)
      }
    });

    res.json({
      success: true,
      message: 'Contract deleted successfully'
    });
  } catch (error) {
    console.error('Delete contract error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete contract',
      details: error.message
    });
  }
};