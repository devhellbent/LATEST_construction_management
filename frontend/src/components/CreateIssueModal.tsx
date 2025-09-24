import React, { useState, useEffect } from 'react';
import { X, Upload, CheckSquare } from 'lucide-react';
import { issuesAPI, projectsAPI, usersAPI, tasksAPI } from '../services/api';
import { toast } from 'react-hot-toast';

interface CreateIssueModalProps {
  isOpen: boolean;
  onClose: () => void;
  onIssueCreated: () => void;
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

interface Task {
  task_id: number;
  title: string;
  project_id: number;
}

const CreateIssueModal: React.FC<CreateIssueModalProps> = ({
  isOpen,
  onClose,
  onIssueCreated,
  selectedProjectId
}) => {
  const [formData, setFormData] = useState({
    project_id: selectedProjectId?.toString() || '',
    task_id: '',
    description: '',
    assigned_to_user_id: '',
    priority: 'MEDIUM'
  });
  const [loading, setLoading] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loadingData, setLoadingData] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchData();
      if (selectedProjectId) {
        setFormData(prev => ({ ...prev, project_id: selectedProjectId.toString() }));
      }
    }
  }, [isOpen, selectedProjectId]);

  useEffect(() => {
    if (formData.project_id) {
      fetchTasksForProject(parseInt(formData.project_id));
    } else {
      setTasks([]);
    }
  }, [formData.project_id]);


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

  const fetchTasksForProject = async (projectId: number) => {
    try {
      const tasksRes = await tasksAPI.getTasksByProject(projectId);
      setTasks(tasksRes.data.tasks || []);
    } catch (error) {
      console.error('Error fetching tasks:', error);
      setTasks([]);
    }
  };


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.project_id || !formData.description) {
      toast.error('Please fill in all required fields');
      return;
    }

    setLoading(true);
    try {
      const issueData = {
        project_id: parseInt(formData.project_id),
        task_id: formData.task_id ? parseInt(formData.task_id) : null,
        description: formData.description,
        priority: formData.priority,
        assigned_to_user_id: formData.assigned_to_user_id ? parseInt(formData.assigned_to_user_id) : null
      };

      await issuesAPI.createIssue(issueData);
      toast.success('Issue created successfully!');
      onIssueCreated();
    } catch (error: any) {
      console.error('Error creating issue:', error);
      toast.error(error.response?.data?.message || 'Failed to create issue');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b">
          <h2 className="text-xl font-bold text-gray-900">Create a new Issue</h2>
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
              Select Project <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.project_id}
              onChange={(e) => handleInputChange('project_id', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
              disabled={loadingData}
            >
              <option value="">Select project</option>
              {projects.map(project => (
                <option key={project.project_id} value={project.project_id}>
                  {project.name}
                </option>
              ))}
            </select>
          </div>

          {/* Task Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Related Task
            </label>
            <div className="relative">
              <CheckSquare className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
              <select
                value={formData.task_id}
                onChange={(e) => handleInputChange('task_id', e.target.value)}
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                disabled={!formData.project_id || loadingData}
              >
                <option value="">Select the related task (optional)</option>
                {tasks.map(task => (
                  <option key={task.task_id} value={task.task_id}>
                    {task.title}
                  </option>
                ))}
              </select>
            </div>
            <p className="text-sm text-gray-500 mt-1">
              Select a task if this issue is related to a specific task
            </p>
          </div>


          {/* Issue Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Issue description <span className="text-red-500">*</span>
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              placeholder="Briefly explain your issue..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 h-24 resize-none"
              required
            />
          </div>


          {/* Assign To */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Assign to
            </label>
            <select
              value={formData.assigned_to_user_id}
              onChange={(e) => handleInputChange('assigned_to_user_id', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              disabled={loadingData}
            >
              <option value="">Select who should resolve the issue</option>
              {users.map(user => (
                <option key={user.user_id} value={user.user_id}>
                  {user.name} ({user.email})
                </option>
              ))}
            </select>
          </div>

          {/* Priority */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Priority
            </label>
            <select
              value={formData.priority}
              onChange={(e) => handleInputChange('priority', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="LOW">Low</option>
              <option value="MEDIUM">Medium</option>
              <option value="HIGH">High</option>
              <option value="CRITICAL">Critical</option>
            </select>
          </div>


          {/* File Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Add attachments
            </label>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors">
              <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
              <p className="text-sm text-gray-600">Click to upload or drag and drop</p>
              <p className="text-xs text-gray-500 mt-1">Limit: 10 files, 200 MB each</p>
            </div>
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
              {loading ? 'Creating...' : 'Create issue'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateIssueModal;
