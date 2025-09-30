import React, { useState, useEffect } from 'react';
import { X, Calendar, ChevronDown, Settings, Plus } from 'lucide-react';
import { commercialAPI, projectsAPI, materialsAPI, usersAPI, mrrAPI, subcontractorsAPI } from '../services/api';

interface MaterialIssueFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  editData?: any; // For editing existing material issue
  mrrData?: any; // MRR data for prefilling
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
  unit: string;
  stock_qty: number;
  cost_per_unit: number;
}

interface User {
  user_id: number;
  name: string;
}

interface MRR {
  mrr_id: number;
  mrr_number: string;
  project_id: number;
  project?: Project;
  items?: Array<{
    mrr_item_id: number;
    item_id: number;
    component_id?: number;
    subcontractor_id?: number;
    quantity_requested: number;
    item?: {
      item_id: number;
      item_name: string;
      item_code: string;
    };
    component?: ProjectComponent;
  }>;
}

interface MaterialItem {
  material_id: number;
  quantity: number;
  material?: Material;
}

const MaterialIssueForm: React.FC<MaterialIssueFormProps> = ({ isOpen, onClose, onSuccess, editData, mrrData }) => {
  const [formData, setFormData] = useState({
    mrr_id: '',
    project_id: '',
    material_id: '',
    quantity_issued: '',
    issue_date: '',
    issue_purpose: '',
    location: '',
    issued_by_user_id: '',
    received_by_user_id: '',
    status: 'PENDING',
    component_id: '',
    subcontractor_id: ''
  });

  const [projects, setProjects] = useState<Project[]>([]);
  const [allMaterials, setAllMaterials] = useState<Material[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [components, setComponents] = useState<ProjectComponent[]>([]);
  const [subcontractors, setSubcontractors] = useState<any[]>([]);
  const [mrrs, setMrrs] = useState<MRR[]>([]);
  const [selectedMrr, setSelectedMrr] = useState<MRR | null>(null);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string>('');

  useEffect(() => {
    if (isOpen) {
      fetchInitialData();
      if (editData) {
        populateEditData();
      } else if (mrrData) {
        populateMrrData();
      }
    }
  }, [isOpen, editData, mrrData]);

  const fetchInitialData = async () => {
    try {
      const [projectsRes, materialsRes, usersRes, mrrsRes, subcontractorsRes] = await Promise.all([
        projectsAPI.getProjects(),
        materialsAPI.getMaterials(),
        usersAPI.getUsers(),
        mrrAPI.getMrrs({ status: 'APPROVED' }),
        subcontractorsAPI.getSubcontractors()
      ]);

      setProjects(projectsRes.data.projects || []);
      setAllMaterials(materialsRes.data.materials || []);
      setUsers(usersRes.data.users || []);
      setMrrs(mrrsRes.data.mrrs || []);
      setSubcontractors(subcontractorsRes.data.subcontractors || []);
      console.log('MRRs loaded:', mrrsRes.data.mrrs);
    } catch (error) {
      console.error('Error fetching initial data:', error);
    }
  };

  const populateEditData = () => {
    if (editData) {
      setFormData({
        mrr_id: editData.mrr_id?.toString() || '',
        project_id: editData.project_id?.toString() || '',
        material_id: editData.material_id?.toString() || '',
        quantity_issued: editData.quantity_issued?.toString() || '',
        issue_date: editData.issue_date || '',
        issue_purpose: editData.issue_purpose || '',
        location: editData.location || '',
        issued_by_user_id: editData.issued_by_user_id?.toString() || '',
        received_by_user_id: editData.received_by_user_id?.toString() || '',
        status: editData.status || 'PENDING',
        component_id: editData.component_id?.toString() || '',
        subcontractor_id: editData.subcontractor_id?.toString() || ''
      });
    }
  };

  const populateMrrData = () => {
    if (mrrData) {
      console.log('Populating MRR data:', mrrData);
      setSelectedMrr(mrrData);
      setFormData({
        mrr_id: mrrData.mrr_id?.toString() || '',
        project_id: mrrData.project_id?.toString() || '',
        material_id: '',
        quantity_issued: '',
        issue_date: '',
        issue_purpose: '',
        location: '',
        issued_by_user_id: '',
        received_by_user_id: '',
        status: 'PENDING',
        component_id: mrrData.component_id?.toString() || '',
        subcontractor_id: mrrData.subcontractor_id?.toString() || ''
      });
      
      // Load components for the project
      if (mrrData.project_id) {
        loadComponents(mrrData.project_id);
      }
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
    
    // If project changes, load components for that project and clear subcontractor
    if (field === 'project_id' && value) {
      loadComponents(parseInt(value));
      setFormData(prev => ({ ...prev, subcontractor_id: '' }));
    }
    
    // If MRR changes, populate fields from MRR
    if (field === 'mrr_id' && value) {
      const mrr = mrrs.find(m => m.mrr_id === parseInt(value));
      console.log('Selected MRR:', mrr);
      if (mrr) {
        setSelectedMrr(mrr);
        console.log('MRR project_id:', mrr.project_id);
        console.log('MRR items:', mrr.items);
        console.log('First item component_id:', mrr.items?.[0]?.component_id);
        
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


  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.project_id) newErrors.project_id = 'Project is required';
    if (!formData.material_id) newErrors.material_id = 'Material is required';
    if (!formData.quantity_issued || parseInt(formData.quantity_issued) <= 0) newErrors.quantity_issued = 'Valid quantity is required';
    if (!formData.issue_date) newErrors.issue_date = 'Issue date is required';
    if (!formData.location) newErrors.location = 'Location is required';
    if (!formData.issued_by_user_id) newErrors.issued_by_user_id = 'Issued by is required';
    if (!formData.received_by_user_id) newErrors.received_by_user_id = 'Received by is required';

    // Additional validation
    if (formData.project_id && isNaN(parseInt(formData.project_id))) {
      newErrors.project_id = 'Invalid project selection';
    }
    if (formData.material_id && isNaN(parseInt(formData.material_id))) {
      newErrors.material_id = 'Invalid material selection';
    }
    if (formData.issued_by_user_id && isNaN(parseInt(formData.issued_by_user_id))) {
      newErrors.issued_by_user_id = 'Invalid user selection';
    }
    if (formData.received_by_user_id && isNaN(parseInt(formData.received_by_user_id))) {
      newErrors.received_by_user_id = 'Invalid user selection';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    try {
      setLoading(true);
      
      const issueData = {
        project_id: parseInt(formData.project_id),
        material_id: parseInt(formData.material_id),
        quantity_issued: parseInt(formData.quantity_issued),
        issue_date: new Date(formData.issue_date).toISOString().split('T')[0], // Format as YYYY-MM-DD
        issue_purpose: formData.issue_purpose,
        location: formData.location,
        issued_by_user_id: parseInt(formData.issued_by_user_id),
        received_by_user_id: parseInt(formData.received_by_user_id),
        status: formData.status,
        component_id: formData.component_id ? parseInt(formData.component_id) : null,
        subcontractor_id: formData.subcontractor_id ? parseInt(formData.subcontractor_id) : null
      };

      // Create or update material issue
      if (editData) {
        await commercialAPI.updateMaterialIssue(editData.issue_id, issueData);
      } else {
        await commercialAPI.createMaterialIssue(issueData);
      }
      
      onSuccess();
      onClose();
      resetForm();
    } catch (error: any) {
      if (error.response?.data?.errors) {
        // Handle validation errors
        const validationErrors: Record<string, string> = {};
        error.response.data.errors.forEach((err: any) => {
          validationErrors[err.path] = err.msg;
        });
        setErrors(validationErrors);
        setError('Please fix the validation errors below');
      } else if (error.response?.data?.message) {
        setError(error.response.data.message);
      } else {
        setError('Failed to create material issue. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      mrr_id: '',
      project_id: '',
      material_id: '',
      quantity_issued: '',
      issue_date: '',
      issue_purpose: '',
      location: '',
      issued_by_user_id: '',
      received_by_user_id: '',
      status: 'PENDING',
      component_id: '',
      subcontractor_id: ''
    });
    setSelectedMrr(null);
    setErrors({});
    setError('');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              {editData ? 'Edit Material Issue' : 'New Material Issue'}
            </h2>
            <p className="text-sm text-gray-600">
              {editData ? `Issue ID: ${editData.issue_id}` : 'Create a new material issue'}
            </p>
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
          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center">
                <div className="text-red-700">{error}</div>
              </div>
            </div>
          )}

          {/* Main Form Section */}
          <div className="card p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                    className={`input ${errors.project_id ? 'border-red-500' : ''} ${selectedMrr ? 'bg-gray-100' : ''}`}
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
                {errors.project_id && <p className="text-red-500 text-sm mt-1">{errors.project_id}</p>}
                {selectedMrr && (
                  <p className="text-sm text-gray-500 mt-1">Prefilled from MRR</p>
                )}
              </div>

              {/* Material */}
              <div>
                <label className="label">Material*</label>
                <div className="relative">
                  <select
                    value={formData.material_id}
                    onChange={(e) => handleInputChange('material_id', e.target.value)}
                    className={`input ${errors.material_id ? 'border-red-500' : ''}`}
                  >
                    <option value="">Select Material</option>
                    {allMaterials.map(material => (
                      <option key={material.material_id} value={material.material_id}>
                        {material.name} ({material.type}) - Stock: {material.stock_qty} {material.unit}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-3 h-4 w-4 text-gray-400" />
                </div>
                {errors.material_id && <p className="text-red-500 text-sm mt-1">{errors.material_id}</p>}
              </div>

              {/* Quantity Issued */}
              <div>
                <label className="label">Quantity Issued*</label>
                <input
                  type="number"
                  value={formData.quantity_issued}
                  onChange={(e) => handleInputChange('quantity_issued', e.target.value)}
                  placeholder="Enter quantity"
                  min="1"
                  className={`input ${errors.quantity_issued ? 'border-red-500' : ''}`}
                />
                {errors.quantity_issued && <p className="text-red-500 text-sm mt-1">{errors.quantity_issued}</p>}
              </div>

              {/* Issue Date */}
              <div>
                <label className="label">Issue Date*</label>
                <div className="relative">
                  <input
                    type="date"
                    value={formData.issue_date}
                    onChange={(e) => handleInputChange('issue_date', e.target.value)}
                    className={`input ${errors.issue_date ? 'border-red-500' : ''}`}
                  />
                  <Calendar className="absolute right-3 top-3 h-4 w-4 text-gray-400" />
                </div>
                {errors.issue_date && <p className="text-red-500 text-sm mt-1">{errors.issue_date}</p>}
              </div>

              {/* Location */}
              <div>
                <label className="label">Location*</label>
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) => handleInputChange('location', e.target.value)}
                  placeholder="Enter location"
                  className={`input ${errors.location ? 'border-red-500' : ''}`}
                />
                {errors.location && <p className="text-red-500 text-sm mt-1">{errors.location}</p>}
              </div>

              {/* Status */}
              <div>
                <label className="label">Status</label>
                <div className="relative">
                  <select
                    value={formData.status}
                    onChange={(e) => handleInputChange('status', e.target.value)}
                    className="input"
                  >
                    <option value="PENDING">PENDING</option>
                    <option value="ISSUED">ISSUED</option>
                    <option value="RECEIVED">RECEIVED</option>
                    <option value="CANCELLED">CANCELLED</option>
                  </select>
                  <ChevronDown className="absolute right-3 top-3 h-4 w-4 text-gray-400" />
                </div>
              </div>

              {/* Issued By */}
              <div>
                <label className="label">Issued By*</label>
                <div className="relative">
                  <select
                    value={formData.issued_by_user_id}
                    onChange={(e) => handleInputChange('issued_by_user_id', e.target.value)}
                    className={`input ${errors.issued_by_user_id ? 'border-red-500' : ''}`}
                  >
                    <option value="">Select User</option>
                    {users.map(user => (
                      <option key={user.user_id} value={user.user_id}>
                        {user.name}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-3 h-4 w-4 text-gray-400" />
                </div>
                {errors.issued_by_user_id && <p className="text-red-500 text-sm mt-1">{errors.issued_by_user_id}</p>}
              </div>

              {/* Received By */}
              <div>
                <label className="label">Received By*</label>
                <div className="relative">
                  <select
                    value={formData.received_by_user_id}
                    onChange={(e) => handleInputChange('received_by_user_id', e.target.value)}
                    className={`input ${errors.received_by_user_id ? 'border-red-500' : ''}`}
                  >
                    <option value="">Select User</option>
                    {users.map(user => (
                      <option key={user.user_id} value={user.user_id}>
                        {user.name}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-3 h-4 w-4 text-gray-400" />
                </div>
                {errors.received_by_user_id && <p className="text-red-500 text-sm mt-1">{errors.received_by_user_id}</p>}
              </div>

              {/* Subcontractor */}
              <div>
                <label className="label">Subcontractor</label>
                <div className="relative">
                  <select
                    value={formData.subcontractor_id}
                    onChange={(e) => handleInputChange('subcontractor_id', e.target.value)}
                    className={`input ${selectedMrr ? 'bg-gray-100' : ''}`}
                    disabled={!!selectedMrr || !formData.project_id}
                  >
                    <option value="">Select Subcontractor</option>
                    {subcontractors
                      .filter(sub => sub.project_id === parseInt(formData.project_id))
                      .map(subcontractor => (
                      <option key={subcontractor.subcontractor_id} value={subcontractor.subcontractor_id}>
                        {subcontractor.company_name} {subcontractor.work_type && `(${subcontractor.work_type})`}
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
            </div>
          </div>


          {/* Issue Purpose Section */}
          <div className="card p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Issue Purpose</h3>
            <div className="relative">
              <textarea
                value={formData.issue_purpose}
                onChange={(e) => handleInputChange('issue_purpose', e.target.value)}
                placeholder="Mention purpose or remarks if any"
                rows={4}
                maxLength={500}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
              />
              <div className="absolute bottom-2 right-2 text-sm text-gray-500">
                {formData.issue_purpose.length}/500
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
              {editData ? 'Update material issue details' : 'Create new material issue'}
            </div>
            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary px-6 py-2"
            >
              {loading ? (editData ? 'Updating...' : 'Creating...') : (editData ? 'Update Material Issue' : 'Issue Material')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default MaterialIssueForm;

