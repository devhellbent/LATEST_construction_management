import React, { useState, useEffect } from 'react';
import { 
  commercialAPI, 
  materialsAPI, 
  projectsAPI 
} from '../services/api';
import { useAuth } from '../contexts/AuthContext';

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
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<ReturnFormData>({
    issue_id: 0,
    project_id: 0,
    return_date: new Date().toISOString().split('T')[0],
    returned_by: '',
    notes: '',
    items: []
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [issuesRes, projectsRes] = await Promise.all([
        commercialAPI.getMaterialIssues({ 
          status: 'ISSUED',
          include_project: true,
          include_mrr: true
        }),
        projectsAPI.getProjects()
      ]);

      setMaterialIssues(issuesRes.data.issues || []);
      setProjects(projectsRes.data.projects || []);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
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
    if (!formData.issue_id || !formData.returned_by || formData.items.length === 0) {
      alert('Please fill in all required fields');
      return;
    }

    setLoading(true);
    try {
      // Transform data to match the backend API expectations
      const returnData = {
        project_id: formData.project_id,
        material_return_id: `MR${Date.now()}`, // Generate unique ID
        return_from: 'Project Site',
        return_to_inventory: 'Main Warehouse',
        checked_by: user?.user_id || 1, // Use current user ID
        materials: formData.items
          .filter(item => item.quantity_returned > 0)
          .map(item => ({
            material_id: item.item_id,
            quantity: item.quantity_returned,
            condition_status: item.quality_status
          })),
        tags: '',
        remarks: formData.notes
      };

      console.log('Sending return data:', returnData);
      await commercialAPI.createMaterialReturn(returnData);

      alert('Material return recorded successfully!');
      setFormData({
        issue_id: 0,
        project_id: 0,
        return_date: new Date().toISOString().split('T')[0],
        returned_by: '',
        notes: '',
        items: []
      });
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
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Material Return Management</h1>
        <p className="text-gray-600 mt-2">Record material returns from sites and contractors</p>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6">
        <form onSubmit={(e) => { e.preventDefault(); handleSubmit(); }}>
          {/* Issue Selection */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Material Issue *
            </label>
            <select
              value={formData.issue_id}
              onChange={(e) => handleIssueSelection(parseInt(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Returned By *
              </label>
              <input
                type="text"
                value={formData.returned_by}
                onChange={(e) => setFormData(prev => ({ ...prev, returned_by: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Contractor/Site name"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Return Date
              </label>
              <input
                type="date"
                value={formData.return_date}
                onChange={(e) => setFormData(prev => ({ ...prev, return_date: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>
          </div>

          {/* Return Items */}
          {formData.items.length > 0 && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Return Details</h3>
              <div className="space-y-4">
                {formData.items.map((item, index) => {
                  const issue = materialIssues.find(i => i.issue_id === item.issue_id);
                  return (
                    <div key={index} className="border border-gray-200 rounded-lg p-4">
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
                        <div>
                          <h4 className="font-medium text-gray-900">{issue?.material.name}</h4>
                          <p className="text-sm text-gray-600">
                            Issued: {issue?.quantity_issued} {issue?.unit_name}
                          </p>
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Quantity Returned
                          </label>
                          <input
                            type="number"
                            min="0"
                            max={issue?.quantity_issued || 0}
                            value={item.quantity_returned}
                            onChange={(e) => updateReturnItem('quantity_returned', parseFloat(e.target.value) || 0)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            required
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Quality Status
                          </label>
                          <select
                            value={item.quality_status}
                            onChange={(e) => updateReturnItem('quality_status', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          >
                            <option value="GOOD">Good</option>
                            <option value="DAMAGED">Damaged</option>
                            <option value="DEFECTIVE">Defective</option>
                          </select>
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Remarks
                          </label>
                          <input
                            type="text"
                            value={item.remarks}
                            onChange={(e) => updateReturnItem('remarks', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              General Notes
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows={3}
              placeholder="Additional notes about the return..."
            />
          </div>

          {/* Submit Button */}
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors disabled:opacity-50"
            >
              {loading ? 'Recording...' : 'Record Return'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default MaterialReturn;
