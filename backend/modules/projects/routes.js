const express = require('express');
const { body, validationResult, query } = require('express-validator');
const { Op } = require('sequelize');
const { Project, User, Task, Issue, Document, MaterialAllocation, Material } = require('../../models');
const { sequelize } = require('../../config/database');
const { authenticateToken, authorizeRoles } = require('../../middleware/auth');

const router = express.Router();

// Get project statistics (must come before /:id route)
router.get('/:id/stats', async (req, res) => {
  try {
    const project = await Project.findByPk(req.params.id);
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    // Get task statistics
    const taskStats = await Task.findAll({
      where: { project_id: req.params.id },
      attributes: [
        'status',
        [sequelize.fn('COUNT', sequelize.col('task_id')), 'count']
      ],
      group: ['status']
    });

    // Get issue statistics
    const issueStats = await Issue.findAll({
      where: { project_id: req.params.id },
      attributes: [
        'status',
        [sequelize.fn('COUNT', sequelize.col('issue_id')), 'count']
      ],
      group: ['status']
    });

    // Get material allocation total
    const materialAllocations = await MaterialAllocation.findAll({
      where: { project_id: req.params.id },
      include: [{ model: Material, as: 'material' }]
    });

    const totalMaterialCost = materialAllocations.reduce((sum, allocation) => {
      return sum + (allocation.quantity * (allocation.material.cost_per_unit || 0));
    }, 0);

    res.json({
      project: {
        id: project.project_id,
        name: project.name,
        status: project.status,
        budget: project.budget
      },
      tasks: taskStats,
      issues: issueStats,
      materialCost: totalMaterialCost
    });
  } catch (error) {
    console.error('Get project stats error:', error);
    res.status(500).json({ message: 'Failed to fetch project statistics' });
  }
});

// Get project by ID with details
router.get('/:id', [
  query('status').optional().isIn(['PLANNED', 'ACTIVE', 'ON_HOLD', 'COMPLETED', 'CANCELLED']).withMessage('Invalid status')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const project = await Project.findByPk(req.params.id, {
      include: [
        { model: User, as: 'owner', attributes: ['user_id', 'name', 'email'] },
        { model: Task, as: 'tasks', include: [{ model: User, as: 'assignedUser', attributes: ['user_id', 'name'] }] },
        { model: Issue, as: 'issues', limit: 5, order: [['date_raised', 'DESC']] },
        { model: Document, as: 'documents', limit: 5, order: [['upload_date', 'DESC']] }
      ]
    });

    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    // Check permissions for contractors/site engineers
    if (req.user.role.name === 'Project On-site Team' || req.user.role.name === 'Collaborator Organisation') {
      const hasAccess = project.tasks.some(task => task.assigned_user_id === req.user.user_id);
      if (!hasAccess) {
        return res.status(403).json({ message: 'Access denied to this project' });
      }
    }

    res.json({ project });
  } catch (error) {
    console.error('Get project error:', error);
    res.status(500).json({ message: 'Failed to fetch project' });
  }
});

// Get all projects (with pagination and filtering)
router.get('/', [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('status').optional().isIn(['PLANNED', 'ACTIVE', 'ON_HOLD', 'COMPLETED', 'CANCELLED']).withMessage('Invalid status'),
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
    const { status, search } = req.query;

    console.log('Projects API called with:', { page, limit, status, search, userRole: req.user.role.name });

    // Build where clause
    const whereClause = {};
    if (status) whereClause.status = status;
    if (search) {
      whereClause[Op.or] = [
        { name: { [Op.like]: `%${search}%` } },
        { description: { [Op.like]: `%${search}%` } }
      ];
    }

    // Role-based filtering - Allow all users to see projects, but restrict access in detail view
    // Note: Access control is handled in individual project detail routes
    // Removed restrictive filtering to allow all users to see project listings

    const { count, rows: projects } = await Project.findAndCountAll({
      where: whereClause,
      include: [
        { model: User, as: 'owner', attributes: ['user_id', 'name', 'email'] }
      ],
      limit,
      offset,
      order: [['created_at', 'DESC']]
    });

    res.json({
      projects,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(count / limit),
        totalItems: count,
        itemsPerPage: limit
      }
    });
  } catch (error) {
    console.error('Get projects error:', error);
    res.status(500).json({ message: 'Failed to fetch projects' });
  }
});

// Create project
router.post('/', authenticateToken, authorizeRoles('Admin', 'Project Manager'), [
  body('name').trim().isLength({ min: 2 }).withMessage('Name must be at least 2 characters'),
  body('description').optional().trim(),
  body('start_date').optional().isISO8601().withMessage('Invalid start date'),
  body('end_date').optional().isISO8601().withMessage('Invalid end date'),
  body('budget').optional().isFloat({ min: 0 }).withMessage('Budget must be a positive number'),
  body('status').optional().isIn(['PLANNED', 'ACTIVE', 'ON_HOLD', 'COMPLETED', 'CANCELLED']).withMessage('Invalid status')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const projectData = {
      ...req.body,
      owner_user_id: req.user.user_id
    };

    const project = await Project.create(projectData);

    res.status(201).json({
      message: 'Project created successfully',
      project
    });
  } catch (error) {
    console.error('Create project error:', error);
    res.status(500).json({ message: 'Failed to create project' });
  }
});

// Update project
router.put('/:id', [
  body('name').optional().trim().isLength({ min: 2 }).withMessage('Name must be at least 2 characters'),
  body('description').optional().trim(),
  body('start_date').optional().isISO8601().withMessage('Invalid start date'),
  body('end_date').optional().isISO8601().withMessage('Invalid end date'),
  body('budget').optional().isFloat({ min: 0 }).withMessage('Budget must be a positive number'),
  body('status').optional().isIn(['PLANNED', 'ACTIVE', 'ON_HOLD', 'COMPLETED', 'CANCELLED']).withMessage('Invalid status')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const project = await Project.findByPk(req.params.id);
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    // Check permissions
    const canUpdate = req.user.role.name === 'Admin' || 
                     req.user.role.name === 'Project Manager' || 
                     project.owner_user_id === req.user.user_id;

    if (!canUpdate) {
      return res.status(403).json({ message: 'Insufficient permissions' });
    }

    await project.update(req.body);

    res.json({
      message: 'Project updated successfully',
      project
    });
  } catch (error) {
    console.error('Update project error:', error);
    res.status(500).json({ message: 'Failed to update project' });
  }
});

// Delete project
router.delete('/:id', authorizeRoles('Admin', 'Project Manager'), async (req, res) => {
  try {
    const project = await Project.findByPk(req.params.id);
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    // Check if user is the owner or has admin role
    const canDelete = req.user.role.name === 'Admin' || project.owner_user_id === req.user.user_id;
    if (!canDelete) {
      return res.status(403).json({ message: 'Insufficient permissions' });
    }

    await project.destroy();

    res.json({ message: 'Project deleted successfully' });
  } catch (error) {
    console.error('Delete project error:', error);
    res.status(500).json({ message: 'Failed to delete project' });
  }
});

module.exports = router;
