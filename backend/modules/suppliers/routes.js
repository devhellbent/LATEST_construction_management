const express = require('express');
const { body, validationResult, query } = require('express-validator');
const { Op } = require('sequelize');
const { Supplier, ItemSupplier, ItemMaster } = require('../../models');
const { authenticateToken, authorizeRoles } = require('../../middleware/auth');

const router = express.Router();

// Get all suppliers
router.get('/', authenticateToken, [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 0, max: 10000 }).withMessage('Limit must be between 0 and 10000 (0 means all)'),
  query('search').optional().trim()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const page = parseInt(req.query.page) || 1;
    const limitParam = parseInt(req.query.limit);
    // If limit is 0 or not provided, default to 20 for pagination, but if explicitly 0, fetch all
    const limit = limitParam === 0 ? null : (limitParam || 20);
    const offset = limit ? (page - 1) * limit : 0;
    const { search } = req.query;

    // Build where clause
    const whereClause = {};
    if (search) {
      whereClause[Op.or] = [
        { supplier_name: { [Op.like]: `%${search}%` } },
        { contact_person: { [Op.like]: `%${search}%` } },
        { email: { [Op.like]: `%${search}%` } }
      ];
    }

    const queryOptions = {
      where: whereClause,
      order: [['created_at', 'DESC']]
    };

    // Only apply limit and offset if limit is not null (i.e., not fetching all)
    if (limit !== null) {
      queryOptions.limit = limit;
      queryOptions.offset = offset;
    }

    const { count, rows: suppliers } = await Supplier.findAndCountAll(queryOptions);

    res.json({
      suppliers,
      pagination: {
        currentPage: page,
        totalPages: limit ? Math.ceil(count / limit) : 1,
        totalItems: count,
        itemsPerPage: limit || count
      }
    });
  } catch (error) {
    console.error('Get suppliers error:', error);
    res.status(500).json({ message: 'Failed to fetch suppliers' });
  }
});

// Get supplier by ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const supplier = await Supplier.findByPk(req.params.id);
    if (!supplier) {
      return res.status(404).json({ message: 'Supplier not found' });
    }

    res.json({ supplier });
  } catch (error) {
    console.error('Get supplier error:', error);
    res.status(500).json({ message: 'Failed to fetch supplier' });
  }
});

// Create new supplier
router.post('/', authenticateToken, authorizeRoles('Admin', 'Project Manager'), [
  body('supplier_name').trim().isLength({ min: 2 }).withMessage('Supplier name must be at least 2 characters'),
  body('contact_person').optional().trim(),
  body('email').optional({ checkFalsy: true }).trim().isEmail().withMessage('Invalid email format'),
  body('phone').optional().trim(),
  body('address').optional().trim(),
  body('city').optional().trim(),
  body('state').optional().trim(),
  body('pincode').optional().trim(),
  body('gst_number').optional().trim(),
  body('pan_number').optional().trim(),
  body('bank_details').optional().trim(),
  body('payment_terms').optional().trim(),
  body('is_active').optional().isBoolean()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const supplierData = req.body;
    
    // Convert empty email string to null
    if (supplierData.email === '') {
      supplierData.email = null;
    }
    
    const supplier = await Supplier.create(supplierData);

    res.status(201).json({ 
      message: 'Supplier created successfully',
      supplier 
    });
  } catch (error) {
    console.error('Create supplier error:', error);
    res.status(500).json({ message: 'Failed to create supplier' });
  }
});

// Update supplier
router.put('/:id', authenticateToken, authorizeRoles('Admin', 'Project Manager'), [
  body('supplier_name').optional().trim().isLength({ min: 2 }).withMessage('Supplier name must be at least 2 characters'),
  body('contact_person').optional().trim(),
  body('email').optional({ checkFalsy: true }).trim().isEmail().withMessage('Invalid email format'),
  body('phone').optional().trim(),
  body('address').optional().trim(),
  body('city').optional().trim(),
  body('state').optional().trim(),
  body('pincode').optional().trim(),
  body('gst_number').optional().trim(),
  body('pan_number').optional().trim(),
  body('bank_details').optional().trim(),
  body('payment_terms').optional().trim(),
  body('is_active').optional().isBoolean()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const supplier = await Supplier.findByPk(req.params.id);
    if (!supplier) {
      return res.status(404).json({ message: 'Supplier not found' });
    }

    const updateData = { ...req.body };
    // Convert empty email string to null
    if (updateData.email === '') {
      updateData.email = null;
    }

    await supplier.update(updateData);

    res.json({ 
      message: 'Supplier updated successfully',
      supplier 
    });
  } catch (error) {
    console.error('Update supplier error:', error);
    res.status(500).json({ message: 'Failed to update supplier' });
  }
});

// Delete supplier
router.delete('/:id', authenticateToken, authorizeRoles('Admin'), async (req, res) => {
  try {
    const supplier = await Supplier.findByPk(req.params.id);
    if (!supplier) {
      return res.status(404).json({ message: 'Supplier not found' });
    }

    await supplier.destroy();

    res.json({ message: 'Supplier deleted successfully' });
  } catch (error) {
    console.error('Delete supplier error:', error);
    res.status(500).json({ message: 'Failed to delete supplier' });
  }
});

// Get supplier items
router.get('/:id/items', authenticateToken, async (req, res) => {
  try {
    const supplier = await Supplier.findByPk(req.params.id);
    if (!supplier) {
      return res.status(404).json({ message: 'Supplier not found' });
    }

    const items = await ItemSupplier.findAll({
      where: { supplier_id: req.params.id },
      include: [
        { model: ItemMaster, as: 'item', attributes: ['item_id', 'item_name', 'item_code', 'description'] }
      ]
    });

    res.json({ items });
  } catch (error) {
    console.error('Get supplier items error:', error);
    res.status(500).json({ message: 'Failed to fetch supplier items' });
  }
});

module.exports = router;
