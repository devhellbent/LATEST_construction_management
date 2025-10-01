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
        reference_id: mrr.mrr_number,
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
        <div className="animate-spin rounded-full h-8 w-8 sm:h-12 sm:w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-responsive">
      <div className="text-center lg:text-left">
        <h1 className="text-responsive-3xl">Workflow Status Tracking</h1>
        <p className="text-responsive-base mt-2">Track the complete material management workflow from MRR to issue</p>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3 sm:gap-4">
        <div className="card-mobile group hover:shadow-glow transition-all duration-300">
          <div className="text-center">
            <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Total MRRs</p>
            <p className="text-lg sm:text-2xl font-bold text-slate-900 mt-1">{stats.totalMrrs}</p>
          </div>
        </div>
        <div className="card-mobile group hover:shadow-glow transition-all duration-300">
          <div className="text-center">
            <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Pending MRRs</p>
            <p className="text-lg sm:text-2xl font-bold text-slate-900 mt-1">{stats.pendingMrrs}</p>
          </div>
        </div>
        <div className="card-mobile group hover:shadow-glow transition-all duration-300">
          <div className="text-center">
            <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Approved MRRs</p>
            <p className="text-lg sm:text-2xl font-bold text-slate-900 mt-1">{stats.approvedMrrs}</p>
          </div>
        </div>
        <div className="card-mobile group hover:shadow-glow transition-all duration-300">
          <div className="text-center">
            <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Total POs</p>
            <p className="text-lg sm:text-2xl font-bold text-slate-900 mt-1">{stats.totalPos}</p>
          </div>
        </div>
        <div className="card-mobile group hover:shadow-glow transition-all duration-300">
          <div className="text-center">
            <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Pending POs</p>
            <p className="text-lg sm:text-2xl font-bold text-slate-900 mt-1">{stats.pendingPos}</p>
          </div>
        </div>
        <div className="card-mobile group hover:shadow-glow transition-all duration-300">
          <div className="text-center">
            <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Total Receipts</p>
            <p className="text-lg sm:text-2xl font-bold text-slate-900 mt-1">{stats.totalReceipts}</p>
          </div>
        </div>
        <div className="card-mobile group hover:shadow-glow transition-all duration-300">
          <div className="text-center">
            <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Pending Receipts</p>
            <p className="text-lg sm:text-2xl font-bold text-slate-900 mt-1">{stats.pendingReceipts}</p>
          </div>
        </div>
        <div className="card-mobile group hover:shadow-glow transition-all duration-300">
          <div className="text-center">
            <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Total Issues</p>
            <p className="text-lg sm:text-2xl font-bold text-slate-900 mt-1">{stats.totalIssues}</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="card-mobile">
        <div className="flex flex-col sm:flex-row gap-4 sm:gap-6">
          <div className="flex-1 min-w-48">
            <label className="label">Filter by Type</label>
            <select
              value={activeFilter}
              onChange={(e) => setActiveFilter(e.target.value as any)}
              className="input"
            >
              <option value="all">All Types</option>
              <option value="MRR">Material Requirement Requests</option>
              <option value="PO">Purchase Orders</option>
              <option value="RECEIPT">Material Receipts</option>
              <option value="ISSUE">Material Issues</option>
            </select>
          </div>
          
          <div className="flex-1 min-w-48">
            <label className="label">Filter by Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="input"
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
      <div className="card-mobile">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 sm:mb-6 gap-4">
          <h2 className="text-lg sm:text-xl font-bold text-slate-900">Workflow Items</h2>
          <div className="h-8 w-8 sm:h-10 sm:w-10 bg-primary-100 rounded-lg flex items-center justify-center">
            <span className="text-primary-600 text-sm sm:text-base">🔄</span>
          </div>
        </div>
        
        {workflowItems.length === 0 ? (
          <div className="text-center py-8 sm:py-12">
            <div className="h-16 w-16 sm:h-20 sm:w-20 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl sm:text-3xl text-slate-400">📋</span>
            </div>
            <p className="text-slate-500 font-medium text-sm sm:text-base">No workflow items found</p>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">Workflow items will appear here as you create them</p>
          </div>
        ) : (
          <div className="space-y-4 sm:space-y-6">
            {workflowItems.map((item) => (
              <div key={`${item.type}-${item.id}`} className="card-interactive p-4 sm:p-6 group hover:shadow-glow transition-all duration-300">
                <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                  <div className="flex items-start sm:items-center space-x-3 sm:space-x-4 w-full sm:w-auto">
                    <div className="h-10 w-10 sm:h-12 sm:w-12 bg-gradient-to-br from-primary-500 to-primary-600 rounded-xl flex items-center justify-center shadow-lg flex-shrink-0">
                      <span className="text-lg sm:text-xl">{getTypeIcon(item.type)}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-3 mb-2">
                        <h3 className="text-base sm:text-lg font-bold text-slate-900 group-hover:text-primary-600 transition-colors truncate">
                          {item.reference_id}
                        </h3>
                        <div className="flex flex-wrap gap-2">
                          <span className={`status-badge ${getStatusColor(item.status)} text-xs`}>
                            {item.status}
                          </span>
                          {item.priority && (
                            <span className={`status-badge ${getPriorityColor(item.priority)} text-xs`}>
                              {item.priority}
                            </span>
                          )}
                        </div>
                      </div>
                      <p className="text-slate-600 mb-2 font-medium text-sm sm:text-base">Project: {item.project_name}</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-4 text-xs sm:text-sm text-slate-500">
                        <span className="flex items-center">
                          <span className="h-3 w-3 sm:h-4 sm:w-4 bg-slate-200 rounded mr-2 flex-shrink-0"></span>
                          Items: {item.items_count}
                        </span>
                        {item.total_amount && (
                          <span className="flex items-center">
                            <span className="h-3 w-3 sm:h-4 sm:w-4 bg-slate-200 rounded mr-2 flex-shrink-0"></span>
                            Amount: ₹{item.total_amount.toFixed(2)}
                          </span>
                        )}
                        {item.supplier_name && (
                          <span className="flex items-center">
                            <span className="h-3 w-3 sm:h-4 sm:w-4 bg-slate-200 rounded mr-2 flex-shrink-0"></span>
                            <span className="truncate">Supplier: {item.supplier_name}</span>
                          </span>
                        )}
                        {item.issued_to && (
                          <span className="flex items-center">
                            <span className="h-3 w-3 sm:h-4 sm:w-4 bg-slate-200 rounded mr-2 flex-shrink-0"></span>
                            <span className="truncate">Issued To: {item.issued_to}</span>
                          </span>
                        )}
                        <span className="flex items-center">
                          <span className="h-3 w-3 sm:h-4 sm:w-4 bg-slate-200 rounded mr-2 flex-shrink-0"></span>
                          <span className="hidden sm:inline">Created: {new Date(item.created_date).toLocaleDateString()}</span>
                          <span className="sm:hidden">Created: {new Date(item.created_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="text-left sm:text-right w-full sm:w-auto">
                    <div className="text-xs sm:text-sm font-semibold text-slate-600">
                      {item.type}
                    </div>
                    <div className="text-xs text-slate-400">
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
