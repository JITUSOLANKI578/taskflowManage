import express from 'express';
import { body, validationResult } from 'express-validator';
import Team from '../models/Team.js';
import User from '../models/User.js';
import Company from '../models/Company.js';
import { auth, authorize, checkCompanyAccess } from '../middleware/auth.js';

const router = express.Router();

// @route   POST /api/teams
// @desc    Create team
// @access  Private (admin only)
router.post('/', [
  auth,
  authorize('admin'),
  body('name').trim().isLength({ min: 1, max: 100 }).withMessage('Team name is required and must be less than 100 characters'),
  body('description').optional().trim().isLength({ max: 500 }).withMessage('Description must be less than 500 characters'),
  body('leaderId').isMongoId().withMessage('Valid leader ID is required'),
  body('members').isArray().withMessage('Members must be an array')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Validation failed',
        errors: errors.array() 
      });
    }

    const { name, description, leaderId, members } = req.body;

    // Check if team name already exists in company
    const existingTeam = await Team.findOne({
      name: { $regex: new RegExp(`^${name.trim()}$`, 'i') },
      company: req.user.company._id,
      isActive: true
    });
    if (existingTeam) {
      return res.status(400).json({ message: 'Team name already exists in your company' });
    }

    // Verify all members (including leader) belong to the company
    const allUserIds = [...new Set([leaderId, ...members])];
    const users = await User.find({
      _id: { $in: allUserIds },
      company: req.user.company._id,
      role: { $in: ['employee', 'team_leader', 'bug_fixer'] },
      isActive: true
    });

    if (users.length !== allUserIds.length) {
      return res.status(400).json({ message: 'Some users do not belong to your company or are not active' });
    }

    // Verify leader exists in the user list
    const leader = users.find(user => user._id.toString() === leaderId);
    if (!leader) {
      return res.status(400).json({ message: 'Team leader not found in your company' });
    }

    const team = await Team.create({
      name: name.trim(),
      description: description?.trim() || '',
      company: req.user.company._id,
      leader: leaderId,
      members: [...new Set(members)], // Remove duplicates
      isActive: true
    });

    // Update users with team reference
    await User.updateMany(
      { _id: { $in: allUserIds } },
      { $addToSet: { teams: team._id } }
    );

    // Update company with team reference
    await Company.findByIdAndUpdate(req.user.company._id, {
      $addToSet: { teams: team._id }
    });

    const newTeam = await Team.findById(team._id)
      .populate('leader', 'name email role')
      .populate('members', 'name email role')
      .populate('projects', 'name description status priority deadline');

    res.status(201).json({
      message: 'Team created successfully',
      team: newTeam
    });
  } catch (error) {
    console.error('Error creating team:', error);
    res.status(500).json({ message: 'Server error while creating team' });
  }
});

// @route   GET /api/teams
// @desc    Get all teams in company
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    if (!req.user.company) {
      return res.status(400).json({ message: 'User not associated with any company' });
    }

    const teams = await Team.find({ 
      company: req.user.company._id, 
      isActive: true 
    })
    .populate('leader', 'name email role')
    .populate('members', 'name email role')
    .populate('projects', 'name description status priority deadline')
    .sort({ name: 1 });

    res.json(teams);
  } catch (error) {
    console.error('Error fetching teams:', error);
    res.status(500).json({ message: 'Server error while fetching teams' });
  }
});

// @route   GET /api/teams/:id
// @desc    Get single team
// @access  Private
router.get('/:id', auth, async (req, res) => {
  try {
    if (!req.user.company) {
      return res.status(400).json({ message: 'User not associated with any company' });
    }

    const team = await Team.findOne({
      _id: req.params.id,
      company: req.user.company._id,
      isActive: true
    })
    .populate('leader', 'name email role')
    .populate('members', 'name email role')
    .populate('projects', 'name description status priority deadline createdAt')
    .populate('company', 'name');

    if (!team) {
      return res.status(404).json({ message: 'Team not found' });
    }

    res.json(team);
  } catch (error) {
    console.error('Error fetching team:', error);
    res.status(500).json({ message: 'Server error while fetching team' });
  }
});

// @route   PUT /api/teams/:id
// @desc    Update team
// @access  Private (admin only)
router.put('/:id', [
  auth,
  authorize('admin'),
  body('name').optional().trim().isLength({ min: 1, max: 100 }).withMessage('Team name must be less than 100 characters'),
  body('description').optional().trim().isLength({ max: 500 }).withMessage('Description must be less than 500 characters'),
  body('leaderId').optional().isMongoId().withMessage('Valid leader ID is required'),
  body('members').optional().isArray().withMessage('Members must be an array')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Validation failed',
        errors: errors.array() 
      });
    }

    const { name, description, leaderId, members } = req.body;

    // Find existing team
    const existingTeam = await Team.findOne({
      _id: req.params.id,
      company: req.user.company._id,
      isActive: true
    });

    if (!existingTeam) {
      return res.status(404).json({ message: 'Team not found' });
    }

    const updateData = {};

    // Check team name uniqueness if updating name
    if (name && name.trim() !== existingTeam.name) {
      const duplicateTeam = await Team.findOne({
        name: { $regex: new RegExp(`^${name.trim()}$`, 'i') },
        company: req.user.company._id,
        _id: { $ne: req.params.id },
        isActive: true
      });
      if (duplicateTeam) {
        return res.status(400).json({ message: 'Team name already exists in your company' });
      }
      updateData.name = name.trim();
    }

    if (description !== undefined) {
      updateData.description = description.trim();
    }

    // Verify all members (including leader) belong to the company if updating
    if (leaderId || members) {
      const allUserIds = [...new Set([
        leaderId || existingTeam.leader.toString(),
        ...(members || existingTeam.members.map(m => m.toString()))
      ])];

      const users = await User.find({
        _id: { $in: allUserIds },
        company: req.user.company._id,
        role: { $in: ['employee', 'team_leader', 'bug_fixer'] },
        isActive: true
      });

      if (users.length !== allUserIds.length) {
        return res.status(400).json({ message: 'Some users do not belong to your company or are not active' });
      }

      if (leaderId) {
        const leader = users.find(user => user._id.toString() === leaderId);
        if (!leader) {
          return res.status(400).json({ message: 'Team leader not found in your company' });
        }
        updateData.leader = leaderId;
      }

      if (members) {
        updateData.members = [...new Set(members)]; // Remove duplicates
      }

      // Remove team from old members and add to new members
      const oldMembers = existingTeam.members.map(m => m.toString());
      const oldLeader = existingTeam.leader.toString();
      const oldAllUsers = [...new Set([oldLeader, ...oldMembers])];

      // Remove team from users no longer in team
      const usersToRemove = oldAllUsers.filter(userId => !allUserIds.includes(userId));
      if (usersToRemove.length > 0) {
        await User.updateMany(
          { _id: { $in: usersToRemove } },
          { $pull: { teams: existingTeam._id } }
        );
      }

      // Add team to new users
      const usersToAdd = allUserIds.filter(userId => !oldAllUsers.includes(userId));
      if (usersToAdd.length > 0) {
        await User.updateMany(
          { _id: { $in: usersToAdd } },
          { $addToSet: { teams: existingTeam._id } }
        );
      }
    }

    const team = await Team.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    )
    .populate('leader', 'name email role')
    .populate('members', 'name email role')
    .populate('projects', 'name description status priority deadline');

    res.json({
      message: 'Team updated successfully',
      team
    });
  } catch (error) {
    console.error('Error updating team:', error);
    res.status(500).json({ message: 'Server error while updating team' });
  }
});

// @route   DELETE /api/teams/:id
// @desc    Delete team
// @access  Private (admin only)
router.delete('/:id', [auth, authorize('admin')], async (req, res) => {
  try {
    const team = await Team.findOne({
      _id: req.params.id,
      company: req.user.company._id,
      isActive: true
    });

    if (!team) {
      return res.status(404).json({ message: 'Team not found' });
    }

    // Check if team has active projects
    if (team.projects && team.projects.length > 0) {
      return res.status(400).json({ 
        message: 'Cannot delete team with active projects. Please reassign or complete projects first.' 
      });
    }

    // Soft delete team
    team.isActive = false;
    await team.save();

    // Remove team from users
    const allMembers = [...new Set([
      team.leader.toString(),
      ...team.members.map(m => m.toString())
    ])];

    await User.updateMany(
      { _id: { $in: allMembers } },
      { $pull: { teams: team._id } }
    );

    // Remove team from company
    await Company.findByIdAndUpdate(req.user.company._id, {
      $pull: { teams: team._id }
    });

    res.json({ message: 'Team deleted successfully' });
  } catch (error) {
    console.error('Error deleting team:', error);
    res.status(500).json({ message: 'Server error while deleting team' });
  }
});

export default router;