import React, { useState, useEffect } from 'react';
import { 
  subcontractorLedgerAPI, 
  subcontractorsAPI,
  projectsAPI 
} from '../services/api';
import { 
  Users, 
  CreditCard, 
  TrendingUp, 
  AlertTriangle, 
  Plus, 
  X,
  Calendar,
  IndianRupee,
  FileText,
  RefreshCw,
  ShoppingCart,
  Wallet,
  Scale,
  Search,
  ChevronDown,
  Building2,
  Filter,
  CheckSquare
} from 'lucide-react';

interface SubcontractorLedgerEntry {
  ledger_id: number;
  subcontractor_id: number;
  subcontractor_name: string;
  project_id: number;
  project_name: string;
  payment_date: string;
  payment_amount: number;
  payment_type: 'ADVANCE' | 'PROGRESS' | 'FINAL' | 'RETENTION' | 'OTHER';
  payment_method: 'CASH' | 'CHEQUE' | 'NEFT' | 'RTGS' | 'UPI' | 'OTHER';
  reference_number?: string;
  description?: string;
  bill_number?: string;
  bill_date?: string;
  bill_amount?: number;
  status: 'PENDING' | 'APPROVED' | 'PAID' | 'REJECTED';
  created_by: string;
  created_at: string;
}

interface SubcontractorSummary {
  subcontractor_id: number;
  subcontractor_name: string;
  project_id: number;
  project_name: string;
  total_payments: number;
  outstanding_balance: number;
  last_payment_date?: string;
  payment_status: 'PENDING' | 'PARTIAL' | 'PAID';
}

interface PaymentFormData {
  subcontractor_id: number;
  project_id: number;
  payment_date: string;
  payment_amount: number;
  payment_type: 'ADVANCE' | 'PROGRESS' | 'FINAL' | 'RETENTION' | 'OTHER';
  payment_method: 'CASH' | 'CHEQUE' | 'NEFT' | 'RTGS' | 'UPI' | 'OTHER';
  reference_number: string;
  description: string;
  bill_number: string;
  bill_date: string;
  bill_amount: number;
  status: 'PENDING' | 'APPROVED' | 'PAID' | 'REJECTED';
}

const SubcontractorLedger: React.FC = () => {
  const [ledgerEntries, setLedgerEntries] = useState<SubcontractorLedgerEntry[]>([]);
  const [subcontractorSummaries, setSubcontractorSummaries] = useState<SubcontractorSummary[]>([]);
  const [subcontractors, setSubcontractors] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [selectedSubcontractor, setSelectedSubcontractor] = useState<SubcontractorSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('summary');
  const [formData, setFormData] = useState<PaymentFormData>({
    subcontractor_id: 0,
    project_id: 0,
    payment_date: new Date().toISOString().split('T')[0],
    payment_amount: 0,
    payment_type: 'PROGRESS',
    payment_method: 'NEFT',
    reference_number: '',
    description: '',
    bill_number: '',
    bill_date: '',
    bill_amount: 0,
    status: 'PENDING'
  });

  // New state for subcontractor-specific ledger
  const [selectedSubcontractorForLedger, setSelectedSubcontractorForLedger] = useState<any>(null);
  const [subcontractorLedgerEntries, setSubcontractorLedgerEntries] = useState<any[]>([]);
  const [subcontractorDropdownOpen, setSubcontractorDropdownOpen] = useState(false);
  const [subcontractorSearchTerm, setSubcontractorSearchTerm] = useState('');
  const [subcontractorLedgerLoading, setSubcontractorLedgerLoading] = useState(false);

  // Filter states
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);
  const [selectedSubcontractorId, setSelectedSubcontractorId] = useState<number | null>(null);
  const [projectSubcontractors, setProjectSubcontractors] = useState<any[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (subcontractorDropdownOpen) {
        const target = event.target as HTMLElement;
        if (!target.closest('.subcontractor-dropdown-container')) {
          setSubcontractorDropdownOpen(false);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [subcontractorDropdownOpen]);

  // Fetch subcontractors when project changes
  useEffect(() => {
    if (selectedProjectId) {
      fetchProjectSubcontractors(selectedProjectId);
    } else {
      setProjectSubcontractors([]);
    }
  }, [selectedProjectId]);

  const loadData = async () => {
    setLoading(true);
    try {
      // Load projects
      const projectsResponse = await projectsAPI.getProjects();
      setProjects(projectsResponse.data.projects || []);

      // Load subcontractor summaries
      const summaryResponse = await subcontractorLedgerAPI.getLedgerSummary();
      setSubcontractorSummaries(summaryResponse.data.summaries || []);

      // Load all subcontractors
      const subcontractorsResponse = await subcontractorsAPI.getSubcontractors();
      setSubcontractors(subcontractorsResponse.data.data?.subcontractors || []);

      // Load ledger entries
      const ledgerResponse = await subcontractorLedgerAPI.getLedgerEntries();
      setLedgerEntries(ledgerResponse.data.ledgerEntries || []);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchProjectSubcontractors = async (projectId: number) => {
    try {
      const response = await subcontractorsAPI.getSubcontractorsByProject(projectId);
      setProjectSubcontractors(response.data.data?.subcontractors || []);
    } catch (error) {
      console.error('Error fetching project subcontractors:', error);
      setProjectSubcontractors([]);
    }
  };

  const handleRecordPayment = async () => {
    if (!formData.subcontractor_id || !formData.project_id || !formData.payment_amount) {
      alert('Please fill in all required fields');
      return;
    }

    setLoading(true);
    try {
      await subcontractorLedgerAPI.createLedgerEntry(formData);
      setShowPaymentForm(false);
      resetForm();
      loadData();
    } catch (error) {
      console.error('Error recording payment:', error);
      alert('Failed to record payment');
    } finally {
      setLoading(false);
    }
  };

  // Load subcontractor-specific ledger
  const loadSubcontractorLedger = async (subcontractorId: number) => {
    setSubcontractorLedgerLoading(true);
    try {
      const response = await subcontractorLedgerAPI.getSubcontractorLedger(subcontractorId);
      setSubcontractorLedgerEntries(response.data.ledgerEntries || []);
    } catch (error) {
      console.error('Error loading subcontractor ledger:', error);
      setSubcontractorLedgerEntries([]);
    } finally {
      setSubcontractorLedgerLoading(false);
    }
  };

  // Handle subcontractor selection for ledger view
  const handleSubcontractorSelection = (subcontractor: any) => {
    setSelectedSubcontractorForLedger(subcontractor);
    setSubcontractorDropdownOpen(false);
    setSubcontractorSearchTerm('');
    loadSubcontractorLedger(subcontractor.subcontractor_id);
  };

  // Filter subcontractors based on search term
  const filteredSubcontractors = subcontractors.filter(subcontractor =>
    subcontractor.company_name.toLowerCase().includes(subcontractorSearchTerm.toLowerCase())
  );

  const resetForm = () => {
    setFormData({
      subcontractor_id: 0,
      project_id: selectedProjectId || 0,
      payment_date: new Date().toISOString().split('T')[0],
      payment_amount: 0,
      payment_type: 'PROGRESS',
      payment_method: 'NEFT',
      reference_number: '',
      description: '',
      bill_number: '',
      bill_date: '',
      bill_amount: 0,
      status: 'PENDING'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING': return 'bg-yellow-100 text-yellow-800';
      case 'APPROVED': return 'bg-blue-100 text-blue-800';
      case 'PAID': return 'bg-green-100 text-green-800';
      case 'REJECTED': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPaymentTypeIcon = (type: string) => {
    switch (type) {
      case 'ADVANCE': return <TrendingUp className="h-5 w-5" />;
      case 'PROGRESS': return <RefreshCw className="h-5 w-5" />;
      case 'FINAL': return <CheckSquare className="h-5 w-5" />;
      case 'RETENTION': return <Scale className="h-5 w-5" />;
      default: return <FileText className="h-5 w-5" />;
    }
  };

  if (loading && subcontractorSummaries.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="loading-spinner h-12 w-12"></div>
        <p className="text-slate-600 font-medium ml-4">Loading subcontractor data...</p>
      </div>
    );
  }

  return (
    <div className="space-responsive">
      <div className="text-center lg:text-left">
        <h1 className="text-responsive-3xl font-bold text-slate-900">Subcontractor Ledger Management</h1>
        <p className="text-responsive-base text-slate-600 mt-2">Track subcontractor payments, transactions, and outstanding balances</p>
      </div>

      {/* Tab Navigation */}
      <div className="card-mobile">
        <div className="border-b border-slate-200">
          <nav className="-mb-px flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-8">
            <button
              onClick={() => setActiveTab('summary')}
              className={`py-3 px-1 border-b-2 font-semibold text-xs sm:text-sm transition-colors ${
                activeTab === 'summary'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center space-x-2">
                <Users className="h-3 w-3 sm:h-4 sm:w-4" />
                <span>Subcontractor Summary</span>
              </div>
            </button>
            <button
              onClick={() => setActiveTab('ledger')}
              className={`py-3 px-1 border-b-2 font-semibold text-xs sm:text-sm transition-colors ${
                activeTab === 'ledger'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center space-x-2">
                <FileText className="h-3 w-3 sm:h-4 sm:w-4" />
                <span>Transaction Ledger</span>
              </div>
            </button>
            <button
              onClick={() => setActiveTab('subcontractor-ledger')}
              className={`py-3 px-1 border-b-2 font-semibold text-xs sm:text-sm transition-colors ${
                activeTab === 'subcontractor-ledger'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center space-x-2">
                <Scale className="h-3 w-3 sm:h-4 sm:w-4" />
                <span>Subcontractor Ledger</span>
              </div>
            </button>
          </nav>
        </div>
      </div>

      {activeTab === 'summary' && (
        <div className="space-y-4 sm:space-y-6">
          <div className="card-mobile">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 sm:mb-6 gap-4">
              <div>
                <h2 className="text-lg sm:text-2xl font-bold text-slate-900">Subcontractor Summary</h2>
                <p className="text-slate-600 mt-1 text-xs sm:text-sm">Overview of subcontractor transactions and outstanding balances</p>
              </div>
              <div className="h-10 w-10 sm:h-12 sm:w-12 bg-primary-100 rounded-xl flex items-center justify-center">
                <Users className="h-5 w-5 sm:h-6 sm:w-6 text-primary-600" />
              </div>
            </div>
            
            {subcontractorSummaries.length === 0 ? (
              <div className="text-center py-8 sm:py-12">
                <div className="h-16 w-16 sm:h-20 sm:w-20 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4 sm:mb-6">
                  <Users className="h-8 w-8 sm:h-10 sm:w-10 text-slate-400" />
                </div>
                <h3 className="text-lg sm:text-xl font-bold text-slate-900 mb-2">No Subcontractor Data</h3>
                <p className="text-slate-600 max-w-md mx-auto text-sm sm:text-base">
                  No subcontractor data is available at this time. Subcontractor information will appear here once transactions are recorded.
                </p>
              </div>
            ) : (
              <div className="table-container">
                <table className="table">
                  <thead>
                    <tr>
                      <th className="text-xs sm:text-sm">
                        Subcontractor
                      </th>
                      <th className="text-xs sm:text-sm hidden md:table-cell">
                        Project
                      </th>
                      <th className="text-xs sm:text-sm hidden md:table-cell">
                        Total Payments
                      </th>
                      <th className="text-xs sm:text-sm">
                        Outstanding Balance
                      </th>
                      <th className="text-xs sm:text-sm hidden lg:table-cell">
                        Last Payment
                      </th>
                      <th className="text-xs sm:text-sm">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {subcontractorSummaries.map((summary) => (
                      <tr key={summary.subcontractor_id}>
                        <td className="text-xs sm:text-sm">
                          <div className="flex items-center space-x-3">
                            <div className="h-8 w-8 bg-primary-100 rounded-lg flex items-center justify-center">
                              <Building2 className="h-4 w-4 text-primary-600" />
                            </div>
                            <div>
                              <div className="font-medium text-slate-900">{summary.subcontractor_name}</div>
                            </div>
                          </div>
                        </td>
                        <td className="text-xs sm:text-sm hidden md:table-cell">
                          {summary.project_name}
                        </td>
                        <td className="text-xs sm:text-sm hidden md:table-cell">
                          <div className="flex items-center space-x-1">
                            <IndianRupee className="h-3 w-3 text-slate-400" />
                            <span className="font-medium">{summary.total_payments.toLocaleString()}</span>
                          </div>
                        </td>
                        <td className="text-xs sm:text-sm">
                          <div className="flex items-center space-x-1">
                            <IndianRupee className="h-3 w-3 text-slate-400" />
                            <span className={`font-medium ${summary.outstanding_balance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                              {summary.outstanding_balance.toLocaleString()}
                            </span>
                          </div>
                        </td>
                        <td className="text-xs sm:text-sm hidden lg:table-cell">
                          {summary.last_payment_date ? (
                            <div className="flex items-center space-x-1">
                              <Calendar className="h-3 w-3 text-slate-400" />
                              <span>{new Date(summary.last_payment_date).toLocaleDateString()}</span>
                            </div>
                          ) : (
                            <span className="text-slate-400">No payments</span>
                          )}
                        </td>
                        <td className="text-xs sm:text-sm">
                          <button
                            onClick={() => {
                              setSelectedSubcontractor(summary);
                              setActiveTab('subcontractor-ledger');
                            }}
                            className="btn btn-sm btn-primary"
                          >
                            View Ledger
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'ledger' && (
        <div className="space-y-4 sm:space-y-6">
          <div className="card-mobile">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 sm:mb-6 gap-4">
              <div>
                <h2 className="text-lg sm:text-2xl font-bold text-slate-900">Transaction Ledger</h2>
                <p className="text-slate-600 mt-1 text-xs sm:text-sm">All subcontractor payment transactions</p>
              </div>
              <button
                onClick={() => setShowPaymentForm(true)}
                className="btn btn-primary flex items-center space-x-2"
              >
                <Plus className="h-4 w-4" />
                <span>Add Payment</span>
              </button>
            </div>

            {/* Filters */}
            <div className="mb-6 p-4 bg-slate-50 rounded-lg">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-slate-700 mb-2">Filter by Project</label>
                  <select
                    value={selectedProjectId || ''}
                    onChange={(e) => setSelectedProjectId(e.target.value ? parseInt(e.target.value) : null)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="">All Projects</option>
                    {projects.map((project) => (
                      <option key={project.project_id} value={project.project_id}>
                        {project.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex-1">
                  <label className="block text-sm font-medium text-slate-700 mb-2">Filter by Subcontractor</label>
                  <select
                    value={selectedSubcontractorId || ''}
                    onChange={(e) => setSelectedSubcontractorId(e.target.value ? parseInt(e.target.value) : null)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="">All Subcontractors</option>
                    {projectSubcontractors.map((subcontractor) => (
                      <option key={subcontractor.subcontractor_id} value={subcontractor.subcontractor_id}>
                        {subcontractor.company_name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {ledgerEntries.length === 0 ? (
              <div className="text-center py-8 sm:py-12">
                <div className="h-16 w-16 sm:h-20 sm:w-20 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4 sm:mb-6">
                  <FileText className="h-8 w-8 sm:h-10 sm:w-10 text-slate-400" />
                </div>
                <h3 className="text-lg sm:text-xl font-bold text-slate-900 mb-2">No Transactions Found</h3>
                <p className="text-slate-600 max-w-md mx-auto text-sm sm:text-base">
                  No payment transactions have been recorded yet. Click "Add Payment" to create your first entry.
                </p>
              </div>
            ) : (
              <div className="table-container">
                <table className="table">
                  <thead>
                    <tr>
                      <th className="text-xs sm:text-sm">Date</th>
                      <th className="text-xs sm:text-sm">Subcontractor</th>
                      <th className="text-xs sm:text-sm">Project</th>
                      <th className="text-xs sm:text-sm">Amount</th>
                      <th className="text-xs sm:text-sm">Type</th>
                      <th className="text-xs sm:text-sm">Method</th>
                      <th className="text-xs sm:text-sm">Status</th>
                      <th className="text-xs sm:text-sm">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ledgerEntries.map((entry) => (
                      <tr key={entry.ledger_id}>
                        <td className="text-xs sm:text-sm">
                          <div className="flex items-center space-x-1">
                            <Calendar className="h-3 w-3 text-slate-400" />
                            <span>{new Date(entry.payment_date).toLocaleDateString()}</span>
                          </div>
                        </td>
                        <td className="text-xs sm:text-sm font-medium">{entry.subcontractor_name}</td>
                        <td className="text-xs sm:text-sm">{entry.project_name}</td>
                        <td className="text-xs sm:text-sm">
                          <div className="flex items-center space-x-1">
                            <IndianRupee className="h-3 w-3 text-slate-400" />
                            <span className="font-medium">{entry.payment_amount.toLocaleString()}</span>
                          </div>
                        </td>
                        <td className="text-xs sm:text-sm">
                          <div className="flex items-center space-x-1">
                            {getPaymentTypeIcon(entry.payment_type)}
                            <span>{entry.payment_type}</span>
                          </div>
                        </td>
                        <td className="text-xs sm:text-sm">{entry.payment_method}</td>
                        <td className="text-xs sm:text-sm">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(entry.status)}`}>
                            {entry.status}
                          </span>
                        </td>
                        <td className="text-xs sm:text-sm">
                          <div className="flex space-x-1">
                            <button className="btn btn-sm btn-secondary">Edit</button>
                            <button className="btn btn-sm btn-danger">Delete</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'subcontractor-ledger' && (
        <div className="space-y-4 sm:space-y-6">
          <div className="card-mobile">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 sm:mb-6 gap-4">
              <div>
                <h2 className="text-lg sm:text-2xl font-bold text-slate-900">Subcontractor Ledger</h2>
                <p className="text-slate-600 mt-1 text-xs sm:text-sm">View detailed ledger for a specific subcontractor</p>
              </div>
            </div>

            {/* Subcontractor Selection */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-slate-700 mb-2">Select Subcontractor</label>
              <div className="relative subcontractor-dropdown-container">
                <button
                  onClick={() => setSubcontractorDropdownOpen(!subcontractorDropdownOpen)}
                  className="w-full px-4 py-3 text-left bg-white border border-slate-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 flex items-center justify-between"
                >
                  <span className="text-slate-700">
                    {selectedSubcontractorForLedger ? selectedSubcontractorForLedger.company_name : 'Select a subcontractor...'}
                  </span>
                  <ChevronDown className="h-5 w-5 text-slate-400" />
                </button>

                {subcontractorDropdownOpen && (
                  <div className="absolute z-[9999] w-full mt-1 bg-white border border-slate-300 rounded-lg shadow-xl">
                    <div className="p-3 border-b border-slate-200">
                      <input
                        type="text"
                        placeholder="Search subcontractors..."
                        value={subcontractorSearchTerm}
                        onChange={(e) => setSubcontractorSearchTerm(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                      />
                    </div>
                    <div className="max-h-60 overflow-y-auto">
                      {filteredSubcontractors.map((subcontractor) => (
                        <button
                          key={subcontractor.subcontractor_id}
                          onClick={() => handleSubcontractorSelection(subcontractor)}
                          className="w-full px-4 py-3 text-left hover:bg-slate-50 flex items-center space-x-3"
                        >
                          <div className="h-8 w-8 bg-primary-100 rounded-lg flex items-center justify-center">
                            <Building2 className="h-4 w-4 text-primary-600" />
                          </div>
                          <div>
                            <div className="font-medium text-slate-900">{subcontractor.company_name}</div>
                            <div className="text-sm text-slate-500">{subcontractor.work_type}</div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {selectedSubcontractorForLedger ? (
              subcontractorLedgerLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="loading-spinner h-8 w-8"></div>
                  <p className="text-slate-600 font-medium ml-4">Loading ledger...</p>
                </div>
              ) : subcontractorLedgerEntries.length === 0 ? (
                <div className="text-center py-8 sm:py-12">
                  <div className="h-16 w-16 sm:h-20 sm:w-20 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4 sm:mb-6">
                    <FileText className="h-8 w-8 sm:h-10 sm:w-10 text-slate-400" />
                  </div>
                  <h3 className="text-lg sm:text-xl font-bold text-slate-900 mb-2">No Transactions Found</h3>
                  <p className="text-slate-600 max-w-md mx-auto text-sm sm:text-base">
                    No transactions found for {selectedSubcontractorForLedger.company_name}.
                  </p>
                </div>
              ) : (
                <div className="table-container">
                  <table className="table">
                    <thead>
                      <tr>
                        <th className="text-xs sm:text-sm">Date</th>
                        <th className="text-xs sm:text-sm">Project</th>
                        <th className="text-xs sm:text-sm">Amount</th>
                        <th className="text-xs sm:text-sm">Type</th>
                        <th className="text-xs sm:text-sm">Method</th>
                        <th className="text-xs sm:text-sm">Status</th>
                        <th className="text-xs sm:text-sm">Description</th>
                      </tr>
                    </thead>
                    <tbody>
                      {subcontractorLedgerEntries.map((entry) => (
                        <tr key={entry.ledger_id}>
                          <td className="text-xs sm:text-sm">
                            <div className="flex items-center space-x-1">
                              <Calendar className="h-3 w-3 text-slate-400" />
                              <span>{new Date(entry.payment_date).toLocaleDateString()}</span>
                            </div>
                          </td>
                          <td className="text-xs sm:text-sm">{entry.project?.name}</td>
                          <td className="text-xs sm:text-sm">
                            <div className="flex items-center space-x-1">
                              <IndianRupee className="h-3 w-3 text-slate-400" />
                              <span className="font-medium">{entry.payment_amount.toLocaleString()}</span>
                            </div>
                          </td>
                          <td className="text-xs sm:text-sm">
                            <div className="flex items-center space-x-1">
                              {getPaymentTypeIcon(entry.payment_type)}
                              <span>{entry.payment_type}</span>
                            </div>
                          </td>
                          <td className="text-xs sm:text-sm">{entry.payment_method}</td>
                          <td className="text-xs sm:text-sm">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(entry.status)}`}>
                              {entry.status}
                            </span>
                          </td>
                          <td className="text-xs sm:text-sm">{entry.description || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )
            ) : (
              <div className="text-center py-8 sm:py-12">
                <div className="h-16 w-16 sm:h-20 sm:w-20 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4 sm:mb-6">
                  <Building2 className="h-8 w-8 sm:h-10 sm:w-10 text-slate-400" />
                </div>
                <h3 className="text-lg sm:text-xl font-bold text-slate-900 mb-2">Select a Subcontractor</h3>
                <p className="text-slate-600 max-w-md mx-auto text-sm sm:text-base">
                  Choose a subcontractor from the dropdown above to view their detailed payment ledger.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Payment Form Modal */}
      {showPaymentForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-slate-900">Add Payment Entry</h2>
                <button
                  onClick={() => {
                    setShowPaymentForm(false);
                    resetForm();
                  }}
                  className="text-slate-400 hover:text-slate-600"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Project *</label>
                    <select
                      value={formData.project_id}
                      onChange={(e) => {
                        const projectId = parseInt(e.target.value);
                        setFormData({ ...formData, project_id: projectId });
                        setSelectedProjectId(projectId);
                      }}
                      className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                      required
                    >
                      <option value={0}>Select project...</option>
                      {projects.map((project) => (
                        <option key={project.project_id} value={project.project_id}>
                          {project.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Subcontractor *</label>
                    <select
                      value={formData.subcontractor_id}
                      onChange={(e) => setFormData({ ...formData, subcontractor_id: parseInt(e.target.value) })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                      required
                    >
                      <option value={0}>Select subcontractor...</option>
                      {projectSubcontractors.map((subcontractor) => (
                        <option key={subcontractor.subcontractor_id} value={subcontractor.subcontractor_id}>
                          {subcontractor.company_name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Payment Date *</label>
                    <input
                      type="date"
                      value={formData.payment_date}
                      onChange={(e) => setFormData({ ...formData, payment_date: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Payment Amount *</label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.payment_amount}
                      onChange={(e) => setFormData({ ...formData, payment_amount: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Payment Type *</label>
                    <select
                      value={formData.payment_type}
                      onChange={(e) => setFormData({ ...formData, payment_type: e.target.value as any })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                      required
                    >
                      <option value="ADVANCE">Advance</option>
                      <option value="PROGRESS">Progress</option>
                      <option value="FINAL">Final</option>
                      <option value="RETENTION">Retention</option>
                      <option value="OTHER">Other</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Payment Method *</label>
                    <select
                      value={formData.payment_method}
                      onChange={(e) => setFormData({ ...formData, payment_method: e.target.value as any })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                      required
                    >
                      <option value="CASH">Cash</option>
                      <option value="CHEQUE">Cheque</option>
                      <option value="NEFT">NEFT</option>
                      <option value="RTGS">RTGS</option>
                      <option value="UPI">UPI</option>
                      <option value="OTHER">Other</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Reference Number</label>
                    <input
                      type="text"
                      value={formData.reference_number}
                      onChange={(e) => setFormData({ ...formData, reference_number: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Status *</label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                      required
                    >
                      <option value="PENDING">Pending</option>
                      <option value="APPROVED">Approved</option>
                      <option value="PAID">Paid</option>
                      <option value="REJECTED">Rejected</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Description</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Bill Number</label>
                    <input
                      type="text"
                      value={formData.bill_number}
                      onChange={(e) => setFormData({ ...formData, bill_number: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Bill Date</label>
                    <input
                      type="date"
                      value={formData.bill_date}
                      onChange={(e) => setFormData({ ...formData, bill_date: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Bill Amount</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.bill_amount}
                    onChange={(e) => setFormData({ ...formData, bill_amount: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => {
                    setShowPaymentForm(false);
                    resetForm();
                  }}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
                <button
                  onClick={handleRecordPayment}
                  disabled={loading}
                  className="btn btn-primary"
                >
                  {loading ? 'Saving...' : 'Save Payment'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SubcontractorLedger;