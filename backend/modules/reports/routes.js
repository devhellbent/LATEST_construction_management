const express = require('express');
const { body, validationResult, query } = require('express-validator');
const { Op } = require('sequelize');
const ExcelJS = require('exceljs');
const { Report, Project, User, InventoryHistory, Material, MaterialIssue, MaterialReturn, Subcontractor, Warehouse, ProjectComponent, ItemMaster, ItemCategory } = require('../../models');
const { authenticateToken, authorizeRoles } = require('../../middleware/auth');
const ReportGenerator = require('../../services/ReportGenerator');

const router = express.Router();
const reportGenerator = new ReportGenerator();

// Get all reports
router.get('/', authenticateToken, [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('project_id').optional().isInt().withMessage('Project ID must be an integer'),
  query('report_type').optional().isIn(['PROGRESS', 'FINANCIAL', 'RESOURCE', 'ISSUE', 'CUSTOM', 'RESTOCK']).withMessage('Invalid report type')
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
  body('report_type').isIn(['PROGRESS', 'FINANCIAL', 'RESOURCE', 'ISSUE', 'CUSTOM', 'RESTOCK']).withMessage('Invalid report type'),
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
      case 'RESTOCK':
        fileInfo = await reportGenerator.generateRestockReport(req.body.project_id, format);
        reportData = await reportGenerator.generateRestockReport(req.body.project_id, 'json');
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

// Generate restock report
router.post('/restock/:projectId', authenticateToken, [
  query('format').optional().isIn(['json', 'csv', 'pdf']).withMessage('Format must be json, csv, or pdf'),
  query('date_from').optional().isDate().withMessage('Invalid start date'),
  query('date_to').optional().isDate().withMessage('Invalid end date')
], async (req, res) => {
  try {
    const format = req.query.format || 'json';
    const { date_from, date_to } = req.query;
    
    const fileInfo = await reportGenerator.generateRestockReport(req.params.projectId, format, { date_from, date_to });
    
    res.json({
      message: 'Restock report generated successfully',
      file: fileInfo
    });
  } catch (error) {
    console.error('Generate restock report error:', error);
    res.status(500).json({ message: error.message || 'Failed to generate restock report' });
  }
});

// Get restock summary for dashboard
router.get('/restock/summary/:projectId', authenticateToken, async (req, res) => {
  try {
    const { projectId } = req.params;
    const { date_from, date_to } = req.query;

    const whereClause = {
      transaction_type: 'RESTOCK'
    };
    
    if (date_from || date_to) {
      whereClause.transaction_date = {};
      if (date_from) whereClause.transaction_date[Op.gte] = date_from;
      if (date_to) whereClause.transaction_date[Op.lte] = date_to;
    }

    // Get restock summary
    const restockSummary = await InventoryHistory.findAll({
      where: whereClause,
      include: [
        { 
          model: Material, 
          as: 'material', 
          attributes: ['material_id', 'name', 'unit', 'cost_per_unit'],
          where: { project_id: projectId }
        }
      ],
      attributes: [
        'material_id',
        [InventoryHistory.sequelize.fn('SUM', InventoryHistory.sequelize.col('quantity_change')), 'total_restocked'],
        [InventoryHistory.sequelize.fn('COUNT', InventoryHistory.sequelize.col('history_id')), 'restock_count']
      ],
      group: ['material_id'],
      order: [[InventoryHistory.sequelize.fn('SUM', InventoryHistory.sequelize.col('quantity_change')), 'DESC']]
    });

    // Get total restock value
    const totalRestockValue = await InventoryHistory.findAll({
      where: whereClause,
      include: [
        { 
          model: Material, 
          as: 'material', 
          attributes: ['cost_per_unit'],
          where: { project_id: projectId }
        }
      ],
      attributes: [
        [InventoryHistory.sequelize.fn('SUM', 
          InventoryHistory.sequelize.literal('quantity_change * material.cost_per_unit')
        ), 'total_value']
      ],
      raw: true
    });

    res.json({
      summary: restockSummary,
      totalValue: totalRestockValue[0]?.total_value || 0
    });
  } catch (error) {
    console.error('Get restock summary error:', error);
    res.status(500).json({ message: 'Failed to fetch restock summary' });
  }
});

// Helper function to fetch subcontractor material issue data
async function fetchSubcontractorMaterialData(filters) {
  const { project_id, subcontractor_id, date_from, date_to } = filters;

  // Build where clause for material issues
  // If only project_id is provided, get all issues for that project (including NULL subcontractor_id)
  // If only subcontractor_id is provided, get all issues for that subcontractor across all projects
  // If both are provided, get issues matching both
  const issueWhereClause = {};
  
  if (project_id && subcontractor_id) {
    // Both filters: must match both
    issueWhereClause.project_id = project_id;
    issueWhereClause.subcontractor_id = subcontractor_id;
  } else if (project_id) {
    // Only project: get all issues for this project (including NULL subcontractor_id)
    issueWhereClause.project_id = project_id;
  } else if (subcontractor_id) {
    // Only subcontractor: get all issues for this subcontractor
    issueWhereClause.subcontractor_id = subcontractor_id;
  }

  if (date_from || date_to) {
    issueWhereClause.issue_date = {};
    if (date_from) issueWhereClause.issue_date[Op.gte] = date_from;
    if (date_to) issueWhereClause.issue_date[Op.lte] = date_to;
  }

  console.log('Fetching material issues with where clause:', JSON.stringify(issueWhereClause, null, 2));

  // Fetch all material issues
  // Use raw: false to get Sequelize instances, but handle errors gracefully
  let materialIssues = [];
  try {
    materialIssues = await MaterialIssue.findAll({
      where: issueWhereClause,
      include: [
        {
          model: Material,
          as: 'material',
          attributes: ['material_id', 'name', 'unit', 'type', 'category', 'item_code', 'size', 'cost_per_unit'],
          required: false // LEFT JOIN - include even if material doesn't exist
        },
        {
          model: Project,
          as: 'project',
          attributes: ['project_id', 'name'],
          required: false
        },
        {
          model: User,
          as: 'issued_by',
          foreignKey: 'issued_by_user_id',
          attributes: ['user_id', 'name', 'email'],
          required: false
        },
        {
          model: User,
          as: 'received_by',
          foreignKey: 'received_by_user_id',
          attributes: ['user_id', 'name', 'email'],
          required: false
        },
        {
          model: Subcontractor,
          as: 'subcontractor',
          attributes: ['subcontractor_id', 'company_name', 'work_type', 'contact_person', 'phone', 'email'],
          required: false // LEFT JOIN - include even if subcontractor is NULL
        },
        {
          model: Warehouse,
          as: 'warehouse',
          attributes: ['warehouse_id', 'warehouse_name', 'address'],
          required: false
        },
        {
          model: ProjectComponent,
          as: 'component',
          attributes: ['component_id', 'component_name', 'component_type'],
          required: false
        }
      ],
      order: [['issue_date', 'DESC']],
      limit: 10000 // Set a reasonable limit to avoid memory issues
    });
    console.log(`Found ${materialIssues.length} material issues`);
    if (materialIssues.length > 0) {
      console.log('Sample issue:', {
        issue_id: materialIssues[0].issue_id,
        project_id: materialIssues[0].project_id,
        subcontractor_id: materialIssues[0].subcontractor_id,
        material_name: materialIssues[0].material?.name
      });
    }
  } catch (queryError) {
    console.error('Error fetching material issues:', queryError);
    console.error('Query error details:', queryError.message);
    // Return empty array on error rather than crashing
    materialIssues = [];
  }

  // Build where clause for material returns
  // Material returns don't have direct subcontractor_id field
  // If filtering by subcontractor, filter returns by linked issue IDs
  const returnWhereClause = {};
  if (project_id) returnWhereClause.project_id = project_id;

  if (date_from || date_to) {
    returnWhereClause.return_date = {};
    if (date_from) returnWhereClause.return_date[Op.gte] = date_from;
    if (date_to) returnWhereClause.return_date[Op.lte] = date_to;
  }

  // If filtering by subcontractor, get issue IDs and filter returns by those
  let materialReturns = [];
  if (subcontractor_id && materialIssues.length > 0) {
    const issueIds = materialIssues.map(issue => issue.issue_id);
    returnWhereClause.issue_id = { [Op.in]: issueIds };
  } else if (subcontractor_id && materialIssues.length === 0) {
    // No issues for this subcontractor, so no returns
    materialReturns = [];
  }

  // Only query if we have a valid where clause and haven't already set empty array
  if (materialReturns.length === 0 && Object.keys(returnWhereClause).length > 0) {
    try {
      materialReturns = await MaterialReturn.findAll({
        where: returnWhereClause,
        include: [
          {
            model: Material,
            as: 'material',
            attributes: ['material_id', 'name', 'unit', 'type', 'category', 'item_code', 'size', 'cost_per_unit'],
            required: false
          },
          {
            model: Project,
            as: 'project',
            attributes: ['project_id', 'name'],
            required: false
          },
          {
            model: User,
            as: 'returned_by_user',
            foreignKey: 'returned_by_user_id',
            attributes: ['user_id', 'name', 'email'],
            required: false
          },
          {
            model: User,
            as: 'approved_by',
            foreignKey: 'approved_by_user_id',
            attributes: ['user_id', 'name', 'email'],
            required: false
          },
          {
            model: MaterialIssue,
            as: 'material_issue',
            foreignKey: 'issue_id',
            attributes: ['issue_id', 'issue_date', 'quantity_issued'],
            required: false,
            include: [
              {
                model: Subcontractor,
                as: 'subcontractor',
                attributes: ['subcontractor_id', 'company_name', 'work_type', 'contact_person'],
                required: false
              }
            ]
          },
          {
            model: Warehouse,
            as: 'warehouse',
            attributes: ['warehouse_id', 'warehouse_name', 'address'],
            required: false
          },
          {
            model: ProjectComponent,
            as: 'component',
            attributes: ['component_id', 'component_name', 'component_type'],
            required: false
          }
        ],
        order: [['return_date', 'DESC']],
        limit: 10000
      });
      console.log(`Found ${materialReturns.length} material returns`);
    } catch (queryError) {
      console.error('Error fetching material returns:', queryError);
      materialReturns = [];
    }
  }

  // Calculate summary statistics
  const totalIssued = materialIssues && materialIssues.length > 0
    ? materialIssues.reduce((sum, issue) => sum + (issue.quantity_issued || 0), 0)
    : 0;
  const totalReturned = (materialReturns && materialReturns.length > 0) 
    ? materialReturns.reduce((sum, ret) => sum + (ret.quantity || 0), 0) 
    : 0;
  const netIssued = totalIssued - totalReturned;

  // Group issues by material
  const materialSummary = {};
  if (materialIssues && materialIssues.length > 0) {
    materialIssues.forEach(issue => {
    const materialId = issue.material_id;
    const materialName = issue.material?.name || 'Unknown Material';
    if (!materialSummary[materialId]) {
      materialSummary[materialId] = {
        material_id: materialId,
        material_name: materialName,
        unit: issue.material?.unit || '',
        category: issue.material?.category || '',
        total_issued: 0,
        total_returned: 0,
        net_issued: 0
      };
    }
    materialSummary[materialId].total_issued += issue.quantity_issued || 0;
    });
  }

  // Add returns to material summary (only if returns exist)
  if (materialReturns && materialReturns.length > 0) {
    materialReturns.forEach(ret => {
      const materialId = ret.material_id;
      const materialName = ret.material?.name || 'Unknown Material';
      if (!materialSummary[materialId]) {
        materialSummary[materialId] = {
          material_id: materialId,
          material_name: materialName,
          unit: ret.material?.unit || '',
          category: ret.material?.category || '',
          total_issued: 0,
          total_returned: 0,
          net_issued: 0
        };
      }
      materialSummary[materialId].total_returned += ret.quantity || 0;
    });
  }

  // Calculate net issued for each material
  Object.keys(materialSummary).forEach(materialId => {
    materialSummary[materialId].net_issued = 
      materialSummary[materialId].total_issued - materialSummary[materialId].total_returned;
  });

  return {
    materialIssues: materialIssues || [],
    materialReturns: materialReturns || [],
    summary: {
      total_issues: (materialIssues && materialIssues.length) ? materialIssues.length : 0,
      total_returns: (materialReturns && materialReturns.length) ? materialReturns.length : 0,
      total_issued: totalIssued || 0,
      total_returned: totalReturned || 0,
      net_issued: netIssued || 0
    },
    material_summary: materialSummary ? Object.values(materialSummary) : []
  };
}

// Get subcontractor material issue report preview (JSON)
router.get('/subcontractor-material-issues/preview', authenticateToken, [
  query('project_id').optional().isInt().withMessage('Project ID must be an integer'),
  query('subcontractor_id').optional().isInt().withMessage('Subcontractor ID must be an integer'),
  query('date_from').optional().isDate().withMessage('Invalid start date'),
  query('date_to').optional().isDate().withMessage('Invalid end date')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    let { project_id, subcontractor_id, date_from, date_to } = req.query;

    // Convert string IDs to integers
    if (project_id) project_id = parseInt(project_id);
    if (subcontractor_id) subcontractor_id = parseInt(subcontractor_id);

    // At least one filter is required
    if (!project_id && !subcontractor_id) {
      return res.status(400).json({ message: 'At least one of project_id or subcontractor_id is required' });
    }

    console.log('Preview request params:', { project_id, subcontractor_id, date_from, date_to });

    // Fetch data using helper function
    const data = await fetchSubcontractorMaterialData({ project_id, subcontractor_id, date_from, date_to });

    console.log('Preview data summary:', {
      issuesCount: data.materialIssues?.length || 0,
      returnsCount: data.materialReturns?.length || 0,
      summary: data.summary
    });

    // Get project and subcontractor info if provided
    let project = null;
    let subcontractor = null;
    if (project_id) {
      project = await Project.findByPk(project_id, { attributes: ['project_id', 'name'] });
    }
    if (subcontractor_id) {
      subcontractor = await Subcontractor.findByPk(subcontractor_id, {
        attributes: ['subcontractor_id', 'company_name', 'work_type', 'contact_person', 'phone', 'email']
      });
    }

    const response = {
      project,
      subcontractor,
      date_range: {
        from: date_from || null,
        to: date_to || null
      },
      ...data
    };

    console.log('Sending preview response with', response.summary?.total_issues || 0, 'issues');
    res.json(response);
  } catch (error) {
    console.error('Get subcontractor material issue preview error:', error);
    res.status(500).json({ message: error.message || 'Failed to fetch report preview' });
  }
});

// Get subcontractor material issue report (Excel download)
router.get('/subcontractor-material-issues', authenticateToken, [
  query('project_id').optional().isInt().withMessage('Project ID must be an integer'),
  query('subcontractor_id').optional().isInt().withMessage('Subcontractor ID must be an integer'),
  query('date_from').optional().isDate().withMessage('Invalid start date'),
  query('date_to').optional().isDate().withMessage('Invalid end date')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    let { project_id, subcontractor_id, date_from, date_to } = req.query;

    // Convert string IDs to integers
    if (project_id) project_id = parseInt(project_id);
    if (subcontractor_id) subcontractor_id = parseInt(subcontractor_id);

    // At least one filter is required
    if (!project_id && !subcontractor_id) {
      return res.status(400).json({ message: 'At least one of project_id or subcontractor_id is required' });
    }

    console.log('Download request params:', { project_id, subcontractor_id, date_from, date_to });

    // Fetch data using helper function
    const { materialIssues, materialReturns } = await fetchSubcontractorMaterialData({ project_id, subcontractor_id, date_from, date_to });

    // Create Excel workbook
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Construction Management System';
    workbook.created = new Date();

    // Summary Sheet
    const summarySheet = workbook.addWorksheet('Summary');
    summarySheet.columns = [
      { header: 'Metric', key: 'metric', width: 35 },
      { header: 'Value', key: 'value', width: 20 }
    ];

    // Get project and subcontractor info for summary
    let project = null;
    let subcontractor = null;
    if (project_id) {
      project = await Project.findByPk(project_id, { attributes: ['project_id', 'name'] });
    }
    if (subcontractor_id) {
      subcontractor = await Subcontractor.findByPk(subcontractor_id, {
        attributes: ['subcontractor_id', 'company_name', 'work_type', 'contact_person', 'phone', 'email']
      });
    }

    const totalIssued = materialIssues.reduce((sum, issue) => sum + (issue.quantity_issued || 0), 0);
    const totalReturned = (materialReturns && materialReturns.length > 0) 
      ? materialReturns.reduce((sum, ret) => sum + (ret.quantity || 0), 0) 
      : 0;
    const netIssued = totalIssued - totalReturned;
    const totalCostIssued = materialIssues.reduce((sum, issue) => {
      const cost = (issue.quantity_issued || 0) * (issue.material?.cost_per_unit || 0);
      return sum + cost;
    }, 0);
    const totalCostReturned = (materialReturns && materialReturns.length > 0)
      ? materialReturns.reduce((sum, ret) => {
          const cost = (ret.quantity || 0) * (ret.material?.cost_per_unit || 0);
          return sum + cost;
        }, 0)
      : 0;
    const netCost = totalCostIssued - totalCostReturned;

    // Add filter information
    summarySheet.addRow({ metric: 'Report Generated On', value: new Date().toLocaleString() });
    summarySheet.addRow({ metric: 'Date Range From', value: date_from || 'All Dates' });
    summarySheet.addRow({ metric: 'Date Range To', value: date_to || 'All Dates' });
    summarySheet.addRow({ metric: '', value: '' }); // Empty row for spacing
    summarySheet.addRow({ metric: 'Project ID', value: project_id || 'All Projects' });
    summarySheet.addRow({ metric: 'Project Name', value: project?.name || 'N/A' });
    summarySheet.addRow({ metric: 'Subcontractor ID', value: subcontractor_id || 'All Subcontractors' });
    summarySheet.addRow({ metric: 'Subcontractor Company Name', value: subcontractor?.company_name || 'N/A' });
    summarySheet.addRow({ metric: 'Subcontractor Work Type', value: subcontractor?.work_type || 'N/A' });
    summarySheet.addRow({ metric: 'Subcontractor Contact Person', value: subcontractor?.contact_person || 'N/A' });
    summarySheet.addRow({ metric: 'Subcontractor Phone', value: subcontractor?.phone || 'N/A' });
    summarySheet.addRow({ metric: 'Subcontractor Email', value: subcontractor?.email || 'N/A' });
    summarySheet.addRow({ metric: '', value: '' }); // Empty row for spacing
    summarySheet.addRow({ metric: 'Total Issues Count', value: materialIssues.length });
    summarySheet.addRow({ metric: 'Total Returns Count', value: (materialReturns && materialReturns.length) ? materialReturns.length : 0 });
    summarySheet.addRow({ metric: 'Total Quantity Issued', value: totalIssued });
    summarySheet.addRow({ metric: 'Total Quantity Returned', value: totalReturned });
    summarySheet.addRow({ metric: 'Net Quantity Issued', value: netIssued });
    summarySheet.addRow({ metric: '', value: '' }); // Empty row for spacing
    summarySheet.addRow({ metric: 'Total Cost of Issued Materials', value: totalCostIssued.toFixed(2) });
    summarySheet.addRow({ metric: 'Total Cost of Returned Materials', value: totalCostReturned.toFixed(2) });
    summarySheet.addRow({ metric: 'Net Cost of Issued Materials', value: netCost.toFixed(2) });

    // Format header row
    summarySheet.getRow(1).font = { bold: true };
    summarySheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' }
    };

    // Material Issues Sheet
    const issuesSheet = workbook.addWorksheet('Material Issues');
    issuesSheet.columns = [
      { header: 'Issue ID', key: 'issue_id', width: 12 },
      { header: 'Issue Date', key: 'issue_date', width: 12 },
      { header: 'Project ID', key: 'project_id', width: 12 },
      { header: 'Project Name', key: 'project_name', width: 25 },
      { header: 'Subcontractor ID', key: 'subcontractor_id', width: 15 },
      { header: 'Subcontractor Company Name', key: 'subcontractor_name', width: 30 },
      { header: 'Subcontractor Work Type', key: 'subcontractor_work_type', width: 20 },
      { header: 'Subcontractor Contact Person', key: 'subcontractor_contact', width: 25 },
      { header: 'Subcontractor Phone', key: 'subcontractor_phone', width: 15 },
      { header: 'Subcontractor Email', key: 'subcontractor_email', width: 25 },
      { header: 'Material ID', key: 'material_id', width: 12 },
      { header: 'Material Name', key: 'material_name', width: 30 },
      { header: 'Material Category', key: 'category', width: 20 },
      { header: 'Material Type', key: 'material_type', width: 20 },
      { header: 'Item Code', key: 'item_code', width: 15 },
      { header: 'Size', key: 'size', width: 15 },
      { header: 'Quantity Issued', key: 'quantity', width: 15 },
      { header: 'Unit', key: 'unit', width: 10 },
      { header: 'Cost Per Unit', key: 'cost_per_unit', width: 15 },
      { header: 'Total Cost', key: 'total_cost', width: 15 },
      { header: 'Issued By User ID', key: 'issued_by_user_id', width: 15 },
      { header: 'Issued By Name', key: 'issued_by', width: 20 },
      { header: 'Issued By Email', key: 'issued_by_email', width: 25 },
      { header: 'Received By User ID', key: 'received_by_user_id', width: 15 },
      { header: 'Received By Name', key: 'received_by', width: 20 },
      { header: 'Received By Email', key: 'received_by_email', width: 25 },
      { header: 'Status', key: 'status', width: 12 },
      { header: 'Issue Type', key: 'issue_type', width: 15 },
      { header: 'Reference Number', key: 'reference', width: 20 },
      { header: 'MRR ID', key: 'mrr_id', width: 12 },
      { header: 'PO ID', key: 'po_id', width: 12 },
      { header: 'Receipt ID', key: 'receipt_id', width: 12 },
      { header: 'Component ID', key: 'component_id', width: 15 },
      { header: 'Component Name', key: 'component', width: 25 },
      { header: 'Component Type', key: 'component_type', width: 20 },
      { header: 'Warehouse ID', key: 'warehouse_id', width: 15 },
      { header: 'Warehouse Name', key: 'warehouse', width: 25 },
      { header: 'Warehouse Address', key: 'warehouse_address', width: 30 },
      { header: 'Issue Purpose', key: 'purpose', width: 30 },
      { header: 'Location', key: 'location', width: 25 },
      { header: 'Created At', key: 'created_at', width: 20 },
      { header: 'Updated At', key: 'updated_at', width: 20 }
    ];

    materialIssues.forEach(issue => {
      const totalCost = (issue.quantity_issued || 0) * (issue.material?.cost_per_unit || 0);
      issuesSheet.addRow({
        issue_id: issue.issue_id,
        issue_date: issue.issue_date,
        project_id: issue.project_id,
        project_name: issue.project?.name || 'N/A',
        subcontractor_id: issue.subcontractor_id || 'N/A',
        subcontractor_name: issue.subcontractor?.company_name || 'N/A',
        subcontractor_work_type: issue.subcontractor?.work_type || 'N/A',
        subcontractor_contact: issue.subcontractor?.contact_person || 'N/A',
        subcontractor_phone: issue.subcontractor?.phone || 'N/A',
        subcontractor_email: issue.subcontractor?.email || 'N/A',
        material_id: issue.material_id,
        material_name: issue.material?.name || 'N/A',
        category: issue.material?.category || 'N/A',
        material_type: issue.material?.type || 'N/A',
        item_code: issue.material?.item_code || 'N/A',
        size: issue.size || issue.material?.size || 'N/A',
        quantity: issue.quantity_issued,
        unit: issue.material?.unit || 'N/A',
        cost_per_unit: issue.material?.cost_per_unit || 0,
        total_cost: totalCost,
        issued_by_user_id: issue.issued_by_user_id,
        issued_by: issue.issued_by?.name || 'N/A',
        issued_by_email: issue.issued_by?.email || 'N/A',
        received_by_user_id: issue.received_by_user_id || 'N/A',
        received_by: issue.received_by?.name || 'N/A',
        received_by_email: issue.received_by?.email || 'N/A',
        status: issue.status,
        issue_type: issue.issue_type || 'N/A',
        reference: issue.reference_number || 'N/A',
        mrr_id: issue.mrr_id || 'N/A',
        po_id: issue.po_id || 'N/A',
        receipt_id: issue.receipt_id || 'N/A',
        component_id: issue.component_id || 'N/A',
        component: issue.component?.component_name || 'N/A',
        component_type: issue.component?.component_type || 'N/A',
        warehouse_id: issue.warehouse_id || 'N/A',
        warehouse: issue.warehouse?.warehouse_name || 'N/A',
        warehouse_address: issue.warehouse?.address || 'N/A',
        purpose: issue.issue_purpose || 'N/A',
        location: issue.location || 'N/A',
        created_at: issue.created_at || 'N/A',
        updated_at: issue.updated_at || 'N/A'
      });
    });

    // Format header row
    issuesSheet.getRow(1).font = { bold: true };
    issuesSheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' }
    };

    // Material Returns Sheet (only if returns exist)
    let returnsSheet = null;
    if (materialReturns && materialReturns.length > 0) {
      returnsSheet = workbook.addWorksheet('Material Returns');
      returnsSheet.columns = [
        { header: 'Return ID', key: 'return_id', width: 12 },
        { header: 'Return Date', key: 'return_date', width: 12 },
        { header: 'Project ID', key: 'project_id', width: 12 },
        { header: 'Project Name', key: 'project_name', width: 25 },
        { header: 'Subcontractor ID', key: 'subcontractor_id', width: 15 },
        { header: 'Subcontractor Company Name', key: 'subcontractor_name', width: 30 },
        { header: 'Subcontractor Work Type', key: 'subcontractor_work_type', width: 20 },
        { header: 'Subcontractor Contact Person', key: 'subcontractor_contact', width: 25 },
        { header: 'Material ID', key: 'material_id', width: 12 },
        { header: 'Material Name', key: 'material_name', width: 30 },
        { header: 'Material Category', key: 'category', width: 20 },
        { header: 'Material Type', key: 'material_type', width: 20 },
        { header: 'Item Code', key: 'item_code', width: 15 },
        { header: 'Size', key: 'size', width: 15 },
        { header: 'Quantity Returned', key: 'quantity', width: 15 },
        { header: 'Unit', key: 'unit', width: 10 },
        { header: 'Cost Per Unit', key: 'cost_per_unit', width: 15 },
        { header: 'Total Cost', key: 'total_cost', width: 15 },
        { header: 'Returned By (String)', key: 'returned_by_string', width: 20 },
        { header: 'Returned By User ID', key: 'returned_by_user_id', width: 15 },
        { header: 'Returned By Name', key: 'returned_by', width: 20 },
        { header: 'Returned By Email', key: 'returned_by_email', width: 25 },
        { header: 'Approved By User ID', key: 'approved_by_user_id', width: 15 },
        { header: 'Approved By Name', key: 'approved_by', width: 20 },
        { header: 'Approved By Email', key: 'approved_by_email', width: 25 },
        { header: 'Status', key: 'status', width: 12 },
        { header: 'Return Type', key: 'return_type', width: 15 },
        { header: 'Condition Status', key: 'condition', width: 15 },
        { header: 'Return Reason', key: 'reason', width: 30 },
        { header: 'Reference Number', key: 'reference', width: 20 },
        { header: 'Linked Issue ID', key: 'linked_issue', width: 15 },
        { header: 'Linked Issue Date', key: 'linked_issue_date', width: 15 },
        { header: 'Linked Issue Quantity', key: 'linked_issue_quantity', width: 18 },
        { header: 'MRR ID', key: 'mrr_id', width: 12 },
        { header: 'PO ID', key: 'po_id', width: 12 },
        { header: 'Component ID', key: 'component_id', width: 15 },
        { header: 'Component Name', key: 'component', width: 25 },
        { header: 'Component Type', key: 'component_type', width: 20 },
        { header: 'Warehouse ID', key: 'warehouse_id', width: 15 },
        { header: 'Warehouse Name', key: 'warehouse', width: 25 },
        { header: 'Warehouse Address', key: 'warehouse_address', width: 30 },
        { header: 'Created At', key: 'created_at', width: 20 },
        { header: 'Updated At', key: 'updated_at', width: 20 }
      ];

      materialReturns.forEach(ret => {
        const totalCost = (ret.quantity || 0) * (ret.material?.cost_per_unit || 0);
        returnsSheet.addRow({
          return_id: ret.return_id,
          return_date: ret.return_date,
          project_id: ret.project_id,
          project_name: ret.project?.name || 'N/A',
          subcontractor_id: ret.subcontractor_id || ret.material_issue?.subcontractor_id || 'N/A',
          subcontractor_name: ret.material_issue?.subcontractor?.company_name || 'N/A',
          subcontractor_work_type: ret.material_issue?.subcontractor?.work_type || 'N/A',
          subcontractor_contact: ret.material_issue?.subcontractor?.contact_person || 'N/A',
          material_id: ret.material_id,
          material_name: ret.material?.name || 'N/A',
          category: ret.material?.category || 'N/A',
          material_type: ret.material?.type || 'N/A',
          item_code: ret.material?.item_code || 'N/A',
          size: ret.size || ret.material?.size || 'N/A',
          quantity: ret.quantity,
          unit: ret.material?.unit || 'N/A',
          cost_per_unit: ret.material?.cost_per_unit || 0,
          total_cost: totalCost,
          returned_by_string: ret.returned_by || 'N/A',
          returned_by_user_id: ret.returned_by_user_id,
          returned_by: ret.returned_by_user?.name || 'N/A',
          returned_by_email: ret.returned_by_user?.email || 'N/A',
          approved_by_user_id: ret.approved_by_user_id || 'N/A',
          approved_by: ret.approved_by?.name || 'N/A',
          approved_by_email: ret.approved_by?.email || 'N/A',
          status: ret.status,
          return_type: ret.return_type || 'N/A',
          condition: ret.condition_status || 'N/A',
          reason: ret.return_reason || 'N/A',
          reference: ret.reference_number || 'N/A',
          linked_issue: ret.issue_id || ret.material_issue?.issue_id || 'N/A',
          linked_issue_date: ret.material_issue?.issue_date || 'N/A',
          linked_issue_quantity: ret.material_issue?.quantity_issued || 'N/A',
          mrr_id: ret.mrr_id || 'N/A',
          po_id: ret.po_id || 'N/A',
          component_id: ret.component_id || 'N/A',
          component: ret.component?.component_name || 'N/A',
          component_type: ret.component?.component_type || 'N/A',
          warehouse_id: ret.warehouse_id || 'N/A',
          warehouse: ret.warehouse?.warehouse_name || 'N/A',
          warehouse_address: ret.warehouse?.address || 'N/A',
          created_at: ret.created_at || 'N/A',
          updated_at: ret.updated_at || 'N/A'
        });
      });
    }

    // Format header row (only when sheet exists)
    if (returnsSheet) {
      returnsSheet.getRow(1).font = { bold: true };
      returnsSheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE0E0E0' }
      };
    }

    // Generate filename
    const timestamp = new Date().toISOString().split('T')[0];
    let filename = 'subcontractor-material-report';
    if (project_id) {
      const project = await Project.findByPk(project_id);
      if (project) filename += `-${project.name.replace(/[^a-z0-9]/gi, '_')}`;
    }
    if (subcontractor_id) {
      const subcontractor = await Subcontractor.findByPk(subcontractor_id);
      if (subcontractor) filename += `-${subcontractor.company_name.replace(/[^a-z0-9]/gi, '_')}`;
    }
    filename += `-${timestamp}.xlsx`;

    // Set response headers
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    // Write workbook to response
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error('Get subcontractor material issue report error:', error);
    res.status(500).json({ message: error.message || 'Failed to generate subcontractor material issue report' });
  }
});

// Get report by ID (must be after specific routes)
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
