import express from 'express';
import { body, validationResult } from 'express-validator';
import Task from '../models/Task.js';
import Project from '../models/Project.js';
import User from '../models/User.js';
import { auth, authorize } from '../middleware/auth.js';

const router = express.Router();

// @route   POST /api/tasks
// @desc    Create task (admin only)
// @access  Private
router.post('/', [
  auth,
  authorize('admin'),
  body('title').trim().isLength({ min: 1, max: 200 }).withMessage('Title is required and must be less than 200 characters'),
  body('description').trim().isLength({ min: 1, max: 1000 }).withMessage('Description is required and must be less than 1000 characters'),
  body('projectId').isMongoId().withMessage('Valid project ID is required'),
  body('assignedTo').isMongoId().withMessage('Valid assignee ID is required'),
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

    const { title, description, projectId, assignedTo, priority, deadline } = req.body;

    // Verify project belongs to company and user has access
    const project = await Project.findOne({
      _id: projectId,
      company: req.user.company._id,
      isActive: true
    }).populate('members', '_id');

    if (!project) {
      return res.status(404).json({ message: 'Project not found or access denied' });
    }

    // Verify assigned user is a member of the project
    const isProjectMember = project.members.some(
      member => member._id.toString() === assignedTo
    );

    if (!isProjectMember) {
      return res.status(400).json({ message: 'User is not a member of this project' });
    }

    // Verify assigned user belongs to the same company
    const assignedUser = await User.findOne({
      _id: assignedTo,
      company: req.user.company._id,
      isActive: true
    });

    if (!assignedUser) {
      return res.status(400).json({ message: 'Assigned user not found in your company' });
    }

    const task = await Task.create({
      title: title.trim(),
      description: description.trim(),
      project: projectId,
      company: req.user.company._id,
      assignedTo,
      createdBy: req.user.id,
      priority: priority || 'medium',
      deadline: new Date(deadline),
      status: 'todo',
      isActive: true
    });

    // Update project with task reference
    await Project.findByIdAndUpdate(projectId, {
      $push: { tasks: task._id }
    });

    const newTask = await Task.findById(task._id)
      .populate('project', 'name')
      .populate('assignedTo', 'name email role')
      .populate('createdBy', 'name email');

    res.status(201).json({
      message: 'Task created successfully',
      task: newTask
    });
  } catch (error) {
    console.error('Error creating task:', error);
    res.status(500).json({ message: 'Server error while creating task' });
  }
});

// @route   GET /api/tasks
// @desc    Get tasks based on role permissions
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    let tasks = [];

    if (req.user.role === 'masteradmin') {
      // Master admin can see all tasks
      tasks = await Task.find({ isActive: true })
        .populate('project', 'name')
        .populate('assignedTo', 'name email role')
        .populate('createdBy', 'name email')
        .populate('company', 'name')
        .sort({ deadline: 1 });
    } else if (req.user.role === 'admin') {
      // Admin can see all tasks in their company
      tasks = await Task.find({ 
        company: req.user.company._id, 
        isActive: true 
      })
      .populate('project', 'name')
      .populate('assignedTo', 'name email role')
      .populate('createdBy', 'name email')
      .sort({ deadline: 1 });
    } else {
      // Members can only see their own tasks
      tasks = await Task.find({ 
        assignedTo: req.user.id,
        isActive: true 
      })
      .populate('project', 'name')
      .populate('assignedTo', 'name email role')
      .populate('createdBy', 'name email')
      .sort({ deadline: 1 });
    }

    res.json(tasks);
  } catch (error) {
    console.error('Error fetching tasks:', error);
    res.status(500).json({ message: 'Server error while fetching tasks' });
  }
});

// @route   GET /api/tasks/project/:projectId
// @desc    Get tasks for a specific project
// @access  Private
router.get('/project/:projectId', auth, async (req, res) => {
  try {
    const { projectId } = req.params;

    // Verify project access
    let projectQuery = { 
      _id: projectId, 
      company: req.user.company._id,
      isActive: true 
    };
    
    if (['employee', 'team_leader', 'bug_fixer'].includes(req.user.role)) {
      projectQuery.$or = [
        { members: req.user.id },
        { team: { $in: req.user.teams.map(t => t._id) } }
      ];
    }

    const project = await Project.findOne(projectQuery);
    if (!project) {
      return res.status(404).json({ message: 'Project not found or access denied' });
    }

    let taskQuery = { 
      project: projectId, 
      isActive: true 
    };

    // Filter tasks based on user role
    if (['employee', 'team_leader', 'bug_fixer'].includes(req.user.role)) {
      taskQuery.assignedTo = req.user.id;
    }

    const tasks = await Task.find(taskQuery)
      .populate('assignedTo', 'name email role')
      .populate('createdBy', 'name email')
      .sort({ deadline: 1 });

    res.json(tasks);
  } catch (error) {
    console.error('Error fetching project tasks:', error);
    res.status(500).json({ message: 'Server error while fetching project tasks' });
  }
});

// @route   PUT /api/tasks/:id/status
// @desc    Update task status
// @access  Private
router.put('/:id/status', [
  auth,
  body('status').isIn(['todo', 'in_progress', 'testing', 'completed']).withMessage('Invalid status')
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

    // Only assigned user or admin can update task status
    if (['employee', 'team_leader', 'bug_fixer'].includes(req.user.role)) {
      query.assignedTo = req.user.id;
    }

    const task = await Task.findOneAndUpdate(
      query,
      { status: req.body.status },
      { new: true, runValidators: true }
    )
    .populate('assignedTo', 'name email role')
    .populate('createdBy', 'name email')
    .populate('project', 'name');

    if (!task) {
      return res.status(404).json({ message: 'Task not found or access denied' });
    }

    res.json({
      message: 'Task status updated successfully',
      task
    });
  } catch (error) {
    console.error('Error updating task status:', error);
    res.status(500).json({ message: 'Server error while updating task status' });
  }
});

// @route   POST /api/tasks/:id/delegate
// @desc    Create delegation request
// @access  Private
router.post('/:id/delegate', [
  auth,
  body('toUserId').isMongoId().withMessage('Valid user ID is required'),
  body('reason').trim().isLength({ min: 1, max: 500 }).withMessage('Reason is required and must be less than 500 characters')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Validation failed', 
        errors: errors.array() 
      });
    }

    const { toUserId, reason } = req.body;
    const taskId = req.params.id;

    // Verify task exists and user is assigned to it
    const task = await Task.findOne({
      _id: taskId,
      assignedTo: req.user.id,
      company: req.user.company._id,
      isActive: true
    }).populate('project', 'members');

    if (!task) {
      return res.status(404).json({ message: 'Task not found or you are not assigned to it' });
    }

    // Verify target user is a member of the project
    const isProjectMember = task.project.members.some(
      member => member.toString() === toUserId
    );

    if (!isProjectMember) {
      return res.status(400).json({ message: 'Target user is not a member of this project' });
    }

    // Verify target user belongs to the same company
    const targetUser = await User.findOne({
      _id: toUserId,
      company: req.user.company._id,
      isActive: true
    });

    if (!targetUser) {
      return res.status(400).json({ message: 'Target user not found in your company' });
    }

    // Check if there's already a pending delegation request
    const existingRequest = task.delegationRequests.find(
      req => req.status === 'pending' && req.fromUser.toString() === req.user.id
    );

    if (existingRequest) {
      return res.status(400).json({ message: 'You already have a pending delegation request for this task' });
    }

    // Create delegation request
    const delegationRequest = {
      fromUser: req.user.id,
      toUser: toUserId,
      reason: reason.trim(),
      status: 'pending',
      createdAt: new Date()
    };

    // Add to task's delegation requests
    task.delegationRequests = task.delegationRequests || [];
    task.delegationRequests.push(delegationRequest);
    await task.save();

    res.json({ message: 'Delegation request sent successfully' });
  } catch (error) {
    console.error('Error creating delegation request:', error);
    res.status(500).json({ message: 'Server error while creating delegation request' });
  }
});

// @route   GET /api/tasks/delegation-requests
// @desc    Get delegation requests for current user
// @access  Private
router.get('/delegation-requests', auth, async (req, res) => {
  try {
    const tasks = await Task.find({
      'delegationRequests.toUser': req.user.id,
      company: req.user.company._id,
      isActive: true
    })
    .populate('delegationRequests.fromUser', 'name email')
    .populate('delegationRequests.toUser', 'name email')
    .populate('project', 'name')
    .select('title description priority delegationRequests');

    const requests = [];
    tasks.forEach(task => {
      task.delegationRequests.forEach(request => {
        if (request.toUser._id.toString() === req.user.id && request.status === 'pending') {
          requests.push({
            _id: request._id,
            task: {
              _id: task._id,
              title: task.title,
              description: task.description,
              priority: task.priority,
              project: task.project
            },
            fromUser: request.fromUser,
            toUser: request.toUser,
            reason: request.reason,
            status: request.status,
            createdAt: request.createdAt
          });
        }
      });
    });

    res.json(requests);
  } catch (error) {
    console.error('Error fetching delegation requests:', error);
    res.status(500).json({ message: 'Server error while fetching delegation requests' });
  }
});

// @route   PUT /api/tasks/delegation-requests/:requestId
// @desc    Accept or reject delegation request
// @access  Private
router.put('/delegation-requests/:requestId', [
  auth,
  body('action').isIn(['accept', 'reject']).withMessage('Action must be accept or reject')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Validation failed', 
        errors: errors.array() 
      });
    }

    const { action } = req.body;
    const requestId = req.params.requestId;

    // Find task with the delegation request
    const task = await Task.findOne({
      'delegationRequests._id': requestId,
      'delegationRequests.toUser': req.user.id,
      company: req.user.company._id,
      isActive: true
    });

    if (!task) {
      return res.status(404).json({ message: 'Delegation request not found' });
    }

    // Find the specific request
    const request = task.delegationRequests.id(requestId);
    if (!request) {
      return res.status(404).json({ message: 'Delegation request not found' });
    }

    if (request.status !== 'pending') {
      return res.status(400).json({ message: 'Request has already been processed' });
    }

    // Update request status
    request.status = action === 'accept' ? 'accepted' : 'rejected';

    // If accepted, reassign the task
    if (action === 'accept') {
      task.assignedTo = req.user.id;
    }

    await task.save();

    res.json({ 
      message: `Request ${action}ed successfully`,
      task: action === 'accept' ? await Task.findById(task._id)
        .populate('assignedTo', 'name email role')
        .populate('createdBy', 'name email')
        .populate('project', 'name') : null
    });
  } catch (error) {
    console.error('Error processing delegation request:', error);
    res.status(500).json({ message: 'Server error while processing delegation request' });
  }
});

// @route   POST /api/tasks/:id/comments
// @desc    Add comment to task
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
        { assignedTo: req.user.id },
        { createdBy: req.user.id }
      ];
    }

    const task = await Task.findOne(query);

    if (!task) {
      return res.status(404).json({ message: 'Task not found or access denied' });
    }

    task.comments.push({
      user: req.user.id,
      content: req.body.content.trim(),
      createdAt: new Date()
    });

    await task.save();

    const updatedTask = await Task.findById(task._id)
      .populate('comments.user', 'name email avatar');

    res.json({
      message: 'Comment added successfully',
      comments: updatedTask.comments
    });
  } catch (error) {
    console.error('Error adding comment:', error);
    res.status(500).json({ message: 'Server error while adding comment' });
  }
});

// @route   GET /api/tasks/:id
// @desc    Get single task
// @access  Private
router.get('/:id', auth, async (req, res) => {
  try {
    let query = { 
      _id: req.params.id, 
      company: req.user.company._id,
      isActive: true 
    };

    // Filter based on user role
    if (['employee', 'team_leader', 'bug_fixer'].includes(req.user.role)) {
      query.$or = [
        { assignedTo: req.user.id },
        { createdBy: req.user.id }
      ];
    }

    const task = await Task.findOne(query)
      .populate('project', 'name')
      .populate('assignedTo', 'name email role')
      .populate('createdBy', 'name email')
      .populate('comments.user', 'name email avatar');

    if (!task) {
      return res.status(404).json({ message: 'Task not found or access denied' });
    }

    res.json(task);
  } catch (error) {
    console.error('Error fetching task:', error);
    res.status(500).json({ message: 'Server error while fetching task' });
  }
});

// @route   PUT /api/tasks/:id
// @desc    Update task (admin or creator only)
// @access  Private
router.put('/:id', [
  auth,
  body('title').optional().trim().isLength({ min: 1, max: 200 }).withMessage('Title must be less than 200 characters'),
  body('description').optional().trim().isLength({ min: 1, max: 1000 }).withMessage('Description must be less than 1000 characters'),
  body('priority').optional().isIn(['low', 'medium', 'high', 'urgent']).withMessage('Invalid priority'),
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

    let query = { 
      _id: req.params.id, 
      company: req.user.company._id,
      isActive: true 
    };

    // Only admin or task creator can update task details
    if (req.user.role !== 'admin') {
      query.createdBy = req.user.id;
    }

    const updateData = {};
    if (req.body.title) updateData.title = req.body.title.trim();
    if (req.body.description) updateData.description = req.body.description.trim();
    if (req.body.priority) updateData.priority = req.body.priority;
    if (req.body.deadline) updateData.deadline = new Date(req.body.deadline);

    const task = await Task.findOneAndUpdate(
      query,
      updateData,
      { new: true, runValidators: true }
    )
    .populate('project', 'name')
    .populate('assignedTo', 'name email role')
    .populate('createdBy', 'name email')
    .populate('comments.user', 'name email avatar');

    if (!task) {
      return res.status(404).json({ message: 'Task not found or access denied' });
    }

    res.json({
      message: 'Task updated successfully',
      task
    });
  } catch (error) {
    console.error('Error updating task:', error);
    res.status(500).json({ message: 'Server error while updating task' });
  }
});

// @route   DELETE /api/tasks/:id
// @desc    Delete task (admin only)
// @access  Private
router.delete('/:id', [auth, authorize('admin')], async (req, res) => {
  try {
    const task = await Task.findOneAndUpdate(
      {
        _id: req.params.id,
        company: req.user.company._id,
        isActive: true
      },
      { isActive: false },
      { new: true }
    );

    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    // Remove task from project
    await Project.findByIdAndUpdate(task.project, {
      $pull: { tasks: task._id }
    });

    res.json({ message: 'Task deleted successfully' });
  } catch (error) {
    console.error('Error deleting task:', error);
    res.status(500).json({ message: 'Server error while deleting task' });
  }
});

export default router;