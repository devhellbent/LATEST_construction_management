import React, { useState, useEffect } from 'react';
import { ChevronDown, Building2 } from 'lucide-react';
import { projectsAPI } from '../services/api';

interface Project {
  project_id: number;
  name: string;
  status: string;
}

interface ProjectSelectorProps {
  selectedProjectId: number | null;
  onProjectChange: (projectId: number | null) => void;
  className?: string;
  placeholder?: string;
}

const ProjectSelector: React.FC<ProjectSelectorProps> = ({
  selectedProjectId,
  onProjectChange,
  className = '',
  placeholder = 'Select a project...'
}) => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFetching, setIsFetching] = useState(false);

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    if (isFetching) return; // Prevent multiple simultaneous calls
    
    try {
      setIsFetching(true);
      setLoading(true);
      const response = await projectsAPI.getProjects();
      // Backend returns { projects: [...], pagination: {...} }
      const projectsData = Array.isArray(response.data.projects) ? response.data.projects : [];
      setProjects(projectsData);
      setError(null);
    } catch (err: any) {
      console.error('Error fetching projects:', err);
      if (err.response?.status === 429) {
        setError('Too many requests. Please wait a moment and try again.');
      } else {
        setError('Failed to load projects');
      }
      setProjects([]); // Set empty array on error
    } finally {
      setLoading(false);
      setIsFetching(false);
    }
  };

  const selectedProject = Array.isArray(projects) ? projects.find(p => p.project_id === selectedProjectId) : null;

  const handleProjectSelect = (projectId: number) => {
    onProjectChange(projectId);
    setIsOpen(false);
  };

  const handleClearSelection = () => {
    onProjectChange(null);
    setIsOpen(false);
  };

  if (loading) {
    return (
      <div className={`relative ${className}`}>
        <div className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 flex items-center justify-between">
          <span className="text-gray-500">Loading projects...</span>
          <ChevronDown className="h-4 w-4 text-gray-400" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`relative ${className}`}>
        <div className="w-full px-4 py-2 border border-red-300 rounded-lg bg-red-50 flex items-center justify-between">
          <span className="text-red-500 text-sm">{error}</span>
          <button
            onClick={fetchProjects}
            className="text-red-600 hover:text-red-800 text-sm font-medium px-2 py-1 rounded hover:bg-red-100 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white flex items-center justify-between hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
      >
        <div className="flex items-center">
          <Building2 className="h-4 w-4 text-gray-500 mr-2" />
          <span className={selectedProject ? 'text-gray-900' : 'text-gray-500'}>
            {selectedProject ? selectedProject.name : placeholder}
          </span>
        </div>
        <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute z-20 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-auto">
            <div className="p-2">
              <button
                onClick={handleClearSelection}
                className="w-full text-left px-3 py-2 text-sm text-gray-500 hover:bg-gray-100 rounded"
              >
                All Projects
              </button>
            </div>
            {projects.length === 0 ? (
              <div className="px-4 py-3 text-sm text-gray-500 text-center">
                No projects available
              </div>
            ) : (
              projects.map((project) => (
                <button
                  key={project.project_id}
                  onClick={() => handleProjectSelect(project.project_id)}
                  className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-100 rounded mx-2 my-1 ${
                    selectedProjectId === project.project_id
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-gray-900'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span>{project.name}</span>
                    <span className={`text-xs px-2 py-1 rounded ${
                      project.status === 'ACTIVE' 
                        ? 'bg-green-100 text-green-700'
                        : project.status === 'COMPLETED'
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-gray-100 text-gray-700'
                    }`}>
                      {project.status}
                    </span>
                  </div>
                </button>
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default ProjectSelector;
