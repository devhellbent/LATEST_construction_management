import React, { useState, useEffect } from 'react';
import { IndianRupee, Plus, Calendar, User, CheckCircle, Clock, AlertCircle, Edit, Trash2 } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import toast from 'react-hot-toast';
import ProjectSelector from '../components/ProjectSelector';
import MemberSelector from '../components/MemberSelector';
import { api } from '../services/api';

interface PettyCashExpense {
  expense_id: number;
  project_id: number;
  user_id: number;
  category: 'Kirana' | 'Machinery_Rent' | 'Labour_Expense' | 'Other';
  category_other_text?: string;
  amount: number;
  date: string;
  description?: string;
  approved_by_user_id?: number;
  created_by?: number;
  updated_by?: number;
  created_at: string;
  updated_at: string;
  project?: {
    project_id: number;
    name: string;
  };
  user?: {
    user_id: number;
    name: string;
  };
  approvedBy?: {
    user_id: number;
    name: string;
  };
}

const CommercialPettyCash: React.FC = () => {
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);
  const [selectedMemberId, setSelectedMemberId] = useState<number | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingExpense, setEditingExpense] = useState<PettyCashExpense | null>(null);
  const [formData, setFormData] = useState({
    project_id: '',
    user_id: '',
    category: 'Kirana' as 'Kirana' | 'Machinery_Rent' | 'Labour_Expense' | 'Other',
    category_other_text: '',
    amount: '',
    date: new Date().toISOString().split('T')[0],
    description: ''
  });

  const queryClient = useQueryClient();

  // Fetch latest expenses
  const { data: latestExpenses, isLoading: isLoadingLatest } = useQuery(
    ['petty-cash-latest'],
    () => api.get('/expenses/latest?limit=5'),
    {
      select: (response) => response.data.expenses
    }
  );

  // Fetch all expenses with filters
  const { data: filteredExpenses, isLoading: isLoadingFiltered } = useQuery(
    ['petty-cash-filtered', selectedProjectId, selectedMemberId],
    () => {
      const params = new URLSearchParams();
      if (selectedProjectId) params.append('project_id', selectedProjectId.toString());
      if (selectedMemberId) params.append('user_id', selectedMemberId.toString());
      params.append('limit', '20');
      return api.get(`/expenses?${params.toString()}`);
    },
    {
      select: (response) => response.data.expenses
    }
  );

  // Create expense mutation
  const createExpenseMutation = useMutation(
    (data: any) => api.post('/expenses', data),
    {
      onSuccess: () => {
        toast.success('Expense created successfully');
        queryClient.invalidateQueries(['petty-cash-latest']);
        queryClient.invalidateQueries(['petty-cash-filtered']);
        resetForm(true);
      },
      onError: (error: any) => {
        toast.error(error.response?.data?.message || 'Failed to create expense');
      }
    }
  );

  // Update expense mutation
  const updateExpenseMutation = useMutation(
    ({ id, data }: { id: number; data: any }) => api.put(`/expenses/${id}`, data),
    {
      onSuccess: () => {
        toast.success('Expense updated successfully');
        queryClient.invalidateQueries(['petty-cash-latest']);
        queryClient.invalidateQueries(['petty-cash-filtered']);
        resetForm(true);
      },
      onError: (error: any) => {
        toast.error(error.response?.data?.message || 'Failed to update expense');
      }
    }
  );

  // Approve expense mutation
  const approveExpenseMutation = useMutation(
    (id: number) => api.patch(`/expenses/${id}/approve`),
    {
      onSuccess: () => {
        toast.success('Expense approved successfully');
        queryClient.invalidateQueries(['petty-cash-latest']);
        queryClient.invalidateQueries(['petty-cash-filtered']);
      },
      onError: (error: any) => {
        toast.error(error.response?.data?.message || 'Failed to approve expense');
      }
    }
  );

  // Delete expense mutation
  const deleteExpenseMutation = useMutation(
    (id: number) => api.delete(`/expenses/${id}`),
    {
      onSuccess: () => {
        toast.success('Expense deleted successfully');
        queryClient.invalidateQueries(['petty-cash-latest']);
        queryClient.invalidateQueries(['petty-cash-filtered']);
      },
      onError: (error: any) => {
        toast.error(error.response?.data?.message || 'Failed to delete expense');
      }
    }
  );

  const handleProjectChange = (projectId: number | null) => {
    setSelectedProjectId(projectId);
    setSelectedMemberId(null); // Reset member filter when project changes
    if (projectId) {
      setFormData(prev => ({ ...prev, project_id: projectId.toString(), user_id: '' }));
    }
  };

  const handleMemberChange = (memberId: number | null) => {
    setFormData(prev => ({ ...prev, user_id: memberId?.toString() || '' }));
  };

  const handleFilterMemberChange = (memberId: number | null) => {
    setSelectedMemberId(memberId);
  };

  const resetForm = (hideForm = false) => {
    setFormData({
      project_id: '',
      user_id: '',
      category: 'Kirana' as 'Kirana' | 'Machinery_Rent' | 'Labour_Expense' | 'Other',
      category_other_text: '',
      amount: '',
      date: new Date().toISOString().split('T')[0],
      description: ''
    });
    setSelectedProjectId(null);
    setSelectedMemberId(null);
    if (hideForm) {
      setShowForm(false);
    }
    setEditingExpense(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.project_id || !formData.user_id || !formData.amount || !formData.date) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (formData.category === 'Other' && !formData.category_other_text) {
      toast.error('Please specify the category when selecting "Other"');
      return;
    }

    const submitData = {
      ...formData,
      project_id: parseInt(formData.project_id),
      user_id: parseInt(formData.user_id),
      amount: parseFloat(formData.amount)
    };

    if (editingExpense) {
      updateExpenseMutation.mutate({ id: editingExpense.expense_id, data: submitData });
    } else {
      createExpenseMutation.mutate(submitData);
    }
  };

  const handleEdit = (expense: PettyCashExpense) => {
    setEditingExpense(expense);
    setFormData({
      project_id: expense.project_id.toString(),
      user_id: expense.user_id.toString(),
      category: expense.category,
      category_other_text: expense.category_other_text || '',
      amount: expense.amount.toString(),
      date: expense.date,
      description: expense.description || ''
    });
    setShowForm(true);
  };

  const handleDelete = (id: number) => {
    if (window.confirm('Are you sure you want to delete this expense?')) {
      deleteExpenseMutation.mutate(id);
    }
  };

  const handleApprove = (id: number) => {
    if (window.confirm('Are you sure you want to approve this expense?')) {
      approveExpenseMutation.mutate(id);
    }
  };

  const getCategoryDisplayName = (category: string, otherText?: string) => {
    switch (category) {
      case 'Kirana': return 'Kirana';
      case 'Machinery_Rent': return 'Machinery Rent';
      case 'Labour_Expense': return 'Labour Expense';
      case 'Other': return otherText || 'Other';
      default: return category;
    }
  };

  const getStatusIcon = (expense: PettyCashExpense) => {
    if (expense.approved_by_user_id) {
      return <CheckCircle className="h-4 w-4 text-green-500" />;
    }
    return <Clock className="h-4 w-4 text-yellow-500" />;
  };

  const getStatusText = (expense: PettyCashExpense) => {
    if (expense.approved_by_user_id) {
      return 'Approved';
    }
    return 'Pending';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-3">
          <IndianRupee className="h-8 w-8 text-primary-600" />
          <h1 className="text-3xl font-bold text-gray-900">Petty Cash Management</h1>
        </div>
        <button
          onClick={() => {
            resetForm();
            setShowForm(true);
          }}
          className="btn btn-primary flex items-center"
        >
          <Plus className="h-5 w-5 mr-2" />
          Add Expense
        </button>
      </div>

      {/* Filters */}
      <div className="card p-6 relative z-10">
        <div className="flex items-center space-x-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Filter by Project
            </label>
            <ProjectSelector
              selectedProjectId={selectedProjectId}
              onProjectChange={handleProjectChange}
              className="max-w-md"
              placeholder="All Projects"
            />
          </div>
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Filter by Member
            </label>
            <MemberSelector
              projectId={selectedProjectId}
              selectedMemberId={selectedMemberId}
              onMemberChange={handleFilterMemberChange}
              className="max-w-md"
              placeholder="All Members"
              disabled={!selectedProjectId}
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Latest Expenses */}
        <div className="lg:col-span-1">
          <div className="card p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <Clock className="h-5 w-5 text-primary-600 mr-2" />
              Latest Expenses
            </h3>
            {isLoadingLatest ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="animate-pulse">
                    <div className="h-16 bg-gray-200 rounded-lg"></div>
                  </div>
                ))}
              </div>
            ) : latestExpenses?.length ? (
              <div className="space-y-3">
                {latestExpenses.map((expense: PettyCashExpense) => (
                  <div key={expense.expense_id} className="border border-gray-200 rounded-lg p-3 hover:bg-gray-50 transition-colors">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          {getStatusIcon(expense)}
                          <span className="text-sm font-medium text-gray-900">
                            {getCategoryDisplayName(expense.category, expense.category_other_text)}
                          </span>
                        </div>
                        <p className="text-xs text-gray-600 mb-1">
                          {expense.project?.name} • {expense.user?.name}
                        </p>
                        <p className="text-sm font-semibold text-primary-600">
                          ₹{expense.amount.toLocaleString()}
                        </p>
                        <p className="text-xs text-gray-500">
                          {new Date(expense.date).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex space-x-1">
                        <button
                          onClick={() => handleEdit(expense)}
                          className="p-1 text-gray-400 hover:text-primary-600 transition-colors"
                        >
                          <Edit className="h-3 w-3" />
                        </button>
                        <button
                          onClick={() => handleDelete(expense.expense_id)}
                          className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">No expenses found</p>
              </div>
            )}
          </div>
        </div>

        {/* Main Content */}
        <div className="lg:col-span-2">
          {showForm ? (
            <div className="card p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                {editingExpense ? 'Edit Expense' : 'Add New Expense'}
              </h3>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Project *
                    </label>
                    <ProjectSelector
                      selectedProjectId={selectedProjectId}
                      onProjectChange={handleProjectChange}
                      className="w-full"
                      placeholder="Select project..."
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Member *
                    </label>
                    <MemberSelector
                      projectId={selectedProjectId}
                      selectedMemberId={formData.user_id ? parseInt(formData.user_id) : null}
                      onMemberChange={handleMemberChange}
                      className="w-full"
                      placeholder="Select member..."
                      disabled={!selectedProjectId}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Category *
                    </label>
                    <select
                      value={formData.category}
                      onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value as any }))}
                      className="input w-full"
                      required
                    >
                      <option value="Kirana">Kirana</option>
                      <option value="Machinery_Rent">Machinery Rent</option>
                      <option value="Labour_Expense">Labour Expense</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Amount *
                    </label>
                    <div className="relative">
                      <IndianRupee className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={formData.amount}
                        onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
                        className="input w-full pl-10"
                        placeholder="0.00"
                        required
                      />
                    </div>
                  </div>
                </div>

                {formData.category === 'Other' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Specify Category *
                    </label>
                    <input
                      type="text"
                      value={formData.category_other_text}
                      onChange={(e) => setFormData(prev => ({ ...prev, category_other_text: e.target.value }))}
                      className="input w-full"
                      placeholder="Enter category description..."
                      required
                    />
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Date *
                    </label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <input
                        type="date"
                        value={formData.date}
                        onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                        className="input w-full pl-10"
                        required
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    className="input w-full"
                    rows={3}
                    placeholder="Enter expense description..."
                  />
                </div>

                <div className="flex space-x-3 pt-4">
                  <button
                    type="submit"
                    disabled={createExpenseMutation.isLoading || updateExpenseMutation.isLoading}
                    className="btn btn-primary flex-1"
                  >
                    {createExpenseMutation.isLoading || updateExpenseMutation.isLoading ? 'Saving...' : 'Save Expense'}
                  </button>
                  <button
                    type="button"
                    onClick={() => resetForm(true)}
                    className="btn btn-secondary"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          ) : (
            <div className="card p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Expenses
                {filteredExpenses && ` (${filteredExpenses.length} total)`}
              </h3>
              {isLoadingFiltered ? (
                <div className="space-y-3">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="animate-pulse">
                      <div className="h-20 bg-gray-200 rounded-lg"></div>
                    </div>
                  ))}
                </div>
              ) : filteredExpenses?.length ? (
                <div className="space-y-3">
                  {filteredExpenses.map((expense: PettyCashExpense) => (
                    <div key={expense.expense_id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-2">
                            {getStatusIcon(expense)}
                            <span className="text-sm font-medium text-gray-900">
                              {getCategoryDisplayName(expense.category, expense.category_other_text)}
                            </span>
                            <span className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded-full">
                              {getStatusText(expense)}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600 mb-2">
                            {expense.description || 'No description provided'}
                          </p>
                          <div className="flex items-center space-x-4 text-xs text-gray-500">
                            <span>Amount: ₹{expense.amount.toLocaleString()}</span>
                            <span>Date: {new Date(expense.date).toLocaleDateString()}</span>
                            <span>By: {expense.user?.name}</span>
                            {expense.approvedBy && (
                              <span>Approved by: {expense.approvedBy.name}</span>
                            )}
                          </div>
                        </div>
                        <div className="flex space-x-2">
                          {!expense.approved_by_user_id && (
                            <button
                              onClick={() => handleApprove(expense.expense_id)}
                              className="btn btn-sm btn-success"
                              disabled={approveExpenseMutation.isLoading}
                            >
                              Approve
                            </button>
                          )}
                          <button
                            onClick={() => handleEdit(expense)}
                            className="btn btn-sm btn-secondary"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDelete(expense.expense_id)}
                            className="btn btn-sm btn-danger"
                            disabled={deleteExpenseMutation.isLoading}
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <IndianRupee className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">
                    {selectedProjectId || selectedMemberId 
                      ? 'No expenses found matching the selected filters' 
                      : 'No expenses found'}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CommercialPettyCash;

