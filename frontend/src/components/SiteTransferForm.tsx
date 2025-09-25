import React, { useState, useEffect } from 'react';
import { X, Save, AlertCircle } from 'lucide-react';
import { commercialAPI, projectsAPI, materialsAPI } from '../services/api';

interface SiteTransferFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  transfer?: any;
}

interface Project {
  project_id: number;
  name: string;
}

interface Material {
  material_id: number;
  name: string;
  type: string;
  unit: string;
  stock_qty: number;
  available_qty: number;
}

const SiteTransferForm: React.FC<SiteTransferFormProps> = ({
  isOpen,
  onClose,
  onSuccess,
  transfer
}) => {
  const [formData, setFormData] = useState({
    from_project_id: '',
    to_project_id: '',
    material_id: '',
    quantity: '',
    transfer_date: new Date().toISOString().split('T')[0],
    transfer_reason: ''
  });
  const [projects, setProjects] = useState<Project[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [availableMaterials, setAvailableMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedMaterial, setSelectedMaterial] = useState<Material | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetchProjects();
      if (transfer) {
        setFormData({
          from_project_id: transfer.from_project_id?.toString() || '',
          to_project_id: transfer.to_project_id?.toString() || '',
          material_id: transfer.material_id?.toString() || '',
          quantity: transfer.quantity?.toString() || '',
          transfer_date: transfer.transfer_date || new Date().toISOString().split('T')[0],
          transfer_reason: transfer.transfer_reason || ''
        });
      } else {
        setFormData({
          from_project_id: '',
          to_project_id: '',
          material_id: '',
          quantity: '',
          transfer_date: new Date().toISOString().split('T')[0],
          transfer_reason: ''
        });
      }
    }
  }, [isOpen, transfer]);

  useEffect(() => {
    if (formData.from_project_id) {
      fetchMaterialsByProject(parseInt(formData.from_project_id));
    }
  }, [formData.from_project_id]);

  useEffect(() => {
    if (formData.material_id) {
      const material = availableMaterials.find(m => m.material_id === parseInt(formData.material_id));
      setSelectedMaterial(material || null);
    } else {
      setSelectedMaterial(null);
    }
  }, [formData.material_id, availableMaterials]);

  const fetchProjects = async () => {
    try {
      const response = await projectsAPI.getProjects();
      setProjects(response.data.projects || []);
    } catch (error) {
      console.error('Error fetching projects:', error);
    }
  };

  const fetchMaterialsByProject = async (projectId: number) => {
    try {
      // Fetch materials that have been issued for this project
      const response = await commercialAPI.getMaterialIssues({ project_id: projectId });
      const issues = response.data.issues || [];
      
      // Get unique materials from issues and their available quantities
      const materialMap = new Map();
      issues.forEach((issue: any) => {
        if (issue.material && issue.status !== 'CANCELLED') {
          const materialId = issue.material.material_id;
          if (materialMap.has(materialId)) {
            materialMap.get(materialId).available_qty += issue.quantity_issued;
          } else {
            materialMap.set(materialId, {
              material_id: materialId,
              name: issue.material.name,
              type: issue.material.type || '',
              unit: issue.material.unit || '',
              stock_qty: issue.material.stock_qty || 0,
              available_qty: issue.quantity_issued
            });
          }
        }
      });
      
      setAvailableMaterials(Array.from(materialMap.values()));
    } catch (error) {
      console.error('Error fetching issued materials:', error);
      setAvailableMaterials([]);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const transferData = {
        from_project_id: parseInt(formData.from_project_id),
        to_project_id: parseInt(formData.to_project_id),
        material_id: parseInt(formData.material_id),
        quantity: parseInt(formData.quantity),
        transfer_date: formData.transfer_date,
        transfer_reason: formData.transfer_reason
      };

      if (transfer) {
        // Update existing transfer (status update)
        await commercialAPI.updateSiteTransferStatus(transfer.transfer_id, 'APPROVED');
      } else {
        // Create new transfer
        await commercialAPI.createSiteTransfer(transferData);
      }

      onSuccess();
      onClose();
    } catch (error: any) {
      setError(error.response?.data?.message || 'Failed to save site transfer');
    } finally {
      setLoading(false);
    }
  };

  const isFormValid = () => {
    return formData.from_project_id && 
           formData.to_project_id && 
           formData.material_id && 
           formData.quantity && 
           formData.transfer_date &&
           formData.from_project_id !== formData.to_project_id;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-900">
            {transfer ? 'Update Site Transfer' : 'Create Site Transfer'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center">
              <AlertCircle className="h-5 w-5 text-red-500 mr-2" />
              <span className="text-red-700">{error}</span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* From Project */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                From Project *
              </label>
              <select
                name="from_project_id"
                value={formData.from_project_id}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                required
              >
                <option value="">Select sending project</option>
                {projects.map(project => (
                  <option key={project.project_id} value={project.project_id}>
                    {project.name}
                  </option>
                ))}
              </select>
            </div>

            {/* To Project */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                To Project *
              </label>
              <select
                name="to_project_id"
                value={formData.to_project_id}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                required
              >
                <option value="">Select receiving project</option>
                {projects
                  .filter(project => project.project_id !== parseInt(formData.from_project_id))
                  .map(project => (
                    <option key={project.project_id} value={project.project_id}>
                      {project.name}
                    </option>
                  ))}
              </select>
            </div>
          </div>

          {/* Material Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Material *
            </label>
            <select
              name="material_id"
              value={formData.material_id}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              required
              disabled={!formData.from_project_id}
            >
              <option value="">Select material</option>
              {availableMaterials.map(material => (
                <option key={material.material_id} value={material.material_id}>
                  {material.name} ({material.type}) - Available: {material.available_qty} {material.unit}
                </option>
              ))}
            </select>
            {!formData.from_project_id && (
              <p className="text-sm text-gray-500 mt-1">Please select a sending project first</p>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Quantity */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Quantity *
              </label>
              <input
                type="number"
                name="quantity"
                value={formData.quantity}
                onChange={handleInputChange}
                min="1"
                max={selectedMaterial?.stock_qty || 999999}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                required
              />
              {selectedMaterial && (
                <p className="text-sm text-gray-500 mt-1">
                  Available stock: {selectedMaterial.stock_qty} {selectedMaterial.unit}
                </p>
              )}
            </div>

            {/* Transfer Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Transfer Date *
              </label>
              <input
                type="date"
                name="transfer_date"
                value={formData.transfer_date}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                required
              />
            </div>
          </div>

          {/* Transfer Reason */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Transfer Reason
            </label>
            <textarea
              name="transfer_reason"
              value={formData.transfer_reason}
              onChange={handleInputChange}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder="Enter reason for transfer..."
            />
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-end space-x-4 pt-6 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!isFormValid() || loading}
              className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  {transfer ? 'Update Transfer' : 'Create Transfer'}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SiteTransferForm;
