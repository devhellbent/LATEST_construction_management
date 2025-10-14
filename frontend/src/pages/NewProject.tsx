import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, X, Plus, Trash2 } from 'lucide-react';
import { projectsAPI, usersAPI } from '../services/api';
import toast from 'react-hot-toast';
import SearchableDropdown from '../components/SearchableDropdown';

interface ProjectComponent {
  component_name: string;
  component_description: string;
  component_type: string;
  estimated_cost: string;
  actual_cost: string;
  start_date: string;
  end_date: string;
  status: 'PLANNED' | 'IN_PROGRESS' | 'COMPLETED' | 'ON_HOLD' | 'CANCELLED';
}

interface ProjectSubcontractor {
  company_name: string;
  contact_person: string;
  phone: string;
  email: string;
  address: string;
  gst_number: string;
  pan_number: string;
  work_type: string;
  contract_value: string;
  start_date: string;
  end_date: string;
  status: 'ACTIVE' | 'INACTIVE' | 'COMPLETED' | 'TERMINATED';
  notes: string;
}

interface ProjectFormData {
  name: string;
  description: string;
  start_date: string;
  end_date: string;
  budget: string;
  tender_cost: string;
  emd: string;
  bg: string;
  planned_budget: string;
  actual_budget: string;
  subwork: string;
  status: 'PLANNED' | 'ACTIVE' | 'ON_HOLD' | 'COMPLETED' | 'CANCELLED';
  owner_user_id: number;
  components: ProjectComponent[];
  subcontractors: ProjectSubcontractor[];
}

interface User {
  user_id: number;
  name: string;
  email: string;
}

const NewProject: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [formData, setFormData] = useState<ProjectFormData>({
    name: '',
    description: '',
    start_date: '',
    end_date: '',
    budget: '',
    tender_cost: '',
    emd: '',
    bg: '',
    planned_budget: '',
    actual_budget: '',
    subwork: '',
    status: 'PLANNED',
    owner_user_id: 0,
    components: [],
    subcontractors: [],
  });

  useEffect(() => {
    // Fetch users for the owner dropdown
    const fetchUsers = async () => {
      try {
        const response = await usersAPI.getUsers();
        const usersData = response.data?.users || [];
        
        // Ensure usersData is an array
        if (Array.isArray(usersData)) {
          setUsers(usersData);
          // Set the first user as default if available
          if (usersData.length > 0) {
            setFormData(prev => ({ ...prev, owner_user_id: usersData[0].user_id }));
          }
        } else {
          console.error('Users data is not an array:', usersData);
          setUsers([]);
        }
      } catch (error) {
        console.error('Error fetching users:', error);
        toast.error('Failed to load users');
        setUsers([]);
      }
    };

    fetchUsers();
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'owner_user_id' ? parseInt(value) : value
    }));
  };

  const addComponent = () => {
    const newComponent: ProjectComponent = {
      component_name: '',
      component_description: '',
      component_type: '',
      estimated_cost: '',
      actual_cost: '',
      start_date: '',
      end_date: '',
      status: 'PLANNED',
    };
    setFormData(prev => ({
      ...prev,
      components: [...prev.components, newComponent]
    }));
  };

  const removeComponent = (index: number) => {
    setFormData(prev => ({
      ...prev,
      components: prev.components.filter((_, i) => i !== index)
    }));
  };

  const updateComponent = (index: number, field: keyof ProjectComponent, value: string) => {
    setFormData(prev => ({
      ...prev,
      components: prev.components.map((comp, i) => 
        i === index ? { ...comp, [field]: value } : comp
      )
    }));
  };

  const addSubcontractor = () => {
    const newSubcontractor: ProjectSubcontractor = {
      company_name: '',
      contact_person: '',
      phone: '',
      email: '',
      address: '',
      gst_number: '',
      pan_number: '',
      work_type: '',
      contract_value: '',
      start_date: '',
      end_date: '',
      status: 'ACTIVE',
      notes: '',
    };
    setFormData(prev => ({
      ...prev,
      subcontractors: [...prev.subcontractors, newSubcontractor]
    }));
  };

  const removeSubcontractor = (index: number) => {
    setFormData(prev => ({
      ...prev,
      subcontractors: prev.subcontractors.filter((_, i) => i !== index)
    }));
  };

  const updateSubcontractor = (index: number, field: keyof ProjectSubcontractor, value: string) => {
    setFormData(prev => ({
      ...prev,
      subcontractors: prev.subcontractors.map((sub, i) => 
        i === index ? { ...sub, [field]: value } : sub
      )
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      toast.error('Project name is required');
      return;
    }

    if (!formData.owner_user_id) {
      toast.error('Please select a project owner');
      return;
    }

    setLoading(true);
    try {
      const projectData = {
        ...formData,
        budget: formData.budget ? parseFloat(formData.budget) : null,
        tender_cost: formData.tender_cost ? parseFloat(formData.tender_cost) : null,
        emd: formData.emd ? parseFloat(formData.emd) : null,
        bg: formData.bg ? parseFloat(formData.bg) : null,
        planned_budget: formData.planned_budget ? parseFloat(formData.planned_budget) : null,
        actual_budget: formData.actual_budget ? parseFloat(formData.actual_budget) : null,
        start_date: formData.start_date || null,
        end_date: formData.end_date || null,
        components: formData.components.map(comp => ({
          ...comp,
          estimated_cost: comp.estimated_cost ? parseFloat(comp.estimated_cost) : null,
          actual_cost: comp.actual_cost ? parseFloat(comp.actual_cost) : null,
        })),
        subcontractors: formData.subcontractors.map(sub => ({
          ...sub,
          contract_value: sub.contract_value ? parseFloat(sub.contract_value) : null,
        })),
      };

      await projectsAPI.createProject(projectData);
      toast.success('Project created successfully!');
      
      // Dispatch custom event to notify other components
      window.dispatchEvent(new CustomEvent('projectCreated'));
      
      navigate('/projects');
    } catch (error: any) {
      console.error('Error creating project:', error);
      toast.error(error.response?.data?.message || 'Failed to create project');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    navigate('/projects');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-4">
        <button
          onClick={handleCancel}
          className="btn btn-secondary flex items-center"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Projects
        </button>
        <h1 className="text-3xl font-bold text-gray-900">New Project</h1>
      </div>

      <div className="card p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Project Name */}
            <div className="md:col-span-2">
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                Project Name *
              </label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                className="input w-full"
                placeholder="Enter project name"
                required
              />
            </div>

            {/* Description */}
            <div className="md:col-span-2">
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
                Description
              </label>
              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                rows={4}
                className="input w-full"
                placeholder="Enter project description"
              />
            </div>

            {/* Start Date */}
            <div>
              <label htmlFor="start_date" className="block text-sm font-medium text-gray-700 mb-2">
                Start Date
              </label>
              <input
                type="date"
                id="start_date"
                name="start_date"
                value={formData.start_date}
                onChange={handleInputChange}
                className="input w-full"
              />
            </div>

            {/* End Date */}
            <div>
              <label htmlFor="end_date" className="block text-sm font-medium text-gray-700 mb-2">
                End Date
              </label>
              <input
                type="date"
                id="end_date"
                name="end_date"
                value={formData.end_date}
                onChange={handleInputChange}
                className="input w-full"
              />
            </div>

            {/* Budget */}
            <div>
              <label htmlFor="budget" className="block text-sm font-medium text-gray-700 mb-2">
                Budget
              </label>
              <input
                type="number"
                id="budget"
                name="budget"
                value={formData.budget}
                onChange={handleInputChange}
                step="0.01"
                min="0"
                className="input w-full"
                placeholder="0.00"
              />
            </div>

            {/* Tender Cost */}
            <div>
              <label htmlFor="tender_cost" className="block text-sm font-medium text-gray-700 mb-2">
                Tender Cost
              </label>
              <input
                type="number"
                id="tender_cost"
                name="tender_cost"
                value={formData.tender_cost}
                onChange={handleInputChange}
                step="0.01"
                min="0"
                className="input w-full"
                placeholder="0.00"
              />
            </div>

            {/* EMD */}
            <div>
              <label htmlFor="emd" className="block text-sm font-medium text-gray-700 mb-2">
                EMD (Earnest Money Deposit)
              </label>
              <input
                type="number"
                id="emd"
                name="emd"
                value={formData.emd}
                onChange={handleInputChange}
                step="0.01"
                min="0"
                className="input w-full"
                placeholder="0.00"
              />
            </div>

            {/* BG */}
            <div>
              <label htmlFor="bg" className="block text-sm font-medium text-gray-700 mb-2">
                BG (Bank Guarantee)
              </label>
              <input
                type="number"
                id="bg"
                name="bg"
                value={formData.bg}
                onChange={handleInputChange}
                step="0.01"
                min="0"
                className="input w-full"
                placeholder="0.00"
              />
            </div>

            {/* Planned Budget */}
            <div>
              <label htmlFor="planned_budget" className="block text-sm font-medium text-gray-700 mb-2">
                Planned Budget
              </label>
              <input
                type="number"
                id="planned_budget"
                name="planned_budget"
                value={formData.planned_budget}
                onChange={handleInputChange}
                step="0.01"
                min="0"
                className="input w-full"
                placeholder="0.00"
              />
            </div>

            {/* Actual Budget */}
            <div>
              <label htmlFor="actual_budget" className="block text-sm font-medium text-gray-700 mb-2">
                Actual Budget
              </label>
              <input
                type="number"
                id="actual_budget"
                name="actual_budget"
                value={formData.actual_budget}
                onChange={handleInputChange}
                step="0.01"
                min="0"
                className="input w-full"
                placeholder="0.00"
              />
            </div>

            {/* Status */}
            <div>
              <SearchableDropdown
                label="Status"
                options={[
                  { value: 'PLANNED', label: 'Planned' },
                  { value: 'ACTIVE', label: 'Active' },
                  { value: 'ON_HOLD', label: 'On Hold' },
                  { value: 'COMPLETED', label: 'Completed' },
                  { value: 'CANCELLED', label: 'Cancelled' }
                ]}
                value={formData.status}
                onChange={(value) => setFormData(prev => ({ ...prev, status: value as any }))}
                placeholder="Select Status"
                searchPlaceholder="Search status..."
                className="w-full"
              />
            </div>

            {/* Subwork */}
            <div className="md:col-span-2">
              <label htmlFor="subwork" className="block text-sm font-medium text-gray-700 mb-2">
                Subwork Description
              </label>
              <textarea
                id="subwork"
                name="subwork"
                value={formData.subwork}
                onChange={handleInputChange}
                rows={3}
                className="input w-full"
                placeholder="Enter subwork description"
              />
            </div>

            {/* Project Owner */}
            <div className="md:col-span-2">
              <SearchableDropdown
                label="Project Owner"
                options={Array.isArray(users) ? users.map((user) => ({
                  value: user.user_id.toString(),
                  label: `${user.name} (${user.email})`,
                  searchText: `${user.name} ${user.email}`
                })) : []}
                value={formData.owner_user_id.toString()}
                onChange={(value) => setFormData(prev => ({ ...prev, owner_user_id: parseInt(value.toString()) }))}
                placeholder="Select a project owner"
                searchPlaceholder="Search users..."
                className="w-full"
                required
              />
            </div>
          </div>

          {/* Project Subcontractors Section */}
          <div className="border-t border-gray-200 pt-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">Project Subcontractors</h3>
              <button
                type="button"
                onClick={addSubcontractor}
                className="btn btn-secondary flex items-center"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Subcontractor
              </button>
            </div>

            {formData.subcontractors.length > 0 ? (
              <div className="space-y-4">
                {formData.subcontractors.map((subcontractor, index) => (
                  <div key={index} className="bg-gray-50 p-4 rounded-lg border">
                    <div className="flex justify-between items-center mb-4">
                      <h4 className="font-medium text-gray-900">Subcontractor {index + 1}</h4>
                      <button
                        type="button"
                        onClick={() => removeSubcontractor(index)}
                        className="text-red-600 hover:text-red-800"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {/* Company Name */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Company Name *
                        </label>
                        <input
                          type="text"
                          value={subcontractor.company_name}
                          onChange={(e) => updateSubcontractor(index, 'company_name', e.target.value)}
                          className="input w-full"
                          placeholder="Enter company name"
                          required
                        />
                      </div>

                      {/* Contact Person */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Contact Person
                        </label>
                        <input
                          type="text"
                          value={subcontractor.contact_person}
                          onChange={(e) => updateSubcontractor(index, 'contact_person', e.target.value)}
                          className="input w-full"
                          placeholder="Enter contact person name"
                        />
                      </div>

                      {/* Phone */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Phone
                        </label>
                        <input
                          type="tel"
                          value={subcontractor.phone}
                          onChange={(e) => updateSubcontractor(index, 'phone', e.target.value)}
                          className="input w-full"
                          placeholder="Enter phone number"
                        />
                      </div>

                      {/* Email */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Email
                        </label>
                        <input
                          type="email"
                          value={subcontractor.email}
                          onChange={(e) => updateSubcontractor(index, 'email', e.target.value)}
                          className="input w-full"
                          placeholder="Enter email address"
                        />
                      </div>

                      {/* Work Type */}
                      <div>
                        <SearchableDropdown
                          label="Work Type"
                          options={[
                            { value: 'Civil', label: 'Civil' },
                            { value: 'Electrical', label: 'Electrical' },
                            { value: 'Mechanical', label: 'Mechanical' },
                            { value: 'Plumbing', label: 'Plumbing' },
                            { value: 'HVAC', label: 'HVAC' },
                            { value: 'Structural', label: 'Structural' },
                            { value: 'Painting', label: 'Painting' },
                            { value: 'Flooring', label: 'Flooring' },
                            { value: 'Roofing', label: 'Roofing' },
                            { value: 'Other', label: 'Other' }
                          ]}
                          value={subcontractor.work_type}
                          onChange={(value) => updateSubcontractor(index, 'work_type', value.toString())}
                          placeholder="Select work type"
                          searchPlaceholder="Search work types..."
                          className="w-full"
                        />
                      </div>

                      {/* Status */}
                      <div>
                        <SearchableDropdown
                          label="Status"
                          options={[
                            { value: 'ACTIVE', label: 'Active' },
                            { value: 'INACTIVE', label: 'Inactive' },
                            { value: 'COMPLETED', label: 'Completed' },
                            { value: 'TERMINATED', label: 'Terminated' }
                          ]}
                          value={subcontractor.status}
                          onChange={(value) => updateSubcontractor(index, 'status', value.toString())}
                          placeholder="Select status"
                          searchPlaceholder="Search status..."
                          className="w-full"
                        />
                      </div>

                      {/* Contract Value */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Contract Value
                        </label>
                        <input
                          type="number"
                          value={subcontractor.contract_value}
                          onChange={(e) => updateSubcontractor(index, 'contract_value', e.target.value)}
                          step="0.01"
                          min="0"
                          className="input w-full"
                          placeholder="0.00"
                        />
                      </div>

                      {/* Start Date */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Start Date
                        </label>
                        <input
                          type="date"
                          value={subcontractor.start_date}
                          onChange={(e) => updateSubcontractor(index, 'start_date', e.target.value)}
                          className="input w-full"
                        />
                      </div>

                      {/* End Date */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          End Date
                        </label>
                        <input
                          type="date"
                          value={subcontractor.end_date}
                          onChange={(e) => updateSubcontractor(index, 'end_date', e.target.value)}
                          className="input w-full"
                        />
                      </div>

                      {/* GST Number */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          GST Number
                        </label>
                        <input
                          type="text"
                          value={subcontractor.gst_number}
                          onChange={(e) => updateSubcontractor(index, 'gst_number', e.target.value)}
                          className="input w-full"
                          placeholder="Enter GST number"
                        />
                      </div>

                      {/* PAN Number */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          PAN Number
                        </label>
                        <input
                          type="text"
                          value={subcontractor.pan_number}
                          onChange={(e) => updateSubcontractor(index, 'pan_number', e.target.value)}
                          className="input w-full"
                          placeholder="Enter PAN number"
                        />
                      </div>

                      {/* Address */}
                      <div className="md:col-span-2 lg:col-span-3">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Address
                        </label>
                        <textarea
                          value={subcontractor.address}
                          onChange={(e) => updateSubcontractor(index, 'address', e.target.value)}
                          rows={2}
                          className="input w-full"
                          placeholder="Enter company address"
                        />
                      </div>

                      {/* Notes */}
                      <div className="md:col-span-2 lg:col-span-3">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Notes
                        </label>
                        <textarea
                          value={subcontractor.notes}
                          onChange={(e) => updateSubcontractor(index, 'notes', e.target.value)}
                          rows={2}
                          className="input w-full"
                          placeholder="Enter additional notes"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <p>No subcontractors added yet. Click "Add Subcontractor" to get started.</p>
              </div>
            )}
          </div>

          {/* Project Components Section */}
          <div className="border-t border-gray-200 pt-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">Project Components</h3>
              <button
                type="button"
                onClick={addComponent}
                className="btn btn-secondary flex items-center"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Component
              </button>
            </div>

            {formData.components.length > 0 ? (
              <div className="space-y-4">
                {formData.components.map((component, index) => (
                  <div key={index} className="bg-gray-50 p-4 rounded-lg border">
                    <div className="flex justify-between items-center mb-4">
                      <h4 className="font-medium text-gray-900">Component {index + 1}</h4>
                      <button
                        type="button"
                        onClick={() => removeComponent(index)}
                        className="text-red-600 hover:text-red-800"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {/* Component Name */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Component Name *
                        </label>
                        <input
                          type="text"
                          value={component.component_name}
                          onChange={(e) => updateComponent(index, 'component_name', e.target.value)}
                          className="input w-full"
                          placeholder="Enter component name"
                          required
                        />
                      </div>

                      {/* Component Type */}
                      <div>
                        <SearchableDropdown
                          label="Component Type"
                          options={[
                            { value: 'Civil', label: 'Civil' },
                            { value: 'Electrical', label: 'Electrical' },
                            { value: 'Mechanical', label: 'Mechanical' },
                            { value: 'Plumbing', label: 'Plumbing' },
                            { value: 'HVAC', label: 'HVAC' },
                            { value: 'Structural', label: 'Structural' },
                            { value: 'Other', label: 'Other' }
                          ]}
                          value={component.component_type}
                          onChange={(value) => updateComponent(index, 'component_type', value.toString())}
                          placeholder="Select type"
                          searchPlaceholder="Search types..."
                          className="w-full"
                        />
                      </div>

                      {/* Component Status */}
                      <div>
                        <SearchableDropdown
                          label="Status"
                          options={[
                            { value: 'PLANNED', label: 'Planned' },
                            { value: 'IN_PROGRESS', label: 'In Progress' },
                            { value: 'COMPLETED', label: 'Completed' },
                            { value: 'ON_HOLD', label: 'On Hold' },
                            { value: 'CANCELLED', label: 'Cancelled' }
                          ]}
                          value={component.status}
                          onChange={(value) => updateComponent(index, 'status', value.toString())}
                          placeholder="Select status"
                          searchPlaceholder="Search status..."
                          className="w-full"
                        />
                      </div>

                      {/* Estimated Cost */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Estimated Cost
                        </label>
                        <input
                          type="number"
                          value={component.estimated_cost}
                          onChange={(e) => updateComponent(index, 'estimated_cost', e.target.value)}
                          step="0.01"
                          min="0"
                          className="input w-full"
                          placeholder="0.00"
                        />
                      </div>

                      {/* Actual Cost */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Actual Cost
                        </label>
                        <input
                          type="number"
                          value={component.actual_cost}
                          onChange={(e) => updateComponent(index, 'actual_cost', e.target.value)}
                          step="0.01"
                          min="0"
                          className="input w-full"
                          placeholder="0.00"
                        />
                      </div>

                      {/* Start Date */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Start Date
                        </label>
                        <input
                          type="date"
                          value={component.start_date}
                          onChange={(e) => updateComponent(index, 'start_date', e.target.value)}
                          className="input w-full"
                        />
                      </div>

                      {/* End Date */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          End Date
                        </label>
                        <input
                          type="date"
                          value={component.end_date}
                          onChange={(e) => updateComponent(index, 'end_date', e.target.value)}
                          className="input w-full"
                        />
                      </div>

                      {/* Component Description */}
                      <div className="md:col-span-2 lg:col-span-3">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Description
                        </label>
                        <textarea
                          value={component.component_description}
                          onChange={(e) => updateComponent(index, 'component_description', e.target.value)}
                          rows={2}
                          className="input w-full"
                          placeholder="Enter component description"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <p>No components added yet. Click "Add Component" to get started.</p>
              </div>
            )}
          </div>

          {/* Form Actions */}
          <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={handleCancel}
              className="btn btn-secondary flex items-center"
              disabled={loading}
            >
              <X className="h-4 w-4 mr-2" />
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary flex items-center"
              disabled={loading}
            >
              <Save className="h-4 w-4 mr-2" />
              {loading ? 'Creating...' : 'Create Project'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default NewProject;
