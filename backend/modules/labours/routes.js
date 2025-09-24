const express = require('express');
const { body, validationResult, query } = require('express-validator');
const { Op } = require('sequelize');
const { Labour, LabourAttendance, Project } = require('../../models');
const { authenticateToken, authorizeRoles } = require('../../middleware/auth');

const router = express.Router();

// Get all labours (with pagination and filtering)
router.get('/', authenticateToken, [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('skill').optional().trim(),
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
    const { skill, search } = req.query;

    // Build where clause
    const whereClause = {};
    if (skill) whereClause.skill = skill;
    if (search) {
      whereClause[Op.or] = [
        { name: { [Op.like]: `%${search}%` } },
        { contact: { [Op.like]: `%${search}%` } }
      ];
    }

    const { count, rows: labours } = await Labour.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: LabourAttendance,
          as: 'attendance',
          include: [{ model: Project, as: 'project', attributes: ['project_id', 'name'] }],
          limit: 5,
          order: [['date', 'DESC']]
        }
      ],
      limit,
      offset,
      order: [['created_at', 'DESC']]
    });

    res.json({
      labours,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(count / limit),
        totalItems: count,
        itemsPerPage: limit
      }
    });
  } catch (error) {
    console.error('Get labours error:', error);
    res.status(500).json({ message: 'Failed to fetch labours' });
  }
});

// Get labours by project
router.get('/project/:projectId', authenticateToken, [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    const projectId = req.params.projectId;

    // Get labours who have attendance records for this project
    const { count, rows: labours } = await Labour.findAndCountAll({
      include: [
        {
          model: LabourAttendance,
          as: 'attendance',
          where: { project_id: projectId },
          include: [{ model: Project, as: 'project', attributes: ['project_id', 'name'] }],
          limit: 10,
          order: [['date', 'DESC']]
        }
      ],
      limit,
      offset,
      order: [['created_at', 'DESC']]
    });

    res.json({
      labours,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(count / limit),
        totalItems: count,
        itemsPerPage: limit
      }
    });
  } catch (error) {
    console.error('Get labours by project error:', error);
    res.status(500).json({ message: 'Failed to fetch labours for project' });
  }
});

// Get attendance by project
router.get('/attendance/project/:projectId', authenticateToken, [
  query('start_date').optional().isISO8601().withMessage('Invalid start date'),
  query('end_date').optional().isISO8601().withMessage('Invalid end date'),
  query('labour_id').optional().isInt().withMessage('Labour ID must be an integer')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const projectId = req.params.projectId;
    const { start_date, end_date, labour_id } = req.query;

    const whereClause = { project_id: projectId };
    if (start_date) whereClause.date = { [Op.gte]: start_date };
    if (end_date) {
      whereClause.date = { 
        ...whereClause.date,
        [Op.lte]: end_date 
      };
    }
    if (labour_id) whereClause.labour_id = labour_id;

    const attendance = await LabourAttendance.findAll({
      where: whereClause,
      include: [
        { model: Labour, as: 'labour', attributes: ['labour_id', 'name', 'skill', 'wage_rate'] },
        { model: Project, as: 'project', attributes: ['project_id', 'name'] }
      ],
      order: [['date', 'DESC']]
    });

    res.json({ attendance });
  } catch (error) {
    console.error('Get attendance by project error:', error);
    res.status(500).json({ message: 'Failed to fetch attendance records' });
  }
});

// Get labour statistics
router.get('/stats/:labourId', authenticateToken, [
  query('project_id').optional().isInt().withMessage('Project ID must be an integer'),
  query('start_date').optional().isISO8601().withMessage('Invalid start date'),
  query('end_date').optional().isISO8601().withMessage('Invalid end date')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const labourId = req.params.labourId;
    const { project_id, start_date, end_date } = req.query;

    const labour = await Labour.findByPk(labourId);
    if (!labour) {
      return res.status(404).json({ message: 'Labour not found' });
    }

    const whereClause = { labour_id: labourId };
    if (project_id) whereClause.project_id = project_id;
    if (start_date) whereClause.date = { [Op.gte]: start_date };
    if (end_date) {
      whereClause.date = { 
        ...whereClause.date,
        [Op.lte]: end_date 
      };
    }

    const attendanceRecords = await LabourAttendance.findAll({
      where: whereClause,
      include: [{ model: Project, as: 'project', attributes: ['project_id', 'name'] }],
      order: [['date', 'DESC']]
    });

    // Calculate statistics
    const totalHours = attendanceRecords.reduce((sum, record) => sum + parseFloat(record.hours_worked), 0);
    const totalDays = attendanceRecords.length;
    const averageHoursPerDay = totalDays > 0 ? totalHours / totalDays : 0;
    const totalEarnings = labour.wage_rate ? totalHours * parseFloat(labour.wage_rate) : 0;

    // Group by project
    const projectStats = attendanceRecords.reduce((acc, record) => {
      const projectId = record.project_id;
      if (!acc[projectId]) {
        acc[projectId] = {
          project_id: projectId,
          project_name: record.project.name,
          total_hours: 0,
          total_days: 0,
          total_earnings: 0
        };
      }
      acc[projectId].total_hours += parseFloat(record.hours_worked);
      acc[projectId].total_days += 1;
      acc[projectId].total_earnings += labour.wage_rate ? parseFloat(record.hours_worked) * parseFloat(labour.wage_rate) : 0;
      return acc;
    }, {});

    res.json({
      labour: {
        labour_id: labour.labour_id,
        name: labour.name,
        skill: labour.skill,
        wage_rate: labour.wage_rate,
        contact: labour.contact
      },
      statistics: {
        total_hours: totalHours,
        total_days: totalDays,
        average_hours_per_day: averageHoursPerDay,
        total_earnings: totalEarnings,
        project_breakdown: Object.values(projectStats)
      },
      attendance_records: attendanceRecords
    });
  } catch (error) {
    console.error('Get labour stats error:', error);
    res.status(500).json({ message: 'Failed to fetch labour statistics' });
  }
});

// Get labour by ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const labour = await Labour.findByPk(req.params.id, {
      include: [
        { 
          model: LabourAttendance, 
          as: 'attendance',
          include: [{ model: Project, as: 'project', attributes: ['project_id', 'name'] }],
          limit: 10,
          order: [['date', 'DESC']]
        }
      ]
    });

    if (!labour) {
      return res.status(404).json({ message: 'Labour not found' });
    }

    res.json({ labour });
  } catch (error) {
    console.error('Get labour error:', error);
    res.status(500).json({ message: 'Failed to fetch labour' });
  }
});

// Create labour
router.post('/', authenticateToken, authorizeRoles('Admin', 'Project Manager', 'Project On-site Team'), [
  body('name').trim().isLength({ min: 2 }).withMessage('Name must be at least 2 characters'),
  body('skill').optional().trim(),
  body('wage_rate').optional().isFloat({ min: 0 }).withMessage('Wage rate must be a positive number'),
  body('contact').optional().trim(),
  body('project_id').optional().isInt().withMessage('Project ID must be an integer')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { project_id, ...labourData } = req.body;
    const labour = await Labour.create(labourData);

    // If project_id is provided, create initial attendance record
    if (project_id) {
      const project = await Project.findByPk(project_id);
      if (!project) {
        return res.status(404).json({ message: 'Project not found' });
      }
      
      // Create a placeholder attendance record to associate labour with project
      await LabourAttendance.create({
        labour_id: labour.labour_id,
        project_id: project_id,
        date: new Date().toISOString().split('T')[0],
        hours_worked: 0
      });
    }

    res.status(201).json({
      message: 'Labour created successfully',
      labour
    });
  } catch (error) {
    console.error('Create labour error:', error);
    res.status(500).json({ message: 'Failed to create labour' });
  }
});

// Update labour
router.put('/:id', authenticateToken, authorizeRoles('Admin', 'Project Manager', 'Project On-site Team'), [
  body('name').optional().trim().isLength({ min: 2 }).withMessage('Name must be at least 2 characters'),
  body('skill').optional().trim(),
  body('wage_rate').optional().isFloat({ min: 0 }).withMessage('Wage rate must be a positive number'),
  body('contact').optional().trim()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const labour = await Labour.findByPk(req.params.id);
    if (!labour) {
      return res.status(404).json({ message: 'Labour not found' });
    }

    await labour.update(req.body);

    res.json({
      message: 'Labour updated successfully',
      labour
    });
  } catch (error) {
    console.error('Update labour error:', error);
    res.status(500).json({ message: 'Failed to update labour' });
  }
});

// Delete labour
router.delete('/:id', authenticateToken, authorizeRoles('Admin', 'Project Manager'), async (req, res) => {
  try {
    const labour = await Labour.findByPk(req.params.id);
    if (!labour) {
      return res.status(404).json({ message: 'Labour not found' });
    }

    // Check if labour has attendance records
    const attendance = await LabourAttendance.findAll({
      where: { labour_id: req.params.id }
    });

    if (attendance.length > 0) {
      return res.status(400).json({ 
        message: 'Cannot delete labour with existing attendance records. Please remove attendance records first.' 
      });
    }

    await labour.destroy();

    res.json({ message: 'Labour deleted successfully' });
  } catch (error) {
    console.error('Delete labour error:', error);
    res.status(500).json({ message: 'Failed to delete labour' });
  }
});

// Record attendance
router.post('/:id/attendance', authenticateToken, authorizeRoles('Admin', 'Project Manager', 'Project On-site Team'), [
  body('project_id').isInt().withMessage('Project ID is required'),
  body('date').isISO8601().withMessage('Invalid date'),
  body('hours_worked').isFloat({ min: 0, max: 24 }).withMessage('Hours worked must be between 0 and 24')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const labour = await Labour.findByPk(req.params.id);
    if (!labour) {
      return res.status(404).json({ message: 'Labour not found' });
    }

    const project = await Project.findByPk(req.body.project_id);
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    // Check if attendance already exists for this date
    const existingAttendance = await LabourAttendance.findOne({
      where: {
        labour_id: req.params.id,
        project_id: req.body.project_id,
        date: req.body.date
      }
    });

    if (existingAttendance) {
      return res.status(400).json({ message: 'Attendance already recorded for this date' });
    }

    const attendance = await LabourAttendance.create({
      labour_id: req.params.id,
      project_id: req.body.project_id,
      date: req.body.date,
      hours_worked: req.body.hours_worked
    });

    res.status(201).json({
      message: 'Attendance recorded successfully',
      attendance
    });
  } catch (error) {
    console.error('Record attendance error:', error);
    res.status(500).json({ message: 'Failed to record attendance' });
  }
});

// Get attendance records
router.get('/:id/attendance', authenticateToken, [
  query('project_id').optional().isInt().withMessage('Project ID must be an integer'),
  query('start_date').optional().isISO8601().withMessage('Invalid start date'),
  query('end_date').optional().isISO8601().withMessage('Invalid end date')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const labour = await Labour.findByPk(req.params.id);
    if (!labour) {
      return res.status(404).json({ message: 'Labour not found' });
    }

    const whereClause = { labour_id: req.params.id };
    if (req.query.project_id) whereClause.project_id = req.query.project_id;
    if (req.query.start_date) whereClause.date = { [Op.gte]: req.query.start_date };
    if (req.query.end_date) {
      whereClause.date = { 
        ...whereClause.date,
        [Op.lte]: req.query.end_date 
      };
    }

    const attendance = await LabourAttendance.findAll({
      where: whereClause,
      include: [{ model: Project, as: 'project', attributes: ['project_id', 'name'] }],
      order: [['date', 'DESC']]
    });

    res.json({ attendance });
  } catch (error) {
    console.error('Get attendance error:', error);
    res.status(500).json({ message: 'Failed to fetch attendance records' });
  }
});

// Update attendance
router.put('/attendance/:attendanceId', authenticateToken, authorizeRoles('Admin', 'Project Manager', 'Project On-site Team'), [
  body('hours_worked').isFloat({ min: 0, max: 24 }).withMessage('Hours worked must be between 0 and 24')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const attendance = await LabourAttendance.findByPk(req.params.attendanceId);
    if (!attendance) {
      return res.status(404).json({ message: 'Attendance record not found' });
    }

    await attendance.update({ hours_worked: req.body.hours_worked });

    res.json({
      message: 'Attendance updated successfully',
      attendance
    });
  } catch (error) {
    console.error('Update attendance error:', error);
    res.status(500).json({ message: 'Failed to update attendance' });
  }
});

// Delete attendance
router.delete('/attendance/:attendanceId', authenticateToken, authorizeRoles('Admin', 'Project Manager'), async (req, res) => {
  try {
    const attendance = await LabourAttendance.findByPk(req.params.attendanceId);
    if (!attendance) {
      return res.status(404).json({ message: 'Attendance record not found' });
    }

    await attendance.destroy();

    res.json({ message: 'Attendance record deleted successfully' });
  } catch (error) {
    console.error('Delete attendance error:', error);
    res.status(500).json({ message: 'Failed to delete attendance record' });
  }
});

// Bulk attendance recording
router.post('/bulk-attendance', authenticateToken, authorizeRoles('Admin', 'Project Manager', 'Project On-site Team'), [
  body('project_id').isInt().withMessage('Project ID is required'),
  body('date').isISO8601().withMessage('Invalid date'),
  body('attendance_records').isArray().withMessage('Attendance records must be an array'),
  body('attendance_records.*.labour_id').isInt().withMessage('Labour ID is required'),
  body('attendance_records.*.hours_worked').isFloat({ min: 0, max: 24 }).withMessage('Hours worked must be between 0 and 24')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { project_id, date, attendance_records } = req.body;

    const project = await Project.findByPk(project_id);
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    const results = [];
    const errorRecords = [];

    for (const record of attendance_records) {
      try {
        // Check if attendance already exists
        const existingAttendance = await LabourAttendance.findOne({
          where: {
            labour_id: record.labour_id,
            project_id: project_id,
            date: date
          }
        });

        if (existingAttendance) {
          errorRecords.push({
            labour_id: record.labour_id,
            error: 'Attendance already recorded for this date'
          });
          continue;
        }

        const attendance = await LabourAttendance.create({
          labour_id: record.labour_id,
          project_id: project_id,
          date: date,
          hours_worked: record.hours_worked
        });

        results.push(attendance);
      } catch (error) {
        errorRecords.push({
          labour_id: record.labour_id,
          error: error.message
        });
      }
    }

    res.status(201).json({
      message: 'Bulk attendance recorded',
      created: results.length,
      errors: errorRecords.length,
      results,
      errors: errorRecords
    });
  } catch (error) {
    console.error('Bulk attendance error:', error);
    res.status(500).json({ message: 'Failed to record bulk attendance' });
  }
});

module.exports = router;
