const express = require('express');
const { body, validationResult, query } = require('express-validator');
const { Op } = require('sequelize');
const { Task, Project, User } = require('../../models');
const { authenticateToken, authorizeRoles } = require('../../middleware/auth');

const router = express.Router();

// Get all tasks (with pagination and filtering)
router.get('/', authenticateToken, [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('project_id').optional().isInt().withMessage('Project ID must be an integer'),
  query('status').optional().isIn(['TODO', 'IN_PROGRESS', 'BLOCKED', 'DONE']).withMessage('Invalid status'),
  query('priority').optional().isIn(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).withMessage('Invalid priority'),
  query('assigned_user_id').optional().isInt().withMessage('Assigned user ID must be an integer'),
  query('search').optional().trim()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    const { project_id, status, priority, assigned_user_id, search } = req.query;

    // Build where clause
    const whereClause = {};
    if (project_id) whereClause.project_id = project_id;
    if (status) whereClause.status = status;
    if (priority) whereClause.priority = priority;
    if (assigned_user_id) whereClause.assigned_user_id = assigned_user_id;
    if (search) {
      whereClause[Op.or] = [
        { title: { [Op.like]: `%${search}%` } },
        { description: { [Op.like]: `%${search}%` } }
      ];
    }

    // Role-based filtering
    if (req.user.role === 'Collaborator Organisation' || req.user.role === 'Project On-site Team') {
      whereClause.assigned_user_id = req.user.user_id;
    }

    const { count, rows: tasks } = await Task.findAndCountAll({
      where: whereClause,
      include: [
        { model: Project, as: 'project', attributes: ['project_id', 'name', 'status'] },
        { model: User, as: 'assignedUser', attributes: ['user_id', 'name', 'email'] }
      ],
      limit,
      offset,
      order: [['created_at', 'DESC']]
    });

    res.json({
      tasks,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(count / limit),
        totalItems: count,
        itemsPerPage: limit
      }
    });
  } catch (error) {
    console.error('Get tasks error:', error);
    res.status(500).json({ message: 'Failed to fetch tasks' });
  }
});

// Get task by ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const task = await Task.findByPk(req.params.id, {
      include: [
        { model: Project, as: 'project', attributes: ['project_id', 'name', 'status'] },
        { model: User, as: 'assignedUser', attributes: ['user_id', 'name', 'email'] }
      ]
    });

    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    // Check permissions
    if (req.user.role === 'Collaborator Organisation' || req.user.role === 'Project On-site Team') {
      if (task.assigned_user_id !== req.user.user_id) {
        return res.status(403).json({ message: 'Access denied to this task' });
      }
    }

    res.json({ task });
  } catch (error) {
    console.error('Get task error:', error);
    res.status(500).json({ message: 'Failed to fetch task' });
  }
});

// Create task
router.post('/', authenticateToken, authorizeRoles('Admin', 'Project Manager', 'Project On-site Team'), [
  body('project_id').isInt().withMessage('Project ID is required'),
  body('title').trim().isLength({ min: 2 }).withMessage('Title must be at least 2 characters'),
  body('description').optional().trim(),
  body('assigned_user_id').optional().custom((value) => {
    if (value === null || value === undefined || value === '') return true;
    if (!Number.isInteger(Number(value))) throw new Error('Assigned user ID must be an integer');
    return true;
  }),
  body('start_date').optional().isISO8601().withMessage('Invalid start date'),
  body('end_date').optional().isISO8601().withMessage('Invalid end date'),
  body('priority').optional().isIn(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).withMessage('Invalid priority'),
  body('status').optional().isIn(['TODO', 'IN_PROGRESS', 'BLOCKED', 'DONE']).withMessage('Invalid status'),
  body('milestone').optional().isBoolean().withMessage('Milestone must be boolean'),
  body('dependencies').optional().custom((value) => {
    if (value === null || value === undefined) return true;
    if (!Array.isArray(value)) throw new Error('Dependencies must be an array');
    return true;
  })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    // Verify project exists and user has access
    const project = await Project.findByPk(req.body.project_id);
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    const canCreateTask = req.user.role.name === 'Admin' || 
                         req.user.role.name === 'Project Manager' || 
                         project.owner_user_id === req.user.user_id;

    if (!canCreateTask) {
      return res.status(403).json({ message: 'Insufficient permissions to create task in this project' });
    }

    const task = await Task.create(req.body);

    res.status(201).json({
      message: 'Task created successfully',
      task
    });
  } catch (error) {
    console.error('Create task error:', error);
    res.status(500).json({ message: 'Failed to create task' });
  }
});

// Update task
router.put('/:id', authenticateToken, [
  body('title').optional().trim().isLength({ min: 2 }).withMessage('Title must be at least 2 characters'),
  body('description').optional().trim(),
  body('assigned_user_id').optional().custom((value) => {
    if (value === null || value === undefined || value === '') return true;
    if (!Number.isInteger(Number(value))) throw new Error('Assigned user ID must be an integer');
    return true;
  }),
  body('start_date').optional().isISO8601().withMessage('Invalid start date'),
  body('end_date').optional().isISO8601().withMessage('Invalid end date'),
  body('status').optional().isIn(['TODO', 'IN_PROGRESS', 'BLOCKED', 'DONE']).withMessage('Invalid status'),
  body('priority').optional().isIn(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).withMessage('Invalid priority'),
  body('milestone').optional().isBoolean().withMessage('Milestone must be boolean'),
  body('dependencies').optional().custom((value) => {
    if (value === null || value === undefined) return true;
    if (!Array.isArray(value)) throw new Error('Dependencies must be an array');
    return true;
  })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const task = await Task.findByPk(req.params.id, {
      include: [{ model: Project, as: 'project' }]
    });

    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    // Check permissions
    const canUpdate = req.user.role.name === 'Admin' || 
                     req.user.role.name === 'Project Manager' || 
                     task.project.owner_user_id === req.user.user_id ||
                     task.assigned_user_id === req.user.user_id;

    if (!canUpdate) {
      return res.status(403).json({ message: 'Insufficient permissions' });
    }

    await task.update(req.body);

    res.json({
      message: 'Task updated successfully',
      task
    });
  } catch (error) {
    console.error('Update task error:', error);
    res.status(500).json({ message: 'Failed to update task' });
  }
});

// Delete task
router.delete('/:id', authenticateToken, authorizeRoles('Admin', 'Project Manager'), async (req, res) => {
  try {
    const task = await Task.findByPk(req.params.id, {
      include: [{ model: Project, as: 'project' }]
    });

    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    // Check permissions
    const canDelete = req.user.role.name === 'Admin' || 
                     req.user.role.name === 'Project Manager' ||
                     task.project.owner_user_id === req.user.user_id;

    if (!canDelete) {
      return res.status(403).json({ message: 'Insufficient permissions' });
    }

    await task.destroy();

    res.json({ message: 'Task deleted successfully' });
  } catch (error) {
    console.error('Delete task error:', error);
    res.status(500).json({ message: 'Failed to delete task' });
  }
});

// Update task status
router.patch('/:id/status', [
  body('status').isIn(['TODO', 'IN_PROGRESS', 'BLOCKED', 'DONE']).withMessage('Invalid status')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const task = await Task.findByPk(req.params.id);

    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    // Check permissions
    const canUpdateStatus = req.user.role === 'Admin' || 
                           req.user.role === 'Project Manager' || 
                           task.assigned_user_id === req.user.user_id;

    if (!canUpdateStatus) {
      return res.status(403).json({ message: 'Insufficient permissions' });
    }

    await task.update({ status: req.body.status });

    res.json({
      message: 'Task status updated successfully',
      task
    });
  } catch (error) {
    console.error('Update task status error:', error);
    res.status(500).json({ message: 'Failed to update task status' });
  }
});

// Get tasks by project
router.get('/project/:projectId', async (req, res) => {
  try {
    const tasks = await Task.findAll({
      where: { project_id: req.params.projectId },
      include: [
        { model: User, as: 'assignedUser', attributes: ['user_id', 'name', 'email'] }
      ],
      order: [['created_at', 'DESC']]
    });

    res.json({ tasks });
  } catch (error) {
    console.error('Get tasks by project error:', error);
    res.status(500).json({ message: 'Failed to fetch tasks' });
  }
});

module.exports = router;
