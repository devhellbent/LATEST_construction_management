const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const { authenticateToken, authorizeRoles } = require('../../middleware/auth');
const { Op } = require('sequelize');

const { 
  MaterialReceipt, 
  MaterialReceiptItem, 
  PurchaseOrder, 
  PurchaseOrderItem, 
  Project, 
  User, 
  ItemMaster, 
  Unit,
  Material,
  InventoryHistory,
  SupplierLedger,
  Supplier
} = require('../../models');

// =====================================================
// MATERIAL RECEIPT MANAGEMENT ROUTES
// =====================================================

// Get all material receipts with filters
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { 
      project_id, 
      status, 
      po_id, 
      supplier_id,
      start_date, 
      end_date,
      page = 1, 
      limit = 10 
    } = req.query;

    const whereClause = {};
    if (project_id) whereClause.project_id = project_id;
    if (status) whereClause.status = status;
    if (po_id) whereClause.po_id = po_id;
    if (start_date && end_date) {
      whereClause.received_date = {
        [Op.between]: [start_date, end_date]
      };
    }

    const offset = (page - 1) * limit;

    const receipts = await MaterialReceipt.findAndCountAll({
      where: whereClause,
      include: [
        { 
          model: PurchaseOrder, 
          as: 'purchaseOrder',
          include: [
            { model: Supplier, as: 'supplier', attributes: ['supplier_name'] }
          ]
        },
        { model: Project, as: 'project', attributes: ['name'] },
        { model: User, as: 'receivedBy', attributes: ['name', 'email'] },
        { 
          model: MaterialReceiptItem, 
          as: 'items',
          include: [
            { model: ItemMaster, as: 'item', attributes: ['item_name', 'item_code'] },
            { model: Unit, as: 'unit', attributes: ['unit_name', 'unit_symbol'] }
          ]
        }
      ],
      order: [['created_at', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    res.json({
      receipts: receipts.rows,
      pagination: {
        total: receipts.count,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(receipts.count / limit)
      }
    });
  } catch (error) {
    console.error('Get material receipts error:', error);
    res.status(500).json({ message: 'Failed to fetch material receipts' });
  }
});

// Get material receipt by ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const receipt = await MaterialReceipt.findByPk(id, {
      include: [
        { 
          model: PurchaseOrder, 
          as: 'purchaseOrder',
          include: [
            { model: Supplier, as: 'supplier', attributes: ['supplier_name'] }
          ]
        },
        { model: Project, as: 'project', attributes: ['name'] },
        { model: User, as: 'receivedBy', attributes: ['name', 'email'] },
        { 
          model: MaterialReceiptItem, 
          as: 'items',
          include: [
            { model: ItemMaster, as: 'item', attributes: ['item_name', 'item_code'] },
            { model: Unit, as: 'unit', attributes: ['unit_name', 'unit_symbol'] }
          ]
        }
      ]
    });

    if (!receipt) {
      return res.status(404).json({ message: 'Material receipt not found' });
    }

    res.json({ receipt });
  } catch (error) {
    console.error('Get material receipt error:', error);
    res.status(500).json({ message: 'Failed to fetch material receipt' });
  }
});

// =====================================================
// CREATE MATERIAL RECEIPT (When PO is placed)
// =====================================================

// Create Material Receipt for a PO
router.post('/', authenticateToken, authorizeRoles('Admin', 'Project Manager', 'Project On-site Team', 'Inventory Manager'), [
  body('po_id').isInt().withMessage('PO ID must be an integer'),
  body('received_date').isISO8601().withMessage('Received date must be a valid date'),
  body('delivery_date').optional().custom((value) => {
    if (value === null || value === undefined || value === '') return true;
    return !isNaN(Date.parse(value));
  }),
  body('supplier_delivery_note').optional().trim(),
  body('vehicle_number').optional().trim(),
  body('driver_name').optional().trim(),
  body('condition_status').optional().isIn(['GOOD', 'DAMAGED', 'PARTIAL', 'REJECTED']),
  body('notes').optional().trim(),
  body('delivery_notes').optional().trim(),
  body('warehouse_id').isInt().withMessage('Warehouse ID must be an integer'),
  body('project_id').optional().custom((value) => {
    if (value === null || value === undefined || value === '') return true;
    return !isNaN(parseInt(value)) && Number.isInteger(parseFloat(value));
  }),
  body('items').isArray({ min: 1 }).withMessage('At least one item is required'),
  body('items.*.po_item_id').isInt().withMessage('PO Item ID must be an integer'),
  body('items.*.item_id').isInt().withMessage('Item ID must be an integer'),
  body('items.*.quantity_received').isInt({ min: 1 }).withMessage('Quantity received must be a positive integer'),
  body('items.*.unit_id').isInt().withMessage('Unit ID must be an integer'),
  body('items.*.unit_price').isFloat({ min: 0 }).withMessage('Unit price must be a positive number'),
  body('items.*.condition_status').optional().isIn(['GOOD', 'DAMAGED', 'REJECTED']),
  body('items.*.batch_number').optional().trim(),
  body('items.*.expiry_date').optional().custom((value) => {
    if (value === null || value === undefined || value === '') return true;
    return !isNaN(Date.parse(value));
  }),
  body('items.*.notes').optional().trim(),
  body('items.*.cgst_rate').optional().isFloat({ min: 0, max: 100 }).withMessage('CGST rate must be between 0 and 100'),
  body('items.*.sgst_rate').optional().isFloat({ min: 0, max: 100 }).withMessage('SGST rate must be between 0 and 100'),
  body('items.*.igst_rate').optional().isFloat({ min: 0, max: 100 }).withMessage('IGST rate must be between 0 and 100'),
  body('items.*.size').optional().trim()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.error('Material receipt validation errors:', errors.array());
      console.error('Request body:', req.body);
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      po_id,
      received_date,
      delivery_date,
      supplier_delivery_note,
      vehicle_number,
      driver_name,
      condition_status,
      notes,
      delivery_notes,
      warehouse_id,
      items
    } = req.body;

    const userId = req.user.user_id;

    // Check if PO exists and is placed
    const po = await PurchaseOrder.findByPk(po_id, {
      include: [
        { model: Project, as: 'project' },
        { model: Supplier, as: 'supplier' },
        { 
          model: PurchaseOrderItem, 
          as: 'items',
          include: [
            { model: ItemMaster, as: 'item' },
            { model: Unit, as: 'unit' }
          ]
        }
      ]
    });

    if (!po) {
      return res.status(404).json({ message: 'Purchase Order not found' });
    }

    if (po.status !== 'PLACED' && po.status !== 'APPROVED') {
      return res.status(400).json({ message: 'Purchase Order must be approved or placed to create material receipt' });
    }

    // Check if material receipt already exists for this PO
    const existingReceipt = await MaterialReceipt.findOne({
      where: { po_id: po_id }
    });

    if (existingReceipt) {
      return res.status(400).json({ message: 'Material receipt already exists for this PO' });
    }

    // Get a default project if PO doesn't have one
    let projectId = po.project_id;
    if (!projectId) {
      const defaultProject = await Project.findOne({ 
        where: { status: 'ACTIVE' },
        order: [['project_id', 'ASC']]
      });
      projectId = defaultProject ? defaultProject.project_id : 1;
    }

    // Create material receipt
    const receipt = await MaterialReceipt.create({
      po_id,
      project_id: projectId,
      received_date,
      delivery_date,
      received_by_user_id: userId,
      supplier_delivery_note,
      vehicle_number,
      driver_name,
      condition_status: condition_status || 'GOOD',
      status: 'PENDING',
      notes,
      delivery_notes,
      warehouse_id,
      total_items: 0
    });

    // Create receipt items from the request data
    const receiptItems = [];
    for (const item of items) {
      // Find the corresponding PO item to get GST values
      const poItem = po.items.find(poItem => poItem.po_item_id === item.po_item_id);
      
      // Calculate GST amounts
      const totalPrice = item.unit_price * item.quantity_received;
      const cgstRate = item.cgst_rate !== undefined ? item.cgst_rate : (poItem ? poItem.cgst_rate : 0);
      const sgstRate = item.sgst_rate !== undefined ? item.sgst_rate : (poItem ? poItem.sgst_rate : 0);
      const igstRate = item.igst_rate !== undefined ? item.igst_rate : (poItem ? poItem.igst_rate : 0);
      
      const cgstAmount = (totalPrice * cgstRate) / 100;
      const sgstAmount = (totalPrice * sgstRate) / 100;
      const igstAmount = (totalPrice * igstRate) / 100;
      
      const receiptItem = await MaterialReceiptItem.create({
        receipt_id: receipt.receipt_id,
        po_item_id: item.po_item_id,
        item_id: item.item_id,
        quantity_received: item.quantity_received,
        unit_id: item.unit_id,
        unit_price: item.unit_price,
        total_price: totalPrice,
        condition_status: item.condition_status || 'GOOD',
        batch_number: item.batch_number,
        expiry_date: item.expiry_date,
        notes: item.notes,
        delivery_status: 'PENDING',
        delivery_quantity: 0,
        delivery_condition: 'GOOD',
        cgst_rate: cgstRate,
        sgst_rate: sgstRate,
        igst_rate: igstRate,
        cgst_amount: cgstAmount,
        sgst_amount: sgstAmount,
        igst_amount: igstAmount,
        size: item.size || (poItem ? poItem.size : null)
      });
      receiptItems.push(receiptItem);
    }

    // Update receipt total items count
    await receipt.update({
      total_items: receiptItems.length
    });

    res.status(201).json({ 
      message: 'Material receipt created successfully',
      receipt: {
        ...receipt.toJSON(),
        items: receiptItems
      }
    });
  } catch (error) {
    console.error('Create material receipt error:', error);
    res.status(500).json({ message: 'Failed to create material receipt' });
  }
});

// =====================================================
// UPDATE MATERIAL RECEIPT (When materials are received)
// =====================================================

// Update material receipt with received quantities
router.put('/:id/receive', authenticateToken, authorizeRoles('Admin', 'Project Manager', 'Project On-site Team', 'Inventory Manager'), [
  body('items').isArray({ min: 1 }).withMessage('At least one item is required'),
  body('items.*.receipt_item_id').isInt().withMessage('Receipt item ID must be an integer'),
  body('items.*.quantity_actually_received').isInt({ min: 0 }).withMessage('Quantity received must be a non-negative integer'),
  body('items.*.received_condition').isIn(['GOOD', 'DAMAGED', 'PARTIAL', 'REJECTED']).withMessage('Invalid received condition'),
  body('items.*.received_notes').optional().trim(),
  body('notes').optional().trim()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const { items, notes } = req.body;
    const userId = req.user.user_id;

    // Find the receipt
    const receipt = await MaterialReceipt.findByPk(id);
    if (!receipt) {
      return res.status(404).json({ message: 'Material receipt not found' });
    }

    if (receipt.status !== 'PENDING') {
      return res.status(400).json({ message: 'Receipt is not in pending status' });
    }

    // Update each item with received quantities
    for (const item of items) {
      await MaterialReceiptItem.update({
        quantity_actually_received: item.quantity_actually_received,
        received_condition: item.received_condition,
        received_notes: item.received_notes
      }, {
        where: {
          receipt_item_id: item.receipt_item_id,
          receipt_id: id
        }
      });
    }

    // Update receipt status to RECEIVED (not COMPLETED - inventory update happens only on verification)
    await receipt.update({
      status: 'RECEIVED',
      notes: notes || receipt.notes
    });

    res.json({ message: 'Material receipt updated successfully' });
  } catch (error) {
    console.error('Update material receipt error:', error);
    res.status(500).json({ message: 'Failed to update material receipt' });
  }
});

// =====================================================
// COMPLETE MATERIAL RECEIPT (Update inventory)
// =====================================================

// Complete material receipt and update inventory
router.put('/:id/complete', authenticateToken, authorizeRoles('Admin', 'Project Manager', 'Inventory Manager'), [
  body('completion_notes').optional().trim()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const { completion_notes } = req.body;
    const userId = req.user.user_id;

    // Find the receipt with items
    const receipt = await MaterialReceipt.findByPk(id, {
      include: [
        { model: PurchaseOrder, as: 'purchaseOrder' },
        { model: Project, as: 'project' },
        { 
          model: MaterialReceiptItem, 
          as: 'items',
          include: [
            { model: ItemMaster, as: 'item' },
            { model: Unit, as: 'unit' }
          ]
        }
      ]
    });

    if (!receipt) {
      return res.status(404).json({ message: 'Material receipt not found' });
    }

    if (receipt.status !== 'RECEIVED') {
      return res.status(400).json({ message: 'Receipt must be received before completion' });
    }

    // Update inventory for each item
    for (const item of receipt.items) {
      if (item.quantity_actually_received > 0) {
        // Find or create material record
        let material = await Material.findOne({
          where: {
            item_id: item.item_id,
            project_id: receipt.project_id || null,
            warehouse_id: receipt.warehouse_id || null
          }
        });

        if (!material) {
          // Create new material record
          material = await Material.create({
            item_id: item.item_id,
            project_id: receipt.project_id || null,
            warehouse_id: receipt.warehouse_id || null,
            name: item.item.item_name,
            item_code: item.item.item_code,
            unit: item.unit.unit_symbol,
            cost_per_unit: item.unit_price,
            stock_qty: item.quantity_actually_received,
            status: 'ACTIVE'
          });
        } else {
          // Update existing material
          await material.update({
            stock_qty: material.stock_qty + item.quantity_actually_received,
            cost_per_unit: item.unit_price
          });
        }

        // Create inventory history entry
        await InventoryHistory.create({
          material_id: material.material_id,
          project_id: receipt.project_id || null,
          transaction_type: 'PURCHASE',
          transaction_id: item.receipt_item_id,
          quantity_change: item.quantity_actually_received,
          quantity_before: material.stock_qty - item.quantity_actually_received,
          quantity_after: material.stock_qty,
          reference_number: receipt.receipt_number,
          description: `Material received from PO: ${receipt.purchaseOrder?.po_number || 'N/A'}`,
          performed_by_user_id: userId,
          receipt_id: receipt.receipt_id
        });
      }
    }

    // Update receipt status to COMPLETED
    await receipt.update({
      status: 'COMPLETED',
      notes: completion_notes || receipt.notes
    });

    res.json({ message: 'Material receipt completed and inventory updated successfully' });
  } catch (error) {
    console.error('Complete material receipt error:', error);
    res.status(500).json({ message: 'Failed to complete material receipt' });
  }
});

// =====================================================
// UTILITY ROUTES
// =====================================================

// Get material receipts by PO ID
router.get('/po/:poId', authenticateToken, async (req, res) => {
  try {
    const { poId } = req.params;

    const receipts = await MaterialReceipt.findAll({
      where: { po_id: poId },
      include: [
        { model: Project, as: 'project', attributes: ['name'] },
        { model: User, as: 'receivedBy', attributes: ['name', 'email'] },
        { 
          model: MaterialReceiptItem, 
          as: 'items',
          include: [
            { model: ItemMaster, as: 'item', attributes: ['item_name', 'item_code'] },
            { model: Unit, as: 'unit', attributes: ['unit_name', 'unit_symbol'] }
          ]
        }
      ],
      order: [['created_at', 'DESC']]
    });

    res.json({ receipts });
  } catch (error) {
    console.error('Get receipts by PO error:', error);
    res.status(500).json({ message: 'Failed to fetch receipts for PO' });
  }
});

// Get material receipt statistics
router.get('/stats/overview', authenticateToken, async (req, res) => {
  try {
    const { project_id, start_date, end_date } = req.query;

    const whereClause = {};
    if (project_id) whereClause.project_id = project_id;
    if (start_date && end_date) {
      whereClause.received_date = {
        [Op.between]: [start_date, end_date]
      };
    }

    const stats = await MaterialReceipt.findAll({
      where: whereClause,
      attributes: [
        'status',
        [MaterialReceipt.sequelize.fn('COUNT', MaterialReceipt.sequelize.col('receipt_id')), 'count']
      ],
      group: ['status'],
      raw: true
    });

    const totalReceipts = await MaterialReceipt.count({ where: whereClause });
    const totalValue = await MaterialReceiptItem.sum('total_price', {
      include: [{
        model: MaterialReceipt,
        as: 'receipt',
        where: whereClause
      }]
    });

    res.json({
      statusBreakdown: stats,
      totalReceipts,
      totalValue: totalValue || 0
    });
  } catch (error) {
    console.error('Get receipt stats error:', error);
    res.status(500).json({ message: 'Failed to fetch receipt statistics' });
  }
});

// =====================================================
// VERIFY MATERIAL RECEIPT
// =====================================================

// Verify Material Receipt (triggers inventory update)
router.post('/:id/verify', authenticateToken, authorizeRoles('Admin', 'Project Manager', 'Store Manager', 'Inventory Manager'), [
  body('verification_notes').optional().trim(),
  body('items').isArray({ min: 1 }).withMessage('At least one item is required'),
  body('items.*.receipt_item_id').isInt().withMessage('Receipt item ID must be an integer'),
  body('items.*.verified_quantity').isInt({ min: 0 }).withMessage('Verified quantity must be a non-negative integer'),
  body('items.*.verification_notes').optional().trim()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const { verification_notes, items } = req.body;
    const userId = req.user.user_id;

    // Find the receipt
    const receipt = await MaterialReceipt.findByPk(id, {
      include: [
        { model: Project, as: 'project' },
        { model: PurchaseOrder, as: 'purchaseOrder' },
        { 
          model: MaterialReceiptItem, 
          as: 'items',
          include: [
            { model: ItemMaster, as: 'item' },
            { model: Unit, as: 'unit' }
          ]
        }
      ]
    });

    if (!receipt) {
      return res.status(404).json({ message: 'Material receipt not found' });
    }

    if (receipt.status !== 'PENDING') {
      return res.status(400).json({ message: 'Only pending receipts can be verified' });
    }

    // Update receipt items with verification data
    for (const itemData of items) {
      const receiptItem = receipt.items.find(item => item.receipt_item_id === itemData.receipt_item_id);
      if (receiptItem) {
        await receiptItem.update({
          verified_by_user_id: userId,
          verified_at: new Date(),
          verification_notes: itemData.verification_notes,
          delivery_quantity: itemData.verified_quantity,
          delivery_status: 'VERIFIED'
        });
      }
    }

    // Update receipt status to APPROVED
    await receipt.update({
      status: 'APPROVED',
      verified_by_user_id: userId,
      verified_at: new Date(),
      verification_notes: verification_notes
    });

    // Now trigger inventory updates
    for (const item of receipt.items) {
      const itemData = items.find(i => i.receipt_item_id === item.receipt_item_id);
      if (itemData && itemData.verified_quantity > 0) {
        // Find or create material record
        let material = await Material.findOne({
          where: {
            item_id: item.item_id,
            project_id: receipt.project_id,
            warehouse_id: receipt.warehouse_id || null
          }
        });

        if (material) {
          // Update existing material
          await material.update({
            stock_qty: material.stock_qty + itemData.verified_quantity,
            cost_per_unit: item.unit_price,
            updated_at: new Date()
          });
        } else {
          // Create new material record
          material = await Material.create({
            item_id: item.item_id,
            project_id: receipt.project_id,
            warehouse_id: receipt.warehouse_id || null,
            name: item.item.item_name,
            item_code: item.item.item_code,
            category: item.item.category?.category_name || 'General',
            brand: item.item.brand?.brand_name || 'Unknown',
            unit: item.unit.unit_symbol,
            cost_per_unit: item.unit_price,
            stock_qty: itemData.verified_quantity,
            status: 'ACTIVE'
          });
        }

        // Create inventory history entry
        await InventoryHistory.create({
          material_id: material.material_id,
          project_id: receipt.project_id,
          transaction_type: 'PURCHASE',
          transaction_id: item.receipt_item_id,
          quantity_change: itemData.verified_quantity,
          quantity_before: material.stock_qty - itemData.verified_quantity,
          quantity_after: material.stock_qty,
          reference_number: receipt.receipt_number,
          description: `Material verified and received from PO: ${receipt.purchaseOrder?.po_number}`,
          performed_by_user_id: userId,
          receipt_id: receipt.receipt_id
        });
      }
    }

    res.json({ 
      message: 'Material receipt verified successfully and inventory updated',
      receipt: receipt
    });
  } catch (error) {
    console.error('Verify material receipt error:', error);
    res.status(500).json({ message: 'Failed to verify material receipt' });
  }
});

module.exports = router;