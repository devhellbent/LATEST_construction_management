const express = require('express');
const { body, validationResult, query } = require('express-validator');
const { Op } = require('sequelize');
const { 
  PurchaseOrder, 
  PurchaseOrderItem, 
  Project, 
  User, 
  Supplier,
  ItemMaster, 
  Unit,
  MaterialRequirementRequest,
  MrrItem,
  MaterialReceipt,
  MaterialReceiptItem,
  SupplierLedger
} = require('../../models');
const { authenticateToken, authorizeRoles } = require('../../middleware/auth');

// WhatsApp notification function
const sendWhatsAppNotification = async (purchaseOrder) => {
  try {
    const supplier = purchaseOrder.supplier;
    if (!supplier || !supplier.phone) {
      throw new Error('Supplier phone number not available');
    }

    // Format phone number (remove any non-digit characters and add country code if needed)
    let phoneNumber = supplier.phone.replace(/\D/g, '');
    if (!phoneNumber.startsWith('91') && phoneNumber.length === 10) {
      phoneNumber = '91' + phoneNumber;
    }

    // Create PO details message
    let message = `🏗️ *NEW PURCHASE ORDER*\n\n`;
    message += `📋 *PO Number:* ${purchaseOrder.po_number}\n`;
    message += `🏢 *Project:* ${purchaseOrder.project.name}\n`;
    message += `📅 *PO Date:* ${new Date(purchaseOrder.po_date).toLocaleDateString()}\n`;
    message += `📦 *Expected Delivery:* ${purchaseOrder.expected_delivery_date ? new Date(purchaseOrder.expected_delivery_date).toLocaleDateString() : 'Not specified'}\n`;
    message += `💰 *Total Amount:* ₹${purchaseOrder.total_amount.toLocaleString()}\n\n`;
    
    message += `📝 *ITEMS REQUIRED:*\n`;
    purchaseOrder.items.forEach((item, index) => {
      message += `${index + 1}. ${item.item.item_name} (${item.item.item_code})\n`;
      message += `   Quantity: ${item.quantity_ordered} ${item.unit.unit_symbol}\n`;
      message += `   Rate: ₹${item.unit_price}/unit\n`;
      message += `   Total: ₹${item.total_price.toLocaleString()}\n\n`;
    });

    message += `📋 *TERMS & CONDITIONS:*\n`;
    message += `• Payment Terms: ${purchaseOrder.payment_terms || 'As per agreement'}\n`;
    message += `• Delivery Terms: ${purchaseOrder.delivery_terms || 'As per agreement'}\n\n`;
    
    if (purchaseOrder.notes) {
      message += `📝 *NOTES:* ${purchaseOrder.notes}\n\n`;
    }

    message += `Please confirm receipt of this order and provide delivery timeline.\n\n`;
    message += `Thank you for your business! 🙏`;

    // For now, we'll log the message. In production, you would integrate with WhatsApp Business API
    console.log(`\n=== WHATSAPP MESSAGE TO SUPPLIER ===`);
    console.log(`To: ${phoneNumber}`);
    console.log(`Supplier: ${supplier.supplier_name}`);
    console.log(`Message:\n${message}`);
    console.log(`=====================================\n`);

    // TODO: Integrate with actual WhatsApp Business API
    // Example with WhatsApp Business API:
    // const response = await fetch('https://graph.facebook.com/v17.0/YOUR_PHONE_NUMBER_ID/messages', {
    //   method: 'POST',
    //   headers: {
    //     'Authorization': `Bearer ${WHATSAPP_ACCESS_TOKEN}`,
    //     'Content-Type': 'application/json',
    //   },
    //   body: JSON.stringify({
    //     messaging_product: 'whatsapp',
    //     to: phoneNumber,
    //     type: 'text',
    //     text: { body: message }
    //   })
    // });

    return { success: true, message: 'WhatsApp notification sent successfully' };
  } catch (error) {
    console.error('WhatsApp notification error:', error);
    throw error;
  }
};

const router = express.Router();

// =====================================================
// PURCHASE ORDER ROUTES
// =====================================================

// Get all Purchase Orders with pagination and filtering
router.get('/', authenticateToken, [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('status').optional().custom((value) => {
    if (Array.isArray(value)) {
      // Handle array of statuses
      const validStatuses = ['DRAFT', 'APPROVED', 'PLACED', 'ACKNOWLEDGED', 'PARTIALLY_RECEIVED', 'FULLY_RECEIVED', 'CANCELLED', 'CLOSED'];
      for (const status of value) {
        if (!validStatuses.includes(status)) {
          throw new Error(`Invalid status: ${status}`);
        }
      }
      return true;
    } else {
      // Handle single status
      const validStatuses = ['DRAFT', 'APPROVED', 'PLACED', 'ACKNOWLEDGED', 'PARTIALLY_RECEIVED', 'FULLY_RECEIVED', 'CANCELLED', 'CLOSED'];
      if (!validStatuses.includes(value)) {
        throw new Error(`Invalid status: ${value}`);
      }
      return true;
    }
  }),
  query('project_id').custom((value) => {
    if (value === 'null' || value === null || value === undefined || value === '') {
      return true; // Allow null/empty values
    }
    if (!Number.isInteger(Number(value))) {
      throw new Error('Project ID must be an integer');
    }
    return true;
  }),
  query('supplier_id').optional().isInt().withMessage('Supplier ID must be an integer'),
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
    const { status, project_id, supplier_id, search } = req.query;

    // Build where clause
    const whereClause = {};
    if (status) {
      if (Array.isArray(status)) {
        whereClause.status = { [Op.in]: status };
      } else {
        whereClause.status = status;
      }
    }
    if (project_id === 'null') {
      whereClause.project_id = null;
    } else if (project_id) {
      whereClause.project_id = project_id;
    }
    if (supplier_id) whereClause.supplier_id = supplier_id;
    
    if (search) {
      whereClause[Op.or] = [
        { po_number: { [Op.like]: `%${search}%` } },
        { notes: { [Op.like]: `%${search}%` } }
      ];
    }

    const { count, rows: purchaseOrders } = await PurchaseOrder.findAndCountAll({
      where: whereClause,
      include: [
        { model: Project, as: 'project', attributes: ['name'], required: false },
        { model: Supplier, as: 'supplier', attributes: ['supplier_name', 'contact_person'] },
        { model: User, as: 'createdBy', attributes: ['name', 'email'] },
        { model: User, as: 'approvedBy', attributes: ['name', 'email'], required: false },
        { model: MaterialRequirementRequest, as: 'mrr', attributes: ['mrr_number'], required: false },
        { model: PurchaseOrderItem, as: 'items', include: [
          { model: ItemMaster, as: 'item', attributes: ['item_name', 'item_code'] },
          { model: Unit, as: 'unit', attributes: ['unit_name', 'unit_symbol'] }
        ]}
      ],
      limit,
      offset,
      order: [['created_at', 'DESC']]
    });

    res.json({
      purchaseOrders,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(count / limit),
        totalItems: count,
        itemsPerPage: limit
      }
    });
  } catch (error) {
    console.error('Get Purchase Orders error:', error);
    res.status(500).json({ message: 'Failed to fetch Purchase Orders' });
  }
});

// Get Purchase Order by ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const purchaseOrder = await PurchaseOrder.findByPk(req.params.id, {
      include: [
        { model: Project, as: 'project', attributes: ['name', 'description'], required: false },
        { model: Supplier, as: 'supplier', attributes: ['supplier_name', 'contact_person', 'phone', 'email', 'address'] },
        { model: User, as: 'createdBy', attributes: ['name', 'email'] },
        { model: User, as: 'approvedBy', attributes: ['name', 'email'], required: false },
        { model: MaterialRequirementRequest, as: 'mrr', attributes: ['mrr_number', 'request_date'], required: false },
        { model: PurchaseOrderItem, as: 'items', include: [
          { model: ItemMaster, as: 'item', attributes: ['item_name', 'item_code', 'description', 'specifications'] },
          { model: Unit, as: 'unit', attributes: ['unit_name', 'unit_symbol'] }
        ]}
      ]
    });

    if (!purchaseOrder) {
      return res.status(404).json({ message: 'Purchase Order not found' });
    }

    res.json({ purchaseOrder });
  } catch (error) {
    console.error('Get Purchase Order error:', error);
    res.status(500).json({ message: 'Failed to fetch Purchase Order' });
  }
});

// Create Purchase Order from MRR
router.post('/from-mrr/:mrrId', authenticateToken, authorizeRoles('Admin', 'Project Manager'), [
  body('supplier_id').isInt().withMessage('Supplier ID must be an integer'),
  body('expected_delivery_date').optional().isISO8601().withMessage('Expected delivery date must be a valid date'),
  body('payment_terms').optional().trim(),
  body('delivery_terms').optional().trim(),
  body('notes').optional().trim(),
  body('items').isArray({ min: 1 }).withMessage('At least one item is required'),
  body('items.*.item_id').isInt().withMessage('Item ID must be an integer'),
  body('items.*.quantity_ordered').isInt({ min: 1 }).withMessage('Quantity must be a positive integer'),
  body('items.*.unit_id').isInt().withMessage('Unit ID must be an integer'),
  body('items.*.unit_price').isFloat({ min: 0 }).withMessage('Unit price must be a positive number'),
  body('items.*.specifications').optional().trim(),
  body('items.*.notes').optional().trim()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { supplier_id, expected_delivery_date, payment_terms, delivery_terms, notes, items } = req.body;
    const mrrId = req.params.mrrId;

    // Check if MRR exists and is approved
    const mrr = await MaterialRequirementRequest.findByPk(mrrId);
    if (!mrr) {
      return res.status(404).json({ message: 'MRR not found' });
    }

    if (mrr.status !== 'APPROVED') {
      return res.status(400).json({ message: 'Only approved MRRs can be converted to Purchase Orders' });
    }

    // Calculate totals
    let subtotal = 0;
    items.forEach(item => {
      item.total_price = item.unit_price * item.quantity_ordered;
      subtotal += item.total_price;
    });

    const taxAmount = subtotal * 0.18; // Assuming 18% GST
    const totalAmount = subtotal + taxAmount;

    // Generate PO number if not provided
    let poNumber = null;
    if (!poNumber) {
      const lastPO = await PurchaseOrder.findOne({
        where: {
          po_number: {
            [Op.like]: 'PO%'
          }
        },
        order: [['po_id', 'DESC']]
      });
      
      let nextId = 1;
      if (lastPO && lastPO.po_number) {
        const lastId = parseInt(lastPO.po_number.replace('PO', ''));
        nextId = lastId + 1;
      }
      
      poNumber = `PO${nextId.toString().padStart(6, '0')}`;
    }

    // Create Purchase Order
    const purchaseOrder = await PurchaseOrder.create({
      po_number: poNumber,
      mrr_id: mrrId,
      project_id: mrr.project_id,
      supplier_id,
      po_date: new Date(),
      expected_delivery_date,
      status: 'DRAFT',
      subtotal,
      tax_amount: taxAmount,
      total_amount: totalAmount,
      payment_terms,
      delivery_terms,
      created_by_user_id: req.user.user_id,
      notes
    });

    // Create Purchase Order Items
    const poItems = await Promise.all(
      items.map(item => PurchaseOrderItem.create({
        po_id: purchaseOrder.po_id,
        item_id: item.item_id,
        quantity_ordered: item.quantity_ordered,
        unit_id: item.unit_id,
        unit_price: item.unit_price,
        total_price: item.total_price,
        specifications: item.specifications,
        notes: item.notes
      }))
    );

    // Update MRR status
    await mrr.update({ status: 'PROCESSING' });

    // Fetch the created PO with associations
    const createdPO = await PurchaseOrder.findByPk(purchaseOrder.po_id, {
      include: [
        { model: Project, as: 'project', attributes: ['name'] },
        { model: Supplier, as: 'supplier', attributes: ['supplier_name', 'contact_person'] },
        { model: User, as: 'createdBy', attributes: ['name', 'email'] },
        { model: MaterialRequirementRequest, as: 'mrr', attributes: ['mrr_number'] },
        { model: PurchaseOrderItem, as: 'items', include: [
          { model: ItemMaster, as: 'item', attributes: ['item_name', 'item_code'] },
          { model: Unit, as: 'unit', attributes: ['unit_name', 'unit_symbol'] }
        ]}
      ]
    });

    res.status(201).json({
      message: 'Purchase Order created successfully',
      purchaseOrder: createdPO
    });
  } catch (error) {
    console.error('Create Purchase Order error:', error);
    res.status(500).json({ message: 'Failed to create Purchase Order' });
  }
});

// Create standalone Purchase Order
router.post('/', authenticateToken, authorizeRoles('Admin', 'Project Manager'), [
  body('project_id').custom((value) => {
    if (value === null || value === undefined || value === '') {
      return true; // Allow null/empty values
    }
    if (!Number.isInteger(Number(value))) {
      throw new Error('Project ID must be an integer');
    }
    return true;
  }),
  body('supplier_id').isInt().withMessage('Supplier ID must be an integer'),
  body('expected_delivery_date').optional().isISO8601().withMessage('Expected delivery date must be a valid date'),
  body('payment_terms').optional().trim(),
  body('delivery_terms').optional().trim(),
  body('notes').optional().trim(),
  body('items').isArray({ min: 1 }).withMessage('At least one item is required'),
  body('items.*.item_id').isInt().withMessage('Item ID must be an integer'),
  body('items.*.quantity_ordered').isInt({ min: 1 }).withMessage('Quantity must be a positive integer'),
  body('items.*.unit_id').isInt().withMessage('Unit ID must be an integer'),
  body('items.*.unit_price').isFloat({ min: 0 }).withMessage('Unit price must be a positive number'),
  body('items.*.specifications').optional().trim(),
  body('items.*.notes').optional().trim()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { project_id, supplier_id, expected_delivery_date, payment_terms, delivery_terms, notes, items } = req.body;
    
    // Handle optional project_id - convert empty string to null
    const finalProjectId = project_id === '' || project_id === undefined ? null : project_id;

    // Calculate totals
    let subtotal = 0;
    items.forEach(item => {
      item.total_price = item.unit_price * item.quantity_ordered;
      subtotal += item.total_price;
    });

    const taxAmount = subtotal * 0.18; // Assuming 18% GST
    const totalAmount = subtotal + taxAmount;

    // Generate PO number if not provided
    let poNumber = null;
    if (!poNumber) {
      const lastPO = await PurchaseOrder.findOne({
        where: {
          po_number: {
            [Op.like]: 'PO%'
          }
        },
        order: [['po_id', 'DESC']]
      });
      
      let nextId = 1;
      if (lastPO && lastPO.po_number) {
        const lastId = parseInt(lastPO.po_number.replace('PO', ''));
        nextId = lastId + 1;
      }
      
      poNumber = `PO${nextId.toString().padStart(6, '0')}`;
    }

    // Create Purchase Order
    const purchaseOrder = await PurchaseOrder.create({
      po_number: poNumber,
      project_id: finalProjectId,
      supplier_id,
      po_date: new Date(),
      expected_delivery_date,
      status: 'DRAFT',
      subtotal,
      tax_amount: taxAmount,
      total_amount: totalAmount,
      payment_terms,
      delivery_terms,
      created_by_user_id: req.user.user_id,
      notes
    });

    // Create Purchase Order Items
    const poItems = await Promise.all(
      items.map(item => PurchaseOrderItem.create({
        po_id: purchaseOrder.po_id,
        item_id: item.item_id,
        quantity_ordered: item.quantity_ordered,
        unit_id: item.unit_id,
        unit_price: item.unit_price,
        total_price: item.total_price,
        specifications: item.specifications,
        notes: item.notes
      }))
    );

    // Fetch the created PO with associations
    const createdPO = await PurchaseOrder.findByPk(purchaseOrder.po_id, {
      include: [
        { model: Project, as: 'project', attributes: ['name'] },
        { model: Supplier, as: 'supplier', attributes: ['supplier_name', 'contact_person'] },
        { model: User, as: 'createdBy', attributes: ['name', 'email'] },
        { model: PurchaseOrderItem, as: 'items', include: [
          { model: ItemMaster, as: 'item', attributes: ['item_name', 'item_code'] },
          { model: Unit, as: 'unit', attributes: ['unit_name', 'unit_symbol'] }
        ]}
      ]
    });

    res.status(201).json({
      message: 'Purchase Order created successfully',
      purchaseOrder: createdPO
    });
  } catch (error) {
    console.error('Create Purchase Order error:', error);
    res.status(500).json({ message: 'Failed to create Purchase Order' });
  }
});

// Approve Purchase Order (Admin only)
router.patch('/:id/approve', authenticateToken, authorizeRoles('Admin'), async (req, res) => {
  try {
    const purchaseOrder = await PurchaseOrder.findByPk(req.params.id);
    if (!purchaseOrder) {
      return res.status(404).json({ message: 'Purchase Order not found' });
    }

    if (purchaseOrder.status !== 'DRAFT') {
      return res.status(400).json({ message: 'Only draft Purchase Orders can be approved' });
    }

    await purchaseOrder.update({
      status: 'APPROVED',
      approved_by_user_id: req.user.user_id,
      approved_at: new Date()
    });

    res.json({
      message: 'Purchase Order approved successfully',
      purchaseOrder
    });
  } catch (error) {
    console.error('Approve Purchase Order error:', error);
    res.status(500).json({ message: 'Failed to approve Purchase Order' });
  }
});

// Place Order (Send to Supplier via WhatsApp)
router.patch('/:id/place-order', authenticateToken, authorizeRoles('Admin'), async (req, res) => {
  try {
    const purchaseOrder = await PurchaseOrder.findByPk(req.params.id, {
      include: [
        { model: Project, as: 'project', attributes: ['name'] },
        { model: Supplier, as: 'supplier', attributes: ['supplier_name', 'contact_person', 'phone'] },
        { model: PurchaseOrderItem, as: 'items', include: [
          { model: ItemMaster, as: 'item', attributes: ['item_name', 'item_code'] },
          { model: Unit, as: 'unit', attributes: ['unit_name', 'unit_symbol'] }
        ]}
      ]
    });

    if (!purchaseOrder) {
      return res.status(404).json({ message: 'Purchase Order not found' });
    }

    if (purchaseOrder.status !== 'APPROVED') {
      return res.status(400).json({ message: 'Only approved Purchase Orders can be placed' });
    }

    // Update status to PLACED
    await purchaseOrder.update({
      status: 'PLACED',
      placed_at: new Date()
    });

    // Send WhatsApp message to supplier
    try {
      await sendWhatsAppNotification(purchaseOrder);
    } catch (whatsappError) {
      console.error('WhatsApp notification failed:', whatsappError);
      // Don't fail the entire operation if WhatsApp fails
    }

    res.json({
      message: 'Purchase Order placed successfully and supplier notified',
      purchaseOrder
    });
  } catch (error) {
    console.error('Place Order error:', error);
    res.status(500).json({ message: 'Failed to place Purchase Order' });
  }
});

// Update Purchase Order
router.put('/:id', authenticateToken, authorizeRoles('Admin', 'Project Manager'), [
  body('project_id').custom((value) => {
    if (value === null || value === undefined || value === '') {
      return true; // Allow null/empty values
    }
    if (!Number.isInteger(Number(value))) {
      throw new Error('Project ID must be an integer');
    }
    return true;
  }),
  body('supplier_id').optional().isInt().withMessage('Supplier ID must be an integer'),
  body('expected_delivery_date').optional().isISO8601().withMessage('Expected delivery date must be a valid date'),
  body('payment_terms').optional().trim(),
  body('delivery_terms').optional().trim(),
  body('notes').optional().trim()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const purchaseOrder = await PurchaseOrder.findByPk(req.params.id);
    if (!purchaseOrder) {
      return res.status(404).json({ message: 'Purchase Order not found' });
    }

    if (purchaseOrder.status !== 'DRAFT') {
      return res.status(400).json({ message: 'Only draft Purchase Orders can be updated' });
    }

    // Handle optional project_id - convert empty string to null
    const updateData = { ...req.body };
    if (updateData.project_id === '' || updateData.project_id === undefined) {
      updateData.project_id = null;
    }

    await purchaseOrder.update(updateData);

    res.json({
      message: 'Purchase Order updated successfully',
      purchaseOrder
    });
  } catch (error) {
    console.error('Update Purchase Order error:', error);
    res.status(500).json({ message: 'Failed to update Purchase Order' });
  }
});

// Cancel Purchase Order
router.patch('/:id/cancel', authenticateToken, authorizeRoles('Admin', 'Project Manager'), async (req, res) => {
  try {
    const purchaseOrder = await PurchaseOrder.findByPk(req.params.id);
    if (!purchaseOrder) {
      return res.status(404).json({ message: 'Purchase Order not found' });
    }

    if (['CANCELLED', 'CLOSED'].includes(purchaseOrder.status)) {
      return res.status(400).json({ message: 'Purchase Order is already cancelled or closed' });
    }

    await purchaseOrder.update({ status: 'CANCELLED' });

    res.json({
      message: 'Purchase Order cancelled successfully',
      purchaseOrder
    });
  } catch (error) {
    console.error('Cancel Purchase Order error:', error);
    res.status(500).json({ message: 'Failed to cancel Purchase Order' });
  }
});

// =====================================================
// PURCHASE ORDER ITEMS ROUTES
// =====================================================

// Add item to Purchase Order
router.post('/:id/items', authenticateToken, authorizeRoles('Admin', 'Project Manager'), [
  body('item_id').isInt().withMessage('Item ID must be an integer'),
  body('quantity_ordered').isInt({ min: 1 }).withMessage('Quantity must be a positive integer'),
  body('unit_id').isInt().withMessage('Unit ID must be an integer'),
  body('unit_price').isFloat({ min: 0 }).withMessage('Unit price must be a positive number'),
  body('specifications').optional().trim(),
  body('notes').optional().trim()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const purchaseOrder = await PurchaseOrder.findByPk(req.params.id);
    if (!purchaseOrder) {
      return res.status(404).json({ message: 'Purchase Order not found' });
    }

    if (purchaseOrder.status !== 'DRAFT') {
      return res.status(400).json({ message: 'Only draft Purchase Orders can be modified' });
    }

    const { item_id, quantity_ordered, unit_id, unit_price, specifications, notes } = req.body;
    const total_price = unit_price * quantity_ordered;

    const poItem = await PurchaseOrderItem.create({
      po_id: purchaseOrder.po_id,
      item_id,
      quantity_ordered,
      unit_id,
      unit_price,
      total_price,
      specifications,
      notes
    });

    // Update PO totals
    const subtotal = await PurchaseOrderItem.sum('total_price', {
      where: { po_id: purchaseOrder.po_id }
    });
    const taxAmount = subtotal * 0.18;
    const totalAmount = subtotal + taxAmount;

    await purchaseOrder.update({
      subtotal,
      tax_amount: taxAmount,
      total_amount: totalAmount
    });

    res.status(201).json({
      message: 'Item added to Purchase Order successfully',
      poItem
    });
  } catch (error) {
    console.error('Add PO item error:', error);
    res.status(500).json({ message: 'Failed to add item to Purchase Order' });
  }
});

// Update Purchase Order item
router.put('/:id/items/:itemId', authenticateToken, authorizeRoles('Admin', 'Project Manager'), [
  body('quantity_ordered').optional().isInt({ min: 1 }).withMessage('Quantity must be a positive integer'),
  body('unit_price').optional().isFloat({ min: 0 }).withMessage('Unit price must be a positive number'),
  body('specifications').optional().trim(),
  body('notes').optional().trim()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const purchaseOrder = await PurchaseOrder.findByPk(req.params.id);
    if (!purchaseOrder) {
      return res.status(404).json({ message: 'Purchase Order not found' });
    }

    if (purchaseOrder.status !== 'DRAFT') {
      return res.status(400).json({ message: 'Only draft Purchase Orders can be modified' });
    }

    const poItem = await PurchaseOrderItem.findOne({
      where: { po_item_id: req.params.itemId, po_id: req.params.id }
    });

    if (!poItem) {
      return res.status(404).json({ message: 'Purchase Order item not found' });
    }

    const updateData = { ...req.body };
    if (updateData.unit_price && updateData.quantity_ordered) {
      updateData.total_price = updateData.unit_price * updateData.quantity_ordered;
    }

    await poItem.update(updateData);

    // Update PO totals
    const subtotal = await PurchaseOrderItem.sum('total_price', {
      where: { po_id: purchaseOrder.po_id }
    });
    const taxAmount = subtotal * 0.18;
    const totalAmount = subtotal + taxAmount;

    await purchaseOrder.update({
      subtotal,
      tax_amount: taxAmount,
      total_amount: totalAmount
    });

    res.json({
      message: 'Purchase Order item updated successfully',
      poItem
    });
  } catch (error) {
    console.error('Update PO item error:', error);
    res.status(500).json({ message: 'Failed to update Purchase Order item' });
  }
});

// Delete Purchase Order item
router.delete('/:id/items/:itemId', authenticateToken, authorizeRoles('Admin', 'Project Manager'), async (req, res) => {
  try {
    const purchaseOrder = await PurchaseOrder.findByPk(req.params.id);
    if (!purchaseOrder) {
      return res.status(404).json({ message: 'Purchase Order not found' });
    }

    if (purchaseOrder.status !== 'DRAFT') {
      return res.status(400).json({ message: 'Only draft Purchase Orders can be modified' });
    }

    const poItem = await PurchaseOrderItem.findOne({
      where: { po_item_id: req.params.itemId, po_id: req.params.id }
    });

    if (!poItem) {
      return res.status(404).json({ message: 'Purchase Order item not found' });
    }

    await poItem.destroy();

    // Update PO totals
    const subtotal = await PurchaseOrderItem.sum('total_price', {
      where: { po_id: purchaseOrder.po_id }
    });
    const taxAmount = subtotal * 0.18;
    const totalAmount = subtotal + taxAmount;

    await purchaseOrder.update({
      subtotal,
      tax_amount: taxAmount,
      total_amount: totalAmount
    });

    res.json({ message: 'Purchase Order item deleted successfully' });
  } catch (error) {
    console.error('Delete PO item error:', error);
    res.status(500).json({ message: 'Failed to delete Purchase Order item' });
  }
});

// Get Material Receipts for Purchase Order
router.get('/:id/receipts', authenticateToken, async (req, res) => {
  try {
    const purchaseOrder = await PurchaseOrder.findByPk(req.params.id);
    if (!purchaseOrder) {
      return res.status(404).json({ message: 'Purchase Order not found' });
    }

    const receipts = await MaterialReceipt.findAll({
      where: { po_id: req.params.id },
      include: [
        { model: User, as: 'receivedBy', attributes: ['name', 'email'] },
        { model: MaterialReceiptItem, as: 'items', include: [
          { model: ItemMaster, as: 'item', attributes: ['item_name', 'item_code'] },
          { model: Unit, as: 'unit', attributes: ['unit_name', 'unit_symbol'] }
        ]}
      ],
      order: [['created_at', 'DESC']]
    });

    res.json({ receipts });
  } catch (error) {
    console.error('Get PO receipts error:', error);
    res.status(500).json({ message: 'Failed to fetch Purchase Order receipts' });
  }
});

module.exports = router;
