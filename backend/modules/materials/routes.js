const express = require('express');
const { body, validationResult, query } = require('express-validator');
const { Op } = require('sequelize');
const { Material, Project, ItemCategory, Brand, Unit, Supplier, ItemMaster, ItemSupplier } = require('../../models');
const { db } = require('../../config/database');
const { authenticateToken, authorizeRoles } = require('../../middleware/auth');

const router = express.Router();

// Get all materials (with pagination and filtering)
router.get('/', authenticateToken, [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('type').optional().trim(),
  query('category').optional().trim(),
  query('brand').optional().trim(),
  query('color').optional().trim(),
  query('size').optional().trim(),
  query('status').optional().trim(),
  query('search').optional().trim(),
  query('project_id').optional().isInt().withMessage('Project ID must be an integer')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;
    const { type, category, brand, color, size, status, search, project_id } = req.query;

    // Build where clause
    const whereClause = {};
    if (type) whereClause.type = type;
    if (category) whereClause.category = category;
    if (brand) whereClause.brand = brand;
    if (color) whereClause.color = color;
    if (size) whereClause.size = size;
    if (status) whereClause.status = status;
    if (project_id) whereClause.project_id = project_id;
    
    if (search) {
      whereClause[Op.or] = [
        { name: { [Op.like]: `%${search}%` } },
        { item_code: { [Op.like]: `%${search}%` } },
        { additional_specification: { [Op.like]: `%${search}%` } },
        { supplier: { [Op.like]: `%${search}%` } },
        { brand: { [Op.like]: `%${search}%` } },
        { size: { [Op.like]: `%${search}%` } }
      ];
    }

    const { count, rows: materials } = await Material.findAndCountAll({
      where: whereClause,
      limit,
      offset,
      order: [['created_at', 'DESC']]
    });

    res.json({
      materials,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(count / limit),
        totalItems: count,
        itemsPerPage: limit
      }
    });
  } catch (error) {
    console.error('Get materials error:', error);
    res.status(500).json({ message: 'Failed to fetch materials' });
  }
});

// Get materials by project ID
router.get('/project/:projectId', authenticateToken, async (req, res) => {
  try {
    const { projectId } = req.params;
    
    // Get materials allocated to this project
    const materials = await Material.findAll({
      where: { project_id: projectId },
      order: [['created_at', 'DESC']]
    });

    res.json({ materials });
  } catch (error) {
    console.error('Get materials by project error:', error);
    console.error('Error details:', error.message);
    res.status(500).json({ message: 'Failed to fetch materials for project', error: error.message });
  }
});

// Get materials by warehouse ID
router.get('/warehouse/:warehouseId', authenticateToken, async (req, res) => {
  try {
    const { warehouseId } = req.params;
    
    // Get materials in this warehouse
    const materials = await Material.findAll({
      where: { warehouse_id: warehouseId },
      include: [
        {
          model: require('../../models').Warehouse,
          as: 'warehouse',
          attributes: ['warehouse_id', 'warehouse_name', 'address']
        }
      ],
      order: [['created_at', 'DESC']]
    });

    res.json({ materials });
  } catch (error) {
    console.error('Get materials by warehouse error:', error);
    console.error('Error details:', error.message);
    res.status(500).json({ message: 'Failed to fetch materials for warehouse', error: error.message });
  }
});

// Get master table data for form dropdowns
router.get('/master-data', authenticateToken, async (req, res) => {
  try {
    const [categories, brands, units, suppliers, itemMaster] = await Promise.all([
      ItemCategory.findAll({
        attributes: ['category_id', 'category_name'],
        where: { is_active: true },
        order: [['category_name', 'ASC']]
      }),
      Brand.findAll({
        attributes: ['brand_id', 'brand_name'],
        where: { is_active: true },
        order: [['brand_name', 'ASC']]
      }),
      Unit.findAll({
        attributes: ['unit_id', 'unit_name', 'unit_symbol'],
        where: { is_active: true },
        order: [['unit_name', 'ASC']]
      }),
      Supplier.findAll({
        attributes: ['supplier_id', 'supplier_name'],
        where: { is_active: true },
        order: [['supplier_name', 'ASC']]
      }),
      ItemMaster.findAll({
        attributes: ['item_id', 'item_code', 'item_name', 'category_id', 'brand_id', 'unit_id'],
        where: { is_active: true },
        order: [['item_name', 'ASC']]
      })
    ]);

    res.json({
      categories,
      brands,
      units,
      suppliers,
      itemMaster
    });
  } catch (error) {
    console.error('Get master data error:', error);
    res.status(500).json({ message: 'Failed to fetch master data' });
  }
});

// Get item details by item_id for autocomplete
router.get('/item-details/:itemId', authenticateToken, async (req, res) => {
  try {
    const item = await ItemMaster.findOne({
      where: { 
        item_id: req.params.itemId,
        is_active: true 
      },
      include: [
        { 
          model: ItemCategory, 
          as: 'category', 
          attributes: ['category_name'] 
        },
        { 
          model: Brand, 
          as: 'brand', 
          attributes: ['brand_name'] 
        },
        { 
          model: Unit, 
          as: 'unit', 
          attributes: ['unit_name', 'unit_symbol'] 
        }
      ],
      attributes: [
        'item_id', 
        'item_code', 
        'item_name', 
        'description', 
        'specifications', 
        'technical_details'
      ]
    });

    if (!item) {
      return res.status(404).json({ message: 'Item not found' });
    }

    res.json({ item });
  } catch (error) {
    console.error('Get item details error:', error);
    res.status(500).json({ message: 'Failed to fetch item details' });
  }
});

// Search items for autocomplete
router.get('/search-items', authenticateToken, async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || q.length < 2) {
      return res.json({ items: [] });
    }

    const items = await ItemMaster.findAll({
      where: {
        [Op.and]: [
          { is_active: true },
          {
            [Op.or]: [
              { item_name: { [Op.like]: `%${q}%` } },
              { item_code: { [Op.like]: `%${q}%` } }
            ]
          }
        ]
      },
      include: [
        { 
          model: ItemCategory, 
          as: 'category', 
          attributes: ['category_name'] 
        },
        { 
          model: Brand, 
          as: 'brand', 
          attributes: ['brand_name'] 
        },
        { 
          model: Unit, 
          as: 'unit', 
          attributes: ['unit_name'] 
        }
      ],
      attributes: ['item_id', 'item_code', 'item_name'],
      order: [['item_name', 'ASC']],
      limit: 20
    });

    res.json({ items });
  } catch (error) {
    console.error('Search items error:', error);
    res.status(500).json({ message: 'Failed to search items' });
  }
});

// Get item suppliers for a specific item
router.get('/item-suppliers/:itemId', authenticateToken, async (req, res) => {
  try {
    const suppliers = await ItemSupplier.findAll({
      where: { 
        item_id: req.params.itemId,
        is_active: true 
      },
      include: [
        { 
          model: Supplier, 
          as: 'supplier', 
          attributes: ['supplier_id', 'supplier_name', 'contact_person', 'phone', 'email'] 
        }
      ],
      attributes: [
        'item_supplier_id',
        'supplier_item_code',
        'supplier_item_name',
        'cost_per_unit',
        'minimum_order_quantity',
        'lead_time_days',
        'is_preferred'
      ],
      order: [['is_preferred', 'DESC'], ['cost_per_unit', 'ASC']]
    });

    res.json({ suppliers });
  } catch (error) {
    console.error('Get item suppliers error:', error);
    res.status(500).json({ message: 'Failed to fetch item suppliers' });
  }
});

// Get material by ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const material = await Material.findByPk(req.params.id);

    if (!material) {
      return res.status(404).json({ message: 'Material not found' });
    }

    res.json({ material });
  } catch (error) {
    console.error('Get material error:', error);
    res.status(500).json({ message: 'Failed to fetch material' });
  }
});

// Create material
router.post('/', authenticateToken, authorizeRoles('Admin', 'Project Manager', 'Project On-site Team', 'Inventory Manager'), [
  body('name').trim().isLength({ min: 2 }).withMessage('Name must be at least 2 characters'),
  body('item_id').optional().isInt().withMessage('Item ID must be an integer'),
  body('item_code').optional().trim().custom((value) => {
    if (value === '') {
      return true; // Allow empty strings, they will be converted to null
    }
    return true;
  }),
  body('additional_specification').optional().trim(),
  body('category').optional().trim(),
  body('brand').optional().trim(),
  body('color').optional().trim(),
  body('size').optional().trim(),
  body('type').optional().trim(),
  body('unit').optional().trim(),
  body('cost_per_unit').optional().isFloat({ min: 0 }).withMessage('Cost per unit must be a positive number'),
  body('supplier').optional().trim(),
  body('stock_qty').optional().isInt({ min: 0 }).withMessage('Stock quantity must be a non-negative integer'),
  body('minimum_stock_level').optional().isInt({ min: 0 }).withMessage('Minimum stock level must be a non-negative integer'),
  body('maximum_stock_level').optional().isInt({ min: 0 }).withMessage('Maximum stock level must be a non-negative integer'),
  body('reorder_point').optional().isInt({ min: 0 }).withMessage('Reorder point must be a non-negative integer'),
  body('location').optional().trim(),
  body('warehouse_id').optional().isInt().withMessage('Warehouse ID must be an integer'),
  body('status').optional().isIn(['ACTIVE', 'INACTIVE', 'DISCONTINUED']).withMessage('Status must be ACTIVE, INACTIVE, or DISCONTINUED'),
  body('project_id').optional().custom((value) => {
    if (value === null || value === undefined || value === '') {
      return true; // Allow null, undefined, or empty string
    }
    if (!Number.isInteger(Number(value))) {
      throw new Error('Project ID must be an integer');
    }
    return true;
  })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    // Convert empty strings to null for optional fields
    const cleanedData = { ...req.body };
    Object.keys(cleanedData).forEach(key => {
      if (cleanedData[key] === '') {
        cleanedData[key] = null;
      }
    });

    // Handle item_code uniqueness - if it's null, remove the unique constraint issue
    if (cleanedData.item_code === null) {
      delete cleanedData.item_code;
    }

    // Check for duplicate material in the same warehouse
    if (cleanedData.warehouse_id && cleanedData.name) {
      const existingMaterial = await Material.findOne({
        where: {
          warehouse_id: cleanedData.warehouse_id,
          name: cleanedData.name,
          status: ['ACTIVE', 'INACTIVE'] // Check both active and inactive materials
        }
      });

      if (existingMaterial) {
        return res.status(400).json({ 
          message: `A material with the name "${cleanedData.name}" already exists in this warehouse. Please choose a different name or select a different warehouse.`,
          field: 'name'
        });
      }
    }

    const material = await Material.create(cleanedData);

    res.status(201).json({
      message: 'Material created successfully',
      material
    });
  } catch (error) {
    console.error('Create material error:', error);
    console.error('Error details:', error.message);
    console.error('Error stack:', error.stack);
    
    // Handle specific database errors
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(400).json({ 
        message: 'A material with this item code already exists',
        field: 'item_code'
      });
    }
    
    if (error.name === 'SequelizeValidationError') {
      return res.status(400).json({ 
        message: 'Validation error',
        errors: error.errors.map(err => ({
          field: err.path,
          message: err.message
        }))
      });
    }
    
    res.status(500).json({ 
      message: 'Failed to create material',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Update material
router.put('/:id', authenticateToken, authorizeRoles('Admin', 'Project Manager', 'Project On-site Team', 'Inventory Manager'), [
  body('name').optional().trim().isLength({ min: 2 }).withMessage('Name must be at least 2 characters'),
  body('size').optional().trim(),
  body('type').optional().trim(),
  body('unit').optional().trim(),
  body('cost_per_unit').optional().isFloat({ min: 0 }).withMessage('Cost per unit must be a positive number'),
  body('supplier').optional().trim(),
  body('stock_qty').optional().isInt({ min: 0 }).withMessage('Stock quantity must be a non-negative integer'),
  body('warehouse_id').optional().isInt().withMessage('Warehouse ID must be an integer')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const material = await Material.findByPk(req.params.id);
    if (!material) {
      return res.status(404).json({ message: 'Material not found' });
    }

    await material.update(req.body);

    res.json({
      message: 'Material updated successfully',
      material
    });
  } catch (error) {
    console.error('Update material error:', error);
    res.status(500).json({ message: 'Failed to update material' });
  }
});

// Delete material
router.delete('/:id', authenticateToken, authorizeRoles('Admin', 'Project Manager'), async (req, res) => {
  try {
    const material = await Material.findByPk(req.params.id);
    if (!material) {
      return res.status(404).json({ message: 'Material not found' });
    }

    // Note: Material allocation checks removed as per requirements

    await material.destroy();

    res.json({ message: 'Material deleted successfully' });
  } catch (error) {
    console.error('Delete material error:', error);
    res.status(500).json({ message: 'Failed to delete material' });
  }
});

// Get material allocations - DISABLED
// router.get('/:id/allocations', async (req, res) => {
//   // Material allocation functionality removed as per requirements
// });

// Allocate material to project - DISABLED
// router.post('/:id/allocate', authenticateToken, authorizeRoles('Admin', 'Project Manager', 'Project On-site Team'), [
//   // Material allocation functionality removed as per requirements
// });

// Update stock quantity
router.patch('/:id/stock', authenticateToken, authorizeRoles('Admin', 'Project Manager', 'Project On-site Team', 'Inventory Manager'), [
  body('quantity').isInt({ min: 0 }).withMessage('Quantity must be a non-negative integer'),
  body('operation').isIn(['add', 'set']).withMessage('Operation must be either "add" or "set"')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const material = await Material.findByPk(req.params.id);
    if (!material) {
      return res.status(404).json({ message: 'Material not found' });
    }

    let newQuantity;
    if (req.body.operation === 'add') {
      newQuantity = material.stock_qty + req.body.quantity;
    } else {
      newQuantity = req.body.quantity;
    }

    await material.update({ stock_qty: newQuantity });

    res.json({
      message: 'Stock quantity updated successfully',
      material
    });
  } catch (error) {
    console.error('Update stock error:', error);
    res.status(500).json({ message: 'Failed to update stock quantity' });
  }
});

// Get filter options for inventory
router.get('/filters/options', authenticateToken, async (req, res) => {
  try {
    const [categories, brands, colors, types] = await Promise.all([
      Material.findAll({
        attributes: ['category'],
        where: { category: { [Op.ne]: null } },
        group: ['category'],
        raw: true
      }),
      Material.findAll({
        attributes: ['brand'],
        where: { brand: { [Op.ne]: null } },
        group: ['brand'],
        raw: true
      }),
      Material.findAll({
        attributes: ['color'],
        where: { color: { [Op.ne]: null } },
        group: ['color'],
        raw: true
      }),
      Material.findAll({
        attributes: ['type'],
        where: { type: { [Op.ne]: null } },
        group: ['type'],
        raw: true
      })
    ]);

    res.json({
      categories: categories.map(item => item.category).filter(Boolean),
      brands: brands.map(item => item.brand).filter(Boolean),
      colors: colors.map(item => item.color).filter(Boolean),
      types: types.map(item => item.type).filter(Boolean)
    });
  } catch (error) {
    console.error('Get filter options error:', error);
    res.status(500).json({ message: 'Failed to fetch filter options' });
  }
});

module.exports = router;
