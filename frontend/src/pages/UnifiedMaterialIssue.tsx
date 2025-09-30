import React, { useState, useEffect } from 'react';
import { 
  mrrAPI, 
  materialManagementAPI, 
  projectsAPI,
  subcontractorsAPI
} from '../services/api';
import SearchableDropdown from '../components/SearchableDropdown';

interface MrrOption {
  mrr_id: number;
  mrr_number: string;
  project_id: number;
  project: {
    name: string;
  };
  status: string;
  component_id?: number;
  subcontractor_id?: number;
  component?: {
    component_id: number;
    component_name: string;
    component_type: string;
  };
  subcontractor?: {
    subcontractor_id: number;
    company_name: string;
    work_type: string;
  };
  items: Array<{
    mrr_item_id: number;
    item_id: number;
    quantity_requested: number;
    unit_id: number;
    item: {
      item_id: number;
      item_name: string;
      item_code: string;
    };
    unit: {
      unit_id: number;
      unit_name: string;
      unit_symbol: string;
    };
    available_stock?: number;
    warehouse_breakdown?: Array<{
      warehouse_name: string;
      stock_qty: number;
    }>;
  }>;
}

interface MaterialItem {
  material_id: number;
  name: string;
  size?: string;
  unit: string;
  stock_qty: number;
  warehouse_id?: number;
  warehouse?: {
    warehouse_id: number;
    warehouse_name: string;
  };
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
  component_id: number;
  subcontractor_id: number;
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
    warehouse_id?: number;
    warehouse_name?: string;
  }>;
}

const UnifiedMaterialIssue: React.FC = () => {
  const [mrrs, setMrrs] = useState<MrrOption[]>([]);
  const [materials, setMaterials] = useState<MaterialItem[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [components, setComponents] = useState<any[]>([]);
  const [subcontractors, setSubcontractors] = useState<any[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [materialIssues, setMaterialIssues] = useState<any[]>([]);
  const [recordsLoading, setRecordsLoading] = useState(false);
  const [formData, setFormData] = useState<IssueFormData>({
    project_id: 0,
    component_id: 0,
    subcontractor_id: 0,
    issue_date: new Date().toISOString().split('T')[0],
    notes: '',
    // Direct Issue temporarily disabled; keep MRR-based flow only
    is_mrr_based: true,
    items: []
  });

  useEffect(() => {
    loadData();
    loadMaterialIssues();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [mrrsRes, materialsRes, projectsRes, subcontractorsRes, warehousesRes] = await Promise.all([
        // Fetch MRRs without restricting by status; we'll filter client-side
        mrrAPI.getMrrs({ 
          include_items: true,
          include_project: true
        }),
        materialManagementAPI.getInventory(),
        projectsAPI.getProjects(),
        import('../services/api').then(api => api.subcontractorsAPI.getSubcontractors()),
        materialManagementAPI.getWarehouses()
      ]);

      // Process MRRs with stock information
      const allowedStatuses = ['APPROVED', 'PROCESSING', 'COMPLETED'];
      const filteredMrrs = (mrrsRes.data.mrrs || []).filter((m: any) => allowedStatuses.includes(m.status));
      const mrrsWithStock = await Promise.all(
        filteredMrrs.map(async (mrr: any) => {
          const itemsWithStock = await Promise.all(
            mrr.items.map(async (item: any) => {
              try {
                // Find all materials with this item_id and sum their stock
                const materialsForItem = materialsRes.data.materials.filter((m: any) => m.item?.item_id === item.item_id);
                const totalStock = materialsForItem.reduce((sum: number, material: any) => sum + (material.stock_qty || 0), 0);
                const warehouseInfo = materialsForItem.map((m: any) => ({
                  warehouse_name: m.warehouse?.warehouse_name || 'Unknown Warehouse',
                  stock_qty: m.stock_qty || 0
                }));
                
                return {
                  ...item,
                  available_stock: totalStock,
                  warehouse_breakdown: warehouseInfo
                };
              } catch {
                return { ...item, available_stock: 0, warehouse_breakdown: [] };
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
      setSubcontractors(subcontractorsRes.data.subcontractors || []);
      setWarehouses(warehousesRes.data.warehouses || []);
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
        include_subcontractor: true,
        include_warehouse: true,
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

  const loadComponents = async (projectId: number) => {
    try {
      const response = await projectsAPI.getProjectComponents(projectId);
      setComponents(response.data.data?.components || []);
    } catch (error) {
      console.error('Error loading components:', error);
      setComponents([]);
    }
  };

  const loadSubcontractors = async (projectId: number) => {
    try {
      const response = await subcontractorsAPI.getSubcontractorsByProject(projectId);
      setSubcontractors(response.data.data?.subcontractors || []);
    } catch (error) {
      console.error('Error loading subcontractors:', error);
      setSubcontractors([]);
    }
  };

  const handleMrrSelection = async (mrrId: number) => {
    const selectedMrr = mrrs.find(mrr => mrr.mrr_id === mrrId);
    if (selectedMrr) {
      // Load components and subcontractors for the project
      if (selectedMrr.project_id) {
        await loadComponents(selectedMrr.project_id);
        await loadSubcontractors(selectedMrr.project_id);
      }
      
      // Convert MRR items to material issue items
      console.log('Selected MRR:', selectedMrr);
      console.log('MRR items:', selectedMrr.items);
      console.log('Available materials:', materials);
      
      const mrrItems = selectedMrr.items.map(item => {
        // Find the actual material ID for this item
        const material = materials.find(m => m.item?.item_id === item.item.item_id);
        console.log(`Looking for material with item_id ${item.item.item_id}:`, material);
        
        // If no material found, use the first available material for this item
        let materialId = material?.material_id;
        if (!materialId) {
          const firstMaterial = materials.find(m => m.item?.item_id === item.item.item_id);
          materialId = firstMaterial?.material_id || item.item.item_id; // Fallback to item_id
        }
        
        return {
          material_id: materialId,
          quantity_issued: Math.min(item.quantity_requested, item.available_stock || 0),
          item_name: item.item.item_name,
          unit_name: item.unit.unit_name,
          warehouse_id: material?.warehouse_id,
          warehouse_name: material?.warehouse?.warehouse_name
        };
      });
      
      console.log('MRR items before filtering:', mrrItems);
      // Temporarily remove filter to see all items
      const filteredMrrItems = mrrItems; // .filter(item => item.material_id > 0);
      console.log('MRR items after filtering (no filter):', filteredMrrItems);

      setFormData(prev => ({
        ...prev,
        mrr_id: mrrId,
        mrr_number: selectedMrr.mrr_number,
        project_id: selectedMrr.project_id,
        component_id: selectedMrr.component_id || 0,
        subcontractor_id: selectedMrr.subcontractor_id || 0,
        items: filteredMrrItems
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
        unit_name: '',
        warehouse_id: 0,
        warehouse_name: ''
      }]
    }));
  };

  const updateMaterialItem = (index: number, field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.map((item, i) => {
        if (i === index) {
            if (field === 'material_id') {
              let itemName = '';
              let unitName = '';
              let warehouseId = 0;
              let warehouseName = '';
              
              if (formData.is_mrr_based && formData.mrr_id) {
                // For MRR-based issues, get item info from materials using material_id
                const selectedMaterial = materials.find(m => m.material_id === value);
                if (selectedMaterial) {
                  itemName = selectedMaterial.item?.item_name || selectedMaterial.name || '';
                  unitName = selectedMaterial.item?.unit?.unit_name || selectedMaterial.unit || '';
                  warehouseId = selectedMaterial.warehouse_id || 0;
                  warehouseName = selectedMaterial.warehouse?.warehouse_name || '';
                }
              } else {
                // For non-MRR issues, get item info from materials
                const selectedMaterial = materials.find(m => m.material_id === value);
                itemName = selectedMaterial?.item?.item_name || selectedMaterial?.name || '';
                unitName = selectedMaterial?.item?.unit?.unit_name || selectedMaterial?.unit || '';
                warehouseId = selectedMaterial?.warehouse_id || 0;
                warehouseName = selectedMaterial?.warehouse?.warehouse_name || '';
              }
              
              return {
                ...item,
                material_id: value,
                item_name: itemName,
                unit_name: unitName,
                warehouse_id: warehouseId,
                warehouse_name: warehouseName
              };
            }
            if (field === 'warehouse_id') {
              const selectedWarehouse = warehouses.find(w => w.warehouse_id === value);
              return {
                ...item,
                warehouse_id: value,
                warehouse_name: selectedWarehouse?.warehouse_name || ''
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
    if (!formData.project_id) {
      alert('Please select a project');
      return;
    }
    
    // Check if there are any items with material selected
    console.log('Form data items for validation:', formData.items);
    const hasValidItems = formData.items.some(item => {
      console.log('Checking item:', { material_id: item.material_id, item_name: item.item_name });
      return item.material_id && item.material_id > 0;
    });
    console.log('Has valid items:', hasValidItems);
    if (!hasValidItems) {
      alert('Please add at least one material item');
      return;
    }

    if (formData.is_mrr_based && !formData.mrr_id) {
      alert('Please select an MRR');
      return;
    }

    // Validate each material item
    for (let i = 0; i < formData.items.length; i++) {
      const item = formData.items[i];
      console.log(`Validating item ${i + 1}:`, { material_id: item.material_id, item_name: item.item_name });
      
      // Skip validation for empty items (no material selected and no quantity)
      if ((!item.material_id || item.material_id === 0) && (!item.quantity_issued || item.quantity_issued === 0)) {
        continue;
      }
      
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
          is_for_mrr: Boolean(formData.is_mrr_based),
          component_id: formData.component_id,
          subcontractor_id: formData.subcontractor_id,
          warehouse_id: item.warehouse_id || null
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
        component_id: 0,
        subcontractor_id: 0,
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

      <div className="card p-4 sm:p-8">
        <form onSubmit={(e) => { e.preventDefault(); handleSubmit(); }}>
          {/* Issue Type Selection */}
          <div className="mb-8">
            <h3 className="text-xl font-bold text-slate-900 mb-6">Issue Type</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
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
              {/**
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
              **/}
            </div>
          </div>

          {/* MRR Selection (if MRR based) */}
          {formData.is_mrr_based && (
            <div className="mb-8">
              <label className="label label-required">
                Select MRR
              </label>
              <SearchableDropdown
                options={mrrs.map((mrr) => ({
                  value: mrr.mrr_id.toString(),
                  label: `${mrr.mrr_number} - ${mrr.project?.name || 'Unknown Project'}`,
                  searchText: `${mrr.mrr_number} ${mrr.project?.name || 'Unknown Project'}`
                }))}
                value={formData.mrr_id || 0}
                onChange={(value) => handleMrrSelection(parseInt(value.toString()))}
                placeholder="Select MRR"
                searchPlaceholder="Search MRRs..."
                className="w-full"
                required={formData.is_mrr_based}
              />
              {formData.mrr_number && (
                <div className="mt-3 p-3 bg-success-50 border border-success-200 rounded-xl">
                  <p className="text-sm text-success-700 font-medium">
                    ✓ Selected MRR: {formData.mrr_number}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Project Selection (if direct issue) - temporarily disabled */}
          {false && !formData.is_mrr_based && (
            <div className="mb-8">
              <label className="label label-required">
                Project
              </label>
              <SearchableDropdown
                options={projects.map((project) => ({
                  value: project.project_id.toString(),
                  label: project.name,
                  searchText: project.name
                }))}
                value={formData.project_id}
                onChange={(value) => setFormData(prev => ({ ...prev, project_id: parseInt(value.toString()) }))}
                placeholder="Select Project"
                searchPlaceholder="Search projects..."
                className="w-full"
                required={!formData.is_mrr_based}
              />
            </div>
          )}

          {/* Basic Information */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 mb-8">
            {/* Project (prefilled from MRR) */}
            {formData.is_mrr_based && (
              <div>
                <label className="label">
                  Project
                </label>
                <input
                  type="text"
                  value={projects.find(p => p.project_id === formData.project_id)?.name || ''}
                  className="input bg-gray-100"
                  readOnly
                />
                <p className="text-sm text-gray-500 mt-1">Prefilled from MRR</p>
              </div>
            )}

            {/* Subcontractor (prefilled from MRR) */}
            {formData.is_mrr_based && (
              <div>
                <label className="label">
                  Subcontractor
                </label>
                <input
                  type="text"
                  value={subcontractors.find(s => s.subcontractor_id === formData.subcontractor_id)?.company_name || ''}
                  className="input bg-gray-100"
                  readOnly
                />
                <p className="text-sm text-gray-500 mt-1">Prefilled from MRR</p>
              </div>
            )}

            {/* Project Component (prefilled from MRR) */}
            {formData.is_mrr_based && (
              <div>
                <label className="label">
                  Project Component
                </label>
                <input
                  type="text"
                  value={components.find(c => c.component_id === formData.component_id)?.component_name || ''}
                  className="input bg-gray-100"
                  readOnly
                />
                <p className="text-sm text-gray-500 mt-1">Prefilled from MRR</p>
              </div>
            )}
            
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
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-6">
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

            <div className="space-y-4 sm:space-y-6">
              {formData.items.map((item, index) => (
                <div key={index} className="card p-4 sm:p-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 sm:gap-6 items-end">
                    <div>
                      <label className="label label-required">
                        Material
                      </label>
                      <SearchableDropdown
                        options={formData.is_mrr_based && formData.mrr_id ? (
                          // Show only MRR items when MRR is selected
                          mrrs.find(mrr => mrr.mrr_id === formData.mrr_id)?.items.map((mrrItem) => {
                            const material = materials.find(m => m.item?.item_id === mrrItem.item.item_id);
                            // Use material_id if found, otherwise use item_id as fallback
                            const materialId = material?.material_id || mrrItem.item.item_id;
                            return {
                              value: materialId.toString(),
                              label: mrrItem.item.item_name,
                              searchText: mrrItem.item.item_name,
                              material_id: materialId
                            };
                          }) || []
                        ) : (
                          // Show all materials when not MRR-based
                          materials.map((material) => ({
                            value: material.material_id.toString(),
                            label: material.item?.item_name || material.name,
                            searchText: material.item?.item_name || material.name
                          }))
                        )}
                        value={item.material_id?.toString() || ''}
                        onChange={(value) => {
                          console.log('Material selection changed:', { value, parsed: parseInt(value.toString()) });
                          updateMaterialItem(index, 'material_id', parseInt(value.toString()));
                        }}
                        placeholder="Select Material"
                        searchPlaceholder="Search materials..."
                        className="w-full"
                        required
                      />
                    </div>
                    
                    <div>
                      <label className="label label-required">
                        Warehouse
                      </label>
                      <SearchableDropdown
                        options={warehouses.map((warehouse) => ({
                          value: warehouse.warehouse_id.toString(),
                          label: warehouse.warehouse_name,
                          searchText: warehouse.warehouse_name
                        }))}
                        value={item.warehouse_id?.toString() || ''}
                        onChange={(value) => updateMaterialItem(index, 'warehouse_id', parseInt(value.toString()))}
                        placeholder="Select Warehouse"
                        searchPlaceholder="Search warehouses..."
                        className="w-full"
                        required
                      />
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
                      <div className="px-4 py-3 bg-slate-100 rounded-xl text-slate-900 font-medium break-words">
                        {item.unit_name || materials.find(m => m.material_id === item.material_id)?.item?.unit?.unit_name || 'Select material first'}
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
                      {formData.is_mrr_based && formData.mrr_id ? (
                        // Show warehouse breakdown for MRR-based issues
                        (() => {
                          const selectedMrr = mrrs.find(mrr => mrr.mrr_id === formData.mrr_id);
                          const mrrItem = selectedMrr?.items.find(mrrItem => mrrItem.item.item_id === item.material_id);
                          const warehouseBreakdown = mrrItem?.warehouse_breakdown || [];
                          
                          return (
                            <div>
                              <p className="text-sm text-slate-600 mb-2">
                                <span className="font-semibold">Total Available Stock:</span> {mrrItem?.available_stock || 0} {item.unit_name || ''}
                              </p>
                              {warehouseBreakdown.length > 0 && (
                                <div className="space-y-1">
                                  <p className="text-xs font-semibold text-slate-500">Warehouse Breakdown:</p>
                                  {warehouseBreakdown.map((warehouse: any, idx: number) => (
                                    <p key={idx} className="text-xs text-slate-500 ml-2">
                                      • {warehouse.warehouse_name}: {warehouse.stock_qty} {item.unit_name || ''}
                                    </p>
                                  ))}
                                </div>
                              )}
                            </div>
                          );
                        })()
                      ) : (
                        // Show warehouse-specific stock for non-MRR issues
                        (() => {
                          const selectedMaterial = materials.find(m => m.material_id === item.material_id);
                          const warehouseStock = item.warehouse_id ? 
                            materials.find(m => m.material_id === item.material_id && m.warehouse_id === item.warehouse_id)?.stock_qty || 0 :
                            selectedMaterial?.stock_qty || 0;
                          
                          return (
                            <div>
                              <p className="text-sm text-slate-600">
                                <span className="font-semibold">Available Stock:</span> {warehouseStock} {item.unit_name || selectedMaterial?.item?.unit?.unit_name || ''}
                              </p>
                              {item.warehouse_name && (
                                <p className="text-xs text-slate-500 mt-1">
                                  <span className="font-semibold">Warehouse:</span> {item.warehouse_name}
                                </p>
                              )}
                            </div>
                          );
                        })()
                      )}
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
                    Warehouse
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
                      {issue.subcontractor?.company_name || (
                        <span className="text-slate-400">N/A</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">
                      {issue.warehouse?.warehouse_name || (
                        <span className="text-slate-400">N/A</span>
                      )}
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
