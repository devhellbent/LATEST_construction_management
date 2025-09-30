import React, { useState } from 'react';
import { mrrAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

interface InventoryCheckResult {
  mrr_item_id: number;
  item_id: number;
  item_name: string;
  item_code: string;
  required_quantity: number;
  available_stock: number;
  status: 'AVAILABLE' | 'INSUFFICIENT_STOCK' | 'NOT_IN_INVENTORY' | 'CREATED_NO_STOCK';
  material_id: number | null;
  warehouse: {
    warehouse_id: number;
    warehouse_name: string;
    address?: string;
  } | null;
  project?: {
    project_id: number;
    name: string;
  } | null;
  material_details?: {
    cost_per_unit: number;
    minimum_stock_level: number;
    maximum_stock_level: number;
    reorder_point: number;
    location: string;
    status: string;
  } | null;
}

interface MrrInventoryCheckProps {
  mrrId: number;
  mrrNumber: string;
  onInventoryChecked: (results: any) => void;
}

const MrrInventoryCheck: React.FC<MrrInventoryCheckProps> = ({
  mrrId,
  mrrNumber,
  onInventoryChecked
}) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [statusLoading, setStatusLoading] = useState(false);
  const [results, setResults] = useState<any>(null);
  const [autoCreateMaterials, setAutoCreateMaterials] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [newStatus, setNewStatus] = useState('');
  const [statusNotes, setStatusNotes] = useState('');

  const handleCheckInventory = async () => {
    setLoading(true);
    try {
      const response = await mrrAPI.checkMrrInventory(mrrId, autoCreateMaterials);
      setResults(response.data);
      onInventoryChecked(response.data);
    } catch (error) {
      console.error('Error checking MRR inventory:', error);
      alert('Failed to check MRR inventory');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async () => {
    if (!newStatus) {
      alert('Please select a status');
      return;
    }

    setStatusLoading(true);
    try {
      await mrrAPI.updateMrrStatus(mrrId, newStatus, statusNotes);
      alert('MRR status updated successfully');
      setShowStatusModal(false);
      setNewStatus('');
      setStatusNotes('');
      onInventoryChecked({ ...results, mrr_status: newStatus });
    } catch (error) {
      console.error('Error updating MRR status:', error);
      alert('Failed to update MRR status');
    } finally {
      setStatusLoading(false);
    }
  };

  const handleMarkProcessing = async () => {
    if (results.mrr_status !== 'APPROVED') {
      alert('Only approved MRRs can be marked as processing');
      return;
    }

    setStatusLoading(true);
    try {
      await mrrAPI.markMrrProcessing(mrrId, 'Marked as processing after inventory check');
      alert('MRR marked as processing successfully');
      onInventoryChecked({ ...results, mrr_status: 'PROCESSING' });
    } catch (error) {
      console.error('Error marking MRR as processing:', error);
      alert('Failed to mark MRR as processing');
    } finally {
      setStatusLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'AVAILABLE':
        return 'text-green-600 bg-green-100';
      case 'INSUFFICIENT_STOCK':
        return 'text-yellow-600 bg-yellow-100';
      case 'NOT_IN_INVENTORY':
        return 'text-red-600 bg-red-100';
      case 'CREATED_NO_STOCK':
        return 'text-blue-600 bg-blue-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'AVAILABLE':
        return 'Available';
      case 'INSUFFICIENT_STOCK':
        return 'Insufficient Stock';
      case 'NOT_IN_INVENTORY':
        return 'Not in Inventory';
      case 'CREATED_NO_STOCK':
        return 'Created (No Stock)';
      default:
        return status;
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-gray-900">
          Inventory Check - {mrrNumber}
        </h3>
        <button
          onClick={handleCheckInventory}
          disabled={loading}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
        >
          {loading ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              Checking...
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
              Check Inventory
            </>
          )}
        </button>
      </div>

      <div className="mb-4">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={autoCreateMaterials}
            onChange={(e) => setAutoCreateMaterials(e.target.checked)}
            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          <span className="text-sm text-gray-700">
            Auto-create missing materials in inventory
          </span>
        </label>
        <p className="text-xs text-gray-500 mt-1">
          This will create materials in inventory with 0 stock for items that don't exist
        </p>
      </div>

      {results && (
        <div className="space-y-4">
          {/* Summary */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="font-semibold text-gray-900 mb-2">Summary</h4>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900">{results.summary.total_items}</div>
                <div className="text-gray-600">Total Items</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{results.summary.available_items}</div>
                <div className="text-gray-600">Available</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-600">{results.summary.insufficient_stock_items}</div>
                <div className="text-gray-600">Low Stock</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">{results.summary.not_in_inventory_items}</div>
                <div className="text-gray-600">Not in Inventory</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{results.summary.created_items}</div>
                <div className="text-gray-600">Created</div>
              </div>
            </div>
          </div>

          {/* MRR Status */}
          <div className="flex items-center gap-2">
            <span className="font-medium text-gray-700">MRR Status:</span>
            <span className="px-2 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
              {results.mrr_status}
            </span>
          </div>

          {/* Inventory Status */}
          <div className="flex items-center gap-2">
            <span className="font-medium text-gray-700">Inventory Status:</span>
            <span className={`px-2 py-1 rounded-full text-sm font-medium ${
              results.inventory_status === 'READY_FOR_ISSUE' ? 'bg-green-100 text-green-800' :
              results.inventory_status === 'NEEDS_PURCHASE' ? 'bg-yellow-100 text-yellow-800' :
              results.inventory_status === 'INSUFFICIENT_STOCK' ? 'bg-red-100 text-red-800' :
              'bg-gray-100 text-gray-800'
            }`}>
              {results.inventory_status.replace('_', ' ')}
            </span>
          </div>

          {/* Status Management Buttons (for Admin and Project Manager) */}
          {((typeof user?.role === 'string' && (user.role === 'Admin' || user.role === 'Project Manager' || user.role === 'Inventory Manager')) || 
            (typeof user?.role === 'object' && user?.role?.name && (user.role.name === 'Admin' || user.role.name === 'Project Manager' || user.role.name === 'Inventory Manager'))) && 
           results.mrr_status !== 'CANCELLED' && (
            <div className="flex gap-2">
              <button
                onClick={() => setShowStatusModal(true)}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium"
              >
                Update MRR Status
              </button>
              {results.mrr_status === 'APPROVED' && results.inventory_status === 'READY_FOR_ISSUE' && (
                <button
                  onClick={handleMarkProcessing}
                  disabled={statusLoading}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium disabled:opacity-50"
                >
                  {statusLoading ? 'Processing...' : 'Mark as Processing'}
                </button>
              )}
            </div>
          )}

          {/* Inventory Check Results */}
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Item
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Required
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Available
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Warehouse
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Project
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Cost/Unit
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {results.inventory_check_results.map((item: InventoryCheckResult) => (
                  <tr key={item.mrr_item_id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{item.item_name}</div>
                        <div className="text-sm text-gray-500">{item.item_code}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {item.required_quantity}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {item.available_stock}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(item.status)}`}>
                        {getStatusText(item.status)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {item.warehouse ? item.warehouse.warehouse_name : 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {item.project ? item.project.name : 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {item.material_details?.cost_per_unit ? `₹${item.material_details.cost_per_unit}` : 'N/A'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Next Steps */}
          <div className="bg-blue-50 rounded-lg p-4">
            <h4 className="font-semibold text-blue-900 mb-2">Next Steps</h4>
            <div className="text-sm text-blue-800">
              {results.inventory_status === 'READY_FOR_ISSUE' && (
                <p>✅ All materials are available. You can now issue materials from inventory.</p>
              )}
              {results.inventory_status === 'NEEDS_PURCHASE' && (
                <p>🛒 Some materials are not in inventory. Create a Purchase Order to procure them.</p>
              )}
              {results.inventory_status === 'INSUFFICIENT_STOCK' && (
                <p>⚠️ Materials exist but stock is insufficient. Consider purchasing more or issuing partial quantities.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Status Update Modal */}
      {showStatusModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Update MRR Status</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Status</label>
                  <select
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value)}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Select Status</option>
                    <option value="DRAFT">Draft</option>
                    <option value="SUBMITTED">Submitted</option>
                    <option value="UNDER_REVIEW">Under Review</option>
                    <option value="APPROVED">Approved</option>
                    <option value="REJECTED">Rejected</option>
                    <option value="PROCESSING">Processing</option>
                    <option value="COMPLETED">Completed</option>
                    <option value="CANCELLED">Cancelled</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Notes</label>
                  <textarea
                    value={statusNotes}
                    onChange={(e) => setStatusNotes(e.target.value)}
                    rows={3}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Add notes about the status change..."
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => {
                    setShowStatusModal(false);
                    setNewStatus('');
                    setStatusNotes('');
                  }}
                  className="bg-gray-500 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpdateStatus}
                  disabled={statusLoading}
                  className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded disabled:opacity-50"
                >
                  {statusLoading ? 'Updating...' : 'Update Status'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MrrInventoryCheck;
