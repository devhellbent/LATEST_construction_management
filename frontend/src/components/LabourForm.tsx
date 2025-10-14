import React, { useState, useEffect } from 'react';
import { X, Save, User, Phone, IndianRupee, Briefcase } from 'lucide-react';
import { laboursAPI, projectsAPI } from '../services/api';

interface LabourFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  labour?: {
    labour_id: number;
    name: string;
    skill: string;
    wage_rate: number;
    contact: string;
  } | null;
  selectedProjectId?: number | null;
}

interface Project {
  project_id: number;
  name: string;
}

const LabourForm: React.FC<LabourFormProps> = ({
  isOpen,
  onClose,
  onSuccess,
  labour,
  selectedProjectId
}) => {
  const [formData, setFormData] = useState({
    name: '',
    skill: '',
    wage_rate: '',
    contact: '',
    project_id: selectedProjectId || ''
  });
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetchProjects();
      if (labour) {
        setFormData({
          name: labour.name,
          skill: labour.skill || '',
          wage_rate: labour.wage_rate?.toString() || '',
          contact: labour.contact || '',
          project_id: selectedProjectId || ''
        });
      } else {
        setFormData({
          name: '',
          skill: '',
          wage_rate: '',
          contact: '',
          project_id: selectedProjectId || ''
        });
      }
    }
  }, [isOpen, labour, selectedProjectId]);

  const fetchProjects = async () => {
    try {
      const response = await projectsAPI.getProjects();
      setProjects(response.data.projects || []);
    } catch (err) {
      console.error('Error fetching projects:', err);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const submitData = {
        name: formData.name.trim(),
        skill: formData.skill.trim() || null,
        wage_rate: formData.wage_rate ? parseFloat(formData.wage_rate) : null,
        contact: formData.contact.trim() || null,
        project_id: formData.project_id ? parseInt(formData.project_id.toString()) : null
      };

      if (labour) {
        await laboursAPI.updateLabour(labour.labour_id, submitData);
      } else {
        await laboursAPI.createLabour(submitData);
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Error saving labour:', err);
      setError(err.response?.data?.message || 'Failed to save labour');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-900">
            {labour ? 'Edit Labour' : 'Add New Labour'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-3">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {/* Labour Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <User className="h-4 w-4 inline mr-1" />
              Labour Name *
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter labour name"
            />
          </div>

          {/* Mobile Number */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Phone className="h-4 w-4 inline mr-1" />
              Mobile Number
            </label>
            <input
              type="tel"
              name="contact"
              value={formData.contact}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter mobile number"
            />
          </div>

          {/* Project Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Briefcase className="h-4 w-4 inline mr-1" />
              Project Name *
            </label>
            <select
              name="project_id"
              value={formData.project_id}
              onChange={handleInputChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Select project</option>
              {projects.map((project) => (
                <option key={project.project_id} value={project.project_id}>
                  {project.name}
                </option>
              ))}
            </select>
          </div>

          {/* Labour Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Briefcase className="h-4 w-4 inline mr-1" />
              Labour Type
            </label>
            <input
              type="text"
              name="skill"
              value={formData.skill}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter labour type/skill"
            />
          </div>

          {/* Wage Rate */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <IndianRupee className="h-4 w-4 inline mr-1" />
              Wage Rate (per day)
            </label>
            <input
              type="number"
              name="wage_rate"
              value={formData.wage_rate}
              onChange={handleInputChange}
              min="0"
              step="0.01"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter daily wage rate"
            />
          </div>

          {/* Form Actions */}
          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  {labour ? 'Update' : 'Create'} Labour
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default LabourForm;
