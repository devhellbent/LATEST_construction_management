const express = require('express');
const { body, validationResult, query } = require('express-validator');
const { Op } = require('sequelize');
const { 
  MaterialRequirementRequest, 
  MrrItem, 
  Project, 
  User, 
  ItemMaster, 
  Unit,
  PurchaseOrder,
  PurchaseOrderItem,
  Supplier,
  MaterialReceipt,
  MaterialReceiptItem,
  SupplierLedger,
  Material,
  Warehouse
} = require('../../models');
const { authenticateToken, authorizeRoles } = require('../../middleware/auth');

const router = express.Router();

// =====================================================
// MATERIAL REQUIREMENT REQUEST (MRR) ROUTES
// =====================================================

// Check MRR inventory availability and auto-create missing materials
router.post('/:id/check-inventory', authenticateToken, authorizeRoles('Admin', 'Project Manager', 'Store Incharge'), async (req, res) => {
  try {
    const mrrId = req.params.id;
    
    // Get MRR with items
    const mrr = await MaterialRequirementRequest.findByPk(mrrId, {
      include: [
        { 
          model: MrrItem, 
          as: 'items', 
          include: [
            { model: ItemMaster, as: 'item', attributes: ['item_id', 'item_code', 'item_name', 'description', 'category_id', 'brand_id', 'unit_id'] },
            { model: Unit, as: 'unit', attributes: ['unit_name', 'unit_symbol'] }
          ]
        }
      ]
    });

    if (!mrr) {
      return res.status(404).json({ message: 'MRR not found' });
    }

    if (mrr.status === 'CANCELLED') {
      return res.status(400).json({ message: 'Cannot check inventory for cancelled MRRs' });
    }

    const inventoryCheckResults = [];
    const materialsToCreate = [];
    let allMaterialsAvailable = true;

    // Check each MRR item against inventory
    for (const mrrItem of mrr.items) {
      const itemMaster = mrrItem.item;
      
      if (!itemMaster) {
        continue;
      }
      
      // Check if material exists in inventory (check all warehouses for this item)
      const existingMaterial = await Material.findOne({
        where: { 
          item_id: itemMaster.item_id
          // Remove project_id filter to check across all projects/warehouses
        },
        include: [
          { model: Warehouse, as: 'warehouse', attributes: ['warehouse_id', 'warehouse_name', 'address'] },
          { model: Project, as: 'project', attributes: ['project_id', 'name'] }
        ]
      });

      if (existingMaterial) {
        // Material exists, check stock availability
        const availableStock = existingMaterial.stock_qty;
        const requiredQuantity = mrrItem.quantity_requested;
        
        inventoryCheckResults.push({
          mrr_item_id: mrrItem.mrr_item_id,
          item_id: itemMaster.item_id,
          item_name: itemMaster.item_name,
          item_code: itemMaster.item_code,
          required_quantity: requiredQuantity,
          available_stock: availableStock,
          status: availableStock >= requiredQuantity ? 'AVAILABLE' : 'INSUFFICIENT_STOCK',
          material_id: existingMaterial.material_id,
          warehouse: existingMaterial.warehouse,
          project: existingMaterial.project,
          material_details: {
            cost_per_unit: existingMaterial.cost_per_unit,
            minimum_stock_level: existingMaterial.minimum_stock_level,
            maximum_stock_level: existingMaterial.maximum_stock_level,
            reorder_point: existingMaterial.reorder_point,
            location: existingMaterial.location,
            status: existingMaterial.status
          }
        });

        if (availableStock < requiredQuantity) {
          allMaterialsAvailable = false;
        }
      } else {
        // Material doesn't exist in inventory, needs to be created
        materialsToCreate.push({
          mrr_item_id: mrrItem.mrr_item_id,
          item_id: itemMaster.item_id,
          item_name: itemMaster.item_name,
          item_code: itemMaster.item_code,
          required_quantity: mrrItem.quantity_requested,
          unit_id: itemMaster.unit_id,
          category_id: itemMaster.category_id,
          brand_id: itemMaster.brand_id
        });

        inventoryCheckResults.push({
          mrr_item_id: mrrItem.mrr_item_id,
          item_id: itemMaster.item_id,
          item_name: itemMaster.item_name,
          item_code: itemMaster.item_code,
          required_quantity: mrrItem.quantity_requested,
          available_stock: 0,
          status: 'NOT_IN_INVENTORY',
          material_id: null,
          warehouse: null
        });

        allMaterialsAvailable = false;
      }
    }

    // Auto-create missing materials if requested
    if (req.body.auto_create_materials === true && materialsToCreate.length > 0) {
      const defaultWarehouse = await Warehouse.findOne({ where: { is_active: true } });
      
      if (!defaultWarehouse) {
        return res.status(400).json({ message: 'No active warehouse found. Please create a warehouse first.' });
      }

      for (const materialData of materialsToCreate) {
        const createdMaterial = await Material.create({
          item_id: materialData.item_id,
          project_id: mrr.project_id,
          warehouse_id: defaultWarehouse.warehouse_id,
          name: materialData.item_name,
          item_code: materialData.item_code,
          stock_qty: 0, // Start with 0 stock
          minimum_stock_level: 0,
          maximum_stock_level: 1000,
          reorder_point: 0,
          status: 'ACTIVE'
        });

        // Update the inventory check result
        const resultIndex = inventoryCheckResults.findIndex(r => r.mrr_item_id === materialData.mrr_item_id);
        if (resultIndex !== -1) {
          inventoryCheckResults[resultIndex].material_id = createdMaterial.material_id;
          inventoryCheckResults[resultIndex].warehouse = {
            warehouse_id: defaultWarehouse.warehouse_id,
            warehouse_name: defaultWarehouse.warehouse_name
          };
          inventoryCheckResults[resultIndex].status = 'CREATED_NO_STOCK';
        }
      }
    }

    // Only update MRR status if it's currently APPROVED and materials are available
    // This allows the MRR to move from APPROVED to PROCESSING when ready to issue
    let newStatus = mrr.status;
    if (mrr.status === 'APPROVED' && allMaterialsAvailable) {
      newStatus = 'PROCESSING'; // Ready to issue materials
      await mrr.update({ status: newStatus });
    }
    // For other cases, keep the current status and let users manually update if needed

    res.json({
      message: 'Inventory check completed',
      mrr_id: mrrId,
      mrr_status: newStatus,
      inventory_status: allMaterialsAvailable ? 'READY_FOR_ISSUE' : (materialsToCreate.length > 0 ? 'NEEDS_PURCHASE' : 'INSUFFICIENT_STOCK'),
      inventory_check_results: inventoryCheckResults,
      materials_created: materialsToCreate.length,
      all_materials_available: allMaterialsAvailable,
      summary: {
        total_items: mrr.items.length,
        available_items: inventoryCheckResults.filter(r => r.status === 'AVAILABLE').length,
        insufficient_stock_items: inventoryCheckResults.filter(r => r.status === 'INSUFFICIENT_STOCK').length,
        not_in_inventory_items: inventoryCheckResults.filter(r => r.status === 'NOT_IN_INVENTORY').length,
        created_items: inventoryCheckResults.filter(r => r.status === 'CREATED_NO_STOCK').length
      }
    });

  } catch (error) {
    console.error('MRR inventory check error:', error);
    res.status(500).json({ message: 'Failed to check MRR inventory' });
  }
});

// Get all MRRs with pagination and filtering
router.get('/', authenticateToken, [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('status').optional().isIn(['DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED', 'PROCESSING', 'COMPLETED', 'CANCELLED']),
  query('priority').optional().isIn(['LOW', 'MEDIUM', 'HIGH', 'URGENT']),
  query('project_id').optional().isInt().withMessage('Project ID must be an integer'),
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
    const { status, priority, project_id, search } = req.query;

    // Build where clause
    const whereClause = {};
    if (status) whereClause.status = status;
    if (priority) whereClause.priority = priority;
    if (project_id) whereClause.project_id = project_id;
    
    if (search) {
      whereClause[Op.or] = [
        { mrr_number: { [Op.like]: `%${search}%` } },
        { notes: { [Op.like]: `%${search}%` } }
      ];
    }

    const { count, rows: mrrs } = await MaterialRequirementRequest.findAndCountAll({
      where: whereClause,
      include: [
        { model: Project, as: 'project', attributes: ['name'] },
        { model: User, as: 'requestedBy', attributes: ['name', 'email'] },
        { model: User, as: 'approvedBy', attributes: ['name', 'email'], required: false },
        { model: MrrItem, as: 'items', include: [
          { model: ItemMaster, as: 'item', attributes: ['item_id', 'item_name', 'item_code'] },
          { model: Unit, as: 'unit', attributes: ['unit_id', 'unit_name', 'unit_symbol'] }
        ]}
      ],
      limit,
      offset,
      order: [['created_at', 'DESC']]
    });

    res.json({
      mrrs,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(count / limit),
        totalItems: count,
        itemsPerPage: limit
      }
    });
  } catch (error) {
    console.error('Get MRRs error:', error);
    res.status(500).json({ message: 'Failed to fetch MRRs' });
  }
});

// Get MRR by ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const mrr = await MaterialRequirementRequest.findByPk(req.params.id, {
      include: [
        { model: Project, as: 'project', attributes: ['name', 'description'] },
        { model: User, as: 'requestedBy', attributes: ['name', 'email'] },
        { model: User, as: 'approvedBy', attributes: ['name', 'email'], required: false },
        { model: MrrItem, as: 'items', include: [
          { model: ItemMaster, as: 'item', attributes: ['item_id', 'item_name', 'item_code', 'description', 'specifications'] },
          { model: Unit, as: 'unit', attributes: ['unit_id', 'unit_name', 'unit_symbol'] }
        ]}
      ]
    });

    if (!mrr) {
      return res.status(404).json({ message: 'MRR not found' });
    }

    res.json({ mrr });
  } catch (error) {
    console.error('Get MRR error:', error);
    res.status(500).json({ message: 'Failed to fetch MRR' });
  }
});

// Create MRR
router.post('/', authenticateToken, authorizeRoles('Admin', 'Project Manager', 'Project On-site Team'), [
  body('project_id').isInt().withMessage('Project ID must be an integer'),
  body('required_date').isISO8601().withMessage('Required date must be a valid date'),
  body('priority').optional().isIn(['LOW', 'MEDIUM', 'HIGH', 'URGENT']),
  body('notes').optional().trim(),
  body('items').isArray({ min: 1 }).withMessage('At least one item is required'),
  body('items.*.item_id').isInt().withMessage('Item ID must be an integer'),
  body('items.*.quantity_requested').isInt({ min: 1 }).withMessage('Quantity must be a positive integer'),
  body('items.*.unit_id').isInt().withMessage('Unit ID must be an integer'),
  body('items.*.specifications').optional().trim(),
  body('items.*.purpose').optional().trim(),
  body('items.*.priority').optional().isIn(['LOW', 'MEDIUM', 'HIGH', 'URGENT']),
  body('items.*.estimated_cost_per_unit').optional().isFloat({ min: 0 }).withMessage('Cost must be a positive number')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { project_id, required_date, priority, notes, items } = req.body;

    // Calculate total estimated cost
    let totalEstimatedCost = 0;
    items.forEach(item => {
      if (item.estimated_cost_per_unit && item.quantity_requested) {
        item.total_estimated_cost = item.estimated_cost_per_unit * item.quantity_requested;
        totalEstimatedCost += item.total_estimated_cost;
      }
    });

    // Generate unique MRR number
    const generateMrrNumber = async () => {
      const year = new Date().getFullYear();
      const month = String(new Date().getMonth() + 1).padStart(2, '0');
      
      // Find the last MRR number for this year-month
      const lastMrr = await MaterialRequirementRequest.findOne({
        where: {
          mrr_number: {
            [Op.like]: `MRR${year}${month}%`
          }
        },
        order: [['mrr_number', 'DESC']]
      });
      
      let sequence = 1;
      if (lastMrr && lastMrr.mrr_number) {
        const lastSequence = parseInt(lastMrr.mrr_number.slice(-4));
        if (!isNaN(lastSequence)) {
          sequence = lastSequence + 1;
        }
      }
      
      return `MRR${year}${month}${String(sequence).padStart(4, '0')}`;
    };

    const mrrNumber = await generateMrrNumber();

    // Create MRR
    const mrr = await MaterialRequirementRequest.create({
      mrr_number: mrrNumber,
      project_id,
      requested_by_user_id: req.user.user_id,
      request_date: new Date(),
      required_date,
      priority: priority || 'MEDIUM',
      status: 'DRAFT',
      approval_status: 'PENDING',
      total_estimated_cost: totalEstimatedCost,
      notes
    });

    // Create MRR items
    const mrrItems = await Promise.all(
      items.map(item => MrrItem.create({
        mrr_id: mrr.mrr_id,
        item_id: item.item_id,
        quantity_requested: item.quantity_requested,
        unit_id: item.unit_id,
        specifications: item.specifications,
        purpose: item.purpose,
        priority: item.priority || 'MEDIUM',
        estimated_cost_per_unit: item.estimated_cost_per_unit,
        total_estimated_cost: item.total_estimated_cost,
        notes: item.notes
      }))
    );

    // Fetch the created MRR with associations
    const createdMrr = await MaterialRequirementRequest.findByPk(mrr.mrr_id, {
      include: [
        { model: Project, as: 'project', attributes: ['name'] },
        { model: User, as: 'requestedBy', attributes: ['name', 'email'] },
        { model: MrrItem, as: 'items', include: [
          { model: ItemMaster, as: 'item', attributes: ['item_id', 'item_name', 'item_code'] },
          { model: Unit, as: 'unit', attributes: ['unit_id', 'unit_name', 'unit_symbol'] }
        ]}
      ]
    });

    res.status(201).json({
      message: 'MRR created successfully',
      mrr: createdMrr
    });
  } catch (error) {
    console.error('Create MRR error:', error);
    res.status(500).json({ message: 'Failed to create MRR' });
  }
});

// Submit MRR for approval
router.patch('/:id/submit', authenticateToken, authorizeRoles('Admin', 'Project Manager', 'Project On-site Team'), async (req, res) => {
  try {
    const mrr = await MaterialRequirementRequest.findByPk(req.params.id);
    if (!mrr) {
      return res.status(404).json({ message: 'MRR not found' });
    }

    if (mrr.status !== 'DRAFT') {
      return res.status(400).json({ message: 'Only draft MRRs can be submitted' });
    }

    await mrr.update({
      status: 'SUBMITTED',
      approval_status: 'PENDING'
    });

    res.json({
      message: 'MRR submitted for approval',
      mrr
    });
  } catch (error) {
    console.error('Submit MRR error:', error);
    res.status(500).json({ message: 'Failed to submit MRR' });
  }
});

// Approve/Reject MRR
router.patch('/:id/approve', authenticateToken, authorizeRoles('Admin', 'Project Manager'), [
  body('action').isIn(['approve', 'reject']).withMessage('Action must be either approve or reject'),
  body('rejection_reason').optional().trim()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { action, rejection_reason } = req.body;
    const mrr = await MaterialRequirementRequest.findByPk(req.params.id);
    
    if (!mrr) {
      return res.status(404).json({ message: 'MRR not found' });
    }

    if (mrr.status !== 'SUBMITTED') {
      return res.status(400).json({ message: 'Only submitted MRRs can be approved/rejected' });
    }

    const updateData = {
      approved_by_user_id: req.user.user_id,
      approved_at: new Date()
    };

    if (action === 'approve') {
      updateData.status = 'APPROVED';
    } else {
      updateData.status = 'REJECTED';
      updateData.rejection_reason = rejection_reason;
    }

    await mrr.update(updateData);

    res.json({
      message: `MRR ${action}d successfully`,
      mrr
    });
  } catch (error) {
    console.error('Approve/Reject MRR error:', error);
    res.status(500).json({ message: 'Failed to process MRR approval' });
  }
});

// Update MRR
router.put('/:id', authenticateToken, authorizeRoles('Admin', 'Project Manager', 'Project On-site Team'), [
  body('required_date').optional().isISO8601().withMessage('Required date must be a valid date'),
  body('priority').optional().isIn(['LOW', 'MEDIUM', 'HIGH', 'URGENT']),
  body('notes').optional().trim()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const mrr = await MaterialRequirementRequest.findByPk(req.params.id);
    if (!mrr) {
      return res.status(404).json({ message: 'MRR not found' });
    }

    if (mrr.status !== 'DRAFT') {
      return res.status(400).json({ message: 'Only draft MRRs can be updated' });
    }

    await mrr.update(req.body);

    res.json({
      message: 'MRR updated successfully',
      mrr
    });
  } catch (error) {
    console.error('Update MRR error:', error);
    res.status(500).json({ message: 'Failed to update MRR' });
  }
});

// Delete MRR
router.delete('/:id', authenticateToken, authorizeRoles('Admin', 'Project Manager'), async (req, res) => {
  try {
    const mrr = await MaterialRequirementRequest.findByPk(req.params.id);
    if (!mrr) {
      return res.status(404).json({ message: 'MRR not found' });
    }

    if (mrr.status !== 'DRAFT') {
      return res.status(400).json({ message: 'Only draft MRRs can be deleted' });
    }

    await mrr.destroy();

    res.json({ message: 'MRR deleted successfully' });
  } catch (error) {
    console.error('Delete MRR error:', error);
    res.status(500).json({ message: 'Failed to delete MRR' });
  }
});

// =====================================================
// MRR ITEMS ROUTES
// =====================================================

// Add item to MRR
router.post('/:id/items', authenticateToken, authorizeRoles('Admin', 'Project Manager', 'Project On-site Team'), [
  body('item_id').isInt().withMessage('Item ID must be an integer'),
  body('quantity_requested').isInt({ min: 1 }).withMessage('Quantity must be a positive integer'),
  body('unit_id').isInt().withMessage('Unit ID must be an integer'),
  body('specifications').optional().trim(),
  body('purpose').optional().trim(),
  body('priority').optional().isIn(['LOW', 'MEDIUM', 'HIGH', 'URGENT']),
  body('estimated_cost_per_unit').optional().isFloat({ min: 0 }).withMessage('Cost must be a positive number')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const mrr = await MaterialRequirementRequest.findByPk(req.params.id);
    if (!mrr) {
      return res.status(404).json({ message: 'MRR not found' });
    }

    if (mrr.status !== 'DRAFT') {
      return res.status(400).json({ message: 'Only draft MRRs can be modified' });
    }

    const { item_id, quantity_requested, unit_id, specifications, purpose, priority, estimated_cost_per_unit, notes } = req.body;
    
    const total_estimated_cost = estimated_cost_per_unit ? estimated_cost_per_unit * quantity_requested : null;

    const mrrItem = await MrrItem.create({
      mrr_id: mrr.mrr_id,
      item_id,
      quantity_requested,
      unit_id,
      specifications,
      purpose,
      priority: priority || 'MEDIUM',
      estimated_cost_per_unit,
      total_estimated_cost,
      notes
    });

    // Update MRR total cost
    const totalCost = await MrrItem.sum('total_estimated_cost', {
      where: { mrr_id: mrr.mrr_id }
    });
    await mrr.update({ total_estimated_cost: totalCost || 0 });

    res.status(201).json({
      message: 'Item added to MRR successfully',
      mrrItem
    });
  } catch (error) {
    console.error('Add MRR item error:', error);
    res.status(500).json({ message: 'Failed to add item to MRR' });
  }
});

// Update MRR item
router.put('/:id/items/:itemId', authenticateToken, authorizeRoles('Admin', 'Project Manager', 'Project On-site Team'), [
  body('quantity_requested').optional().isInt({ min: 1 }).withMessage('Quantity must be a positive integer'),
  body('specifications').optional().trim(),
  body('purpose').optional().trim(),
  body('priority').optional().isIn(['LOW', 'MEDIUM', 'HIGH', 'URGENT']),
  body('estimated_cost_per_unit').optional().isFloat({ min: 0 }).withMessage('Cost must be a positive number')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const mrr = await MaterialRequirementRequest.findByPk(req.params.id);
    if (!mrr) {
      return res.status(404).json({ message: 'MRR not found' });
    }

    if (mrr.status !== 'DRAFT') {
      return res.status(400).json({ message: 'Only draft MRRs can be modified' });
    }

    const mrrItem = await MrrItem.findOne({
      where: { mrr_item_id: req.params.itemId, mrr_id: req.params.id }
    });

    if (!mrrItem) {
      return res.status(404).json({ message: 'MRR item not found' });
    }

    const updateData = { ...req.body };
    if (updateData.estimated_cost_per_unit && updateData.quantity_requested) {
      updateData.total_estimated_cost = updateData.estimated_cost_per_unit * updateData.quantity_requested;
    }

    await mrrItem.update(updateData);

    // Update MRR total cost
    const totalCost = await MrrItem.sum('total_estimated_cost', {
      where: { mrr_id: mrr.mrr_id }
    });
    await mrr.update({ total_estimated_cost: totalCost || 0 });

    res.json({
      message: 'MRR item updated successfully',
      mrrItem
    });
  } catch (error) {
    console.error('Update MRR item error:', error);
    res.status(500).json({ message: 'Failed to update MRR item' });
  }
});

// Delete MRR item
router.delete('/:id/items/:itemId', authenticateToken, authorizeRoles('Admin', 'Project Manager', 'Project On-site Team'), async (req, res) => {
  try {
    const mrr = await MaterialRequirementRequest.findByPk(req.params.id);
    if (!mrr) {
      return res.status(404).json({ message: 'MRR not found' });
    }

    if (mrr.status !== 'DRAFT') {
      return res.status(400).json({ message: 'Only draft MRRs can be modified' });
    }

    const mrrItem = await MrrItem.findOne({
      where: { mrr_item_id: req.params.itemId, mrr_id: req.params.id }
    });

    if (!mrrItem) {
      return res.status(404).json({ message: 'MRR item not found' });
    }

    await mrrItem.destroy();

    // Update MRR total cost
    const totalCost = await MrrItem.sum('total_estimated_cost', {
      where: { mrr_id: mrr.mrr_id }
    });
    await mrr.update({ total_estimated_cost: totalCost || 0 });

    res.json({ message: 'MRR item deleted successfully' });
  } catch (error) {
    console.error('Delete MRR item error:', error);
    res.status(500).json({ message: 'Failed to delete MRR item' });
  }
});

// Update MRR status (for Project Manager and Admin)
router.patch('/:id/status', authenticateToken, authorizeRoles('Admin', 'Project Manager'), [
  body('status').isIn(['DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'PROCESSING', 'COMPLETED', 'CANCELLED']).withMessage('Invalid status'),
  body('notes').optional().trim()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const mrrId = req.params.id;
    const { status, notes } = req.body;

    const mrr = await MaterialRequirementRequest.findByPk(mrrId);
    if (!mrr) {
      return res.status(404).json({ message: 'MRR not found' });
    }

    // Update MRR status
    await mrr.update({ 
      status,
      notes: notes || mrr.notes,
      updated_by: req.user.user_id
    });

    res.json({
      message: 'MRR status updated successfully',
      mrr: {
        mrr_id: mrr.mrr_id,
        mrr_number: mrr.mrr_number,
        status: mrr.status,
        notes: mrr.notes
      }
    });

  } catch (error) {
    console.error('Update MRR status error:', error);
    res.status(500).json({ message: 'Failed to update MRR status' });
  }
});

module.exports = router;
