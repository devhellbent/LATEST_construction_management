const express = require('express');
const { body, validationResult, query } = require('express-validator');
const { Op } = require('sequelize');
const { 
  SupplierLedger, 
  Supplier, 
  PurchaseOrder, 
  User 
} = require('../../models');
const { authenticateToken, authorizeRoles } = require('../../middleware/auth');

const router = express.Router();

// =====================================================
// SUPPLIER LEDGER ROUTES
// =====================================================

// Get supplier ledger entries with pagination and filtering
router.get('/', authenticateToken, [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('supplier_id').optional().isInt().withMessage('Supplier ID must be an integer'),
  query('transaction_type').optional().isIn(['PURCHASE', 'PAYMENT', 'ADJUSTMENT', 'CREDIT_NOTE', 'DEBIT_NOTE']),
  query('payment_status').optional().isIn(['PENDING', 'PARTIAL', 'PAID', 'OVERDUE']),
  query('date_from').optional().isISO8601().withMessage('Date from must be a valid date'),
  query('date_to').optional().isISO8601().withMessage('Date to must be a valid date'),
  query('search').optional().trim()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;
    const { supplier_id, transaction_type, payment_status, date_from, date_to, search } = req.query;

    // Build where clause
    const whereClause = {};
    if (supplier_id) whereClause.supplier_id = supplier_id;
    if (transaction_type) whereClause.transaction_type = transaction_type;
    if (payment_status) whereClause.payment_status = payment_status;
    
    if (date_from || date_to) {
      whereClause.transaction_date = {};
      if (date_from) whereClause.transaction_date[Op.gte] = date_from;
      if (date_to) whereClause.transaction_date[Op.lte] = date_to;
    }
    
    if (search) {
      whereClause[Op.or] = [
        { reference_number: { [Op.like]: `%${search}%` } },
        { description: { [Op.like]: `%${search}%` } }
      ];
    }

    const { count, rows: ledgerEntries } = await SupplierLedger.findAndCountAll({
      where: whereClause,
      include: [
        { model: Supplier, as: 'supplier', attributes: ['supplier_name', 'contact_person', 'phone', 'email'] },
        { model: PurchaseOrder, as: 'purchaseOrder', attributes: ['po_number', 'po_date'], required: false },
        { model: User, as: 'createdBy', attributes: ['name', 'email'] }
      ],
      limit,
      offset,
      order: [['transaction_date', 'DESC'], ['ledger_id', 'DESC']]
    });

    // Transform the data to match frontend expectations
    const entries = ledgerEntries.map(entry => ({
      ledger_id: entry.ledger_id,
      supplier_id: entry.supplier_id,
      supplier_name: entry.supplier ? entry.supplier.supplier_name : 'Unknown Supplier',
      transaction_type: entry.transaction_type,
      po_id: entry.po_id,
      po_reference_id: entry.purchaseOrder ? entry.purchaseOrder.po_number : null,
      amount: entry.transaction_type === 'PURCHASE' ? parseFloat(entry.debit_amount) : parseFloat(entry.credit_amount),
      balance: parseFloat(entry.balance),
      payment_status: entry.payment_status,
      transaction_date: entry.transaction_date,
      description: entry.description,
      created_by: entry.createdBy ? entry.createdBy.name : 'Unknown User'
    }));

    res.json({
      entries,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(count / limit),
        totalItems: count,
        itemsPerPage: limit
      }
    });
  } catch (error) {
    console.error('Get supplier ledger error:', error);
    res.status(500).json({ message: 'Failed to fetch supplier ledger' });
  }
});

// Get supplier ledger summary
router.get('/summary', authenticateToken, async (req, res) => {
  try {
    const { supplier_id } = req.query;

    const whereClause = supplier_id ? { supplier_id } : {};

    // Get supplier ledger summary with proper aggregation
    const summaryData = await SupplierLedger.findAll({
      where: whereClause,
      attributes: [
        'supplier_id',
        [SupplierLedger.sequelize.fn('SUM', SupplierLedger.sequelize.col('debit_amount')), 'total_purchases'],
        [SupplierLedger.sequelize.fn('SUM', SupplierLedger.sequelize.col('credit_amount')), 'total_payments'],
        [SupplierLedger.sequelize.fn('MAX', SupplierLedger.sequelize.col('balance')), 'current_balance'],
        [SupplierLedger.sequelize.fn('MAX', SupplierLedger.sequelize.col('transaction_date')), 'last_transaction_date'],
        [SupplierLedger.sequelize.fn('COUNT', 
          SupplierLedger.sequelize.literal("CASE WHEN payment_status = 'PENDING' AND due_date < CURDATE() THEN 1 END")
        ), 'overdue_count']
      ],
      group: ['supplier_id'],
      raw: true
    });

    // Get supplier details separately
    const supplierIds = summaryData.map(item => item.supplier_id);
    const suppliers = await Supplier.findAll({
      where: { supplier_id: supplierIds },
      attributes: ['supplier_id', 'supplier_name', 'contact_person', 'phone', 'email']
    });

    // Combine supplier data with summary data
    const summaries = summaryData.map(summary => {
      const supplier = suppliers.find(s => s.supplier_id === summary.supplier_id);
      const totalPurchases = parseFloat(summary.total_purchases) || 0;
      const totalPayments = parseFloat(summary.total_payments) || 0;
      const outstandingBalance = totalPurchases - totalPayments;

      return {
        supplier_id: summary.supplier_id,
        supplier_name: supplier ? supplier.supplier_name : 'Unknown Supplier',
        total_purchases: totalPurchases,
        total_payments: totalPayments,
        outstanding_balance: outstandingBalance,
        last_transaction_date: summary.last_transaction_date,
        overdue_count: summary.overdue_count || 0
      };
    });

    res.json({ summaries });
  } catch (error) {
    console.error('Get supplier ledger summary error:', error);
    res.status(500).json({ message: 'Failed to fetch supplier ledger summary' });
  }
});

// Get supplier ledger by supplier ID
router.get('/supplier/:supplierId', authenticateToken, async (req, res) => {
  try {
    const { supplierId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const offset = (page - 1) * limit;

    const { count, rows: ledgerEntries } = await SupplierLedger.findAndCountAll({
      where: { supplier_id: supplierId },
      include: [
        { model: Supplier, as: 'supplier', attributes: ['supplier_name', 'contact_person', 'phone', 'email'] },
        { model: PurchaseOrder, as: 'purchaseOrder', attributes: ['po_number', 'po_date'], required: false },
        { model: User, as: 'createdBy', attributes: ['name', 'email'] }
      ],
      limit,
      offset,
      order: [['transaction_date', 'ASC'], ['ledger_id', 'ASC']]
    });

    // Calculate running balance
    let runningBalance = 0;
    const entriesWithBalance = ledgerEntries.map(entry => {
      if (entry.transaction_type === 'PURCHASE') {
        runningBalance += parseFloat(entry.debit_amount);
      } else if (entry.transaction_type === 'PAYMENT') {
        runningBalance -= parseFloat(entry.credit_amount);
      }
      return {
        ...entry.toJSON(),
        running_balance: runningBalance
      };
    });

    res.json({
      ledgerEntries: entriesWithBalance,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(count / limit),
        totalItems: count,
        itemsPerPage: limit
      }
    });
  } catch (error) {
    console.error('Get supplier ledger by supplier error:', error);
    res.status(500).json({ message: 'Failed to fetch supplier ledger' });
  }
});

// Record payment to supplier
router.post('/payment', authenticateToken, authorizeRoles('Admin', 'Project Manager', 'Accountant'), [
  body('supplier_id').isInt().withMessage('Supplier ID must be an integer'),
  body('payment_amount').isFloat({ min: 0.01 }).withMessage('Payment amount must be a positive number'),
  body('payment_date').isISO8601().withMessage('Payment date must be a valid date'),
  body('reference_number').optional().trim(),
  body('description').optional().trim(),
  body('po_id').optional().isInt().withMessage('PO ID must be an integer')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { supplier_id, payment_amount, payment_date, reference_number, description, po_id } = req.body;

    // Get current balance for the supplier
    const lastEntry = await SupplierLedger.findOne({
      where: { supplier_id },
      order: [['transaction_date', 'DESC'], ['ledger_id', 'DESC']]
    });

    const currentBalance = lastEntry ? parseFloat(lastEntry.balance) : 0;
    const newBalance = currentBalance - payment_amount;

    // Create payment entry
    const paymentEntry = await SupplierLedger.create({
      supplier_id,
      po_id,
      transaction_type: 'PAYMENT',
      transaction_date: payment_date,
      reference_number: reference_number || `PAY-${Date.now()}`,
      description: description || `Payment of ₹${payment_amount}`,
      debit_amount: 0,
      credit_amount: payment_amount,
      balance: newBalance,
      payment_status: newBalance <= 0 ? 'PAID' : 'PARTIAL',
      created_by_user_id: req.user.user_id
    });

    // Update payment status of previous entries
    if (newBalance > 0) {
      // Still have outstanding balance
      await SupplierLedger.update(
        { payment_status: 'PARTIAL' },
        { 
          where: { 
            supplier_id, 
            transaction_type: 'PURCHASE',
            payment_status: 'PENDING'
          }
        }
      );
    } else {
      // All paid
      await SupplierLedger.update(
        { payment_status: 'PAID' },
        { 
          where: { 
            supplier_id, 
            transaction_type: 'PURCHASE',
            payment_status: ['PENDING', 'PARTIAL']
          }
        }
      );
    }

    res.status(201).json({
      message: 'Payment recorded successfully',
      paymentEntry
    });
  } catch (error) {
    console.error('Record payment error:', error);
    res.status(500).json({ message: 'Failed to record payment' });
  }
});

// Record adjustment entry
router.post('/adjustment', authenticateToken, authorizeRoles('Admin', 'Project Manager', 'Accountant'), [
  body('supplier_id').isInt().withMessage('Supplier ID must be an integer'),
  body('adjustment_amount').isFloat().withMessage('Adjustment amount must be a number'),
  body('adjustment_date').isISO8601().withMessage('Adjustment date must be a valid date'),
  body('adjustment_type').isIn(['CREDIT_NOTE', 'DEBIT_NOTE']).withMessage('Adjustment type must be CREDIT_NOTE or DEBIT_NOTE'),
  body('reference_number').optional().trim(),
  body('description').isLength({ min: 1 }).withMessage('Description is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { supplier_id, adjustment_amount, adjustment_date, adjustment_type, reference_number, description } = req.body;

    // Get current balance for the supplier
    const lastEntry = await SupplierLedger.findOne({
      where: { supplier_id },
      order: [['transaction_date', 'DESC'], ['ledger_id', 'DESC']]
    });

    const currentBalance = lastEntry ? parseFloat(lastEntry.balance) : 0;
    let newBalance;

    if (adjustment_type === 'CREDIT_NOTE') {
      // Credit note reduces what we owe
      newBalance = currentBalance - Math.abs(adjustment_amount);
    } else {
      // Debit note increases what we owe
      newBalance = currentBalance + Math.abs(adjustment_amount);
    }

    // Create adjustment entry
    const adjustmentEntry = await SupplierLedger.create({
      supplier_id,
      transaction_type: adjustment_type,
      transaction_date: adjustment_date,
      reference_number: reference_number || `${adjustment_type}-${Date.now()}`,
      description,
      debit_amount: adjustment_type === 'DEBIT_NOTE' ? Math.abs(adjustment_amount) : 0,
      credit_amount: adjustment_type === 'CREDIT_NOTE' ? Math.abs(adjustment_amount) : 0,
      balance: newBalance,
      payment_status: 'PENDING',
      created_by_user_id: req.user.user_id
    });

    res.status(201).json({
      message: 'Adjustment recorded successfully',
      adjustmentEntry
    });
  } catch (error) {
    console.error('Record adjustment error:', error);
    res.status(500).json({ message: 'Failed to record adjustment' });
  }
});

// Get overdue payments
router.get('/overdue', authenticateToken, async (req, res) => {
  try {
    const overdueEntries = await SupplierLedger.findAll({
      where: {
        payment_status: 'PENDING',
        due_date: { [Op.lt]: new Date() }
      },
      include: [
        { model: Supplier, as: 'supplier', attributes: ['supplier_name', 'contact_person', 'phone', 'email'] },
        { model: PurchaseOrder, as: 'purchaseOrder', attributes: ['po_number', 'po_date'], required: false },
        { model: User, as: 'createdBy', attributes: ['name', 'email'] }
      ],
      order: [['due_date', 'ASC']]
    });

    res.json({ overdueEntries });
  } catch (error) {
    console.error('Get overdue payments error:', error);
    res.status(500).json({ message: 'Failed to fetch overdue payments' });
  }
});

// Get payment reports
router.get('/reports/payments', authenticateToken, [
  query('date_from').optional().isISO8601().withMessage('Date from must be a valid date'),
  query('date_to').optional().isISO8601().withMessage('Date to must be a valid date'),
  query('supplier_id').optional().isInt().withMessage('Supplier ID must be an integer')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { date_from, date_to, supplier_id } = req.query;

    const whereClause = { transaction_type: 'PAYMENT' };
    if (supplier_id) whereClause.supplier_id = supplier_id;
    if (date_from || date_to) {
      whereClause.transaction_date = {};
      if (date_from) whereClause.transaction_date[Op.gte] = date_from;
      if (date_to) whereClause.transaction_date[Op.lte] = date_to;
    }

    const paymentReport = await SupplierLedger.findAll({
      where: whereClause,
      include: [
        { model: Supplier, as: 'supplier', attributes: ['supplier_name', 'contact_person'] },
        { model: PurchaseOrder, as: 'purchaseOrder', attributes: ['po_number'], required: false },
        { model: User, as: 'createdBy', attributes: ['name'] }
      ],
      order: [['transaction_date', 'DESC']]
    });

    const totalPayments = paymentReport.reduce((sum, entry) => sum + parseFloat(entry.credit_amount), 0);

    res.json({
      paymentReport,
      summary: {
        totalPayments,
        totalEntries: paymentReport.length,
        dateRange: { from: date_from, to: date_to }
      }
    });
  } catch (error) {
    console.error('Get payment reports error:', error);
    res.status(500).json({ message: 'Failed to fetch payment reports' });
  }
});

module.exports = router;
