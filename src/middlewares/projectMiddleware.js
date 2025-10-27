// src/middlewares/projectValidation.js

export const validateProjectCreate = (req, res, next) => {
  const { projectId, name, clientName } = req.body;
  const errors = [];

  if (!projectId || projectId.trim() === '') {
    errors.push('Project ID is required');
  }

  if (!name || name.trim() === '') {
    errors.push('Project name is required');
  }

  if (!clientName || clientName.trim() === '') {
    errors.push('Client name is required');
  }

  // Validate project ID format (alphanumeric, dashes, underscores)
  if (projectId && !/^[a-zA-Z0-9_-]+$/.test(projectId)) {
    errors.push('Project ID can only contain letters, numbers, dashes, and underscores');
  }

  // Validate dates if provided
  const { startDate, endDate } = req.body;
  if (startDate && endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    if (end < start) {
      errors.push('End date must be after start date');
    }
  }

  // Validate budget if provided
  if (req.body.budget && (isNaN(req.body.budget) || parseFloat(req.body.budget) < 0)) {
    errors.push('Budget must be a positive number');
  }

  if (errors.length > 0) {
    return res.status(400).json({ 
      error: 'Validation failed', 
      details: errors 
    });
  }

  next();
};

export const validateProjectUpdate = (req, res, next) => {
  const errors = [];

  // Validate dates if provided
  const { startDate, endDate } = req.body;
  if (startDate && endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    if (end < start) {
      errors.push('End date must be after start date');
    }
  }

  // Validate budget if provided
  if (req.body.budget !== undefined && (isNaN(req.body.budget) || parseFloat(req.body.budget) < 0)) {
    errors.push('Budget must be a positive number');
  }

  // Validate status if provided
  const validStatuses = ['PENDING', 'ONGOING', 'COMPLETED'];
  if (req.body.status && !validStatuses.includes(req.body.status)) {
    errors.push('Invalid status. Must be one of: PENDING, ONGOING, COMPLETED');
  }

  if (errors.length > 0) {
    return res.status(400).json({ 
      error: 'Validation failed', 
      details: errors 
    });
  }

  next();
};