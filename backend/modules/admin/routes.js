const express = require('express');
const { body, validationResult, query } = require('express-validator');
const { Op } = require('sequelize');
const { 
  Supplier, ItemMaster, ItemCategory, Brand, Unit, User, Role, 
  ItemSupplier, SupplierLedger, Warehouse
} = require('../../models');
const { authenticateToken, authorizeRoles } = require('../../middleware/auth');

const router = express.Router();

// ==================== SUPPLIER MANAGEMENT ====================

// Get all suppliers with pagination and search
router.get('/suppliers', authenticateToken, authorizeRoles('Admin'), [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
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
    const { search } = req.query;

    // Build where clause
    const whereClause = {};
    if (search) {
      whereClause[Op.or] = [
        { supplier_name: { [Op.like]: `%${search}%` } },
        { contact_person: { [Op.like]: `%${search}%` } },
        { email: { [Op.like]: `%${search}%` } },
        { phone: { [Op.like]: `%${search}%` } }
      ];
    }

    const { count, rows: suppliers } = await Supplier.findAndCountAll({
      where: whereClause,
      limit,
      offset,
      order: [['created_at', 'DESC']]
    });

    res.json({
      suppliers,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(count / limit),
        totalItems: count,
        itemsPerPage: limit
      }
    });
  } catch (error) {
    console.error('Get suppliers error:', error);
    res.status(500).json({ message: 'Failed to fetch suppliers' });
  }
});

// Get supplier by ID with balance
router.get('/suppliers/:id', authenticateToken, authorizeRoles('Admin'), async (req, res) => {
  try {
    const supplier = await Supplier.findByPk(req.params.id);
    if (!supplier) {
      return res.status(404).json({ message: 'Supplier not found' });
    }

    // Get current balance from supplier ledger
    const latestLedgerEntry = await SupplierLedger.findOne({
      where: { supplier_id: req.params.id },
      order: [['created_at', 'DESC']]
    });

    const currentBalance = latestLedgerEntry ? latestLedgerEntry.balance : 0;

    res.json({ 
      supplier: {
        ...supplier.toJSON(),
        currentBalance
      }
    });
  } catch (error) {
    console.error('Get supplier error:', error);
    res.status(500).json({ message: 'Failed to fetch supplier' });
  }
});

// Create new supplier with initial balance
router.post('/suppliers', authenticateToken, authorizeRoles('Admin'), [
  body('supplier_name').trim().isLength({ min: 2 }).withMessage('Supplier name must be at least 2 characters'),
  body('contact_person').optional().trim(),
  body('email').optional().isEmail().withMessage('Invalid email format'),
  body('phone').optional().trim(),
  body('address').optional().trim(),
  body('city').optional().trim(),
  body('state').optional().trim(),
  body('country').optional().trim(),
  body('pincode').optional().trim(),
  body('gst_number').optional().trim(),
  body('pan_number').optional().trim(),
  body('payment_terms').optional().trim(),
  body('credit_limit').optional().isFloat({ min: 0 }).withMessage('Credit limit must be a positive number'),
  body('initial_balance').optional().isFloat().withMessage('Initial balance must be a number'),
  body('is_active').optional().isBoolean()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { initial_balance = 0, ...supplierData } = req.body;

    // Create supplier
    const supplier = await Supplier.create(supplierData);

    // Create initial ledger entry if balance is provided
    if (initial_balance !== 0) {
      await SupplierLedger.create({
        supplier_id: supplier.supplier_id,
        transaction_type: initial_balance > 0 ? 'CREDIT_NOTE' : 'DEBIT_NOTE',
        transaction_date: new Date(),
        reference_number: `INIT-${supplier.supplier_id}`,
        description: 'Initial balance entry',
        debit_amount: initial_balance > 0 ? 0 : Math.abs(initial_balance),
        credit_amount: initial_balance > 0 ? initial_balance : 0,
        balance: initial_balance,
        payment_status: 'PENDING',
        created_by_user_id: req.user.user_id
      });
    }

    res.status(201).json({ 
      message: 'Supplier created successfully',
      supplier: {
        ...supplier.toJSON(),
        currentBalance: initial_balance
      }
    });
  } catch (error) {
    console.error('Create supplier error:', error);
    res.status(500).json({ message: 'Failed to create supplier' });
  }
});

// Update supplier
router.put('/suppliers/:id', authenticateToken, authorizeRoles('Admin'), [
  body('supplier_name').optional().trim().isLength({ min: 2 }).withMessage('Supplier name must be at least 2 characters'),
  body('contact_person').optional().trim(),
  body('email').optional().isEmail().withMessage('Invalid email format'),
  body('phone').optional().trim(),
  body('address').optional().trim(),
  body('city').optional().trim(),
  body('state').optional().trim(),
  body('country').optional().trim(),
  body('pincode').optional().trim(),
  body('gst_number').optional().trim(),
  body('pan_number').optional().trim(),
  body('payment_terms').optional().trim(),
  body('credit_limit').optional().isFloat({ min: 0 }).withMessage('Credit limit must be a positive number'),
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

    await supplier.update(req.body);

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
router.delete('/suppliers/:id', authenticateToken, authorizeRoles('Admin'), async (req, res) => {
  try {
    const supplier = await Supplier.findByPk(req.params.id);
    if (!supplier) {
      return res.status(404).json({ message: 'Supplier not found' });
    }

    // Check if supplier has any related records
    const hasRelatedRecords = await SupplierLedger.findOne({
      where: { supplier_id: req.params.id }
    });

    if (hasRelatedRecords) {
      return res.status(400).json({ 
        message: 'Cannot delete supplier with existing transactions. Please deactivate instead.' 
      });
    }

    await supplier.destroy();

    res.json({ message: 'Supplier deleted successfully' });
  } catch (error) {
    console.error('Delete supplier error:', error);
    res.status(500).json({ message: 'Failed to delete supplier' });
  }
});

// ==================== USER MANAGEMENT ====================

// Get all users with pagination and search
router.get('/users', authenticateToken, authorizeRoles('Admin'), [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('search').optional().trim(),
  query('role_id').optional().isInt().withMessage('Role ID must be an integer')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;
    const { search, role_id } = req.query;

    // Build where clause
    const whereClause = {};
    if (search) {
      whereClause[Op.or] = [
        { name: { [Op.like]: `%${search}%` } },
        { email: { [Op.like]: `%${search}%` } },
        { phone: { [Op.like]: `%${search}%` } }
      ];
    }
    if (role_id) {
      whereClause.role_id = role_id;
    }

    const { count, rows: users } = await User.findAndCountAll({
      where: whereClause,
      limit,
      offset,
      order: [['created_at', 'DESC']],
      include: [
        {
          model: Role,
          as: 'role',
          attributes: ['role_id', 'name', 'description']
        }
      ],
      attributes: { exclude: ['password_hash'] }
    });

    res.json({
      users,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(count / limit),
        totalItems: count,
        itemsPerPage: limit
      }
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ message: 'Failed to fetch users' });
  }
});

// Get user by ID
router.get('/users/:id', authenticateToken, authorizeRoles('Admin'), async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id, {
      include: [
        {
          model: Role,
          as: 'role',
          attributes: ['role_id', 'name', 'description']
        }
      ],
      attributes: { exclude: ['password_hash'] }
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({ user });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ message: 'Failed to fetch user' });
  }
});

// Create new user
router.post('/users', authenticateToken, authorizeRoles('Admin'), [
  body('name').trim().isLength({ min: 2 }).withMessage('Name must be at least 2 characters'),
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('role_id').isInt().withMessage('Role ID must be an integer'),
  body('phone').optional().trim(),
  body('contact_info').optional().trim(),
  body('is_active').optional().isBoolean()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, email, password, role_id, phone, contact_info, is_active = true } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists with this email' });
    }

    // Verify role exists
    const role = await Role.findByPk(role_id);
    if (!role) {
      return res.status(400).json({ message: 'Invalid role ID' });
    }

    // Create user
    const user = await User.create({
      name,
      email,
      password_hash: password, // Note: In production, hash this password
      role_id,
      phone,
      contact_info,
      is_active,
      invitation_status: 'ACCEPTED'
    });

    res.status(201).json({
      message: 'User created successfully',
      user: {
        ...user.toJSON(),
        role
      }
    });
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({ message: 'Failed to create user' });
  }
});

// Update user
router.put('/users/:id', authenticateToken, authorizeRoles('Admin'), [
  body('name').optional().trim().isLength({ min: 2 }).withMessage('Name must be at least 2 characters'),
  body('email').optional().isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('role_id').optional().isInt().withMessage('Role ID must be an integer'),
  body('phone').optional().trim(),
  body('contact_info').optional().trim(),
  body('is_active').optional().isBoolean()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const user = await User.findByPk(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Prevent self-modification of critical fields
    if (user.user_id === req.user.user_id && req.body.role_id) {
      return res.status(400).json({ message: 'Cannot change your own role' });
    }

    // Check if email is being changed and already exists
    if (req.body.email && req.body.email !== user.email) {
      const existingUser = await User.findOne({ where: { email: req.body.email } });
      if (existingUser) {
        return res.status(400).json({ message: 'Email already exists' });
      }
    }

    // Verify role exists if provided
    if (req.body.role_id) {
      const role = await Role.findByPk(req.body.role_id);
      if (!role) {
        return res.status(400).json({ message: 'Invalid role ID' });
      }
    }

    await user.update(req.body);

    // Fetch updated user with role
    const updatedUser = await User.findByPk(req.params.id, {
      include: [
        {
          model: Role,
          as: 'role',
          attributes: ['role_id', 'name', 'description']
        }
      ],
      attributes: { exclude: ['password_hash'] }
    });

    res.json({
      message: 'User updated successfully',
      user: updatedUser
    });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ message: 'Failed to update user' });
  }
});

// Delete user
router.delete('/users/:id', authenticateToken, authorizeRoles('Admin'), async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Prevent self-deletion
    if (user.user_id === req.user.user_id) {
      return res.status(400).json({ message: 'Cannot delete your own account' });
    }

    await user.destroy();

    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ message: 'Failed to delete user' });
  }
});

// ==================== ITEM MASTER MANAGEMENT ====================

// Get all items with pagination and search
router.get('/items', authenticateToken, authorizeRoles('Admin'), [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('search').optional().trim(),
  query('category_id').optional().isInt().withMessage('Category ID must be an integer'),
  query('brand_id').optional().isInt().withMessage('Brand ID must be an integer')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;
    const { search, category_id, brand_id } = req.query;

    // Build where clause
    const whereClause = {};
    if (search) {
      whereClause[Op.or] = [
        { item_name: { [Op.like]: `%${search}%` } },
        { item_code: { [Op.like]: `%${search}%` } },
        { description: { [Op.like]: `%${search}%` } }
      ];
    }
    if (category_id) {
      whereClause.category_id = category_id;
    }
    if (brand_id) {
      whereClause.brand_id = brand_id;
    }

    const { count, rows: items } = await ItemMaster.findAndCountAll({
      where: whereClause,
      limit,
      offset,
      order: [['created_at', 'DESC']],
      include: [
        {
          model: ItemCategory,
          as: 'category',
          attributes: ['category_id', 'category_name']
        },
        {
          model: Brand,
          as: 'brand',
          attributes: ['brand_id', 'brand_name']
        },
        {
          model: Unit,
          as: 'unit',
          attributes: ['unit_id', 'unit_name', 'unit_symbol']
        }
      ]
    });

    res.json({
      items,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(count / limit),
        totalItems: count,
        itemsPerPage: limit
      }
    });
  } catch (error) {
    console.error('Get items error:', error);
    res.status(500).json({ message: 'Failed to fetch items' });
  }
});

// Get item by ID
router.get('/items/:id', authenticateToken, authorizeRoles('Admin'), async (req, res) => {
  try {
    const item = await ItemMaster.findByPk(req.params.id, {
      include: [
        {
          model: ItemCategory,
          as: 'category',
          attributes: ['category_id', 'category_name']
        },
        {
          model: Brand,
          as: 'brand',
          attributes: ['brand_id', 'brand_name']
        },
        {
          model: Unit,
          as: 'unit',
          attributes: ['unit_id', 'unit_name', 'unit_symbol']
        }
      ]
    });

    if (!item) {
      return res.status(404).json({ message: 'Item not found' });
    }

    res.json({ item });
  } catch (error) {
    console.error('Get item error:', error);
    res.status(500).json({ message: 'Failed to fetch item' });
  }
});

// Create new item (item_code auto-generated in DB)
router.post('/items', authenticateToken, authorizeRoles('Admin'), [
  body('item_name').trim().isLength({ min: 2 }).withMessage('Item name must be at least 2 characters'),
  body('description').optional().trim(),
  body('category_id').isInt().withMessage('Category ID must be an integer'),
  body('brand_id').optional().isInt().withMessage('Brand ID must be an integer'),
  body('unit_id').isInt().withMessage('Unit ID must be an integer'),
  body('technical_details').optional().trim(),
  body('safety_requirements').optional().trim(),
  body('environmental_impact').optional().trim(),
  body('is_active').optional().isBoolean()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { item_name, description, category_id, brand_id, unit_id, technical_details, safety_requirements, environmental_impact, is_active = true } = req.body;

    // Verify category exists
    const category = await ItemCategory.findByPk(category_id);
    if (!category) {
      return res.status(400).json({ message: 'Invalid category ID' });
    }

    // Verify brand exists if provided
    if (brand_id) {
      const brand = await Brand.findByPk(brand_id);
      if (!brand) {
        return res.status(400).json({ message: 'Invalid brand ID' });
      }
    }

    // Verify unit exists
    const unit = await Unit.findByPk(unit_id);
    if (!unit) {
      return res.status(400).json({ message: 'Invalid unit ID' });
    }

    // Create item (item_code auto-generated by model hook)
    const item = await ItemMaster.create({
      item_name,
      description,
      category_id,
      brand_id,
      unit_id,
      technical_details,
      safety_requirements,
      environmental_impact,
      is_active
    });

    res.status(201).json({
      message: 'Item created successfully',
      item
    });
  } catch (error) {
    console.error('Create item error:', error);
    res.status(500).json({ message: 'Failed to create item' });
  }
});

// Update item
router.put('/items/:id', authenticateToken, authorizeRoles('Admin'), [
  body('item_code').optional().trim().isLength({ min: 1 }).withMessage('Item code cannot be empty'),
  body('item_name').optional().trim().isLength({ min: 2 }).withMessage('Item name must be at least 2 characters'),
  body('description').optional().trim(),
  body('category_id').optional().isInt().withMessage('Category ID must be an integer'),
  body('brand_id').optional().isInt().withMessage('Brand ID must be an integer'),
  body('unit_id').optional().isInt().withMessage('Unit ID must be an integer'),
  body('specifications').optional().isObject().withMessage('Specifications must be a valid JSON object'),
  body('technical_details').optional().trim(),
  body('safety_requirements').optional().trim(),
  body('environmental_impact').optional().trim(),
  body('is_active').optional().isBoolean()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const item = await ItemMaster.findByPk(req.params.id);
    if (!item) {
      return res.status(404).json({ message: 'Item not found' });
    }

    // Check if item code is being changed and already exists
    if (req.body.item_code && req.body.item_code !== item.item_code) {
      const existingItem = await ItemMaster.findOne({ where: { item_code: req.body.item_code } });
      if (existingItem) {
        return res.status(400).json({ message: 'Item code already exists' });
      }
    }

    // Verify category exists if provided
    if (req.body.category_id) {
      const category = await ItemCategory.findByPk(req.body.category_id);
      if (!category) {
        return res.status(400).json({ message: 'Invalid category ID' });
      }
    }

    // Verify brand exists if provided
    if (req.body.brand_id) {
      const brand = await Brand.findByPk(req.body.brand_id);
      if (!brand) {
        return res.status(400).json({ message: 'Invalid brand ID' });
      }
    }

    // Verify unit exists if provided
    if (req.body.unit_id) {
      const unit = await Unit.findByPk(req.body.unit_id);
      if (!unit) {
        return res.status(400).json({ message: 'Invalid unit ID' });
      }
    }

    await item.update(req.body);

    res.json({
      message: 'Item updated successfully',
      item
    });
  } catch (error) {
    console.error('Update item error:', error);
    res.status(500).json({ message: 'Failed to update item' });
  }
});

// Delete item
router.delete('/items/:id', authenticateToken, authorizeRoles('Admin'), async (req, res) => {
  try {
    const item = await ItemMaster.findByPk(req.params.id);
    if (!item) {
      return res.status(404).json({ message: 'Item not found' });
    }

    // Check if item has any related records
    const hasRelatedRecords = await ItemSupplier.findOne({
      where: { item_id: req.params.id }
    });

    if (hasRelatedRecords) {
      return res.status(400).json({ 
        message: 'Cannot delete item with existing supplier relationships. Please deactivate instead.' 
      });
    }

    await item.destroy();

    res.json({ message: 'Item deleted successfully' });
  } catch (error) {
    console.error('Delete item error:', error);
    res.status(500).json({ message: 'Failed to delete item' });
  }
});

// ==================== MASTER DATA MANAGEMENT ====================

// Get all categories
router.get('/categories', authenticateToken, authorizeRoles('Admin'), async (req, res) => {
  try {
    const categories = await ItemCategory.findAll({
      order: [['category_name', 'ASC']]
    });

    res.json({ categories });
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({ message: 'Failed to fetch categories' });
  }
});

// Get all brands
router.get('/brands', authenticateToken, authorizeRoles('Admin'), async (req, res) => {
  try {
    const brands = await Brand.findAll({
      order: [['brand_name', 'ASC']]
    });

    res.json({ brands });
  } catch (error) {
    console.error('Get brands error:', error);
    res.status(500).json({ message: 'Failed to fetch brands' });
  }
});

// Get all units
router.get('/units', authenticateToken, authorizeRoles('Admin'), async (req, res) => {
  try {
    const units = await Unit.findAll({
      order: [['unit_name', 'ASC']]
    });

    res.json({ units });
  } catch (error) {
    console.error('Get units error:', error);
    res.status(500).json({ message: 'Failed to fetch units' });
  }
});

// Get all roles
router.get('/roles', authenticateToken, authorizeRoles('Admin'), async (req, res) => {
  try {
    const roles = await Role.findAll({
      order: [['name', 'ASC']]
    });

    res.json({ roles });
  } catch (error) {
    console.error('Get roles error:', error);
    res.status(500).json({ message: 'Failed to fetch roles' });
  }
});

// Get all warehouses
router.get('/warehouses', authenticateToken, authorizeRoles('Admin'), async (req, res) => {
  try {
    const warehouses = await Warehouse.findAll({
      order: [['warehouse_name', 'ASC']]
    });

    res.json({ warehouses });
  } catch (error) {
    console.error('Get warehouses error:', error);
    res.status(500).json({ message: 'Failed to fetch warehouses' });
  }
});

module.exports = router;
