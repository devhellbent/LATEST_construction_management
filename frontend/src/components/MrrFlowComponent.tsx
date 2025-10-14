import React, { useState, useEffect } from 'react';
import { mrrAPI, projectsAPI, materialsAPI, subcontractorsAPI } from '../services/api';
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
  created_by?: number;
  request_date: string;
  required_date: string;
  priority: string;
  status: string;
  approval_status: string;
  total_estimated_cost: number;
  notes?: string;
  approved_by_user_id?: number;
  approved_at?: string;
  createdBy?: {
    name: string;
    email: string;
  };
  requestedBy?: {
    name: string;
    email: string;
  };
  approvedBy?: {
    name: string;
    email: string;
  };
  component?: {
    component_id: number;
    component_name: string;
    component_type: string;
  };
  subcontractor?: {
    subcontractor_id: number;
    company_name: string;
    work_type: string;
  };
  items: MrrItem[];
}

const MrrFlowComponent: React.FC = () => {
  const { user } = useAuth();
  const [mrrs, setMrrs] = useState<MaterialRequirementRequest[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [items, setItems] = useState<any[]>([]);
  const [units, setUnits] = useState<any[]>([]);
  const [components, setComponents] = useState<any[]>([]);
  const [subcontractors, setSubcontractors] = useState<any[]>([]);
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
    component_id: '',
    subcontractor_id: '',
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
      // Don't load all subcontractors initially - load them per project
      setSubcontractors([]);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadComponents = async (projectId: number) => {
    try {
      const response = await projectsAPI.getProjectComponents(projectId);
      console.log('Components response:', response.data);
      setComponents(response.data.data?.components || []);
    } catch (error) {
      console.error('Error loading components:', error);
      setComponents([]);
    }
  };

  const loadSubcontractors = async (projectId: number) => {
    try {
      const response = await subcontractorsAPI.getSubcontractorsByProject(projectId);
      console.log('Subcontractors response:', response.data);
      setSubcontractors(response.data.data?.subcontractors || []);
    } catch (error) {
      console.error('Error loading subcontractors:', error);
      setSubcontractors([]);
    }
  };

  const handleProjectChange = (projectId: string) => {
    setFormData({ ...formData, project_id: projectId, component_id: '', subcontractor_id: '' });
    
    if (projectId) {
      // Load components and subcontractors for the selected project
      loadComponents(parseInt(projectId));
      loadSubcontractors(parseInt(projectId));
    } else {
      setComponents([]);
      setSubcontractors([]);
    }
  };

  const handleCreateMrr = async () => {
    if (!formData.project_id || !formData.required_date || formData.items.length === 0) {
      alert('Please fill in all required fields');
      return;
    }

    // Validate mandatory fields
    if (!formData.component_id) {
      alert('Please select a Project Component');
      return;
    }
    if (!formData.subcontractor_id) {
      alert('Please select a Subcontractor');
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
        component_id: formData.component_id ? parseInt(formData.component_id) : null,
        subcontractor_id: formData.subcontractor_id ? parseInt(formData.subcontractor_id) : null,
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
        component_id: '',
        subcontractor_id: '',
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
    
    // Auto-populate unit when item is selected
    if (field === 'item_id' && value && value !== 0) {
      const selectedItem = items.find(item => item.item_id === value);
      if (selectedItem && selectedItem.unit_id) {
        newItems[index].unit_id = selectedItem.unit_id;
      }
    }
    
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
    <div className="space-responsive">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-responsive-3xl font-bold text-slate-900">Material Requirement Requests</h1>
          <p className="text-responsive-base text-slate-600 mt-2">Manage material requirement requests and track their approval workflow</p>
        </div>
        <button
          onClick={() => setShowCreateForm(true)}
          className="btn btn-primary w-full sm:w-auto"
        >
          Create New MRR
        </button>
      </div>

      {/* MRR List */}
      <div className="card-mobile">
        <h2 className="text-base sm:text-xl font-semibold text-slate-900 mb-4">MRR List</h2>
        
        {mrrs.length === 0 ? (
          <div className="text-center py-8 sm:py-12">
            <p className="text-slate-500 text-sm sm:text-base">No material requirement requests found</p>
          </div>
        ) : (
          <div className="space-y-4 sm:space-y-6">
            {mrrs.map((mrr) => (
              <div key={mrr.mrr_id} className="card-interactive p-4 sm:p-6">
                <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                  <div className="flex-1 w-full">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 mb-3 sm:mb-4">
                      <h3 className="text-base sm:text-lg font-semibold text-slate-900">
                        {mrr.mrr_number}
                      </h3>
                      <div className="flex flex-wrap gap-2">
                        <span className={`status-badge ${getStatusColor(mrr.status)} text-xs`}>
                          {mrr.status}
                        </span>
                        <span className={`status-badge ${getPriorityColor(mrr.priority)} text-xs`}>
                          {mrr.priority}
                        </span>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 text-xs sm:text-sm text-slate-600">
                      <div>
                        <span className="font-medium">Required Date:</span>
                        <p className="text-slate-900">{new Date(mrr.required_date).toLocaleDateString()}</p>
                      </div>
                      <div>
                        <span className="font-medium">Total Items:</span>
                        <p className="text-slate-900">{mrr.items?.length || 0}</p>
                      </div>
                      <div>
                        <span className="font-medium">Estimated Cost:</span>
                        <p className="font-semibold text-slate-900">₹{mrr.total_estimated_cost?.toLocaleString() || 0}</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="w-full sm:w-auto flex flex-wrap gap-2">
                    <button
                      onClick={() => { setDetailsTarget(mrr); setShowDetailsModal(true); }}
                      className="btn btn-secondary text-xs sm:text-sm w-full sm:w-auto"
                    >
                      View Details
                    </button>
                    {mrr.status === 'APPROVED' && (
                      <button
                        onClick={() => handleCreatePO(mrr.mrr_id)}
                        className="btn btn-primary text-xs sm:text-sm w-full sm:w-auto"
                      >
                        Create PO
                      </button>
                    )}
                    {mrr.status === 'DRAFT' && (
                      <button
                        onClick={() => handleSubmitMrr(mrr.mrr_id)}
                        className="btn btn-primary text-xs sm:text-sm w-full sm:w-auto"
                      >
                        Submit
                      </button>
                    )}
                    {mrr.status === 'SUBMITTED' && (
                      <>
                        <button
                          onClick={() => handleApproveMrr(mrr.mrr_id, 'approve')}
                          className="btn btn-success text-xs sm:text-sm w-full sm:w-auto"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => handleApproveMrr(mrr.mrr_id, 'reject')}
                          className="btn btn-danger text-xs sm:text-sm w-full sm:w-auto"
                        >
                          Reject
                        </button>
                      </>
                    )}
                    {['DRAFT','SUBMITTED','APPROVED','PROCESSING','COMPLETED'].includes(mrr.status) && (
                      <button
                        onClick={() => { setInventoryCheckTarget(mrr); setShowInventoryCheck(true); }}
                        className="btn btn-primary text-xs sm:text-sm w-full sm:w-auto"
                      >
                        Check Inventory
                      </button>
                    )}
                    {((typeof user?.role === 'string' && (user.role === 'Admin' || user.role === 'Project Manager' || user.role === 'Inventory Manager')) || 
                      (typeof user?.role === 'object' && user?.role?.name && (user.role.name === 'Admin' || user.role.name === 'Project Manager' || user.role.name === 'Inventory Manager'))) && 
                     mrr.status !== 'CANCELLED' && (
                      <button
                        onClick={() => { 
                          setStatusTarget(mrr); 
                          setNewStatus(mrr.status);
                          setShowStatusModal(true); 
                        }}
                        className="btn btn-ghost btn-sm p-2 w-full sm:w-auto"
                        title="Change Status"
                        aria-label="Change Status"
                      >
                        <span role="img" aria-hidden="true">🔄</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create MRR Modal */}
      {showCreateForm && (
        <div className="modal-overlay">
          <div className="modal-content w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 sm:p-6 border-b border-slate-200">
              <h3 className="text-lg sm:text-2xl font-semibold text-slate-900">Create Material Requirement Request</h3>
              <button
                onClick={() => setShowCreateForm(false)}
                className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg p-2 transition-colors"
              >
                <span className="text-xl">✕</span>
              </button>
            </div>
            
            <form onSubmit={(e) => { e.preventDefault(); handleCreateMrr(); }} className="p-4 sm:p-6 space-y-4 sm:space-y-6">
              {/* Basic Information */}
              <div className="bg-slate-50 p-4 sm:p-6 rounded-lg">
                <h4 className="text-base sm:text-lg font-semibold text-slate-800 mb-4">Basic Information</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="label">Project <span className="text-red-500">*</span></label>
                    <select
                      value={formData.project_id}
                      onChange={(e) => handleProjectChange(e.target.value)}
                      className="input"
                      required
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
                    <label className="label">Required Date <span className="text-red-500">*</span></label>
                    <input
                      type="date"
                      value={formData.required_date}
                      onChange={(e) => setFormData({ ...formData, required_date: e.target.value })}
                      className="input"
                      required
                    />
                  </div>

                  <div>
                    <label className="label">Priority</label>
                    <select
                      value={formData.priority}
                      onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                      className="input"
                    >
                      <option value="LOW">Low</option>
                      <option value="MEDIUM">Medium</option>
                      <option value="HIGH">High</option>
                      <option value="URGENT">Urgent</option>
                    </select>
                  </div>

                  <div>
                    <label className="label">Project Component <span className="text-red-500">*</span></label>
                    <select
                      value={formData.component_id}
                      onChange={(e) => setFormData({ ...formData, component_id: e.target.value })}
                      className="input"
                      disabled={!formData.project_id}
                      required
                    >
                      <option value="">Select Component</option>
                      {components.map((component) => (
                        <option key={component.component_id} value={component.component_id}>
                          {component.component_name} {component.component_type && `(${component.component_type})`}
                        </option>
                      ))}
                    </select>
                    {!formData.project_id && (
                      <p className="text-sm text-gray-500 mt-1">Please select a project first</p>
                    )}
                  </div>

                  <div>
                    <label className="label">Subcontractor <span className="text-red-500">*</span></label>
                    <select
                      value={formData.subcontractor_id}
                      onChange={(e) => setFormData({ ...formData, subcontractor_id: e.target.value })}
                      className="input"
                      disabled={!formData.project_id}
                      required
                    >
                      <option value="">Select Subcontractor</option>
                      {subcontractors
                        .filter(sub => sub.project_id === parseInt(formData.project_id))
                        .map((subcontractor) => (
                        <option key={subcontractor.subcontractor_id} value={subcontractor.subcontractor_id}>
                          {subcontractor.company_name} {subcontractor.work_type && `(${subcontractor.work_type})`}
                        </option>
                      ))}
                    </select>
                    {!formData.project_id && (
                      <p className="text-sm text-gray-500 mt-1">Please select a project first</p>
                    )}
                  </div>

                  <div className="md:col-span-2">
                    <label className="label">Notes</label>
                    <textarea
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      rows={3}
                      className="input"
                      placeholder="Additional notes about the requirement..."
                    />
                  </div>
                </div>
              </div>

              {/* Items Section */}
              <div className="bg-slate-50 p-4 sm:p-6 rounded-lg">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
                  <h4 className="text-base sm:text-lg font-semibold text-slate-800">Items</h4>
                  <button
                    type="button"
                    onClick={addItem}
                    className="btn btn-success text-xs sm:text-sm w-full sm:w-auto"
                  >
                    Add Item
                  </button>
                </div>
                
                {formData.items.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-slate-500 text-sm sm:text-base">No items added yet. Click "Add Item" to get started.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {formData.items.map((item, index) => (
                      <div key={index} className="bg-white p-4 sm:p-6 border border-slate-200 rounded-lg">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
                          <h5 className="font-medium text-slate-900 text-sm sm:text-base">Item {index + 1}</h5>
                          <button
                            type="button"
                            onClick={() => removeItem(index)}
                            className="btn btn-danger text-xs sm:text-sm w-full sm:w-auto"
                          >
                            Remove Item
                          </button>
                        </div>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                          <div>
                            <label className="label">Item <span className="text-red-500">*</span></label>
                            <select
                              value={item.item_id}
                              onChange={(e) => updateItem(index, 'item_id', parseInt(e.target.value))}
                              className="input"
                              required
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
                            <label className="label">Quantity <span className="text-red-500">*</span></label>
                            <input
                              type="number"
                              min="1"
                              value={item.quantity_requested}
                              onChange={(e) => updateItem(index, 'quantity_requested', parseInt(e.target.value))}
                              className="input"
                              required
                            />
                          </div>

                          <div>
                            <label className="label">Unit <span className="text-red-500">*</span></label>
                            <select
                              value={item.unit_id}
                              onChange={(e) => updateItem(index, 'unit_id', parseInt(e.target.value))}
                              className="input"
                              required
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
                            <label className="label">Cost per Unit</label>
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              value={item.estimated_cost_per_unit}
                              onChange={(e) => updateItem(index, 'estimated_cost_per_unit', parseFloat(e.target.value))}
                              className="input"
                              placeholder="0.00"
                            />
                          </div>

                          <div className="md:col-span-2">
                            <label className="label">Purpose</label>
                            <input
                              type="text"
                              value={item.purpose}
                              onChange={(e) => updateItem(index, 'purpose', e.target.value)}
                              className="input"
                              placeholder="Purpose of this item..."
                            />
                          </div>

                          <div className="md:col-span-3">
                            <label className="label">Specifications</label>
                            <input
                              type="text"
                              value={item.specifications}
                              onChange={(e) => updateItem(index, 'specifications', e.target.value)}
                              className="input"
                              placeholder="Technical specifications..."
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="flex flex-col sm:flex-row justify-end gap-3 sm:gap-4 pt-4 sm:pt-6 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowCreateForm(false)}
                  className="btn btn-secondary w-full sm:w-auto"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="btn btn-primary disabled:opacity-50 w-full sm:w-auto"
                >
                  {loading ? 'Creating...' : 'Create MRR'}
                </button>
              </div>
            </form>
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
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-gray-900">
                Update MRR Status - {statusTarget.mrr_number}
              </h3>
              <button
                onClick={() => {
                  setShowStatusModal(false);
                  setStatusTarget(null);
                  setNewStatus('');
                  setStatusNotes('');
                }}
                className="text-gray-500 hover:text-gray-700 text-xl"
              >
                ✕
              </button>
            </div>
            
            <form onSubmit={(e) => { e.preventDefault(); handleUpdateStatus(); }} className="space-y-4">
              <div>
                <label className="label">Status</label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                  className="input"
                  required
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
                <label className="label">Notes</label>
                <textarea
                  value={statusNotes}
                  onChange={(e) => setStatusNotes(e.target.value)}
                  rows={3}
                  className="input"
                  placeholder="Add notes about the status change..."
                />
              </div>

              <div className="flex justify-end space-x-4 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => {
                    setShowStatusModal(false);
                    setStatusTarget(null);
                    setNewStatus('');
                    setStatusNotes('');
                  }}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                >
                  Update Status
                </button>
              </div>
            </form>
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
                    <span className="text-gray-900">
                      {detailsTarget.requestedBy?.name || `User ID: ${detailsTarget.requested_by_user_id}`}
                    </span>
                  </div>
                  {detailsTarget.createdBy && (
                    <div className="flex justify-between">
                      <span className="font-medium text-gray-600">Created By:</span>
                      <span className="text-gray-900">{detailsTarget.createdBy.name}</span>
                    </div>
                  )}
                  {detailsTarget.approvedBy && (
                    <div className="flex justify-between">
                      <span className="font-medium text-gray-600">Approved By:</span>
                      <span className="text-gray-900">{detailsTarget.approvedBy.name}</span>
                    </div>
                  )}
                  {detailsTarget.approved_at && (
                    <div className="flex justify-between">
                      <span className="font-medium text-gray-600">Approved At:</span>
                      <span className="text-gray-900">{new Date(detailsTarget.approved_at).toLocaleDateString()}</span>
                    </div>
                  )}
                  {detailsTarget.component && (
                    <div className="flex justify-between">
                      <span className="font-medium text-gray-600">Component:</span>
                      <span className="text-gray-900">
                        {detailsTarget.component.component_name} ({detailsTarget.component.component_type})
                      </span>
                    </div>
                  )}
                  {detailsTarget.subcontractor && (
                    <div className="flex justify-between">
                      <span className="font-medium text-gray-600">Subcontractor:</span>
                      <span className="text-gray-900">
                        {detailsTarget.subcontractor.company_name} ({detailsTarget.subcontractor.work_type})
                      </span>
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
            <div className="flex justify-end pt-6 border-t border-gray-200">
              <button
                onClick={() => { setShowDetailsModal(false); setDetailsTarget(null); }}
                className="btn btn-secondary"
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
