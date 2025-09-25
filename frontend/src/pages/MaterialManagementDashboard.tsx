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
          description: `MRR ${mrr.mrr_reference_id} created for ${mrr.project?.name}`,
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

  const StatCard: React.FC<{ title: string; value: number; color: string; icon: string }> = ({ 
    title, value, color, icon 
  }) => (
    <div className={`bg-white rounded-lg shadow-md p-6 border-l-4 ${color}`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
        </div>
        <div className={`p-3 rounded-full ${color.replace('border-l-4', 'bg')}`}>
          <span className="text-2xl">{icon}</span>
        </div>
      </div>
    </div>
  );

  const QuickActionButton: React.FC<{ 
    title: string; 
    description: string; 
    onClick: () => void; 
    color: string;
    icon: string;
  }> = ({ title, description, onClick, color, icon }) => (
    <button
      onClick={onClick}
      className={`p-4 rounded-lg border-2 border-dashed ${color} hover:border-solid hover:bg-gray-50 transition-all duration-200 text-left w-full`}
    >
      <div className="flex items-center space-x-3">
        <span className="text-2xl">{icon}</span>
        <div>
          <h3 className="font-semibold text-gray-900">{title}</h3>
          <p className="text-sm text-gray-600">{description}</p>
        </div>
      </div>
    </button>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Material Management Dashboard</h1>
        <p className="text-gray-600 mt-2">Complete overview of your material requirement and procurement workflow</p>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-7 gap-6 mb-8">
        <StatCard
          title="Pending MRRs"
          value={stats.pendingMrrs}
          color="border-l-blue-500"
          icon="📋"
        />
        <StatCard
          title="Approved MRRs"
          value={stats.approvedMrrs}
          color="border-l-green-500"
          icon="✅"
        />
        <StatCard
          title="Pending POs"
          value={stats.pendingPos}
          color="border-l-yellow-500"
          icon="📄"
        />
        <StatCard
          title="Pending Receipts"
          value={stats.pendingReceipts}
          color="border-l-purple-500"
          icon="📦"
        />
        <StatCard
          title="Overdue Payments"
          value={stats.overduePayments}
          color="border-l-red-500"
          icon="⚠️"
        />
        <StatCard
          title="Low Stock Items"
          value={stats.lowStockItems}
          color="border-l-orange-500"
          icon="📉"
        />
        <StatCard
          title="Pending Returns"
          value={stats.pendingReturns}
          color="border-l-indigo-500"
          icon="↩️"
        />
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <QuickActionButton
            title="Create MRR"
            description="Raise new material requirement request"
            onClick={() => window.location.href = '/material-management/mrr'}
            color="border-blue-300"
            icon="📝"
          />
          <QuickActionButton
            title="Issue Material"
            description="Issue material to site/contractor"
            onClick={() => window.location.href = '/material-management/issue'}
            color="border-orange-300"
            icon="📤"
          />
          <QuickActionButton
            title="View Inventory"
            description="Monitor stock levels and movements"
            onClick={() => window.location.href = '/material-management/inventory'}
            color="border-purple-300"
            icon="📦"
          />
          <QuickActionButton
            title="Track Workflow"
            description="Monitor complete material workflow"
            onClick={() => window.location.href = '/material-management/workflow'}
            color="border-green-300"
            icon="🔄"
          />
          <QuickActionButton
            title="Material Returns"
            description="Record material returns to inventory"
            onClick={() => window.location.href = '/material-management/returns'}
            color="border-indigo-300"
            icon="↩️"
          />
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Recent Activity</h2>
        <div className="space-y-3">
          {recentActivity.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No recent activity</p>
          ) : (
            recentActivity.map((activity) => (
              <div key={activity.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <span className="text-lg">
                    {activity.type === 'MRR' ? '📋' : 
                     activity.type === 'PO' ? '📄' : 
                     activity.type === 'RECEIPT' ? '📦' : 
                     activity.type === 'ISSUE' ? '📤' : '↩️'}
                  </span>
                  <div>
                    <p className="font-medium text-gray-900">{activity.description}</p>
                    <p className="text-sm text-gray-600">{activity.project_name}</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    activity.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' :
                    activity.status === 'APPROVED' ? 'bg-green-100 text-green-800' :
                    activity.status === 'REJECTED' ? 'bg-red-100 text-red-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {activity.status}
                  </span>
                  <p className="text-xs text-gray-500 mt-1">
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
