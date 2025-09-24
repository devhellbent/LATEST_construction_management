import React, { useState, useEffect } from 'react';
import { CheckSquare, Plus, Filter, Edit, Trash2 } from 'lucide-react';
import ProjectSelector from '../components/ProjectSelector';
import { tasksAPI } from '../services/api';
import CreateTaskModal from '../components/CreateTaskModal';
import EditTaskModal from '../components/EditTaskModal';

interface Task {
  task_id: number;
  title: string;
  description: string;
  status: string;
  priority: string;
  start_date: string;
  end_date: string;
  assigned_user_id: number;
  project_id: number;
  milestone: boolean;
  dependencies: any[] | null;
}

const Tasks: React.FC = () => {
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  useEffect(() => {
    fetchTasks();
  }, [selectedProjectId]);

  const fetchTasks = async () => {
    try {
      setLoading(true);
      setError(null);
      
      let response;
      if (selectedProjectId) {
        response = await tasksAPI.getTasksByProject(selectedProjectId);
      } else {
        response = await tasksAPI.getTasks();
      }
      
      // Backend returns { tasks: [...], pagination: {...} }
      const tasksData = Array.isArray(response.data.tasks) ? response.data.tasks : [];
      setTasks(tasksData);
    } catch (err) {
      console.error('Error fetching tasks:', err);
      setError('Failed to load tasks');
      setTasks([]); // Set empty array on error
    } finally {
      setLoading(false);
    }
  };

  const handleProjectChange = (projectId: number | null) => {
    setSelectedProjectId(projectId);
  };

  const handleCreateTask = () => {
    setShowCreateModal(true);
  };

  const handleCloseModal = () => {
    setShowCreateModal(false);
  };

  const handleTaskCreated = () => {
    setShowCreateModal(false);
    fetchTasks(); // Refresh the tasks list
  };

  const handleEditTask = (task: Task) => {
    setSelectedTask(task);
    setShowEditModal(true);
  };

  const handleCloseEditModal = () => {
    setShowEditModal(false);
    setSelectedTask(null);
  };

  const handleTaskUpdated = () => {
    setShowEditModal(false);
    setSelectedTask(null);
    fetchTasks(); // Refresh the tasks list
  };

  const handleDeleteTask = async (taskId: number) => {
    if (!window.confirm('Are you sure you want to delete this task? This action cannot be undone.')) {
      return;
    }

    try {
      await tasksAPI.deleteTask(taskId);
      fetchTasks(); // Refresh the tasks list
    } catch (error: any) {
      console.error('Error deleting task:', error);
      alert(error.response?.data?.message || 'Failed to delete task');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Tasks</h1>
        <button 
          onClick={handleCreateTask}
          className="btn btn-primary flex items-center"
        >
          <Plus className="h-5 w-5 mr-2" />
          New Task
        </button>
      </div>

      {/* Project Filter */}
      <div className="card p-6">
        <div className="flex items-center space-x-4">
          <Filter className="h-5 w-5 text-gray-500" />
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Filter by Project
            </label>
            <ProjectSelector
              selectedProjectId={selectedProjectId}
              onProjectChange={handleProjectChange}
              className="max-w-md"
              placeholder="Select a project to filter tasks..."
            />
          </div>
        </div>
      </div>
      
      {/* Tasks Content */}
      <div className="card p-6">
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading tasks...</p>
          </div>
        ) : error ? (
          <div className="text-center py-12">
            <CheckSquare className="h-12 w-12 text-red-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Error Loading Tasks</h3>
            <p className="text-gray-600 mb-4">{error}</p>
            <button 
              onClick={fetchTasks}
              className="btn btn-secondary"
            >
              Try Again
            </button>
          </div>
        ) : tasks.length === 0 ? (
          <div className="text-center py-12">
            <CheckSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {selectedProjectId ? 'No Tasks Found' : 'No Tasks Available'}
            </h3>
            <p className="text-gray-600">
              {selectedProjectId 
                ? 'This project doesn\'t have any tasks yet.' 
                : 'No tasks have been created yet.'
              }
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-medium text-gray-900">
                {selectedProjectId ? `Tasks for Selected Project` : 'All Tasks'} ({tasks.length})
              </h3>
            </div>
            
            <div className="grid gap-4">
              {tasks.map((task) => (
                <div key={task.task_id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900">{task.title}</h4>
                      <p className="text-sm text-gray-600 mt-1">{task.description}</p>
                      <div className="flex items-center space-x-4 mt-2 text-sm text-gray-500">
                        <span>Status: {task.status}</span>
                        <span>Priority: {task.priority}</span>
                        {task.start_date && <span>Start: {new Date(task.start_date).toLocaleDateString()}</span>}
                        {task.end_date && <span>End: {new Date(task.end_date).toLocaleDateString()}</span>}
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <button 
                        onClick={() => handleEditTask(task)}
                        className="btn btn-sm btn-secondary flex items-center"
                      >
                        <Edit className="h-4 w-4 mr-1" />
                        Edit
                      </button>
                      <button 
                        onClick={() => handleDeleteTask(task.task_id)}
                        className="btn btn-sm btn-danger flex items-center"
                      >
                        <Trash2 className="h-4 w-4 mr-1" />
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Create Task Modal */}
      {showCreateModal && (
        <CreateTaskModal
          isOpen={showCreateModal}
          onClose={handleCloseModal}
          onTaskCreated={handleTaskCreated}
          selectedProjectId={selectedProjectId}
        />
      )}

      {/* Edit Task Modal */}
      {showEditModal && selectedTask && (
        <EditTaskModal
          isOpen={showEditModal}
          onClose={handleCloseEditModal}
          onTaskUpdated={handleTaskUpdated}
          task={selectedTask}
        />
      )}
    </div>
  );
};

export default Tasks;
