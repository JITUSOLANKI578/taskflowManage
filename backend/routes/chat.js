import express from 'express';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import ChatMessage from '../models/ChatMessage.js';
import Project from '../models/Project.js';
import { auth, checkCompanyAccess } from '../middleware/auth.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../../uploads'));
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: { fileSize: parseInt(process.env.MAX_FILE_SIZE) || 10485760 }, // 10MB
  fileFilter: (req, file, cb) => {
    // Allow all file types for now, add restrictions as needed
    cb(null, true);
  }
});

// @route   GET /api/chat/:projectId
// @desc    Get chat messages for project
// @access  Private
router.get('/:projectId', auth, async (req, res) => {
  try {
    const { projectId } = req.params;
    const { taskId } = req.query;

    // Verify project access
    const project = await Project.findOne({
      _id: projectId,
      company: req.user.company._id
    });

    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    let query = { project: projectId };
    if (taskId) {
      query.task = taskId;
    }

    const messages = await ChatMessage.find(query)
      .populate('sender', 'name email avatar role')
      .sort({ createdAt: 1 });

    res.json(messages);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/chat/upload
// @desc    Upload file for chat
// @access  Private
router.post('/upload', auth, upload.single('file'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    res.json({
      filename: req.file.filename,
      originalName: req.file.originalname,
      path: req.file.path,
      size: req.file.size,
      mimeType: req.file.mimetype
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;