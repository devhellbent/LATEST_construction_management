import React, { useState, useEffect } from 'react';
import { 
  commercialAPI, 
  materialsAPI, 
  projectsAPI,
  materialManagementAPI
} from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { RefreshCw, PackageX } from 'lucide-react';

interface MaterialIssue {
  issue_id: number;
  issue_reference_id: string;
  project_id: number;
  project_name: string;
  material_id: number;
  material: {
    material_id: number;
    name: string;
    type: string;
    unit: string;
  };
  quantity_issued: number;
  unit_name: string;
  issue_date: string;
  issued_to: string;
  mrr_id?: number;
  mrr_number?: string;
}

interface ReturnFormData {
  issue_id: number;
  project_id: number;
  return_date: string;
  returned_by: string;
  warehouse_id: number;
  notes: string;
  items: Array<{
    issue_id: number;
    item_id: number;
    quantity_returned: number;
    unit_id: number;
    quality_status: 'GOOD' | 'DAMAGED' | 'DEFECTIVE';
    remarks: string;
  }>;
}

const MaterialReturn: React.FC = () => {
  const { user } = useAuth();
  const [materialIssues, setMaterialIssues] = useState<MaterialIssue[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [materialReturns, setMaterialReturns] = useState<any[]>([]);
  const [recordsLoading, setRecordsLoading] = useState(false);
  const [formData, setFormData] = useState<ReturnFormData>({
    issue_id: 0,
    project_id: 0,
    return_date: new Date().toISOString().split('T')[0],
    returned_by: '',
    warehouse_id: 0,
    notes: '',
    items: []
  });

  useEffect(() => {
    loadData();
    loadMaterialReturns();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [issuesRes, projectsRes, warehousesRes] = await Promise.all([
        commercialAPI.getMaterialIssues({ 
          status: 'ISSUED',
          include_project: true,
          include_mrr: true
        }),
        projectsAPI.getProjects(),
        materialManagementAPI.getWarehouses()
      ]);

      setMaterialIssues(issuesRes.data.issues || []);
      setProjects(projectsRes.data.projects || []);
      setWarehouses(warehousesRes.data.warehouses || []);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadMaterialReturns = async () => {
    setRecordsLoading(true);
    try {
      const response = await materialManagementAPI.getMaterialReturns({
        include_project: true,
        limit: 50
      });
      setMaterialReturns(response.data.returns || []);
    } catch (error) {
      console.error('Error loading material returns:', error);
    } finally {
      setRecordsLoading(false);
    }
  };

  const handleIssueSelection = (issueId: number) => {
    const selectedIssue = materialIssues.find(issue => issue.issue_id === issueId);
    if (selectedIssue) {
      setFormData(prev => ({
        ...prev,
        issue_id: issueId,
        project_id: selectedIssue.project_id,
        items: [{
          issue_id: issueId,
          item_id: selectedIssue.material_id,
          quantity_returned: selectedIssue.quantity_issued,
          unit_id: 1, // This should come from the issue data
          quality_status: 'GOOD' as const,
          remarks: ''
        }]
      }));
    }
  };

  const updateReturnItem = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.map(item => ({ ...item, [field]: value }))
    }));
  };

  const handleSubmit = async () => {
    if (!formData.issue_id || !formData.returned_by || !formData.warehouse_id || formData.items.length === 0) {
      alert('Please fill in all required fields including warehouse selection');
      return;
    }

    setLoading(true);
    try {
      // Transform data to match the backend API expectations
      const returnData = {
        project_id: formData.project_id,
        material_id: formData.items[0].item_id,
        quantity: formData.items[0].quantity_returned,
        return_date: formData.return_date,
        return_reason: formData.notes,
        returned_by: formData.returned_by,
        condition_status: formData.items[0].quality_status,
        returned_by_user_id: user?.user_id || 1,
        issue_id: formData.issue_id,
        warehouse_id: formData.warehouse_id
      };

      console.log('Sending return data:', returnData);
      await materialManagementAPI.createMaterialReturn(returnData);

      alert('Material return recorded successfully!');
      setFormData({
        issue_id: 0,
        project_id: 0,
        return_date: new Date().toISOString().split('T')[0],
        returned_by: '',
        warehouse_id: 0,
        notes: '',
        items: []
      });
      loadMaterialReturns(); // Refresh the records
      loadData();
    } catch (error) {
      console.error('Error recording return:', error);
      alert('Error recording material return');
    } finally {
      setLoading(false);
    }
  };

  if (loading && materialIssues.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="text-center lg:text-left">
        <h1 className="text-4xl font-bold text-slate-900">Material Return Management</h1>
        <p className="text-lg text-slate-600 mt-2">Record material returns from sites and contractors</p>
      </div>

      <div className="card p-8">
        <form onSubmit={(e) => { e.preventDefault(); handleSubmit(); }}>
          {/* Issue Selection */}
          <div className="mb-8">
            <label className="label label-required">
              Select Material Issue
            </label>
            <select
              value={formData.issue_id}
              onChange={(e) => handleIssueSelection(parseInt(e.target.value))}
              className="input"
              required
            >
              <option value={0}>Select Material Issue</option>
              {materialIssues.map((issue) => (
                <option key={issue.issue_id} value={issue.issue_id}>
                  Issue #{issue.issue_id} - {issue.material.name} ({issue.quantity_issued} {issue.unit_name}) - {issue.project_name}
                  {issue.mrr_number && ` - MRR: ${issue.mrr_number}`}
                </option>
              ))}
            </select>
          </div>

          {/* Basic Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div>
              <label className="label label-required">
                Returned By
              </label>
              <input
                type="text"
                value={formData.returned_by}
                onChange={(e) => setFormData(prev => ({ ...prev, returned_by: e.target.value }))}
                className="input"
                placeholder="Contractor/Site name"
                required
              />
            </div>
            
            <div>
              <label className="label label-required">
                Warehouse Location
              </label>
              <select
                value={formData.warehouse_id}
                onChange={(e) => setFormData(prev => ({ ...prev, warehouse_id: parseInt(e.target.value) }))}
                className="input"
                required
              >
                <option value={0}>Select Warehouse</option>
                {warehouses.map((warehouse) => (
                  <option key={warehouse.warehouse_id} value={warehouse.warehouse_id}>
                    {warehouse.warehouse_name} - {warehouse.address}
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="label">
                Return Date
              </label>
              <input
                type="date"
                value={formData.return_date}
                onChange={(e) => setFormData(prev => ({ ...prev, return_date: e.target.value }))}
                className="input"
                required
              />
            </div>
          </div>

          {/* Return Items */}
          {formData.items.length > 0 && (
            <div className="mb-8">
              <h3 className="text-xl font-bold text-slate-900 mb-6">Return Details</h3>
              <div className="space-y-6">
                {formData.items.map((item, index) => {
                  const issue = materialIssues.find(i => i.issue_id === item.issue_id);
                  return (
                    <div key={index} className="card p-6">
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-center">
                        <div>
                          <h4 className="font-bold text-slate-900">{issue?.material.name}</h4>
                          <p className="text-sm text-slate-600">
                            Issued: {issue?.quantity_issued} {issue?.unit_name}
                          </p>
                        </div>
                        
                        <div>
                          <label className="label">
                            Quantity Returned
                          </label>
                          <input
                            type="number"
                            min="0"
                            max={issue?.quantity_issued || 0}
                            value={item.quantity_returned}
                            onChange={(e) => updateReturnItem('quantity_returned', parseFloat(e.target.value) || 0)}
                            className="input"
                            required
                          />
                        </div>
                        
                        <div>
                          <label className="label">
                            Quality Status
                          </label>
                          <select
                            value={item.quality_status}
                            onChange={(e) => updateReturnItem('quality_status', e.target.value)}
                            className="input"
                          >
                            <option value="GOOD">Good</option>
                            <option value="DAMAGED">Damaged</option>
                            <option value="DEFECTIVE">Defective</option>
                          </select>
                        </div>
                        
                        <div>
                          <label className="label">
                            Remarks
                          </label>
                          <input
                            type="text"
                            value={item.remarks}
                            onChange={(e) => updateReturnItem('remarks', e.target.value)}
                            className="input"
                            placeholder="Quality notes"
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Notes */}
          <div className="mb-8">
            <label className="label">
              General Notes
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              className="input"
              rows={4}
              placeholder="Additional notes about the return..."
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
                  Recording...
                </>
              ) : (
                'Record Return'
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Material Returns Records Section */}
      <div className="mt-8 card p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Material Return Records</h2>
            <p className="text-slate-600 mt-1">View and manage all material return records</p>
          </div>
          <button
            onClick={loadMaterialReturns}
            disabled={recordsLoading}
            className="btn btn-secondary flex items-center"
          >
            {recordsLoading ? (
              <div className="loading-spinner h-4 w-4 mr-2"></div>
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            Refresh
          </button>
        </div>

        {recordsLoading ? (
          <div className="flex items-center justify-center h-32">
            <div className="loading-spinner h-12 w-12"></div>
            <p className="text-slate-600 font-medium ml-4">Loading records...</p>
          </div>
        ) : materialReturns.length === 0 ? (
          <div className="text-center py-12">
            <div className="h-16 w-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <PackageX className="h-8 w-8 text-slate-400" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-2">No Material Returns Found</h3>
            <p className="text-slate-600 max-w-md mx-auto">
              No material return records have been created yet. Create your first return above.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Return ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Material
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Project
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Quantity
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Return Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Condition
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Returned By
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Warehouse
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    On Behalf Of Material Issue
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {materialReturns.map((returnItem) => (
                  <tr key={returnItem.return_id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      #{returnItem.return_id}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {returnItem.material?.name || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {returnItem.project?.name || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {returnItem.quantity} {returnItem.material?.unit || ''}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(returnItem.return_date).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        returnItem.condition_status === 'GOOD' ? 'bg-green-100 text-green-800' :
                        returnItem.condition_status === 'DAMAGED' ? 'bg-yellow-100 text-yellow-800' :
                        returnItem.condition_status === 'DEFECTIVE' ? 'bg-red-100 text-red-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {returnItem.condition_status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {returnItem.returned_by || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {returnItem.warehouse ? (
                        <div>
                          <div className="font-medium">{returnItem.warehouse.warehouse_name}</div>
                          <div className="text-xs text-gray-500">{returnItem.warehouse.address}</div>
                        </div>
                      ) : (
                        <span className="text-gray-400">N/A</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {returnItem.material_issue ? (
                        <div>
                          <div className="font-medium">Issue #{returnItem.material_issue.issue_id}</div>
                          <div className="text-xs text-gray-500">
                            Date: {new Date(returnItem.material_issue.issue_date).toLocaleDateString()}
                          </div>
                          <div className="text-xs text-gray-500">
                            Qty: {returnItem.material_issue.quantity_issued}
                          </div>
                          <div className="text-xs text-gray-500">
                            Issued to: {returnItem.material_issue.issued_to || 'N/A'}
                          </div>
                          {returnItem.material_issue.issue_purpose && (
                            <div className="text-xs text-gray-500">
                              Purpose: {returnItem.material_issue.issue_purpose}
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-gray-400">Direct Return</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            
            {materialReturns.length === 0 && (
              <div className="text-center py-8">
                <p className="text-gray-500">No material returns found.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default MaterialReturn;
