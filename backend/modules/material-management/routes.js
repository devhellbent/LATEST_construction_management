const express = require('express');
const { body, validationResult, query } = require('express-validator');
const { Op } = require('sequelize');
const { sequelize } = require('../../config/database');
const { 
  Material, Project, ItemCategory, Brand, Unit, Supplier, ItemMaster, ItemSupplier,
  MaterialIssue, MaterialReturn, MaterialConsumption, InventoryHistory,
  MaterialRequirementRequest, MrrItem, PurchaseOrder, PurchaseOrderItem, 
  MaterialReceipt, MaterialReceiptItem, SupplierLedger, User, Warehouse, Subcontractor
} = require('../../models');
const { authenticateToken, authorizeRoles } = require('../../middleware/auth');
const InventoryService = require('../../services/inventoryService');
const socketService = require('../../services/socketService');

const router = express.Router();

// Test endpoint (remove in production)
router.get('/test', (req, res) => {
  res.json({ message: 'Material management routes are working!' });
});

// ==================== INVENTORY MANAGEMENT ====================

// Get all materials with comprehensive filtering
router.get('/inventory', authenticateToken, [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('project_id').optional().isInt(),
  query('warehouse_id').optional().isInt(),
  query('category').optional().trim(),
  query('brand').optional().trim(),
  query('status').optional().isIn(['ACTIVE', 'INACTIVE', 'DISCONTINUED']),
  query('search').optional().trim(),
  query('low_stock').optional().isBoolean()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;
    const { project_id, warehouse_id, category, brand, status, search, low_stock } = req.query;

    const whereClause = {};
    if (project_id) whereClause.project_id = project_id;
    if (warehouse_id) whereClause.warehouse_id = warehouse_id;
    if (category) whereClause.category = category;
    if (brand) whereClause.brand = brand;
    if (status) whereClause.status = status;
    
    if (search) {
      whereClause[Op.or] = [
        { name: { [Op.like]: `%${search}%` } },
        { item_code: { [Op.like]: `%${search}%` } },
        { additional_specification: { [Op.like]: `%${search}%` } }
      ];
    }

    if (low_stock === 'true') {
      whereClause[Op.and] = [
        { stock_qty: { [Op.lte]: sequelize.col('minimum_stock_level') } },
        { minimum_stock_level: { [Op.gt]: 0 } }
      ];
    }

    const { count, rows: materials } = await Material.findAndCountAll({
      where: whereClause,
      include: [
        { 
          model: ItemMaster, 
          as: 'item', 
          attributes: ['item_id', 'item_code', 'item_name', 'description'],
          include: [
            { model: ItemCategory, as: 'category', attributes: ['category_name'] },
            { model: Brand, as: 'brand', attributes: ['brand_name'] },
            { model: Unit, as: 'unit', attributes: ['unit_name', 'unit_symbol'] }
          ]
        },
        { model: Project, as: 'project', attributes: ['project_id', 'name'] },
        { model: Warehouse, as: 'warehouse', attributes: ['warehouse_id', 'warehouse_name', 'address'] }
      ],
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
    console.error('Get inventory error:', error);
    res.status(500).json({ message: 'Failed to fetch inventory' });
  }
});

// Get material by ID with full details
router.get('/inventory/:id', authenticateToken, async (req, res) => {
  try {
    const material = await Material.findByPk(req.params.id, {
      include: [
        { 
          model: ItemMaster, 
          as: 'item', 
          attributes: ['item_id', 'item_code', 'item_name', 'description', 'specifications'],
          include: [
            { model: ItemCategory, as: 'category', attributes: ['category_name'] },
            { model: Brand, as: 'brand', attributes: ['brand_name'] },
            { model: Unit, as: 'unit', attributes: ['unit_name', 'unit_symbol'] }
          ]
        },
        { model: Project, as: 'project', attributes: ['project_id', 'name'] }
      ]
    });

    if (!material) {
      return res.status(404).json({ message: 'Material not found' });
    }

    res.json({ material });
  } catch (error) {
    console.error('Get material error:', error);
    res.status(500).json({ message: 'Failed to fetch material' });
  }
});

// Create new material
router.post('/inventory', authenticateToken, authorizeRoles('Admin', 'Project Manager', 'Project On-site Team', 'Inventory Manager'), [
  body('name').trim().isLength({ min: 2 }).withMessage('Name must be at least 2 characters'),
  body('item_id').optional().isInt(),
  body('item_code').optional().trim(),
  body('additional_specification').optional().trim(),
  body('category').optional().trim(),
  body('brand').optional().trim(),
  body('color').optional().trim(),
  body('size').optional().trim(),
  body('type').optional().trim(),
  body('unit').optional().trim(),
  body('cost_per_unit').optional().isFloat({ min: 0 }),
  body('supplier').optional().trim(),
  body('stock_qty').optional().isInt({ min: 0 }),
  body('minimum_stock_level').optional().isInt({ min: 0 }),
  body('maximum_stock_level').optional().isInt({ min: 0 }),
  body('reorder_point').optional().isInt({ min: 0 }),
  body('location').optional().trim(),
  body('status').optional().isIn(['ACTIVE', 'INACTIVE', 'DISCONTINUED']),
  body('project_id').optional().custom((value) => {
    if (value === null || value === undefined || value === '') return true;
    return !isNaN(parseInt(value)) && Number.isInteger(parseFloat(value));
  }),
  body('warehouse_id').optional().custom((value) => {
    if (value === null || value === undefined || value === '') return true;
    return !isNaN(parseInt(value)) && Number.isInteger(parseFloat(value));
  })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.error('Validation errors:', errors.array());
      console.error('Request body:', req.body);
      return res.status(400).json({ errors: errors.array() });
    }

    const cleanedData = { ...req.body };
    Object.keys(cleanedData).forEach(key => {
      if (cleanedData[key] === '') {
        cleanedData[key] = null;
      }
    });

    const material = await Material.create(cleanedData);

    // Record inventory transaction
    await InventoryService.recordTransaction({
      material_id: material.material_id,
      project_id: material.project_id,
      transaction_type: 'PURCHASE',
      transaction_id: material.material_id,
      quantity_change: material.stock_qty || 0,
      reference_number: `INITIAL-${material.material_id}`,
      description: 'Initial material creation',
      location: material.location || 'Store',
      performed_by_user_id: req.user.user_id
    });

    res.status(201).json({
      message: 'Material created successfully',
      material
    });
  } catch (error) {
    console.error('Create material error:', error);
    res.status(500).json({ message: 'Failed to create material' });
  }
});

// Update material
router.put('/inventory/:id', authenticateToken, authorizeRoles('Admin', 'Project Manager', 'Project On-site Team', 'Inventory Manager'), [
  body('name').optional().trim().isLength({ min: 2 }),
  body('additional_specification').optional().trim(),
  body('category').optional().trim(),
  body('brand').optional().trim(),
  body('color').optional().trim(),
  body('size').optional().trim(),
  body('type').optional().trim(),
  body('unit').optional().trim(),
  body('cost_per_unit').optional().isFloat({ min: 0 }),
  body('supplier').optional().trim(),
  body('stock_qty').optional().isInt({ min: 0 }),
  body('minimum_stock_level').optional().isInt({ min: 0 }),
  body('maximum_stock_level').optional().isInt({ min: 0 }),
  body('reorder_point').optional().isInt({ min: 0 }),
  body('location').optional().trim(),
  body('status').optional().isIn(['ACTIVE', 'INACTIVE', 'DISCONTINUED']),
  body('project_id').optional().custom((value) => {
    if (value === null || value === undefined || value === '') return true;
    return !isNaN(parseInt(value)) && Number.isInteger(parseFloat(value));
  }),
  body('warehouse_id').optional().custom((value) => {
    if (value === null || value === undefined || value === '') return true;
    return !isNaN(parseInt(value)) && Number.isInteger(parseFloat(value));
  })
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

    const oldStockQty = material.stock_qty;
    await material.update(req.body);
    const newStockQty = material.stock_qty;

    // Record inventory transaction if stock changed
    if (oldStockQty !== newStockQty) {
      await InventoryService.recordTransaction({
        material_id: material.material_id,
        project_id: material.project_id,
        transaction_type: 'ADJUSTMENT',
        transaction_id: material.material_id,
        quantity_change: newStockQty - oldStockQty,
        reference_number: `ADJUSTMENT-${material.material_id}`,
        description: 'Stock quantity adjustment',
        location: material.location || 'Store',
        performed_by_user_id: req.user.user_id
      });
    }

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
router.delete('/inventory/:id', authenticateToken, authorizeRoles('Admin', 'Project Manager', 'Inventory Manager'), async (req, res) => {
  try {
    const material = await Material.findByPk(req.params.id);
    if (!material) {
      return res.status(404).json({ message: 'Material not found' });
    }

    // Check if material has any transactions
    const hasTransactions = await InventoryHistory.findOne({
      where: { material_id: material.material_id }
    });

    if (hasTransactions) {
      return res.status(400).json({ 
        message: 'Cannot delete material with transaction history. Please deactivate instead.' 
      });
    }

    await material.destroy();
    res.json({ message: 'Material deleted successfully' });
  } catch (error) {
    console.error('Delete material error:', error);
    res.status(500).json({ message: 'Failed to delete material' });
  }
});

// ==================== MATERIAL ISSUE MANAGEMENT ====================

// Get material issues
router.get('/issues', authenticateToken, async (req, res) => {
  try {
    const { project_id, status, material_id, date_from, date_to } = req.query;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;

    const whereClause = {};
    if (project_id) whereClause.project_id = project_id;
    if (status) whereClause.status = status;
    if (material_id) whereClause.material_id = material_id;
    
    if (date_from || date_to) {
      whereClause.issue_date = {};
      if (date_from) whereClause.issue_date[Op.gte] = date_from;
      if (date_to) whereClause.issue_date[Op.lte] = date_to;
    }

    const { count, rows: issues } = await MaterialIssue.findAndCountAll({
      where: whereClause,
      include: [
        { 
          model: Material, 
          as: 'material', 
          attributes: ['material_id', 'name', 'type', 'unit'],
          include: [
            { model: Warehouse, as: 'warehouse', attributes: ['warehouse_id', 'warehouse_name', 'address'] }
          ]
        },
        { model: Project, as: 'project', attributes: ['project_id', 'name'] },
        { model: User, as: 'issued_by', foreignKey: 'issued_by_user_id', attributes: ['user_id', 'name'] },
        { model: User, as: 'received_by', foreignKey: 'received_by_user_id', attributes: ['user_id', 'name'] },
        { model: MaterialRequirementRequest, as: 'mrr', attributes: ['mrr_id', 'mrr_number'] },
        { model: Subcontractor, as: 'subcontractor', attributes: ['subcontractor_id', 'company_name', 'work_type'] },
        { model: Warehouse, as: 'warehouse', attributes: ['warehouse_id', 'warehouse_name', 'address'] }
      ],
      limit,
      offset,
      order: [['issue_date', 'DESC']]
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
    console.error('Get material issues error:', error);
    res.status(500).json({ message: 'Failed to fetch material issues' });
  }
});

// Create material issue (unified for MRR and direct issues)
router.post('/issues', authenticateToken, authorizeRoles('Admin', 'Project Manager', 'Project On-site Team', 'Inventory Manager'), [
  body('project_id').isInt().withMessage('Project ID is required'),
  body('material_id').isInt().withMessage('Material ID is required'),
  body('quantity_issued').isInt({ min: 1 }).withMessage('Quantity must be a positive integer'),
  body('issue_date').isDate().withMessage('Invalid issue date'),
  body('location').trim().isLength({ min: 1 }).withMessage('Location is required'),
  body('issued_by_user_id').isInt().withMessage('Issued by user ID is required'),
  body('received_by_user_id').isInt().withMessage('Received by user ID is required'),
  body('is_for_mrr').optional().isBoolean(),
  body('mrr_id').optional().isInt(),
  body('warehouse_id').optional().isInt().withMessage('Warehouse ID must be an integer'),
  body('issue_purpose').optional().trim()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { 
      project_id, material_id, quantity_issued, issue_date, location, 
      issued_by_user_id, received_by_user_id, is_for_mrr, mrr_id, issue_purpose,
      component_id, subcontractor_id, warehouse_id
    } = req.body;

    // Validate MRR requirement
    if (is_for_mrr && !mrr_id) {
      return res.status(400).json({ message: 'MRR ID is required when issuing for MRR' });
    }

    // If issuing for MRR, verify MRR is approved
    if (is_for_mrr && mrr_id) {
      const MaterialRequirementRequest = require('../../models/MaterialRequirementRequest');
      const mrr = await MaterialRequirementRequest.findByPk(mrr_id);
      if (!mrr) {
        return res.status(404).json({ message: 'MRR not found' });
      }
      if (mrr.status !== 'APPROVED') {
        return res.status(400).json({ 
          message: `Cannot issue materials for MRR ${mrr.mrr_number}. MRR status is ${mrr.status}. Only approved MRRs can have materials issued.` 
        });
      }
    }

    // Verify project exists
    const project = await Project.findByPk(project_id);
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    // Verify material exists and check stock
    let material;
    if (warehouse_id) {
      // Check stock in specific warehouse
      material = await Material.findOne({
        where: { material_id, warehouse_id }
      });
      if (!material) {
        return res.status(404).json({ message: 'Material not found in specified warehouse' });
      }
    } else {
      // Check overall stock
      material = await Material.findByPk(material_id);
      if (!material) {
        return res.status(404).json({ message: 'Material not found' });
      }
    }
    
    if (material.stock_qty < quantity_issued) {
      const warehouseInfo = warehouse_id ? ' in specified warehouse' : '';
      return res.status(400).json({ 
        message: `Insufficient stock for ${material.name}${warehouseInfo}. Available: ${material.stock_qty}, Requested: ${quantity_issued}` 
      });
    }

    // Verify users exist
    const issuedByUser = await User.findByPk(issued_by_user_id);
    const receivedByUser = await User.findByPk(received_by_user_id);
    if (!issuedByUser || !receivedByUser) {
      return res.status(404).json({ message: 'One or both users not found' });
    }

    // Create material issue record
    const materialIssue = await MaterialIssue.create({
      project_id,
      material_id,
      quantity_issued,
      issue_date,
      issue_purpose: issue_purpose || '',
      location,
      issued_by_user_id,
      received_by_user_id,
      created_by: req.user.user_id,
      updated_by: req.user.user_id,
      status: 'PENDING',
      mrr_id: is_for_mrr ? mrr_id : null,
      component_id: component_id || null,
      subcontractor_id: subcontractor_id || null,
      warehouse_id: warehouse_id || null
    });

    // Record inventory transaction
    await InventoryService.recordTransaction({
      material_id,
      project_id,
      transaction_type: 'ISSUE',
      transaction_id: materialIssue.issue_id,
      quantity_change: -quantity_issued,
      reference_number: `ISSUE-${materialIssue.issue_id}`,
      description: `Material issued: ${issue_purpose || 'No description'}`,
      location,
      performed_by_user_id: req.user.user_id,
      warehouse_id
    });

    // Emit socket event
    socketService.emitToProject(project_id, 'materialIssue', {
      issueId: materialIssue.issue_id,
      materialId: material_id,
      quantity: quantity_issued,
      projectId: project_id
    });

    res.status(201).json({
      message: 'Material issue created successfully',
      materialIssue
    });
  } catch (error) {
    console.error('Create material issue error:', error);
    res.status(500).json({ message: 'Failed to create material issue' });
  }
});

// Update material issue
router.put('/issues/:id', authenticateToken, authorizeRoles('Admin', 'Project Manager', 'Project On-site Team', 'Inventory Manager'), [
  body('quantity_issued').optional().isInt({ min: 1 }),
  body('issue_date').optional().isDate(),
  body('location').optional().trim().isLength({ min: 1 }),
  body('issue_purpose').optional().trim(),
  body('status').optional().isIn(['PENDING', 'ISSUED', 'RECEIVED', 'CANCELLED'])
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const issue = await MaterialIssue.findByPk(req.params.id);
    if (!issue) {
      return res.status(404).json({ message: 'Material issue not found' });
    }

    const oldQuantity = issue.quantity_issued;
    await issue.update({
      ...req.body,
      updated_by: req.user.user_id
    });

    // Record inventory transaction if quantity changed
    if (req.body.quantity_issued && req.body.quantity_issued !== oldQuantity) {
      const quantityDifference = req.body.quantity_issued - oldQuantity;
      await InventoryService.recordTransaction({
        material_id: issue.material_id,
        project_id: issue.project_id,
        transaction_type: 'ISSUE',
        transaction_id: issue.issue_id,
        quantity_change: -quantityDifference,
        reference_number: `ISSUE-UPDATE-${issue.issue_id}`,
        description: 'Material issue quantity updated',
        location: issue.location,
        performed_by_user_id: req.user.user_id
      });
    }

    res.json({
      message: 'Material issue updated successfully',
      issue
    });
  } catch (error) {
    console.error('Update material issue error:', error);
    res.status(500).json({ message: 'Failed to update material issue' });
  }
});

// Delete material issue
router.delete('/issues/:id', authenticateToken, authorizeRoles('Admin', 'Project Manager', 'Inventory Manager'), async (req, res) => {
  try {
    const issue = await MaterialIssue.findByPk(req.params.id);
    if (!issue) {
      return res.status(404).json({ message: 'Material issue not found' });
    }

    // Record inventory transaction to restore stock
    await InventoryService.recordTransaction({
      material_id: issue.material_id,
      project_id: issue.project_id,
      transaction_type: 'ISSUE',
      transaction_id: issue.issue_id,
      quantity_change: issue.quantity_issued,
      reference_number: `ISSUE-DELETE-${issue.issue_id}`,
      description: 'Material issue deleted - stock restored',
      location: issue.location,
      performed_by_user_id: req.user.user_id
    });

    await issue.destroy();
    res.json({ message: 'Material issue deleted successfully' });
  } catch (error) {
    console.error('Delete material issue error:', error);
    res.status(500).json({ message: 'Failed to delete material issue' });
  }
});

// ==================== MATERIAL RETURN MANAGEMENT ====================

// Get material returns
router.get('/returns', authenticateToken, async (req, res) => {
  try {
    const { project_id, status, material_id, date_from, date_to } = req.query;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;

    const whereClause = {};
    if (project_id) whereClause.project_id = project_id;
    if (status) whereClause.status = status;
    if (material_id) whereClause.material_id = material_id;
    
    if (date_from || date_to) {
      whereClause.return_date = {};
      if (date_from) whereClause.return_date[Op.gte] = date_from;
      if (date_to) whereClause.return_date[Op.lte] = date_to;
    }

    const { count, rows: returns } = await MaterialReturn.findAndCountAll({
      where: whereClause,
      include: [
        { model: Material, as: 'material', attributes: ['material_id', 'name', 'type', 'unit'] },
        { model: Project, as: 'project', attributes: ['project_id', 'name'] },
        { model: User, as: 'returned_by_user', attributes: ['user_id', 'name'] },
        { model: User, as: 'approved_by', attributes: ['user_id', 'name'] },
        { model: MaterialIssue, as: 'material_issue', attributes: ['issue_id', 'issue_date', 'quantity_issued', 'issue_purpose', 'location'] },
        { model: Warehouse, as: 'warehouse', attributes: ['warehouse_id', 'warehouse_name', 'address'] }
      ],
      limit,
      offset,
      order: [['return_date', 'DESC']]
    });

    res.json({
      returns,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(count / limit),
        totalItems: count,
        itemsPerPage: limit
      }
    });
  } catch (error) {
    console.error('Get material returns error:', error);
    res.status(500).json({ message: 'Failed to fetch material returns' });
  }
});

// Create material return
router.post('/returns', authenticateToken, authorizeRoles('Admin', 'Project Manager', 'Project On-site Team', 'Inventory Manager'), [
  body('project_id').isInt().withMessage('Project ID is required'),
  body('material_id').isInt().withMessage('Material ID is required'),
  body('quantity').isInt({ min: 1 }).withMessage('Quantity must be a positive integer'),
  body('return_date').isDate().withMessage('Invalid return date'),
  body('return_reason').optional().trim(),
  body('returned_by').optional().trim().isLength({ min: 1 }).withMessage('Returned by information is required'),
  body('condition_status').isIn(['GOOD', 'DAMAGED', 'USED', 'EXPIRED']).withMessage('Invalid condition status'),
  body('returned_by_user_id').isInt().withMessage('Returned by user ID is required'),
  body('issue_id').optional().isInt().withMessage('Issue ID must be an integer'),
  body('warehouse_id').optional().isInt().withMessage('Warehouse ID must be an integer')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { project_id, material_id, quantity, return_date, return_reason, returned_by, condition_status, returned_by_user_id, issue_id, warehouse_id } = req.body;

    // Verify project exists
    const project = await Project.findByPk(project_id);
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    // Verify material exists
    const material = await Material.findByPk(material_id);
    if (!material) {
      return res.status(404).json({ message: 'Material not found' });
    }

    // Verify user exists
    const returnedByUser = await User.findByPk(returned_by_user_id);
    if (!returnedByUser) {
      return res.status(404).json({ message: 'Returned by user not found' });
    }

    // Create material return record
    const materialReturn = await MaterialReturn.create({
      project_id,
      material_id,
      quantity,
      return_date,
      return_reason: return_reason || '',
      returned_by: returned_by || '',
      condition_status,
      returned_by_user_id,
      issue_id: issue_id || null,
      warehouse_id: warehouse_id || null,
      status: 'PENDING'
    });

    // Get warehouse name for location if warehouse_id is provided
    let location = 'Store';
    if (warehouse_id) {
      const { Warehouse } = require('../../models');
      const warehouse = await Warehouse.findByPk(warehouse_id);
      location = warehouse ? warehouse.warehouse_name : 'Store';
    }

    // Record inventory transaction
    await InventoryService.recordTransaction({
      material_id,
      project_id,
      transaction_type: 'RETURN',
      transaction_id: materialReturn.return_id,
      quantity_change: quantity,
      reference_number: `RETURN-${materialReturn.return_id}`,
      description: `Material returned: ${return_reason || 'No description'}`,
      location: location,
      performed_by_user_id: req.user.user_id,
      warehouse_id: warehouse_id
    });

    // Emit socket event
    socketService.emitToProject(project_id, 'materialReturn', {
      returnId: materialReturn.return_id,
      materialId: material_id,
      quantity,
      projectId: project_id
    });

    res.status(201).json({
      message: 'Material return created successfully',
      materialReturn
    });
  } catch (error) {
    console.error('Create material return error:', error);
    res.status(500).json({ message: 'Failed to create material return' });
  }
});

// Update material return
router.put('/returns/:id', authenticateToken, authorizeRoles('Admin', 'Project Manager', 'Project On-site Team', 'Inventory Manager'), [
  body('quantity').optional().isInt({ min: 1 }),
  body('return_date').optional().isDate(),
  body('return_reason').optional().trim(),
  body('condition_status').optional().isIn(['GOOD', 'DAMAGED', 'USED', 'EXPIRED']),
  body('status').optional().isIn(['PENDING', 'APPROVED', 'REJECTED'])
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const materialReturn = await MaterialReturn.findByPk(req.params.id);
    if (!materialReturn) {
      return res.status(404).json({ message: 'Material return not found' });
    }

    const oldQuantity = materialReturn.quantity;
    await materialReturn.update(req.body);

    // Record inventory transaction if quantity changed
    if (req.body.quantity && req.body.quantity !== oldQuantity) {
      const quantityDifference = req.body.quantity - oldQuantity;
      await InventoryService.recordTransaction({
        material_id: materialReturn.material_id,
        project_id: materialReturn.project_id,
        transaction_type: 'RETURN',
        transaction_id: materialReturn.return_id,
        quantity_change: quantityDifference,
        reference_number: `RETURN-UPDATE-${materialReturn.return_id}`,
        description: 'Material return quantity updated',
        location: 'Store',
        performed_by_user_id: req.user.user_id,
        warehouse_id: materialReturn.warehouse_id
      });
    }

    res.json({
      message: 'Material return updated successfully',
      materialReturn
    });
  } catch (error) {
    console.error('Update material return error:', error);
    res.status(500).json({ message: 'Failed to update material return' });
  }
});

// Delete material return
router.delete('/returns/:id', authenticateToken, authorizeRoles('Admin', 'Project Manager', 'Inventory Manager'), async (req, res) => {
  try {
    const materialReturn = await MaterialReturn.findByPk(req.params.id);
    if (!materialReturn) {
      return res.status(404).json({ message: 'Material return not found' });
    }

    // Record inventory transaction to reverse the return
    await InventoryService.recordTransaction({
      material_id: materialReturn.material_id,
      project_id: materialReturn.project_id,
      transaction_type: 'RETURN',
      transaction_id: materialReturn.return_id,
      quantity_change: -materialReturn.quantity,
      reference_number: `RETURN-DELETE-${materialReturn.return_id}`,
      description: 'Material return deleted - stock adjusted',
      location: 'Store',
      performed_by_user_id: req.user.user_id
    });

    await materialReturn.destroy();
    res.json({ message: 'Material return deleted successfully' });
  } catch (error) {
    console.error('Delete material return error:', error);
    res.status(500).json({ message: 'Failed to delete material return' });
  }
});

// ==================== MATERIAL CONSUMPTION MANAGEMENT ====================

// Get material consumptions
router.get('/consumptions', authenticateToken, async (req, res) => {
  try {
    const { project_id, material_id, date_from, date_to } = req.query;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;

    const whereClause = {};
    if (project_id) whereClause.project_id = project_id;
    if (material_id) whereClause.material_id = material_id;
    
    if (date_from || date_to) {
      whereClause.consumption_date = {};
      if (date_from) whereClause.consumption_date[Op.gte] = date_from;
      if (date_to) whereClause.consumption_date[Op.lte] = date_to;
    }

    const { count, rows: consumptions } = await MaterialConsumption.findAndCountAll({
      where: whereClause,
      include: [
        { model: Material, as: 'material', attributes: ['material_id', 'name', 'type', 'unit', 'cost_per_unit'] },
        { model: Project, as: 'project', attributes: ['project_id', 'name'] },
        { model: User, as: 'recorded_by', foreignKey: 'recorded_by_user_id', attributes: ['user_id', 'name'] }
      ],
      limit,
      offset,
      order: [['consumption_date', 'DESC']]
    });

    res.json({
      consumptions,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(count / limit),
        totalItems: count,
        itemsPerPage: limit
      }
    });
  } catch (error) {
    console.error('Get material consumptions error:', error);
    res.status(500).json({ message: 'Failed to fetch material consumptions' });
  }
});

// Create material consumption
router.post('/consumptions', authenticateToken, authorizeRoles('Admin', 'Project Manager', 'Project On-site Team'), [
  body('project_id').isInt().withMessage('Project ID is required'),
  body('material_id').isInt().withMessage('Material ID is required'),
  body('quantity_consumed').isInt({ min: 1 }).withMessage('Quantity must be a positive integer'),
  body('consumption_date').isDate().withMessage('Invalid consumption date'),
  body('consumption_purpose').optional().trim(),
  body('location').optional().trim(),
  body('recorded_by_user_id').isInt().withMessage('Recorded by user ID is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { project_id, material_id, quantity_consumed, consumption_date, consumption_purpose, location, recorded_by_user_id } = req.body;

    // Verify project exists
    const project = await Project.findByPk(project_id);
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    // Verify material exists
    const material = await Material.findByPk(material_id);
    if (!material) {
      return res.status(404).json({ message: 'Material not found' });
    }

    // Verify user exists
    const recordedByUser = await User.findByPk(recorded_by_user_id);
    if (!recordedByUser) {
      return res.status(404).json({ message: 'Recorded by user not found' });
    }

    // Create material consumption record
    const materialConsumption = await MaterialConsumption.create({
      project_id,
      material_id,
      quantity_consumed,
      consumption_date,
      consumption_purpose: consumption_purpose || '',
      location: location || 'Project Site',
      recorded_by_user_id
    });

    // Record inventory transaction
    await InventoryService.recordTransaction({
      material_id,
      project_id,
      transaction_type: 'CONSUMPTION',
      transaction_id: materialConsumption.consumption_id,
      quantity_change: -quantity_consumed,
      reference_number: `CONSUMPTION-${materialConsumption.consumption_id}`,
      description: `Material consumed: ${consumption_purpose || 'No description'}`,
      location: location || 'Project Site',
      performed_by_user_id: req.user.user_id
    });

    res.status(201).json({
      message: 'Material consumption created successfully',
      materialConsumption
    });
  } catch (error) {
    console.error('Create material consumption error:', error);
    res.status(500).json({ message: 'Failed to create material consumption' });
  }
});

// Update material consumption
router.put('/consumptions/:id', authenticateToken, authorizeRoles('Admin', 'Project Manager', 'Project On-site Team'), [
  body('quantity_consumed').optional().isInt({ min: 1 }),
  body('consumption_date').optional().isDate(),
  body('consumption_purpose').optional().trim(),
  body('location').optional().trim()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const materialConsumption = await MaterialConsumption.findByPk(req.params.id);
    if (!materialConsumption) {
      return res.status(404).json({ message: 'Material consumption not found' });
    }

    const oldQuantity = materialConsumption.quantity_consumed;
    await materialConsumption.update(req.body);

    // Record inventory transaction if quantity changed
    if (req.body.quantity_consumed && req.body.quantity_consumed !== oldQuantity) {
      const quantityDifference = req.body.quantity_consumed - oldQuantity;
      await InventoryService.recordTransaction({
        material_id: materialConsumption.material_id,
        project_id: materialConsumption.project_id,
        transaction_type: 'CONSUMPTION',
        transaction_id: materialConsumption.consumption_id,
        quantity_change: -quantityDifference,
        reference_number: `CONSUMPTION-UPDATE-${materialConsumption.consumption_id}`,
        description: 'Material consumption quantity updated',
        location: materialConsumption.location,
        performed_by_user_id: req.user.user_id
      });
    }

    res.json({
      message: 'Material consumption updated successfully',
      materialConsumption
    });
  } catch (error) {
    console.error('Update material consumption error:', error);
    res.status(500).json({ message: 'Failed to update material consumption' });
  }
});

// Delete material consumption
router.delete('/consumptions/:id', authenticateToken, authorizeRoles('Admin', 'Project Manager'), async (req, res) => {
  try {
    const materialConsumption = await MaterialConsumption.findByPk(req.params.id);
    if (!materialConsumption) {
      return res.status(404).json({ message: 'Material consumption not found' });
    }

    // Record inventory transaction to reverse the consumption
    await InventoryService.recordTransaction({
      material_id: materialConsumption.material_id,
      project_id: materialConsumption.project_id,
      transaction_type: 'CONSUMPTION',
      transaction_id: materialConsumption.consumption_id,
      quantity_change: materialConsumption.quantity_consumed,
      reference_number: `CONSUMPTION-DELETE-${materialConsumption.consumption_id}`,
      description: 'Material consumption deleted - stock restored',
      location: materialConsumption.location,
      performed_by_user_id: req.user.user_id
    });

    await materialConsumption.destroy();
    res.json({ message: 'Material consumption deleted successfully' });
  } catch (error) {
    console.error('Delete material consumption error:', error);
    res.status(500).json({ message: 'Failed to delete material consumption' });
  }
});

// ==================== INVENTORY HISTORY ====================

// Get inventory history
router.get('/inventory-history', authenticateToken, async (req, res) => {
  try {
    const { material_id, project_id, transaction_type, date_from, date_to } = req.query;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const offset = (page - 1) * limit;

    const whereClause = {};
    if (material_id) whereClause.material_id = material_id;
    if (project_id) whereClause.project_id = project_id;
    if (transaction_type) whereClause.transaction_type = transaction_type;
    
    if (date_from || date_to) {
      whereClause.transaction_date = {};
      if (date_from) whereClause.transaction_date[Op.gte] = date_from;
      if (date_to) whereClause.transaction_date[Op.lte] = date_to;
    }

    const { count, rows: history } = await InventoryHistory.findAndCountAll({
      where: whereClause,
      include: [
        { model: Material, as: 'material', attributes: ['material_id', 'name', 'type', 'unit'] },
        { model: Project, as: 'project', attributes: ['project_id', 'name'] },
        { model: User, as: 'performedBy', foreignKey: 'performed_by_user_id', attributes: ['user_id', 'name'] }
      ],
      limit,
      offset,
      order: [['transaction_date', 'DESC']]
    });

    res.json({
      history,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(count / limit),
        totalItems: count,
        itemsPerPage: limit
      }
    });
  } catch (error) {
    console.error('Get inventory history error:', error);
    res.status(500).json({ message: 'Failed to fetch inventory history' });
  }
});

// ==================== WAREHOUSE MANAGEMENT ====================

// Get all warehouses
router.get('/warehouses', authenticateToken, async (req, res) => {
  try {
    const warehouses = await Warehouse.findAll({
      where: { is_active: true },
      order: [['warehouse_name', 'ASC']]
    });

    res.json({ warehouses });
  } catch (error) {
    console.error('Get warehouses error:', error);
    res.status(500).json({ message: 'Failed to fetch warehouses' });
  }
});

// Create warehouse
router.post('/warehouses', authenticateToken, authorizeRoles('Admin', 'Project Manager', 'Inventory Manager'), [
  body('warehouse_name').trim().isLength({ min: 2 }).withMessage('Warehouse name must be at least 2 characters'),
  body('address').optional().trim(),
  body('contact_person').optional().trim(),
  body('contact_phone').optional().trim(),
  body('contact_email').optional().isEmail().withMessage('Invalid email format')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const warehouse = await Warehouse.create(req.body);
    res.status(201).json({
      message: 'Warehouse created successfully',
      warehouse
    });
  } catch (error) {
    console.error('Create warehouse error:', error);
    res.status(500).json({ message: 'Failed to create warehouse' });
  }
});

// ==================== MASTER DATA ====================

// Get master data for dropdowns
router.get('/master-data', authenticateToken, async (req, res) => {
  try {
    console.log('Fetching master data...');
    const [categories, brands, units, suppliers, itemMaster, warehouses] = await Promise.all([
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
      }),
      Warehouse.findAll({
        attributes: ['warehouse_id', 'warehouse_name', 'address'],
        where: { is_active: true },
        order: [['warehouse_name', 'ASC']]
      })
    ]);

    console.log('Master data fetched:', {
      categories: categories.length,
      brands: brands.length,
      units: units.length,
      suppliers: suppliers.length,
      itemMaster: itemMaster.length,
      warehouses: warehouses.length
    });

    res.json({
      categories,
      brands,
      units,
      suppliers,
      itemMaster,
      warehouses
    });
  } catch (error) {
    console.error('Get master data error:', error);
    res.status(500).json({ message: 'Failed to fetch master data' });
  }
});

// ==================== INVENTORY RESTOCKING ====================

// Get low stock materials for restocking
router.get('/restock/low-stock', authenticateToken, async (req, res) => {
  try {
    const { project_id } = req.query;
    
    const whereClause = {
      stock_qty: {
        [Op.lte]: sequelize.col('reorder_point')
      },
      reorder_point: {
        [Op.gt]: 0
      },
      status: 'ACTIVE'
    };
    
    if (project_id) whereClause.project_id = project_id;

    const lowStockMaterials = await Material.findAll({
      where: whereClause,
      include: [
        { model: Project, as: 'project', attributes: ['project_id', 'name'] },
        { model: Warehouse, as: 'warehouse', attributes: ['warehouse_id', 'warehouse_name'] }
      ],
      order: [['stock_qty', 'ASC']]
    });

    res.json({ lowStockMaterials });
  } catch (error) {
    console.error('Get low stock materials error:', error);
    res.status(500).json({ message: 'Failed to fetch low stock materials' });
  }
});

// Restock single material
router.post('/restock/single', authenticateToken, authorizeRoles('Admin', 'Project Manager', 'Project On-site Team', 'Inventory Manager'), [
  body('material_id').isInt().withMessage('Material ID is required'),
  body('restock_quantity').isInt({ min: 1 }).withMessage('Restock quantity must be a positive integer'),
  body('restock_date').isDate().withMessage('Invalid restock date'),
  body('supplier').optional().trim(),
  body('cost_per_unit').optional().isFloat({ min: 0 }).withMessage('Cost per unit must be a positive number'),
  body('reference_number').optional().trim(),
  body('notes').optional().trim(),
  body('location').optional().trim()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { 
      material_id, 
      restock_quantity, 
      restock_date, 
      supplier, 
      cost_per_unit, 
      reference_number, 
      notes, 
      location 
    } = req.body;

    // Verify material exists
    const material = await Material.findByPk(material_id);
    if (!material) {
      return res.status(404).json({ message: 'Material not found' });
    }

    // Update material stock and cost if provided
    const updateData = {
      stock_qty: material.stock_qty + restock_quantity
    };
    
    if (cost_per_unit !== undefined) {
      updateData.cost_per_unit = cost_per_unit;
    }
    
    if (supplier) {
      updateData.supplier = supplier;
    }

    await material.update(updateData);

    // Record inventory transaction
    await InventoryService.recordTransaction({
      material_id,
      project_id: material.project_id,
      transaction_type: 'RESTOCK',
      transaction_id: null,
      quantity_change: restock_quantity,
      reference_number: reference_number || `RESTOCK-${Date.now()}`,
      description: `Material restocked: ${notes || 'No notes'}`,
      location: location || material.location || 'Store',
      performed_by_user_id: req.user.user_id
    });

    // Emit socket event
    socketService.emitToProject(material.project_id, 'materialRestocked', {
      materialId: material_id,
      quantity: restock_quantity,
      projectId: material.project_id
    });

    res.status(201).json({
      message: 'Material restocked successfully',
      material,
      restockQuantity: restock_quantity
    });
  } catch (error) {
    console.error('Restock material error:', error);
    res.status(500).json({ message: 'Failed to restock material' });
  }
});

// Bulk restock multiple materials
router.post('/restock/bulk', authenticateToken, authorizeRoles('Admin', 'Project Manager', 'Project On-site Team', 'Inventory Manager'), [
  body('restocks').isArray({ min: 1 }).withMessage('Restocks array is required'),
  body('restocks.*.material_id').isInt().withMessage('Material ID is required for each restock'),
  body('restocks.*.restock_quantity').isInt({ min: 1 }).withMessage('Restock quantity must be a positive integer'),
  body('restock_date').isDate().withMessage('Invalid restock date'),
  body('reference_number').optional().trim(),
  body('notes').optional().trim(),
  body('location').optional().trim()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { restocks, restock_date, reference_number, notes, location } = req.body;
    const results = [];
    const bulkErrors = [];

    // Process each restock
    for (const restock of restocks) {
      try {
        const { material_id, restock_quantity, cost_per_unit, supplier } = restock;

        // Verify material exists
        const material = await Material.findByPk(material_id);
        if (!material) {
          bulkErrors.push({ material_id, error: 'Material not found' });
          continue;
        }

        // Update material stock and cost if provided
        const updateData = {
          stock_qty: material.stock_qty + restock_quantity
        };
        
        if (cost_per_unit !== undefined) {
          updateData.cost_per_unit = cost_per_unit;
        }
        
        if (supplier) {
          updateData.supplier = supplier;
        }

        await material.update(updateData);

        // Record inventory transaction
        await InventoryService.recordTransaction({
          material_id,
          project_id: material.project_id,
          transaction_type: 'RESTOCK',
          transaction_id: null,
          quantity_change: restock_quantity,
          reference_number: reference_number || `BULK-RESTOCK-${Date.now()}`,
          description: `Bulk material restocked: ${notes || 'No notes'}`,
          location: location || material.location || 'Store',
          performed_by_user_id: req.user.user_id
        });

        results.push({
          material_id,
          material_name: material.name,
          restock_quantity,
          new_stock: material.stock_qty
        });

        // Emit socket event
        socketService.emitToProject(material.project_id, 'materialRestocked', {
          materialId: material_id,
          quantity: restock_quantity,
          projectId: material.project_id
        });

      } catch (error) {
        console.error(`Error restocking material ${restock.material_id}:`, error);
        bulkErrors.push({ 
          material_id: restock.material_id, 
          error: error.message 
        });
      }
    }

    res.status(201).json({
      message: `Bulk restock completed. ${results.length} materials restocked successfully.`,
      results,
      errors: bulkErrors.length > 0 ? bulkErrors : undefined
    });
  } catch (error) {
    console.error('Bulk restock error:', error);
    res.status(500).json({ message: 'Failed to perform bulk restock' });
  }
});

// Get restocking history
router.get('/restock/history', authenticateToken, async (req, res) => {
  try {
    const { material_id, project_id, date_from, date_to } = req.query;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const offset = (page - 1) * limit;

    const whereClause = {
      transaction_type: 'RESTOCK'
    };
    
    if (material_id) whereClause.material_id = material_id;
    if (project_id) whereClause.project_id = project_id;
    
    if (date_from || date_to) {
      whereClause.transaction_date = {};
      if (date_from) whereClause.transaction_date[Op.gte] = date_from;
      if (date_to) whereClause.transaction_date[Op.lte] = date_to;
    }

    const { count, rows: history } = await InventoryHistory.findAndCountAll({
      where: whereClause,
      include: [
        { model: Material, as: 'material', attributes: ['material_id', 'name', 'type', 'unit'] },
        { model: Project, as: 'project', attributes: ['project_id', 'name'] },
        { model: User, as: 'performedBy', foreignKey: 'performed_by_user_id', attributes: ['user_id', 'name'] }
      ],
      limit,
      offset,
      order: [['transaction_date', 'DESC']]
    });

    res.json({
      history,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(count / limit),
        totalItems: count,
        itemsPerPage: limit
      }
    });
  } catch (error) {
    console.error('Get restocking history error:', error);
    res.status(500).json({ message: 'Failed to fetch restocking history' });
  }
});

// ==================== DASHBOARD STATS ====================

// Get material management dashboard stats
router.get('/dashboard-stats/:projectId', authenticateToken, async (req, res) => {
  try {
    const { projectId } = req.params;

    // Get material count
    const materialCount = await Material.count({
      where: { project_id: projectId }
    });

    // Get total material value
    const materials = await Material.findAll({
      where: { project_id: projectId },
      attributes: ['cost_per_unit', 'stock_qty']
    });

    const totalValue = materials.reduce((sum, material) => {
      return sum + ((material.cost_per_unit || 0) * (material.stock_qty || 0));
    }, 0);

    // Get low stock alerts
    const lowStockMaterials = await Material.count({
      where: {
        project_id: projectId,
        stock_qty: { [Op.lte]: sequelize.col('minimum_stock_level') },
        minimum_stock_level: { [Op.gt]: 0 }
      }
    });

    // Get recent issues count
    const recentIssues = await MaterialIssue.count({
      where: {
        project_id: projectId,
        issue_date: { [Op.gte]: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } // Last 30 days
      }
    });

    res.json({
      totalMaterials: materialCount,
      totalValue: totalValue,
      lowStockAlerts: lowStockMaterials,
      recentIssues: recentIssues
    });
  } catch (error) {
    console.error('Get dashboard stats error:', error);
    res.status(500).json({ message: 'Failed to fetch dashboard stats' });
  }
});

module.exports = router;
