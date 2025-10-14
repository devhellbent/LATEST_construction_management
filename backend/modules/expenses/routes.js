const express = require('express');
const { body, validationResult, query } = require('express-validator');
const { Op } = require('sequelize');
const { PettyCashExpense, Project, User } = require('../../models');
const { authenticateToken, authorizeRoles } = require('../../middleware/auth');

const router = express.Router();

// Get all expenses
router.get('/', [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('project_id').optional().isInt().withMessage('Project ID must be an integer'),
  query('category').optional().trim(),
  query('start_date').optional().isISO8601().withMessage('Invalid start date'),
  query('end_date').optional().isISO8601().withMessage('Invalid end date')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    const { project_id, category, start_date, end_date } = req.query;

    const whereClause = {};
    if (project_id) whereClause.project_id = project_id;
    if (category) whereClause.category = category;
    if (start_date || end_date) {
      whereClause.date = {};
      if (start_date) whereClause.date[Op.gte] = start_date;
      if (end_date) whereClause.date[Op.lte] = end_date;
    }

    const { count, rows: expenses } = await PettyCashExpense.findAndCountAll({
      where: whereClause,
      include: [
        { model: Project, as: 'project', attributes: ['project_id', 'name'] },
        { model: User, as: 'approvedBy', attributes: ['user_id', 'name'] },
        { model: User, as: 'user', attributes: ['user_id', 'name'] },
        { model: User, as: 'createdBy', attributes: ['user_id', 'name'] },
        { model: User, as: 'updatedBy', attributes: ['user_id', 'name'] }
      ],
      limit,
      offset,
      order: [['date', 'DESC']]
    });

    res.json({
      expenses,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(count / limit),
        totalItems: count,
        itemsPerPage: limit
      }
    });
  } catch (error) {
    console.error('Get expenses error:', error);
    res.status(500).json({ message: 'Failed to fetch expenses' });
  }
});

// Get latest expenses
router.get('/latest', [
  query('limit').optional().isInt({ min: 1, max: 10 }).withMessage('Limit must be between 1 and 10')
], async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 5;

    const expenses = await PettyCashExpense.findAll({
      include: [
        { model: Project, as: 'project', attributes: ['project_id', 'name'] },
        { model: User, as: 'approvedBy', attributes: ['user_id', 'name'] },
        { model: User, as: 'user', attributes: ['user_id', 'name'] }
      ],
      limit,
      order: [['created_at', 'DESC']]
    });

    res.json({ expenses });
  } catch (error) {
    console.error('Get latest expenses error:', error);
    res.status(500).json({ message: 'Failed to fetch latest expenses' });
  }
});

// Create expense
router.post('/', authenticateToken, [
  body('project_id').isInt().withMessage('Project ID is required'),
  body('category').isIn(['Kirana', 'Machinery_Rent', 'Labour_Expense', 'Other']).withMessage('Invalid category'),
  body('category_other_text').optional().trim().isLength({ max: 255 }).withMessage('Category other text too long'),
  body('amount').isFloat({ min: 0 }).withMessage('Amount must be a positive number'),
  body('date').isISO8601().withMessage('Invalid date'),
  body('description').optional().trim()
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

    // Validate category_other_text is provided when category is 'Other'
    if (req.body.category === 'Other' && !req.body.category_other_text) {
      return res.status(400).json({ message: 'Category other text is required when category is Other' });
    }

    const expenseData = {
      ...req.body,
      user_id: req.user.user_id,
      created_by: req.user.user_id,
      updated_by: req.user.user_id
    };

    const expense = await PettyCashExpense.create(expenseData);

    res.status(201).json({
      message: 'Expense created successfully',
      expense
    });
  } catch (error) {
    console.error('Create expense error:', error);
    res.status(500).json({ message: 'Failed to create expense' });
  }
});

// Update expense
router.put('/:id', authenticateToken, [
  body('category').optional().isIn(['Kirana', 'Machinery_Rent', 'Labour_Expense', 'Other']).withMessage('Invalid category'),
  body('category_other_text').optional().trim().isLength({ max: 255 }).withMessage('Category other text too long'),
  body('amount').optional().isFloat({ min: 0 }).withMessage('Amount must be a positive number'),
  body('date').optional().isISO8601().withMessage('Invalid date'),
  body('description').optional().trim()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const expense = await PettyCashExpense.findByPk(req.params.id);
    if (!expense) {
      return res.status(404).json({ message: 'Expense not found' });
    }

    // Validate category_other_text is provided when category is 'Other'
    if (req.body.category === 'Other' && !req.body.category_other_text) {
      return res.status(400).json({ message: 'Category other text is required when category is Other' });
    }

    const updateData = {
      ...req.body,
      updated_by: req.user.user_id
    };

    await expense.update(updateData);

    res.json({
      message: 'Expense updated successfully',
      expense
    });
  } catch (error) {
    console.error('Update expense error:', error);
    res.status(500).json({ message: 'Failed to update expense' });
  }
});

// Approve expense
router.patch('/:id/approve', authenticateToken, authorizeRoles('Admin', 'Project Manager'), async (req, res) => {
  try {
    const expense = await PettyCashExpense.findByPk(req.params.id);
    if (!expense) {
      return res.status(404).json({ message: 'Expense not found' });
    }

    await expense.update({ approved_by_user_id: req.user.user_id });

    res.json({
      message: 'Expense approved successfully',
      expense
    });
  } catch (error) {
    console.error('Approve expense error:', error);
    res.status(500).json({ message: 'Failed to approve expense' });
  }
});

// Delete expense
router.delete('/:id', authenticateToken, authorizeRoles('Admin', 'Project Manager'), async (req, res) => {
  try {
    const expense = await PettyCashExpense.findByPk(req.params.id);
    if (!expense) {
      return res.status(404).json({ message: 'Expense not found' });
    }

    await expense.destroy();

    res.json({ message: 'Expense deleted successfully' });
  } catch (error) {
    console.error('Delete expense error:', error);
    res.status(500).json({ message: 'Failed to delete expense' });
  }
});

module.exports = router;
