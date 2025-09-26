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
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-4xl font-bold text-slate-900">Materials</h1>
          <p className="text-lg text-slate-600 mt-2">Manage construction materials and inventory</p>
        </div>
        <button className="btn btn-primary btn-lg flex items-center shadow-lg hover:shadow-xl transition-all duration-200">
          <Plus className="h-5 w-5 mr-2" />
          Add Material
        </button>
      </div>

      {/* Project Filter */}
      <div className="card p-6">
        <div className="flex items-center space-x-4">
          <div className="h-10 w-10 bg-primary-100 rounded-lg flex items-center justify-center">
            <Filter className="h-5 w-5 text-primary-600" />
          </div>
          <div className="flex-1">
            <label className="label">
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
            <div className="loading-spinner h-12 w-12 mx-auto mb-4"></div>
            <p className="text-slate-600 font-medium">Loading materials...</p>
          </div>
        ) : error ? (
          <div className="text-center py-12">
            <div className="h-20 w-20 bg-danger-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <Package className="h-10 w-10 text-danger-500" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-2">Error Loading Materials</h3>
            <p className="text-slate-600 mb-6 max-w-md mx-auto">{error}</p>
            <button 
              onClick={fetchMaterials}
              className="btn btn-secondary"
            >
              Try Again
            </button>
          </div>
        ) : materials.length === 0 ? (
          <div className="text-center py-12">
            <div className="h-20 w-20 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <Package className="h-10 w-10 text-slate-400" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-2">
              {selectedProjectId ? 'No Materials Found' : 'No Materials Available'}
            </h3>
            <p className="text-slate-600 max-w-md mx-auto">
              {selectedProjectId 
                ? 'This project doesn\'t have any materials yet. Add materials to start tracking inventory.' 
                : 'No materials have been added yet. Start by adding your first material to the system.'
              }
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-xl font-bold text-slate-900">
                {selectedProjectId ? `Materials for Selected Project` : 'All Materials'} 
                <span className="text-slate-500 font-normal">({materials.length})</span>
              </h3>
            </div>
            
            <div className="grid gap-4">
              {materials.map((material) => (
                <div key={material.material_id} className="card-interactive p-6 group">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-3">
                        <h4 className="text-lg font-bold text-slate-900 group-hover:text-primary-600 transition-colors">{material.name}</h4>
                        <div className="flex items-center space-x-2">
                          <span className="status-badge status-active">Active</span>
                        </div>
                      </div>
                      <p className="text-sm text-slate-600 mb-4">Type: {material.type}</p>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div className="flex items-center space-x-2">
                          <div className="h-6 w-6 bg-slate-100 rounded flex items-center justify-center">
                            <span className="text-xs font-semibold text-slate-600">U</span>
                          </div>
                          <span className="text-slate-600">{material.unit}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <div className="h-6 w-6 bg-slate-100 rounded flex items-center justify-center">
                            <span className="text-xs font-semibold text-slate-600">$</span>
                          </div>
                          <span className="text-slate-600">${material.cost_per_unit}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <div className="h-6 w-6 bg-slate-100 rounded flex items-center justify-center">
                            <span className="text-xs font-semibold text-slate-600">#</span>
                          </div>
                          <span className="text-slate-600">{material.stock_qty}</span>
                        </div>
                        {material.supplier && (
                          <div className="flex items-center space-x-2">
                            <div className="h-6 w-6 bg-slate-100 rounded flex items-center justify-center">
                              <span className="text-xs font-semibold text-slate-600">S</span>
                            </div>
                            <span className="text-slate-600 truncate">{material.supplier}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex space-x-2 ml-4">
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
