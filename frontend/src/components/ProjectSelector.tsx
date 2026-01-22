import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
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
  const buttonRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 });

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

  // Calculate dropdown position when it opens and on scroll
  useEffect(() => {
    if (isOpen && buttonRef.current) {
      const updatePosition = () => {
        if (buttonRef.current) {
          const rect = buttonRef.current.getBoundingClientRect();
          setDropdownPosition({
            top: rect.bottom + window.scrollY + 4,
            left: rect.left + window.scrollX,
            width: rect.width
          });
        }
      };

      updatePosition();
      window.addEventListener('scroll', updatePosition, true);
      window.addEventListener('resize', updatePosition);

      return () => {
        window.removeEventListener('scroll', updatePosition, true);
        window.removeEventListener('resize', updatePosition);
      };
    }
  }, [isOpen]);

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
        <div className="w-full px-3 sm:px-4 py-2 border border-slate-300 rounded-lg bg-slate-50 flex items-center justify-between">
          <span className="text-slate-500 text-sm sm:text-base">Loading projects...</span>
          <ChevronDown className="h-4 w-4 text-slate-400" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`relative ${className}`}>
        <div className="w-full px-3 sm:px-4 py-2 border border-danger-300 rounded-lg bg-danger-50 flex items-center justify-between">
          <span className="text-danger-500 text-xs sm:text-sm">{error}</span>
          <button
            onClick={fetchProjects}
            className="text-danger-600 hover:text-danger-800 text-xs sm:text-sm font-medium px-2 py-1 rounded hover:bg-danger-100 transition-colors"
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
        ref={buttonRef}
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-3 sm:px-4 py-2 border border-slate-300 rounded-lg bg-white flex items-center justify-between hover:border-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
      >
        <div className="flex items-center">
          <Building2 className="h-4 w-4 text-slate-500 mr-2" />
          <span className={`text-sm sm:text-base ${selectedProject ? 'text-slate-900' : 'text-slate-500'}`}>
            {selectedProject ? selectedProject.name : placeholder}
          </span>
        </div>
        <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && typeof document !== 'undefined' && createPortal(
        <>
          <div
            className="fixed inset-0 z-[99998]"
            onClick={() => setIsOpen(false)}
          />
          <div
            ref={dropdownRef}
            className="fixed z-[99999] bg-white border border-slate-300 rounded-lg shadow-xl max-h-60 overflow-auto"
            style={{
              top: `${dropdownPosition.top}px`,
              left: `${dropdownPosition.left}px`,
              width: `${dropdownPosition.width}px`
            }}
          >
            <div className="p-2">
              <button
                onClick={handleClearSelection}
                className="w-full text-left px-3 py-2 text-xs sm:text-sm text-slate-500 hover:bg-slate-100 rounded"
              >
                All Projects
              </button>
            </div>
            {projects.length === 0 ? (
              <div className="px-4 py-3 text-xs sm:text-sm text-slate-500 text-center">
                No projects available
              </div>
            ) : (
              projects.map((project) => (
                <button
                  key={project.project_id}
                  onClick={() => handleProjectSelect(project.project_id)}
                  className={`w-full text-left px-3 py-2 text-xs sm:text-sm hover:bg-slate-100 rounded mx-2 my-1 ${
                    selectedProjectId === project.project_id
                      ? 'bg-primary-50 text-primary-700'
                      : 'text-slate-900'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="truncate pr-2">{project.name}</span>
                    <span className={`text-xs px-2 py-1 rounded flex-shrink-0 ${
                      project.status === 'ACTIVE' 
                        ? 'bg-success-100 text-success-700'
                        : project.status === 'COMPLETED'
                        ? 'bg-primary-100 text-primary-700'
                        : 'bg-slate-100 text-slate-700'
                    }`}>
                      {project.status}
                    </span>
                  </div>
                </button>
              ))
            )}
          </div>
        </>,
        document.body
      )}
    </div>
  );
};

export default ProjectSelector;
