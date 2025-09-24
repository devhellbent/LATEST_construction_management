const jwt = require('jsonwebtoken');
const { User } = require('../models');

const setupSocketHandlers = (io) => {
  // Authentication middleware for socket connections
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.split(' ')[1];
      
      if (!token) {
        return next(new Error('Authentication error: No token provided'));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findByPk(decoded.userId, {
        attributes: { exclude: ['password_hash'] }
      });

      if (!user || !user.is_active) {
        return next(new Error('Authentication error: Invalid or inactive user'));
      }

      socket.userId = user.user_id;
      socket.userRole = user.role;
      socket.user = user;
      next();
    } catch (error) {
      next(new Error('Authentication error: Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`User ${socket.user.name} (${socket.userId}) connected`);

    // Join user to their personal room
    socket.join(`user_${socket.userId}`);

    // Join user to role-based rooms
    socket.join(`role_${socket.userRole}`);

    // Join project rooms based on user's tasks
    socket.on('join_project', async (projectId) => {
      try {
        // Verify user has access to this project
        const { Task } = require('../models');
        const userTasks = await Task.findAll({
          where: { 
            assigned_user_id: socket.userId,
            project_id: projectId 
          }
        });

        if (userTasks.length > 0 || socket.userRole === 'OWNER' || socket.userRole === 'PROJECT_MANAGER') {
          socket.join(`project_${projectId}`);
          socket.emit('joined_project', { projectId });
        } else {
          socket.emit('error', { message: 'Access denied to project' });
        }
      } catch (error) {
        socket.emit('error', { message: 'Failed to join project' });
      }
    });

    // Leave project room
    socket.on('leave_project', (projectId) => {
      socket.leave(`project_${projectId}`);
      socket.emit('left_project', { projectId });
    });

    // Handle task updates
    socket.on('task_update', (data) => {
      const { projectId, taskId, updates } = data;
      
      // Broadcast to project room
      socket.to(`project_${projectId}`).emit('task_updated', {
        taskId,
        updates,
        updatedBy: socket.userId,
        timestamp: new Date()
      });

      // Notify assigned user if different from updater
      if (updates.assigned_user_id && updates.assigned_user_id !== socket.userId) {
        socket.to(`user_${updates.assigned_user_id}`).emit('task_assigned', {
          taskId,
          projectId,
          assignedBy: socket.userId,
          timestamp: new Date()
        });
      }
    });

    // Handle issue updates
    socket.on('issue_update', (data) => {
      const { projectId, issueId, updates } = data;
      
      // Broadcast to project room
      socket.to(`project_${projectId}`).emit('issue_updated', {
        issueId,
        updates,
        updatedBy: socket.userId,
        timestamp: new Date()
      });

      // Notify assigned user if different from updater
      if (updates.assigned_to_user_id && updates.assigned_to_user_id !== socket.userId) {
        socket.to(`user_${updates.assigned_to_user_id}`).emit('issue_assigned', {
          issueId,
          projectId,
          assignedBy: socket.userId,
          timestamp: new Date()
        });
      }
    });

    // Handle material allocation updates
    socket.on('material_allocation', (data) => {
      const { projectId, materialId, quantity } = data;
      
      // Broadcast to project room
      socket.to(`project_${projectId}`).emit('material_allocated', {
        materialId,
        quantity,
        allocatedBy: socket.userId,
        timestamp: new Date()
      });
    });

    // Handle labour attendance updates
    socket.on('attendance_update', (data) => {
      const { projectId, labourId, hours } = data;
      
      // Broadcast to project room
      socket.to(`project_${projectId}`).emit('attendance_updated', {
        labourId,
        hours,
        updatedBy: socket.userId,
        timestamp: new Date()
      });
    });

    // Handle document uploads
    socket.on('document_uploaded', (data) => {
      const { projectId, documentId, fileName } = data;
      
      // Broadcast to project room
      socket.to(`project_${projectId}`).emit('document_uploaded', {
        documentId,
        fileName,
        uploadedBy: socket.userId,
        timestamp: new Date()
      });
    });

    // Handle notifications
    socket.on('send_notification', (data) => {
      const { userId, message, type } = data;
      
      // Send to specific user
      socket.to(`user_${userId}`).emit('notification', {
        message,
        type,
        from: socket.userId,
        timestamp: new Date()
      });
    });

    // Handle project status updates
    socket.on('project_status_update', (data) => {
      const { projectId, status } = data;
      
      // Broadcast to project room
      socket.to(`project_${projectId}`).emit('project_status_changed', {
        projectId,
        status,
        updatedBy: socket.userId,
        timestamp: new Date()
      });
    });

    // Handle disconnect
    socket.on('disconnect', () => {
      console.log(`User ${socket.user.name} (${socket.userId}) disconnected`);
    });
  });

  // Helper function to emit notifications
  const emitNotification = (userId, message, type = 'info') => {
    io.to(`user_${userId}`).emit('notification', {
      message,
      type,
      timestamp: new Date()
    });
  };

  // Helper function to emit project updates
  const emitProjectUpdate = (projectId, event, data) => {
    io.to(`project_${projectId}`).emit(event, {
      ...data,
      timestamp: new Date()
    });
  };

  return { emitNotification, emitProjectUpdate };
};

module.exports = { setupSocketHandlers };
