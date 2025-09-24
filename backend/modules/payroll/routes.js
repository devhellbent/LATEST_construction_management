const express = require('express');
const { body, validationResult, query } = require('express-validator');
const { Op } = require('sequelize');
const { Payroll, Labour, Project } = require('../../models');
const { authenticateToken, authorizeRoles } = require('../../middleware/auth');

const router = express.Router();

// Get all payroll records
router.get('/', [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('project_id').optional().isInt().withMessage('Project ID must be an integer'),
  query('labour_id').optional().isInt().withMessage('Labour ID must be an integer')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    const { project_id, labour_id } = req.query;

    const whereClause = {};
    if (project_id) whereClause.project_id = project_id;
    if (labour_id) whereClause.labour_id = labour_id;

    const { count, rows: payrolls } = await Payroll.findAndCountAll({
      where: whereClause,
      include: [
        { model: Labour, as: 'labour', attributes: ['labour_id', 'name', 'skill'] },
        { model: Project, as: 'project', attributes: ['project_id', 'name'] }
      ],
      limit,
      offset,
      order: [['period_start', 'DESC']]
    });

    res.json({
      payrolls,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(count / limit),
        totalItems: count,
        itemsPerPage: limit
      }
    });
  } catch (error) {
    console.error('Get payrolls error:', error);
    res.status(500).json({ message: 'Failed to fetch payroll records' });
  }
});

// Create payroll record
router.post('/', authenticateToken, authorizeRoles('Admin', 'Project Manager'), [
  body('labour_id').isInt().withMessage('Labour ID is required'),
  body('project_id').isInt().withMessage('Project ID is required'),
  body('period_start').isISO8601().withMessage('Invalid period start date'),
  body('period_end').isISO8601().withMessage('Invalid period end date'),
  body('amount_paid').isFloat({ min: 0 }).withMessage('Amount paid must be a positive number'),
  body('deductions').optional().isFloat({ min: 0 }).withMessage('Deductions must be a non-negative number'),
  body('paid_date').optional().isISO8601().withMessage('Invalid paid date')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const labour = await Labour.findByPk(req.body.labour_id);
    if (!labour) {
      return res.status(404).json({ message: 'Labour not found' });
    }

    const project = await Project.findByPk(req.body.project_id);
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    const payroll = await Payroll.create(req.body);

    res.status(201).json({
      message: 'Payroll record created successfully',
      payroll
    });
  } catch (error) {
    console.error('Create payroll error:', error);
    res.status(500).json({ message: 'Failed to create payroll record' });
  }
});

// Update payroll record
router.put('/:id', authenticateToken, authorizeRoles('Admin', 'Project Manager'), [
  body('amount_paid').optional().isFloat({ min: 0 }).withMessage('Amount paid must be a positive number'),
  body('deductions').optional().isFloat({ min: 0 }).withMessage('Deductions must be a non-negative number'),
  body('paid_date').optional().isISO8601().withMessage('Invalid paid date')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const payroll = await Payroll.findByPk(req.params.id);
    if (!payroll) {
      return res.status(404).json({ message: 'Payroll record not found' });
    }

    await payroll.update(req.body);

    res.json({
      message: 'Payroll record updated successfully',
      payroll
    });
  } catch (error) {
    console.error('Update payroll error:', error);
    res.status(500).json({ message: 'Failed to update payroll record' });
  }
});

// Delete payroll record
router.delete('/:id', authenticateToken, authorizeRoles('Admin', 'Project Manager'), async (req, res) => {
  try {
    const payroll = await Payroll.findByPk(req.params.id);
    if (!payroll) {
      return res.status(404).json({ message: 'Payroll record not found' });
    }

    await payroll.destroy();

    res.json({ message: 'Payroll record deleted successfully' });
  } catch (error) {
    console.error('Delete payroll error:', error);
    res.status(500).json({ message: 'Failed to delete payroll record' });
  }
});

module.exports = router;
