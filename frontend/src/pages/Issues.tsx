import React, { useState, useEffect } from 'react';
import { AlertTriangle, Plus, Filter, Download, Clipboard, UserCheck, MessageSquare, CheckSquare } from 'lucide-react';
import ProjectSelector from '../components/ProjectSelector';
import { issuesAPI } from '../services/api';
import CreateIssueModal from '../components/CreateIssueModal';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

interface Issue {
  issue_id: number;
  project_id: number;
  task_id?: number;
  raised_by_user_id: number;
  assigned_to_user_id: number;
  description: string;
  priority: string;
  status: string;
  date_raised: string;
  date_resolved: string;
  task?: {
    task_id: number;
    title: string;
    status: string;
  };
}

const Issues: React.FC = () => {
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    fetchIssues();
  }, [selectedProjectId]);

  const fetchIssues = async () => {
    try {
      setLoading(true);
      setError(null);
      
      let response;
      if (selectedProjectId) {
        response = await issuesAPI.getIssuesByProject(selectedProjectId);
      } else {
        response = await issuesAPI.getIssues();
      }
      
      // Backend returns { issues: [...], pagination: {...} }
      const issuesData = Array.isArray(response.data.issues) ? response.data.issues : [];
      setIssues(issuesData);
    } catch (err) {
      console.error('Error fetching issues:', err);
      setError('Failed to load issues');
      setIssues([]); // Set empty array on error
    } finally {
      setLoading(false);
    }
  };

  const handleProjectChange = (projectId: number | null) => {
    setSelectedProjectId(projectId);
  };

  const handleCreateIssue = () => {
    setShowCreateModal(true);
  };

  const handleCloseModal = () => {
    setShowCreateModal(false);
  };

  const handleIssueCreated = () => {
    setShowCreateModal(false);
    fetchIssues(); // Refresh the issues list
  };

  const handleExportExcel = async () => {
    if (issues.length === 0) {
      alert('No issues to export');
      return;
    }

    // Create workbook and worksheet
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Issues');

    // Define columns
    worksheet.columns = [
      { header: 'Issue ID', key: 'issue_id', width: 12 },
      { header: 'Project ID', key: 'project_id', width: 12 },
      { header: 'Description', key: 'description', width: 40 },
      { header: 'Priority', key: 'priority', width: 12 },
      { header: 'Status', key: 'status', width: 15 },
      { header: 'Date Raised', key: 'date_raised', width: 15 },
      { header: 'Date Resolved', key: 'date_resolved', width: 15 },
      { header: 'Raised By User ID', key: 'raised_by_user_id', width: 18 },
      { header: 'Assigned To User ID', key: 'assigned_to_user_id', width: 20 }
    ];

    // Style header row
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' }
    };

    // Add data rows
    issues.forEach(issue => {
      worksheet.addRow({
        issue_id: issue.issue_id,
        project_id: issue.project_id,
        description: issue.description,
        priority: issue.priority,
        status: issue.status,
        date_raised: new Date(issue.date_raised).toLocaleDateString(),
        date_resolved: issue.date_resolved ? new Date(issue.date_resolved).toLocaleDateString() : 'Not resolved',
        raised_by_user_id: issue.raised_by_user_id,
        assigned_to_user_id: issue.assigned_to_user_id || 'Not assigned'
      });
    });

    // Generate filename with current date
    const currentDate = new Date().toISOString().split('T')[0];
    const filename = `issues_export_${currentDate}.xlsx`;

    // Save file
    const buffer = await workbook.xlsx.writeBuffer();
    saveAs(new Blob([buffer]), filename);
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'CRITICAL': return 'bg-red-100 text-red-700';
      case 'HIGH': return 'bg-orange-100 text-orange-700';
      case 'MEDIUM': return 'bg-yellow-100 text-yellow-700';
      case 'LOW': return 'bg-green-100 text-green-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'OPEN': return 'bg-red-100 text-red-700';
      case 'IN_PROGRESS': return 'bg-blue-100 text-blue-700';
      case 'RESOLVED': return 'bg-green-100 text-green-700';
      case 'CLOSED': return 'bg-gray-100 text-gray-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-4xl font-bold text-gray-900">Issues</h1>
        <div className="flex space-x-3">
          <button 
            onClick={handleExportExcel}
            className="flex items-center px-4 py-2 border border-blue-500 text-blue-500 rounded-lg hover:bg-blue-50 transition-colors"
          >
            <Download className="h-5 w-5 mr-2" />
            Export Excel
          </button>
          <button 
            onClick={handleCreateIssue}
            className="flex items-center px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            <Plus className="h-5 w-5 mr-2" />
            Create new issue
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto">
        {/* Hero Section */}
        <div className="text-center mb-16">
          {/* Illustration */}
          <div className="mb-8">
            <div className="inline-block relative">
              <div className="w-64 h-48 bg-gradient-to-br from-blue-100 to-blue-200 rounded-lg flex items-center justify-center relative overflow-hidden">
                {/* Brick wall illustration */}
                <div className="absolute inset-0 bg-gradient-to-br from-blue-200 to-blue-300">
                  <div className="absolute inset-0" style={{
                    backgroundImage: `
                      linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.3) 50%, transparent 100%),
                      linear-gradient(0deg, transparent 0%, rgba(255,255,255,0.2) 50%, transparent 100%)
                    `,
                    backgroundSize: '20px 20px'
                  }}></div>
                  {/* Crack */}
                  <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-1 h-32 bg-gray-600"></div>
                  {/* Hand with trowel */}
                  <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                    <div className="relative">
                      <div className="w-8 h-12 bg-blue-800 rounded-full"></div>
                      <div className="absolute -right-2 top-2 w-6 h-2 bg-red-500 rounded transform rotate-12"></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Headlines */}
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            Resolve site blockers quickly with Issues
          </h2>
          <p className="text-lg text-gray-600 mb-12">
            Log and track every issue to drive faster decisions and smoother execution
          </p>

          {/* Feature Cards */}
          <div className="grid md:grid-cols-3 gap-8 mb-12">
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Clipboard className="h-8 w-8 text-blue-500" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Create Issues on tasks or for any reason
              </h3>
              <p className="text-gray-600">
                Create issues directly from a task or independently based on what needs attention on site
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <UserCheck className="h-8 w-8 text-blue-500" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Clear ownership with follow-ups
              </h3>
              <p className="text-gray-600">
                Assign issues, set deadlines, and get notified when there's progress or delay
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <MessageSquare className="h-8 w-8 text-blue-500" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Track progress on issues with comments
              </h3>
              <p className="text-gray-600">
                Use chat threads on each issue to keep track of clarifications, updates, and decisions
              </p>
            </div>
          </div>
        </div>

        {/* Issues List Section */}
        {issues.length > 0 && (
          <div className="border-t pt-8">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-semibold text-gray-900">
                Recent Issues ({issues.length})
              </h3>
              <div className="flex items-center space-x-4">
                <Filter className="h-5 w-5 text-gray-500" />
                <ProjectSelector
                  selectedProjectId={selectedProjectId}
                  onProjectChange={handleProjectChange}
                  className="max-w-md"
                  placeholder="Filter by project..."
                />
              </div>
            </div>
            
            <div className="grid gap-4">
              {issues.map((issue) => (
                <div key={issue.issue_id} className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900 mb-2">{issue.description}</h4>
                      {issue.task && (
                        <div className="mb-2">
                          <span className="inline-flex items-center px-2 py-1 rounded text-xs bg-blue-100 text-blue-800">
                            <CheckSquare className="h-3 w-3 mr-1" />
                            Task: {issue.task.title}
                          </span>
                        </div>
                      )}
                      <div className="flex items-center space-x-4 text-sm">
                        <span className={`px-2 py-1 rounded text-xs ${getPriorityColor(issue.priority)}`}>
                          {issue.priority}
                        </span>
                        <span className={`px-2 py-1 rounded text-xs ${getStatusColor(issue.status)}`}>
                          {issue.status}
                        </span>
                        <span className="text-gray-500">
                          Raised: {new Date(issue.date_raised).toLocaleDateString()}
                        </span>
                        {issue.date_resolved && (
                          <span className="text-gray-500">
                            Resolved: {new Date(issue.date_resolved).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <button className="btn btn-sm btn-secondary">Edit</button>
                      <button className="btn btn-sm btn-danger">Delete</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Create Issue Modal */}
      {showCreateModal && (
        <CreateIssueModal
          isOpen={showCreateModal}
          onClose={handleCloseModal}
          onIssueCreated={handleIssueCreated}
          selectedProjectId={selectedProjectId}
        />
      )}
    </div>
  );
};

export default Issues;
