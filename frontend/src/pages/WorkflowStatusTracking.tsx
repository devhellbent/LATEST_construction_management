import React, { useState, useEffect } from 'react';
import { 
  mrrAPI, 
  purchaseOrdersAPI, 
  materialReceiptsAPI,
  commercialAPI 
} from '../services/api';

interface WorkflowItem {
  id: number;
  type: 'MRR' | 'PO' | 'RECEIPT' | 'ISSUE' | 'RETURN';
  reference_id: string;
  project_name: string;
  status: string;
  created_date: string;
  priority?: string;
  items_count: number;
  total_amount?: number;
  supplier_name?: string;
  issued_to?: string;
}

interface WorkflowStats {
  totalMrrs: number;
  pendingMrrs: number;
  approvedMrrs: number;
  totalPos: number;
  pendingPos: number;
  totalReceipts: number;
  pendingReceipts: number;
  totalIssues: number;
  pendingIssues: number;
}

const WorkflowStatusTracking: React.FC = () => {
  const [workflowItems, setWorkflowItems] = useState<WorkflowItem[]>([]);
  const [stats, setStats] = useState<WorkflowStats>({
    totalMrrs: 0,
    pendingMrrs: 0,
    approvedMrrs: 0,
    totalPos: 0,
    pendingPos: 0,
    totalReceipts: 0,
    pendingReceipts: 0,
    totalIssues: 0,
    pendingIssues: 0
  });
  const [loading, setLoading] = useState(false);
  const [activeFilter, setActiveFilter] = useState<'all' | 'MRR' | 'PO' | 'RECEIPT' | 'ISSUE'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'PENDING' | 'APPROVED' | 'IN_PROGRESS' | 'COMPLETED'>('all');

  useEffect(() => {
    loadWorkflowData();
  }, [activeFilter, statusFilter]);

  const loadWorkflowData = async () => {
    setLoading(true);
    try {
      const [mrrsRes, posRes, receiptsRes, issuesRes] = await Promise.all([
        mrrAPI.getMrrs({ 
          include_project: true,
          include_items: true,
          ...(activeFilter === 'all' || activeFilter === 'MRR' ? {} : { type: activeFilter }),
          ...(statusFilter === 'all' ? {} : { status: statusFilter })
        }),
        purchaseOrdersAPI.getPurchaseOrders({ 
          include_project: true,
          include_supplier: true,
          include_items: true,
          ...(activeFilter === 'all' || activeFilter === 'PO' ? {} : { type: activeFilter }),
          ...(statusFilter === 'all' ? {} : { status: statusFilter })
        }),
        materialReceiptsAPI.getReceipts({ 
          include_project: true,
          include_items: true,
          ...(activeFilter === 'all' || activeFilter === 'RECEIPT' ? {} : { type: activeFilter }),
          ...(statusFilter === 'all' ? {} : { status: statusFilter })
        }),
        commercialAPI.getMaterialIssues({ 
          include_project: true,
          include_mrr: true,
          ...(activeFilter === 'all' || activeFilter === 'ISSUE' ? {} : { type: activeFilter }),
          ...(statusFilter === 'all' ? {} : { status: statusFilter })
        })
      ]);

      // Process MRRs
      const mrrs: WorkflowItem[] = (mrrsRes.data.mrrs || []).map((mrr: any) => ({
        id: mrr.mrr_id,
        type: 'MRR',
        reference_id: mrr.mrr_reference_id,
        project_name: mrr.project?.project_name || 'Unknown',
        status: mrr.status,
        created_date: mrr.created_at,
        priority: mrr.priority,
        items_count: mrr.items?.length || 0
      }));

      // Process Purchase Orders
      const pos: WorkflowItem[] = (posRes.data.purchaseOrders || []).map((po: any) => ({
        id: po.po_id,
        type: 'PO',
        reference_id: po.po_reference_id,
        project_name: po.project?.project_name || 'Unknown',
        status: po.status,
        created_date: po.created_at,
        items_count: po.items?.length || 0,
        total_amount: po.items?.reduce((sum: number, item: any) => sum + (item.total_amount || 0), 0) || 0,
        supplier_name: po.supplier?.supplier_name || 'Unknown'
      }));

      // Process Receipts
      const receipts: WorkflowItem[] = (receiptsRes.data.receipts || []).map((receipt: any) => ({
        id: receipt.receipt_id,
        type: 'RECEIPT',
        reference_id: receipt.receipt_reference_id,
        project_name: receipt.project?.project_name || 'Unknown',
        status: receipt.status,
        created_date: receipt.created_at,
        items_count: receipt.items?.length || 0
      }));

      // Process Issues
      const issues: WorkflowItem[] = (issuesRes.data.issues || []).map((issue: any) => ({
        id: issue.issue_id,
        type: 'ISSUE',
        reference_id: `#${issue.issue_id}`,
        project_name: issue.project?.name || 'Unknown',
        status: issue.status,
        created_date: issue.created_at,
        items_count: 1,
        issued_to: issue.location || 'Unknown'
      }));

      // Combine all items
      const allItems = [...mrrs, ...pos, ...receipts, ...issues].sort(
        (a, b) => new Date(b.created_date).getTime() - new Date(a.created_date).getTime()
      );

      setWorkflowItems(allItems);

      // Calculate stats
      setStats({
        totalMrrs: mrrs.length,
        pendingMrrs: mrrs.filter(m => m.status === 'PENDING').length,
        approvedMrrs: mrrs.filter(m => m.status === 'APPROVED').length,
        totalPos: pos.length,
        pendingPos: pos.filter(p => p.status === 'PENDING').length,
        totalReceipts: receipts.length,
        pendingReceipts: receipts.filter(r => r.status === 'PENDING').length,
        totalIssues: issues.length,
        pendingIssues: issues.filter(i => i.status === 'PENDING').length
      });
    } catch (error) {
      console.error('Error loading workflow data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'MRR': return '📋';
      case 'PO': return '📄';
      case 'RECEIPT': return '📦';
      case 'ISSUE': return '📤';
      case 'RETURN': return '↩️';
      default: return '📄';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING': return 'bg-yellow-100 text-yellow-800';
      case 'APPROVED': return 'bg-green-100 text-green-800';
      case 'IN_PROGRESS': return 'bg-blue-100 text-blue-800';
      case 'COMPLETED': return 'bg-gray-100 text-gray-800';
      case 'REJECTED': return 'bg-red-100 text-red-800';
      case 'CANCELLED': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'HIGH': return 'bg-red-100 text-red-800';
      case 'MEDIUM': return 'bg-yellow-100 text-yellow-800';
      case 'LOW': return 'bg-green-100 text-green-800';
      case 'CRITICAL': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading && workflowItems.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Workflow Status Tracking</h1>
        <p className="text-gray-600 mt-2">Track the complete material management workflow from MRR to issue</p>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4 mb-8">
        <div className="bg-white rounded-lg shadow-md p-4 border-l-4 border-blue-500">
          <div className="text-center">
            <p className="text-sm font-medium text-gray-600">Total MRRs</p>
            <p className="text-2xl font-bold text-gray-900">{stats.totalMrrs}</p>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-md p-4 border-l-4 border-yellow-500">
          <div className="text-center">
            <p className="text-sm font-medium text-gray-600">Pending MRRs</p>
            <p className="text-2xl font-bold text-gray-900">{stats.pendingMrrs}</p>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-md p-4 border-l-4 border-green-500">
          <div className="text-center">
            <p className="text-sm font-medium text-gray-600">Approved MRRs</p>
            <p className="text-2xl font-bold text-gray-900">{stats.approvedMrrs}</p>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-md p-4 border-l-4 border-purple-500">
          <div className="text-center">
            <p className="text-sm font-medium text-gray-600">Total POs</p>
            <p className="text-2xl font-bold text-gray-900">{stats.totalPos}</p>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-md p-4 border-l-4 border-orange-500">
          <div className="text-center">
            <p className="text-sm font-medium text-gray-600">Pending POs</p>
            <p className="text-2xl font-bold text-gray-900">{stats.pendingPos}</p>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-md p-4 border-l-4 border-indigo-500">
          <div className="text-center">
            <p className="text-sm font-medium text-gray-600">Total Receipts</p>
            <p className="text-2xl font-bold text-gray-900">{stats.totalReceipts}</p>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-md p-4 border-l-4 border-pink-500">
          <div className="text-center">
            <p className="text-sm font-medium text-gray-600">Pending Receipts</p>
            <p className="text-2xl font-bold text-gray-900">{stats.pendingReceipts}</p>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-md p-4 border-l-4 border-teal-500">
          <div className="text-center">
            <p className="text-sm font-medium text-gray-600">Total Issues</p>
            <p className="text-2xl font-bold text-gray-900">{stats.totalIssues}</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="flex flex-wrap gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Filter by Type</label>
            <select
              value={activeFilter}
              onChange={(e) => setActiveFilter(e.target.value as any)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Types</option>
              <option value="MRR">Material Requirement Requests</option>
              <option value="PO">Purchase Orders</option>
              <option value="RECEIPT">Material Receipts</option>
              <option value="ISSUE">Material Issues</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Filter by Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Statuses</option>
              <option value="PENDING">Pending</option>
              <option value="APPROVED">Approved</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="COMPLETED">Completed</option>
            </select>
          </div>
        </div>
      </div>

      {/* Workflow Items */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Workflow Items</h2>
        
        {workflowItems.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500">No workflow items found</p>
          </div>
        ) : (
          <div className="space-y-4">
            {workflowItems.map((item) => (
              <div key={`${item.type}-${item.id}`} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50">
                <div className="flex justify-between items-start">
                  <div className="flex items-center space-x-4">
                    <span className="text-2xl">{getTypeIcon(item.type)}</span>
                    <div>
                      <div className="flex items-center space-x-2 mb-1">
                        <h3 className="text-lg font-semibold text-gray-900">
                          {item.reference_id}
                        </h3>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(item.status)}`}>
                          {item.status}
                        </span>
                        {item.priority && (
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(item.priority)}`}>
                            {item.priority}
                          </span>
                        )}
                      </div>
                      <p className="text-gray-600 mb-1">Project: {item.project_name}</p>
                      <div className="flex items-center space-x-4 text-sm text-gray-500">
                        <span>Items: {item.items_count}</span>
                        {item.total_amount && <span>Amount: ₹{item.total_amount.toFixed(2)}</span>}
                        {item.supplier_name && <span>Supplier: {item.supplier_name}</span>}
                        {item.issued_to && <span>Issued To: {item.issued_to}</span>}
                        <span>Created: {new Date(item.created_date).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <div className="text-sm text-gray-500">
                      {item.type}
                    </div>
                    <div className="text-xs text-gray-400">
                      ID: {item.id}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default WorkflowStatusTracking;
