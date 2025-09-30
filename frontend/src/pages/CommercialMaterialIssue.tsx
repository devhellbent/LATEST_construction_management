import React, { useState, useEffect } from 'react';
import { ShoppingCart, Plus, Download, MoreHorizontal, Settings, History } from 'lucide-react';
import { commercialAPI } from '../services/api';
import { useSocket } from '../contexts/SocketContext';
import MaterialIssueForm from '../components/MaterialIssueForm';

interface MaterialIssue {
  issue_id: number;
  project_id: number;
  material_id: number;
  quantity_issued: number;
  issue_date: string;
  issue_purpose: string;
  location: string;
  issued_by_user_id: number;
  received_by_user_id: number;
  status: 'PENDING' | 'ISSUED' | 'RECEIVED' | 'CANCELLED';
  created_at: string;
  updated_at: string;
  project?: { name: string };
  material?: { name: string };
  issued_by?: { name: string };
  received_by?: { name: string };
}

const CommercialMaterialIssue: React.FC = () => {
  const [issues, setIssues] = useState<MaterialIssue[]>([]);
  const [loading, setLoading] = useState(false);
  const [showDeleted, setShowDeleted] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const { socket } = useSocket();

  useEffect(() => {
    fetchIssues();
    fetchRecentActivity();
  }, []);

  // Real-time updates for material activities
  useEffect(() => {
    if (socket) {
      const handleMaterialIssue = () => {
        fetchIssues();
        fetchRecentActivity();
      };

      const handleMaterialReturn = () => {
        fetchRecentActivity();
      };


      socket.on('materialIssue', handleMaterialIssue);
      socket.on('materialReturn', handleMaterialReturn);

      return () => {
        socket.off('materialIssue', handleMaterialIssue);
        socket.off('materialReturn', handleMaterialReturn);
      };
    }
  }, [socket]);

  const fetchIssues = async () => {
    try {
      setLoading(true);
      const response = await commercialAPI.getMaterialIssues();
      setIssues(response.data.issues || []);
    } catch (error) {
      console.error('Error fetching issues:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchRecentActivity = async () => {
    try {
      const response = await commercialAPI.getRecentActivity({ limit: 10 });
      setRecentActivity(response.data.activities || []);
    } catch (error) {
      console.error('Error fetching recent activity:', error);
      setRecentActivity([]);
    }
  };

  const handleFormSuccess = () => {
    fetchIssues(); // Refresh the list after successful creation
    fetchRecentActivity(); // Refresh recent activity
  };

  return (
    <div className="space-y-6">
      {/* Header with Navigation Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <div className="flex items-center space-x-2 py-2 px-1 text-gray-500 hover:text-gray-700 cursor-pointer">
            <span className="font-medium">Inventory</span>
          </div>
          <div className="flex items-center space-x-2 py-2 px-1 border-b-2 border-primary-500">
            <ShoppingCart className="h-5 w-5 text-primary-600" />
            <span className="text-primary-600 font-medium">Material Issue</span>
          </div>
          <div className="flex items-center space-x-2 py-2 px-1 text-gray-500 hover:text-gray-700 cursor-pointer">
            <span className="font-medium">Material Return</span>
          </div>
          <div className="flex items-center space-x-2 py-2 px-1 text-gray-500 hover:text-gray-700 cursor-pointer">
            <span className="font-medium">Petty Cash</span>
          </div>
          <div className="flex items-center space-x-2 py-2 px-1 text-gray-500 hover:text-gray-700 cursor-pointer">
            <span className="font-medium">Consumptions</span>
          </div>
        </nav>
      </div>

      {/* Page Title */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Material Issue</h1>
        <div className="flex items-center space-x-4">
          <button className="btn btn-secondary flex items-center">
            <Download className="h-4 w-4 mr-2" />
            Export Excel
          </button>
          <button 
            onClick={() => setIsFormOpen(true)}
            className="btn btn-primary flex items-center"
          >
            <Plus className="h-4 w-4 mr-2" />
            + Issue Material
          </button>
        </div>
      </div>

      {/* Main Layout with Content and Right Sidebar */}
      <div className="flex space-x-6">
        {/* Main Content */}
        <div className="flex-1">
          {/* Filter and Action Bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          {/* Filter Dropdowns */}
          <select className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500">
            <option>Project</option>
          </select>
          <select className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500">
            <option>Created Between</option>
          </select>
          <select className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500">
            <option>Material Issue ID</option>
          </select>
          <select className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500">
            <option>Material</option>
          </select>
          <select className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500">
            <option>Issued to</option>
          </select>
          <button className="btn btn-secondary text-sm px-3 py-2">
            <MoreHorizontal className="h-4 w-4 mr-1" />
            More
          </button>
        </div>

        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-700">Show only deleted</span>
            <button
              onClick={() => setShowDeleted(!showDeleted)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                showDeleted ? 'bg-primary-600' : 'bg-gray-200'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  showDeleted ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
          <button className="btn btn-secondary flex items-center">
            <Settings className="h-4 w-4 mr-2" />
            Manage Columns
          </button>
        </div>
      </div>

      {/* Data Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Material Issue ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  P...
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Issued To
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Transfer Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Material name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tags
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Issued On
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Created On
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
                    <p className="mt-2 text-gray-600">Loading issues...</p>
                  </td>
                </tr>
              ) : issues.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-gray-500">
                    No Rows To Show
                  </td>
                </tr>
              ) : (
                issues.map((issue) => (
                  <tr key={issue.issue_id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {issue.issue_id}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {issue.project?.name || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {issue.received_by?.name || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        issue.status === 'RECEIVED' ? 'bg-green-100 text-green-800' :
                        issue.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' :
                        issue.status === 'ISSUED' ? 'bg-blue-100 text-blue-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {issue.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {issue.material?.name || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      -
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(issue.issue_date).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(issue.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
        </div>

        {/* Right Sidebar - Recent Activity */}
        <div className="w-80">
          <div className="card p-6 sticky top-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900 flex items-center">
                <History className="h-5 w-5 mr-2 text-primary-600" />
                Recent Activity
              </h3>
              <button
                onClick={fetchRecentActivity}
                className="text-sm text-primary-600 hover:text-primary-700"
              >
                Refresh
              </button>
            </div>
            
            {recentActivity.length === 0 ? (
              <div className="text-center py-8">
                <History className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                <p className="text-gray-500 text-sm">No recent activity found</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {recentActivity.map((activity) => (
                  <div key={`${activity.type}-${activity.id}`} className="p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-start space-x-3">
                      <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${
                        activity.type === 'ISSUE' ? 'bg-red-500' :
                        activity.type === 'TRANSFER' ? 'bg-blue-500' :
                        'bg-gray-500'
                      }`}></div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {activity.material?.name || 'Unknown Material'}
                        </p>
                        <p className="text-xs text-gray-500">
                          Material Issued • {new Date(activity.date).toLocaleDateString()}
                        </p>
                        <div className="mt-1">
                          <p className="text-sm font-medium text-gray-700">
                            {activity.quantity} {activity.material?.unit || ''}
                          </p>
                          {activity.type === 'ISSUE' ? (
                            <p className="text-xs text-gray-500">
                              Project: {activity.project?.name} • By: {activity.user?.name}
                            </p>
                          ) : (
                            <p className="text-xs text-gray-500">
                              From: {activity.from_project?.name} → To: {activity.to_project?.name}
                            </p>
                          )}
                          {activity.description && (
                            <p className="text-xs text-gray-400 mt-1 truncate">
                              {activity.description}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                        activity.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' :
                        activity.status === 'APPROVED' || activity.status === 'ISSUED' ? 'bg-green-100 text-green-800' :
                        activity.status === 'CANCELLED' ? 'bg-red-100 text-red-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {activity.status}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Material Issue Form Modal */}
      <MaterialIssueForm
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSuccess={handleFormSuccess}
      />
    </div>
  );
};

export default CommercialMaterialIssue;