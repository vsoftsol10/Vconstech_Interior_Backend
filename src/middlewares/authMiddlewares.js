// middleware/authMiddlewares.js
import jwt from 'jsonwebtoken';

export const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      console.error('❌ JWT Verification Error:', err.message);
      return res.status(403).json({ error: 'Invalid or expired token' });
    }

    // ✅ Log the decoded token for debugging
    console.log('✅ Token verified successfully');
    console.log('👤 Decoded user:', decoded);
    
    req.user = decoded;
    next();
  });
};

export const authorizeRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      console.error('❌ No user found in request');
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!req.user.role) {
      console.error('❌ No role found in token:', req.user);
      return res.status(403).json({ 
        error: 'No role found in token',
        tokenData: req.user 
      });
    }

    // ✅ Case-insensitive comparison with trim
    const userRole = req.user.role.toUpperCase().trim();
    const allowedRoles = roles.map(role => role.toUpperCase().trim());

    // ✅ Log authorization check
    console.log('🔒 Authorization Check:');
    console.log('   Endpoint requires:', allowedRoles);
    console.log('   User has role:', userRole);
    console.log('   Is authorized?', allowedRoles.includes(userRole));

    if (!allowedRoles.includes(userRole)) {
      console.error('❌ Authorization failed');
      return res.status(403).json({
        error: 'You do not have permission to perform this action',
        requiredRole: roles,
        yourRole: req.user.role,
        debugInfo: {
          userRoleUppercase: userRole,
          allowedRolesUppercase: allowedRoles
        }
      });
    }

    console.log('✅ Authorization successful');
    next();
  };
};