// src/routes/contractRoutes.js
import express from 'express';
import { 
  getAllContracts, 
  getContractById, 
  createContract, 
  updateContract, 
  deleteContract,
  getContractsByProject 
} from '../controllers/contractController.js';
import { authenticateToken } from '../middlewares/authMiddlewares.js';

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// GET all contracts for the user's company
router.get('/', getAllContracts);

// GET contracts by project ID
router.get('/project/:projectId', getContractsByProject);

// GET single contract by ID
router.get('/:id', getContractById);

// POST create new contract
router.post('/', createContract);

// PUT update contract
router.put('/:id', updateContract);

// DELETE contract
router.delete('/:id', deleteContract);

export default router;