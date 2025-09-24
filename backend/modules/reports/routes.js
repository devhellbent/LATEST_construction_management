const express = require('express');
const { body, validationResult, query } = require('express-validator');
const { Op } = require('sequelize');
const { Report, Project, User } = require('../../models');
const { authenticateToken, authorizeRoles } = require('../../middleware/auth');
const ReportGenerator = require('../../services/ReportGenerator');

const router = express.Router();
const reportGenerator = new ReportGenerator();

// Get all reports
router.get('/', authenticateToken, [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('project_id').optional().isInt().withMessage('Project ID must be an integer'),
  query('report_type').optional().isIn(['PROGRESS', 'FINANCIAL', 'RESOURCE', 'ISSUE', 'CUSTOM']).withMessage('Invalid report type')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    const { project_id, report_type } = req.query;

    const whereClause = {};
    if (project_id) whereClause.project_id = project_id;
    if (report_type) whereClause.report_type = report_type;

    const { count, rows: reports } = await Report.findAndCountAll({
      where: whereClause,
      include: [
        { model: Project, as: 'project', attributes: ['project_id', 'name'] },
        { model: User, as: 'generatedBy', attributes: ['user_id', 'name'] }
      ],
      limit,
      offset,
      order: [['generated_date', 'DESC']]
    });

    res.json({
      reports,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(count / limit),
        totalItems: count,
        itemsPerPage: limit
      }
    });
  } catch (error) {
    console.error('Get reports error:', error);
    res.status(500).json({ message: 'Failed to fetch reports' });
  }
});

// Generate report
router.post('/generate', authenticateToken, [
  body('project_id').isInt().withMessage('Project ID is required'),
  body('report_type').isIn(['PROGRESS', 'FINANCIAL', 'RESOURCE', 'ISSUE', 'CUSTOM']).withMessage('Invalid report type'),
  body('format').optional().isIn(['json', 'csv', 'pdf']).withMessage('Format must be json, csv, or pdf'),
  body('data').optional().isObject().withMessage('Data must be an object')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const project = await Project.findByPk(req.body.project_id);
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    const format = req.body.format || 'json';
    let reportData;
    let fileInfo;

    // Generate report based on type
    switch (req.body.report_type) {
      case 'PROGRESS':
        fileInfo = await reportGenerator.generateProgressReport(req.body.project_id, format);
        reportData = await reportGenerator.generateProgressReport(req.body.project_id, 'json');
        break;
      case 'FINANCIAL':
        fileInfo = await reportGenerator.generateFinancialReport(req.body.project_id, format);
        reportData = await reportGenerator.generateFinancialReport(req.body.project_id, 'json');
        break;
      case 'RESOURCE':
        fileInfo = await reportGenerator.generateResourceReport(req.body.project_id, format);
        reportData = await reportGenerator.generateResourceReport(req.body.project_id, 'json');
        break;
      case 'ISSUE':
        fileInfo = await reportGenerator.generateIssueReport(req.body.project_id, format);
        reportData = await reportGenerator.generateIssueReport(req.body.project_id, 'json');
        break;
      case 'CUSTOM':
        reportData = req.body.data || {};
        fileInfo = { filename: 'custom_report', format: 'json' };
        break;
      default:
        return res.status(400).json({ message: 'Invalid report type' });
    }

    // Save report record
    const report = await Report.create({
      project_id: req.body.project_id,
      report_type: req.body.report_type,
      generated_by_user_id: req.user.user_id,
      data: reportData
    });

    res.status(201).json({
      message: 'Report generated successfully',
      report,
      file: fileInfo
    });
  } catch (error) {
    console.error('Generate report error:', error);
    res.status(500).json({ message: error.message || 'Failed to generate report' });
  }
});

// Generate specific report types
router.post('/progress/:projectId', authenticateToken, [
  query('format').optional().isIn(['json', 'csv', 'pdf']).withMessage('Format must be json, csv, or pdf')
], async (req, res) => {
  try {
    const format = req.query.format || 'json';
    const fileInfo = await reportGenerator.generateProgressReport(req.params.projectId, format);
    
    res.json({
      message: 'Progress report generated successfully',
      file: fileInfo
    });
  } catch (error) {
    console.error('Generate progress report error:', error);
    res.status(500).json({ message: error.message || 'Failed to generate progress report' });
  }
});

router.post('/financial/:projectId', authenticateToken, [
  query('format').optional().isIn(['json', 'csv', 'pdf']).withMessage('Format must be json, csv, or pdf')
], async (req, res) => {
  try {
    const format = req.query.format || 'json';
    const fileInfo = await reportGenerator.generateFinancialReport(req.params.projectId, format);
    
    res.json({
      message: 'Financial report generated successfully',
      file: fileInfo
    });
  } catch (error) {
    console.error('Generate financial report error:', error);
    res.status(500).json({ message: error.message || 'Failed to generate financial report' });
  }
});

router.post('/resource/:projectId', authenticateToken, [
  query('format').optional().isIn(['json', 'csv', 'pdf']).withMessage('Format must be json, csv, or pdf')
], async (req, res) => {
  try {
    const format = req.query.format || 'json';
    const fileInfo = await reportGenerator.generateResourceReport(req.params.projectId, format);
    
    res.json({
      message: 'Resource report generated successfully',
      file: fileInfo
    });
  } catch (error) {
    console.error('Generate resource report error:', error);
    res.status(500).json({ message: error.message || 'Failed to generate resource report' });
  }
});

router.post('/issue/:projectId', authenticateToken, [
  query('format').optional().isIn(['json', 'csv', 'pdf']).withMessage('Format must be json, csv, or pdf')
], async (req, res) => {
  try {
    const format = req.query.format || 'json';
    const fileInfo = await reportGenerator.generateIssueReport(req.params.projectId, format);
    
    res.json({
      message: 'Issue report generated successfully',
      file: fileInfo
    });
  } catch (error) {
    console.error('Generate issue report error:', error);
    res.status(500).json({ message: error.message || 'Failed to generate issue report' });
  }
});

// Get report by ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const report = await Report.findByPk(req.params.id, {
      include: [
        { model: Project, as: 'project', attributes: ['project_id', 'name'] },
        { model: User, as: 'generatedBy', attributes: ['user_id', 'name'] }
      ]
    });

    if (!report) {
      return res.status(404).json({ message: 'Report not found' });
    }

    res.json({ report });
  } catch (error) {
    console.error('Get report error:', error);
    res.status(500).json({ message: 'Failed to fetch report' });
  }
});

// Delete report
router.delete('/:id', authenticateToken, authorizeRoles('Admin', 'Project Manager'), async (req, res) => {
  try {
    const report = await Report.findByPk(req.params.id);
    if (!report) {
      return res.status(404).json({ message: 'Report not found' });
    }

    await report.destroy();

    res.json({ message: 'Report deleted successfully' });
  } catch (error) {
    console.error('Delete report error:', error);
    res.status(500).json({ message: 'Failed to delete report' });
  }
});

module.exports = router;
