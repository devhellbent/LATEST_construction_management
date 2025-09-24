const express = require('express');
const { body, validationResult, query } = require('express-validator');
const { ProjectMember, User, Role, Project } = require('../../models');
const { authenticateToken, authorizeRoles } = require('../../middleware/auth');

const router = express.Router();

// Get all project members with filtering
router.get('/', [
  query('project_id').optional().isInt({ min: 1 }).withMessage('Project ID must be a positive integer'),
  query('role_id').optional().isInt({ min: 1 }).withMessage('Role ID must be a positive integer'),
  query('invitation_status').optional().isIn(['PENDING', 'ACCEPTED', 'DECLINED']).withMessage('Invalid invitation status'),
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;
    const { project_id, role_id, invitation_status } = req.query;

    // Build where clause
    const whereClause = {};
    if (project_id) whereClause.project_id = project_id;
    if (role_id) whereClause.role_id = role_id;
    if (invitation_status) whereClause.invitation_status = invitation_status;

    const { count, rows: members } = await ProjectMember.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['user_id', 'name', 'email', 'phone']
        },
        {
          model: Role,
          as: 'role',
          attributes: ['role_id', 'name', 'description']
        },
        {
          model: Project,
          as: 'project',
          attributes: ['project_id', 'name']
        }
      ],
      limit,
      offset,
      order: [['created_at', 'DESC']]
    });

    res.json({
      members,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(count / limit),
        totalItems: count,
        itemsPerPage: limit
      }
    });
  } catch (error) {
    console.error('Get project members error:', error);
    res.status(500).json({ message: 'Failed to fetch project members' });
  }
});

// Get project members by project ID
router.get('/project/:projectId', async (req, res) => {
  try {
    const { projectId } = req.params;

    const members = await ProjectMember.findAll({
      where: { project_id: projectId },
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['user_id', 'name', 'email', 'phone']
        },
        {
          model: Role,
          as: 'role',
          attributes: ['role_id', 'name', 'description']
        }
      ],
      order: [['created_at', 'DESC']]
    });

    res.json({ members });
  } catch (error) {
    console.error('Get project members by project error:', error);
    res.status(500).json({ message: 'Failed to fetch project members' });
  }
});

// Add member to project
router.post('/', authorizeRoles('Admin', 'Project Manager'), [
  body('project_id').isInt({ min: 1 }).withMessage('Project ID is required'),
  body('user_id').isInt({ min: 1 }).withMessage('User ID is required'),
  body('role_id').isInt({ min: 1 }).withMessage('Role ID is required'),
  body('invitation_status').optional().isIn(['PENDING', 'ACCEPTED', 'DECLINED']).withMessage('Invalid invitation status')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { project_id, user_id, role_id, invitation_status = 'PENDING' } = req.body;

    // Check if user is already a member of this project
    const existingMember = await ProjectMember.findOne({
      where: { project_id, user_id }
    });

    if (existingMember) {
      return res.status(400).json({ message: 'User is already a member of this project' });
    }

    // Verify project exists
    const project = await Project.findByPk(project_id);
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    // Verify user exists
    const user = await User.findByPk(user_id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Verify role exists
    const role = await Role.findByPk(role_id);
    if (!role) {
      return res.status(404).json({ message: 'Role not found' });
    }

    // Create project member
    const projectMember = await ProjectMember.create({
      project_id,
      user_id,
      role_id,
      invitation_status,
      joined_at: invitation_status === 'ACCEPTED' ? new Date() : null
    });

    // Fetch the created member with associations
    const memberWithDetails = await ProjectMember.findByPk(projectMember.project_member_id, {
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['user_id', 'name', 'email', 'phone']
        },
        {
          model: Role,
          as: 'role',
          attributes: ['role_id', 'name', 'description']
        },
        {
          model: Project,
          as: 'project',
          attributes: ['project_id', 'name']
        }
      ]
    });

    res.status(201).json({
      message: 'Member added to project successfully',
      member: memberWithDetails
    });
  } catch (error) {
    console.error('Add project member error:', error);
    res.status(500).json({ message: 'Failed to add member to project' });
  }
});

// Update project member
router.put('/:id', authorizeRoles('Admin', 'Project Manager'), [
  body('role_id').optional().isInt({ min: 1 }).withMessage('Role ID must be a positive integer'),
  body('invitation_status').optional().isIn(['PENDING', 'ACCEPTED', 'DECLINED']).withMessage('Invalid invitation status'),
  body('is_active').optional().isBoolean().withMessage('is_active must be boolean')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const updateData = req.body;

    const projectMember = await ProjectMember.findByPk(id);
    if (!projectMember) {
      return res.status(404).json({ message: 'Project member not found' });
    }

    // If invitation status is being changed to ACCEPTED, set joined_at
    if (updateData.invitation_status === 'ACCEPTED' && projectMember.invitation_status !== 'ACCEPTED') {
      updateData.joined_at = new Date();
    }

    await projectMember.update(updateData);

    // Fetch updated member with associations
    const updatedMember = await ProjectMember.findByPk(id, {
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['user_id', 'name', 'email', 'phone']
        },
        {
          model: Role,
          as: 'role',
          attributes: ['role_id', 'name', 'description']
        },
        {
          model: Project,
          as: 'project',
          attributes: ['project_id', 'name']
        }
      ]
    });

    res.json({
      message: 'Project member updated successfully',
      member: updatedMember
    });
  } catch (error) {
    console.error('Update project member error:', error);
    res.status(500).json({ message: 'Failed to update project member' });
  }
});

// Soft delete project member (deactivate)
router.delete('/:id', authorizeRoles('Admin', 'Project Manager'), async (req, res) => {
  try {
    const { id } = req.params;

    const projectMember = await ProjectMember.findByPk(id);
    if (!projectMember) {
      return res.status(404).json({ message: 'Project member not found' });
    }

    // Soft delete by setting is_active to false
    await projectMember.update({ is_active: false });

    res.json({ message: 'Project member removed successfully' });
  } catch (error) {
    console.error('Delete project member error:', error);
    res.status(500).json({ message: 'Failed to remove project member' });
  }
});

// Get all roles
router.get('/roles/all', async (req, res) => {
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

module.exports = router;


