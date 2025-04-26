const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');

module.exports = async (req, res, next) => {
  try {
    // Check if user has admin role
    const admin = await Admin.findById(req.user.id);
    
    if (!admin) {
      return res.status(403).json({ message: 'Access denied. Admin privileges required.' });
    }
    
    // Add admin to request
    req.admin = admin;
    next();
  } catch (error) {
    res.status(500).json({ message: 'Server error during admin authentication' });
  }
};
