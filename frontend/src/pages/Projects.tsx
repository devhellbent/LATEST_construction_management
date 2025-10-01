import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from 'react-query';
import { projectsAPI } from '../services/api';
import { FolderOpen, Plus, Calendar, DollarSign, User, AlertCircle, Clock, Mail, Eye } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';

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
  created_at: string;
}

const Projects: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

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

  const { data: projectsData, isLoading, error } = useQuery(
    ['projects', { search: searchTerm, status: statusFilter }],
    () => {
      const params: any = {};
      if (searchTerm.trim()) params.search = searchTerm.trim();
      if (statusFilter) params.status = statusFilter;
      console.log('Fetching projects with params:', params);
      return projectsAPI.getProjects(params);
    },
    {
      onError: (error: any) => {
        toast.error(error.response?.data?.message || 'Failed to fetch projects');
      }
    }
  );

  // Listen for project updates and refresh the list
  React.useEffect(() => {
    const handleProjectUpdate = () => {
      queryClient.invalidateQueries(['projects']);
    };

    // Listen for custom events from other components
    window.addEventListener('projectUpdated', handleProjectUpdate);
    window.addEventListener('projectCreated', handleProjectUpdate);

    return () => {
      window.removeEventListener('projectUpdated', handleProjectUpdate);
      window.removeEventListener('projectCreated', handleProjectUpdate);
    };
  }, [queryClient]);

  const projects: Project[] = projectsData?.data?.projects || [];

  const handleNewProject = () => {
    navigate('/projects/new');
  };

  const handleViewDetails = (projectId: number) => {
    navigate(`/projects/${projectId}`);
  };

  // Refresh projects list when returning from detail page
  React.useEffect(() => {
    const handleFocus = () => {
      queryClient.invalidateQueries(['projects']);
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [queryClient]);


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

  const formatCurrency = (amount: number) => {
    if (!amount) return '-';
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

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-900">Projects</h1>
          <button className="btn btn-primary flex items-center" disabled>
            <Plus className="h-5 w-5 mr-2" />
            New Project
          </button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-lg shadow-sm border p-6 animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-1/2 mb-4"></div>
              <div className="h-3 bg-gray-200 rounded w-full mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-2/3"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-responsive">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-responsive-3xl font-bold text-slate-900">Projects</h1>
          <p className="text-responsive-base text-slate-600 mt-2">Manage and track your construction projects</p>
        </div>
        {isAdminOrManager() && (
          <button 
            onClick={handleNewProject}
            className="btn btn-primary btn-lg flex items-center shadow-lg hover:shadow-xl transition-all duration-200"
          >
            <Plus className="h-5 w-5 mr-2" />
            New Project
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="card-mobile">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
          <div>
            <label className="label">Search Projects</label>
            <input
              type="text"
              placeholder="Search by name or description..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input"
            />
          </div>
          <div>
            <label className="label">Filter by Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="input"
            >
              <option value="">All Statuses</option>
              <option value="PLANNED">Planned</option>
              <option value="ACTIVE">Active</option>
              <option value="ON_HOLD">On Hold</option>
              <option value="COMPLETED">Completed</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>
        </div>
      </div>
      
      {/* Projects Grid */}
      {projects.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {projects.map((project) => (
            <div key={project.project_id} className="card-mobile group">
              <div className="flex justify-between items-start mb-3 sm:mb-4">
                <h3 className="text-base sm:text-lg font-bold text-slate-900 line-clamp-2 group-hover:text-primary-600 transition-colors pr-2">{project.name}</h3>
                <span className={`status-badge ${getStatusColor(project.status)} text-xs`}>
                  {project.status.replace('_', ' ')}
                </span>
              </div>

              {project.description && (
                <p className="text-slate-600 text-xs sm:text-sm mb-3 sm:mb-4 line-clamp-3">{project.description}</p>
              )}

              <div className="space-y-2 sm:space-y-3 mb-3 sm:mb-4">
                <div className="flex items-center text-xs sm:text-sm text-slate-600">
                  <div className="h-6 w-6 sm:h-8 sm:w-8 bg-slate-100 rounded-lg flex items-center justify-center mr-2 sm:mr-3">
                    <User className="h-3 w-3 sm:h-4 sm:w-4 text-slate-500" />
                  </div>
                  <div>
                    <span className="font-medium">{project.owner.name}</span>
                    <div className="flex items-center text-xs text-slate-500 mt-1">
                      <Mail className="h-3 w-3 mr-1" />
                      <span className="truncate">{project.owner.email}</span>
                    </div>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
                  <div className="flex items-center text-xs sm:text-sm text-slate-600">
                    <div className="h-6 w-6 sm:h-8 sm:w-8 bg-slate-100 rounded-lg flex items-center justify-center mr-2 sm:mr-3">
                      <Calendar className="h-3 w-3 sm:h-4 sm:w-4 text-slate-500" />
                    </div>
                    <div>
                      <div className="text-xs text-slate-500">Start Date</div>
                      <div className="font-medium text-xs sm:text-sm">{formatDate(project.start_date)}</div>
                    </div>
                  </div>
                  
                  <div className="flex items-center text-xs sm:text-sm text-slate-600">
                    <div className="h-6 w-6 sm:h-8 sm:w-8 bg-slate-100 rounded-lg flex items-center justify-center mr-2 sm:mr-3">
                      <Clock className="h-3 w-3 sm:h-4 sm:w-4 text-slate-500" />
                    </div>
                    <div>
                      <div className="text-xs text-slate-500">End Date</div>
                      <div className="font-medium text-xs sm:text-sm">{formatDate(project.end_date)}</div>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center text-xs sm:text-sm text-slate-600">
                  <div className="h-6 w-6 sm:h-8 sm:w-8 bg-slate-100 rounded-lg flex items-center justify-center mr-2 sm:mr-3">
                    <DollarSign className="h-3 w-3 sm:h-4 sm:w-4 text-slate-500" />
                  </div>
                  <div>
                    <div className="text-xs text-slate-500">Budget</div>
                    <div className="font-medium text-sm sm:text-lg">{formatCurrency(project.budget)}</div>
                    {project.planned_budget && (
                      <div className="text-xs text-slate-500">Planned: {formatCurrency(project.planned_budget)}</div>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center text-xs sm:text-sm text-slate-600">
                  <div className="h-6 w-6 sm:h-8 sm:w-8 bg-slate-100 rounded-lg flex items-center justify-center mr-2 sm:mr-3">
                    <AlertCircle className="h-3 w-3 sm:h-4 sm:w-4 text-slate-500" />
                  </div>
                  <div>
                    <div className="text-xs text-slate-500">Project ID</div>
                    <div className="font-medium text-xs sm:text-sm">#{project.project_id}</div>
                  </div>
                </div>
                
                <div className="flex items-center text-xs sm:text-sm text-slate-600">
                  <div className="h-6 w-6 sm:h-8 sm:w-8 bg-slate-100 rounded-lg flex items-center justify-center mr-2 sm:mr-3">
                    <Calendar className="h-3 w-3 sm:h-4 sm:w-4 text-slate-500" />
                  </div>
                  <div>
                    <div className="text-xs text-slate-500">Created</div>
                    <div className="font-medium text-xs sm:text-sm">{formatDate(project.created_at)}</div>
                  </div>
                </div>
              </div>

              {/* View Details Button */}
              <div className="mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-slate-200">
                <button
                  onClick={() => handleViewDetails(project.project_id)}
                  className="w-full btn btn-outline-primary flex items-center justify-center group text-xs sm:text-sm"
                >
                  <Eye className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2 group-hover:scale-110 transition-transform" />
                  View Details
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="card-mobile">
          <div className="text-center">
            <div className="h-16 w-16 sm:h-20 sm:w-20 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4 sm:mb-6">
              <FolderOpen className="h-8 w-8 sm:h-10 sm:w-10 text-slate-400" />
            </div>
            <h3 className="text-lg sm:text-xl font-bold text-slate-900 mb-2">No Projects Found</h3>
            <p className="text-slate-600 mb-4 sm:mb-6 max-w-md mx-auto text-sm sm:text-base">
              {searchTerm || statusFilter 
                ? 'No projects match your current filters. Try adjusting your search criteria.' 
                : 'Get started by creating your first construction project to begin tracking progress and managing resources.'
              }
            </p>
            {isAdminOrManager() && (
              <button 
                onClick={handleNewProject}
                className="btn btn-primary btn-lg shadow-lg hover:shadow-xl transition-all duration-200"
              >
                <Plus className="h-5 w-5 mr-2" />
                Create Your First Project
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Projects;
