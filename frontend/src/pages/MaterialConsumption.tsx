import React, { useState, useEffect } from 'react';
import { 
  commercialAPI, 
  materialsAPI, 
  projectsAPI 
} from '../services/api';
import { 
  Package, 
  Calendar, 
  User, 
  FileText, 
  CheckCircle, 
  AlertTriangle, 
  TrendingDown, 
  Trash2, 
  Plus,
  RefreshCw,
  Activity
} from 'lucide-react';

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

interface ConsumptionFormData {
  issue_id: number;
  project_id: number;
  consumption_date: string;
  consumed_by: string;
  notes: string;
  items: Array<{
    issue_id: number;
    item_id: number;
    quantity_consumed: number;
    unit_id: number;
    consumption_type: 'ACTUAL' | 'WASTAGE' | 'THEFT' | 'DAMAGE';
    remarks: string;
  }>;
}

const MaterialConsumption: React.FC = () => {
  const [materialIssues, setMaterialIssues] = useState<MaterialIssue[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<ConsumptionFormData>({
    issue_id: 0,
    project_id: 0,
    consumption_date: new Date().toISOString().split('T')[0],
    consumed_by: '',
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
          quantity_consumed: selectedIssue.quantity_issued,
          unit_id: 1, // This should come from the issue data
          consumption_type: 'ACTUAL' as const,
          remarks: ''
        }]
      }));
    }
  };

  const updateConsumptionItem = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.map(item => ({ ...item, [field]: value }))
    }));
  };

  const handleSubmit = async () => {
    if (!formData.issue_id || !formData.consumed_by || formData.items.length === 0) {
      alert('Please fill in all required fields');
      return;
    }

    setLoading(true);
    try {
      await commercialAPI.createMaterialConsumption({
        issue_id: formData.issue_id,
        project_id: formData.project_id,
        consumption_date: formData.consumption_date,
        consumed_by: formData.consumed_by,
        notes: formData.notes,
        items: formData.items.filter(item => item.quantity_consumed > 0)
      });

      alert('Material consumption recorded successfully!');
      setFormData({
        issue_id: 0,
        project_id: 0,
        consumption_date: new Date().toISOString().split('T')[0],
        consumed_by: '',
        notes: '',
        items: []
      });
      loadData();
    } catch (error) {
      console.error('Error recording consumption:', error);
      alert('Error recording material consumption');
    } finally {
      setLoading(false);
    }
  };

  if (loading && materialIssues.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="loading-spinner h-12 w-12"></div>
        <span className="text-slate-600 font-medium ml-4">Loading material issues...</span>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-4xl font-bold text-slate-900">Material Consumption Management</h1>
          <p className="text-lg text-slate-600 mt-2">Record material consumption and track usage patterns</p>
        </div>
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
                Consumed By
              </label>
              <input
                type="text"
                value={formData.consumed_by}
                onChange={(e) => setFormData(prev => ({ ...prev, consumed_by: e.target.value }))}
                className="input"
                placeholder="Contractor/Site name"
                required
              />
            </div>
            
            <div>
              <label className="label">
                Consumption Date
              </label>
              <input
                type="date"
                value={formData.consumption_date}
                onChange={(e) => setFormData(prev => ({ ...prev, consumption_date: e.target.value }))}
                className="input"
                required
              />
            </div>
          </div>

          {/* Consumption Items */}
          {formData.items.length > 0 && (
            <div className="mb-8">
              <h3 className="text-xl font-bold text-slate-900 mb-6">Consumption Details</h3>
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
                          <label className="label label-required">
                            Quantity Consumed
                          </label>
                          <input
                            type="number"
                            min="0"
                            max={issue?.quantity_issued || 0}
                            value={item.quantity_consumed}
                            onChange={(e) => updateConsumptionItem('quantity_consumed', parseFloat(e.target.value) || 0)}
                            className="input"
                            required
                          />
                        </div>
                        
                        <div>
                          <label className="label">
                            Consumption Type
                          </label>
                          <select
                            value={item.consumption_type}
                            onChange={(e) => updateConsumptionItem('consumption_type', e.target.value)}
                            className="input"
                          >
                            <option value="ACTUAL">Actual Usage</option>
                            <option value="WASTAGE">Wastage</option>
                            <option value="THEFT">Theft</option>
                            <option value="DAMAGE">Damage</option>
                          </select>
                        </div>
                        
                        <div>
                          <label className="label">
                            Remarks
                          </label>
                          <input
                            type="text"
                            value={item.remarks}
                            onChange={(e) => updateConsumptionItem('remarks', e.target.value)}
                            className="input"
                            placeholder="Usage details"
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
              placeholder="Additional notes about the consumption..."
            />
          </div>

          {/* Submit Button */}
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={loading}
              className="btn btn-success btn-lg shadow-lg hover:shadow-xl transition-all duration-200"
            >
              {loading ? (
                <>
                  <div className="loading-spinner h-4 w-4 mr-2"></div>
                  Recording...
                </>
              ) : (
                <>
                  <Activity className="h-4 w-4 mr-2" />
                  Record Consumption
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default MaterialConsumption;
