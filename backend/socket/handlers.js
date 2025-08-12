import ChatMessage from '../models/ChatMessage.js';
import Project from '../models/Project.js';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';

export const setupSocketHandlers = (io) => {
  // Socket authentication middleware
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id).populate('company teams');
      
      if (!user || !user.isActive) {
        return next(new Error('Authentication error'));
      }
      
      socket.user = user;
      next();
    } catch (err) {
      next(new Error('Authentication error'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`User ${socket.user.name} connected`);

    // Join project rooms
    socket.on('join-project', async (projectId) => {
      try {
        // Verify user has access to project
        let query = {
          _id: projectId,
          company: socket.user.company._id
        };

        // Filter based on user role
        if (['employee', 'team_leader', 'bug_fixer'].includes(socket.user.role)) {
          query.$or = [
            { members: socket.user._id },
            { team: { $in: socket.user.teams.map(t => t._id) } }
          ];
        }

        const project = await Project.findOne(query);

        if (!project) {
          socket.emit('error', { message: 'Project not found' });
          return;
        }

        socket.join(`project-${projectId}`);
        if (project.chatRoom) {
          socket.join(project.chatRoom);
        }
        console.log(`User ${socket.user.name} joined project ${projectId}`);
      } catch (error) {
        socket.emit('error', { message: 'Error joining project' });
      }
    });

    // Handle new chat message
    socket.on('send-message', async (data) => {
      try {
        const { projectId, chatRoom, taskId, content, messageType, file, code } = data;

        // Verify project access
        let query = {
          _id: projectId,
          company: socket.user.company._id
        };

        // Filter based on user role
        if (['employee', 'team_leader', 'bug_fixer'].includes(socket.user.role)) {
          query.$or = [
            { members: socket.user._id },
            { team: { $in: socket.user.teams.map(t => t._id) } }
          ];
        }

        const project = await Project.findOne(query);

        if (!project) {
          socket.emit('error', { message: 'Project not found' });
          return;
        }

        // Create message
        const messageData = {
          project: projectId,
          sender: socket.user._id,
          messageType: messageType || 'text'
        };

        if (taskId) messageData.task = taskId;
        if (content) messageData.content = content;
        if (file) messageData.file = file;
        if (code) messageData.code = code;

        const message = await ChatMessage.create(messageData);
        const populatedMessage = await ChatMessage.findById(message._id)
          .populate('sender', 'name email avatar role');

        // Emit to all users in the project room
        io.to(`project-${projectId}`).emit('new-message', populatedMessage);
        if (chatRoom) {
          io.to(chatRoom).emit('new-message', populatedMessage);
        }

      } catch (error) {
        socket.emit('error', { message: 'Error sending message' });
      }
    });

    // Handle typing indicator
    socket.on('typing', (data) => {
      socket.to(`project-${data.projectId}`).emit('user-typing', {
        userId: socket.user._id,
        userName: socket.user.name,
        taskId: data.taskId
      });
    });

    socket.on('stop-typing', (data) => {
      socket.to(`project-${data.projectId}`).emit('user-stop-typing', {
        userId: socket.user._id,
        taskId: data.taskId
      });
    });

    socket.on('disconnect', () => {
      console.log(`User ${socket.user.name} disconnected`);
    });
  });
};