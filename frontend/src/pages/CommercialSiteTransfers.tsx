import React, { useState, useEffect } from 'react';
import { ArrowRightLeft, Plus, Download, MoreHorizontal, Settings, Edit, Trash2, CheckCircle, XCircle, ShoppingCart } from 'lucide-react';
import { commercialAPI, projectsAPI, materialsAPI } from '../services/api';
import SiteTransferForm from '../components/SiteTransferForm';

interface SiteTransfer {
  transfer_id: number;
  from_project_id: number;
  to_project_id: number;
  material_id: number;
  quantity: number;
  transfer_date: string;
  transfer_reason: string;
  status: 'PENDING' | 'APPROVED' | 'COMPLETED' | 'CANCELLED';
  requested_by_user_id: number;
  approved_by_user_id: number;
  created_at: string;
  updated_at: string;
  from_project?: { name: string };
  to_project?: { name: string };
  material?: { name: string };
  requested_by?: { name: string };
  approved_by?: { name: string };
}

const CommercialSiteTransfers: React.FC = () => {
  const [transfers, setTransfers] = useState<SiteTransfer[]>([]);
  const [loading, setLoading] = useState(false);
  const [showDeleted, setShowDeleted] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [selectedTransfer, setSelectedTransfer] = useState<SiteTransfer | null>(null);
  const [filters, setFilters] = useState({
    project_id: '',
    status: '',
    material_id: '',
    from_project_id: '',
    to_project_id: '',
    requested_by_user_id: '',
    approved_by_user_id: '',
    transfer_date_from: '',
    transfer_date_to: ''
  });
  const [projects, setProjects] = useState<any[]>([]);
  const [materials, setMaterials] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);

  useEffect(() => {
    fetchTransfers();
    fetchFilterData();
    fetchRecentActivity();
  }, []);

  useEffect(() => {
    fetchTransfers();
  }, [filters, showDeleted]);

  const fetchTransfers = async () => {
    try {
      setLoading(true);
      const params = {
        ...filters,
        page: 1,
        limit: 100
      };
      
      // Remove empty filter values
      Object.keys(params).forEach(key => {
        if (params[key as keyof typeof params] === '') {
          delete params[key as keyof typeof params];
        }
      });

      const response = await commercialAPI.getSiteTransfers(params);
      setTransfers(response.data.transfers || []);
    } catch (error) {
      console.error('Error fetching transfers:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchFilterData = async () => {
    try {
      const [projectsRes, materialsRes] = await Promise.all([
        projectsAPI.getProjects(),
        materialsAPI.getMaterials()
      ]);
      
      setProjects(projectsRes.data.projects || []);
      setMaterials(materialsRes.data.materials || []);
    } catch (error) {
      console.error('Error fetching filter data:', error);
    }
  };

  const fetchRecentActivity = async () => {
    try {
      const response = await commercialAPI.getRecentActivity({ limit: 10 });
      setRecentActivity(response.data.activities || []);
    } catch (error) {
      console.error('Error fetching recent activity:', error);
    }
  };

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleCreateTransfer = () => {
    setSelectedTransfer(null);
    setShowForm(true);
  };

  const handleEditTransfer = (transfer: SiteTransfer) => {
    setSelectedTransfer(transfer);
    setShowForm(true);
  };

  const handleUpdateStatus = async (transferId: number, status: string) => {
    try {
      await commercialAPI.updateSiteTransferStatus(transferId, status);
      fetchTransfers();
    } catch (error) {
      console.error('Error updating transfer status:', error);
    }
  };

  const handleDeleteTransfer = async (transferId: number) => {
    if (window.confirm('Are you sure you want to cancel this transfer?')) {
      try {
        await commercialAPI.deleteSiteTransfer(transferId);
        fetchTransfers();
      } catch (error) {
        console.error('Error deleting transfer:', error);
      }
    }
  };

  const handleFormSuccess = () => {
    fetchTransfers();
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setSelectedTransfer(null);
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
            <ArrowRightLeft className="h-5 w-5 text-primary-600" />
            <span className="text-primary-600 font-medium">Site Transfers</span>
          </div>
          <div className="flex items-center space-x-2 py-2 px-1 text-gray-500 hover:text-gray-700 cursor-pointer">
            <span className="font-medium">Material Issue</span>
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

      {/* Filter and Action Bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          {/* Filter Dropdowns */}
          <select 
            value={filters.project_id}
            onChange={(e) => handleFilterChange('project_id', e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="">All Projects</option>
            {projects.map(project => (
              <option key={project.project_id} value={project.project_id}>
                {project.name}
              </option>
            ))}
          </select>
          <select 
            value={filters.status}
            onChange={(e) => handleFilterChange('status', e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="">All Status</option>
            <option value="PENDING">Pending</option>
            <option value="APPROVED">Approved</option>
            <option value="COMPLETED">Completed</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
          <select 
            value={filters.material_id}
            onChange={(e) => handleFilterChange('material_id', e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="">All Materials</option>
            {materials.map(material => (
              <option key={material.material_id} value={material.material_id}>
                {material.name}
              </option>
            ))}
          </select>
          <select 
            value={filters.from_project_id}
            onChange={(e) => handleFilterChange('from_project_id', e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="">All Sending Sites</option>
            {projects.map(project => (
              <option key={project.project_id} value={project.project_id}>
                {project.name}
              </option>
            ))}
          </select>
          <button className="btn btn-secondary text-sm px-3 py-2">
            <MoreHorizontal className="h-4 w-4 mr-1" />
            + More
          </button>
        </div>

        <div className="flex items-center space-x-4">
          <button className="btn btn-secondary flex items-center">
            <Download className="h-4 w-4 mr-2" />
            Export Excel
          </button>
          <button 
            onClick={handleCreateTransfer}
            className="btn btn-primary flex items-center"
          >
            <Plus className="h-4 w-4 mr-2" />
            + Create Site Transfer
          </button>
        </div>
      </div>

      {/* Table Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-700">Show Deleted</span>
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
        </div>
        <button className="btn btn-secondary flex items-center">
          <Settings className="h-4 w-4 mr-2" />
          Manage Columns
        </button>
      </div>

      {/* Data Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  ST ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Sending Site
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Receiving Site
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Material
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Issued By
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Checked By
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={9} className="px-6 py-12 text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
                    <p className="mt-2 text-gray-600">Loading transfers...</p>
                  </td>
                </tr>
              ) : transfers.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-6 py-12 text-center text-gray-500">
                    No Rows To Show
                  </td>
                </tr>
              ) : (
                transfers.map((transfer) => (
                  <tr key={transfer.transfer_id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {transfer.transfer_id}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {transfer.from_project?.name || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {transfer.to_project?.name || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {transfer.material?.name || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(transfer.transfer_date).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        transfer.status === 'COMPLETED' ? 'bg-green-100 text-green-800' :
                        transfer.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' :
                        transfer.status === 'APPROVED' ? 'bg-blue-100 text-blue-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {transfer.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {transfer.requested_by?.name || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {transfer.approved_by?.name || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div className="flex items-center space-x-2">
                        {transfer.status === 'PENDING' && (
                          <>
                            <button
                              onClick={() => handleUpdateStatus(transfer.transfer_id, 'APPROVED')}
                              className="text-green-600 hover:text-green-800"
                              title="Approve"
                            >
                              <CheckCircle className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleUpdateStatus(transfer.transfer_id, 'COMPLETED')}
                              className="text-blue-600 hover:text-blue-800"
                              title="Mark as Completed"
                            >
                              <CheckCircle className="h-4 w-4" />
                            </button>
                          </>
                        )}
                        {transfer.status === 'APPROVED' && (
                          <button
                            onClick={() => handleUpdateStatus(transfer.transfer_id, 'COMPLETED')}
                            className="text-blue-600 hover:text-blue-800"
                            title="Mark as Completed"
                          >
                            <CheckCircle className="h-4 w-4" />
                          </button>
                        )}
                        <button
                          onClick={() => handleEditTransfer(transfer)}
                          className="text-gray-600 hover:text-gray-800"
                          title="Edit"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        {transfer.status !== 'CANCELLED' && (
                          <button
                            onClick={() => handleDeleteTransfer(transfer.transfer_id)}
                            className="text-red-600 hover:text-red-800"
                            title="Cancel Transfer"
                          >
                            <XCircle className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recent Activity Section */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Recent Activity</h3>
          <p className="text-sm text-gray-500">Latest material issues and transfers</p>
        </div>
        <div className="p-6">
          {recentActivity.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No recent activity
            </div>
          ) : (
            <div className="space-y-4">
              {recentActivity.map((activity) => (
                <div key={`${activity.type}-${activity.id}`} className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg">
                  <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                    activity.type === 'ISSUE' ? 'bg-blue-100 text-blue-600' : 'bg-green-100 text-green-600'
                  }`}>
                    {activity.type === 'ISSUE' ? (
                      <ShoppingCart className="h-4 w-4" />
                    ) : (
                      <ArrowRightLeft className="h-4 w-4" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-gray-900">
                        {activity.type === 'ISSUE' ? 'Material Issued' : 'Site Transfer'}
                      </p>
                      <p className="text-xs text-gray-500">
                        {new Date(activity.date).toLocaleDateString()}
                      </p>
                    </div>
                    <p className="text-sm text-gray-600">
                      {activity.material?.name} - {activity.quantity} {activity.material?.unit}
                    </p>
                    {activity.type === 'ISSUE' ? (
                      <p className="text-xs text-gray-500">
                        Project: {activity.project?.name} • By: {activity.user?.name}
                      </p>
                    ) : (
                      <p className="text-xs text-gray-500">
                        From: {activity.from_project?.name} → To: {activity.to_project?.name} • By: {activity.user?.name}
                      </p>
                    )}
                    {activity.description && (
                      <p className="text-xs text-gray-400 mt-1">
                        {activity.description}
                      </p>
                    )}
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
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Site Transfer Form Modal */}
      <SiteTransferForm
        isOpen={showForm}
        onClose={handleCloseForm}
        onSuccess={handleFormSuccess}
        transfer={selectedTransfer}
      />
    </div>
  );
};

export default CommercialSiteTransfers;