const express = require('express');
const { body, validationResult, query } = require('express-validator');
const { Op } = require('sequelize');
const { Project, ProjectComponent, User, Task, Issue, Document, Material, Subcontractor } = require('../../models');
const { sequelize } = require('../../config/database');
const { authenticateToken, authorizeRoles } = require('../../middleware/auth');

const router = express.Router();

// Get project components
router.get('/:id/components', async (req, res) => {
  try {
    const projectId = req.params.id;
    
    const components = await ProjectComponent.findAll({
      where: { project_id: projectId },
      order: [['component_name', 'ASC']]
    });

    res.json({
      success: true,
      data: {
        components: components
      }
    });
  } catch (error) {
    console.error('Error fetching project components:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch project components',
      error: error.message
    });
  }
});

// Get project statistics (must come before /:id route)
router.get('/:id/stats', async (req, res) => {
  try {
    const project = await Project.findByPk(req.params.id);
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    // Get task statistics
    const taskStats = await Task.findAll({
      where: { project_id: req.params.id },
      attributes: [
        'status',
        [sequelize.fn('COUNT', sequelize.col('task_id')), 'count']
      ],
      group: ['status']
    });

    // Get issue statistics
    const issueStats = await Issue.findAll({
      where: { project_id: req.params.id },
      attributes: [
        'status',
        [sequelize.fn('COUNT', sequelize.col('issue_id')), 'count']
      ],
      group: ['status']
    });

    // Get material cost total
    const materials = await Material.findAll({
      where: { project_id: req.params.id }
    });

    const totalMaterialCost = materials.reduce((sum, material) => {
      return sum + (material.quantity * (material.cost_per_unit || 0));
    }, 0);

    res.json({
      project: {
        id: project.project_id,
        name: project.name,
        status: project.status,
        budget: project.budget
      },
      tasks: taskStats,
      issues: issueStats,
      materialCost: totalMaterialCost
    });
  } catch (error) {
    console.error('Get project stats error:', error);
    res.status(500).json({ message: 'Failed to fetch project statistics' });
  }
});

// Get project by ID with details
router.get('/:id', [
  query('status').optional().isIn(['PLANNED', 'ACTIVE', 'ON_HOLD', 'COMPLETED', 'CANCELLED']).withMessage('Invalid status')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const project = await Project.findByPk(req.params.id, {
      include: [
        { model: User, as: 'owner', attributes: ['user_id', 'name', 'email'] },
        { model: ProjectComponent, as: 'components' },
        { model: Subcontractor, as: 'subcontractors' },
        { model: Task, as: 'tasks', include: [{ model: User, as: 'assignedUser', attributes: ['user_id', 'name'] }] },
        { model: Issue, as: 'issues', limit: 5, order: [['date_raised', 'DESC']] },
        { model: Document, as: 'documents', limit: 5, order: [['upload_date', 'DESC']] }
      ]
    });

    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    // Check permissions for contractors/site engineers
    if (req.user.role.name === 'Project On-site Team' || req.user.role.name === 'Collaborator Organisation') {
      const hasAccess = project.tasks.some(task => task.assigned_user_id === req.user.user_id);
      if (!hasAccess) {
        return res.status(403).json({ message: 'Access denied to this project' });
      }
    }

    res.json({ project });
  } catch (error) {
    console.error('Get project error:', error);
    res.status(500).json({ message: 'Failed to fetch project' });
  }
});

// Get all projects (with pagination and filtering)
router.get('/', [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('status').optional().isIn(['PLANNED', 'ACTIVE', 'ON_HOLD', 'COMPLETED', 'CANCELLED']).withMessage('Invalid status'),
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
    const { status, search } = req.query;

    console.log('Projects API called with:', { page, limit, status, search, userRole: req.user.role.name });

    // Build where clause
    const whereClause = {};
    if (status) whereClause.status = status;
    if (search) {
      whereClause[Op.or] = [
        { name: { [Op.like]: `%${search}%` } },
        { description: { [Op.like]: `%${search}%` } }
      ];
    }

    // Role-based filtering - Allow all users to see projects, but restrict access in detail view
    // Note: Access control is handled in individual project detail routes
    // Removed restrictive filtering to allow all users to see project listings

    const { count, rows: projects } = await Project.findAndCountAll({
      where: whereClause,
      include: [
        { model: User, as: 'owner', attributes: ['user_id', 'name', 'email'] }
      ],
      limit,
      offset,
      order: [['created_at', 'DESC']]
    });

    res.json({
      projects,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(count / limit),
        totalItems: count,
        itemsPerPage: limit
      }
    });
  } catch (error) {
    console.error('Get projects error:', error);
    res.status(500).json({ message: 'Failed to fetch projects' });
  }
});

// Create project
router.post('/', authenticateToken, authorizeRoles('Admin', 'Project Manager'), [
  body('name').trim().isLength({ min: 2 }).withMessage('Name must be at least 2 characters'),
  body('description').optional().trim(),
  body('start_date').optional().custom((value) => {
    if (value === null || value === '' || value === undefined) return true;
    return !isNaN(Date.parse(value));
  }).withMessage('Invalid start date'),
  body('end_date').optional().custom((value) => {
    if (value === null || value === '' || value === undefined) return true;
    return !isNaN(Date.parse(value));
  }).withMessage('Invalid end date'),
  body('budget').optional().custom((value) => {
    if (value === null || value === '' || value === undefined) return true;
    const num = parseFloat(value);
    return !isNaN(num) && num >= 0;
  }).withMessage('Budget must be a positive number or empty'),
  body('tender_cost').optional().custom((value) => {
    if (value === null || value === '' || value === undefined) return true;
    const num = parseFloat(value);
    return !isNaN(num) && num >= 0;
  }).withMessage('Tender cost must be a positive number or empty'),
  body('emd').optional().custom((value) => {
    if (value === null || value === '' || value === undefined) return true;
    const num = parseFloat(value);
    return !isNaN(num) && num >= 0;
  }).withMessage('EMD must be a positive number or empty'),
  body('bg').optional().custom((value) => {
    if (value === null || value === '' || value === undefined) return true;
    const num = parseFloat(value);
    return !isNaN(num) && num >= 0;
  }).withMessage('BG must be a positive number or empty'),
  body('planned_budget').optional().custom((value) => {
    if (value === null || value === '' || value === undefined) return true;
    const num = parseFloat(value);
    return !isNaN(num) && num >= 0;
  }).withMessage('Planned budget must be a positive number or empty'),
  body('actual_budget').optional().custom((value) => {
    if (value === null || value === '' || value === undefined) return true;
    const num = parseFloat(value);
    return !isNaN(num) && num >= 0;
  }).withMessage('Actual budget must be a positive number or empty'),
  body('subwork').optional().trim(),
  body('status').optional().isIn(['PLANNED', 'ACTIVE', 'ON_HOLD', 'COMPLETED', 'CANCELLED']).withMessage('Invalid status'),
  body('components').optional().isArray().withMessage('Components must be an array'),
  body('components.*.component_name').optional().trim().isLength({ min: 1 }).withMessage('Component name is required'),
  body('components.*.component_type').optional().trim(),
  body('components.*.estimated_cost').optional().custom((value) => {
    if (value === null || value === '' || value === undefined) return true;
    const num = parseFloat(value);
    return !isNaN(num) && num >= 0;
  }).withMessage('Estimated cost must be a positive number or empty'),
  body('components.*.actual_cost').optional().custom((value) => {
    if (value === null || value === '' || value === undefined) return true;
    const num = parseFloat(value);
    return !isNaN(num) && num >= 0;
  }).withMessage('Actual cost must be a positive number or empty'),
  body('components.*.start_date').optional().custom((value) => {
    if (value === null || value === '' || value === undefined) return true;
    return !isNaN(Date.parse(value));
  }).withMessage('Invalid component start date'),
  body('components.*.end_date').optional().custom((value) => {
    if (value === null || value === '' || value === undefined) return true;
    return !isNaN(Date.parse(value));
  }).withMessage('Invalid component end date'),
  body('components.*.status').optional().isIn(['PLANNED', 'IN_PROGRESS', 'COMPLETED', 'ON_HOLD', 'CANCELLED']).withMessage('Invalid component status'),
  body('subcontractors').optional().isArray().withMessage('Subcontractors must be an array'),
  body('subcontractors.*.company_name').optional().trim().isLength({ min: 2, max: 255 }).withMessage('Company name must be between 2 and 255 characters'),
  body('subcontractors.*.contact_person').optional().trim().isLength({ max: 255 }).withMessage('Contact person must not exceed 255 characters'),
  body('subcontractors.*.phone').optional().trim().matches(/^[\d\s\-\+\(\)]*$/).withMessage('Invalid phone number format'),
  body('subcontractors.*.email').optional().trim().custom((value) => {
    if (value === null || value === '' || value === undefined) return true;
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  }).withMessage('Invalid email format'),
  body('subcontractors.*.address').optional().trim(),
  body('subcontractors.*.gst_number').optional().trim().isLength({ max: 50 }).withMessage('GST number must not exceed 50 characters'),
  body('subcontractors.*.pan_number').optional().trim().isLength({ max: 20 }).withMessage('PAN number must not exceed 20 characters'),
  body('subcontractors.*.work_type').optional().trim().isLength({ max: 100 }).withMessage('Work type must not exceed 100 characters'),
  body('subcontractors.*.contract_value').optional().custom((value) => {
    if (value === null || value === '' || value === undefined) return true;
    const num = parseFloat(value);
    return !isNaN(num) && num >= 0;
  }).withMessage('Contract value must be a positive number or empty'),
  body('subcontractors.*.start_date').optional().custom((value) => {
    if (value === null || value === '' || value === undefined) return true;
    return !isNaN(Date.parse(value));
  }).withMessage('Invalid subcontractor start date'),
  body('subcontractors.*.end_date').optional().custom((value) => {
    if (value === null || value === '' || value === undefined) return true;
    return !isNaN(Date.parse(value));
  }).withMessage('Invalid subcontractor end date'),
  body('subcontractors.*.status').optional().isIn(['ACTIVE', 'INACTIVE', 'COMPLETED', 'TERMINATED']).withMessage('Invalid subcontractor status'),
  body('subcontractors.*.notes').optional().trim()
], async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      await transaction.rollback();
      return res.status(400).json({ errors: errors.array() });
    }

    const { components, subcontractors, ...projectData } = req.body;
    
    const project = await Project.create({
      ...projectData,
      owner_user_id: req.user.user_id
    }, { transaction });

    // Create components if provided
    if (components && components.length > 0) {
      const componentData = components.map(component => ({
        ...component,
        project_id: project.project_id
      }));
      
      await ProjectComponent.bulkCreate(componentData, { transaction });
    }

    // Create subcontractors if provided
    if (subcontractors && subcontractors.length > 0) {
      // Validate that each subcontractor has a company name
      for (const subcontractor of subcontractors) {
        if (!subcontractor.company_name || subcontractor.company_name.trim() === '') {
          await transaction.rollback();
          return res.status(400).json({ 
            message: 'Company name is required for all subcontractors' 
          });
        }
      }
      
      const subcontractorData = subcontractors.map(subcontractor => ({
        ...subcontractor,
        project_id: project.project_id
      }));
      
      await Subcontractor.bulkCreate(subcontractorData, { transaction });
    }

    await transaction.commit();

    // Fetch the created project with components and subcontractors
    const createdProject = await Project.findByPk(project.project_id, {
      include: [
        { model: User, as: 'owner', attributes: ['user_id', 'name', 'email'] },
        { model: ProjectComponent, as: 'components' },
        { model: Subcontractor, as: 'subcontractors' }
      ]
    });

    res.status(201).json({
      message: 'Project created successfully',
      project: createdProject
    });
  } catch (error) {
    await transaction.rollback();
    console.error('Create project error:', error);
    res.status(500).json({ message: 'Failed to create project' });
  }
});

// Update project
router.put('/:id', [
  body('name').optional().trim().isLength({ min: 2 }).withMessage('Name must be at least 2 characters'),
  body('description').optional().trim(),
  body('start_date').optional().custom((value) => {
    if (value === null || value === '' || value === undefined) return true;
    return !isNaN(Date.parse(value));
  }).withMessage('Invalid start date'),
  body('end_date').optional().custom((value) => {
    if (value === null || value === '' || value === undefined) return true;
    return !isNaN(Date.parse(value));
  }).withMessage('Invalid end date'),
  body('budget').optional().custom((value) => {
    if (value === null || value === '' || value === undefined) return true;
    const num = parseFloat(value);
    return !isNaN(num) && num >= 0;
  }).withMessage('Budget must be a positive number or empty'),
  body('tender_cost').optional().custom((value) => {
    if (value === null || value === '' || value === undefined) return true;
    const num = parseFloat(value);
    return !isNaN(num) && num >= 0;
  }).withMessage('Tender cost must be a positive number or empty'),
  body('emd').optional().custom((value) => {
    if (value === null || value === '' || value === undefined) return true;
    const num = parseFloat(value);
    return !isNaN(num) && num >= 0;
  }).withMessage('EMD must be a positive number or empty'),
  body('bg').optional().custom((value) => {
    if (value === null || value === '' || value === undefined) return true;
    const num = parseFloat(value);
    return !isNaN(num) && num >= 0;
  }).withMessage('BG must be a positive number or empty'),
  body('planned_budget').optional().custom((value) => {
    if (value === null || value === '' || value === undefined) return true;
    const num = parseFloat(value);
    return !isNaN(num) && num >= 0;
  }).withMessage('Planned budget must be a positive number or empty'),
  body('actual_budget').optional().custom((value) => {
    if (value === null || value === '' || value === undefined) return true;
    const num = parseFloat(value);
    return !isNaN(num) && num >= 0;
  }).withMessage('Actual budget must be a positive number or empty'),
  body('subwork').optional().trim(),
  body('status').optional().isIn(['PLANNED', 'ACTIVE', 'ON_HOLD', 'COMPLETED', 'CANCELLED']).withMessage('Invalid status'),
  body('components').optional().isArray().withMessage('Components must be an array'),
  body('components.*.component_name').optional().trim().isLength({ min: 1 }).withMessage('Component name is required'),
  body('components.*.component_type').optional().trim(),
  body('components.*.estimated_cost').optional().custom((value) => {
    if (value === null || value === '' || value === undefined) return true;
    const num = parseFloat(value);
    return !isNaN(num) && num >= 0;
  }).withMessage('Estimated cost must be a positive number or empty'),
  body('components.*.actual_cost').optional().custom((value) => {
    if (value === null || value === '' || value === undefined) return true;
    const num = parseFloat(value);
    return !isNaN(num) && num >= 0;
  }).withMessage('Actual cost must be a positive number or empty'),
  body('components.*.start_date').optional().custom((value) => {
    if (value === null || value === '' || value === undefined) return true;
    return !isNaN(Date.parse(value));
  }).withMessage('Invalid component start date'),
  body('components.*.end_date').optional().custom((value) => {
    if (value === null || value === '' || value === undefined) return true;
    return !isNaN(Date.parse(value));
  }).withMessage('Invalid component end date'),
  body('components.*.status').optional().isIn(['PLANNED', 'IN_PROGRESS', 'COMPLETED', 'ON_HOLD', 'CANCELLED']).withMessage('Invalid component status'),
  body('subcontractors').optional().isArray().withMessage('Subcontractors must be an array'),
  body('subcontractors.*.company_name').optional().trim().isLength({ min: 2, max: 255 }).withMessage('Company name must be between 2 and 255 characters'),
  body('subcontractors.*.contact_person').optional().trim().isLength({ max: 255 }).withMessage('Contact person must not exceed 255 characters'),
  body('subcontractors.*.phone').optional().trim().matches(/^[\d\s\-\+\(\)]*$/).withMessage('Invalid phone number format'),
  body('subcontractors.*.email').optional().trim().custom((value) => {
    if (value === null || value === '' || value === undefined) return true;
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  }).withMessage('Invalid email format'),
  body('subcontractors.*.address').optional().trim(),
  body('subcontractors.*.gst_number').optional().trim().isLength({ max: 50 }).withMessage('GST number must not exceed 50 characters'),
  body('subcontractors.*.pan_number').optional().trim().isLength({ max: 20 }).withMessage('PAN number must not exceed 20 characters'),
  body('subcontractors.*.work_type').optional().trim().isLength({ max: 100 }).withMessage('Work type must not exceed 100 characters'),
  body('subcontractors.*.contract_value').optional().custom((value) => {
    if (value === null || value === '' || value === undefined) return true;
    const num = parseFloat(value);
    return !isNaN(num) && num >= 0;
  }).withMessage('Contract value must be a positive number or empty'),
  body('subcontractors.*.start_date').optional().custom((value) => {
    if (value === null || value === '' || value === undefined) return true;
    return !isNaN(Date.parse(value));
  }).withMessage('Invalid subcontractor start date'),
  body('subcontractors.*.end_date').optional().custom((value) => {
    if (value === null || value === '' || value === undefined) return true;
    return !isNaN(Date.parse(value));
  }).withMessage('Invalid subcontractor end date'),
  body('subcontractors.*.status').optional().isIn(['ACTIVE', 'INACTIVE', 'COMPLETED', 'TERMINATED']).withMessage('Invalid subcontractor status'),
  body('subcontractors.*.notes').optional().trim()
], async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      await transaction.rollback();
      return res.status(400).json({ errors: errors.array() });
    }

    const project = await Project.findByPk(req.params.id);
    if (!project) {
      await transaction.rollback();
      return res.status(404).json({ message: 'Project not found' });
    }

    // Check permissions
    const canUpdate = req.user.role.name === 'Admin' || 
                     req.user.role.name === 'Project Manager' || 
                     project.owner_user_id === req.user.user_id;

    if (!canUpdate) {
      await transaction.rollback();
      return res.status(403).json({ message: 'Insufficient permissions' });
    }

    const { components, subcontractors, ...projectData } = req.body;

    // Update project
    await project.update(projectData, { transaction });

    // Update components if provided
    if (components) {
      // Delete existing components
      await ProjectComponent.destroy({
        where: { project_id: project.project_id },
        transaction
      });

      // Create new components
      if (components.length > 0) {
        const componentData = components.map(component => ({
          ...component,
          project_id: project.project_id
        }));
        
        await ProjectComponent.bulkCreate(componentData, { transaction });
      }
    }

    // Update subcontractors if provided
    if (subcontractors) {
      // Delete existing subcontractors
      await Subcontractor.destroy({
        where: { project_id: project.project_id },
        transaction
      });

      // Create new subcontractors
      if (subcontractors.length > 0) {
        // Validate that each subcontractor has a company name
        for (const subcontractor of subcontractors) {
          if (!subcontractor.company_name || subcontractor.company_name.trim() === '') {
            await transaction.rollback();
            return res.status(400).json({ 
              message: 'Company name is required for all subcontractors' 
            });
          }
        }
        
        const subcontractorData = subcontractors.map(subcontractor => ({
          ...subcontractor,
          project_id: project.project_id,
          start_date: subcontractor.start_date && subcontractor.start_date !== '' && subcontractor.start_date !== 'Invalid date' ? subcontractor.start_date : null,
          end_date: subcontractor.end_date && subcontractor.end_date !== '' && subcontractor.end_date !== 'Invalid date' ? subcontractor.end_date : null,
        }));
        
        await Subcontractor.bulkCreate(subcontractorData, { transaction });
      }
    }

    await transaction.commit();

    // Fetch the updated project with components and subcontractors
    const updatedProject = await Project.findByPk(project.project_id, {
      include: [
        { model: User, as: 'owner', attributes: ['user_id', 'name', 'email'] },
        { model: ProjectComponent, as: 'components' },
        { model: Subcontractor, as: 'subcontractors' }
      ]
    });

    res.json({
      message: 'Project updated successfully',
      project: updatedProject
    });
  } catch (error) {
    await transaction.rollback();
    console.error('Update project error:', error);
    res.status(500).json({ message: 'Failed to update project' });
  }
});

// Delete project
router.delete('/:id', authorizeRoles('Admin', 'Project Manager'), async (req, res) => {
  try {
    const project = await Project.findByPk(req.params.id);
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    // Check if user is the owner or has admin role
    const canDelete = req.user.role.name === 'Admin' || project.owner_user_id === req.user.user_id;
    if (!canDelete) {
      return res.status(403).json({ message: 'Insufficient permissions' });
    }

    await project.destroy();

    res.json({ message: 'Project deleted successfully' });
  } catch (error) {
    console.error('Delete project error:', error);
    res.status(500).json({ message: 'Failed to delete project' });
  }
});

module.exports = router;
