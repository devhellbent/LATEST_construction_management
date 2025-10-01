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
    <div className="space-responsive">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-responsive-3xl font-bold text-slate-900">Materials</h1>
          <p className="text-responsive-base text-slate-600 mt-2">Manage construction materials and inventory</p>
        </div>
        <button className="btn btn-primary btn-lg flex items-center shadow-lg hover:shadow-xl transition-all duration-200">
          <Plus className="h-5 w-5 mr-2" />
          Add Material
        </button>
      </div>

      {/* Project Filter */}
      <div className="card-mobile">
        <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-3 sm:space-y-0 sm:space-x-4">
          <div className="h-8 w-8 sm:h-10 sm:w-10 bg-primary-100 rounded-lg flex items-center justify-center">
            <Filter className="h-4 w-4 sm:h-5 sm:w-5 text-primary-600" />
          </div>
          <div className="flex-1 w-full">
            <label className="label text-sm sm:text-base">
              Filter by Project
            </label>
            <ProjectSelector
              selectedProjectId={selectedProjectId}
              onProjectChange={handleProjectChange}
              className="w-full sm:max-w-md"
              placeholder="Select a project to filter materials..."
            />
          </div>
        </div>
      </div>
      
      {/* Materials Content */}
      <div className="card-mobile">
        {loading ? (
          <div className="text-center py-8 sm:py-12">
            <div className="loading-spinner h-8 w-8 sm:h-12 sm:w-12 mx-auto mb-4"></div>
            <p className="text-slate-600 font-medium text-sm sm:text-base">Loading materials...</p>
          </div>
        ) : error ? (
          <div className="text-center py-8 sm:py-12">
            <div className="h-16 w-16 sm:h-20 sm:w-20 bg-danger-100 rounded-2xl flex items-center justify-center mx-auto mb-4 sm:mb-6">
              <Package className="h-8 w-8 sm:h-10 sm:w-10 text-danger-500" />
            </div>
            <h3 className="text-lg sm:text-xl font-bold text-slate-900 mb-2">Error Loading Materials</h3>
            <p className="text-slate-600 mb-4 sm:mb-6 max-w-md mx-auto text-sm sm:text-base">{error}</p>
            <button 
              onClick={fetchMaterials}
              className="btn btn-secondary"
            >
              Try Again
            </button>
          </div>
        ) : materials.length === 0 ? (
          <div className="text-center py-8 sm:py-12">
            <div className="h-16 w-16 sm:h-20 sm:w-20 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4 sm:mb-6">
              <Package className="h-8 w-8 sm:h-10 sm:w-10 text-slate-400" />
            </div>
            <h3 className="text-lg sm:text-xl font-bold text-slate-900 mb-2">
              {selectedProjectId ? 'No Materials Found' : 'No Materials Available'}
            </h3>
            <p className="text-slate-600 max-w-md mx-auto text-sm sm:text-base">
              {selectedProjectId 
                ? 'This project doesn\'t have any materials yet. Add materials to start tracking inventory.' 
                : 'No materials have been added yet. Start by adding your first material to the system.'
              }
            </p>
          </div>
        ) : (
          <div className="space-y-4 sm:space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-lg sm:text-xl font-bold text-slate-900">
                {selectedProjectId ? `Materials for Selected Project` : 'All Materials'} 
                <span className="text-slate-500 font-normal text-sm sm:text-base">({materials.length})</span>
              </h3>
            </div>
            
            <div className="grid gap-3 sm:gap-4">
              {materials.map((material) => (
                <div key={material.material_id} className="card-mobile group">
                  <div className="flex flex-col sm:flex-row justify-between items-start gap-3 sm:gap-0">
                    <div className="flex-1 w-full">
                      <div className="flex items-start justify-between mb-2 sm:mb-3">
                        <h4 className="text-base sm:text-lg font-bold text-slate-900 group-hover:text-primary-600 transition-colors pr-2">{material.name}</h4>
                        <div className="flex items-center space-x-2">
                          <span className="status-badge status-active text-xs">Active</span>
                        </div>
                      </div>
                      <p className="text-xs sm:text-sm text-slate-600 mb-3 sm:mb-4">Type: {material.type}</p>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4 text-xs sm:text-sm">
                        <div className="flex items-center space-x-1 sm:space-x-2">
                          <div className="h-5 w-5 sm:h-6 sm:w-6 bg-slate-100 rounded flex items-center justify-center">
                            <span className="text-xs font-semibold text-slate-600">U</span>
                          </div>
                          <span className="text-slate-600 truncate">{material.unit}</span>
                        </div>
                        <div className="flex items-center space-x-1 sm:space-x-2">
                          <div className="h-5 w-5 sm:h-6 sm:w-6 bg-slate-100 rounded flex items-center justify-center">
                            <span className="text-xs font-semibold text-slate-600">$</span>
                          </div>
                          <span className="text-slate-600">${material.cost_per_unit}</span>
                        </div>
                        <div className="flex items-center space-x-1 sm:space-x-2">
                          <div className="h-5 w-5 sm:h-6 sm:w-6 bg-slate-100 rounded flex items-center justify-center">
                            <span className="text-xs font-semibold text-slate-600">#</span>
                          </div>
                          <span className="text-slate-600">{material.stock_qty}</span>
                        </div>
                        {material.supplier && (
                          <div className="flex items-center space-x-1 sm:space-x-2">
                            <div className="h-5 w-5 sm:h-6 sm:w-6 bg-slate-100 rounded flex items-center justify-center">
                              <span className="text-xs font-semibold text-slate-600">S</span>
                            </div>
                            <span className="text-slate-600 truncate">{material.supplier}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex space-x-2 w-full sm:w-auto sm:ml-4">
                      <button className="btn btn-sm btn-secondary flex-1 sm:flex-none">Edit</button>
                      <button className="btn btn-sm btn-danger flex-1 sm:flex-none">Delete</button>
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
