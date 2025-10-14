const express = require('express');
const { body, validationResult, query } = require('express-validator');
const { Op } = require('sequelize');
const { SubcontractorLedger, Subcontractor, Project, User } = require('../../models');
const { authenticateToken, authorizeRoles } = require('../../middleware/auth');

const router = express.Router();

// Get all subcontractor ledger entries with filtering
router.get('/', [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('subcontractor_id').optional().isInt().withMessage('Subcontractor ID must be an integer'),
  query('project_id').optional().isInt().withMessage('Project ID must be an integer'),
  query('status').optional().isIn(['PENDING', 'APPROVED', 'PAID', 'REJECTED']).withMessage('Invalid status'),
  query('payment_type').optional().isIn(['ADVANCE', 'PROGRESS', 'FINAL', 'RETENTION', 'OTHER']).withMessage('Invalid payment type'),
  query('start_date').optional().isISO8601().withMessage('Invalid start date'),
  query('end_date').optional().isISO8601().withMessage('Invalid end date')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;
    const { subcontractor_id, project_id, status, payment_type, start_date, end_date } = req.query;

    const whereClause = {};
    if (subcontractor_id) whereClause.subcontractor_id = subcontractor_id;
    if (project_id) whereClause.project_id = project_id;
    if (status) whereClause.status = status;
    if (payment_type) whereClause.payment_type = payment_type;
    if (start_date || end_date) {
      whereClause.payment_date = {};
      if (start_date) whereClause.payment_date[Op.gte] = start_date;
      if (end_date) whereClause.payment_date[Op.lte] = end_date;
    }

    const { count, rows } = await SubcontractorLedger.findAndCountAll({
      where: whereClause,
      include: [
        { model: Subcontractor, as: 'subcontractor', attributes: ['subcontractor_id', 'company_name', 'work_type'] },
        { model: Project, as: 'project', attributes: ['project_id', 'name'] },
        { model: User, as: 'createdBy', attributes: ['user_id', 'name'] },
        { model: User, as: 'updatedBy', attributes: ['user_id', 'name'] },
        { model: User, as: 'approvedBy', attributes: ['user_id', 'name'] }
      ],
      limit,
      offset,
      order: [['payment_date', 'DESC'], ['created_at', 'DESC']]
    });

    // Flatten association fields for frontend expectations
    const ledgerEntries = rows.map((entry) => {
      const plain = entry.get({ plain: true });
      return {
        ...plain,
        subcontractor_name: plain.subcontractor?.company_name || null,
        project_name: plain.project?.name || null,
      };
    });

    res.json({
      ledgerEntries,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(count / limit),
        totalItems: count,
        itemsPerPage: limit
      }
    });
  } catch (error) {
    console.error('Get subcontractor ledger error:', error);
    res.status(500).json({ message: 'Failed to fetch subcontractor ledger' });
  }
});

// Get ledger entries by subcontractor
router.get('/subcontractor/:subcontractorId', [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { subcontractorId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;

    const { count, rows: ledgerEntries } = await SubcontractorLedger.findAndCountAll({
      where: { subcontractor_id: subcontractorId },
      include: [
        { model: Subcontractor, as: 'subcontractor', attributes: ['subcontractor_id', 'company_name', 'work_type'] },
        { model: Project, as: 'project', attributes: ['project_id', 'name'] },
        { model: User, as: 'createdBy', attributes: ['user_id', 'name'] },
        { model: User, as: 'updatedBy', attributes: ['user_id', 'name'] },
        { model: User, as: 'approvedBy', attributes: ['user_id', 'name'] }
      ],
      limit,
      offset,
      order: [['payment_date', 'DESC'], ['created_at', 'DESC']]
    });

    res.json({
      ledgerEntries,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(count / limit),
        totalItems: count,
        itemsPerPage: limit
      }
    });
  } catch (error) {
    console.error('Get subcontractor ledger by subcontractor error:', error);
    res.status(500).json({ message: 'Failed to fetch subcontractor ledger' });
  }
});

// Get ledger entries by project
router.get('/project/:projectId', [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { projectId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;

    const { count, rows: ledgerEntries } = await SubcontractorLedger.findAndCountAll({
      where: { project_id: projectId },
      include: [
        { model: Subcontractor, as: 'subcontractor', attributes: ['subcontractor_id', 'company_name', 'work_type'] },
        { model: Project, as: 'project', attributes: ['project_id', 'name'] },
        { model: User, as: 'createdBy', attributes: ['user_id', 'name'] },
        { model: User, as: 'updatedBy', attributes: ['user_id', 'name'] },
        { model: User, as: 'approvedBy', attributes: ['user_id', 'name'] }
      ],
      limit,
      offset,
      order: [['payment_date', 'DESC'], ['created_at', 'DESC']]
    });

    res.json({
      ledgerEntries,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(count / limit),
        totalItems: count,
        itemsPerPage: limit
      }
    });
  } catch (error) {
    console.error('Get subcontractor ledger by project error:', error);
    res.status(500).json({ message: 'Failed to fetch subcontractor ledger' });
  }
});

// Create ledger entry
router.post('/', authenticateToken, [
  body('subcontractor_id').isInt({ min: 1 }).withMessage('Subcontractor ID is required'),
  body('project_id').isInt({ min: 1 }).withMessage('Project ID is required'),
  body('payment_date').isISO8601().withMessage('Payment date is required'),
  body('payment_amount').isFloat({ min: 0 }).withMessage('Payment amount must be a positive number'),
  body('payment_type').isIn(['ADVANCE', 'PROGRESS', 'FINAL', 'RETENTION', 'OTHER']).withMessage('Invalid payment type'),
  body('payment_method').isIn(['CASH', 'CHEQUE', 'NEFT', 'RTGS', 'UPI', 'OTHER']).withMessage('Invalid payment method'),
  body('reference_number').optional().trim().isLength({ max: 100 }).withMessage('Reference number too long'),
  body('description').optional().trim(),
  body('bill_number').optional().trim().isLength({ max: 100 }).withMessage('Bill number too long'),
  body('bill_date').optional().isISO8601().withMessage('Invalid bill date'),
  body('bill_amount').optional().isFloat({ min: 0 }).withMessage('Bill amount must be a positive number'),
  body('status').optional().isIn(['PENDING', 'APPROVED', 'PAID', 'REJECTED']).withMessage('Invalid status')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    // Verify subcontractor exists
    const subcontractor = await Subcontractor.findByPk(req.body.subcontractor_id);
    if (!subcontractor) {
      return res.status(404).json({ message: 'Subcontractor not found' });
    }

    // Verify project exists
    const project = await Project.findByPk(req.body.project_id);
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    const ledgerData = {
      ...req.body,
      created_by: req.user.user_id,
      updated_by: req.user.user_id
    };

    const ledgerEntry = await SubcontractorLedger.create(ledgerData);

    // Fetch the created entry with associations
    const createdEntry = await SubcontractorLedger.findByPk(ledgerEntry.ledger_id, {
      include: [
        { model: Subcontractor, as: 'subcontractor', attributes: ['subcontractor_id', 'company_name', 'work_type'] },
        { model: Project, as: 'project', attributes: ['project_id', 'name'] },
        { model: User, as: 'createdBy', attributes: ['user_id', 'name'] }
      ]
    });

    res.status(201).json({
      message: 'Ledger entry created successfully',
      ledgerEntry: createdEntry
    });
  } catch (error) {
    console.error('Create subcontractor ledger error:', error);
    res.status(500).json({ message: 'Failed to create ledger entry' });
  }
});

// Update ledger entry
router.put('/:id', authenticateToken, [
  body('payment_date').optional().isISO8601().withMessage('Invalid payment date'),
  body('payment_amount').optional().isFloat({ min: 0 }).withMessage('Payment amount must be a positive number'),
  body('payment_type').optional().isIn(['ADVANCE', 'PROGRESS', 'FINAL', 'RETENTION', 'OTHER']).withMessage('Invalid payment type'),
  body('payment_method').optional().isIn(['CASH', 'CHEQUE', 'NEFT', 'RTGS', 'UPI', 'OTHER']).withMessage('Invalid payment method'),
  body('reference_number').optional().trim().isLength({ max: 100 }).withMessage('Reference number too long'),
  body('description').optional().trim(),
  body('bill_number').optional().trim().isLength({ max: 100 }).withMessage('Bill number too long'),
  body('bill_date').optional().isISO8601().withMessage('Invalid bill date'),
  body('bill_amount').optional().isFloat({ min: 0 }).withMessage('Bill amount must be a positive number'),
  body('status').optional().isIn(['PENDING', 'APPROVED', 'PAID', 'REJECTED']).withMessage('Invalid status')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const ledgerEntry = await SubcontractorLedger.findByPk(req.params.id);
    if (!ledgerEntry) {
      return res.status(404).json({ message: 'Ledger entry not found' });
    }

    const updateData = {
      ...req.body,
      updated_by: req.user.user_id
    };

    await ledgerEntry.update(updateData);

    // Fetch updated entry with associations
    const updatedEntry = await SubcontractorLedger.findByPk(req.params.id, {
      include: [
        { model: Subcontractor, as: 'subcontractor', attributes: ['subcontractor_id', 'company_name', 'work_type'] },
        { model: Project, as: 'project', attributes: ['project_id', 'name'] },
        { model: User, as: 'createdBy', attributes: ['user_id', 'name'] },
        { model: User, as: 'updatedBy', attributes: ['user_id', 'name'] },
        { model: User, as: 'approvedBy', attributes: ['user_id', 'name'] }
      ]
    });

    res.json({
      message: 'Ledger entry updated successfully',
      ledgerEntry: updatedEntry
    });
  } catch (error) {
    console.error('Update subcontractor ledger error:', error);
    res.status(500).json({ message: 'Failed to update ledger entry' });
  }
});

// Approve ledger entry
router.patch('/:id/approve', authenticateToken, authorizeRoles('Admin', 'Project Manager'), async (req, res) => {
  try {
    const ledgerEntry = await SubcontractorLedger.findByPk(req.params.id);
    if (!ledgerEntry) {
      return res.status(404).json({ message: 'Ledger entry not found' });
    }

    await ledgerEntry.update({ 
      status: 'APPROVED',
      approved_by_user_id: req.user.user_id,
      updated_by: req.user.user_id
    });

    res.json({
      message: 'Ledger entry approved successfully',
      ledgerEntry
    });
  } catch (error) {
    console.error('Approve subcontractor ledger error:', error);
    res.status(500).json({ message: 'Failed to approve ledger entry' });
  }
});

// Mark as paid (legacy path)
router.patch('/:id/pay', authenticateToken, authorizeRoles('Admin', 'Project Manager'), async (req, res) => {
  try {
    const ledgerEntry = await SubcontractorLedger.findByPk(req.params.id);
    if (!ledgerEntry) {
      return res.status(404).json({ message: 'Ledger entry not found' });
    }

    await ledgerEntry.update({ 
      status: 'PAID',
      updated_by: req.user.user_id
    });

    res.json({
      message: 'Ledger entry marked as paid successfully',
      ledgerEntry
    });
  } catch (error) {
    console.error('Mark subcontractor ledger as paid error:', error);
    res.status(500).json({ message: 'Failed to mark ledger entry as paid' });
  }
});

// Mark as paid (frontend-compatible path)
router.patch('/:id/mark-paid', authenticateToken, authorizeRoles('Admin', 'Project Manager'), async (req, res) => {
  try {
    const ledgerEntry = await SubcontractorLedger.findByPk(req.params.id);
    if (!ledgerEntry) {
      return res.status(404).json({ message: 'Ledger entry not found' });
    }

    await ledgerEntry.update({ 
      status: 'PAID',
      updated_by: req.user.user_id
    });

    res.json({
      message: 'Ledger entry marked as paid successfully',
      ledgerEntry
    });
  } catch (error) {
    console.error('Mark subcontractor ledger as paid error:', error);
    res.status(500).json({ message: 'Failed to mark ledger entry as paid' });
  }
});

// Delete ledger entry
router.delete('/:id', authenticateToken, authorizeRoles('Admin', 'Project Manager'), async (req, res) => {
  try {
    const ledgerEntry = await SubcontractorLedger.findByPk(req.params.id);
    if (!ledgerEntry) {
      return res.status(404).json({ message: 'Ledger entry not found' });
    }

    await ledgerEntry.destroy();

    res.json({ message: 'Ledger entry deleted successfully' });
  } catch (error) {
    console.error('Delete subcontractor ledger error:', error);
    res.status(500).json({ message: 'Failed to delete ledger entry' });
  }
});

// Overall ledger summary for all subcontractors/projects
router.get('/summary', async (req, res) => {
  try {
    const summariesRaw = await SubcontractorLedger.findAll({
      attributes: [
        'subcontractor_id',
        'project_id',
        [SubcontractorLedger.sequelize.fn('SUM', SubcontractorLedger.sequelize.col('payment_amount')), 'total_payments'],
        [SubcontractorLedger.sequelize.fn('MAX', SubcontractorLedger.sequelize.col('payment_date')), 'last_payment_date']
      ],
      include: [
        { model: Subcontractor, as: 'subcontractor', attributes: ['company_name'] },
        { model: Project, as: 'project', attributes: ['name'] }
      ],
      group: ['subcontractor_id', 'project_id', 'subcontractor.subcontractor_id', 'subcontractor.company_name', 'project.project_id', 'project.name'],
      raw: false
    });

    const summaries = summariesRaw.map((row) => {
      const plain = row.get({ plain: true });
      const totalPaymentsNumber = Number(plain.total_payments || 0);
      return {
        subcontractor_id: plain.subcontractor_id,
        subcontractor_name: plain.subcontractor?.company_name || null,
        project_id: plain.project_id,
        project_name: plain.project?.name || null,
        total_payments: totalPaymentsNumber,
        // Without separate contract/bill tracking, treat outstanding as 0 for now
        outstanding_balance: 0,
        last_payment_date: plain.last_payment_date || null,
        payment_status: totalPaymentsNumber > 0 ? 'PAID' : 'PENDING'
      };
    });

    res.json({ summaries });
  } catch (error) {
    console.error('Get overall subcontractor ledger summary error:', error);
    res.status(500).json({ message: 'Failed to fetch ledger summaries' });
  }
});

// Get ledger summary by subcontractor
router.get('/summary/subcontractor/:subcontractorId', async (req, res) => {
  try {
    const { subcontractorId } = req.params;

    const summary = await SubcontractorLedger.findAll({
      where: { subcontractor_id: subcontractorId },
      attributes: [
        'payment_type',
        'status',
        [SubcontractorLedger.sequelize.fn('SUM', SubcontractorLedger.sequelize.col('payment_amount')), 'total_amount'],
        [SubcontractorLedger.sequelize.fn('COUNT', SubcontractorLedger.sequelize.col('ledger_id')), 'count']
      ],
      group: ['payment_type', 'status'],
      raw: true
    });

    res.json({ summary });
  } catch (error) {
    console.error('Get subcontractor ledger summary error:', error);
    res.status(500).json({ message: 'Failed to fetch ledger summary' });
  }
});

module.exports = router;
