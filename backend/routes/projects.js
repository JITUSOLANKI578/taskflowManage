import express from 'express';
import { body, validationResult } from 'express-validator';
import Project from '../models/Project.js';
import Team from '../models/Team.js';
import User from '../models/User.js';
import Company from '../models/Company.js';
import { auth, authorize } from '../middleware/auth.js';

const router = express.Router();

// @route   POST /api/projects
// @desc    Create project with auto chat group
// @access  Private (admin only)
router.post('/', [
  auth,
  authorize('admin'),
  body('name').trim().isLength({ min: 1, max: 100 }).withMessage('Project name is required and must be less than 100 characters'),
  body('description').trim().isLength({ min: 1, max: 1000 }).withMessage('Description is required and must be less than 1000 characters'),
  body('teamId').isMongoId().withMessage('Valid team ID is required'),
  body('members').optional().isArray().withMessage('Members must be an array'),
  body('priority').optional().isIn(['low', 'medium', 'high', 'urgent']).withMessage('Invalid priority'),
  body('deadline').isISO8601().withMessage('Valid deadline is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Validation failed',
        errors: errors.array() 
      });
    }

    const { name, description, teamId, members, priority, deadline } = req.body;

    // Check if project name already exists in company
    const existingProject = await Project.findOne({
      name: { $regex: new RegExp(`^${name.trim()}$`, 'i') },
      company: req.user.company._id,
      isActive: true
    });
    if (existingProject) {
      return res.status(400).json({ message: 'Project name already exists in your company' });
    }

    // Verify team belongs to company
    const team = await Team.findOne({
      _id: teamId,
      company: req.user.company._id,
      isActive: true
    }).populate('members', '_id name email role');

    if (!team) {
      return res.status(404).json({ message: 'Team not found in your company' });
    }

    // If specific members are provided, verify they belong to the team
    let projectMembers = [];
    if (members && members.length > 0) {
      const teamMemberIds = team.members.map(m => m._id.toString());
      const invalidMembers = members.filter(memberId => !teamMemberIds.includes(memberId));
      
      if (invalidMembers.length > 0) {
        return res.status(400).json({ message: 'Some selected members do not belong to this team' });
      }
      projectMembers = members;
    } else {
      // If no specific members, include all team members
      projectMembers = team.members.map(m => m._id.toString());
    }

    // Generate unique chat room ID
    const chatRoomId = `project_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const project = await Project.create({
      name: name.trim(),
      description: description.trim(),
      company: req.user.company._id,
      team: teamId,
      createdBy: req.user.id,
      members: projectMembers,
      priority: priority || 'medium',
      deadline: new Date(deadline),
      chatRoom: chatRoomId,
      status: 'not_started',
      isActive: true
    });

    // Update team with project reference
    await Team.findByIdAndUpdate(teamId, {
      $addToSet: { projects: project._id }
    });

    // Update company with project reference
    await Company.findByIdAndUpdate(req.user.company._id, {
      $addToSet: { projects: project._id }
    });

    const newProject = await Project.findById(project._id)
      .populate('team', 'name leader')
      .populate('createdBy', 'name email')
      .populate('members', 'name email role');

    res.status(201).json({
      message: 'Project created successfully with auto-generated chat group',
      project: newProject
    });
  } catch (error) {
    console.error('Error creating project:', error);
    res.status(500).json({ message: 'Server error while creating project' });
  }
});

// @route   GET /api/projects
// @desc    Get projects based on user role
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    if (!req.user.company) {
      return res.status(400).json({ message: 'User not associated with any company' });
    }

    let query = { company: req.user.company._id, isActive: true };

    // Filter based on user role
    if (['employee', 'team_leader', 'bug_fixer'].includes(req.user.role)) {
      query.$or = [
        { members: req.user.id },
        { team: { $in: req.user.teams.map(t => t._id) } }
      ];
    }

    const projects = await Project.find(query)
      .populate('team', 'name leader')
      .populate('createdBy', 'name email')
      .populate('members', 'name email role')
      .populate('tasks', 'title status priority deadline assignedTo')
      .sort({ createdAt: -1 });

    res.json(projects);
  } catch (error) {
    console.error('Error fetching projects:', error);
    res.status(500).json({ message: 'Server error while fetching projects' });
  }
});

// @route   GET /api/projects/:id
// @desc    Get single project
// @access  Private
router.get('/:id', auth, async (req, res) => {
  try {
    if (!req.user.company) {
      return res.status(400).json({ message: 'User not associated with any company' });
    }

    let query = { 
      _id: req.params.id, 
      company: req.user.company._id, 
      isActive: true 
    };

    // Filter based on user role
    if (['employee', 'team_leader', 'bug_fixer'].includes(req.user.role)) {
      query.$or = [
        { members: req.user.id },
        { team: { $in: req.user.teams.map(t => t._id) } }
      ];
    }

    const project = await Project.findOne(query)
      .populate('team', 'name leader members')
      .populate('createdBy', 'name email')
      .populate('members', 'name email role')
      .populate({
        path: 'tasks',
        select: 'title description status priority deadline assignedTo createdAt',
        populate: {
          path: 'assignedTo',
          select: 'name email role'
        }
      })
      .populate('comments.user', 'name email avatar');

    if (!project) {
      return res.status(404).json({ message: 'Project not found or access denied' });
    }

    res.json(project);
  } catch (error) {
    console.error('Error fetching project:', error);
    res.status(500).json({ message: 'Server error while fetching project' });
  }
});

// @route   PUT /api/projects/:id
// @desc    Update project
// @access  Private (admin only)
router.put('/:id', [
  auth,
  authorize('admin'),
  body('name').optional().trim().isLength({ min: 1, max: 100 }).withMessage('Project name must be less than 100 characters'),
  body('description').optional().trim().isLength({ min: 1, max: 1000 }).withMessage('Description must be less than 1000 characters'),
  body('priority').optional().isIn(['low', 'medium', 'high', 'urgent']).withMessage('Invalid priority'),
  body('status').optional().isIn(['not_started', 'in_progress', 'completed', 'on_hold']).withMessage('Invalid status'),
  body('deadline').optional().isISO8601().withMessage('Valid deadline is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Validation failed',
        errors: errors.array() 
      });
    }

    const { name, description, priority, status, deadline } = req.body;
    const updateData = {};

    if (name) {
      // Check if new name already exists (excluding current project)
      const existingProject = await Project.findOne({
        name: { $regex: new RegExp(`^${name.trim()}$`, 'i') },
        company: req.user.company._id,
        _id: { $ne: req.params.id },
        isActive: true
      });
      if (existingProject) {
        return res.status(400).json({ message: 'Project name already exists in your company' });
      }
      updateData.name = name.trim();
    }

    if (description) updateData.description = description.trim();
    if (priority) updateData.priority = priority;
    if (status) updateData.status = status;
    if (deadline) updateData.deadline = new Date(deadline);

    const project = await Project.findOneAndUpdate(
      { 
        _id: req.params.id, 
        company: req.user.company._id,
        isActive: true 
      },
      updateData,
      { new: true, runValidators: true }
    )
    .populate('team', 'name leader')
    .populate('createdBy', 'name email')
    .populate('members', 'name email role')
    .populate('tasks', 'title status priority deadline assignedTo');

    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    res.json({
      message: 'Project updated successfully',
      project
    });
  } catch (error) {
    console.error('Error updating project:', error);
    res.status(500).json({ message: 'Server error while updating project' });
  }
});

// @route   POST /api/projects/:id/comments
// @desc    Add comment to project
// @access  Private
router.post('/:id/comments', [
  auth,
  body('content').trim().isLength({ min: 1, max: 1000 }).withMessage('Comment content is required and must be less than 1000 characters')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Validation failed',
        errors: errors.array() 
      });
    }

    let query = {
      _id: req.params.id,
      company: req.user.company._id,
      isActive: true
    };

    // Filter based on user role
    if (['employee', 'team_leader', 'bug_fixer'].includes(req.user.role)) {
      query.$or = [
        { members: req.user.id },
        { team: { $in: req.user.teams.map(t => t._id) } }
      ];
    }

    const project = await Project.findOne(query);

    if (!project) {
      return res.status(404).json({ message: 'Project not found or access denied' });
    }

    project.comments.push({
      user: req.user.id,
      content: req.body.content.trim(),
      createdAt: new Date()
    });

    await project.save();

    const updatedProject = await Project.findById(project._id)
      .populate('comments.user', 'name email avatar');

    res.json({
      message: 'Comment added successfully',
      comments: updatedProject.comments
    });
  } catch (error) {
    console.error('Error adding comment:', error);
    res.status(500).json({ message: 'Server error while adding comment' });
  }
});

// @route   DELETE /api/projects/:id
// @desc    Delete project (admin only)
// @access  Private
router.delete('/:id', [auth, authorize('admin')], async (req, res) => {
  try {
    const project = await Project.findOne({
      _id: req.params.id,
      company: req.user.company._id,
      isActive: true
    });

    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    // Check if project has active tasks
    if (project.tasks && project.tasks.length > 0) {
      return res.status(400).json({ 
        message: 'Cannot delete project with active tasks. Please complete or reassign tasks first.' 
      });
    }

    // Soft delete project
    project.isActive = false;
    await projaect.save();

    // Remove project from team
    await Team.findByIdAndUpdate(project.team, {
      $pull: { projects: project._id }
    });

    // Remove project from company
    await Company.findByIdAndUpdate(req.user.company._id, {
      $pull: { projects: project._id }
    });

    res.json({ message: 'Project deleted successfully' });
  } catch (error) {
    console.error('Error deleting project:', error);
    res.status(500).json({ message: 'Server error while deleting project' });
  }
});

export default router;