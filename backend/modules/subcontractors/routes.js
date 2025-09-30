const express = require('express');
const router = express.Router();
const { Op } = require('sequelize');
const { Subcontractor, Project } = require('../../models');
const { authenticateToken } = require('../../middleware/auth');

// Get all subcontractors for a specific project (must come before /:id route)
router.get('/project/:projectId', authenticateToken, async (req, res) => {
  try {
    const { projectId } = req.params;
    const { search, status = 'ACTIVE' } = req.query;

    let whereClause = {
      project_id: projectId
    };

    // Add status filter if provided
    if (status && status !== 'ALL') {
      whereClause.status = status;
    }

    // Add search functionality
    if (search) {
      whereClause = {
        ...whereClause,
        [Op.or]: [
          { company_name: { [Op.like]: `%${search}%` } },
          { contact_person: { [Op.like]: `%${search}%` } },
          { work_type: { [Op.like]: `%${search}%` } }
        ]
      };
    }

    const subcontractors = await Subcontractor.findAll({
      where: whereClause,
      include: [
        {
          model: Project,
          as: 'project',
          attributes: ['project_id', 'name']
        }
      ],
      order: [['company_name', 'ASC']]
    });

    res.json({
      success: true,
      data: {
        subcontractors
      }
    });
  } catch (error) {
    console.error('Error fetching subcontractors:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch subcontractors',
      error: error.message
    });
  }
});

// Get subcontractor by ID (must come after /project/:projectId route)
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const subcontractor = await Subcontractor.findByPk(id, {
      include: [
        {
          model: Project,
          as: 'project',
          attributes: ['project_id', 'name']
        }
      ]
    });

    if (!subcontractor) {
      return res.status(404).json({
        success: false,
        message: 'Subcontractor not found'
      });
    }

    res.json({
      success: true,
      data: {
        subcontractor
      }
    });
  } catch (error) {
    console.error('Error fetching subcontractor:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch subcontractor',
      error: error.message
    });
  }
});

// Create new subcontractor
router.post('/', authenticateToken, async (req, res) => {
  try {
    const subcontractorData = req.body;

    // Validate required fields
    if (!subcontractorData.project_id || !subcontractorData.company_name) {
      return res.status(400).json({
        success: false,
        message: 'Project ID and company name are required'
      });
    }

    // Verify project exists
    const project = await Project.findByPk(subcontractorData.project_id);
    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }

    const subcontractor = await Subcontractor.create(subcontractorData);

    // Fetch the created subcontractor with project details
    const createdSubcontractor = await Subcontractor.findByPk(subcontractor.subcontractor_id, {
      include: [
        {
          model: Project,
          as: 'project',
          attributes: ['project_id', 'name']
        }
      ]
    });

    res.status(201).json({
      success: true,
      message: 'Subcontractor created successfully',
      data: {
        subcontractor: createdSubcontractor
      }
    });
  } catch (error) {
    console.error('Error creating subcontractor:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create subcontractor',
      error: error.message
    });
  }
});

// Update subcontractor
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const subcontractor = await Subcontractor.findByPk(id);
    if (!subcontractor) {
      return res.status(404).json({
        success: false,
        message: 'Subcontractor not found'
      });
    }

    await subcontractor.update(updateData);

    // Fetch the updated subcontractor with project details
    const updatedSubcontractor = await Subcontractor.findByPk(id, {
      include: [
        {
          model: Project,
          as: 'project',
          attributes: ['project_id', 'name']
        }
      ]
    });

    res.json({
      success: true,
      message: 'Subcontractor updated successfully',
      data: {
        subcontractor: updatedSubcontractor
      }
    });
  } catch (error) {
    console.error('Error updating subcontractor:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update subcontractor',
      error: error.message
    });
  }
});

// Delete subcontractor
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const subcontractor = await Subcontractor.findByPk(id);
    if (!subcontractor) {
      return res.status(404).json({
        success: false,
        message: 'Subcontractor not found'
      });
    }

    await subcontractor.destroy();

    res.json({
      success: true,
      message: 'Subcontractor deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting subcontractor:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete subcontractor',
      error: error.message
    });
  }
});

// Search subcontractors across all projects (for admin use) - must be last GET route
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { search, status, work_type, project_id } = req.query;

    let whereClause = {};

    // Add filters
    if (status && status !== 'ALL') {
      whereClause.status = status;
    }

    if (work_type) {
      whereClause.work_type = work_type;
    }

    if (project_id) {
      whereClause.project_id = project_id;
    }

    // Add search functionality
    if (search) {
      whereClause = {
        ...whereClause,
        [Op.or]: [
          { company_name: { [Op.like]: `%${search}%` } },
          { contact_person: { [Op.like]: `%${search}%` } },
          { work_type: { [Op.like]: `%${search}%` } }
        ]
      };
    }

    const subcontractors = await Subcontractor.findAll({
      where: whereClause,
      include: [
        {
          model: Project,
          as: 'project',
          attributes: ['project_id', 'name']
        }
      ],
      order: [['company_name', 'ASC']]
    });

    res.json({
      success: true,
      data: {
        subcontractors
      }
    });
  } catch (error) {
    console.error('Error searching subcontractors:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to search subcontractors',
      error: error.message
    });
  }
});

module.exports = router;
