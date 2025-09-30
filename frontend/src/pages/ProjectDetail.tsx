import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { projectsAPI, usersAPI, subcontractorsAPI } from '../services/api';
import { Edit, Calendar, DollarSign, User, AlertCircle, CheckCircle, Clock, FileText, Users, TrendingUp, Save, X, Plus, Trash2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';

interface ProjectComponent {
  component_id: number;
  component_name: string;
  component_description: string;
  component_type: string;
  estimated_cost: number;
  actual_cost: number;
  start_date: string;
  end_date: string;
  status: 'PLANNED' | 'IN_PROGRESS' | 'COMPLETED' | 'ON_HOLD' | 'CANCELLED';
}

interface ProjectSubcontractor {
  subcontractor_id: number;
  company_name: string;
  contact_person: string;
  phone: string;
  email: string;
  address: string;
  gst_number: string;
  pan_number: string;
  work_type: string;
  contract_value: number;
  start_date: string;
  end_date: string;
  status: 'ACTIVE' | 'INACTIVE' | 'COMPLETED' | 'TERMINATED';
  notes: string;
  created_at: string;
  updated_at: string;
}

interface Project {
  project_id: number;
  name: string;
  description: string;
  start_date: string;
  end_date: string;
  budget: number;
  tender_cost?: number;
  emd?: number;
  bg?: number;
  planned_budget?: number;
  actual_budget?: number;
  subwork?: string;
  status: 'PLANNED' | 'ACTIVE' | 'ON_HOLD' | 'COMPLETED' | 'CANCELLED';
  owner: {
    user_id: number;
    name: string;
    email: string;
  };
  components?: ProjectComponent[];
  subcontractors?: ProjectSubcontractor[];
  tasks: Array<{
    task_id: number;
    title: string;
    status: string;
    assignedUser?: {
      user_id: number;
      name: string;
    };
  }>;
  issues: Array<{
    issue_id: number;
    description: string;
    status: string;
    priority: string;
  }>;
  documents: Array<{
    document_id: number;
    file_name: string;
    upload_date: string;
  }>;
  created_at: string;
  updated_at: string;
}

interface ProjectStats {
  project: {
    id: number;
    name: string;
    status: string;
    budget: number;
  };
  tasks: Array<{
    status: string;
    count: number;
  }>;
  issues: Array<{
    status: string;
    count: number;
  }>;
  materialCost: number;
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
  components: ProjectComponent[];
  subcontractors: ProjectSubcontractor[];
}

const ProjectDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
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
    components: [],
    subcontractors: [],
  });

  // Check if user is admin or project manager
  const isAdminOrManager = () => {
    if (!user?.role) return false;
    
    // Handle old string format
    if (typeof user.role === 'string') {
      return user.role === 'OWNER' || user.role === 'PROJECT_MANAGER';
    }
    
    // Handle new object format
    if (typeof user.role === 'object') {
      return user.role.name === 'Admin' || user.role.name === 'Project Manager' || user.role.name === 'Inventory Manager';
    }
    
    return false;
  };

  // Fetch project details
  const { data: projectData, isLoading: projectLoading, error: projectError } = useQuery(
    ['project', id],
    () => projectsAPI.getProject(Number(id)),
    {
      enabled: !!id,
      onSuccess: (data) => {
        if (data?.data?.project) {
          const project = data.data.project;
          setFormData({
            name: project.name || '',
            description: project.description || '',
            start_date: project.start_date || '',
            end_date: project.end_date || '',
            budget: project.budget?.toString() || '',
            tender_cost: project.tender_cost?.toString() || '',
            emd: project.emd?.toString() || '',
            bg: project.bg?.toString() || '',
            planned_budget: project.planned_budget?.toString() || '',
            actual_budget: project.actual_budget?.toString() || '',
            subwork: project.subwork || '',
            status: project.status || 'PLANNED',
            components: (project.components || []).map(comp => ({
              ...comp,
              component_name: comp.component_name || '',
              component_description: comp.component_description || '',
              component_type: comp.component_type || '',
              start_date: comp.start_date || '',
              end_date: comp.end_date || '',
            })),
            subcontractors: (project.subcontractors || []).map(sub => ({
              ...sub,
              company_name: sub.company_name || '',
              contact_person: sub.contact_person || '',
              phone: sub.phone || '',
              email: sub.email || '',
              address: sub.address || '',
              gst_number: sub.gst_number || '',
              pan_number: sub.pan_number || '',
              work_type: sub.work_type || '',
              start_date: sub.start_date || '',
              end_date: sub.end_date || '',
              notes: sub.notes || '',
            })),
          });
        }
      },
      onError: (error: any) => {
        toast.error(error.response?.data?.message || 'Failed to fetch project details');
      }
    }
  );

  // Fetch project statistics
  const { data: statsData, isLoading: statsLoading } = useQuery(
    ['projectStats', id],
    () => projectsAPI.getProjectStats(Number(id)),
    {
      enabled: !!id,
      onError: (error: any) => {
        console.error('Failed to fetch project stats:', error);
      }
    }
  );

  const project: Project | undefined = projectData?.data?.project;
  const stats: ProjectStats | undefined = statsData?.data;
  const subcontractors: ProjectSubcontractor[] = project?.subcontractors || [];

  // Update project mutation
  const updateProjectMutation = useMutation(
    (data: any) => projectsAPI.updateProject(Number(id), data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['project', id]);
        queryClient.invalidateQueries(['projectStats', id]);
        queryClient.invalidateQueries(['projects']); // Invalidate projects list
        setIsEditing(false);
        toast.success('Project updated successfully!');
        
        // Dispatch custom event to notify other components
        window.dispatchEvent(new CustomEvent('projectUpdated'));
      },
      onError: (error: any) => {
        toast.error(error.response?.data?.message || 'Failed to update project');
      }
    }
  );

  // Handle input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Handle component updates
  const addComponent = () => {
    const newComponent: ProjectComponent = {
      component_id: 0, // Will be set by backend
      component_name: '',
      component_description: '',
      component_type: '',
      estimated_cost: 0,
      actual_cost: 0,
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

  const updateComponent = (index: number, field: keyof ProjectComponent, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      components: prev.components.map((comp, i) => 
        i === index ? { ...comp, [field]: value } : comp
      )
    }));
  };

  // Handle subcontractor updates
  const addSubcontractor = () => {
    const newSubcontractor: ProjectSubcontractor = {
      subcontractor_id: 0, // Will be set by backend
      company_name: '',
      contact_person: '',
      phone: '',
      email: '',
      address: '',
      gst_number: '',
      pan_number: '',
      work_type: '',
      contract_value: 0,
      start_date: '',
      end_date: '',
      status: 'ACTIVE',
      notes: '',
      created_at: '',
      updated_at: '',
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

  const updateSubcontractor = (index: number, field: keyof ProjectSubcontractor, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      subcontractors: prev.subcontractors.map((sub, i) => 
        i === index ? { ...sub, [field]: value } : sub
      )
    }));
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      toast.error('Project name is required');
      return;
    }

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
        estimated_cost: comp.estimated_cost || null,
        actual_cost: comp.actual_cost || null,
      })),
      subcontractors: formData.subcontractors.map(sub => ({
        ...sub,
        contract_value: sub.contract_value || null,
        start_date: sub.start_date && sub.start_date !== '' ? sub.start_date : null,
        end_date: sub.end_date && sub.end_date !== '' ? sub.end_date : null,
      })),
    };

    updateProjectMutation.mutate(projectData);
  };

  // Handle cancel edit
  const handleCancelEdit = () => {
    if (project) {
      setFormData({
        name: project.name || '',
        description: project.description || '',
        start_date: project.start_date || '',
        end_date: project.end_date || '',
        budget: project.budget?.toString() || '',
        tender_cost: project.tender_cost?.toString() || '',
        emd: project.emd?.toString() || '',
        bg: project.bg?.toString() || '',
        planned_budget: project.planned_budget?.toString() || '',
        actual_budget: project.actual_budget?.toString() || '',
        subwork: project.subwork || '',
        status: project.status || 'PLANNED',
        components: (project.components || []).map(comp => ({
          ...comp,
          component_name: comp.component_name || '',
          component_description: comp.component_description || '',
          component_type: comp.component_type || '',
          start_date: comp.start_date || '',
          end_date: comp.end_date || '',
        })),
        subcontractors: (project.subcontractors || []).map(sub => ({
          ...sub,
          company_name: sub.company_name || '',
          contact_person: sub.contact_person || '',
          phone: sub.phone || '',
          email: sub.email || '',
          address: sub.address || '',
          gst_number: sub.gst_number || '',
          pan_number: sub.pan_number || '',
          work_type: sub.work_type || '',
          start_date: sub.start_date || '',
          end_date: sub.end_date || '',
          notes: sub.notes || '',
        })),
      });
    }
    setIsEditing(false);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE': return 'text-green-600 bg-green-100';
      case 'COMPLETED': return 'text-blue-600 bg-blue-100';
      case 'ON_HOLD': return 'text-yellow-600 bg-yellow-100';
      case 'CANCELLED': return 'text-red-600 bg-red-100';
      case 'PLANNED': return 'text-gray-600 bg-gray-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'CRITICAL': return 'text-red-600 bg-red-100';
      case 'HIGH': return 'text-orange-600 bg-orange-100';
      case 'MEDIUM': return 'text-yellow-600 bg-yellow-100';
      case 'LOW': return 'text-green-600 bg-green-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (projectLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="h-64 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (projectError || !project) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-gray-900">Project Not Found</h1>
        <div className="card p-6">
          <div className="text-center py-12">
            <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Project Not Found</h3>
            <p className="text-gray-600 mb-4">The project you're looking for doesn't exist or you don't have access to it.</p>
            <button 
              onClick={() => navigate('/projects')}
              className="btn btn-primary"
            >
              Back to Projects
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">PROJECT OVERVIEW</h1>
        {isAdminOrManager() && (
          <div className="flex space-x-2">
            {isEditing ? (
              <>
                <button 
                  onClick={handleCancelEdit}
                  className="btn btn-secondary flex items-center"
                  disabled={updateProjectMutation.isLoading}
                >
                  <X className="h-4 w-4 mr-2" />
                  Cancel
                </button>
                <button 
                  onClick={handleSubmit}
                  className="btn btn-primary flex items-center"
                  disabled={updateProjectMutation.isLoading}
                >
                  <Save className="h-4 w-4 mr-2" />
                  {updateProjectMutation.isLoading ? 'Saving...' : 'Save Changes'}
                </button>
              </>
            ) : (
              <button 
                onClick={() => setIsEditing(true)}
                className="btn btn-outline-primary flex items-center"
              >
                <Edit className="h-4 w-4 mr-2" />
                EDIT
              </button>
            )}
          </div>
        )}
      </div>

      {/* Main Project Card */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Project Image Placeholder */}
          <div className="lg:w-1/3">
            <div className="bg-gray-100 rounded-lg h-48 flex items-center justify-center">
              <div className="text-center">
                <div className="w-16 h-16 bg-gray-300 rounded-lg mx-auto mb-2 flex items-center justify-center">
                  <FileText className="h-8 w-8 text-gray-500" />
                </div>
                <p className="text-gray-500 text-sm">No Image</p>
              </div>
            </div>
          </div>

          {/* Project Details */}
          <div className="lg:w-2/3 space-y-6">
            {/* Project Name */}
            <div>
              <label className="text-sm font-medium text-gray-500 uppercase tracking-wide">PROJECT NAME</label>
              {isEditing ? (
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  className="input w-full mt-1 text-2xl font-bold"
                  required
                />
              ) : (
                <p className="text-2xl font-bold text-gray-900 mt-1">{project.name}</p>
              )}
            </div>

            {/* Project Details Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Status */}
              <div>
                <label className="text-sm font-medium text-gray-500 uppercase tracking-wide">STATUS</label>
                <div className="mt-1">
                  {isEditing ? (
                    <select
                      name="status"
                      value={formData.status}
                      onChange={handleInputChange}
                      className="input w-full"
                    >
                      <option value="PLANNED">Planned</option>
                      <option value="ACTIVE">Active</option>
                      <option value="ON_HOLD">On Hold</option>
                      <option value="COMPLETED">Completed</option>
                      <option value="CANCELLED">Cancelled</option>
                    </select>
                  ) : (
                    <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(project.status)}`}>
                      {project.status.replace('_', ' ')}
                    </span>
                  )}
                </div>
              </div>

              {/* Budget */}
              <div>
                <label className="text-sm font-medium text-gray-500 uppercase tracking-wide">BUDGET</label>
                {isEditing ? (
                  <input
                    type="number"
                    name="budget"
                    value={formData.budget}
                    onChange={handleInputChange}
                    step="0.01"
                    min="0"
                    className="input w-full mt-1"
                    placeholder="0.00"
                  />
                ) : (
                  <p className="text-lg font-semibold text-gray-900 mt-1">
                    {project.budget ? formatCurrency(project.budget) : '-'}
                  </p>
                )}
              </div>

              {/* Tender Cost */}
              <div>
                <label className="text-sm font-medium text-gray-500 uppercase tracking-wide">TENDER COST</label>
                {isEditing ? (
                  <input
                    type="number"
                    name="tender_cost"
                    value={formData.tender_cost}
                    onChange={handleInputChange}
                    step="0.01"
                    min="0"
                    className="input w-full mt-1"
                    placeholder="0.00"
                  />
                ) : (
                  <p className="text-lg font-semibold text-gray-900 mt-1">
                    {project.tender_cost ? formatCurrency(project.tender_cost) : '-'}
                  </p>
                )}
              </div>

              {/* EMD */}
              <div>
                <label className="text-sm font-medium text-gray-500 uppercase tracking-wide">EMD</label>
                {isEditing ? (
                  <input
                    type="number"
                    name="emd"
                    value={formData.emd}
                    onChange={handleInputChange}
                    step="0.01"
                    min="0"
                    className="input w-full mt-1"
                    placeholder="0.00"
                  />
                ) : (
                  <p className="text-lg font-semibold text-gray-900 mt-1">
                    {project.emd ? formatCurrency(project.emd) : '-'}
                  </p>
                )}
              </div>

              {/* BG */}
              <div>
                <label className="text-sm font-medium text-gray-500 uppercase tracking-wide">BANK GUARANTEE</label>
                {isEditing ? (
                  <input
                    type="number"
                    name="bg"
                    value={formData.bg}
                    onChange={handleInputChange}
                    step="0.01"
                    min="0"
                    className="input w-full mt-1"
                    placeholder="0.00"
                  />
                ) : (
                  <p className="text-lg font-semibold text-gray-900 mt-1">
                    {project.bg ? formatCurrency(project.bg) : '-'}
                  </p>
                )}
              </div>

              {/* Planned Budget */}
              <div>
                <label className="text-sm font-medium text-gray-500 uppercase tracking-wide">PLANNED BUDGET</label>
                {isEditing ? (
                  <input
                    type="number"
                    name="planned_budget"
                    value={formData.planned_budget}
                    onChange={handleInputChange}
                    step="0.01"
                    min="0"
                    className="input w-full mt-1"
                    placeholder="0.00"
                  />
                ) : (
                  <p className="text-lg font-semibold text-gray-900 mt-1">
                    {project.planned_budget ? formatCurrency(project.planned_budget) : '-'}
                  </p>
                )}
              </div>

              {/* Actual Budget */}
              <div>
                <label className="text-sm font-medium text-gray-500 uppercase tracking-wide">ACTUAL BUDGET</label>
                {isEditing ? (
                  <input
                    type="number"
                    name="actual_budget"
                    value={formData.actual_budget}
                    onChange={handleInputChange}
                    step="0.01"
                    min="0"
                    className="input w-full mt-1"
                    placeholder="0.00"
                  />
                ) : (
                  <p className="text-lg font-semibold text-gray-900 mt-1">
                    {project.actual_budget ? formatCurrency(project.actual_budget) : '-'}
                  </p>
                )}
              </div>

              {/* Owner */}
              <div>
                <label className="text-sm font-medium text-gray-500 uppercase tracking-wide">PROJECT OWNER</label>
                <p className="text-lg font-semibold text-gray-900 mt-1">{project.owner.name}</p>
                <p className="text-sm text-gray-500">{project.owner.email}</p>
              </div>

              {/* Start Date */}
              <div>
                <label className="text-sm font-medium text-gray-500 uppercase tracking-wide">START DATE</label>
                {isEditing ? (
                  <input
                    type="date"
                    name="start_date"
                    value={formData.start_date}
                    onChange={handleInputChange}
                    className="input w-full mt-1"
                  />
                ) : (
                  <p className="text-lg font-semibold text-gray-900 mt-1">{formatDate(project.start_date)}</p>
                )}
              </div>

              {/* End Date */}
              <div>
                <label className="text-sm font-medium text-gray-500 uppercase tracking-wide">END DATE</label>
                {isEditing ? (
                  <input
                    type="date"
                    name="end_date"
                    value={formData.end_date}
                    onChange={handleInputChange}
                    className="input w-full mt-1"
                  />
                ) : (
                  <p className="text-lg font-semibold text-gray-900 mt-1">{formatDate(project.end_date)}</p>
                )}
              </div>

              {/* Created Date */}
              <div>
                <label className="text-sm font-medium text-gray-500 uppercase tracking-wide">CREATED</label>
                <p className="text-lg font-semibold text-gray-900 mt-1">{formatDate(project.created_at)}</p>
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="text-sm font-medium text-gray-500 uppercase tracking-wide">DESCRIPTION</label>
              {isEditing ? (
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  rows={4}
                  className="input w-full mt-1"
                  placeholder="Enter project description"
                />
              ) : (
                <p className="text-gray-900 mt-1">{project.description || '-'}</p>
              )}
            </div>

            {/* Subwork */}
            <div>
              <label className="text-sm font-medium text-gray-500 uppercase tracking-wide">SUBWORK</label>
              {isEditing ? (
                <textarea
                  name="subwork"
                  value={formData.subwork}
                  onChange={handleInputChange}
                  rows={3}
                  className="input w-full mt-1"
                  placeholder="Enter subwork description"
                />
              ) : (
                <p className="text-gray-900 mt-1">{project.subwork || '-'}</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Statistics Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Tasks Summary */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <CheckCircle className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">TOTAL TASKS</p>
                <p className="text-2xl font-bold text-gray-900">
                  {stats.tasks.reduce((sum, task) => sum + task.count, 0)}
                </p>
              </div>
            </div>
            <div className="mt-4 space-y-2">
              {stats.tasks.map((task) => (
                <div key={task.status} className="flex justify-between text-sm">
                  <span className="text-gray-600">{task.status.replace('_', ' ')}</span>
                  <span className="font-medium">{task.count}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Issues Summary */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-center">
              <div className="p-2 bg-red-100 rounded-lg">
                <AlertCircle className="h-6 w-6 text-red-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">TOTAL ISSUES</p>
                <p className="text-2xl font-bold text-gray-900">
                  {stats.issues.reduce((sum, issue) => sum + issue.count, 0)}
                </p>
              </div>
            </div>
            <div className="mt-4 space-y-2">
              {stats.issues.map((issue) => (
                <div key={issue.status} className="flex justify-between text-sm">
                  <span className="text-gray-600">{issue.status.replace('_', ' ')}</span>
                  <span className="font-medium">{issue.count}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Material Cost */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <DollarSign className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">MATERIAL COST</p>
                <p className="text-2xl font-bold text-gray-900">{formatCurrency(stats.materialCost)}</p>
              </div>
            </div>
          </div>

          {/* Documents Count */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 rounded-lg">
                <FileText className="h-6 w-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">DOCUMENTS</p>
                <p className="text-2xl font-bold text-gray-900">{project.documents.length}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Project Components */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Project Components</h3>
          {isEditing && (
            <button
              onClick={addComponent}
              className="btn btn-secondary flex items-center"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Component
            </button>
          )}
        </div>
        
        {isEditing ? (
          <div className="space-y-4">
            {formData.components.map((component, index) => (
              <div key={index} className="bg-gray-50 p-4 rounded-lg border">
                <div className="flex justify-between items-center mb-4">
                  <h4 className="font-medium text-gray-900">Component {index + 1}</h4>
                  <button
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
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Component Type
                    </label>
                    <select
                      value={component.component_type}
                      onChange={(e) => updateComponent(index, 'component_type', e.target.value)}
                      className="input w-full"
                    >
                      <option value="">Select type</option>
                      <option value="Civil">Civil</option>
                      <option value="Electrical">Electrical</option>
                      <option value="Mechanical">Mechanical</option>
                      <option value="Plumbing">Plumbing</option>
                      <option value="HVAC">HVAC</option>
                      <option value="Structural">Structural</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>

                  {/* Component Status */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Status
                    </label>
                    <select
                      value={component.status}
                      onChange={(e) => updateComponent(index, 'status', e.target.value)}
                      className="input w-full"
                    >
                      <option value="PLANNED">Planned</option>
                      <option value="IN_PROGRESS">In Progress</option>
                      <option value="COMPLETED">Completed</option>
                      <option value="ON_HOLD">On Hold</option>
                      <option value="CANCELLED">Cancelled</option>
                    </select>
                  </div>

                  {/* Estimated Cost */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Estimated Cost
                    </label>
                    <input
                      type="number"
                      value={component.estimated_cost}
                      onChange={(e) => updateComponent(index, 'estimated_cost', parseFloat(e.target.value) || 0)}
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
                      onChange={(e) => updateComponent(index, 'actual_cost', parseFloat(e.target.value) || 0)}
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
            
            {formData.components.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <p>No components added yet. Click "Add Component" to get started.</p>
              </div>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {project.components && project.components.length > 0 ? (
              project.components.map((component) => (
                <div key={component.component_id} className="bg-gray-50 p-4 rounded-lg border">
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-medium text-gray-900">{component.component_name}</h4>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(component.status)}`}>
                      {component.status.replace('_', ' ')}
                    </span>
                  </div>
                  {component.component_type && (
                    <p className="text-sm text-gray-600 mb-2">Type: {component.component_type}</p>
                  )}
                  {component.component_description && (
                    <p className="text-sm text-gray-600 mb-2">{component.component_description}</p>
                  )}
                  <div className="space-y-1 text-sm">
                    {component.estimated_cost && (
                      <p className="text-gray-600">Estimated: {formatCurrency(component.estimated_cost)}</p>
                    )}
                    {component.actual_cost && (
                      <p className="text-gray-600">Actual: {formatCurrency(component.actual_cost)}</p>
                    )}
                    {component.start_date && (
                      <p className="text-gray-600">Start: {formatDate(component.start_date)}</p>
                    )}
                    {component.end_date && (
                      <p className="text-gray-600">End: {formatDate(component.end_date)}</p>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="col-span-full text-center py-8 text-gray-500">
                <p>No components found for this project.</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Project Subcontractors */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Project Subcontractors</h3>
          {isEditing && isAdminOrManager() && (
            <button
              onClick={addSubcontractor}
              className="btn btn-secondary flex items-center"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Subcontractor
            </button>
          )}
        </div>
        
        {isEditing ? (
          <div className="space-y-4">
            {formData.subcontractors.map((subcontractor, index) => (
              <div key={index} className="bg-gray-50 p-4 rounded-lg border">
                <div className="flex justify-between items-center mb-4">
                  <h4 className="font-medium text-gray-900">Subcontractor {index + 1}</h4>
                  <button
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
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Work Type
                    </label>
                    <select
                      value={subcontractor.work_type}
                      onChange={(e) => updateSubcontractor(index, 'work_type', e.target.value)}
                      className="input w-full"
                    >
                      <option value="">Select work type</option>
                      <option value="Civil">Civil</option>
                      <option value="Electrical">Electrical</option>
                      <option value="Mechanical">Mechanical</option>
                      <option value="Plumbing">Plumbing</option>
                      <option value="HVAC">HVAC</option>
                      <option value="Structural">Structural</option>
                      <option value="Painting">Painting</option>
                      <option value="Flooring">Flooring</option>
                      <option value="Roofing">Roofing</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>

                  {/* Status */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Status
                    </label>
                    <select
                      value={subcontractor.status}
                      onChange={(e) => updateSubcontractor(index, 'status', e.target.value)}
                      className="input w-full"
                    >
                      <option value="ACTIVE">Active</option>
                      <option value="INACTIVE">Inactive</option>
                      <option value="COMPLETED">Completed</option>
                      <option value="TERMINATED">Terminated</option>
                    </select>
                  </div>

                  {/* Contract Value */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Contract Value
                    </label>
                    <input
                      type="number"
                      value={subcontractor.contract_value}
                      onChange={(e) => updateSubcontractor(index, 'contract_value', parseFloat(e.target.value) || 0)}
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
            
            {formData.subcontractors.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <p>No subcontractors added yet. Click "Add Subcontractor" to get started.</p>
              </div>
            )}
          </div>
        ) : (
          <div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {subcontractors.length > 0 ? (
                  subcontractors.map((subcontractor) => (
                    <div key={subcontractor.subcontractor_id} className="bg-white p-6 rounded-lg border shadow-sm">
                      {/* Header */}
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h4 className="text-lg font-semibold text-gray-900">{subcontractor.company_name}</h4>
                          {subcontractor.work_type && (
                            <p className="text-sm text-blue-600 font-medium">{subcontractor.work_type}</p>
                          )}
                        </div>
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(subcontractor.status)}`}>
                          {subcontractor.status.replace('_', ' ')}
                        </span>
                      </div>

                      {/* Contact Information */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div>
                          <h5 className="text-sm font-medium text-gray-700 mb-2">Contact Information</h5>
                          <div className="space-y-1 text-sm text-gray-600">
                            {subcontractor.contact_person && (
                              <p><span className="font-medium">Contact Person:</span> {subcontractor.contact_person}</p>
                            )}
                            {subcontractor.phone && (
                              <p><span className="font-medium">Phone:</span> {subcontractor.phone}</p>
                            )}
                            {subcontractor.email && (
                              <p><span className="font-medium">Email:</span> {subcontractor.email}</p>
                            )}
                          </div>
                        </div>

                        {/* Contract Details */}
                        <div>
                          <h5 className="text-sm font-medium text-gray-700 mb-2">Contract Details</h5>
                          <div className="space-y-1 text-sm text-gray-600">
                            {subcontractor.contract_value && (
                              <p><span className="font-medium">Contract Value:</span> {formatCurrency(subcontractor.contract_value)}</p>
                            )}
                            {subcontractor.start_date && (
                              <p><span className="font-medium">Start Date:</span> {formatDate(subcontractor.start_date)}</p>
                            )}
                            {subcontractor.end_date && (
                              <p><span className="font-medium">End Date:</span> {formatDate(subcontractor.end_date)}</p>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Tax Information */}
                      {(subcontractor.gst_number || subcontractor.pan_number) && (
                        <div className="mb-4">
                          <h5 className="text-sm font-medium text-gray-700 mb-2">Tax Information</h5>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
                            {subcontractor.gst_number && (
                              <p><span className="font-medium">GST Number:</span> {subcontractor.gst_number}</p>
                            )}
                            {subcontractor.pan_number && (
                              <p><span className="font-medium">PAN Number:</span> {subcontractor.pan_number}</p>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Address */}
                      {subcontractor.address && (
                        <div className="mb-4">
                          <h5 className="text-sm font-medium text-gray-700 mb-2">Address</h5>
                          <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded border">{subcontractor.address}</p>
                        </div>
                      )}

                      {/* Notes */}
                      {subcontractor.notes && (
                        <div>
                          <h5 className="text-sm font-medium text-gray-700 mb-2">Notes</h5>
                          <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded border">{subcontractor.notes}</p>
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="col-span-full text-center py-8 text-gray-500">
                    <p>No subcontractors found for this project.</p>
                  </div>
                )}
            </div>
          </div>
        )}
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Tasks */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Tasks</h3>
          {project.tasks.length > 0 ? (
            <div className="space-y-3">
              {project.tasks.slice(0, 5).map((task) => (
                <div key={task.task_id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900">{task.title}</p>
                    {task.assignedUser && (
                      <p className="text-sm text-gray-500">Assigned to: {task.assignedUser.name}</p>
                    )}
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(task.status)}`}>
                    {task.status.replace('_', ' ')}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-4">No tasks found</p>
          )}
        </div>

        {/* Recent Issues */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Issues</h3>
          {project.issues.length > 0 ? (
            <div className="space-y-3">
              {project.issues.slice(0, 5).map((issue) => (
                <div key={issue.issue_id} className="p-3 bg-gray-50 rounded-lg">
                  <p className="font-medium text-gray-900 mb-1">{issue.description}</p>
                  <div className="flex items-center justify-between">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(issue.status)}`}>
                      {issue.status.replace('_', ' ')}
                    </span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(issue.priority)}`}>
                      {issue.priority}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-4">No issues found</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProjectDetail;
