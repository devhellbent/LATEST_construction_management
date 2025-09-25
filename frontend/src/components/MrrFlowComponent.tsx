import React, { useState, useEffect } from 'react';
import { mrrAPI, projectsAPI, materialsAPI } from '../services/api';
import MrrInventoryCheck from './MrrInventoryCheck';
import { useAuth } from '../contexts/AuthContext';

interface MrrItem {
  item_id: number;
  quantity_requested: number;
  unit_id: number;
  specifications?: string;
  purpose?: string;
  priority?: string;
  estimated_cost_per_unit?: number;
}

interface MaterialRequirementRequest {
  mrr_id: number;
  mrr_number: string;
  project_id: number;
  requested_by_user_id: number;
  request_date: string;
  required_date: string;
  priority: string;
  status: string;
  approval_status: string;
  total_estimated_cost: number;
  notes?: string;
  approved_by_user_id?: number;
  approved_at?: string;
  items: MrrItem[];
}

const MrrFlowComponent: React.FC = () => {
  const { user } = useAuth();
  const [mrrs, setMrrs] = useState<MaterialRequirementRequest[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [items, setItems] = useState<any[]>([]);
  const [units, setUnits] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showInventoryCheck, setShowInventoryCheck] = useState(false);
  const [inventoryCheckTarget, setInventoryCheckTarget] = useState<MaterialRequirementRequest | null>(null);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [statusTarget, setStatusTarget] = useState<MaterialRequirementRequest | null>(null);
  const [newStatus, setNewStatus] = useState('');
  const [statusNotes, setStatusNotes] = useState('');
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [detailsTarget, setDetailsTarget] = useState<MaterialRequirementRequest | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    project_id: '',
    required_date: '',
    priority: 'MEDIUM',
    notes: '',
    items: [] as MrrItem[]
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [mrrsRes, projectsRes, masterDataRes] = await Promise.all([
        mrrAPI.getMrrs(),
        projectsAPI.getProjects(),
        materialsAPI.getMasterData()
      ]);

      setMrrs(mrrsRes.data.mrrs || []);
      setProjects(projectsRes.data.projects || []);
      setItems(masterDataRes.data.itemMaster || []);
      setUnits(masterDataRes.data.units || []);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateMrr = async () => {
    if (!formData.project_id || !formData.required_date || formData.items.length === 0) {
      alert('Please fill in all required fields');
      return;
    }

    // Validate items
    for (let i = 0; i < formData.items.length; i++) {
      const item = formData.items[i];
      if (!item.item_id || item.item_id === 0) {
        alert(`Please select an item for item ${i + 1}`);
        return;
      }
      if (!item.quantity_requested || item.quantity_requested <= 0) {
        alert(`Please enter a valid quantity for item ${i + 1}`);
        return;
      }
      if (!item.unit_id || item.unit_id === 0) {
        alert(`Please select a unit for item ${i + 1}`);
        return;
      }
    }

    setLoading(true);
    try {
      const mrrData = {
        ...formData,
        project_id: parseInt(formData.project_id),
        required_date: new Date(formData.required_date).toISOString().split('T')[0], // Ensure proper date format
        items: formData.items.map(item => ({
          ...item,
          item_id: parseInt(item.item_id.toString()),
          unit_id: parseInt(item.unit_id.toString()),
          quantity_requested: parseInt(item.quantity_requested.toString())
        }))
      };
      
      console.log('Sending MRR data:', mrrData);
      await mrrAPI.createMrr(mrrData);

      alert('MRR created successfully!');
      setShowCreateForm(false);
      setFormData({
        project_id: '',
        required_date: '',
        priority: 'MEDIUM',
        notes: '',
        items: []
      });
      loadData();
    } catch (error) {
      console.error('Error creating MRR:', error);
      alert('Error creating MRR');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitMrr = async (mrrId: number) => {
    try {
      await mrrAPI.submitMrr(mrrId);
      alert('MRR submitted for approval');
      loadData();
    } catch (error) {
      console.error('Error submitting MRR:', error);
      alert('Error submitting MRR');
    }
  };

  const handleApproveMrr = async (mrrId: number, action: 'approve' | 'reject') => {
    try {
      await mrrAPI.approveMrr(mrrId, action);
      alert(`MRR ${action}d successfully`);
      loadData();
    } catch (error) {
      console.error(`Error ${action}ing MRR:`, error);
      alert(`Error ${action}ing MRR`);
    }
  };

  const handleCreatePO = (mrrId: number) => {
    // Navigate to Create Purchase Order page with MRR ID
    window.location.href = `/create-purchase-order?mrrId=${mrrId}`;
  };

  const handleUpdateStatus = async () => {
    if (!newStatus || !statusTarget) {
      alert('Please select a status');
      return;
    }

    try {
      await mrrAPI.updateMrrStatus(statusTarget.mrr_id, newStatus, statusNotes);
      alert('MRR status updated successfully');
      setShowStatusModal(false);
      setStatusTarget(null);
      setNewStatus('');
      setStatusNotes('');
      loadData();
    } catch (error) {
      console.error('Error updating MRR status:', error);
      alert('Failed to update MRR status');
    }
  };

  const addItem = () => {
    setFormData({
      ...formData,
      items: [...formData.items, {
        item_id: 1, // Use a valid default item ID
        quantity_requested: 1, // Use a valid default quantity
        unit_id: 1, // Use a valid default unit ID
        specifications: '',
        purpose: '',
        priority: 'MEDIUM',
        estimated_cost_per_unit: 0
      }]
    });
  };

  const updateItem = (index: number, field: string, value: any) => {
    const newItems = [...formData.items];
    newItems[index] = { ...newItems[index], [field]: value };
    setFormData({ ...formData, items: newItems });
  };

  const removeItem = (index: number) => {
    const newItems = formData.items.filter((_, i) => i !== index);
    setFormData({ ...formData, items: newItems });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'DRAFT': return 'bg-gray-100 text-gray-800';
      case 'SUBMITTED': return 'bg-blue-100 text-blue-800';
      case 'APPROVED': return 'bg-green-100 text-green-800';
      case 'REJECTED': return 'bg-red-100 text-red-800';
      case 'PROCESSING': return 'bg-yellow-100 text-yellow-800';
      case 'COMPLETED': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'LOW': return 'bg-green-100 text-green-800';
      case 'MEDIUM': return 'bg-yellow-100 text-yellow-800';
      case 'HIGH': return 'bg-orange-100 text-orange-800';
      case 'URGENT': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading && mrrs.length === 0) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Material Requirement Requests</h1>
        <button
          onClick={() => setShowCreateForm(true)}
          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
        >
          Create New MRR
        </button>
      </div>

      {/* MRR List */}
      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <ul className="divide-y divide-gray-200">
          {mrrs.map((mrr) => (
            <li key={mrr.mrr_id} className="px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center">
                    <h3 className="text-lg font-medium text-gray-900">
                      {mrr.mrr_number}
                    </h3>
                    <span className={`ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(mrr.status)}`}>
                      {mrr.status}
                    </span>
                    <span className={`ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPriorityColor(mrr.priority)}`}>
                      {mrr.priority}
                    </span>
                  </div>
                  <div className="mt-1 text-sm text-gray-500">
                    <p>Required Date: {new Date(mrr.required_date).toLocaleDateString()}</p>
                    <p>Total Items: {mrr.items?.length || 0}</p>
                    <p>Estimated Cost: ₹{mrr.total_estimated_cost?.toLocaleString() || 0}</p>
                  </div>
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => { setDetailsTarget(mrr); setShowDetailsModal(true); }}
                    className="bg-gray-600 hover:bg-gray-700 text-white text-sm font-bold py-1 px-3 rounded"
                  >
                    View Details
                  </button>
                  {mrr.status === 'APPROVED' && (
                    <button
                      onClick={() => handleCreatePO(mrr.mrr_id)}
                      className="bg-purple-500 hover:bg-purple-700 text-white text-sm font-bold py-1 px-3 rounded"
                    >
                      Create PO
                    </button>
                  )}
                  {mrr.status === 'DRAFT' && (
                    <button
                      onClick={() => handleSubmitMrr(mrr.mrr_id)}
                      className="bg-blue-500 hover:bg-blue-700 text-white text-sm font-bold py-1 px-3 rounded"
                    >
                      Submit
                    </button>
                  )}
                  {mrr.status === 'SUBMITTED' && (
                    <>
                      <button
                        onClick={() => handleApproveMrr(mrr.mrr_id, 'approve')}
                        className="bg-green-500 hover:bg-green-700 text-white text-sm font-bold py-1 px-3 rounded"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => handleApproveMrr(mrr.mrr_id, 'reject')}
                        className="bg-red-500 hover:bg-red-700 text-white text-sm font-bold py-1 px-3 rounded"
                      >
                        Reject
                      </button>
                    </>
                  )}
                  {['DRAFT','SUBMITTED','APPROVED','PROCESSING','COMPLETED'].includes(mrr.status) && (
                    <button
                      onClick={() => { setInventoryCheckTarget(mrr); setShowInventoryCheck(true); }}
                      className="bg-purple-600 hover:bg-purple-700 text-white text-sm font-bold py-1 px-3 rounded"
                    >
                      Check Inventory
                    </button>
                  )}
                  {(user?.role === 'Admin' || user?.role === 'Project Manager') && mrr.status !== 'CANCELLED' && (
                    <button
                      onClick={() => { 
                        setStatusTarget(mrr); 
                        setNewStatus(mrr.status);
                        setShowStatusModal(true); 
                      }}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold py-1 px-3 rounded"
                    >
                      Change Status
                    </button>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>

      {/* Create MRR Modal */}
      {showCreateForm && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Create Material Requirement Request</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Project</label>
                  <select
                    value={formData.project_id}
                    onChange={(e) => setFormData({ ...formData, project_id: e.target.value })}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Select Project</option>
                    {projects.map((project) => (
                      <option key={project.project_id} value={project.project_id}>
                        {project.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Required Date</label>
                  <input
                    type="date"
                    value={formData.required_date}
                    onChange={(e) => setFormData({ ...formData, required_date: e.target.value })}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Priority</label>
                  <select
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                    <option value="URGENT">Urgent</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Notes</label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    rows={3}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <div className="flex justify-between items-center">
                    <label className="block text-sm font-medium text-gray-700">Items</label>
                    <button
                      onClick={addItem}
                      className="bg-green-500 hover:bg-green-700 text-white text-sm font-bold py-1 px-3 rounded"
                    >
                      Add Item
                    </button>
                  </div>
                  
                  {formData.items.map((item, index) => (
                    <div key={index} className="mt-2 p-3 border rounded-md">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-gray-700">Item</label>
                          <select
                            value={item.item_id}
                            onChange={(e) => updateItem(index, 'item_id', parseInt(e.target.value))}
                            className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                          >
                            <option value={0}>Select Item</option>
                            {items.map((itemOption) => (
                              <option key={itemOption.item_id} value={itemOption.item_id}>
                                {itemOption.item_name} ({itemOption.item_code})
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-gray-700">Quantity</label>
                          <input
                            type="number"
                            value={item.quantity_requested}
                            onChange={(e) => updateItem(index, 'quantity_requested', parseInt(e.target.value))}
                            className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-gray-700">Unit</label>
                          <select
                            value={item.unit_id}
                            onChange={(e) => updateItem(index, 'unit_id', parseInt(e.target.value))}
                            className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                          >
                            <option value={0}>Select Unit</option>
                            {units.map((unit) => (
                              <option key={unit.unit_id} value={unit.unit_id}>
                                {unit.unit_name} ({unit.unit_symbol})
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-gray-700">Cost per Unit</label>
                          <input
                            type="number"
                            step="0.01"
                            value={item.estimated_cost_per_unit}
                            onChange={(e) => updateItem(index, 'estimated_cost_per_unit', parseFloat(e.target.value))}
                            className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                          />
                        </div>

                        <div className="md:col-span-2">
                          <label className="block text-xs font-medium text-gray-700">Purpose</label>
                          <input
                            type="text"
                            value={item.purpose}
                            onChange={(e) => updateItem(index, 'purpose', e.target.value)}
                            className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                          />
                        </div>

                        <div className="md:col-span-2">
                          <label className="block text-xs font-medium text-gray-700">Specifications</label>
                          <input
                            type="text"
                            value={item.specifications}
                            onChange={(e) => updateItem(index, 'specifications', e.target.value)}
                            className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                          />
                        </div>
                      </div>
                      
                      <button
                        onClick={() => removeItem(index)}
                        className="mt-2 bg-red-500 hover:bg-red-700 text-white text-sm font-bold py-1 px-3 rounded"
                      >
                        Remove Item
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => setShowCreateForm(false)}
                  className="bg-gray-500 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateMrr}
                  disabled={loading}
                  className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded disabled:opacity-50"
                >
                  {loading ? 'Creating...' : 'Create MRR'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showInventoryCheck && inventoryCheckTarget && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-10 mx-auto p-5 border w-11/12 md:w-5/6 lg:w-4/5 shadow-lg rounded-md bg-white">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold text-gray-900">MRR Inventory Check</h3>
              <button
                onClick={() => { setShowInventoryCheck(false); setInventoryCheckTarget(null); }}
                className="text-gray-600 hover:text-gray-800"
              >
                ✕
              </button>
            </div>
            <MrrInventoryCheck
              mrrId={inventoryCheckTarget.mrr_id}
              mrrNumber={inventoryCheckTarget.mrr_number}
              onInventoryChecked={() => {
                // reload MRRs to reflect status updates
                loadData();
              }}
            />
          </div>
        </div>
      )}

      {/* Status Update Modal */}
      {showStatusModal && statusTarget && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Update MRR Status - {statusTarget.mrr_number}
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Status</label>
                  <select
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value)}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="DRAFT">Draft</option>
                    <option value="SUBMITTED">Submitted</option>
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
                    setStatusTarget(null);
                    setNewStatus('');
                    setStatusNotes('');
                  }}
                  className="bg-gray-500 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpdateStatus}
                  className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
                >
                  Update Status
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MRR Details Modal */}
      {showDetailsModal && detailsTarget && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-10 mx-auto p-5 border w-11/12 md:w-4/5 lg:w-3/4 shadow-lg rounded-md bg-white">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-semibold text-gray-900">
                MRR Details - {detailsTarget.mrr_number}
              </h3>
              <button
                onClick={() => { setShowDetailsModal(false); setDetailsTarget(null); }}
                className="text-gray-600 hover:text-gray-800 text-2xl"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Basic Information */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="text-lg font-semibold text-gray-800 mb-4">Basic Information</h4>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="font-medium text-gray-600">MRR Number:</span>
                    <span className="text-gray-900">{detailsTarget.mrr_number}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium text-gray-600">Status:</span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(detailsTarget.status)}`}>
                      {detailsTarget.status}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium text-gray-600">Priority:</span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(detailsTarget.priority)}`}>
                      {detailsTarget.priority}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium text-gray-600">Request Date:</span>
                    <span className="text-gray-900">{new Date(detailsTarget.request_date).toLocaleDateString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium text-gray-600">Required Date:</span>
                    <span className="text-gray-900">{new Date(detailsTarget.required_date).toLocaleDateString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium text-gray-600">Total Estimated Cost:</span>
                    <span className="text-gray-900 font-semibold">₹{detailsTarget.total_estimated_cost?.toLocaleString() || 0}</span>
                  </div>
                </div>
              </div>

              {/* Project Information */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="text-lg font-semibold text-gray-800 mb-4">Project Information</h4>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="font-medium text-gray-600">Project:</span>
                    <span className="text-gray-900">
                      {projects.find(p => p.project_id === detailsTarget.project_id)?.name || 'Unknown Project'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium text-gray-600">Requested By:</span>
                    <span className="text-gray-900">User ID: {detailsTarget.requested_by_user_id}</span>
                  </div>
                  {detailsTarget.approved_by_user_id && (
                    <div className="flex justify-between">
                      <span className="font-medium text-gray-600">Approved By:</span>
                      <span className="text-gray-900">User ID: {detailsTarget.approved_by_user_id}</span>
                    </div>
                  )}
                  {detailsTarget.approved_at && (
                    <div className="flex justify-between">
                      <span className="font-medium text-gray-600">Approved At:</span>
                      <span className="text-gray-900">{new Date(detailsTarget.approved_at).toLocaleDateString()}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Notes */}
            {detailsTarget.notes && (
              <div className="mt-6 bg-gray-50 p-4 rounded-lg">
                <h4 className="text-lg font-semibold text-gray-800 mb-3">Notes</h4>
                <p className="text-gray-700 whitespace-pre-wrap">{detailsTarget.notes}</p>
              </div>
            )}

            {/* Items List */}
            <div className="mt-6">
              <h4 className="text-lg font-semibold text-gray-800 mb-4">Requested Items ({detailsTarget.items?.length || 0})</h4>
              <div className="overflow-x-auto">
                <table className="min-w-full bg-white border border-gray-200">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Item</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quantity</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Unit</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cost/Unit</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Cost</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Purpose</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Specifications</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {detailsTarget.items?.map((item, index) => {
                      const itemMaster = items.find(i => i.item_id === item.item_id);
                      const unit = units.find(u => u.unit_id === item.unit_id);
                      const totalCost = (item.estimated_cost_per_unit || 0) * (item.quantity_requested || 0);
                      
                      return (
                        <tr key={index} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm text-gray-900">
                            <div>
                              <div className="font-medium">{itemMaster?.item_name || 'Unknown Item'}</div>
                              <div className="text-gray-500">{itemMaster?.item_code || 'N/A'}</div>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-900">{item.quantity_requested}</td>
                          <td className="px-4 py-3 text-sm text-gray-900">
                            {unit ? `${unit.unit_name} (${unit.unit_symbol})` : 'N/A'}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-900">₹{item.estimated_cost_per_unit?.toLocaleString() || 0}</td>
                          <td className="px-4 py-3 text-sm text-gray-900 font-medium">₹{totalCost.toLocaleString()}</td>
                          <td className="px-4 py-3 text-sm text-gray-900">{item.purpose || '-'}</td>
                          <td className="px-4 py-3 text-sm text-gray-900">{item.specifications || '-'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Close Button */}
            <div className="flex justify-end mt-6">
              <button
                onClick={() => { setShowDetailsModal(false); setDetailsTarget(null); }}
                className="bg-gray-500 hover:bg-gray-700 text-white font-bold py-2 px-6 rounded"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MrrFlowComponent;
