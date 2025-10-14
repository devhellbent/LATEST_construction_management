import React, { useState, useEffect } from 'react';
import { 
  IndianRupee, 
  Plus, 
  Filter, 
  Search, 
  Download, 
  ChevronDown,
  ChevronRight,
  Info,
  Users,
  Calendar,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle
} from 'lucide-react';
import ProjectSelector from '../components/ProjectSelector';
import PaymentForm from '../components/PaymentForm';
import { paymentsAPI, projectsAPI, usersAPI } from '../services/api';

interface Payment {
  payment_id: number;
  payment_reference_id: string;
  project_id: number;
  payment_type_id: number;
  category_id: number;
  paid_to_type: 'TEAM_MEMBER' | 'VENDOR' | 'LABOUR' | 'SUBCONTRACTOR' | 'OTHER';
  paid_to_user_id?: number;
  paid_to_name?: string;
  paid_to_contact?: string;
  paid_by_user_id: number;
  paid_by_type: 'COMPANY' | 'INDIVIDUAL';
  amount: number;
  currency: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'COMPLETED' | 'CANCELLED';
  approval_status: 'PENDING' | 'APPROVED' | 'REJECTED';
  payment_date: string;
  description?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  project?: {
    project_id: number;
    name: string;
  };
  paymentType?: {
    payment_type_id: number;
    type_name: string;
  };
  category?: {
    category_id: number;
    category_name: string;
  };
  paidToUser?: {
    user_id: number;
    name: string;
    email: string;
  };
  paidByUser?: {
    user_id: number;
    name: string;
    email: string;
  };
  approvedByUser?: {
    user_id: number;
    name: string;
  };
}

interface PaymentType {
  payment_type_id: number;
  type_name: string;
  description?: string;
}

interface PaymentCategory {
  category_id: number;
  category_name: string;
  description?: string;
}

interface CategoryStats {
  category_id: number;
  category_name: string;
  total_payments: number;
  total_amount: number;
  average_amount: number;
  min_amount: number;
  max_amount: number;
}

const Expenses: React.FC = () => {
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [paymentTypes, setPaymentTypes] = useState<PaymentType[]>([]);
  const [categories, setCategories] = useState<PaymentCategory[]>([]);
  const [categoryStats, setCategoryStats] = useState<CategoryStats[]>([]);
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPaymentFormOpen, setIsPaymentFormOpen] = useState(false);
  
  // Filters
  const [filters, setFilters] = useState({
    search: '',
    paidTo: '',
    paidBy: '',
    project: '',
    category: '',
    approvalStatus: '',
    createdOn: '',
    sortBy: 'created_at',
    sortOrder: 'DESC'
  });

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    fetchPayments();
  }, [selectedProjectId, filters]);

  const fetchInitialData = async () => {
    try {
      const [paymentTypesRes, categoriesRes, teamMembersRes] = await Promise.all([
        paymentsAPI.getPaymentTypes(),
        paymentsAPI.getPaymentCategories(),
        usersAPI.getUsers()
      ]);

      setPaymentTypes(paymentTypesRes.data.paymentTypes || []);
      setCategories(categoriesRes.data.categories || []);
      setTeamMembers(teamMembersRes.data.users || []);
    } catch (err) {
      console.error('Error fetching initial data:', err);
    }
  };

  const fetchPayments = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const params = {
        ...(selectedProjectId && { project_id: selectedProjectId }),
        search: filters.search,
        paid_to: filters.paidTo,
        paid_by: filters.paidBy,
        category_id: filters.category,
        approval_status: filters.approvalStatus,
        start_date: filters.createdOn ? new Date(filters.createdOn).toISOString().split('T')[0] : undefined,
        end_date: filters.createdOn ? new Date(filters.createdOn).toISOString().split('T')[0] : undefined,
        page: 1,
        limit: 100
      };

      // Remove empty parameters
      const cleanParams = Object.fromEntries(
        Object.entries(params).filter(([_, value]) => value !== '' && value !== null && value !== undefined)
      );

      const response = await paymentsAPI.getPayments(cleanParams);
      
      // Set payments data
      setPayments(response.data.payments || []);

      // Fetch category stats
      if (selectedProjectId) {
        const statsResponse = await paymentsAPI.getPaymentStats({ project_id: selectedProjectId });
        setCategoryStats(statsResponse.data.stats || []);
      }
    } catch (err) {
      console.error('Error fetching payments:', err);
      setError('Failed to load payments');
      setPayments([]);
    } finally {
      setLoading(false);
    }
  };

  const handleProjectChange = (projectId: number | null) => {
    setSelectedProjectId(projectId);
  };

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'COMPLETED':
      case 'APPROVED':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'REJECTED':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'PENDING':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'CANCELLED':
        return <AlertCircle className="h-4 w-4 text-gray-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED':
      case 'APPROVED':
        return 'text-green-600 bg-green-50';
      case 'REJECTED':
        return 'text-red-600 bg-red-50';
      case 'PENDING':
        return 'text-yellow-600 bg-yellow-50';
      case 'CANCELLED':
        return 'text-gray-600 bg-gray-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  const getPaidToDisplay = (payment: Payment) => {
    if (payment.paid_to_type === 'TEAM_MEMBER' && payment.paidToUser) {
      return payment.paidToUser.name;
    }
    return payment.paid_to_name || '-';
  };

  const getPaidByDisplay = (payment: Payment) => {
    if (payment.paidByUser) {
      return payment.paidByUser.name;
    }
    return payment.paid_by_type === 'COMPANY' ? 'Company' : 'Individual';
  };

  const totalAmount = payments.reduce((sum, payment) => sum + payment.amount, 0);

  // Calculate category totals for summary cards
  const categoryTotals = categories.reduce((acc, category) => {
    // First try to get from categoryStats (if available)
    const stats = categoryStats.find(s => s.category_id === category.category_id);
    if (stats) {
      acc[category.category_name] = parseFloat(stats.total_amount.toString());
    } else {
      // Fallback to calculating from payments array
      const categoryPayments = payments.filter(payment => payment.category_id === category.category_id);
      acc[category.category_name] = categoryPayments.reduce((sum, payment) => sum + payment.amount, 0);
    }
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Expenses</h1>
        <div className="flex items-center space-x-3">
          <button className="btn btn-secondary flex items-center">
            <Download className="h-5 w-5 mr-2" />
            Export Excel
          </button>
          <button 
            onClick={() => setIsPaymentFormOpen(true)}
            className="btn btn-primary flex items-center"
          >
            <Plus className="h-5 w-5 mr-2" />
            Record New Payment
            <ChevronDown className="h-4 w-4 ml-1" />
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Total Expense</p>
              <p className="text-2xl font-bold text-gray-900">{formatCurrency(totalAmount)}</p>
            </div>
            <div className="p-2 bg-gray-100 rounded-lg">
              <IndianRupee className="h-6 w-6 text-gray-600" />
            </div>
          </div>
        </div>

        {categories.map((category) => (
          <div key={category.category_id} className="bg-white p-4 rounded-lg border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">{category.category_name}</p>
                <p className="text-lg font-semibold text-gray-900">
                  {formatCurrency(categoryTotals[category.category_name] || 0)}
                </p>
              </div>
              <button className="p-2 bg-blue-100 rounded-lg hover:bg-blue-200 transition-colors">
                <Plus className="h-4 w-4 text-blue-600" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white p-6 rounded-lg border border-gray-200">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by ID"
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              value={filters.search}
              onChange={(e) => handleFilterChange('search', e.target.value)}
            />
          </div>

          {/* Paid To */}
          <select
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            value={filters.paidTo}
            onChange={(e) => handleFilterChange('paidTo', e.target.value)}
          >
            <option value="">Paid to</option>
            {teamMembers.map((member) => (
              <option key={member.user_id} value={member.user_id}>
                {member.name}
              </option>
            ))}
          </select>

          {/* Paid By */}
          <select
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            value={filters.paidBy}
            onChange={(e) => handleFilterChange('paidBy', e.target.value)}
          >
            <option value="">Paid by</option>
            {teamMembers.map((member) => (
              <option key={member.user_id} value={member.user_id}>
                {member.name}
              </option>
            ))}
          </select>

          {/* Project */}
          <div>
            <ProjectSelector
              selectedProjectId={selectedProjectId}
              onProjectChange={handleProjectChange}
              className="w-full"
              placeholder="Project"
            />
          </div>

          {/* Category */}
          <select
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            value={filters.category}
            onChange={(e) => handleFilterChange('category', e.target.value)}
          >
            <option value="">Category</option>
            {categories.map((category) => (
              <option key={category.category_id} value={category.category_id}>
                {category.category_name}
              </option>
            ))}
          </select>

          {/* Approval Status */}
          <select
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            value={filters.approvalStatus}
            onChange={(e) => handleFilterChange('approvalStatus', e.target.value)}
          >
            <option value="">Approval status</option>
            <option value="PENDING">Pending</option>
            <option value="APPROVED">Approved</option>
            <option value="REJECTED">Rejected</option>
          </select>

          {/* Created On */}
          <input
            type="date"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            value={filters.createdOn}
            onChange={(e) => handleFilterChange('createdOn', e.target.value)}
          />

          {/* Sort */}
          <button className="w-full px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center justify-between">
            Sort by Date created (Latest first)
            <ChevronDown className="h-4 w-4" />
          </button>
        </div>

        {/* Additional Controls */}
        <div className="flex items-center justify-between mt-4">
          <div className="flex items-center space-x-4">
            <label className="flex items-center">
              <input type="checkbox" className="mr-2" />
              Show only deleted
            </label>
            <button className="flex items-center text-gray-600 hover:text-gray-800">
              <Users className="h-4 w-4 mr-1" />
              Manage Columns
            </button>
          </div>
        </div>
      </div>

      {/* Payments Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading payments...</p>
          </div>
        ) : error ? (
          <div className="text-center py-12">
            <IndianRupee className="h-12 w-12 text-red-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Error Loading Payments</h3>
            <p className="text-gray-600 mb-4">{error}</p>
            <button 
              onClick={fetchPayments}
              className="btn btn-secondary"
            >
              Try Again
            </button>
          </div>
        ) : payments.length === 0 ? (
          <div className="text-center py-12">
            <IndianRupee className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Payments Found</h3>
            <p className="text-gray-600">
              No payments have been recorded yet.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Payment reference ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Paid to
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Paid by
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Project
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Paid on
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Payment type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Paid amount
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {payments.map((payment) => (
                  <tr key={payment.payment_id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <span className="text-sm font-medium text-gray-900">
                          {payment.payment_reference_id}
                        </span>
                        <ChevronRight className="h-4 w-4 text-gray-400 ml-1" />
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {getPaidToDisplay(payment)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {getPaidByDisplay(payment)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {payment.project?.name || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatDate(payment.payment_date)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        {getStatusIcon(payment.status)}
                        <span className="ml-2 text-sm text-gray-900">
                          {payment.category?.category_name || '-'}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {formatCurrency(payment.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Payment Form Modal */}
      <PaymentForm
        isOpen={isPaymentFormOpen}
        onClose={() => setIsPaymentFormOpen(false)}
        onSuccess={() => {
          fetchPayments();
          setIsPaymentFormOpen(false);
        }}
        projectId={selectedProjectId || undefined}
      />
    </div>
  );
};

export default Expenses;