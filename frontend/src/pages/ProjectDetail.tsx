import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from 'react-query';
import { projectsAPI } from '../services/api';
import { Edit, Calendar, DollarSign, User, AlertCircle, CheckCircle, Clock, FileText, Users, TrendingUp } from 'lucide-react';
import toast from 'react-hot-toast';

interface Project {
  project_id: number;
  name: string;
  description: string;
  start_date: string;
  end_date: string;
  budget: number;
  status: 'PLANNED' | 'ACTIVE' | 'ON_HOLD' | 'COMPLETED' | 'CANCELLED';
  owner: {
    user_id: number;
    name: string;
    email: string;
  };
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

const ProjectDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [isEditing, setIsEditing] = useState(false);

  // Fetch project details
  const { data: projectData, isLoading: projectLoading, error: projectError } = useQuery(
    ['project', id],
    () => projectsAPI.getProject(Number(id)),
    {
      enabled: !!id,
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
        <button 
          onClick={() => setIsEditing(true)}
          className="btn btn-outline-primary flex items-center"
        >
          <Edit className="h-4 w-4 mr-2" />
          EDIT
        </button>
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
              <p className="text-2xl font-bold text-gray-900 mt-1">{project.name}</p>
            </div>

            {/* Project Details Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Status */}
              <div>
                <label className="text-sm font-medium text-gray-500 uppercase tracking-wide">STATUS</label>
                <div className="mt-1">
                  <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(project.status)}`}>
                    {project.status.replace('_', ' ')}
                  </span>
                </div>
              </div>

              {/* Budget */}
              <div>
                <label className="text-sm font-medium text-gray-500 uppercase tracking-wide">BUDGET</label>
                <p className="text-lg font-semibold text-gray-900 mt-1">
                  {project.budget ? formatCurrency(project.budget) : '-'}
                </p>
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
                <p className="text-lg font-semibold text-gray-900 mt-1">{formatDate(project.start_date)}</p>
              </div>

              {/* End Date */}
              <div>
                <label className="text-sm font-medium text-gray-500 uppercase tracking-wide">END DATE</label>
                <p className="text-lg font-semibold text-gray-900 mt-1">{formatDate(project.end_date)}</p>
              </div>

              {/* Created Date */}
              <div>
                <label className="text-sm font-medium text-gray-500 uppercase tracking-wide">CREATED</label>
                <p className="text-lg font-semibold text-gray-900 mt-1">{formatDate(project.created_at)}</p>
              </div>
            </div>

            {/* Description */}
            {project.description && (
              <div>
                <label className="text-sm font-medium text-gray-500 uppercase tracking-wide">DESCRIPTION</label>
                <p className="text-gray-900 mt-1">{project.description}</p>
              </div>
            )}
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
