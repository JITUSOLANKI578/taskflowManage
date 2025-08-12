import express from 'express';
import { body, validationResult } from 'express-validator';
import Company from '../models/Company.js';
import User from '../models/User.js';
import { auth, authorize } from '../middleware/auth.js';

const router = express.Router();

// @route   GET /api/companies
// @desc    Get all companies (masteradmin only)
// @access  Private
router.get('/', auth, authorize('masteradmin'), async (req, res) => {
  try {
    const companies = await Company.find({ isActive: true })
      .populate('admin', 'name email isActive')
      .populate({
        path: 'employees',
        select: 'name email role isActive',
        match: { isActive: true }
      })
      .populate({
        path: 'teams',
        select: 'name description members',
        match: { isActive: true }
      })
      .populate({
        path: 'projects',
        select: 'name description status priority deadline',
        match: { isActive: true }
      })
      .sort({ createdAt: -1 });

    res.json(companies);
  } catch (error) {
    console.error('Error fetching companies:', error);
    res.status(500).json({ message: 'Server error while fetching companies' });
  }
});

// @route   POST /api/companies
// @desc    Create company with admin
// @access  Private (masteradmin only)
router.post('/', [
  auth,
  authorize('masteradmin'),
  body('name')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Company name must be between 2-100 characters')
    .matches(/^[a-zA-Z0-9\s\-&.,]+$/)
    .withMessage('Company name contains invalid characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description must be less than 500 characters'),
  body('adminName')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Admin name must be between 2-50 characters')
    .matches(/^[a-zA-Z\s\-']+$/)
    .withMessage('Admin name contains invalid characters'),
  body('adminEmail')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please enter a valid email address')
    .custom(async (email) => {
      const existingUser = await User.findOne({ email: email.toLowerCase() });
      if (existingUser) {
        throw new Error('This email address is already in use');
      }
    }),
  body('adminPassword')
    .isLength({ min: 6, max: 50 })
    .withMessage('Admin password must be between 6-50 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Validation failed', 
        errors: errors.array() 
      });
    }

    const { name, description, adminName, adminEmail, adminPassword } = req.body;

    // Check if company name already exists
    const existingCompany = await Company.findOne({ 
      name: { $regex: new RegExp(`^${name.trim()}$`, 'i') },
      isActive: true 
    });
    if (existingCompany) {
      return res.status(400).json({ message: 'Company name already exists' });
    }

    // Check if admin email already exists
    const existingUser = await User.findOne({ email: adminEmail.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({ message: 'Admin email already exists' });
    }

    // Create company admin first (company field will be optional during creation)
    const admin = await User.create({
      name: adminName.trim(),
      email: adminEmail.toLowerCase(),
      password: adminPassword,
      role: 'admin',
      isActive: true,
      company: null // Explicitly set to null during creation
    });

    // Create company
    const company = await Company.create({
      name: name.trim(),
      description: description?.trim() || '',
      admin: admin._id,
      employees: [admin._id],
      teams: [],
      projects: [],
      isActive: true
    });

    // Update admin with company reference
    admin.company = company._id;
    await admin.save();

    // Populate the response
    const populatedCompany = await Company.findById(company._id)
      .populate('admin', 'name email isActive');

    res.status(201).json({
      message: 'Company created successfully',
      company: populatedCompany
    });
  } catch (error) {
    console.error('Error creating company:', error);
    
    if (error.name === 'ValidationError') {
      return res.status(400).json({ 
        message: 'Validation error', 
        errors: Object.values(error.errors).map(e => e.message) 
      });
    }
    
    res.status(500).json({ message: 'Server error while creating company' });
  }
});

// @route   PUT /api/companies/:id
// @desc    Update company details
// @access  Private (masteradmin only)
router.put('/:id', [
  auth,
  authorize('masteradmin'),
  body('name').optional().trim().isLength({ min: 1, max: 100 }).withMessage('Company name must be less than 100 characters'),
  body('description').optional().trim().isLength({ max: 500 }).withMessage('Description must be less than 500 characters')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Validation failed', 
        errors: errors.array() 
      });
    }

    const { name, description } = req.body;
    const updateData = {};

    if (name) {
      // Check if new name already exists (excluding current company)
      const existingCompany = await Company.findOne({ 
        name: { $regex: new RegExp(`^${name.trim()}$`, 'i') },
        _id: { $ne: req.params.id },
        isActive: true 
      });
      if (existingCompany) {
        return res.status(400).json({ message: 'Company name already exists' });
      }
      updateData.name = name.trim();
    }

    if (description !== undefined) {
      updateData.description = description.trim();
    }

    const company = await Company.findOneAndUpdate(
      { _id: req.params.id, isActive: true },
      updateData,
      { new: true, runValidators: true }
    ).populate('admin', 'name email isActive');

    if (!company) {
      return res.status(404).json({ message: 'Company not found' });
    }

    res.json({
      message: 'Company updated successfully',
      company
    });
  } catch (error) {
    console.error('Error updating company:', error);
    res.status(500).json({ message: 'Server error while updating company' });
  }
});

// @route   DELETE /api/companies/:id
// @desc    Soft delete company (deactivate)
// @access  Private (masteradmin only)
router.delete('/:id', auth, authorize('masteradmin'), async (req, res) => {
  try {
    const company = await Company.findById(req.params.id);
    
    if (!company) {
      return res.status(404).json({ message: 'Company not found' });
    }

    if (!company.isActive) {
      return res.status(400).json({ message: 'Company is already deactivated' });
    }

    // Soft delete company
    company.isActive = false;
    await company.save();

    // Deactivate all company users
    await User.updateMany(
      { company: company._id },
      { isActive: false }
    );

    res.json({ message: 'Company deactivated successfully' });
  } catch (error) {
    console.error('Error deactivating company:', error);
    res.status(500).json({ message: 'Server error while deactivating company' });
  }
});

// @route   PUT /api/companies/:id/activate
// @desc    Reactivate company
// @access  Private (masteradmin only)
router.put('/:id/activate', auth, authorize('masteradmin'), async (req, res) => {
  try {
    const company = await Company.findById(req.params.id);
    
    if (!company) {
      return res.status(404).json({ message: 'Company not found' });
    }

    if (company.isActive) {
      return res.status(400).json({ message: 'Company is already active' });
    }

    // Reactivate company
    company.isActive = true;
    await company.save();

    // Reactivate company admin
    await User.findByIdAndUpdate(company.admin, { isActive: true });

    res.json({ message: 'Company reactivated successfully' });
  } catch (error) {
    console.error('Error reactivating company:', error);
    res.status(500).json({ message: 'Server error while reactivating company' });
  }
});

export default router;