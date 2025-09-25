import React, { useState, useEffect } from 'react';
import { 
  mrrAPI, 
  materialsAPI, 
  projectsAPI,
  materialManagementAPI 
} from '../services/api';

interface MrrForIssue {
  mrr_id: number;
  mrr_number: string;
  project_id: number;
  project_name: string;
  status: string;
  approval_status: string;
  items: Array<{
    item_id: number;
    item_name: string;
    quantity_requested: number;
    unit_id: number;
    unit_name: string;
    available_stock?: number;
  }>;
}

interface IssueFormData {
  mrr_id: number;
  project_id: number;
  issued_to: string;
  issue_date: string;
  notes: string;
  items: Array<{
    item_id: number;
    quantity_issued: number;
    unit_id: number;
  }>;
}

const MaterialIssueManagement: React.FC = () => {
  const [approvedMrrs, setApprovedMrrs] = useState<MrrForIssue[]>([]);
  const [selectedMrr, setSelectedMrr] = useState<MrrForIssue | null>(null);
  const [showIssueForm, setShowIssueForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<IssueFormData>({
    mrr_id: 0,
    project_id: 0,
    issued_to: '',
    issue_date: new Date().toISOString().split('T')[0],
    notes: '',
    items: []
  });

  useEffect(() => {
    loadApprovedMrrs();
  }, []);

  const loadApprovedMrrs = async () => {
    setLoading(true);
    try {
      const response = await mrrAPI.getMrrs({ 
        approval_status: 'APPROVED',
        status: 'APPROVED',
        include_items: true,
        include_project: true
      });
      
      // Filter MRRs that have items available for issue
      const mrrsWithStock = await Promise.all(
        response.data.mrrs.map(async (mrr: any) => {
          const itemsWithStock = await Promise.all(
            mrr.items.map(async (item: any) => {
              try {
                const stockResponse = await materialsAPI.getMasterData();
                const itemData = stockResponse.data.itemMaster.find((i: any) => i.item_id === item.item_id);
                return {
                  ...item,
                  available_stock: itemData?.current_stock || 0
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
      
      setApprovedMrrs(mrrsWithStock);
    } catch (error) {
      console.error('Error loading approved MRRs:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectMrr = (mrr: MrrForIssue) => {
    setSelectedMrr(mrr);
    setFormData({
      mrr_id: mrr.mrr_id,
      project_id: mrr.project_id,
      issued_to: '',
      issue_date: new Date().toISOString().split('T')[0],
      notes: '',
      items: mrr.items.map(item => ({
        item_id: item.item_id,
        quantity_issued: Math.min(item.quantity_requested, item.available_stock || 0),
        unit_id: item.unit_id || 1
      }))
    });
    setShowIssueForm(true);
  };

  const handleIssueMaterial = async () => {
    if (!formData.issued_to || formData.items.length === 0) {
      alert('Please fill in all required fields');
      return;
    }

    setLoading(true);
    try {
      await materialManagementAPI.createMaterialIssue({
        ...formData,
        mrr_id: formData.mrr_id,
        project_id: formData.project_id,
        issue_date: formData.issue_date,
        items: formData.items.filter(item => item.quantity_issued > 0)
      });

      alert('Material issued successfully!');
      setShowIssueForm(false);
      setSelectedMrr(null);
      loadApprovedMrrs();
    } catch (error) {
      console.error('Error issuing material:', error);
      alert('Error issuing material');
    } finally {
      setLoading(false);
    }
  };

  const updateItemQuantity = (itemId: number, quantity: number) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.map(item => 
        item.item_id === itemId 
          ? { ...item, quantity_issued: Math.max(0, quantity) }
          : item
      )
    }));
  };

  if (loading && approvedMrrs.length === 0) {
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
        <p className="text-gray-600 mt-2">Issue materials from approved MRRs to sites and contractors</p>
      </div>

      {!showIssueForm ? (
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Approved MRRs Ready for Issue</h2>
            
            {approvedMrrs.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500">No approved MRRs available for material issue</p>
              </div>
            ) : (
              <div className="space-y-4">
                {approvedMrrs.map((mrr) => (
                  <div key={mrr.mrr_id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center space-x-4 mb-2">
                          <h3 className="text-lg font-semibold text-gray-900">
                            {mrr.mrr_number}
                          </h3>
                          <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
                            APPROVED
                          </span>
                        </div>
                        <p className="text-gray-600 mb-3">Project: {mrr.project_name}</p>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                          {mrr.items.map((item) => (
                            <div key={item.item_id} className="bg-gray-50 p-3 rounded-lg">
                              <h4 className="font-medium text-gray-900">{item.item_name}</h4>
                              <div className="text-sm text-gray-600 mt-1">
                                <p>Requested: {item.quantity_requested} {item.unit_name}</p>
                                <p className={`font-medium ${
                                  (item.available_stock || 0) >= item.quantity_requested 
                                    ? 'text-green-600' 
                                    : 'text-red-600'
                                }`}>
                                  Available: {item.available_stock || 0} {item.unit_name}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                      
                      <div className="ml-4">
                        <button
                          onClick={() => handleSelectMrr(mrr)}
                          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                        >
                          Issue Material
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold text-gray-900">
              Issue Material - {selectedMrr?.mrr_number}
            </h2>
            <button
              onClick={() => setShowIssueForm(false)}
              className="text-gray-500 hover:text-gray-700"
            >
              ✕
            </button>
          </div>

          <form onSubmit={(e) => { e.preventDefault(); handleIssueMaterial(); }}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Issued To
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

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Items to Issue
              </label>
              <div className="space-y-3">
                {formData.items.map((item) => {
                  const mrrItem = selectedMrr?.items.find(i => i.item_id === item.item_id);
                  return (
                    <div key={item.item_id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex justify-between items-center mb-2">
                        <h4 className="font-medium text-gray-900">{mrrItem?.item_name}</h4>
                        <span className="text-sm text-gray-600">
                          Available: {mrrItem?.available_stock || 0} {mrrItem?.unit_name}
                        </span>
                      </div>
                      
                      <div className="flex items-center space-x-4">
                        <label className="text-sm text-gray-700">Quantity to Issue:</label>
                        <input
                          type="number"
                          min="0"
                          max={mrrItem?.available_stock || 0}
                          value={item.quantity_issued}
                          onChange={(e) => updateItemQuantity(item.item_id, parseInt(e.target.value) || 0)}
                          className="w-24 px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                        <span className="text-sm text-gray-600">{mrrItem?.unit_name}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

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

            <div className="flex justify-end space-x-4">
              <button
                type="button"
                onClick={() => setShowIssueForm(false)}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {loading ? 'Issuing...' : 'Issue Material'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default MaterialIssueManagement;
