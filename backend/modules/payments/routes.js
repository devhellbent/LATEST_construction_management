const express = require('express');
const { body, validationResult, query } = require('express-validator');
const { Op, sequelize } = require('sequelize');
const { Payment, PaymentType, PaymentCategory, Project, User } = require('../../models');
const { authenticateToken, authorizeRoles } = require('../../middleware/auth');

const router = express.Router();

// Get all payments with filtering
router.get('/', authenticateToken, [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('project_id').optional().custom((value) => {
    if (value === '' || value === undefined) return true;
    return !isNaN(parseInt(value));
  }).withMessage('Project ID must be an integer'),
  query('payment_type_id').optional().custom((value) => {
    if (value === '' || value === undefined) return true;
    return !isNaN(parseInt(value));
  }).withMessage('Payment type ID must be an integer'),
  query('category_id').optional().custom((value) => {
    if (value === '' || value === undefined) return true;
    return !isNaN(parseInt(value));
  }).withMessage('Category ID must be an integer'),
  query('paid_to').optional().trim(),
  query('paid_by').optional().trim(),
  query('status').optional().isIn(['PENDING', 'APPROVED', 'REJECTED', 'COMPLETED', 'CANCELLED']),
  query('approval_status').optional().isIn(['PENDING', 'APPROVED', 'REJECTED']),
  query('start_date').optional().isISO8601().withMessage('Invalid start date'),
  query('end_date').optional().isISO8601().withMessage('Invalid end date'),
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
    const { 
      project_id, 
      payment_type_id, 
      category_id, 
      paid_to, 
      paid_by, 
      status, 
      approval_status,
      start_date, 
      end_date,
      search 
    } = req.query;

    const whereClause = { is_deleted: false };
    
    if (project_id) whereClause.project_id = project_id;
    if (payment_type_id) whereClause.payment_type_id = payment_type_id;
    if (category_id) whereClause.category_id = category_id;
    if (status) whereClause.status = status;
    if (approval_status) whereClause.approval_status = approval_status;
    
    if (start_date || end_date) {
      whereClause.payment_date = {};
      if (start_date) whereClause.payment_date[Op.gte] = start_date;
      if (end_date) whereClause.payment_date[Op.lte] = end_date;
    }

    if (search) {
      whereClause[Op.or] = [
        { payment_reference_id: { [Op.like]: `%${search}%` } },
        { paid_to_name: { [Op.like]: `%${search}%` } },
        { description: { [Op.like]: `%${search}%` } }
      ];
    }

    const { count, rows: payments } = await Payment.findAndCountAll({
      where: whereClause,
      include: [
        { 
          model: Project, 
          as: 'project', 
          attributes: ['project_id', 'name'] 
        },
        { 
          model: PaymentType, 
          as: 'paymentType', 
          attributes: ['payment_type_id', 'type_name'] 
        },
        { 
          model: PaymentCategory, 
          as: 'category', 
          attributes: ['category_id', 'category_name'] 
        },
        { 
          model: User, 
          as: 'paidToUser', 
          attributes: ['user_id', 'name', 'email'],
          required: false
        },
        { 
          model: User, 
          as: 'paidByUser', 
          attributes: ['user_id', 'name', 'email'] 
        },
        { 
          model: User, 
          as: 'approvedByUser', 
          attributes: ['user_id', 'name'],
          required: false
        }
      ],
      limit,
      offset,
      order: [['created_at', 'DESC']]
    });

    res.json({
      payments,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(count / limit),
        totalItems: count,
        itemsPerPage: limit
      }
    });
  } catch (error) {
    console.error('Get payments error:', error);
    res.status(500).json({ message: 'Failed to fetch payments' });
  }
});

// Get payment by ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const payment = await Payment.findByPk(req.params.id, {
      include: [
        { 
          model: Project, 
          as: 'project', 
          attributes: ['project_id', 'name'] 
        },
        { 
          model: PaymentType, 
          as: 'paymentType', 
          attributes: ['payment_type_id', 'type_name'] 
        },
        { 
          model: PaymentCategory, 
          as: 'category', 
          attributes: ['category_id', 'category_name'] 
        },
        { 
          model: User, 
          as: 'paidToUser', 
          attributes: ['user_id', 'name', 'email'],
          required: false
        },
        { 
          model: User, 
          as: 'paidByUser', 
          attributes: ['user_id', 'name', 'email'] 
        },
        { 
          model: User, 
          as: 'approvedByUser', 
          attributes: ['user_id', 'name'],
          required: false
        }
      ]
    });

    if (!payment) {
      return res.status(404).json({ message: 'Payment not found' });
    }

    res.json({ payment });
  } catch (error) {
    console.error('Get payment error:', error);
    res.status(500).json({ message: 'Failed to fetch payment' });
  }
});

// Create payment
router.post('/', authenticateToken, [
  body('project_id').isInt().withMessage('Project ID is required'),
  body('payment_type_id').isInt().withMessage('Payment type ID is required'),
  body('category_id').isInt().withMessage('Category ID is required'),
  body('paid_to_type').isIn(['TEAM_MEMBER', 'VENDOR', 'LABOUR', 'SUBCONTRACTOR', 'OTHER']).withMessage('Invalid paid to type'),
  body('paid_to_user_id').optional().custom((value) => {
    if (value === undefined || value === null || value === '') return true;
    return !isNaN(parseInt(value));
  }).withMessage('Paid to user ID must be an integer'),
  body('paid_to_name').optional().custom((value) => {
    if (value === undefined || value === null || value === '') return true;
    return value.trim().length >= 1;
  }).withMessage('Paid to name must be at least 1 character if provided'),
  body('paid_by_user_id').isInt().withMessage('Paid by user ID is required'),
  body('amount').isFloat({ min: 0 }).withMessage('Amount must be a positive number'),
  body('payment_date').isISO8601().withMessage('Invalid payment date'),
  body('description').optional().trim(),
  body('notes').optional().trim()
], async (req, res) => {
  try {
    console.log('=== PAYMENT CREATION DEBUG ===');
    console.log('Request body:', JSON.stringify(req.body, null, 2));
    console.log('User:', req.user);
    
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('Validation errors:', errors.array());
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      project_id,
      payment_type_id,
      category_id,
      paid_to_type,
      paid_to_user_id,
      paid_to_name,
      paid_to_contact,
      paid_by_user_id,
      amount,
      payment_date,
      description,
      notes
    } = req.body;

    // Validate project exists
    const project = await Project.findByPk(project_id);
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    // Validate payment type exists
    const paymentType = await PaymentType.findByPk(payment_type_id);
    if (!paymentType) {
      return res.status(404).json({ message: 'Payment type not found' });
    }

    // Validate category exists
    const category = await PaymentCategory.findByPk(category_id);
    if (!category) {
      return res.status(404).json({ message: 'Payment category not found' });
    }

    // Validate paid by user exists
    const paidByUser = await User.findByPk(paid_by_user_id);
    if (!paidByUser) {
      return res.status(404).json({ message: 'Paid by user not found' });
    }

    // Validate paid to user if it's a team member
    if (paid_to_type === 'TEAM_MEMBER' && paid_to_user_id) {
      const paidToUser = await User.findByPk(paid_to_user_id);
      if (!paidToUser) {
        return res.status(404).json({ message: 'Paid to user not found' });
      }
    }

    // Generate payment reference ID
    const lastPayment = await Payment.findOne({
      where: { payment_reference_id: { [Op.like]: 'PP%' } },
      order: [['payment_id', 'DESC']]
    });

    let nextId = 1;
    if (lastPayment) {
      const lastId = parseInt(lastPayment.payment_reference_id.substring(2));
      nextId = lastId + 1;
    }

    const payment_reference_id = `PP${nextId.toString().padStart(6, '0')}`;

    const payment = await Payment.create({
      payment_reference_id,
      project_id,
      payment_type_id,
      category_id,
      paid_to_type,
      paid_to_user_id,
      paid_to_name,
      paid_to_contact,
      paid_by_user_id,
      paid_by_type: 'COMPANY',
      amount,
      currency: 'INR',
      status: 'PENDING',
      approval_status: 'PENDING',
      payment_date,
      description,
      notes
    });

    // Fetch the created payment with all associations
    const createdPayment = await Payment.findByPk(payment.payment_id, {
      include: [
        { 
          model: Project, 
          as: 'project', 
          attributes: ['project_id', 'name'] 
        },
        { 
          model: PaymentType, 
          as: 'paymentType', 
          attributes: ['payment_type_id', 'type_name'] 
        },
        { 
          model: PaymentCategory, 
          as: 'category', 
          attributes: ['category_id', 'category_name'] 
        },
        { 
          model: User, 
          as: 'paidToUser', 
          attributes: ['user_id', 'name', 'email'],
          required: false
        },
        { 
          model: User, 
          as: 'paidByUser', 
          attributes: ['user_id', 'name', 'email'] 
        }
      ]
    });

    res.status(201).json({
      message: 'Payment created successfully',
      payment: createdPayment
    });
  } catch (error) {
    console.error('Create payment error:', error);
    res.status(500).json({ message: 'Failed to create payment' });
  }
});

// Update payment
router.put('/:id', authenticateToken, [
  body('payment_type_id').optional().isInt().withMessage('Payment type ID must be an integer'),
  body('category_id').optional().isInt().withMessage('Category ID must be an integer'),
  body('paid_to_type').optional().isIn(['TEAM_MEMBER', 'VENDOR', 'LABOUR', 'SUBCONTRACTOR', 'OTHER']).withMessage('Invalid paid to type'),
  body('paid_to_user_id').optional().isInt().withMessage('Paid to user ID must be an integer'),
  body('paid_to_name').optional().trim(),
  body('paid_to_contact').optional().trim(),
  body('amount').optional().isFloat({ min: 0 }).withMessage('Amount must be a positive number'),
  body('payment_date').optional().isISO8601().withMessage('Invalid payment date'),
  body('description').optional().trim(),
  body('notes').optional().trim()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const payment = await Payment.findByPk(req.params.id);
    if (!payment) {
      return res.status(404).json({ message: 'Payment not found' });
    }

    await payment.update(req.body);

    // Fetch updated payment with associations
    const updatedPayment = await Payment.findByPk(payment.payment_id, {
      include: [
        { 
          model: Project, 
          as: 'project', 
          attributes: ['project_id', 'name'] 
        },
        { 
          model: PaymentType, 
          as: 'paymentType', 
          attributes: ['payment_type_id', 'type_name'] 
        },
        { 
          model: PaymentCategory, 
          as: 'category', 
          attributes: ['category_id', 'category_name'] 
        },
        { 
          model: User, 
          as: 'paidToUser', 
          attributes: ['user_id', 'name', 'email'],
          required: false
        },
        { 
          model: User, 
          as: 'paidByUser', 
          attributes: ['user_id', 'name', 'email'] 
        }
      ]
    });

    res.json({
      message: 'Payment updated successfully',
      payment: updatedPayment
    });
  } catch (error) {
    console.error('Update payment error:', error);
    res.status(500).json({ message: 'Failed to update payment' });
  }
});

// Approve payment
router.patch('/:id/approve', authenticateToken, authorizeRoles('Admin', 'Project Manager'), async (req, res) => {
  try {
    const payment = await Payment.findByPk(req.params.id);
    if (!payment) {
      return res.status(404).json({ message: 'Payment not found' });
    }

    await payment.update({ 
      approved_by_user_id: req.user.user_id,
      approved_at: new Date(),
      approval_status: 'APPROVED',
      status: 'APPROVED'
    });

    res.json({
      message: 'Payment approved successfully',
      payment
    });
  } catch (error) {
    console.error('Approve payment error:', error);
    res.status(500).json({ message: 'Failed to approve payment' });
  }
});

// Reject payment
router.patch('/:id/reject', authenticateToken, authorizeRoles('Admin', 'Project Manager'), async (req, res) => {
  try {
    const payment = await Payment.findByPk(req.params.id);
    if (!payment) {
      return res.status(404).json({ message: 'Payment not found' });
    }

    await payment.update({ 
      approved_by_user_id: req.user.user_id,
      approved_at: new Date(),
      approval_status: 'REJECTED',
      status: 'REJECTED'
    });

    res.json({
      message: 'Payment rejected successfully',
      payment
    });
  } catch (error) {
    console.error('Reject payment error:', error);
    res.status(500).json({ message: 'Failed to reject payment' });
  }
});

// Soft delete payment
router.delete('/:id', authenticateToken, authorizeRoles('Admin', 'Project Manager'), async (req, res) => {
  try {
    const payment = await Payment.findByPk(req.params.id);
    if (!payment) {
      return res.status(404).json({ message: 'Payment not found' });
    }

    await payment.update({ 
      is_deleted: true,
      deleted_at: new Date(),
      deleted_by_user_id: req.user.user_id
    });

    res.json({ message: 'Payment deleted successfully' });
  } catch (error) {
    console.error('Delete payment error:', error);
    res.status(500).json({ message: 'Failed to delete payment' });
  }
});

// Get payment statistics by category
router.get('/stats/by-category', authenticateToken, async (req, res) => {
  try {
    const { project_id } = req.query;
    
    const whereClause = { is_deleted: false };
    if (project_id) whereClause.project_id = project_id;

    const stats = await Payment.findAll({
      where: whereClause,
      include: [
        { 
          model: PaymentCategory, 
          as: 'category', 
          attributes: ['category_id', 'category_name'] 
        },
        { 
          model: Project, 
          as: 'project', 
          attributes: ['project_id', 'name'] 
        }
      ],
      attributes: [
        'category_id',
        [sequelize.fn('COUNT', sequelize.col('Payment.payment_id')), 'total_payments'],
        [sequelize.fn('SUM', sequelize.col('Payment.amount')), 'total_amount'],
        [sequelize.fn('AVG', sequelize.col('Payment.amount')), 'average_amount'],
        [sequelize.fn('MIN', sequelize.col('Payment.amount')), 'min_amount'],
        [sequelize.fn('MAX', sequelize.col('Payment.amount')), 'max_amount']
      ],
      group: ['category_id', 'PaymentCategory.category_id', 'PaymentCategory.category_name', 'Project.project_id', 'Project.name'],
      raw: false
    });

    res.json({ stats });
  } catch (error) {
    console.error('Get payment stats error:', error);
    res.status(500).json({ message: 'Failed to fetch payment statistics' });
  }
});

// Get payment types
router.get('/types/all', authenticateToken, async (req, res) => {
  try {
    const paymentTypes = await PaymentType.findAll({
      where: { is_active: true },
      order: [['type_name', 'ASC']]
    });

    res.json({ paymentTypes });
  } catch (error) {
    console.error('Get payment types error:', error);
    res.status(500).json({ message: 'Failed to fetch payment types' });
  }
});

// Get payment categories
router.get('/categories/all', authenticateToken, async (req, res) => {
  try {
    const categories = await PaymentCategory.findAll({
      where: { is_active: true },
      order: [['category_name', 'ASC']]
    });

    res.json({ categories });
  } catch (error) {
    console.error('Get payment categories error:', error);
    res.status(500).json({ message: 'Failed to fetch payment categories' });
  }
});

module.exports = router;
