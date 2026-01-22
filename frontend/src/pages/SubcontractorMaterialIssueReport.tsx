import React, { useState, useEffect } from 'react';
import { FileText, Download, Filter } from 'lucide-react';
import ProjectSelector from '../components/ProjectSelector';
import { reportsAPI, subcontractorsAPI } from '../services/api';

interface Subcontractor {
  subcontractor_id: number;
  company_name: string;
  work_type: string;
  contact_person: string;
  phone: string;
  email: string;
}

interface Material {
  material_id: number;
  name: string;
  unit: string;
  type: string;
  category: string;
  item_code: string;
  size: string;
  cost_per_unit: number;
}

interface User {
  user_id: number;
  name: string;
  email: string;
}

interface MaterialIssue {
  issue_id: number;
  project_id: number;
  material_id: number;
  quantity_issued: number;
  issue_date: string;
  issue_purpose: string;
  location: string;
  status: string;
  reference_number: string;
  size: string;
  material: Material;
  project: { project_id: number; name: string };
  issued_by: User;
  received_by: User | null;
  created_by_user: User;
  subcontractor: Subcontractor;
  warehouse: { warehouse_id: number; warehouse_name: string; address: string } | null;
  component: { component_id: number; component_name: string; component_type: string } | null;
}

interface MaterialReturn {
  return_id: number;
  project_id: number;
  material_id: number;
  quantity: number;
  return_date: string;
  return_reason: string;
  returned_by: string;
  condition_status: string;
  status: string;
  reference_number: string;
  size: string;
  issue_id: number | null;
  material: Material;
  project: { project_id: number; name: string };
  returned_by_user: User;
  approved_by: User | null;
  material_issue: MaterialIssue | null;
  subcontractor: Subcontractor;
  warehouse: { warehouse_id: number; warehouse_name: string; address: string } | null;
  component: { component_id: number; component_name: string; component_type: string } | null;
}


interface ReportData {
  project: { project_id: number; name: string } | null;
  subcontractor: Subcontractor | null;
  date_range: { from: string | null; to: string | null };
  summary: {
    total_issues: number;
    total_returns: number;
    total_issued: number;
    total_returned: number;
    net_issued: number;
  };
  material_summary: Array<{
    material_id: number;
    material_name: string;
    unit: string;
    category: string;
    total_issued: number;
    total_returned: number;
    net_issued: number;
  }>;
  materialIssues: MaterialIssue[];
  materialReturns: MaterialReturn[];
}

const SubcontractorMaterialIssueReport: React.FC = () => {
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);
  const [selectedSubcontractorId, setSelectedSubcontractorId] = useState<number | null>(null);
  const [subcontractors, setSubcontractors] = useState<Subcontractor[]>([]);
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');

  useEffect(() => {
    if (selectedProjectId) {
      loadSubcontractors(selectedProjectId);
    } else {
      setSubcontractors([]);
      setSelectedSubcontractorId(null);
    }
  }, [selectedProjectId]);

  useEffect(() => {
    // Auto-load preview when filters change
    if (selectedProjectId || selectedSubcontractorId) {
      loadPreview();
    } else {
      setReportData(null);
    }
  }, [selectedProjectId, selectedSubcontractorId, dateFrom, dateTo]);

  const loadSubcontractors = async (projectId: number) => {
    try {
      const response = await subcontractorsAPI.getSubcontractorsByProject(projectId);
      setSubcontractors(response.data.data?.subcontractors || []);
    } catch (error) {
      console.error('Error loading subcontractors:', error);
      setSubcontractors([]);
    }
  };

  const loadPreview = async () => {
    if (!selectedProjectId && !selectedSubcontractorId) {
      setReportData(null);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const params: any = {};
      if (selectedProjectId) params.project_id = selectedProjectId;
      if (selectedSubcontractorId) params.subcontractor_id = selectedSubcontractorId;
      if (dateFrom) params.date_from = dateFrom;
      if (dateTo) params.date_to = dateTo;

      const response = await reportsAPI.getSubcontractorMaterialIssuePreview(params);
      
      // Normalize the response - ensure all required fields exist
      // Handle both direct data and nested data structures
      const responseData = response?.data || response;
      
      if (!responseData) {
        throw new Error('No data received from server');
      }
      
      // Normalize the response structure
      const normalizedData: ReportData = {
        project: responseData.project || null,
        subcontractor: responseData.subcontractor || null,
        date_range: responseData.date_range || { from: null, to: null },
        summary: responseData.summary || {
          total_issues: 0,
          total_returns: 0,
          total_issued: 0,
          total_returned: 0,
          net_issued: 0
        },
        material_summary: responseData.material_summary || [],
        materialIssues: responseData.materialIssues || [],
        materialReturns: responseData.materialReturns || []
      };
      
      setReportData(normalizedData);
      setError(null);
    } catch (err: any) {
      console.error('Error loading preview:', err);
      console.error('Error response:', err.response);
      console.error('Error data:', err.response?.data);
      
      // If it's a validation error, show the actual error message
      if (err.response?.data?.message) {
        setError(err.response.data.message);
      } else if (err.response?.data?.errors) {
        const errorMessages = err.response.data.errors.map((e: any) => e.msg || e.message).join(', ');
        setError(errorMessages);
      } else {
        setError('Failed to load preview. Please check your filters and try again.');
      }
      setReportData(null);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadExcel = async () => {
    // At least one filter is required
    if (!selectedProjectId && !selectedSubcontractorId) {
      setError('Please select at least a project or subcontractor');
      return;
    }

    try {
      setDownloading(true);
      setError(null);

      const params: any = {};
      if (selectedProjectId) params.project_id = selectedProjectId;
      if (selectedSubcontractorId) params.subcontractor_id = selectedSubcontractorId;
      if (dateFrom) params.date_from = dateFrom;
      if (dateTo) params.date_to = dateTo;

      const response = await reportsAPI.downloadSubcontractorMaterialIssueReport(params);
      
      // Create blob from response
      const blob = new Blob([response.data], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      
      // Generate filename from response headers or use default
      const contentDisposition = response.headers['content-disposition'];
      let filename = 'subcontractor-material-report.xlsx';
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="(.+)"/);
        if (filenameMatch) {
          filename = filenameMatch[1];
        }
      }
      
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      console.error('Error downloading report:', err);
      setError(err.response?.data?.message || 'Failed to download report');
    } finally {
      setDownloading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Subcontractor Material Issue Report</h1>
        <button
          onClick={handleDownloadExcel}
          disabled={downloading || (!selectedProjectId && !selectedSubcontractorId)}
          className="btn btn-primary flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Download className="h-5 w-5 mr-2" />
          {downloading ? 'Downloading...' : 'Download Excel Report'}
        </button>
      </div>

      {/* Filters */}
      <div className="card p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Project
            </label>
            <ProjectSelector
              selectedProjectId={selectedProjectId}
              onProjectChange={setSelectedProjectId}
              placeholder="Select a project (optional)..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Subcontractor
            </label>
            <select
              value={selectedSubcontractorId || ''}
              onChange={(e) => setSelectedSubcontractorId(e.target.value ? parseInt(e.target.value) : null)}
              disabled={selectedProjectId ? subcontractors.length === 0 : false}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:bg-gray-100"
            >
              <option value="">Select subcontractor (optional)...</option>
              {subcontractors.map((sub) => (
                <option key={sub.subcontractor_id} value={sub.subcontractor_id}>
                  {sub.company_name} {sub.work_type ? `- ${sub.work_type}` : ''}
                </option>
              ))}
            </select>
            {!selectedProjectId && (
              <p className="text-xs text-gray-500 mt-1">Select a project to filter subcontractors</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Date From
            </label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Date To
            </label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
        </div>
        <div className="mt-4 p-3 bg-blue-50 rounded-lg">
          <p className="text-sm text-blue-800">
            <strong>Note:</strong> Select at least one filter (Project or Subcontractor) to generate the report. 
            The report will be downloaded as an Excel file with separate sheets for Summary, Material Issues, and Material Returns.
          </p>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="card p-6 bg-red-50 border border-red-200">
          <div className="flex items-center">
            <FileText className="h-5 w-5 text-red-400 mr-2" />
            <p className="text-red-800">{error}</p>
          </div>
        </div>
      )}

      {/* Preview Content */}
      {loading ? (
        <div className="card p-12 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading preview...</p>
        </div>
      ) : reportData ? (
        <div className="space-y-6">
          {/* Summary Card */}
          <div className="card p-6">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{reportData.summary.total_issues}</div>
                <div className="text-sm text-gray-600">Total Issues</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{reportData.summary.total_returns}</div>
                <div className="text-sm text-gray-600">Total Returns</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">{reportData.summary.total_issued}</div>
                <div className="text-sm text-gray-600">Total Issued</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">{reportData.summary.total_returned}</div>
                <div className="text-sm text-gray-600">Total Returned</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-800">{reportData.summary.net_issued}</div>
                <div className="text-sm text-gray-600">Net Issued</div>
              </div>
            </div>
          </div>

          {/* Material Summary */}
          {reportData.material_summary && Array.isArray(reportData.material_summary) && reportData.material_summary.length > 0 && (
            <div className="card p-6">
              <h2 className="text-xl font-semibold mb-4">Material Summary</h2>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Material</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total Issued</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total Returned</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Net Issued</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Unit</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {reportData.material_summary.map((mat) => (
                      <tr key={mat.material_id}>
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">{mat.material_name}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{mat.category || 'N/A'}</td>
                        <td className="px-4 py-3 text-sm text-right text-gray-900">{mat.total_issued}</td>
                        <td className="px-4 py-3 text-sm text-right text-gray-900">{mat.total_returned}</td>
                        <td className="px-4 py-3 text-sm text-right font-semibold text-gray-900">{mat.net_issued}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{mat.unit}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Material Issues */}
          {reportData.materialIssues && Array.isArray(reportData.materialIssues) && reportData.materialIssues.length > 0 && (
            <div className="card p-6">
              <h2 className="text-xl font-semibold mb-4">Material Issues ({reportData.materialIssues.length})</h2>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Issue ID</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Project</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Subcontractor</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Material</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Quantity</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {reportData.materialIssues.slice(0, 10).map((issue) => (
                      <tr key={issue.issue_id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">#{issue.issue_id}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{formatDate(issue.issue_date)}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{issue.project?.name || 'N/A'}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{issue.subcontractor?.company_name || 'N/A'}</td>
                        <td className="px-4 py-3 text-sm text-gray-900">
                          {issue.material?.name || 'N/A'}
                          {issue.size && <span className="text-gray-500 ml-1">({issue.size})</span>}
                        </td>
                        <td className="px-4 py-3 text-sm text-right text-gray-900">
                          {issue.quantity_issued} {issue.material?.unit || ''}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <span className={`px-2 py-1 rounded text-xs ${
                            issue.status === 'ISSUED' ? 'bg-green-100 text-green-700' :
                            issue.status === 'RECEIVED' ? 'bg-blue-100 text-blue-700' :
                            issue.status === 'PENDING' ? 'bg-yellow-100 text-yellow-700' :
                            'bg-red-100 text-red-700'
                          }`}>
                            {issue.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {reportData.materialIssues.length > 10 && (
                  <p className="text-sm text-gray-500 mt-4 text-center">
                    Showing first 10 of {reportData.materialIssues.length} issues. Download Excel for full details.
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Material Returns */}
          {reportData.materialReturns && Array.isArray(reportData.materialReturns) && reportData.materialReturns.length > 0 && (
            <div className="card p-6">
              <h2 className="text-xl font-semibold mb-4">Material Returns ({reportData.materialReturns.length})</h2>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Return ID</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Project</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Subcontractor</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Material</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Quantity</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {reportData.materialReturns.slice(0, 10).map((ret) => (
                      <tr key={ret.return_id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">#{ret.return_id}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{formatDate(ret.return_date)}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{ret.project?.name || 'N/A'}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{ret.subcontractor?.company_name || 'N/A'}</td>
                        <td className="px-4 py-3 text-sm text-gray-900">
                          {ret.material?.name || 'N/A'}
                          {ret.size && <span className="text-gray-500 ml-1">({ret.size})</span>}
                        </td>
                        <td className="px-4 py-3 text-sm text-right text-gray-900">
                          {ret.quantity} {ret.material?.unit || ''}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <span className={`px-2 py-1 rounded text-xs ${
                            ret.status === 'APPROVED' ? 'bg-green-100 text-green-700' :
                            ret.status === 'PENDING' ? 'bg-yellow-100 text-yellow-700' :
                            'bg-red-100 text-red-700'
                          }`}>
                            {ret.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {reportData.materialReturns.length > 10 && (
                  <p className="text-sm text-gray-500 mt-4 text-center">
                    Showing first 10 of {reportData.materialReturns.length} returns. Download Excel for full details.
                  </p>
                )}
              </div>
            </div>
          )}

          {(!reportData.materialIssues || reportData.materialIssues.length === 0) && (!reportData.materialReturns || reportData.materialReturns.length === 0) && (
            <div className="card p-12 text-center">
              <Filter className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Data Found</h3>
              <p className="text-gray-600">No material issues or returns found for the selected filters.</p>
            </div>
          )}
        </div>
      ) : !selectedProjectId && !selectedSubcontractorId ? (
        <div className="card p-12 text-center">
          <Filter className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Select Filters</h3>
          <p className="text-gray-600 mb-4">
            Please select at least a project or subcontractor to view the preview.
          </p>
          <p className="text-sm text-gray-500">
            You can filter by project only, subcontractor only, or both. Date range is optional.
          </p>
        </div>
      ) : null}
    </div>
  );
};

export default SubcontractorMaterialIssueReport;
