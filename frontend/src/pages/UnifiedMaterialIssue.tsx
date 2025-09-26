import React, { useState, useEffect } from 'react';
import { 
  mrrAPI, 
  materialManagementAPI, 
  projectsAPI
} from '../services/api';

interface MrrOption {
  mrr_id: number;
  mrr_number: string;
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
  mrr_number?: string;
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
  const [materialIssues, setMaterialIssues] = useState<any[]>([]);
  const [recordsLoading, setRecordsLoading] = useState(false);
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
    loadMaterialIssues();
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

  const loadMaterialIssues = async () => {
    setRecordsLoading(true);
    try {
      const response = await materialManagementAPI.getMaterialIssues({
        include_project: true,
        include_mrr: true,
        limit: 50
      });
      setMaterialIssues(response.data.issues || []);
    } catch (error) {
      console.error('Error loading material issues:', error);
    } finally {
      setRecordsLoading(false);
    }
  };

  const handleMrrBasedToggle = (isMrrBased: boolean) => {
    setFormData(prev => ({
      ...prev,
      is_mrr_based: isMrrBased,
      mrr_id: isMrrBased ? prev.mrr_id : undefined,
      mrr_number: isMrrBased ? prev.mrr_number : undefined,
      items: []
    }));
  };

  const handleMrrSelection = (mrrId: number) => {
    const selectedMrr = mrrs.find(mrr => mrr.mrr_id === mrrId);
    if (selectedMrr) {
      setFormData(prev => ({
        ...prev,
        mrr_id: mrrId,
        mrr_number: selectedMrr.mrr_number,
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
          issued_to: formData.issued_to || '',
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
      loadMaterialIssues(); // Refresh the records
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
    <div className="space-y-8">
      <div className="text-center lg:text-left">
        <h1 className="text-4xl font-bold text-slate-900">Material Issue Management</h1>
        <p className="text-lg text-slate-600 mt-2">Issue materials based on MRR or direct project requirements</p>
      </div>

      <div className="card p-8">
        <form onSubmit={(e) => { e.preventDefault(); handleSubmit(); }}>
          {/* Issue Type Selection */}
          <div className="mb-8">
            <h3 className="text-xl font-bold text-slate-900 mb-6">Issue Type</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <label className="card-interactive p-6 cursor-pointer group">
                <div className="flex items-center space-x-4">
                  <input
                    type="radio"
                    name="issue_type"
                    checked={formData.is_mrr_based}
                    onChange={() => handleMrrBasedToggle(true)}
                    className="h-5 w-5 text-primary-600 focus:ring-primary-500"
                  />
                  <div className="h-12 w-12 bg-gradient-to-br from-primary-500 to-primary-600 rounded-xl flex items-center justify-center shadow-lg">
                    <span className="text-white text-lg">📋</span>
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 group-hover:text-primary-600 transition-colors">MRR Based Issue</h4>
                    <p className="text-sm text-slate-600">Issue materials based on approved Material Requirement Request</p>
                  </div>
                </div>
              </label>
              <label className="card-interactive p-6 cursor-pointer group">
                <div className="flex items-center space-x-4">
                  <input
                    type="radio"
                    name="issue_type"
                    checked={!formData.is_mrr_based}
                    onChange={() => handleMrrBasedToggle(false)}
                    className="h-5 w-5 text-primary-600 focus:ring-primary-500"
                  />
                  <div className="h-12 w-12 bg-gradient-to-br from-accent-500 to-accent-600 rounded-xl flex items-center justify-center shadow-lg">
                    <span className="text-white text-lg">⚡</span>
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 group-hover:text-primary-600 transition-colors">Direct Issue</h4>
                    <p className="text-sm text-slate-600">Issue materials directly without MRR approval</p>
                  </div>
                </div>
              </label>
            </div>
          </div>

          {/* MRR Selection (if MRR based) */}
          {formData.is_mrr_based && (
            <div className="mb-8">
              <label className="label label-required">
                Select MRR
              </label>
              <select
                value={formData.mrr_id || 0}
                onChange={(e) => handleMrrSelection(parseInt(e.target.value))}
                className="input"
                required={formData.is_mrr_based}
              >
                <option value={0}>Select MRR</option>
                {mrrs.map((mrr) => (
                  <option key={mrr.mrr_id} value={mrr.mrr_id}>
                    {mrr.mrr_number} - {mrr.project?.name || 'Unknown Project'}
                  </option>
                ))}
              </select>
              {formData.mrr_number && (
                <div className="mt-3 p-3 bg-success-50 border border-success-200 rounded-xl">
                  <p className="text-sm text-success-700 font-medium">
                    ✓ Selected MRR: {formData.mrr_number}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Project Selection (if direct issue) */}
          {!formData.is_mrr_based && (
            <div className="mb-8">
              <label className="label label-required">
                Project
              </label>
              <select
                value={formData.project_id}
                onChange={(e) => setFormData(prev => ({ ...prev, project_id: parseInt(e.target.value) }))}
                className="input"
                required={!formData.is_mrr_based}
              >
                <option value={0}>Select Project</option>
                {projects.map((project) => (
                  <option key={project.project_id} value={project.project_id}>
                    {project.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Basic Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div>
              <label className="label label-required">
                Issued To
              </label>
              <input
                type="text"
                value={formData.issued_to}
                onChange={(e) => setFormData(prev => ({ ...prev, issued_to: e.target.value }))}
                className="input"
                placeholder="Contractor/Site name"
                required
              />
            </div>
            
            <div>
              <label className="label">
                Issue Date
              </label>
              <input
                type="date"
                value={formData.issue_date}
                onChange={(e) => setFormData(prev => ({ ...prev, issue_date: e.target.value }))}
                className="input"
                required
              />
            </div>
          </div>

          {/* Material Items */}
          <div className="mb-8">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-slate-900">Materials to Issue</h3>
              <button
                type="button"
                onClick={addMaterialItem}
                className="btn btn-primary flex items-center shadow-lg hover:shadow-xl transition-all duration-200"
              >
                <span className="text-lg mr-2">+</span>
                Add Material
              </button>
            </div>

            <div className="space-y-6">
              {formData.items.map((item, index) => (
                <div key={index} className="card p-6">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-end">
                    <div>
                      <label className="label label-required">
                        Material
                      </label>
                      <select
                        value={item.material_id}
                        onChange={(e) => updateMaterialItem(index, 'material_id', parseInt(e.target.value))}
                        className="input"
                        required
                      >
                        <option value={0}>Select Material</option>
                        {materials.map((material) => (
                          <option key={material.material_id} value={material.material_id}>
                            {material.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    
                    <div>
                      <label className="label label-required">
                        Quantity
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={item.quantity_issued}
                        onChange={(e) => updateMaterialItem(index, 'quantity_issued', parseFloat(e.target.value) || 0)}
                        className="input"
                        required
                      />
                    </div>
                    
                    <div>
                      <label className="label">
                        Unit
                      </label>
                      <div className="px-4 py-3 bg-slate-100 rounded-xl text-slate-900 font-medium">
                        {item.unit_name || 'Select material first'}
                      </div>
                    </div>
                    
                    <div>
                      <button
                        type="button"
                        onClick={() => removeMaterialItem(index)}
                        className="btn btn-danger w-full"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                  
                  {item.material_id > 0 && (
                    <div className="mt-4 p-3 bg-slate-50 rounded-xl">
                      <p className="text-sm text-slate-600">
                        <span className="font-semibold">Available Stock:</span> {materials.find(m => m.material_id === item.material_id)?.stock_qty || 0} {item.unit_name}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div className="mb-8">
            <label className="label">
              Notes
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              className="input"
              rows={4}
              placeholder="Additional notes for this material issue..."
            />
          </div>

          {/* Submit Button */}
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary btn-lg shadow-lg hover:shadow-xl transition-all duration-200"
            >
              {loading ? (
                <>
                  <div className="loading-spinner h-4 w-4 mr-2"></div>
                  Issuing...
                </>
              ) : (
                'Issue Material'
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Material Issues Records Section */}
      <div className="card p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-slate-900">Material Issue Records</h2>
          <button
            onClick={loadMaterialIssues}
            disabled={recordsLoading}
            className="btn btn-secondary flex items-center"
          >
            {recordsLoading ? (
              <>
                <div className="loading-spinner h-4 w-4 mr-2"></div>
                Refreshing...
              </>
            ) : (
              'Refresh'
            )}
          </button>
        </div>

        {recordsLoading ? (
          <div className="flex items-center justify-center h-32">
            <div className="loading-spinner h-12 w-12"></div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    Issue ID
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    Material
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    Project
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    Quantity
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    Issue Date
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    Issued To
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    MRR Reference
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody>
                {materialIssues.map((issue) => (
                  <tr key={issue.issue_id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-slate-900">
                      #{issue.issue_id}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">
                      {issue.material?.name || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">
                      {issue.project?.name || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">
                      {issue.quantity_issued} {issue.material?.unit || ''}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">
                      {new Date(issue.issue_date).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">
                      {issue.issued_to || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">
                      {issue.mrr?.mrr_number ? (
                        <span className="status-badge status-active">
                          {issue.mrr.mrr_number}
                        </span>
                      ) : (
                        <span className="text-slate-400">Direct Issue</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`status-badge ${
                        issue.status === 'ISSUED' ? 'status-success' :
                        issue.status === 'PENDING' ? 'status-pending' :
                        issue.status === 'CANCELLED' ? 'status-danger' :
                        'status-secondary'
                      }`}>
                        {issue.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            
            {materialIssues.length === 0 && (
              <div className="text-center py-12">
                <div className="h-16 w-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl text-slate-400">📦</span>
                </div>
                <p className="text-slate-500 font-medium">No material issues found</p>
                <p className="text-sm text-slate-400 mt-1">Material issues will appear here once created</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default UnifiedMaterialIssue;
