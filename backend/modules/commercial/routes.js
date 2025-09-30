const express = require('express');
const { body, validationResult, query } = require('express-validator');
const { Op } = require('sequelize');
const { Material, MaterialAllocation, Project, PettyCashExpense, User, MaterialReturn, MaterialConsumption, MaterialIssue, ProjectComponent, Subcontractor } = require('../../models');
const { authenticateToken, authorizeRoles } = require('../../middleware/auth');
const InventoryService = require('../../services/inventoryService');
const socketService = require('../../services/socketService');

const router = express.Router();

// Get materials by project (for commercial inventory)
router.get('/inventory/:projectId', authenticateToken, async (req, res) => {
  try {
    const { projectId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    const { type, search } = req.query;

    // Build where clause
    const whereClause = { project_id: projectId };
    if (type) whereClause.type = type;
    if (search) {
      whereClause[Op.or] = [
        { name: { [Op.like]: `%${search}%` } },
        { supplier: { [Op.like]: `%${search}%` } }
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
    console.error('Get project materials error:', error);
    res.status(500).json({ message: 'Failed to fetch project materials' });
  }
});

// Get all materials for commercial inventory (with project filtering)
router.get('/inventory', authenticateToken, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    const { type, search, project_id } = req.query;

    // Build where clause
    const whereClause = {};
    if (project_id) whereClause.project_id = project_id;
    if (type) whereClause.type = type;
    if (search) {
      whereClause[Op.or] = [
        { name: { [Op.like]: `%${search}%` } },
        { supplier: { [Op.like]: `%${search}%` } }
      ];
    }

    const { count, rows: materials } = await Material.findAndCountAll({
      where: whereClause,
      include: [
        { model: Project, as: 'project', attributes: ['project_id', 'name'] }
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
    console.error('Get commercial inventory error:', error);
    res.status(500).json({ message: 'Failed to fetch commercial inventory' });
  }
});





// Create Material Issue
router.post('/material-issue', authenticateToken, authorizeRoles('Admin', 'Project Manager', 'Project On-site Team', 'Inventory Manager'), [
  body('project_id').isInt().withMessage('Project ID is required'),
  body('material_id').isInt().withMessage('Material ID is required'),
  body('quantity_issued').isInt({ min: 1 }).withMessage('Quantity must be a positive integer'),
  body('issue_date').isDate().withMessage('Invalid issue date'),
  body('location').trim().isLength({ min: 1 }).withMessage('Location is required'),
  body('issued_by_user_id').isInt().withMessage('Issued by user ID is required'),
  body('received_by_user_id').isInt().withMessage('Received by user ID is required'),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { project_id, material_id, quantity_issued, issue_date, issue_purpose, location, issued_by_user_id, received_by_user_id, status, component_id, subcontractor_id } = req.body;

    // Verify project exists
    const project = await Project.findByPk(project_id);
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    // Verify material exists and check stock
    const material = await Material.findByPk(material_id);
    if (!material) {
      return res.status(404).json({ message: `Material with ID ${material_id} not found` });
    }
    
    if (material.stock_qty < quantity_issued) {
      return res.status(400).json({ 
        message: `Insufficient stock for ${material.name}. Available: ${material.stock_qty}, Requested: ${quantity_issued}` 
      });
    }

    // Verify users exist
    const issuedByUser = await User.findByPk(issued_by_user_id);
    if (!issuedByUser) {
      return res.status(404).json({ message: 'Issued by user not found' });
    }

    const receivedByUser = await User.findByPk(received_by_user_id);
    if (!receivedByUser) {
      return res.status(404).json({ message: 'Received by user not found' });
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
      status: status || 'PENDING',
      component_id: component_id || null,
      subcontractor_id: subcontractor_id || null
    });

    // Record inventory transaction and update stock
    await InventoryService.recordTransaction({
      material_id,
      project_id,
      transaction_type: 'ISSUE',
      transaction_id: materialIssue.issue_id,
      quantity_change: -quantity_issued, // Negative for issue
      reference_number: `ISSUE-${materialIssue.issue_id}`,
      description: `Material issued: ${issue_purpose || 'No description'}`,
      location,
      performed_by_user_id: req.user.user_id
    });

    // Emit socket event for real-time updates
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

// Material Issue - Get issue history
router.get('/material-issue', authenticateToken, async (req, res) => {
  try {
    const { project_id } = req.query;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    const whereClause = {};
    if (project_id) whereClause.project_id = project_id;

    const { count, rows: issues } = await MaterialIssue.findAndCountAll({
      where: whereClause,
      include: [
        { model: Material, as: 'material', attributes: ['material_id', 'name', 'type', 'unit'] },
        { model: Project, as: 'project', attributes: ['project_id', 'name'] },
        { model: User, as: 'issued_by', foreignKey: 'issued_by_user_id', attributes: ['user_id', 'name'] },
        { model: User, as: 'received_by', foreignKey: 'received_by_user_id', attributes: ['user_id', 'name'] },
        { model: User, as: 'created_by_user', foreignKey: 'created_by', attributes: ['user_id', 'name'] },
        { model: User, as: 'updated_by_user', foreignKey: 'updated_by', attributes: ['user_id', 'name'] },
        { model: ProjectComponent, as: 'component', attributes: ['component_id', 'component_name', 'component_type'] },
        { model: Subcontractor, as: 'subcontractor', attributes: ['subcontractor_id', 'company_name', 'work_type'] }
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

// Update Material Issue
router.put('/material-issue/:id', authenticateToken, authorizeRoles('Admin', 'Project Manager', 'Project On-site Team', 'Inventory Manager'), [
  body('project_id').isInt().withMessage('Project ID is required'),
  body('material_id').isInt().withMessage('Material ID is required'),
  body('quantity_issued').isInt({ min: 1 }).withMessage('Quantity must be a positive integer'),
  body('issue_date').isDate().withMessage('Invalid issue date'),
  body('location').trim().isLength({ min: 1 }).withMessage('Location is required'),
  body('issued_by_user_id').isInt().withMessage('Issued by user ID is required'),
  body('received_by_user_id').isInt().withMessage('Received by user ID is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const { project_id, material_id, quantity_issued, issue_date, issue_purpose, location, issued_by_user_id, received_by_user_id, status } = req.body;

    // Find existing material issue
    const existingIssue = await MaterialIssue.findByPk(id);
    if (!existingIssue) {
      return res.status(404).json({ message: 'Material issue not found' });
    }

    // Verify project exists
    const project = await Project.findByPk(project_id);
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    // Verify material exists and check stock (considering current issue quantities)
    const material = await Material.findByPk(material_id);
    if (!material) {
      return res.status(404).json({ message: `Material with ID ${material_id} not found` });
    }
    
    // Calculate available stock considering current issue
    const currentIssueQuantity = existingIssue.material_id === material_id ? existingIssue.quantity_issued : 0;
    const availableStock = material.stock_qty + currentIssueQuantity;
    
    if (availableStock < quantity_issued) {
      return res.status(400).json({ 
        message: `Insufficient stock for ${material.name}. Available: ${availableStock}, Requested: ${quantity_issued}` 
      });
    }

    // Verify users exist
    const issuedByUser = await User.findByPk(issued_by_user_id);
    if (!issuedByUser) {
      return res.status(404).json({ message: 'Issued by user not found' });
    }

    const receivedByUser = await User.findByPk(received_by_user_id);
    if (!receivedByUser) {
      return res.status(404).json({ message: 'Received by user not found' });
    }

    // Calculate the difference in quantity
    const quantityDifference = quantity_issued - existingIssue.quantity_issued;

    // Update material issue record
    await existingIssue.update({
      project_id,
      material_id,
      quantity_issued,
      issue_date,
      issue_purpose: issue_purpose || '',
      location,
      issued_by_user_id,
      received_by_user_id,
      status: status || existingIssue.status,
      updated_by: req.user.user_id
    });

    // Record inventory transaction if quantity changed
    if (quantityDifference !== 0) {
      await InventoryService.recordTransaction({
        material_id,
        project_id,
        transaction_type: 'ISSUE',
        transaction_id: existingIssue.issue_id,
        quantity_change: -quantityDifference, // Negative for issue
        reference_number: `ISSUE-UPDATE-${existingIssue.issue_id}`,
        description: `Material issue updated: ${issue_purpose || 'No description'}`,
        location,
        performed_by_user_id: req.user.user_id
      });
    }

    res.json({
      message: 'Material issue updated successfully',
      issue: existingIssue
    });
  } catch (error) {
    console.error('Update material issue error:', error);
    res.status(500).json({ message: 'Failed to update material issue' });
  }
});

// Delete Material Issue
router.delete('/material-issue/:id', authenticateToken, authorizeRoles('Admin', 'Project Manager', 'Inventory Manager'), async (req, res) => {
  try {
    const { id } = req.params;

    // Find existing material issue
    const existingIssue = await MaterialIssue.findByPk(id);
    if (!existingIssue) {
      return res.status(404).json({ message: 'Material issue not found' });
    }

    // Check if issue can be deleted (only PENDING or CANCELLED issues)
    if (existingIssue.status === 'ISSUED' || existingIssue.status === 'RECEIVED') {
      return res.status(400).json({ 
        message: 'Cannot delete issued or received material issues. Please cancel the issue first.' 
      });
    }

    // Record inventory transaction to restore stock
    if (existingIssue.material_id) {
      await InventoryService.recordTransaction({
        material_id: existingIssue.material_id,
        project_id: existingIssue.project_id,
        transaction_type: 'ISSUE',
        transaction_id: existingIssue.issue_id,
        quantity_change: existingIssue.quantity_issued, // Positive to restore stock
        reference_number: `ISSUE-DELETE-${existingIssue.issue_id}`,
        description: `Material issue deleted - stock restored`,
        location: existingIssue.location,
        performed_by_user_id: req.user.user_id
      });
    }

    // Delete the material issue
    await existingIssue.destroy();

    res.json({
      message: 'Material issue deleted successfully'
    });
  } catch (error) {
    console.error('Delete material issue error:', error);
    res.status(500).json({ message: 'Failed to delete material issue' });
  }
});

// Cancel Material Issue
router.patch('/material-issue/:id/cancel', authenticateToken, authorizeRoles('Admin', 'Project Manager', 'Project On-site Team', 'Inventory Manager'), async (req, res) => {
  try {
    const { id } = req.params;

    // Find existing material issue
    const existingIssue = await MaterialIssue.findByPk(id);
    if (!existingIssue) {
      return res.status(404).json({ message: 'Material issue not found' });
    }

    // Check if issue can be cancelled
    if (existingIssue.status === 'CANCELLED') {
      return res.status(400).json({ message: 'Material issue is already cancelled' });
    }

    if (existingIssue.status === 'RECEIVED') {
      return res.status(400).json({ message: 'Cannot cancel received material issues' });
    }

    // Record inventory transaction to restore stock
    if (existingIssue.material_id) {
      await InventoryService.recordTransaction({
        material_id: existingIssue.material_id,
        project_id: existingIssue.project_id,
        transaction_type: 'ISSUE',
        transaction_id: existingIssue.issue_id,
        quantity_change: existingIssue.quantity_issued, // Positive to restore stock
        reference_number: `ISSUE-CANCEL-${existingIssue.issue_id}`,
        description: `Material issue cancelled - stock restored`,
        location: existingIssue.location,
        performed_by_user_id: req.user.user_id
      });
    }

    // Update status to cancelled
    await existingIssue.update({
      status: 'CANCELLED',
      updated_by: req.user.user_id
    });

    res.json({
      message: 'Material issue cancelled successfully',
      issue: existingIssue
    });
  } catch (error) {
    console.error('Cancel material issue error:', error);
    res.status(500).json({ message: 'Failed to cancel material issue' });
  }
});

// Create Material Return
router.post('/material-return', authenticateToken, authorizeRoles('Admin', 'Project Manager', 'Project On-site Team', 'Inventory Manager'), [
  body('project_id').isInt().withMessage('Project ID is required'),
  body('material_return_id').trim().isLength({ min: 1 }).withMessage('Material Return ID is required'),
  body('return_from').trim().isLength({ min: 1 }).withMessage('Return from is required'),
  body('return_to_inventory').trim().isLength({ min: 1 }).withMessage('Return to inventory is required'),
  body('checked_by').isInt().withMessage('Checked by user ID is required'),
  body('materials').isArray({ min: 1 }).withMessage('At least one material is required'),
  body('materials.*.material_id').isInt().withMessage('Material ID is required'),
  body('materials.*.quantity').isInt({ min: 1 }).withMessage('Quantity must be a positive integer'),
  body('materials.*.condition_status').isIn(['GOOD', 'DAMAGED', 'USED', 'EXPIRED']).withMessage('Invalid condition status')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { project_id, material_return_id, return_from, return_to_inventory, checked_by, materials, tags, remarks } = req.body;

    // Verify project exists
    const project = await Project.findByPk(project_id);
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    // Verify checked by user exists
    const checkedByUser = await User.findByPk(checked_by);
    if (!checkedByUser) {
      return res.status(404).json({ message: 'Checked by user not found' });
    }

    // Verify materials exist
    for (const materialItem of materials) {
      const material = await Material.findByPk(materialItem.material_id);
      if (!material) {
        return res.status(404).json({ message: `Material with ID ${materialItem.material_id} not found` });
      }
    }

    // Create material return record
    const materialReturn = await MaterialReturn.create({
      project_id,
      material_id: materials[0].material_id, // Primary material for the return
      quantity: materials.reduce((sum, m) => sum + m.quantity, 0),
      return_date: new Date().toISOString().split('T')[0],
      return_reason: remarks || '',
      returned_by: return_from || '',
      condition_status: materials[0].condition_status,
      returned_by_user_id: req.user.user_id,
      approved_by_user_id: checked_by,
      status: 'PENDING'
    });

    // Record inventory transactions for each material returned
    for (const materialItem of materials) {
      await InventoryService.recordTransaction({
        material_id: materialItem.material_id,
        project_id,
        transaction_type: 'RETURN',
        transaction_id: materialReturn.return_id,
        quantity_change: materialItem.quantity, // Positive for return
        reference_number: `RETURN-${materialReturn.return_id}`,
        description: `Material returned: ${remarks || 'No description'}`,
        location: return_to_inventory,
        performed_by_user_id: req.user.user_id
      });
    }

    // Emit socket event for real-time updates
    socketService.emitToProject(project_id, 'materialReturn', {
      returnId: materialReturn.return_id,
      materialId: materials[0].material_id,
      quantity: materials.reduce((sum, m) => sum + m.quantity, 0),
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

// Material Return - Get return history
router.get('/material-return', authenticateToken, async (req, res) => {
  try {
    const { project_id } = req.query;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    const whereClause = {};
    if (project_id) whereClause.project_id = project_id;

    const { count, rows: returns } = await MaterialReturn.findAndCountAll({
      where: whereClause,
      include: [
        { model: Material, as: 'material', attributes: ['material_id', 'name', 'type', 'unit'] },
        { model: Project, as: 'project', attributes: ['project_id', 'name'] },
        { model: User, as: 'returned_by_user', attributes: ['user_id', 'name'] },
        { model: User, as: 'approved_by', attributes: ['user_id', 'name'] }
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

// Inventory History - Get inventory history for a material
router.get('/inventory-history/:materialId', authenticateToken, async (req, res) => {
  try {
    const { materialId } = req.params;
    const { project_id, transaction_type, page = 1, limit = 50 } = req.query;

    const history = await InventoryService.getInventoryHistory(materialId, {
      project_id: project_id ? parseInt(project_id) : undefined,
      transaction_type,
      limit: parseInt(limit),
      offset: (parseInt(page) - 1) * parseInt(limit)
    });

    res.json(history);
  } catch (error) {
    console.error('Get inventory history error:', error);
    res.status(500).json({ message: 'Failed to fetch inventory history' });
  }
});

// Inventory History - Get inventory history for a project
router.get('/inventory-history/project/:projectId', authenticateToken, async (req, res) => {
  try {
    const { projectId } = req.params;
    const { transaction_type, page = 1, limit = 50 } = req.query;

    const history = await InventoryService.getProjectInventoryHistory(projectId, {
      transaction_type,
      limit: parseInt(limit),
      offset: (parseInt(page) - 1) * parseInt(limit)
    });

    res.json(history);
  } catch (error) {
    console.error('Get project inventory history error:', error);
    res.status(500).json({ message: 'Failed to fetch project inventory history' });
  }
});

// Inventory - Get current stock levels
router.get('/stock-levels', authenticateToken, async (req, res) => {
  try {
    const { project_id } = req.query;

    const stockLevels = await InventoryService.getCurrentStockLevels({
      project_id: project_id ? parseInt(project_id) : undefined
    });

    res.json({ stockLevels });
  } catch (error) {
    console.error('Get stock levels error:', error);
    res.status(500).json({ message: 'Failed to fetch stock levels' });
  }
});

// Inventory - Get low stock alerts
router.get('/low-stock-alerts', authenticateToken, async (req, res) => {
  try {
    const { project_id } = req.query;

    const lowStockAlerts = await InventoryService.getLowStockAlerts({
      project_id: project_id ? parseInt(project_id) : undefined
    });

    res.json({ lowStockAlerts });
  } catch (error) {
    console.error('Get low stock alerts error:', error);
    res.status(500).json({ message: 'Failed to fetch low stock alerts' });
  }
});

// Petty Cash - Get petty cash expenses
router.get('/petty-cash', authenticateToken, async (req, res) => {
  try {
    const { project_id } = req.query;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    const whereClause = {};
    if (project_id) whereClause.project_id = project_id;

    const { count, rows: expenses } = await PettyCashExpense.findAndCountAll({
      where: whereClause,
      include: [
        { model: Project, as: 'project', attributes: ['project_id', 'name'] }
      ],
      limit,
      offset,
      order: [['expense_date', 'DESC']]
    });

    res.json({
      expenses,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(count / limit),
        totalItems: count,
        itemsPerPage: limit
      }
    });
  } catch (error) {
    console.error('Get petty cash expenses error:', error);
    res.status(500).json({ message: 'Failed to fetch petty cash expenses' });
  }
});

// Consumptions - Get consumption data
router.get('/consumptions', authenticateToken, async (req, res) => {
  try {
    const { project_id } = req.query;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    const whereClause = {};
    if (project_id) whereClause.project_id = project_id;

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
    console.error('Get consumptions error:', error);
    res.status(500).json({ message: 'Failed to fetch consumptions' });
  }
});

// Get commercial dashboard stats
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
      return sum + (material.cost_per_unit * material.stock_qty);
    }, 0);

    // Get active transfers (using allocations as proxy)
    const activeTransfers = await MaterialAllocation.count({
      where: { project_id: projectId }
    });

    res.json({
      totalMaterials: materialCount,
      totalValue: totalValue,
      activeTransfers: activeTransfers
    });
  } catch (error) {
    console.error('Get commercial dashboard stats error:', error);
    res.status(500).json({ message: 'Failed to fetch commercial dashboard stats' });
  }
});

// Get recent activity (material issues and transfers)
router.get('/recent-activity', authenticateToken, async (req, res) => {
  try {
    const { project_id, limit = 20 } = req.query;
    
    const whereClause = {};
    if (project_id) {
      whereClause[Op.or] = [
        { project_id: project_id },
        { from_project_id: project_id },
        { to_project_id: project_id }
      ];
    }

    // Get recent material issues
    const recentIssues = await MaterialIssue.findAll({
      where: project_id ? { project_id } : {},
      include: [
        { model: Material, as: 'material', attributes: ['material_id', 'name', 'type', 'unit'] },
        { model: Project, as: 'project', attributes: ['project_id', 'name'] },
        { model: User, as: 'issued_by', foreignKey: 'issued_by_user_id', attributes: ['user_id', 'name'] }
      ],
      limit: Math.floor(limit / 3),
      order: [['issue_date', 'DESC']]
    });


    // Get recent material returns
    const recentReturns = await MaterialReturn.findAll({
      where: project_id ? { project_id } : {},
      include: [
        { model: Material, as: 'material', attributes: ['material_id', 'name', 'type', 'unit'] },
        { model: Project, as: 'project', attributes: ['project_id', 'name'] },
        { model: User, as: 'returned_by_user', attributes: ['user_id', 'name'] }
      ],
      limit: Math.floor(limit / 3),
      order: [['return_date', 'DESC']]
    });

    // Combine and sort by date
    const activities = [
      ...recentIssues.map(issue => ({
        type: 'ISSUE',
        id: issue.issue_id,
        date: issue.issue_date,
        material: issue.material,
        project: issue.project,
        quantity: issue.quantity_issued,
        user: issue.issued_by,
        status: issue.status,
        description: issue.issue_purpose
      })),
      ...recentReturns.map(returnItem => ({
        type: 'RETURN',
        id: returnItem.return_id,
        date: returnItem.return_date,
        material: returnItem.material,
        project: returnItem.project,
        quantity: returnItem.quantity,
        user: returnItem.returned_by,
        status: returnItem.status,
        description: returnItem.return_reason
      }))
    ].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, limit);

    res.json({ activities });
  } catch (error) {
    console.error('Get recent activity error:', error);
    res.status(500).json({ message: 'Failed to fetch recent activity' });
  }
});

// Calculate automated consumptions
router.get('/consumptions/calculate', authenticateToken, async (req, res) => {
  try {
    const { project_id } = req.query;
    
    const whereClause = {};
    if (project_id) whereClause.project_id = project_id;

    // Get all materials that have been issued
    const issuedMaterials = await MaterialIssue.findAll({
      where: {
        ...whereClause,
        status: { [Op.notIn]: ['CANCELLED'] }
      },
      include: [
        { model: Material, as: 'material', attributes: ['material_id', 'name', 'type', 'unit', 'cost_per_unit'] },
        { model: Project, as: 'project', attributes: ['project_id', 'name'] }
      ]
    });

    // Calculate consumptions for each material
    const consumptions = [];
    
    for (const issue of issuedMaterials) {
      const materialId = issue.material_id;
      const projectId = issue.project_id;
      
      // Get total issued quantity
      const totalIssued = await MaterialIssue.sum('quantity_issued', {
        where: {
          project_id: projectId,
          material_id: materialId,
          status: { [Op.notIn]: ['CANCELLED'] }
        }
      });

      // Get total returned quantity
      const totalReturned = await MaterialReturn.sum('quantity', {
        where: {
          project_id: projectId,
          material_id: materialId,
          status: { [Op.notIn]: ['REJECTED'] }
        }
      });

      // Calculate consumed quantity: issued - returned
      const consumedQuantity = totalIssued - (totalReturned || 0);

      if (consumedQuantity > 0) {
        // Check if consumption record already exists
        const existingConsumption = await MaterialConsumption.findOne({
          where: {
            project_id: projectId,
            material_id: materialId
          }
        });

        if (existingConsumption) {
          // Update existing consumption
          await existingConsumption.update({
            quantity_consumed: consumedQuantity,
            consumption_date: new Date(),
            consumption_purpose: 'Automated calculation - issued materials not returned or transferred',
            location: 'Project Site',
            recorded_by_user_id: req.user.user_id
          });
        } else {
          // Create new consumption record
          await MaterialConsumption.create({
            project_id: projectId,
            material_id: materialId,
            quantity_consumed: consumedQuantity,
            consumption_date: new Date(),
            consumption_purpose: 'Automated calculation - issued materials not returned or transferred',
            location: 'Project Site',
            recorded_by_user_id: req.user.user_id
          });
        }

        consumptions.push({
          material_id: materialId,
          material_name: issue.material.name,
          material_type: issue.material.type,
          material_unit: issue.material.unit,
          project_id: projectId,
          project_name: issue.project.name,
          total_issued: totalIssued,
          total_returned: totalReturned || 0,
          total_transferred_out: totalTransferredOut || 0,
          consumed_quantity: consumedQuantity,
          cost_per_unit: issue.material.cost_per_unit,
          total_cost: consumedQuantity * (issue.material.cost_per_unit || 0)
        });
      }
    }

    res.json({
      message: 'Consumptions calculated successfully',
      consumptions,
      summary: {
        total_materials: consumptions.length,
        total_consumed_quantity: consumptions.reduce((sum, c) => sum + c.consumed_quantity, 0),
        total_cost: consumptions.reduce((sum, c) => sum + c.total_cost, 0)
      }
    });
  } catch (error) {
    console.error('Calculate consumptions error:', error);
    res.status(500).json({ message: 'Failed to calculate consumptions' });
  }
});

module.exports = router;
