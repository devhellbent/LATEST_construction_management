import React, { useState, useEffect } from 'react';
import { 
  mrrAPI, 
  materialManagementAPI, 
  projectsAPI
} from '../services/api';

interface MrrOption {
  mrr_id: number;
  mrr_reference_id: string;
  project_id: number;
  project: {
    name: string;
  };
  status: string;
  items: Array<{
    item_id: number;
    item_name: string;
    quantity_requested: number;
    unit_id: number;
    unit_name: string;
    available_stock?: number;
  }>;
}

interface MaterialItem {
  material_id: number;
  name: string;
  unit: string;
  stock_qty: number;
  item?: {
    item_id: number;
    item_name: string;
    unit: {
      unit_name: string;
      unit_symbol: string;
    };
  };
}

interface IssueFormData {
  project_id: number;
  issued_to: string;
  issue_date: string;
  notes: string;
  is_mrr_based: boolean;
  mrr_id?: number;
  mrr_reference_id?: string;
  items: Array<{
    material_id: number;
    quantity_issued: number;
    item_name?: string;
    unit_name?: string;
  }>;
}

const UnifiedMaterialIssue: React.FC = () => {
  const [mrrs, setMrrs] = useState<MrrOption[]>([]);
  const [materials, setMaterials] = useState<MaterialItem[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<IssueFormData>({
    project_id: 0,
    issued_to: '',
    issue_date: new Date().toISOString().split('T')[0],
    notes: '',
    is_mrr_based: false,
    items: []
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [mrrsRes, materialsRes, projectsRes] = await Promise.all([
        mrrAPI.getMrrs({ 
          status: 'APPROVED',
          include_items: true,
          include_project: true
        }),
        materialManagementAPI.getInventory(),
        projectsAPI.getProjects()
      ]);

      // Process MRRs with stock information
      const mrrsWithStock = await Promise.all(
        (mrrsRes.data.mrrs || []).map(async (mrr: any) => {
          const itemsWithStock = await Promise.all(
            mrr.items.map(async (item: any) => {
              try {
                const materialData = materialsRes.data.materials.find((m: any) => m.item?.item_id === item.item_id);
                return {
                  ...item,
                  available_stock: materialData?.stock_qty || 0
                };
              } catch {
                return { ...item, available_stock: 0 };
              }
            })
          );
          
          return {
            ...mrr,
            items: itemsWithStock
          };
        })
      );

      setMrrs(mrrsWithStock);
      setMaterials(materialsRes.data.materials || []);
      setProjects(projectsRes.data.projects || []);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleMrrBasedToggle = (isMrrBased: boolean) => {
    setFormData(prev => ({
      ...prev,
      is_mrr_based: isMrrBased,
      mrr_id: isMrrBased ? prev.mrr_id : undefined,
      mrr_reference_id: isMrrBased ? prev.mrr_reference_id : undefined,
      items: []
    }));
  };

  const handleMrrSelection = (mrrId: number) => {
    const selectedMrr = mrrs.find(mrr => mrr.mrr_id === mrrId);
    if (selectedMrr) {
      setFormData(prev => ({
        ...prev,
        mrr_id: mrrId,
        mrr_reference_id: selectedMrr.mrr_reference_id,
        project_id: selectedMrr.project_id,
        items: selectedMrr.items.map(item => ({
          material_id: item.item_id,
          quantity_issued: Math.min(item.quantity_requested, item.available_stock || 0),
          item_name: item.item_name,
          unit_name: item.unit_name
        }))
      }));
    }
  };

  const addMaterialItem = () => {
    setFormData(prev => ({
      ...prev,
      items: [...prev.items, {
        material_id: 0,
        quantity_issued: 0,
        item_name: '',
        unit_name: ''
      }]
    }));
  };

  const updateMaterialItem = (index: number, field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.map((item, i) => {
        if (i === index) {
          if (field === 'material_id') {
            const selectedMaterial = materials.find(m => m.material_id === value);
            return {
              ...item,
              material_id: value,
              item_name: selectedMaterial?.name || '',
              unit_name: selectedMaterial?.unit || selectedMaterial?.item?.unit?.unit_symbol || ''
            };
          }
          return { ...item, [field]: value };
        }
        return item;
      })
    }));
  };

  const removeMaterialItem = (index: number) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = async () => {
    if (!formData.project_id || !formData.issued_to || formData.items.length === 0) {
      alert('Please fill in all required fields');
      return;
    }

    if (formData.is_mrr_based && !formData.mrr_id) {
      alert('Please select an MRR');
      return;
    }

    // Validate each material item
    for (let i = 0; i < formData.items.length; i++) {
      const item = formData.items[i];
      if (!item.material_id || item.material_id === 0) {
        alert(`Please select a material for item ${i + 1}`);
        return;
      }
      if (!item.quantity_issued || item.quantity_issued <= 0) {
        alert(`Please enter a valid quantity for item ${i + 1}`);
        return;
      }
    }

    setLoading(true);
    try {
      // Create separate material issues for each item
      const issuePromises = formData.items.map(async (item) => {
        const issueData: any = {
          project_id: parseInt(formData.project_id.toString()),
          material_id: parseInt(item.material_id.toString()),
          quantity_issued: parseInt(item.quantity_issued.toString()),
          issue_date: formData.issue_date,
          issue_purpose: formData.notes || '',
          location: 'Project Site',
          issued_by_user_id: 1, // This should come from auth context
          received_by_user_id: 1, // This should come from auth context
          is_for_mrr: Boolean(formData.is_mrr_based)
        };

        // Only add mrr_id if it's actually needed
        if (formData.is_mrr_based && formData.mrr_id) {
          issueData.mrr_id = parseInt(formData.mrr_id.toString());
        }

        console.log('Submitting material issue data:', issueData);
        console.log('Issue date type:', typeof issueData.issue_date);
        console.log('Issue date value:', issueData.issue_date);
        console.log('Is for MRR type:', typeof issueData.is_for_mrr);
        console.log('Is for MRR value:', issueData.is_for_mrr);
        
        return materialManagementAPI.createMaterialIssue(issueData);
      });

      // Wait for all material issues to be created
      await Promise.all(issuePromises);

      alert('Material issued successfully!');
      setFormData({
        project_id: 0,
        issued_to: '',
        issue_date: new Date().toISOString().split('T')[0],
        notes: '',
        is_mrr_based: false,
        items: []
      });
    } catch (error) {
      console.error('Error issuing material:', error);
      console.error('Error response:', error.response?.data);
      console.error('Error status:', error.response?.status);
      console.error('Validation errors:', error.response?.data?.errors);
      alert(`Error issuing material: ${error.response?.data?.message || error.message}`);
    } finally {
      setLoading(false);
    }
  };

  if (loading && mrrs.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Material Issue Management</h1>
        <p className="text-gray-600 mt-2">Issue materials based on MRR or direct project requirements</p>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6">
        <form onSubmit={(e) => { e.preventDefault(); handleSubmit(); }}>
          {/* Issue Type Selection */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Issue Type</h3>
            <div className="flex items-center space-x-6">
              <label className="flex items-center">
                <input
                  type="radio"
                  name="issue_type"
                  checked={formData.is_mrr_based}
                  onChange={() => handleMrrBasedToggle(true)}
                  className="mr-2"
                />
                <span className="text-gray-700">Based on MRR (Material Requirement Request)</span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="issue_type"
                  checked={!formData.is_mrr_based}
                  onChange={() => handleMrrBasedToggle(false)}
                  className="mr-2"
                />
                <span className="text-gray-700">Direct Issue (Project Manager)</span>
              </label>
            </div>
          </div>

          {/* MRR Selection (if MRR based) */}
          {formData.is_mrr_based && (
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select MRR *
              </label>
              <select
                value={formData.mrr_id || 0}
                onChange={(e) => handleMrrSelection(parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 bg-white"
                required={formData.is_mrr_based}
              >
                <option value={0} className="text-gray-900">Select MRR</option>
                {mrrs.map((mrr) => (
                  <option key={mrr.mrr_id} value={mrr.mrr_id} className="text-gray-900">
                    {mrr.mrr_reference_id} - {mrr.project?.name || 'Unknown Project'}
                  </option>
                ))}
              </select>
              {formData.mrr_reference_id && (
                <p className="text-sm text-green-600 mt-1">
                  Selected MRR: {formData.mrr_reference_id}
                </p>
              )}
            </div>
          )}

          {/* Project Selection (if direct issue) */}
          {!formData.is_mrr_based && (
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Project *
              </label>
              <select
                value={formData.project_id}
                onChange={(e) => setFormData(prev => ({ ...prev, project_id: parseInt(e.target.value) }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 bg-white"
                required={!formData.is_mrr_based}
              >
                <option value={0} className="text-gray-900">Select Project</option>
                {projects.map((project) => (
                  <option key={project.project_id} value={project.project_id} className="text-gray-900">
                    {project.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Basic Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Issued To *
              </label>
              <input
                type="text"
                value={formData.issued_to}
                onChange={(e) => setFormData(prev => ({ ...prev, issued_to: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Contractor/Site name"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Issue Date
              </label>
              <input
                type="date"
                value={formData.issue_date}
                onChange={(e) => setFormData(prev => ({ ...prev, issue_date: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>
          </div>

          {/* Material Items */}
          <div className="mb-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Materials to Issue</h3>
              <button
                type="button"
                onClick={addMaterialItem}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                + Add Material
              </button>
            </div>

            <div className="space-y-4">
              {formData.items.map((item, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-4">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Material
                      </label>
                      <select
                        value={item.material_id}
                        onChange={(e) => updateMaterialItem(index, 'material_id', parseInt(e.target.value))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 bg-white"
                        required
                      >
                        <option value={0} className="text-gray-900">Select Material</option>
                        {materials.map((material) => (
                          <option key={material.material_id} value={material.material_id} className="text-gray-900">
                            {material.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Quantity
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={item.quantity_issued}
                        onChange={(e) => updateMaterialItem(index, 'quantity_issued', parseFloat(e.target.value) || 0)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        required
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Unit
                      </label>
                      <div className="px-3 py-2 bg-gray-100 rounded-lg text-gray-900">
                        {item.unit_name || 'Select material first'}
                      </div>
                    </div>
                    
                    <div>
                      <button
                        type="button"
                        onClick={() => removeMaterialItem(index)}
                        className="w-full px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                  
                  {item.material_id > 0 && (
                    <div className="mt-2 text-sm text-gray-600">
                      Available Stock: {materials.find(m => m.material_id === item.material_id)?.stock_qty || 0} {item.unit_name}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Notes
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows={3}
              placeholder="Additional notes for this material issue..."
            />
          </div>

          {/* Submit Button */}
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {loading ? 'Issuing...' : 'Issue Material'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default UnifiedMaterialIssue;
