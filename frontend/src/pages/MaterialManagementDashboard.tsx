import React, { useState, useEffect } from 'react';
import { 
  mrrAPI, 
  purchaseOrdersAPI, 
  materialReceiptsAPI, 
  supplierLedgerAPI, 
  materialsAPI,
  projectsAPI,
  materialManagementAPI,
  commercialAPI
} from '../services/api';

interface DashboardStats {
  pendingMrrs: number;
  approvedMrrs: number;
  pendingPos: number;
  pendingReceipts: number;
  overduePayments: number;
  lowStockItems: number;
  pendingReturns: number;
}

interface RecentActivity {
  id: number;
  type: 'MRR' | 'PO' | 'RECEIPT' | 'ISSUE' | 'RETURN';
  description: string;
  status: string;
  created_at: string;
  project_name: string;
}

const MaterialManagementDashboard: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats>({
    pendingMrrs: 0,
    approvedMrrs: 0,
    pendingPos: 0,
    pendingReceipts: 0,
    overduePayments: 0,
    lowStockItems: 0,
    pendingReturns: 0
  });
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const [
        mrrsRes,
        posRes,
        receiptsRes,
        overdueRes,
        lowStockRes,
        materialIssuesRes,
        materialReturnsRes
      ] = await Promise.all([
        mrrAPI.getMrrs({ status: 'DRAFT' }),
        purchaseOrdersAPI.getPurchaseOrders({ status: 'DRAFT' }),
        materialReceiptsAPI.getReceipts({ status: 'DRAFT' }),
        supplierLedgerAPI.getOverduePayments(),
        materialsAPI.getMasterData(),
        materialManagementAPI.getMaterialIssues({ limit: 10 }),
        commercialAPI.getMaterialReturns({ limit: 10 })
      ]);

      setStats({
        pendingMrrs: mrrsRes.data.count || 0,
        approvedMrrs: mrrsRes.data.approvedCount || 0,
        pendingPos: posRes.data.count || 0,
        pendingReceipts: receiptsRes.data.count || 0,
        overduePayments: overdueRes.data.count || 0,
        lowStockItems: lowStockRes.data.lowStockCount || 0,
        pendingReturns: materialReturnsRes.data.pagination?.totalItems || 0
      });

      // Process recent activity
      const activities: RecentActivity[] = [];
      
      // Add MRR activities
      mrrsRes.data.mrrs?.forEach((mrr: any) => {
        activities.push({
          id: mrr.mrr_id,
          type: 'MRR',
          description: `MRR ${mrr.mrr_number} created for ${mrr.project?.name}`,
          status: mrr.status,
          created_at: mrr.created_at,
          project_name: mrr.project?.name || 'Unknown'
        });
      });
      
      // Add Material Issue activities
      materialIssuesRes.data.issues?.forEach((issue: any) => {
        activities.push({
          id: issue.issue_id,
          type: 'ISSUE',
          description: `Material issued: ${issue.material?.name} (${issue.quantity_issued} units)`,
          status: issue.status,
          created_at: issue.created_at,
          project_name: issue.project?.name || 'Unknown'
        });
      });

      // Add Material Return activities
      materialReturnsRes.data.returns?.forEach((returnItem: any) => {
        activities.push({
          id: returnItem.return_id,
          type: 'RETURN',
          description: `Material returned: ${returnItem.material?.name} (${returnItem.quantity} units)`,
          status: returnItem.status,
          created_at: returnItem.created_at,
          project_name: returnItem.project?.name || 'Unknown'
        });
      });
      
      setRecentActivity(activities.sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      ).slice(0, 10));
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const StatCard: React.FC<{ title: string; value: number; color: string }> = ({ 
    title, value, color 
  }) => (
    <div className="card-elevated p-6 group hover:shadow-glow transition-all duration-300">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-sm font-semibold text-slate-600 uppercase tracking-wide">{title}</p>
          <p className="text-3xl font-bold text-slate-900 mt-1">{value}</p>
        </div>
      </div>
    </div>
  );

  const QuickActionButton: React.FC<{ 
    title: string; 
    description: string; 
    onClick: () => void; 
    color: string;
  }> = ({ title, description, onClick, color }) => (
    <button
      onClick={onClick}
      className="card-interactive p-6 group hover:shadow-glow transition-all duration-300 text-left w-full"
    >
      <div className="flex items-center space-x-4">
        <div className="flex-1">
          <h3 className="font-bold text-slate-900 group-hover:text-primary-600 transition-colors">{title}</h3>
          <p className="text-sm text-slate-600 mt-1">{description}</p>
        </div>
      </div>
    </button>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="loading-spinner h-12 w-12"></div>
        <span className="text-slate-600 font-medium ml-4">Loading dashboard...</span>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="text-center lg:text-left">
        <h1 className="text-4xl font-bold text-slate-900">Material Management Dashboard</h1>
        <p className="text-lg text-slate-600 mt-2">Complete overview of your material requirement and procurement workflow</p>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-7 gap-6">
        <StatCard
          title="Pending MRRs"
          value={stats.pendingMrrs}
          color="border-l-blue-500"
        />
        <StatCard
          title="Approved MRRs"
          value={stats.approvedMrrs}
          color="border-l-green-500"
        />
        <StatCard
          title="Pending POs"
          value={stats.pendingPos}
          color="border-l-yellow-500"
        />
        <StatCard
          title="Pending Receipts"
          value={stats.pendingReceipts}
          color="border-l-purple-500"
        />
        <StatCard
          title="Overdue Payments"
          value={stats.overduePayments}
          color="border-l-red-500"
        />
        <StatCard
          title="Low Stock Items"
          value={stats.lowStockItems}
          color="border-l-orange-500"
        />
        <StatCard
          title="Pending Returns"
          value={stats.pendingReturns}
          color="border-l-indigo-500"
        />
      </div>

      {/* Quick Actions */}
      <div className="card p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-slate-900">Quick Actions</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
          <QuickActionButton
            title="Create MRR"
            description="Raise new material requirement request"
            onClick={() => window.location.href = '/material-management/mrr'}
            color="border-blue-300"
          />
          <QuickActionButton
            title="Issue Material"
            description="Issue material to site/contractor"
            onClick={() => window.location.href = '/material-management/issue'}
            color="border-orange-300"
          />
          <QuickActionButton
            title="View Inventory"
            description="Monitor stock levels and movements"
            onClick={() => window.location.href = '/material-management/inventory'}
            color="border-purple-300"
          />
          <QuickActionButton
            title="Track Workflow"
            description="Monitor complete material workflow"
            onClick={() => window.location.href = '/material-management/workflow'}
            color="border-green-300"
          />
          <QuickActionButton
            title="Material Returns"
            description="Record material returns to inventory"
            onClick={() => window.location.href = '/material-management/returns'}
            color="border-indigo-300"
          />
        </div>
      </div>

      {/* Recent Activity */}
      <div className="card p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-slate-900">Recent Activity</h2>
        </div>
        <div className="space-y-4">
          {recentActivity.length === 0 ? (
            <div className="text-center py-12">
              <div className="h-16 w-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl text-slate-400">•</span>
              </div>
              <p className="text-slate-500 font-medium">No recent activity</p>
              <p className="text-sm text-slate-400 mt-1">Activity will appear here as you use the system</p>
            </div>
          ) : (
            recentActivity.map((activity) => (
              <div key={activity.id} className="flex items-center justify-between p-4 bg-slate-50/50 rounded-xl hover:bg-slate-100/50 transition-colors">
                <div className="flex items-center space-x-4">
                  <div className="h-10 w-10 bg-white shadow-sm flex items-center justify-center border-2 border-slate-200 rounded-lg">
                    <span className="text-sm font-semibold text-slate-600">
                      {activity.type === 'MRR' ? 'MRR' : 
                       activity.type === 'PO' ? 'PO' : 
                       activity.type === 'RECEIPT' ? 'REC' : 
                       activity.type === 'ISSUE' ? 'ISS' : 'RET'}
                    </span>
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900">{activity.description}</p>
                    <p className="text-sm text-slate-500">{activity.project_name}</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className={`status-badge ${
                    activity.status === 'PENDING' ? 'status-pending' :
                    activity.status === 'APPROVED' ? 'status-success' :
                    activity.status === 'REJECTED' ? 'status-danger' :
                    'status-secondary'
                  }`}>
                    {activity.status}
                  </span>
                  <p className="text-xs text-slate-500 mt-2">
                    {new Date(activity.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default MaterialManagementDashboard;
