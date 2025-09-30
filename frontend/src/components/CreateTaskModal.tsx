import React, { useState, useEffect } from 'react';
import { X, Users, Flag, CheckSquare } from 'lucide-react';
import { tasksAPI, projectsAPI, usersAPI } from '../services/api';
import { toast } from 'react-hot-toast';
import SearchableDropdown from './SearchableDropdown';

interface CreateTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTaskCreated: () => void;
  selectedProjectId?: number | null;
}

interface Project {
  project_id: number;
  name: string;
}

interface User {
  user_id: number;
  name: string;
  email: string;
}

const CreateTaskModal: React.FC<CreateTaskModalProps> = ({
  isOpen,
  onClose,
  onTaskCreated,
  selectedProjectId
}) => {
  const [formData, setFormData] = useState({
    project_id: selectedProjectId?.toString() || '',
    title: '',
    description: '',
    assigned_user_id: '',
    start_date: '',
    end_date: '',
    priority: 'MEDIUM',
    status: 'TODO',
    milestone: false
  });
  const [loading, setLoading] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loadingData, setLoadingData] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchData();
      if (selectedProjectId) {
        setFormData(prev => ({ ...prev, project_id: selectedProjectId.toString() }));
      }
    }
  }, [isOpen, selectedProjectId]);

  const fetchData = async () => {
    setLoadingData(true);
    try {
      const [projectsRes, usersRes] = await Promise.all([
        projectsAPI.getProjects(),
        usersAPI.getUsers()
      ]);
      
      setProjects(projectsRes.data.projects || []);
      setUsers(usersRes.data.users || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load form data');
    } finally {
      setLoadingData(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.project_id || !formData.title) {
      toast.error('Please fill in all required fields');
      return;
    }

    setLoading(true);
    try {
      const taskData = {
        project_id: parseInt(formData.project_id),
        title: formData.title,
        description: formData.description || null,
        assigned_user_id: formData.assigned_user_id && formData.assigned_user_id !== '' ? parseInt(formData.assigned_user_id) : null,
        start_date: formData.start_date || null,
        end_date: formData.end_date || null,
        priority: formData.priority,
        status: formData.status,
        milestone: formData.milestone
      };

      await tasksAPI.createTask(taskData);
      toast.success('Task created successfully!');
      onTaskCreated();
    } catch (error: any) {
      console.error('Error creating task:', error);
      toast.error(error.response?.data?.message || 'Failed to create task');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b">
          <h2 className="text-xl font-bold text-gray-900">Create a new Task</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Project Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Project <span className="text-red-500">*</span>
            </label>
            <SearchableDropdown
              options={projects.map(project => ({
                value: project.project_id.toString(),
                label: project.name,
                searchText: project.name
              }))}
              value={formData.project_id}
              onChange={(value) => handleInputChange('project_id', value.toString())}
              placeholder="Select project"
              searchPlaceholder="Search projects..."
              className="w-full"
              required
              disabled={loadingData}
            />
          </div>

          {/* Task Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Task Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => handleInputChange('title', e.target.value)}
              placeholder="Enter task title..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              placeholder="Enter task description..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 h-24 resize-none"
            />
          </div>

          {/* Assigned User */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Assign to
            </label>
            <div className="relative">
              <Users className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
              <SearchableDropdown
              options={users.map(user => ({
                value: user.user_id.toString(),
                label: `${user.name} (${user.email})`,
                searchText: `${user.name} ${user.email}`
              }))}
                value={formData.assigned_user_id}
                onChange={(value) => handleInputChange('assigned_user_id', value.toString())}
                placeholder="Select user to assign"
                searchPlaceholder="Search users..."
                className="w-full"
                disabled={loadingData}
              />
            </div>
          </div>

          {/* Date Range */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Start Date
              </label>
              <input
                type="date"
                value={formData.start_date}
                onChange={(e) => handleInputChange('start_date', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                End Date
              </label>
              <input
                type="date"
                value={formData.end_date}
                onChange={(e) => handleInputChange('end_date', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          {/* Priority and Status */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Priority
              </label>
              <div className="relative">
                <Flag className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
                <SearchableDropdown
                  options={[
                    { value: 'LOW', label: 'Low' },
                    { value: 'MEDIUM', label: 'Medium' },
                    { value: 'HIGH', label: 'High' },
                    { value: 'CRITICAL', label: 'Critical' }
                  ]}
                  value={formData.priority}
                  onChange={(value) => handleInputChange('priority', value.toString())}
                  placeholder="Select priority"
                  searchPlaceholder="Search priority..."
                  className="w-full"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Status
              </label>
              <div className="relative">
                <CheckSquare className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
                <SearchableDropdown
                  options={[
                    { value: 'TODO', label: 'To Do' },
                    { value: 'IN_PROGRESS', label: 'In Progress' },
                    { value: 'BLOCKED', label: 'Blocked' },
                    { value: 'DONE', label: 'Done' }
                  ]}
                  value={formData.status}
                  onChange={(value) => handleInputChange('status', value.toString())}
                  placeholder="Select status"
                  searchPlaceholder="Search status..."
                  className="w-full"
                />
              </div>
            </div>
          </div>

          {/* Milestone */}
          <div>
            <label className="flex items-center space-x-3">
              <input
                type="checkbox"
                checked={formData.milestone}
                onChange={(e) => handleInputChange('milestone', e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <span className="text-sm font-medium text-gray-700">
                This is a milestone task
              </span>
            </label>
          </div>

          

          {/* Submit Button */}
          <div className="flex justify-end pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors mr-3"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || loadingData}
              className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Creating...' : 'Create Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateTaskModal;
