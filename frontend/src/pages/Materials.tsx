import React, { useState, useEffect } from 'react';
import { Package, Plus, Filter } from 'lucide-react';
import ProjectSelector from '../components/ProjectSelector';
import { materialsAPI } from '../services/api';

interface Material {
  material_id: number;
  name: string;
  type: string;
  unit: string;
  cost_per_unit: number;
  supplier: string;
  stock_qty: number;
  project_id: number;
}

const Materials: React.FC = () => {
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchMaterials();
  }, [selectedProjectId]);

  const fetchMaterials = async () => {
    try {
      setLoading(true);
      setError(null);
      
      let response;
      if (selectedProjectId) {
        response = await materialsAPI.getMaterialsByProject(selectedProjectId);
      } else {
        response = await materialsAPI.getMaterials();
      }
      
      // Backend returns { materials: [...], pagination: {...} }
      const materialsData = Array.isArray(response.data.materials) ? response.data.materials : [];
      setMaterials(materialsData);
    } catch (err) {
      console.error('Error fetching materials:', err);
      setError('Failed to load materials');
      setMaterials([]); // Set empty array on error
    } finally {
      setLoading(false);
    }
  };

  const handleProjectChange = (projectId: number | null) => {
    setSelectedProjectId(projectId);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Materials</h1>
        <button className="btn btn-primary flex items-center">
          <Plus className="h-5 w-5 mr-2" />
          Add Material
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
              placeholder="Select a project to filter materials..."
            />
          </div>
        </div>
      </div>
      
      {/* Materials Content */}
      <div className="card p-6">
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading materials...</p>
          </div>
        ) : error ? (
          <div className="text-center py-12">
            <Package className="h-12 w-12 text-red-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Error Loading Materials</h3>
            <p className="text-gray-600 mb-4">{error}</p>
            <button 
              onClick={fetchMaterials}
              className="btn btn-secondary"
            >
              Try Again
            </button>
          </div>
        ) : materials.length === 0 ? (
          <div className="text-center py-12">
            <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {selectedProjectId ? 'No Materials Found' : 'No Materials Available'}
            </h3>
            <p className="text-gray-600">
              {selectedProjectId 
                ? 'This project doesn\'t have any materials yet.' 
                : 'No materials have been added yet.'
              }
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-medium text-gray-900">
                {selectedProjectId ? `Materials for Selected Project` : 'All Materials'} ({materials.length})
              </h3>
            </div>
            
            <div className="grid gap-4">
              {materials.map((material) => (
                <div key={material.material_id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900">{material.name}</h4>
                      <p className="text-sm text-gray-600 mt-1">Type: {material.type}</p>
                      <div className="flex items-center space-x-4 mt-2 text-sm text-gray-500">
                        <span>Unit: {material.unit}</span>
                        <span>Cost: ${material.cost_per_unit}</span>
                        <span>Stock: {material.stock_qty}</span>
                        {material.supplier && <span>Supplier: {material.supplier}</span>}
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <button className="btn btn-sm btn-secondary">Edit</button>
                      <button className="btn btn-sm btn-danger">Delete</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Materials;
