const express = require('express');
const { body, validationResult, query } = require('express-validator');
const { Op } = require('sequelize');
const { Issue, Project, User, Task } = require('../../models');
const { authenticateToken, authorizeRoles } = require('../../middleware/auth');

const router = express.Router();

// Get all issues (with pagination and filtering)
router.get('/', authenticateToken, [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('project_id').optional().isInt().withMessage('Project ID must be an integer'),
  query('status').optional().isIn(['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED']).withMessage('Invalid status'),
  query('priority').optional().isIn(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).withMessage('Invalid priority'),
  query('assigned_to_user_id').optional().isInt().withMessage('Assigned user ID must be an integer'),
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
    const { project_id, status, priority, assigned_to_user_id, search } = req.query;

    // Build where clause
    const whereClause = {};
    if (project_id) whereClause.project_id = project_id;
    if (status) whereClause.status = status;
    if (priority) whereClause.priority = priority;
    if (assigned_to_user_id) whereClause.assigned_to_user_id = assigned_to_user_id;
    if (search) {
      whereClause.description = { [Op.like]: `%${search}%` };
    }

    // Role-based filtering
    if (req.user.role && (req.user.role.name === 'Collaborator Organisation' || req.user.role.name === 'Project On-site Team')) {
      whereClause[Op.or] = [
        { raised_by_user_id: req.user.user_id },
        { assigned_to_user_id: req.user.user_id }
      ];
    }

    const { count, rows: issues } = await Issue.findAndCountAll({
      where: whereClause,
      include: [
        { model: Project, as: 'project', attributes: ['project_id', 'name'] },
        { model: Task, as: 'task', attributes: ['task_id', 'title', 'status'] },
        { model: User, as: 'raisedBy', attributes: ['user_id', 'name', 'email'] },
        { model: User, as: 'assignedTo', attributes: ['user_id', 'name', 'email'] }
      ],
      limit,
      offset,
      order: [['date_raised', 'DESC']]
    });

    res.json({
      issues,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(count / limit),
        totalItems: count,
        itemsPerPage: limit
      }
    });
  } catch (error) {
    console.error('Get issues error:', error);
    res.status(500).json({ message: 'Failed to fetch issues' });
  }
});

// Get issue by ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const issue = await Issue.findByPk(req.params.id, {
      include: [
        { model: Project, as: 'project', attributes: ['project_id', 'name'] },
        { model: Task, as: 'task', attributes: ['task_id', 'title', 'status'] },
        { model: User, as: 'raisedBy', attributes: ['user_id', 'name', 'email'] },
        { model: User, as: 'assignedTo', attributes: ['user_id', 'name', 'email'] }
      ]
    });

    if (!issue) {
      return res.status(404).json({ message: 'Issue not found' });
    }

    // Check permissions
    if (req.user.role && (req.user.role.name === 'Collaborator Organisation' || req.user.role.name === 'Project On-site Team')) {
      if (issue.raised_by_user_id !== req.user.user_id && issue.assigned_to_user_id !== req.user.user_id) {
        return res.status(403).json({ message: 'Access denied to this issue' });
      }
    }

    res.json({ issue });
  } catch (error) {
    console.error('Get issue error:', error);
    res.status(500).json({ message: 'Failed to fetch issue' });
  }
});

// Create issue
router.post('/', authenticateToken, [
  body('project_id').isInt().withMessage('Project ID is required'),
  body('task_id').optional().isInt().withMessage('Task ID must be an integer'),
  body('description').trim().isLength({ min: 10 }).withMessage('Description must be at least 10 characters'),
  body('priority').optional().isIn(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).withMessage('Invalid priority'),
  body('assigned_to_user_id').optional().isInt().withMessage('Assigned user ID must be an integer')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const project = await Project.findByPk(req.body.project_id);
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    // If task_id is provided, validate that the task belongs to the project
    if (req.body.task_id) {
      const { Task } = require('../../models');
      const task = await Task.findByPk(req.body.task_id);
      if (!task) {
        return res.status(404).json({ message: 'Task not found' });
      }
      if (task.project_id !== parseInt(req.body.project_id)) {
        return res.status(400).json({ message: 'Task does not belong to the selected project' });
      }
    }

    const issueData = {
      ...req.body,
      raised_by_user_id: req.user.user_id
    };

    const issue = await Issue.create(issueData);

    res.status(201).json({
      message: 'Issue created successfully',
      issue
    });
  } catch (error) {
    console.error('Create issue error:', error);
    res.status(500).json({ message: 'Failed to create issue' });
  }
});

// Update issue
router.put('/:id', authenticateToken, [
  body('task_id').optional().isInt().withMessage('Task ID must be an integer'),
  body('description').optional().trim().isLength({ min: 10 }).withMessage('Description must be at least 10 characters'),
  body('priority').optional().isIn(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).withMessage('Invalid priority'),
  body('status').optional().isIn(['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED']).withMessage('Invalid status'),
  body('assigned_to_user_id').optional().isInt().withMessage('Assigned user ID must be an integer')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const issue = await Issue.findByPk(req.params.id);
    if (!issue) {
      return res.status(404).json({ message: 'Issue not found' });
    }

    // Check permissions
    const canUpdate = (req.user.role && req.user.role.name === 'Admin') || 
                     (req.user.role && req.user.role.name === 'Project Manager') || 
                     issue.raised_by_user_id === req.user.user_id ||
                     issue.assigned_to_user_id === req.user.user_id;

    if (!canUpdate) {
      return res.status(403).json({ message: 'Insufficient permissions' });
    }

    // If task_id is provided, validate that the task belongs to the issue's project
    if (req.body.task_id) {
      const { Task } = require('../../models');
      const task = await Task.findByPk(req.body.task_id);
      if (!task) {
        return res.status(404).json({ message: 'Task not found' });
      }
      if (task.project_id !== issue.project_id) {
        return res.status(400).json({ message: 'Task does not belong to the issue\'s project' });
      }
    }

    // Set resolution date if status is being changed to resolved/closed
    if (req.body.status === 'RESOLVED' || req.body.status === 'CLOSED') {
      req.body.date_resolved = new Date();
    }

    await issue.update(req.body);

    res.json({
      message: 'Issue updated successfully',
      issue
    });
  } catch (error) {
    console.error('Update issue error:', error);
    res.status(500).json({ message: 'Failed to update issue' });
  }
});

// Delete issue
router.delete('/:id', authenticateToken, authorizeRoles('Admin', 'Project Manager'), async (req, res) => {
  try {
    const issue = await Issue.findByPk(req.params.id);
    if (!issue) {
      return res.status(404).json({ message: 'Issue not found' });
    }

    await issue.destroy();

    res.json({ message: 'Issue deleted successfully' });
  } catch (error) {
    console.error('Delete issue error:', error);
    res.status(500).json({ message: 'Failed to delete issue' });
  }
});

// Assign issue
router.patch('/:id/assign', authenticateToken, [
  body('assigned_to_user_id').isInt().withMessage('Assigned user ID is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const issue = await Issue.findByPk(req.params.id);
    if (!issue) {
      return res.status(404).json({ message: 'Issue not found' });
    }

    // Check permissions
    const canAssign = (req.user.role && req.user.role.name === 'Admin') || 
                     (req.user.role && req.user.role.name === 'Project Manager') || 
                     issue.raised_by_user_id === req.user.user_id;

    if (!canAssign) {
      return res.status(403).json({ message: 'Insufficient permissions' });
    }

    await issue.update({ 
      assigned_to_user_id: req.body.assigned_to_user_id,
      status: 'IN_PROGRESS'
    });

    res.json({
      message: 'Issue assigned successfully',
      issue
    });
  } catch (error) {
    console.error('Assign issue error:', error);
    res.status(500).json({ message: 'Failed to assign issue' });
  }
});

// Resolve issue
router.patch('/:id/resolve', authenticateToken, [
  body('status').isIn(['RESOLVED', 'CLOSED']).withMessage('Status must be RESOLVED or CLOSED')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const issue = await Issue.findByPk(req.params.id);
    if (!issue) {
      return res.status(404).json({ message: 'Issue not found' });
    }

    // Check permissions
    const canResolve = (req.user.role && req.user.role.name === 'Admin') || 
                      (req.user.role && req.user.role.name === 'Project Manager') || 
                      issue.assigned_to_user_id === req.user.user_id;

    if (!canResolve) {
      return res.status(403).json({ message: 'Insufficient permissions' });
    }

    await issue.update({ 
      status: req.body.status,
      date_resolved: new Date()
    });

    res.json({
      message: 'Issue resolved successfully',
      issue
    });
  } catch (error) {
    console.error('Resolve issue error:', error);
    res.status(500).json({ message: 'Failed to resolve issue' });
  }
});

module.exports = router;
