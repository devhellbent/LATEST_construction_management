import React, { useState, useEffect } from 'react';
import { FileText, Plus, Filter } from 'lucide-react';
import ProjectSelector from '../components/ProjectSelector';
import { reportsAPI } from '../services/api';

interface Report {
  report_id: number;
  project_id: number;
  report_type: string;
  generated_by_user_id: number;
  generated_date: string;
  data: any;
}

const Reports: React.FC = () => {
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchReports();
  }, [selectedProjectId]);

  const fetchReports = async () => {
    try {
      setLoading(true);
      setError(null);
      
      let response;
      if (selectedProjectId) {
        response = await reportsAPI.getReportsByProject(selectedProjectId);
      } else {
        response = await reportsAPI.getReports();
      }
      
      // Backend returns { reports: [...], pagination: {...} }
      const reportsData = Array.isArray(response.data.reports) ? response.data.reports : [];
      setReports(reportsData);
    } catch (err) {
      console.error('Error fetching reports:', err);
      setError('Failed to load reports');
      setReports([]); // Set empty array on error
    } finally {
      setLoading(false);
    }
  };

  const handleProjectChange = (projectId: number | null) => {
    setSelectedProjectId(projectId);
  };

  const getReportTypeColor = (type: string) => {
    switch (type) {
      case 'PROGRESS': return 'bg-blue-100 text-blue-700';
      case 'FINANCIAL': return 'bg-green-100 text-green-700';
      case 'RESOURCE': return 'bg-purple-100 text-purple-700';
      case 'ISSUE': return 'bg-red-100 text-red-700';
      case 'CUSTOM': return 'bg-gray-100 text-gray-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Reports</h1>
        <button className="btn btn-primary flex items-center">
          <Plus className="h-5 w-5 mr-2" />
          Generate Report
        </button>
      </div>

      {/* Project Filter */}
      <div className="card p-6">
        <div className="flex items-center space-x-4">
          <Filter className="h-5 w-5 text-gray-500" />
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Filter by Project
            </label>
            <ProjectSelector
              selectedProjectId={selectedProjectId}
              onProjectChange={handleProjectChange}
              className="max-w-md"
              placeholder="Select a project to filter reports..."
            />
          </div>
        </div>
      </div>
      
      {/* Reports Content */}
      <div className="card p-6">
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading reports...</p>
          </div>
        ) : error ? (
          <div className="text-center py-12">
            <FileText className="h-12 w-12 text-red-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Error Loading Reports</h3>
            <p className="text-gray-600 mb-4">{error}</p>
            <button 
              onClick={fetchReports}
              className="btn btn-secondary"
            >
              Try Again
            </button>
          </div>
        ) : reports.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {selectedProjectId ? 'No Reports Found' : 'No Reports Available'}
            </h3>
            <p className="text-gray-600">
              {selectedProjectId 
                ? 'This project doesn\'t have any reports generated yet.' 
                : 'No reports have been generated yet.'
              }
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-medium text-gray-900">
                {selectedProjectId ? `Reports for Selected Project` : 'All Reports'} ({reports.length})
              </h3>
            </div>
            
            <div className="grid gap-4">
              {reports.map((report) => (
                <div key={report.report_id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900">
                        {report.report_type} Report
                      </h4>
                      <div className="flex items-center space-x-4 mt-2 text-sm">
                        <span className={`px-2 py-1 rounded text-xs ${getReportTypeColor(report.report_type)}`}>
                          {report.report_type}
                        </span>
                        <span className="text-gray-500">
                          Generated: {new Date(report.generated_date).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <button className="btn btn-sm btn-primary">View</button>
                      <button className="btn btn-sm btn-secondary">Download</button>
                      <button className="btn btn-sm btn-danger">Delete</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Reports;
