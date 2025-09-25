import React, { useState, useEffect } from 'react';
import { RotateCcw, Plus, Download, MoreHorizontal, Settings } from 'lucide-react';
import { commercialAPI } from '../services/api';
import MaterialReturnForm from '../components/MaterialReturnForm';

interface MaterialReturn {
  return_id: number;
  project_id: number;
  material_id: number;
  quantity: number;
  return_date: string;
  return_reason: string;
  condition_status: 'GOOD' | 'DAMAGED' | 'USED' | 'EXPIRED';
  returned_by_user_id: number;
  approved_by_user_id: number;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  created_at: string;
  updated_at: string;
  project?: { name: string };
  material?: { name: string };
  returned_by?: { name: string };
  approved_by?: { name: string };
  warehouse?: { warehouse_id: number; warehouse_name: string; address: string };
  material_issue?: {
    issue_id: number;
    issue_date: string;
    quantity_issued: number;
    issued_to: string;
    issue_purpose?: string;
    location?: string;
  };
}

const CommercialMaterialReturn: React.FC = () => {
  const [returns, setReturns] = useState<MaterialReturn[]>([]);
  const [loading, setLoading] = useState(false);
  const [showDeleted, setShowDeleted] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);

  useEffect(() => {
    fetchReturns();
  }, []);

  const fetchReturns = async () => {
    try {
      setLoading(true);
      const response = await commercialAPI.getMaterialReturns();
      setReturns(response.data.returns || []);
    } catch (error) {
      console.error('Error fetching returns:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFormSuccess = () => {
    fetchReturns(); // Refresh the list after successful creation
  };

  return (
    <div className="space-y-6">
      {/* Header with Navigation Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <div className="flex items-center space-x-2 py-2 px-1 text-gray-500 hover:text-gray-700 cursor-pointer">
            <span className="font-medium">Inventory</span>
          </div>
          <div className="flex items-center space-x-2 py-2 px-1 text-gray-500 hover:text-gray-700 cursor-pointer">
            <span className="font-medium">Site Transfers</span>
          </div>
          <div className="flex items-center space-x-2 py-2 px-1 text-gray-500 hover:text-gray-700 cursor-pointer">
            <span className="font-medium">Material Issue</span>
          </div>
          <div className="flex items-center space-x-2 py-2 px-1 border-b-2 border-primary-500">
            <RotateCcw className="h-5 w-5 text-primary-600" />
            <span className="text-primary-600 font-medium">Material Return</span>
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
        <h1 className="text-2xl font-bold text-gray-900">Material Return</h1>
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
              + Return Material
            </button>
        </div>
      </div>

      {/* Filter and Action Bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          {/* Filter Dropdowns */}
          <select className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500">
            <option>Project</option>
          </select>
          <select className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500">
            <option>Material</option>
          </select>
          <select className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500">
            <option>Return from</option>
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

      {/* Main Content Area */}
      {returns.length === 0 && !loading ? (
        <div className="bg-white rounded-lg border border-gray-200 p-12">
          <div className="text-center">
            {/* Illustration */}
            <div className="flex justify-center items-center mb-8">
              <div className="flex items-center space-x-8">
                {/* Left circle - Inventory */}
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
                  <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center">
                    <div className="w-8 h-8 bg-gray-300 rounded-full"></div>
                  </div>
                </div>
                
                {/* Arrow */}
                <div className="flex items-center">
                  <div className="w-8 h-0.5 bg-gray-300"></div>
                  <div className="w-0 h-0 border-l-4 border-l-gray-300 border-t-2 border-t-transparent border-b-2 border-b-transparent ml-1"></div>
                </div>
                
                {/* Right circle - Wheelbarrow */}
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
                  <div className="w-12 h-8 bg-pink-200 rounded-lg relative">
                    <div className="absolute -bottom-1 left-1 w-8 h-2 bg-gray-300 rounded"></div>
                    <div className="absolute -bottom-1 right-1 w-8 h-2 bg-gray-300 rounded"></div>
                  </div>
                </div>
                
                {/* Worker circle */}
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                    <div className="w-8 h-8 bg-blue-200 rounded-full flex items-center justify-center">
                      <span className="text-blue-600 text-xs">😊</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Log material returns</h2>
            <p className="text-gray-600 mb-8">Track any material returned back to Inventory from Subcontractor</p>
            
            <button 
              onClick={() => setIsFormOpen(true)}
              className="btn btn-primary flex items-center mx-auto"
            >
              <Plus className="h-5 w-5 mr-2" />
              + Return Material
            </button>
          </div>
        </div>
      ) : (
        /* Data Table */
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Return ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Project
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Material
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Quantity
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Condition
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Return Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Returned By
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Warehouse
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    On Behalf Of Material Issue
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {loading ? (
                  <tr>
                    <td colSpan={10} className="px-6 py-12 text-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
                      <p className="mt-2 text-gray-600">Loading returns...</p>
                    </td>
                  </tr>
                ) : (
                  returns.map((returnItem) => (
                    <tr key={returnItem.return_id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {returnItem.return_id}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {returnItem.project?.name || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {returnItem.material?.name || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {returnItem.quantity}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          returnItem.condition_status === 'GOOD' ? 'bg-green-100 text-green-800' :
                          returnItem.condition_status === 'DAMAGED' ? 'bg-red-100 text-red-800' :
                          returnItem.condition_status === 'USED' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {returnItem.condition_status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          returnItem.status === 'APPROVED' ? 'bg-green-100 text-green-800' :
                          returnItem.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {returnItem.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {new Date(returnItem.return_date).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {typeof returnItem.returned_by === 'string' ? returnItem.returned_by : returnItem.returned_by?.name || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {returnItem.warehouse ? (
                          <div>
                            <div className="font-medium">{returnItem.warehouse.warehouse_name}</div>
                            <div className="text-xs text-gray-500">{returnItem.warehouse.address}</div>
                          </div>
                        ) : (
                          <span className="text-gray-400">N/A</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {returnItem.material_issue ? (
                          <div>
                            <div className="font-medium">Issue #{returnItem.material_issue.issue_id}</div>
                            <div className="text-xs text-gray-500">
                              Date: {new Date(returnItem.material_issue.issue_date).toLocaleDateString()}
                            </div>
                            <div className="text-xs text-gray-500">
                              Qty: {returnItem.material_issue.quantity_issued}
                            </div>
                            <div className="text-xs text-gray-500">
                              Issued to: {returnItem.material_issue.issued_to || 'N/A'}
                            </div>
                          </div>
                        ) : (
                          <span className="text-gray-400">Direct Return</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Material Return Form Modal */}
      <MaterialReturnForm
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSuccess={handleFormSuccess}
      />
    </div>
  );
};

export default CommercialMaterialReturn;