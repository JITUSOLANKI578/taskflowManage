import jwt from 'jsonwebtoken';
import User from '../models/User.js';

export const auth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ message: 'No token, authorization denied' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).populate('company teams');
    
    if (!user || !user.isActive) {
      return res.status(401).json({ message: 'Token is not valid' });
    }

    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({ message: 'Token is not valid' });
  }
};

export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ 
        message: 'Access denied. Insufficient permissions.' 
      });
    }
    next();
  };
};

export const checkCompanyAccess = async (req, res, next) => {
  try {
    if (req.user.role === 'masteradmin') {
      return next();
    }

    const companyId = req.params.companyId || req.body.company || req.user.company?._id;
    
    if (!companyId) {
      return res.status(400).json({ message: 'Company ID required' });
    }

    if (req.user.company?._id.toString() !== companyId.toString()) {
      return res.status(403).json({ message: 'Access denied to this company' });
    }

    next();
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};