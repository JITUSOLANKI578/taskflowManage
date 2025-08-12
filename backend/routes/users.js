import express from 'express';
import { body, validationResult } from 'express-validator';
import User from '../models/User.js';
import Company from '../models/Company.js';
import { auth, authorize, checkCompanyAccess } from '../middleware/auth.js';

const router = express.Router();

// @route   POST /api/users
// @desc    Create admin user (masteradmin only)
// @access  Private
router.post('/', [
  auth,
  authorize('masteradmin'),
  body('name').trim().isLength({ min: 1, max: 50 }).withMessage('Name is required and must be less than 50 characters'),
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('password').isLength({ min: 6, max: 50 }).withMessage('Password must be between 6-50 characters'),
  body('role').isIn(['admin']).withMessage('Invalid role')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Validation failed',
        errors: errors.array() 
      });
    }

    const { name, email, password, role } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({ message: 'User with this email already exists' });
    }

    // Create admin user (no company assignment for masteradmin created admins)
    const user = await User.create({
      name: name.trim(),
      email: email.toLowerCase(),
      password,
      role: 'admin',
      isActive: true
    });

    const newUser = await User.findById(user._id)
      .select('-password')
      .populate('company', 'name');

    res.status(201).json({
      message: 'Admin user created successfully',
      user: newUser
    });
  } catch (error) {
    console.error('Error creating admin user:', error);
    res.status(500).json({ message: 'Server error while creating user' });
  }
});

// @route   POST /api/users/members
// @desc    Create member (admin only)
// @access  Private
router.post('/members', [
  auth,
  authorize('admin'),
  body('name').trim().isLength({ min: 1, max: 50 }).withMessage('Name is required and must be less than 50 characters'),
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('password').isLength({ min: 6, max: 50 }).withMessage('Password must be between 6-50 characters'),
  body('role').isIn(['employee', 'team_leader', 'bug_fixer']).withMessage('Invalid role'),
  body('phone').optional().trim().isLength({ max: 20 }).withMessage('Phone must be less than 20 characters'),
  body('department').optional().trim().isLength({ max: 50 }).withMessage('Department must be less than 50 characters'),
  body('position').optional().trim().isLength({ max: 50 }).withMessage('Position must be less than 50 characters'),
  body('location').optional().trim().isLength({ max: 100 }).withMessage('Location must be less than 100 characters')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Validation failed',
        errors: errors.array() 
      });
    }

    const { name, email, password, role, phone, department, position, location } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({ message: 'User with this email already exists' });
    }

    // Create member user
    const user = await User.create({
      name: name.trim(),
      email: email.toLowerCase(),
      password,
      role,
      company: req.user.company._id,
      phone: phone?.trim() || null,
      department: department?.trim() || null,
      position: position?.trim() || null,
      location: location?.trim() || null,
      isActive: true
    });

    // Add user to company employees
    await Company.findByIdAndUpdate(req.user.company._id, {
      $addToSet: { employees: user._id }
    });

    const newUser = await User.findById(user._id)
      .select('-password')
      .populate('company', 'name')
      .populate('teams', 'name');

    res.status(201).json({
      message: 'Member created successfully',
      user: newUser
    });
  } catch (error) {
    console.error('Error creating member:', error);
    res.status(500).json({ message: 'Server error while creating member' });
  }
});

// @route   GET /api/users
// @desc    Get users based on role
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    let users = [];

    if (req.user.role === 'masteradmin') {
      // Master admin can see all admin users (no company filter)
      users = await User.find({ 
        role: 'admin',
        isActive: true 
      })
      .select('-password')
      .populate('company', 'name')
      .populate('teams', 'name')
      .sort({ name: 1 });
    } else if (req.user.role === 'admin') {
      // Admin can see own company members (excluding other admins)
      users = await User.find({ 
        company: req.user.company._id,
        role: { $in: ['employee', 'team_leader', 'bug_fixer'] },
        isActive: true 
      })
      .select('-password')
      .populate('teams', 'name')
      .sort({ name: 1 });
    } else {
      // Members can only see themselves
      users = await User.find({ 
        _id: req.user.id,
        isActive: true 
      })
      .select('-password')
      .populate('company', 'name')
      .populate('teams', 'name');
    }

    res.json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ message: 'Server error while fetching users' });
  }
});

// @route   PUT /api/users/:id
// @desc    Update admin user (masteradmin only)
// @access  Private
router.put('/:id', [
  auth,
  authorize('masteradmin'),
  body('name').optional().trim().isLength({ min: 1, max: 50 }).withMessage('Name must be less than 50 characters'),
  body('email').optional().isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('password').optional().isLength({ min: 6, max: 50 }).withMessage('Password must be between 6-50 characters')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Validation failed',
        errors: errors.array() 
      });
    }

    const { name, email, password } = req.body;
    const updateData = {};

    if (name) updateData.name = name.trim();
    if (email) {
      // Check if email already exists (excluding current user)
      const existingUser = await User.findOne({ 
        email: email.toLowerCase(),
        _id: { $ne: req.params.id }
      });
      if (existingUser) {
        return res.status(400).json({ message: 'Email already exists' });
      }
      updateData.email = email.toLowerCase();
    }

    // Handle password update
    if (password) {
      const bcrypt = await import('bcryptjs');
      updateData.password = await bcrypt.hash(password, 12);
    }

    const user = await User.findOneAndUpdate(
      { _id: req.params.id, role: 'admin' },
      updateData,
      { new: true, runValidators: true }
    ).select('-password').populate('company', 'name');

    if (!user) {
      return res.status(404).json({ message: 'Admin user not found' });
    }

    res.json({
      message: 'Admin user updated successfully',
      user
    });
  } catch (error) {
    console.error('Error updating admin user:', error);
    res.status(500).json({ message: 'Server error while updating user' });
  }
});

// @route   PUT /api/users/members/:id
// @desc    Update member (admin only)
// @access  Private
router.put('/members/:id', [
  auth,
  authorize('admin'),
  body('name').optional().trim().isLength({ min: 1, max: 50 }).withMessage('Name must be less than 50 characters'),
  body('email').optional().isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('password').optional().isLength({ min: 6, max: 50 }).withMessage('Password must be between 6-50 characters'),
  body('role').optional().isIn(['employee', 'team_leader', 'bug_fixer']).withMessage('Invalid role'),
  body('phone').optional().trim().isLength({ max: 20 }).withMessage('Phone must be less than 20 characters'),
  body('department').optional().trim().isLength({ max: 50 }).withMessage('Department must be less than 50 characters'),
  body('position').optional().trim().isLength({ max: 50 }).withMessage('Position must be less than 50 characters'),
  body('location').optional().trim().isLength({ max: 100 }).withMessage('Location must be less than 100 characters')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Validation failed',
        errors: errors.array() 
      });
    }

    const { name, email, password, role, phone, department, position, location } = req.body;
    const updateData = {};

    if (name) updateData.name = name.trim();
    if (email) {
      // Check if email already exists (excluding current user)
      const existingUser = await User.findOne({ 
        email: email.toLowerCase(),
        _id: { $ne: req.params.id }
      });
      if (existingUser) {
        return res.status(400).json({ message: 'Email already exists' });
      }
      updateData.email = email.toLowerCase();
    }
    if (role) updateData.role = role;
    if (phone !== undefined) updateData.phone = phone?.trim() || null;
    if (department !== undefined) updateData.department = department?.trim() || null;
    if (position !== undefined) updateData.position = position?.trim() || null;
    if (location !== undefined) updateData.location = location?.trim() || null;

    // Handle password update
    if (password) {
      const bcrypt = await import('bcryptjs');
      updateData.password = await bcrypt.hash(password, 12);
    }

    const user = await User.findOneAndUpdate(
      { 
        _id: req.params.id, 
        company: req.user.company._id,
        role: { $in: ['employee', 'team_leader', 'bug_fixer'] }
      },
      updateData,
      { new: true, runValidators: true }
    ).select('-password').populate('teams', 'name');

    if (!user) {
      return res.status(404).json({ message: 'Member not found' });
    }

    res.json({
      message: 'Member updated successfully',
      user
    });
  } catch (error) {
    console.error('Error updating member:', error);
    res.status(500).json({ message: 'Server error while updating member' });
  }
});

// @route   PUT /api/users/:id/status
// @desc    Update admin user status (masteradmin only)
// @access  Private
router.put('/:id/status', [
  auth,
  authorize('masteradmin'),
  body('isActive').isBoolean().withMessage('Status must be boolean')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Validation failed',
        errors: errors.array() 
      });
    }

    const { isActive } = req.body;

    const user = await User.findOneAndUpdate(
      { _id: req.params.id, role: 'admin' },
      { isActive },
      { new: true, runValidators: true }
    ).select('-password').populate('company', 'name');

    if (!user) {
      return res.status(404).json({ message: 'Admin user not found' });
    }

    res.json({
      message: `Admin user ${isActive ? 'activated' : 'deactivated'} successfully`,
      user
    });
  } catch (error) {
    console.error('Error updating admin user status:', error);
    res.status(500).json({ message: 'Server error while updating user status' });
  }
});

// @route   PUT /api/users/members/:id/status
// @desc    Update member status (admin only)
// @access  Private
router.put('/members/:id/status', [
  auth,
  authorize('admin'),
  body('isActive').isBoolean().withMessage('Status must be boolean')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Validation failed',
        errors: errors.array() 
      });
    }

    const { isActive } = req.body;

    const user = await User.findOneAndUpdate(
      { 
        _id: req.params.id, 
        company: req.user.company._id,
        role: { $in: ['employee', 'team_leader', 'bug_fixer'] }
      },
      { isActive },
      { new: true, runValidators: true }
    ).select('-password').populate('teams', 'name');

    if (!user) {
      return res.status(404).json({ message: 'Member not found' });
    }

    res.json({
      message: `Member ${isActive ? 'activated' : 'deactivated'} successfully`,
      user
    });
  } catch (error) {
    console.error('Error updating member status:', error);
    res.status(500).json({ message: 'Server error while updating member status' });
  }
});

// @route   DELETE /api/users/:id
// @desc    Delete admin user (masteradmin only)
// @access  Private
router.delete('/:id', [auth, authorize('masteradmin')], async (req, res) => {
  try {
    const user = await User.findOneAndDelete({ 
      _id: req.params.id, 
      role: 'admin' 
    });

    if (!user) {
      return res.status(404).json({ message: 'Admin user not found' });
    }

    // Remove user from company if they have one
    if (user.company) {
      await Company.findByIdAndUpdate(user.company, {
        $pull: { employees: user._id }
      });
    }

    res.json({ message: 'Admin user deleted successfully' });
  } catch (error) {
    console.error('Error deleting admin user:', error);
    res.status(500).json({ message: 'Server error while deleting user' });
  }
});

// @route   DELETE /api/users/members/:id
// @desc    Delete member (admin only)
// @access  Private
router.delete('/members/:id', [auth, authorize('admin')], async (req, res) => {
  try {
    const user = await User.findOneAndDelete({
      _id: req.params.id,
      company: req.user.company._id,
      role: { $in: ['employee', 'team_leader', 'bug_fixer'] }
    });

    if (!user) {
      return res.status(404).json({ message: 'Member not found' });
    }

    // Remove user from company
    await Company.findByIdAndUpdate(req.user.company._id, {
      $pull: { employees: user._id }
    });

    res.json({ message: 'Member deleted successfully' });
  } catch (error) {
    console.error('Error deleting member:', error);
    res.status(500).json({ message: 'Server error while deleting member' });
  }
});

export default router;