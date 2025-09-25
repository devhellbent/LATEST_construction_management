const express = require('express');
const { body, validationResult, query } = require('express-validator');
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
  SupplierLedger
} = require('../../models');
const { authenticateToken, authorizeRoles } = require('../../middleware/auth');

const router = express.Router();

// =====================================================
// MATERIAL RECEIPT ROUTES
// =====================================================

// Get all Material Receipts with pagination and filtering
router.get('/', authenticateToken, [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('project_id').optional().isInt().withMessage('Project ID must be an integer'),
  query('po_id').optional().isInt().withMessage('PO ID must be an integer'),
  query('condition_status').optional().isIn(['GOOD', 'DAMAGED', 'PARTIAL', 'REJECTED']),
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
    const { project_id, po_id, condition_status, date_from, date_to, search } = req.query;

    // Build where clause
    const whereClause = {};
    if (project_id) whereClause.project_id = project_id;
    if (po_id) whereClause.po_id = po_id;
    if (condition_status) whereClause.condition_status = condition_status;
    
    if (date_from || date_to) {
      whereClause.received_date = {};
      if (date_from) whereClause.received_date[Op.gte] = date_from;
      if (date_to) whereClause.received_date[Op.lte] = date_to;
    }
    
    if (search) {
      whereClause[Op.or] = [
        { receipt_number: { [Op.like]: `%${search}%` } },
        { supplier_delivery_note: { [Op.like]: `%${search}%` } },
        { vehicle_number: { [Op.like]: `%${search}%` } },
        { driver_name: { [Op.like]: `%${search}%` } },
        { notes: { [Op.like]: `%${search}%` } }
      ];
    }

    const { count, rows: receipts } = await MaterialReceipt.findAndCountAll({
      where: whereClause,
      include: [
        { model: Project, as: 'project', attributes: ['name'] },
        { model: PurchaseOrder, as: 'purchaseOrder', attributes: ['po_number', 'supplier_id'] },
        { model: User, as: 'receivedBy', attributes: ['name', 'email'] },
        { model: MaterialReceiptItem, as: 'items', include: [
          { model: ItemMaster, as: 'item', attributes: ['item_name', 'item_code'] },
          { model: Unit, as: 'unit', attributes: ['unit_name', 'unit_symbol'] },
          { model: PurchaseOrderItem, as: 'poItem', attributes: ['quantity_ordered', 'unit_price'] }
        ]}
      ],
      limit,
      offset,
      order: [['created_at', 'DESC']]
    });

    res.json({
      receipts,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(count / limit),
        totalItems: count,
        itemsPerPage: limit
      }
    });
  } catch (error) {
    console.error('Get Material Receipts error:', error);
    res.status(500).json({ message: 'Failed to fetch Material Receipts' });
  }
});

// Get Material Receipt by ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const receipt = await MaterialReceipt.findByPk(req.params.id, {
      include: [
        { model: Project, as: 'project', attributes: ['name', 'description'] },
        { model: PurchaseOrder, as: 'purchaseOrder', attributes: ['po_number', 'po_date', 'supplier_id'] },
        { model: User, as: 'receivedBy', attributes: ['name', 'email', 'role'] },
        { model: MaterialReceiptItem, as: 'items', include: [
          { model: ItemMaster, as: 'item', attributes: ['item_name', 'item_code', 'description', 'specifications'] },
          { model: Unit, as: 'unit', attributes: ['unit_name', 'unit_symbol'] },
          { model: PurchaseOrderItem, as: 'poItem', attributes: ['quantity_ordered', 'unit_price', 'total_price'] }
        ]}
      ]
    });

    if (!receipt) {
      return res.status(404).json({ message: 'Material Receipt not found' });
    }

    res.json({ receipt });
  } catch (error) {
    console.error('Get Material Receipt error:', error);
    res.status(500).json({ message: 'Failed to fetch Material Receipt' });
  }
});

// Create Material Receipt
router.post('/', authenticateToken, authorizeRoles('Admin', 'Project Manager', 'Project On-site Team'), [
  body('po_id').isInt().withMessage('PO ID must be an integer'),
  body('received_date').isISO8601().withMessage('Received date must be a valid date'),
  body('supplier_delivery_note').optional().trim(),
  body('vehicle_number').optional().trim(),
  body('driver_name').optional().trim(),
  body('condition_status').optional().isIn(['GOOD', 'DAMAGED', 'PARTIAL', 'REJECTED']),
  body('notes').optional().trim(),
  body('items').isArray({ min: 1 }).withMessage('At least one item is required'),
  body('items.*.po_item_id').isInt().withMessage('PO Item ID must be an integer'),
  body('items.*.quantity_received').isInt({ min: 1 }).withMessage('Quantity received must be a positive integer'),
  body('items.*.unit_price').isFloat({ min: 0 }).withMessage('Unit price must be a positive number'),
  body('items.*.condition_status').optional().isIn(['GOOD', 'DAMAGED', 'REJECTED']),
  body('items.*.batch_number').optional().trim(),
  body('items.*.expiry_date').optional().isISO8601().withMessage('Expiry date must be a valid date'),
  body('items.*.notes').optional().trim()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { po_id, received_date, supplier_delivery_note, vehicle_number, driver_name, condition_status, notes, items } = req.body;

    // Verify PO exists and get project_id
    const purchaseOrder = await PurchaseOrder.findByPk(po_id);
    if (!purchaseOrder) {
      return res.status(404).json({ message: 'Purchase Order not found' });
    }

    // Calculate total items
    const totalItems = items.length;

    // Create Material Receipt
    const receipt = await MaterialReceipt.create({
      po_id,
      project_id: purchaseOrder.project_id,
      received_date,
      received_by_user_id: req.user.user_id,
      supplier_delivery_note,
      vehicle_number,
      driver_name,
      condition_status: condition_status || 'GOOD',
      total_items: totalItems,
      notes
    });

    // Create Material Receipt Items
    const receiptItems = await Promise.all(
      items.map(async (item) => {
        const { po_item_id, quantity_received, unit_price, condition_status, batch_number, expiry_date, notes } = item;
        
        // Get PO item details
        const poItem = await PurchaseOrderItem.findByPk(po_item_id);
        if (!poItem) {
          throw new Error(`PO Item ${po_item_id} not found`);
        }

        const total_price = unit_price * quantity_received;

        const receiptItem = await MaterialReceiptItem.create({
          receipt_id: receipt.receipt_id,
          po_item_id,
          item_id: poItem.item_id,
          quantity_received,
          unit_id: poItem.unit_id,
          unit_price,
          total_price,
          condition_status: condition_status || 'GOOD',
          batch_number,
          expiry_date,
          notes
        });

        // Update PO item quantity received
        await poItem.update({
          quantity_received: poItem.quantity_received + quantity_received
        });

        return receiptItem;
      })
    );

    // Update PO status based on receipt
    const allPoItems = await PurchaseOrderItem.findAll({
      where: { po_id }
    });

    const totalOrdered = allPoItems.reduce((sum, item) => sum + item.quantity_ordered, 0);
    const totalReceived = allPoItems.reduce((sum, item) => sum + item.quantity_received, 0);

    let poStatus = 'PARTIALLY_RECEIVED';
    if (totalReceived >= totalOrdered) {
      poStatus = 'FULLY_RECEIVED';
    }

    await purchaseOrder.update({
      status: poStatus,
      actual_delivery_date: received_date
    });

    // Update supplier ledger for material receipt
    const totalReceiptAmount = receiptItems.reduce((sum, item) => sum + item.total_price, 0);
    
    // Create supplier ledger entry for material receipt
    await SupplierLedger.create({
      supplier_id: purchaseOrder.supplier_id,
      po_id: po_id,
      transaction_type: 'MATERIAL_RECEIPT',
      transaction_date: received_date,
      reference_number: receipt.receipt_number,
      description: `Material received for PO: ${purchaseOrder.po_number}`,
      debit_amount: 0, // No additional charge for receipt
      credit_amount: 0, // No payment made yet
      balance: 0, // Balance remains same
      payment_status: 'PENDING',
      due_date: purchaseOrder.po_date ? new Date(new Date(purchaseOrder.po_date).getTime() + 30 * 24 * 60 * 60 * 1000) : null, // 30 days from PO date
      created_by_user_id: req.user.user_id
    });

    // Fetch the created receipt with associations
    const createdReceipt = await MaterialReceipt.findByPk(receipt.receipt_id, {
      include: [
        { model: Project, as: 'project', attributes: ['name'] },
        { model: PurchaseOrder, as: 'purchaseOrder', attributes: ['po_number'] },
        { model: User, as: 'receivedBy', attributes: ['name', 'email'] },
        { model: MaterialReceiptItem, as: 'items', include: [
          { model: ItemMaster, as: 'item', attributes: ['item_name', 'item_code'] },
          { model: Unit, as: 'unit', attributes: ['unit_name', 'unit_symbol'] }
        ]}
      ]
    });

    res.status(201).json({
      message: 'Material Receipt created successfully',
      receipt: createdReceipt
    });
  } catch (error) {
    console.error('Create Material Receipt error:', error);
    res.status(500).json({ message: 'Failed to create Material Receipt' });
  }
});

// Update Material Receipt
router.put('/:id', authenticateToken, authorizeRoles('Admin', 'Project Manager', 'Project On-site Team'), [
  body('received_date').optional().isISO8601().withMessage('Received date must be a valid date'),
  body('supplier_delivery_note').optional().trim(),
  body('vehicle_number').optional().trim(),
  body('driver_name').optional().trim(),
  body('condition_status').optional().isIn(['GOOD', 'DAMAGED', 'PARTIAL', 'REJECTED']),
  body('notes').optional().trim()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const receipt = await MaterialReceipt.findByPk(req.params.id);
    if (!receipt) {
      return res.status(404).json({ message: 'Material Receipt not found' });
    }

    await receipt.update(req.body);

    res.json({
      message: 'Material Receipt updated successfully',
      receipt
    });
  } catch (error) {
    console.error('Update Material Receipt error:', error);
    res.status(500).json({ message: 'Failed to update Material Receipt' });
  }
});

// Delete Material Receipt
router.delete('/:id', authenticateToken, authorizeRoles('Admin', 'Project Manager'), async (req, res) => {
  try {
    const receipt = await MaterialReceipt.findByPk(req.params.id);
    if (!receipt) {
      return res.status(404).json({ message: 'Material Receipt not found' });
    }

    // Reverse PO item quantities
    const receiptItems = await MaterialReceiptItem.findAll({
      where: { receipt_id: receipt.receipt_id }
    });

    for (const item of receiptItems) {
      const poItem = await PurchaseOrderItem.findByPk(item.po_item_id);
      if (poItem) {
        await poItem.update({
          quantity_received: poItem.quantity_received - item.quantity_received
        });
      }
    }

    await receipt.destroy();

    res.json({ message: 'Material Receipt deleted successfully' });
  } catch (error) {
    console.error('Delete Material Receipt error:', error);
    res.status(500).json({ message: 'Failed to delete Material Receipt' });
  }
});

// =====================================================
// MATERIAL RECEIPT ITEMS ROUTES
// =====================================================

// Add item to Material Receipt
router.post('/:id/items', authenticateToken, authorizeRoles('Admin', 'Project Manager', 'Project On-site Team'), [
  body('po_item_id').isInt().withMessage('PO Item ID must be an integer'),
  body('quantity_received').isInt({ min: 1 }).withMessage('Quantity received must be a positive integer'),
  body('unit_price').isFloat({ min: 0 }).withMessage('Unit price must be a positive number'),
  body('condition_status').optional().isIn(['GOOD', 'DAMAGED', 'REJECTED']),
  body('batch_number').optional().trim(),
  body('expiry_date').optional().isISO8601().withMessage('Expiry date must be a valid date'),
  body('notes').optional().trim()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const receipt = await MaterialReceipt.findByPk(req.params.id);
    if (!receipt) {
      return res.status(404).json({ message: 'Material Receipt not found' });
    }

    const { po_item_id, quantity_received, unit_price, condition_status, batch_number, expiry_date, notes } = req.body;

    // Get PO item details
    const poItem = await PurchaseOrderItem.findByPk(po_item_id);
    if (!poItem) {
      return res.status(404).json({ message: 'PO Item not found' });
    }

    const total_price = unit_price * quantity_received;

    const receiptItem = await MaterialReceiptItem.create({
      receipt_id: receipt.receipt_id,
      po_item_id,
      item_id: poItem.item_id,
      quantity_received,
      unit_id: poItem.unit_id,
      unit_price,
      total_price,
      condition_status: condition_status || 'GOOD',
      batch_number,
      expiry_date,
      notes
    });

    // Update PO item quantity received
    await poItem.update({
      quantity_received: poItem.quantity_received + quantity_received
    });

    // Update receipt total items
    await receipt.update({
      total_items: receipt.total_items + 1
    });

    res.status(201).json({
      message: 'Item added to Material Receipt successfully',
      receiptItem
    });
  } catch (error) {
    console.error('Add receipt item error:', error);
    res.status(500).json({ message: 'Failed to add item to Material Receipt' });
  }
});

// Update Material Receipt item
router.put('/:id/items/:itemId', authenticateToken, authorizeRoles('Admin', 'Project Manager', 'Project On-site Team'), [
  body('quantity_received').optional().isInt({ min: 1 }).withMessage('Quantity received must be a positive integer'),
  body('unit_price').optional().isFloat({ min: 0 }).withMessage('Unit price must be a positive number'),
  body('condition_status').optional().isIn(['GOOD', 'DAMAGED', 'REJECTED']),
  body('batch_number').optional().trim(),
  body('expiry_date').optional().isISO8601().withMessage('Expiry date must be a valid date'),
  body('notes').optional().trim()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const receipt = await MaterialReceipt.findByPk(req.params.id);
    if (!receipt) {
      return res.status(404).json({ message: 'Material Receipt not found' });
    }

    const receiptItem = await MaterialReceiptItem.findOne({
      where: { receipt_item_id: req.params.itemId, receipt_id: req.params.id }
    });

    if (!receiptItem) {
      return res.status(404).json({ message: 'Receipt item not found' });
    }

    const oldQuantity = receiptItem.quantity_received;
    const updateData = { ...req.body };
    
    if (updateData.unit_price && updateData.quantity_received) {
      updateData.total_price = updateData.unit_price * updateData.quantity_received;
    }

    await receiptItem.update(updateData);

    // Update PO item quantity if quantity changed
    if (updateData.quantity_received && updateData.quantity_received !== oldQuantity) {
      const poItem = await PurchaseOrderItem.findByPk(receiptItem.po_item_id);
      if (poItem) {
        const quantityDifference = updateData.quantity_received - oldQuantity;
        await poItem.update({
          quantity_received: poItem.quantity_received + quantityDifference
        });
      }
    }

    res.json({
      message: 'Receipt item updated successfully',
      receiptItem
    });
  } catch (error) {
    console.error('Update receipt item error:', error);
    res.status(500).json({ message: 'Failed to update receipt item' });
  }
});

// Delete Material Receipt item
router.delete('/:id/items/:itemId', authenticateToken, authorizeRoles('Admin', 'Project Manager'), async (req, res) => {
  try {
    const receipt = await MaterialReceipt.findByPk(req.params.id);
    if (!receipt) {
      return res.status(404).json({ message: 'Material Receipt not found' });
    }

    const receiptItem = await MaterialReceiptItem.findOne({
      where: { receipt_item_id: req.params.itemId, receipt_id: req.params.id }
    });

    if (!receiptItem) {
      return res.status(404).json({ message: 'Receipt item not found' });
    }

    // Update PO item quantity received
    const poItem = await PurchaseOrderItem.findByPk(receiptItem.po_item_id);
    if (poItem) {
      await poItem.update({
        quantity_received: poItem.quantity_received - receiptItem.quantity_received
      });
    }

    await receiptItem.destroy();

    // Update receipt total items
    await receipt.update({
      total_items: receipt.total_items - 1
    });

    res.json({ message: 'Receipt item deleted successfully' });
  } catch (error) {
    console.error('Delete receipt item error:', error);
    res.status(500).json({ message: 'Failed to delete receipt item' });
  }
});

// Get PO items available for receipt
router.get('/po/:poId/available-items', authenticateToken, async (req, res) => {
  try {
    const { poId } = req.params;

    const availableItems = await PurchaseOrderItem.findAll({
      where: { 
        po_id: poId,
        quantity_pending: { [Op.gt]: 0 }
      },
      include: [
        { model: ItemMaster, as: 'item', attributes: ['item_name', 'item_code', 'description'] },
        { model: Unit, as: 'unit', attributes: ['unit_name', 'unit_symbol'] }
      ]
    });

    res.json({ availableItems });
  } catch (error) {
    console.error('Get available PO items error:', error);
    res.status(500).json({ message: 'Failed to fetch available PO items' });
  }
});

module.exports = router;
