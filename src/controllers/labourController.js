// src/controllers/labourController.js
import * as labourService from '../services/labourService.js';

// Get all labourers for a company
export const getAllLabourers = async (req, res) => {
  try {
    const companyId = req.user.companyId;
    const { projectId } = req.query;
    
    const labourers = await labourService.getAllLabourers(companyId, projectId);
    
    res.json({
      success: true,
      data: labourers,
      count: labourers.length
    });
  } catch (error) {
    console.error('Get all labourers error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch labourers',
      details: error.message
    });
  }
};

// Get single labourer by ID
export const getLabourerById = async (req, res) => {
  try {
    const { id } = req.params;
    const companyId = req.user.companyId;
    
    const labourer = await labourService.getLabourerById(parseInt(id), companyId);
    
    if (!labourer) {
      return res.status(404).json({
        success: false,
        error: 'Labourer not found'
      });
    }
    
    res.json({
      success: true,
      data: labourer
    });
  } catch (error) {
    console.error('Get labourer by ID error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch labourer',
      details: error.message
    });
  }
};

// Create new labourer
export const createLabourer = async (req, res) => {
  try {
    const companyId = req.user.companyId;
    
    console.log('📝 Create labourer request body:', req.body);
    console.log('👤 User info:', { companyId, userId: req.user.id });
    
    const { name, phone, address, projectId } = req.body;
    
    // Validation
    if (!name || !phone) {
      console.log('❌ Validation failed - missing name or phone');
      return res.status(400).json({
        success: false,
        error: 'Name and phone are required'
      });
    }
    
    const labourerData = {
      name: name.trim(),
      phone: phone.trim(),
      address: address ? address.trim() : null,
      companyId,
      projectId: projectId ? parseInt(projectId) : null
    };
    
    console.log('✅ Validated labourer data:', labourerData);
    
    const labourer = await labourService.createLabourer(labourerData);
    
    console.log('✅ Labourer created successfully:', labourer.id);
    
    res.status(201).json({
      success: true,
      data: labourer,
      message: 'Labourer created successfully'
    });
  } catch (error) {
    console.error('❌ Create labourer error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create labourer',
      details: error.message
    });
  }
};

// Update labourer
export const updateLabourer = async (req, res) => {
  try {
    const { id } = req.params;
    const companyId = req.user.companyId;
    const { name, phone, address, projectId } = req.body;
    
    // Validation
    if (!name || !phone) {
      return res.status(400).json({
        success: false,
        error: 'Name and phone are required'
      });
    }
    
    const updateData = {
      name: name.trim(),
      phone: phone.trim(),
      address: address ? address.trim() : null,
      projectId: projectId ? parseInt(projectId) : null
    };
    
    const labourer = await labourService.updateLabourer(
      parseInt(id), 
      companyId, 
      updateData
    );
    
    if (!labourer) {
      return res.status(404).json({
        success: false,
        error: 'Labourer not found'
      });
    }
    
    res.json({
      success: true,
      data: labourer,
      message: 'Labourer updated successfully'
    });
  } catch (error) {
    console.error('Update labourer error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update labourer',
      details: error.message
    });
  }
};

// Delete labourer
export const deleteLabourer = async (req, res) => {
  try {
    const { id } = req.params;
    const companyId = req.user.companyId;
    
    const result = await labourService.deleteLabourer(parseInt(id), companyId);
    
    if (!result) {
      return res.status(404).json({
        success: false,
        error: 'Labourer not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Labourer deleted successfully'
    });
  } catch (error) {
    console.error('Delete labourer error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete labourer',
      details: error.message
    });
  }
};

// Add payment to labourer
export const addPayment = async (req, res) => {
  try {
    const { id } = req.params;
    const companyId = req.user.companyId;
    const { amount, date, remarks } = req.body;
    
    console.log('💰 Add payment request:', { labourId: id, amount, date });
    
    // Validation
    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Valid amount is required'
      });
    }
    
    const paymentData = {
      amount: parseFloat(amount),
      date: date ? new Date(date) : new Date(),
      remarks: remarks || null
    };
    
    const payment = await labourService.addPayment(
      parseInt(id), 
      companyId, 
      paymentData
    );
    
    if (!payment) {
      return res.status(404).json({
        success: false,
        error: 'Labourer not found'
      });
    }
    
    console.log('✅ Payment added successfully');
    
    res.status(201).json({
      success: true,
      data: payment,
      message: 'Payment added successfully'
    });
  } catch (error) {
    console.error('Add payment error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to add payment',
      details: error.message
    });
  }
};

// Get all payments for a labourer
export const getLabourerPayments = async (req, res) => {
  try {
    const { id } = req.params;
    const companyId = req.user.companyId;
    
    const payments = await labourService.getLabourerPayments(
      parseInt(id), 
      companyId
    );
    
    res.json({
      success: true,
      data: payments,
      count: payments.length
    });
  } catch (error) {
    console.error('Get labourer payments error:', error);
    
    if (error.message === 'Labourer not found or access denied') {
      return res.status(404).json({
        success: false,
        error: error.message
      });
    }
    
    res.status(500).json({
      success: false,
      error: 'Failed to fetch payments',
      details: error.message
    });
  }
};

// Delete payment
export const deletePayment = async (req, res) => {
  try {
    const { labourId, paymentId } = req.params;
    const companyId = req.user.companyId;
    
    const result = await labourService.deletePayment(
      parseInt(paymentId),
      parseInt(labourId),
      companyId
    );
    
    if (!result) {
      return res.status(404).json({
        success: false,
        error: 'Payment not found or access denied'
      });
    }
    
    res.json({
      success: true,
      message: 'Payment deleted successfully'
    });
  } catch (error) {
    console.error('Delete payment error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete payment',
      details: error.message
    });
  }
};

// Get labourers by project
export const getLabourersByProject = async (req, res) => {
  try {
    const { projectId } = req.params;
    const companyId = req.user.companyId;
    
    const labourers = await labourService.getLabourersByProject(
      parseInt(projectId), 
      companyId
    );
    
    res.json({
      success: true,
      data: labourers,
      count: labourers.length
    });
  } catch (error) {
    console.error('Get labourers by project error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch labourers for project',
      details: error.message
    });
  }
};

// Get labour statistics
export const getLabourStatistics = async (req, res) => {
  try {
    const companyId = req.user.companyId;
    const { projectId } = req.query;
    
    const statistics = await labourService.getLabourStatistics(
      companyId,
      projectId ? parseInt(projectId) : null
    );
    
    res.json({
      success: true,
      data: statistics
    });
  } catch (error) {
    console.error('Get labour statistics error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch labour statistics',
      details: error.message
    });
  }
};