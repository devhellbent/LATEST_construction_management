const PDFDocument = require('pdfkit');
const createCsvWriter = require('csv-writer').createObjectCsvWriter;
const fs = require('fs');
const path = require('path');
const { Project, Task, Issue, Material, Labour, PettyCashExpense, MaterialAllocation, LabourAttendance, Payroll, InventoryHistory } = require('../models');
const { Op } = require('sequelize');

class ReportGenerator {
  constructor() {
    this.reportsDir = path.join(__dirname, '../../reports');
    if (!fs.existsSync(this.reportsDir)) {
      fs.mkdirSync(this.reportsDir, { recursive: true });
    }
  }

  // Generate Progress Report
  async generateProgressReport(projectId, format = 'json') {
    try {
      const project = await Project.findByPk(projectId, {
        include: [
          { model: Task, as: 'tasks' },
          { model: Issue, as: 'issues' }
        ]
      });

      if (!project) {
        throw new Error('Project not found');
      }

      const reportData = {
        project: {
          id: project.project_id,
          name: project.name,
          description: project.description,
          status: project.status,
          startDate: project.start_date,
          endDate: project.end_date,
          budget: project.budget
        },
        tasks: {
          total: project.tasks.length,
          completed: project.tasks.filter(t => t.status === 'DONE').length,
          inProgress: project.tasks.filter(t => t.status === 'IN_PROGRESS').length,
          todo: project.tasks.filter(t => t.status === 'TODO').length,
          blocked: project.tasks.filter(t => t.status === 'BLOCKED').length,
          completionRate: project.tasks.length > 0 ? 
            Math.round((project.tasks.filter(t => t.status === 'DONE').length / project.tasks.length) * 100) : 0
        },
        issues: {
          total: project.issues.length,
          open: project.issues.filter(i => i.status === 'OPEN').length,
          inProgress: project.issues.filter(i => i.status === 'IN_PROGRESS').length,
          resolved: project.issues.filter(i => i.status === 'RESOLVED').length,
          closed: project.issues.filter(i => i.status === 'CLOSED').length
        },
        generatedAt: new Date().toISOString()
      };

      return await this.saveReport(reportData, `progress_report_${projectId}`, format);
    } catch (error) {
      throw new Error(`Failed to generate progress report: ${error.message}`);
    }
  }

  // Generate Financial Report
  async generateFinancialReport(projectId, format = 'json') {
    try {
      const project = await Project.findByPk(projectId, {
        include: [
          { model: PettyCashExpense, as: 'expenses' },
          { model: Payroll, as: 'payroll' },
          { model: MaterialAllocation, as: 'materialAllocations', include: [{ model: Material, as: 'material' }] }
        ]
      });

      if (!project) {
        throw new Error('Project not found');
      }

      // Calculate material costs
      const materialCosts = project.materialAllocations.reduce((total, allocation) => {
        return total + (allocation.quantity * (allocation.material.cost_per_unit || 0));
      }, 0);

      // Calculate labour costs
      const labourCosts = project.payroll.reduce((total, payroll) => {
        return total + payroll.amount_paid;
      }, 0);

      // Calculate petty cash expenses
      const pettyCashTotal = project.expenses.reduce((total, expense) => {
        return total + expense.amount;
      }, 0);

      const reportData = {
        project: {
          id: project.project_id,
          name: project.name,
          budget: project.budget
        },
        costs: {
          materials: materialCosts,
          labour: labourCosts,
          pettyCash: pettyCashTotal,
          total: materialCosts + labourCosts + pettyCashTotal
        },
        budget: {
          allocated: project.budget || 0,
          spent: materialCosts + labourCosts + pettyCashTotal,
          remaining: (project.budget || 0) - (materialCosts + labourCosts + pettyCashTotal),
          utilizationRate: project.budget ? 
            Math.round(((materialCosts + labourCosts + pettyCashTotal) / project.budget) * 100) : 0
        },
        breakdown: {
          materialAllocations: project.materialAllocations.map(allocation => ({
            material: allocation.material.name,
            quantity: allocation.quantity,
            unitCost: allocation.material.cost_per_unit,
            totalCost: allocation.quantity * (allocation.material.cost_per_unit || 0)
          })),
          payroll: project.payroll.map(payroll => ({
            labourId: payroll.labour_id,
            amount: payroll.amount_paid,
            deductions: payroll.deductions,
            netAmount: payroll.amount_paid - payroll.deductions
          })),
          expenses: project.expenses.map(expense => ({
            category: expense.category,
            amount: expense.amount,
            description: expense.description,
            date: expense.date
          }))
        },
        generatedAt: new Date().toISOString()
      };

      return await this.saveReport(reportData, `financial_report_${projectId}`, format);
    } catch (error) {
      throw new Error(`Failed to generate financial report: ${error.message}`);
    }
  }

  // Generate Resource Report
  async generateResourceReport(projectId, format = 'json') {
    try {
      const project = await Project.findByPk(projectId, {
        include: [
          { model: MaterialAllocation, as: 'materialAllocations', include: [{ model: Material, as: 'material' }] },
          { model: LabourAttendance, as: 'labourAttendance', include: [{ model: Labour, as: 'labour' }] }
        ]
      });

      if (!project) {
        throw new Error('Project not found');
      }

      // Group material allocations by material
      const materialUsage = {};
      project.materialAllocations.forEach(allocation => {
        const materialName = allocation.material.name;
        if (!materialUsage[materialName]) {
          materialUsage[materialName] = {
            name: materialName,
            totalAllocated: 0,
            totalCost: 0,
            allocations: []
          };
        }
        materialUsage[materialName].totalAllocated += allocation.quantity;
        materialUsage[materialName].totalCost += allocation.quantity * (allocation.material.cost_per_unit || 0);
        materialUsage[materialName].allocations.push({
          date: allocation.date_allocated,
          quantity: allocation.quantity
        });
      });

      // Group labour attendance by labour
      const labourUsage = {};
      project.labourAttendance.forEach(attendance => {
        const labourName = attendance.labour.name;
        if (!labourUsage[labourName]) {
          labourUsage[labourName] = {
            name: labourName,
            skill: attendance.labour.skill,
            totalHours: 0,
            wageRate: attendance.labour.wage_rate,
            attendance: []
          };
        }
        labourUsage[labourName].totalHours += attendance.hours_worked;
        labourUsage[labourName].attendance.push({
          date: attendance.date,
          hours: attendance.hours_worked
        });
      });

      const reportData = {
        project: {
          id: project.project_id,
          name: project.name
        },
        materials: {
          summary: Object.values(materialUsage).map(material => ({
            name: material.name,
            totalAllocated: material.totalAllocated,
            totalCost: material.totalCost,
            allocationCount: material.allocations.length
          })),
          details: materialUsage
        },
        labour: {
          summary: Object.values(labourUsage).map(labour => ({
            name: labour.name,
            skill: labour.skill,
            totalHours: labour.totalHours,
            estimatedCost: labour.totalHours * (labour.wageRate || 0)
          })),
          details: labourUsage
        },
        generatedAt: new Date().toISOString()
      };

      return await this.saveReport(reportData, `resource_report_${projectId}`, format);
    } catch (error) {
      throw new Error(`Failed to generate resource report: ${error.message}`);
    }
  }

  // Generate Issue Report
  async generateIssueReport(projectId, format = 'json') {
    try {
      const issues = await Issue.findAll({
        where: { project_id: projectId },
        include: [
          { model: Project, as: 'project' },
          { model: User, as: 'raisedBy', attributes: ['user_id', 'name'] },
          { model: User, as: 'assignedTo', attributes: ['user_id', 'name'] }
        ],
        order: [['date_raised', 'DESC']]
      });

      const reportData = {
        project: {
          id: projectId
        },
        issues: {
          total: issues.length,
          byStatus: {
            open: issues.filter(i => i.status === 'OPEN').length,
            inProgress: issues.filter(i => i.status === 'IN_PROGRESS').length,
            resolved: issues.filter(i => i.status === 'RESOLVED').length,
            closed: issues.filter(i => i.status === 'CLOSED').length
          },
          byPriority: {
            low: issues.filter(i => i.priority === 'LOW').length,
            medium: issues.filter(i => i.priority === 'MEDIUM').length,
            high: issues.filter(i => i.priority === 'HIGH').length,
            critical: issues.filter(i => i.priority === 'CRITICAL').length
          },
          details: issues.map(issue => ({
            id: issue.issue_id,
            description: issue.description,
            priority: issue.priority,
            status: issue.status,
            raisedBy: issue.raisedBy.name,
            assignedTo: issue.assignedTo?.name || 'Unassigned',
            dateRaised: issue.date_raised,
            dateResolved: issue.date_resolved,
            resolutionTime: issue.date_resolved ? 
              Math.round((new Date(issue.date_resolved) - new Date(issue.date_raised)) / (1000 * 60 * 60 * 24)) : null
          }))
        },
        generatedAt: new Date().toISOString()
      };

      return await this.saveReport(reportData, `issue_report_${projectId}`, format);
    } catch (error) {
      throw new Error(`Failed to generate issue report: ${error.message}`);
    }
  }

  // Generate Restock Report
  async generateRestockReport(projectId, format = 'json', dateRange = {}) {
    try {
      const project = await Project.findByPk(projectId);
      if (!project) {
        throw new Error('Project not found');
      }

      const whereClause = {
        transaction_type: 'RESTOCK'
      };
      
      if (dateRange.date_from || dateRange.date_to) {
        whereClause.transaction_date = {};
        if (dateRange.date_from) whereClause.transaction_date[Op.gte] = dateRange.date_from;
        if (dateRange.date_to) whereClause.transaction_date[Op.lte] = dateRange.date_to;
      }

      const restockHistory = await InventoryHistory.findAll({
        where: whereClause,
        include: [
          { 
            model: Material, 
            as: 'material', 
            attributes: ['material_id', 'name', 'type', 'unit', 'cost_per_unit'],
            where: { project_id: projectId }
          },
          { model: User, as: 'performedBy', foreignKey: 'performed_by_user_id', attributes: ['user_id', 'name'] }
        ],
        order: [['transaction_date', 'DESC']]
      });

      // Calculate summary statistics
      const totalRestocked = restockHistory.reduce((sum, record) => sum + record.quantity_change, 0);
      const totalValue = restockHistory.reduce((sum, record) => {
        return sum + (record.quantity_change * (record.material.cost_per_unit || 0));
      }, 0);

      // Group by material
      const materialSummary = {};
      restockHistory.forEach(record => {
        const materialName = record.material.name;
        if (!materialSummary[materialName]) {
          materialSummary[materialName] = {
            name: materialName,
            type: record.material.type,
            unit: record.material.unit,
            totalRestocked: 0,
            totalValue: 0,
            restockCount: 0,
            restocks: []
          };
        }
        materialSummary[materialName].totalRestocked += record.quantity_change;
        materialSummary[materialName].totalValue += record.quantity_change * (record.material.cost_per_unit || 0);
        materialSummary[materialName].restockCount += 1;
        materialSummary[materialName].restocks.push({
          date: record.transaction_date,
          quantity: record.quantity_change,
          reference: record.reference_number,
          performedBy: record.performedBy.name,
          description: record.description
        });
      });

      // Group by month for trend analysis
      const monthlyTrend = {};
      restockHistory.forEach(record => {
        const month = new Date(record.transaction_date).toISOString().substring(0, 7); // YYYY-MM
        if (!monthlyTrend[month]) {
          monthlyTrend[month] = {
            month,
            totalRestocked: 0,
            totalValue: 0,
            restockCount: 0
          };
        }
        monthlyTrend[month].totalRestocked += record.quantity_change;
        monthlyTrend[month].totalValue += record.quantity_change * (record.material.cost_per_unit || 0);
        monthlyTrend[month].restockCount += 1;
      });

      const reportData = {
        project: {
          id: project.project_id,
          name: project.name,
          description: project.description
        },
        summary: {
          totalRestocked,
          totalValue,
          restockCount: restockHistory.length,
          materialCount: Object.keys(materialSummary).length,
          dateRange: {
            from: dateRange.date_from || 'All time',
            to: dateRange.date_to || 'All time'
          }
        },
        materialSummary: Object.values(materialSummary).sort((a, b) => b.totalRestocked - a.totalRestocked),
        monthlyTrend: Object.values(monthlyTrend).sort((a, b) => a.month.localeCompare(b.month)),
        details: restockHistory.map(record => ({
          id: record.history_id,
          material: record.material.name,
          quantity: record.quantity_change,
          unit: record.material.unit,
          costPerUnit: record.material.cost_per_unit,
          totalCost: record.quantity_change * (record.material.cost_per_unit || 0),
          reference: record.reference_number,
          description: record.description,
          performedBy: record.performedBy.name,
          date: record.transaction_date,
          stockBefore: record.quantity_before,
          stockAfter: record.quantity_after
        })),
        generatedAt: new Date().toISOString()
      };

      return await this.saveReport(reportData, `restock_report_${projectId}`, format);
    } catch (error) {
      throw new Error(`Failed to generate restock report: ${error.message}`);
    }
  }

  // Save report in specified format
  async saveReport(data, filename, format) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const baseFilename = `${filename}_${timestamp}`;

    switch (format.toLowerCase()) {
      case 'json':
        return await this.saveAsJSON(data, baseFilename);
      case 'csv':
        return await this.saveAsCSV(data, baseFilename);
      case 'pdf':
        return await this.saveAsPDF(data, baseFilename);
      default:
        throw new Error('Unsupported format. Use json, csv, or pdf.');
    }
  }

  async saveAsJSON(data, filename) {
    const filePath = path.join(this.reportsDir, `${filename}.json`);
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    return {
      filename: `${filename}.json`,
      path: filePath,
      format: 'json',
      size: fs.statSync(filePath).size
    };
  }

  async saveAsCSV(data, filename) {
    const filePath = path.join(this.reportsDir, `${filename}.csv`);
    
    // Flatten the data for CSV format
    const flattenedData = this.flattenDataForCSV(data);
    
    const csvWriter = createCsvWriter({
      path: filePath,
      header: Object.keys(flattenedData[0] || {}).map(key => ({ id: key, title: key }))
    });

    await csvWriter.writeRecords(flattenedData);
    
    return {
      filename: `${filename}.csv`,
      path: filePath,
      format: 'csv',
      size: fs.statSync(filePath).size
    };
  }

  async saveAsPDF(data, filename) {
    const filePath = path.join(this.reportsDir, `${filename}.pdf`);
    const doc = new PDFDocument();
    
    doc.pipe(fs.createWriteStream(filePath));
    
    // Add title
    doc.fontSize(20).text('Construction Management Report', 50, 50);
    doc.fontSize(12).text(`Generated on: ${new Date().toLocaleString()}`, 50, 80);
    
    let yPosition = 120;
    
    // Add content based on report type
    if (data.project) {
      doc.fontSize(16).text('Project Information', 50, yPosition);
      yPosition += 30;
      
      doc.fontSize(12).text(`Project: ${data.project.name}`, 50, yPosition);
      yPosition += 20;
      
      if (data.project.budget) {
        doc.text(`Budget: $${data.project.budget.toLocaleString()}`, 50, yPosition);
        yPosition += 20;
      }
    }
    
    // Add tasks information if available
    if (data.tasks) {
      doc.fontSize(16).text('Task Summary', 50, yPosition);
      yPosition += 30;
      
      doc.text(`Total Tasks: ${data.tasks.total}`, 50, yPosition);
      yPosition += 15;
      doc.text(`Completed: ${data.tasks.completed}`, 50, yPosition);
      yPosition += 15;
      doc.text(`In Progress: ${data.tasks.inProgress}`, 50, yPosition);
      yPosition += 15;
      doc.text(`Completion Rate: ${data.tasks.completionRate}%`, 50, yPosition);
      yPosition += 30;
    }
    
    // Add costs information if available
    if (data.costs) {
      doc.fontSize(16).text('Financial Summary', 50, yPosition);
      yPosition += 30;
      
      doc.text(`Total Cost: $${data.costs.total.toLocaleString()}`, 50, yPosition);
      yPosition += 15;
      doc.text(`Material Costs: $${data.costs.materials.toLocaleString()}`, 50, yPosition);
      yPosition += 15;
      doc.text(`Labour Costs: $${data.costs.labour.toLocaleString()}`, 50, yPosition);
      yPosition += 15;
      doc.text(`Petty Cash: $${data.costs.pettyCash.toLocaleString()}`, 50, yPosition);
    }
    
    doc.end();
    
    return new Promise((resolve) => {
      doc.on('end', () => {
        resolve({
          filename: `${filename}.pdf`,
          path: filePath,
          format: 'pdf',
          size: fs.statSync(filePath).size
        });
      });
    });
  }

  flattenDataForCSV(data) {
    const flattened = [];
    
    if (data.project) {
      flattened.push({
        type: 'project',
        name: data.project.name,
        status: data.project.status,
        budget: data.project.budget || 0
      });
    }
    
    if (data.tasks) {
      flattened.push({
        type: 'tasks',
        total: data.tasks.total,
        completed: data.tasks.completed,
        inProgress: data.tasks.inProgress,
        completionRate: data.tasks.completionRate
      });
    }
    
    if (data.costs) {
      flattened.push({
        type: 'costs',
        total: data.costs.total,
        materials: data.costs.materials,
        labour: data.costs.labour,
        pettyCash: data.costs.pettyCash
      });
    }
    
    return flattened;
  }
}

module.exports = ReportGenerator;
