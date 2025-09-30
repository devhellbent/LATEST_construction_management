import React, { useState, useEffect } from 'react';
import { X, ChevronDown, Settings, Plus } from 'lucide-react';
import { commercialAPI, projectsAPI, materialsAPI, usersAPI, materialManagementAPI, mrrAPI, subcontractorsAPI } from '../services/api';

interface MaterialReturnFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface Project {
  project_id: number;
  name: string;
}

interface ProjectComponent {
  component_id: number;
  component_name: string;
  component_description?: string;
  component_type?: string;
}

interface Material {
  material_id: number;
  name: string;
  type: string;
  size?: string;
  unit: string;
  stock_qty: number;
  cost_per_unit: number;
}

interface User {
  user_id: number;
  name: string;
}

interface MaterialItem {
  material_id: number;
  quantity: number;
  condition_status: 'GOOD' | 'DAMAGED' | 'USED' | 'EXPIRED';
  material?: Material;
}

const MaterialReturnForm: React.FC<MaterialReturnFormProps> = ({ isOpen, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    project_id: '',
    material_return_id: 'MR000001',
    return_from: '',
    return_to_inventory: 'dp',
    warehouse_id: '',
    tags: '',
    checked_by: '',
    remarks: '',
    component_id: '',
    subcontractor_id: '',
    mrr_id: ''
  });

  const [materials, setMaterials] = useState<MaterialItem[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [allMaterials, setAllMaterials] = useState<Material[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [components, setComponents] = useState<ProjectComponent[]>([]);
  const [mrrs, setMrrs] = useState<any[]>([]);
  const [subcontractors, setSubcontractors] = useState<any[]>([]);
  const [selectedMrr, setSelectedMrr] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (isOpen) {
      fetchInitialData();
    }
  }, [isOpen]);

  const fetchInitialData = async () => {
    try {
      const [projectsRes, materialsRes, usersRes, warehousesRes, mrrsRes, subcontractorsRes] = await Promise.all([
        projectsAPI.getProjects(),
        materialsAPI.getMaterials(),
        usersAPI.getUsers(),
        materialManagementAPI.getWarehouses(),
        mrrAPI.getMrrs({ status: 'APPROVED' }),
        subcontractorsAPI.getSubcontractors()
      ]);

      setProjects(projectsRes.data.projects || []);
      setAllMaterials(materialsRes.data.materials || []);
      setUsers(usersRes.data.users || []);
      setWarehouses(warehousesRes.data.warehouses || []);
      setMrrs(mrrsRes.data.mrrs || []);
      setSubcontractors(subcontractorsRes.data.subcontractors || []);
    } catch (error) {
      console.error('Error fetching initial data:', error);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
    
    if (field === 'mrr_id' && value) {
      const mrr = mrrs.find(m => m.mrr_id === parseInt(value));
      if (mrr) {
        setSelectedMrr(mrr);
        setFormData(prev => ({
          ...prev,
          project_id: mrr.project_id?.toString() || '',
          component_id: mrr.items?.[0]?.component_id?.toString() || '',
          subcontractor_id: mrr.items?.[0]?.subcontractor_id?.toString() || ''
        }));

        // Load components for the project
        if (mrr.project_id) {
          loadComponents(mrr.project_id);
        }
      }
    }
    
    // If project changes, load components for that project
    if (field === 'project_id' && value) {
      loadComponents(parseInt(value));
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

  const addMaterial = () => {
    if (!formData.return_from) {
      setErrors(prev => ({ ...prev, subcontractor: 'Please select subcontractor first' }));
      return;
    }
    setMaterials(prev => [...prev, { material_id: 0, quantity: 0, condition_status: 'GOOD' }]);
  };

  const updateMaterial = (index: number, field: string, value: any) => {
    setMaterials(prev => prev.map((item, i) => 
      i === index ? { ...item, [field]: value } : item
    ));
  };

  const removeMaterial = (index: number) => {
    setMaterials(prev => prev.filter((_, i) => i !== index));
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.project_id) newErrors.project_id = 'Project is required';
    if (!formData.return_from) newErrors.return_from = 'Return from is required';
    if (!formData.warehouse_id) newErrors.warehouse_id = 'Warehouse location is required';
    if (!formData.checked_by) newErrors.checked_by = 'Checked by is required';
    if (materials.length === 0) newErrors.materials = 'At least one material is required';

    materials.forEach((material, index) => {
      if (!material.material_id) {
        newErrors[`material_${index}`] = 'Material selection is required';
      }
      if (!material.quantity || material.quantity <= 0) {
        newErrors[`quantity_${index}`] = 'Valid quantity is required';
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    try {
      setLoading(true);
      
      const returnData = {
        project_id: parseInt(formData.project_id),
        material_return_id: formData.material_return_id,
        return_from: formData.return_from,
        return_to_inventory: formData.return_to_inventory,
        warehouse_id: formData.warehouse_id ? parseInt(formData.warehouse_id) : null,
        tags: formData.tags,
        checked_by: parseInt(formData.checked_by),
        remarks: formData.remarks,
        materials: materials.map(m => ({
          material_id: m.material_id,
          quantity: m.quantity,
          condition_status: m.condition_status
        }))
      };

      // Create material return
      await commercialAPI.createMaterialReturn(returnData);
      
      onSuccess();
      onClose();
      resetForm();
    } catch (error) {
      console.error('Error creating material return:', error);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      project_id: '',
      material_return_id: 'MR000001',
      return_from: '',
      return_to_inventory: 'dp',
      warehouse_id: '',
      tags: '',
      checked_by: '',
      remarks: '',
      component_id: '',
      subcontractor_id: '',
      mrr_id: ''
    });
    setMaterials([]);
    setSelectedMrr(null);
    setErrors({});
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-100 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">New Subcontractor Material return</h2>
            <p className="text-sm text-gray-600">dp</p>
          </div>
          <div className="flex items-center space-x-4">
            <span className="text-sm text-gray-500">Creating on {new Date().toLocaleDateString('en-GB')}</span>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Material Return Details Card */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Material Return Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Material Return ID */}
              <div>
                <label className="label">Material Return ID*</label>
                <div className="flex">
                  <select className="px-3 py-2 border border-gray-300 rounded-l-lg border-r-0 focus:outline-none focus:ring-2 focus:ring-primary-500">
                    <option>MR</option>
                  </select>
                  <input
                    type="text"
                    value={formData.material_return_id}
                    onChange={(e) => handleInputChange('material_return_id', e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-r-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                  <button type="button" className="ml-2 p-2 text-gray-400 hover:text-gray-600">
                    <Settings className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* MRR Selection */}
              <div>
                <label className="label">MRR Reference</label>
                <div className="relative">
                  <select
                    value={formData.mrr_id}
                    onChange={(e) => handleInputChange('mrr_id', e.target.value)}
                    className="input"
                  >
                    <option value="">Select MRR (Optional)</option>
                    {mrrs.map(mrr => (
                      <option key={mrr.mrr_id} value={mrr.mrr_id}>
                        {mrr.mrr_number} - {mrr.project?.name}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-3 h-4 w-4 text-gray-400" />
                </div>
              </div>

              {/* Project */}
              <div>
                <label className="label">Project*</label>
                <div className="relative">
                  <select
                    value={formData.project_id}
                    onChange={(e) => handleInputChange('project_id', e.target.value)}
                    className={`input ${selectedMrr ? 'bg-gray-100' : ''}`}
                    disabled={!!selectedMrr}
                  >
                    <option value="">Select Project</option>
                    {projects.map(project => (
                      <option key={project.project_id} value={project.project_id}>
                        {project.name}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-3 h-4 w-4 text-gray-400" />
                </div>
                {selectedMrr && (
                  <p className="text-sm text-gray-500 mt-1">Prefilled from MRR</p>
                )}
              </div>

              {/* Subcontractor */}
              <div>
                <label className="label">Subcontractor</label>
                <div className="relative">
                  <select
                    value={formData.subcontractor_id}
                    onChange={(e) => handleInputChange('subcontractor_id', e.target.value)}
                    className={`input ${selectedMrr ? 'bg-gray-100' : ''}`}
                    disabled={!!selectedMrr}
                  >
                    <option value="">Select Subcontractor</option>
                    {subcontractors.map(subcontractor => (
                      <option key={subcontractor.subcontractor_id} value={subcontractor.subcontractor_id}>
                        {subcontractor.subcontractor_name}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-3 h-4 w-4 text-gray-400" />
                </div>
                {selectedMrr && (
                  <p className="text-sm text-gray-500 mt-1">Prefilled from MRR</p>
                )}
              </div>

              {/* Project Component */}
              <div>
                <label className="label">Project Component</label>
                <div className="relative">
                  <select
                    value={formData.component_id}
                    onChange={(e) => handleInputChange('component_id', e.target.value)}
                    className={`input ${selectedMrr ? 'bg-gray-100' : ''}`}
                    disabled={!formData.project_id || !!selectedMrr}
                  >
                    <option value="">Select Component</option>
                    {components.map(component => (
                      <option key={component.component_id} value={component.component_id}>
                        {component.component_name} {component.component_type && `(${component.component_type})`}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-3 h-4 w-4 text-gray-400" />
                </div>
                {!formData.project_id && (
                  <p className="text-sm text-gray-500 mt-1">Please select a project first</p>
                )}
                {selectedMrr && (
                  <p className="text-sm text-gray-500 mt-1">Prefilled from MRR</p>
                )}
              </div>

              {/* Return From */}
              <div>
                <label className="label">Return From*</label>
                <div className="relative">
                  <input
                    type="text"
                    value={formData.return_from}
                    onChange={(e) => handleInputChange('return_from', e.target.value)}
                    placeholder="Type 3 or more letters to search subcontractor"
                    className={`input ${errors.return_from ? 'border-red-500' : ''}`}
                  />
                  <ChevronDown className="absolute right-3 top-3 h-4 w-4 text-gray-400" />
                </div>
                {errors.return_from && <p className="text-red-500 text-sm mt-1">{errors.return_from}</p>}
              </div>

              {/* Return to Inventory */}
              <div>
                <label className="label">Return to Inventory</label>
                <div className="relative">
                  <input
                    type="text"
                    value={formData.return_to_inventory}
                    onChange={(e) => handleInputChange('return_to_inventory', e.target.value)}
                    className="input"
                  />
                  <ChevronDown className="absolute right-3 top-3 h-4 w-4 text-gray-400" />
                </div>
              </div>

              {/* Warehouse Selection */}
              <div>
                <label className="label">Warehouse Location*</label>
                <div className="relative">
                  <select
                    value={formData.warehouse_id}
                    onChange={(e) => handleInputChange('warehouse_id', e.target.value)}
                    className={`input ${errors.warehouse_id ? 'border-red-500' : ''}`}
                  >
                    <option value="">Select Warehouse</option>
                    {warehouses.map(warehouse => (
                      <option key={warehouse.warehouse_id} value={warehouse.warehouse_id}>
                        {warehouse.warehouse_name} - {warehouse.address}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-3 h-4 w-4 text-gray-400" />
                </div>
                {errors.warehouse_id && <p className="text-red-500 text-sm mt-1">{errors.warehouse_id}</p>}
              </div>

              {/* Tags */}
              <div>
                <label className="label">Tags</label>
                <div className="relative">
                  <input
                    type="text"
                    value={formData.tags}
                    onChange={(e) => handleInputChange('tags', e.target.value)}
                    placeholder="Type & Select"
                    className="input"
                  />
                  <ChevronDown className="absolute right-3 top-3 h-4 w-4 text-gray-400" />
                </div>
              </div>

              {/* Checked By */}
              <div>
                <label className="label">Checked By*</label>
                <div className="relative">
                  <select
                    value={formData.checked_by}
                    onChange={(e) => handleInputChange('checked_by', e.target.value)}
                    className={`input ${errors.checked_by ? 'border-red-500' : ''}`}
                  >
                    <option value="">Select Team member</option>
                    {users.map(user => (
                      <option key={user.user_id} value={user.user_id}>
                        {user.name}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-3 h-4 w-4 text-gray-400" />
                </div>
                {errors.checked_by && <p className="text-red-500 text-sm mt-1">{errors.checked_by}</p>}
              </div>

              {/* Project Component (prefilled from issue) */}
              <div>
                <label className="label">Project Component</label>
                <div className="relative">
                  <select
                    value={formData.component_id}
                    onChange={(e) => handleInputChange('component_id', e.target.value)}
                    className="input"
                    disabled={!formData.project_id}
                  >
                    <option value="">Select Component</option>
                    {components.map(component => (
                      <option key={component.component_id} value={component.component_id}>
                        {component.component_name} {component.component_type && `(${component.component_type})`}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-3 h-4 w-4 text-gray-400" />
                </div>
                {!formData.project_id && (
                  <p className="text-sm text-gray-500 mt-1">Please select a project first</p>
                )}
              </div>
            </div>
          </div>

          {/* Materials to be returned Card */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">Materials to be returned</h3>
            </div>

            {materials.length === 0 ? (
              <div className="text-center py-8">
                <div className="flex items-center justify-center mb-4">
                  <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center">
                    <Plus className="h-6 w-6 text-gray-400" />
                  </div>
                </div>
                <div className="flex items-center justify-center space-x-2 mb-2">
                  <button
                    type="button"
                    onClick={addMaterial}
                    className="text-primary-600 hover:text-primary-700 font-medium"
                  >
                    Select Materials
                  </button>
                  {!formData.return_from && (
                    <span className="text-orange-500 text-sm">(Select Subcontractor first)</span>
                  )}
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {materials.map((material, index) => (
                  <div key={index} className="flex items-center space-x-4 p-4 border border-gray-200 rounded-lg">
                    <div className="flex-1">
                      <select
                        value={material.material_id}
                        onChange={(e) => updateMaterial(index, 'material_id', parseInt(e.target.value))}
                        className={`input ${errors[`material_${index}`] ? 'border-red-500' : ''}`}
                      >
                        <option value={0}>Select Material</option>
                        {allMaterials.map(mat => (
                          <option key={mat.material_id} value={mat.material_id}>
                            {mat.name} ({mat.type}) - Stock: {mat.stock_qty} {mat.unit}
                          </option>
                        ))}
                      </select>
                      {errors[`material_${index}`] && (
                        <p className="text-red-500 text-sm mt-1">{errors[`material_${index}`]}</p>
                      )}
                    </div>
                    <div className="w-32">
                      <input
                        type="number"
                        value={material.quantity}
                        onChange={(e) => updateMaterial(index, 'quantity', parseInt(e.target.value))}
                        placeholder="Quantity"
                        min="1"
                        className={`input ${errors[`quantity_${index}`] ? 'border-red-500' : ''}`}
                      />
                      {errors[`quantity_${index}`] && (
                        <p className="text-red-500 text-sm mt-1">{errors[`quantity_${index}`]}</p>
                      )}
                    </div>
                    <div className="w-32">
                      <select
                        value={material.condition_status}
                        onChange={(e) => updateMaterial(index, 'condition_status', e.target.value)}
                        className="input"
                      >
                        <option value="GOOD">Good</option>
                        <option value="DAMAGED">Damaged</option>
                        <option value="USED">Used</option>
                        <option value="EXPIRED">Expired</option>
                      </select>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeMaterial(index)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            {errors.materials && <p className="text-red-500 text-sm mt-2">{errors.materials}</p>}
            {errors.subcontractor && <p className="text-red-500 text-sm mt-2">{errors.subcontractor}</p>}
          </div>

          {/* Remarks and Attachments Card */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Remarks and Attachments</h3>
            <div className="relative">
              <textarea
                value={formData.remarks}
                onChange={(e) => handleInputChange('remarks', e.target.value)}
                placeholder="Mention remarks if any"
                rows={4}
                maxLength={200}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
              />
              <div className="absolute bottom-2 right-2 text-sm text-gray-500">
                {formData.remarks.length}/200
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200"
            >
              Cancel
            </button>
            <div className="text-center text-sm text-gray-500">
              Material Return will be auto-approved as there are no approvers
            </div>
            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary px-6 py-2"
            >
              {loading ? 'Creating...' : 'Return Material'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default MaterialReturnForm;

