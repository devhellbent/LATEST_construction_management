import React, { useState, useEffect } from 'react';
import { 
  supplierLedgerAPI, 
  suppliersAPI,
  purchaseOrdersAPI 
} from '../services/api';
import { 
  Users, 
  CreditCard, 
  TrendingUp, 
  AlertTriangle, 
  Plus, 
  X,
  Calendar,
  FileText,
  RefreshCw,
  ShoppingCart,
  Wallet,
  Scale,
  Search,
  ChevronDown
} from 'lucide-react';

interface SupplierLedgerEntry {
  ledger_id: number;
  supplier_id: number;
  supplier_name: string;
  transaction_type: 'PURCHASE' | 'PAYMENT' | 'ADJUSTMENT';
  po_id?: number;
  po_reference_id?: string;
  amount: number;
  balance: number;
  payment_status: 'PENDING' | 'PARTIAL' | 'PAID';
  transaction_date: string;
  description: string;
  created_by: string;
}

interface SupplierSummary {
  supplier_id: number;
  supplier_name: string;
  total_purchases: number;
  total_payments: number;
  outstanding_balance: number;
  last_transaction_date: string;
}

interface PaymentFormData {
  supplier_id: number;
  payment_amount: number;
  payment_date: string;
  payment_method: string;
  reference_number: string;
  notes: string;
}

const SupplierLedgerManagement: React.FC = () => {
  const [ledgerEntries, setLedgerEntries] = useState<SupplierLedgerEntry[]>([]);
  const [supplierSummaries, setSupplierSummaries] = useState<SupplierSummary[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<SupplierSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('summary');
  const [formData, setFormData] = useState<PaymentFormData>({
    supplier_id: 0,
    payment_amount: 0,
    payment_date: new Date().toISOString(),
    payment_method: 'BANK_TRANSFER',
    reference_number: '',
    notes: ''
  });

  // New state for supplier-specific ledger
  const [selectedSupplierForLedger, setSelectedSupplierForLedger] = useState<any>(null);
  const [supplierLedgerEntries, setSupplierLedgerEntries] = useState<any[]>([]);
  const [supplierDropdownOpen, setSupplierDropdownOpen] = useState(false);
  const [supplierSearchTerm, setSupplierSearchTerm] = useState('');
  const [supplierLedgerLoading, setSupplierLedgerLoading] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (supplierDropdownOpen) {
        const target = event.target as HTMLElement;
        if (!target.closest('.supplier-dropdown-container')) {
          setSupplierDropdownOpen(false);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [supplierDropdownOpen]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [summaryRes, ledgerRes, suppliersRes] = await Promise.all([
        supplierLedgerAPI.getLedgerSummary(),
        supplierLedgerAPI.getLedgerEntries({ limit: 100 }),
        suppliersAPI.getSuppliers()
      ]);

      console.log('Summary response:', summaryRes.data);
      console.log('Ledger response:', ledgerRes.data);
      console.log('Suppliers response:', suppliersRes.data);

      setSupplierSummaries(summaryRes.data.summaries || []);
      setLedgerEntries(ledgerRes.data.entries || []);
      setSuppliers(suppliersRes.data.suppliers || []);
    } catch (error) {
      console.error('Error loading supplier ledger data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectSupplier = (supplier: SupplierSummary) => {
    setSelectedSupplier(supplier);
    setFormData(prev => ({
      ...prev,
      supplier_id: supplier.supplier_id,
      payment_amount: Math.min(supplier.outstanding_balance, supplier.outstanding_balance)
    }));
    setShowPaymentForm(true);
  };

  const handleRecordPayment = async () => {
    if (!formData.supplier_id || formData.payment_amount <= 0) {
      alert('Please select a supplier and enter payment amount');
      return;
    }

    setLoading(true);
    try {
      await supplierLedgerAPI.recordPayment({
        supplier_id: formData.supplier_id,
        payment_amount: formData.payment_amount,
        payment_date: formData.payment_date,
        description: `Payment - ${formData.payment_method} - Ref: ${formData.reference_number}`,
        reference_number: formData.reference_number
      });

      alert('Payment recorded successfully!');
      setShowPaymentForm(false);
      setSelectedSupplier(null);
      loadData();
    } catch (error) {
      console.error('Error recording payment:', error);
      alert('Error recording payment');
    } finally {
      setLoading(false);
    }
  };

  // Load supplier-specific ledger
  const loadSupplierLedger = async (supplierId: number) => {
    setSupplierLedgerLoading(true);
    try {
      const response = await supplierLedgerAPI.getSupplierLedger(supplierId);
      setSupplierLedgerEntries(response.data.ledgerEntries || []);
    } catch (error) {
      console.error('Error loading supplier ledger:', error);
      setSupplierLedgerEntries([]);
    } finally {
      setSupplierLedgerLoading(false);
    }
  };

  // Handle supplier selection for ledger view
  const handleSupplierSelection = (supplier: any) => {
    setSelectedSupplierForLedger(supplier);
    setSupplierDropdownOpen(false);
    setSupplierSearchTerm('');
    loadSupplierLedger(supplier.supplier_id);
  };

  // Filter suppliers based on search term
  const filteredSuppliers = suppliers.filter(supplier =>
    supplier.supplier_name.toLowerCase().includes(supplierSearchTerm.toLowerCase())
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING': return 'bg-yellow-100 text-yellow-800';
      case 'PARTIAL': return 'bg-orange-100 text-orange-800';
      case 'PAID': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'PURCHASE': return <ShoppingCart className="h-5 w-5" />;
      case 'PAYMENT': return <Wallet className="h-5 w-5" />;
      case 'ADJUSTMENT': return <Scale className="h-5 w-5" />;
      default: return <FileText className="h-5 w-5" />;
    }
  };

  if (loading && supplierSummaries.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="loading-spinner h-12 w-12"></div>
        <p className="text-slate-600 font-medium ml-4">Loading supplier data...</p>
      </div>
    );
  }

  return (
    <div className="space-responsive">
      <div className="text-center lg:text-left">
        <h1 className="text-responsive-3xl font-bold text-slate-900">Supplier Ledger Management</h1>
        <p className="text-responsive-base text-slate-600 mt-2">Track supplier transactions, payments, and outstanding balances</p>
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
                <span>Supplier Summary</span>
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
            {/** Overdue tab temporarily removed **/}
            <button
              onClick={() => setActiveTab('supplier-ledger')}
              className={`py-3 px-1 border-b-2 font-semibold text-xs sm:text-sm transition-colors ${
                activeTab === 'supplier-ledger'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center space-x-2">
                <Scale className="h-3 w-3 sm:h-4 sm:w-4" />
                <span>Supplier Ledger</span>
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
                <h2 className="text-lg sm:text-2xl font-bold text-slate-900">Supplier Summary</h2>
                <p className="text-slate-600 mt-1 text-xs sm:text-sm">Overview of supplier transactions and outstanding balances</p>
              </div>
              <div className="h-10 w-10 sm:h-12 sm:w-12 bg-primary-100 rounded-xl flex items-center justify-center">
                <Users className="h-5 w-5 sm:h-6 sm:w-6 text-primary-600" />
              </div>
            </div>
            
            {supplierSummaries.length === 0 ? (
              <div className="text-center py-8 sm:py-12">
                <div className="h-16 w-16 sm:h-20 sm:w-20 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4 sm:mb-6">
                  <Users className="h-8 w-8 sm:h-10 sm:w-10 text-slate-400" />
                </div>
                <h3 className="text-lg sm:text-xl font-bold text-slate-900 mb-2">No Supplier Data</h3>
                <p className="text-slate-600 max-w-md mx-auto text-sm sm:text-base">
                  No supplier data is available at this time. Supplier information will appear here once transactions are recorded.
                </p>
              </div>
            ) : (
              <div className="table-container">
                <table className="table">
                  <thead>
                    <tr>
                      <th className="text-xs sm:text-sm">
                        Supplier
                      </th>
                      <th className="text-xs sm:text-sm hidden md:table-cell">
                        Total Purchases
                      </th>
                      <th className="text-xs sm:text-sm hidden md:table-cell">
                        Total Payments
                      </th>
                      <th className="text-xs sm:text-sm">
                        Outstanding Balance
                      </th>
                      <th className="text-xs sm:text-sm hidden lg:table-cell">
                        Last Transaction
                      </th>
                      <th className="text-xs sm:text-sm">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {supplierSummaries.map((supplier) => (
                      <tr key={supplier.supplier_id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="text-xs sm:text-sm">
                          <div className="font-semibold text-slate-900">
                            {supplier.supplier_name}
                          </div>
                          <div className="md:hidden text-xs text-slate-500 mt-1">
                            Purchases: ₹{supplier.total_purchases.toFixed(2)} • Payments: ₹{supplier.total_payments.toFixed(2)}
                          </div>
                        </td>
                        <td className="text-xs sm:text-sm font-semibold text-slate-900 hidden md:table-cell">
                          ₹{supplier.total_purchases.toFixed(2)}
                        </td>
                        <td className="text-xs sm:text-sm font-semibold text-slate-900 hidden md:table-cell">
                          ₹{supplier.total_payments.toFixed(2)}
                        </td>
                        <td>
                          <span className={`status-badge text-xs ${
                            supplier.outstanding_balance > 0 ? 'status-danger' : 'status-success'
                          }`}>
                            ₹{supplier.outstanding_balance.toFixed(2)}
                          </span>
                        </td>
                        <td className="text-xs sm:text-sm text-slate-500 hidden lg:table-cell">
                          {new Date(supplier.last_transaction_date).toLocaleDateString()}
                        </td>
                        <td>
                          {supplier.outstanding_balance > 0 && (
                            <button
                              onClick={() => handleSelectSupplier(supplier)}
                              className="btn btn-sm btn-primary"
                            >
                              <Plus className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                              <span className="hidden sm:inline">Record Payment</span>
                              <span className="sm:hidden">Pay</span>
                            </button>
                          )}
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
                <p className="text-slate-600 mt-1 text-xs sm:text-sm">Detailed view of all supplier transactions</p>
              </div>
              <div className="h-10 w-10 sm:h-12 sm:w-12 bg-primary-100 rounded-xl flex items-center justify-center">
                <FileText className="h-5 w-5 sm:h-6 sm:w-6 text-primary-600" />
              </div>
            </div>
            
            {ledgerEntries.length === 0 ? (
              <div className="text-center py-8 sm:py-12">
                <div className="h-16 w-16 sm:h-20 sm:w-20 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4 sm:mb-6">
                  <FileText className="h-8 w-8 sm:h-10 sm:w-10 text-slate-400" />
                </div>
                <h3 className="text-lg sm:text-xl font-bold text-slate-900 mb-2">No Transactions Found</h3>
                <p className="text-slate-600 max-w-md mx-auto text-sm sm:text-base">
                  No transaction entries are available at this time. Transactions will appear here once recorded.
                </p>
              </div>
            ) : (
              <div className="space-y-3 sm:space-y-4">
                {ledgerEntries.map((entry) => (
                  <div key={entry.ledger_id} className="card-mobile">
                    <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                      <div className="flex items-start space-x-3 sm:space-x-4">
                        <div className="h-10 w-10 sm:h-12 sm:w-12 bg-gradient-to-br from-primary-500 to-primary-600 rounded-xl flex items-center justify-center shadow-lg flex-shrink-0">
                          {getTransactionIcon(entry.transaction_type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-bold text-slate-900 text-sm sm:text-base">{entry.supplier_name}</h4>
                          <p className="text-xs sm:text-sm text-slate-600">{entry.description}</p>
                          {entry.po_reference_id && (
                            <p className="text-xs text-primary-600 font-medium">PO: {entry.po_reference_id}</p>
                          )}
                        </div>
                      </div>
                      
                      <div className="w-full sm:w-auto sm:text-right">
                        <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6">
                          <div>
                            <p className={`font-bold text-base sm:text-lg ${
                              entry.transaction_type === 'PURCHASE' ? 'text-danger-600' : 'text-success-600'
                            }`}>
                              {entry.transaction_type === 'PURCHASE' ? '-' : '+'}₹{entry.amount.toFixed(2)}
                            </p>
                            <p className="text-xs sm:text-sm text-slate-600">
                              Balance: ₹{entry.balance.toFixed(2)}
                            </p>
                          </div>
                          <div className="sm:text-right">
                            <span className={`status-badge text-xs ${
                              entry.payment_status === 'PAID' ? 'status-success' : 
                              entry.payment_status === 'PARTIAL' ? 'status-warning' : 'status-pending'
                            }`}>
                              {entry.payment_status}
                            </span>
                            <p className="text-xs text-slate-500 mt-1">
                              {new Date(entry.transaction_date).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Overdue section temporarily removed */}

      {activeTab === 'supplier-ledger' && (
        <div className="space-y-4 sm:space-y-6">
          <div className="card-mobile">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 sm:mb-6 gap-4">
              <div>
                <h2 className="text-lg sm:text-2xl font-bold text-slate-900">Supplier Ledger</h2>
                <p className="text-slate-600 mt-1 text-xs sm:text-sm">View detailed transaction ledger for specific suppliers</p>
              </div>
              <div className="h-10 w-10 sm:h-12 sm:w-12 bg-primary-100 rounded-xl flex items-center justify-center">
                <Scale className="h-5 w-5 sm:h-6 sm:w-6 text-primary-600" />
              </div>
            </div>

            {/* Supplier Selection Dropdown */}
            <div className="mb-4 sm:mb-6">
              <label className="label label-required mb-2 sm:mb-3">Select Supplier</label>
              <div className="relative supplier-dropdown-container">
                <div
                  className="input cursor-pointer flex items-center justify-between"
                  onClick={() => setSupplierDropdownOpen(!supplierDropdownOpen)}
                >
                  <span className={selectedSupplierForLedger ? 'text-slate-900' : 'text-slate-500'}>
                    {selectedSupplierForLedger ? selectedSupplierForLedger.supplier_name : 'Search and select a supplier...'}
                  </span>
                  <ChevronDown className={`h-4 w-4 sm:h-5 sm:w-5 text-slate-400 transition-transform ${supplierDropdownOpen ? 'rotate-180' : ''}`} />
                </div>

                {supplierDropdownOpen && (
                  <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-60 overflow-hidden">
                    <div className="p-2 sm:p-3 border-b border-slate-200">
                      <div className="relative">
                        <Search className="absolute left-2 sm:left-3 top-1/2 transform -translate-y-1/2 h-3 w-3 sm:h-4 sm:w-4 text-slate-400" />
                        <input
                          type="text"
                          placeholder="Search suppliers..."
                          value={supplierSearchTerm}
                          onChange={(e) => setSupplierSearchTerm(e.target.value)}
                          className="w-full pl-8 sm:pl-10 pr-3 sm:pr-4 py-1.5 sm:py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent text-xs sm:text-sm"
                          onClick={(e) => e.stopPropagation()}
                        />
                      </div>
                    </div>
                    <div className="max-h-48 overflow-y-auto">
                      {filteredSuppliers.length === 0 ? (
                        <div className="p-3 sm:p-4 text-center text-slate-500 text-xs sm:text-sm">
                          {supplierSearchTerm ? 'No suppliers found matching your search.' : 'No suppliers available.'}
                        </div>
                      ) : (
                        filteredSuppliers.map((supplier) => (
                          <div
                            key={supplier.supplier_id}
                            className="p-2 sm:p-3 hover:bg-slate-50 cursor-pointer border-b border-slate-100 last:border-b-0"
                            onClick={() => handleSupplierSelection(supplier)}
                          >
                            <div className="font-medium text-slate-900 text-xs sm:text-sm">{supplier.supplier_name}</div>
                            {supplier.contact_person && (
                              <div className="text-xs text-slate-500">{supplier.contact_person}</div>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Supplier Ledger Display */}
            {selectedSupplierForLedger && (
              <div className="space-y-3 sm:space-y-4">
                <div className="bg-slate-50 rounded-lg p-3 sm:p-4">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0">
                    <div>
                      <h3 className="text-base sm:text-lg font-bold text-slate-900">{selectedSupplierForLedger.supplier_name}</h3>
                      {selectedSupplierForLedger.contact_person && (
                        <p className="text-xs sm:text-sm text-slate-600">Contact: {selectedSupplierForLedger.contact_person}</p>
                      )}
                    </div>
                    <div className="sm:text-right">
                      <p className="text-xs sm:text-sm text-slate-600">Current Balance</p>
                      <p className="text-lg sm:text-xl font-bold text-slate-900">
                        ₹{supplierLedgerEntries.length > 0 ? parseFloat(supplierLedgerEntries[supplierLedgerEntries.length - 1]?.running_balance || 0).toFixed(2) : '0.00'}
                      </p>
                    </div>
                  </div>
                </div>

                {supplierLedgerLoading ? (
                  <div className="text-center py-8 sm:py-12">
                    <div className="animate-spin rounded-full h-8 w-8 sm:h-12 sm:w-12 border-b-2 border-primary-600 mx-auto mb-3 sm:mb-4"></div>
                    <p className="text-slate-600 text-sm sm:text-base">Loading ledger entries...</p>
                  </div>
                ) : supplierLedgerEntries.length === 0 ? (
                  <div className="text-center py-8 sm:py-12">
                    <div className="h-16 w-16 sm:h-20 sm:w-20 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4 sm:mb-6">
                      <FileText className="h-8 w-8 sm:h-10 sm:w-10 text-slate-400" />
                    </div>
                    <h3 className="text-lg sm:text-xl font-bold text-slate-900 mb-2">No Transactions Found</h3>
                    <p className="text-slate-600 max-w-md mx-auto text-sm sm:text-base">
                      No transaction entries found for this supplier. Transactions will appear here once recorded.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3 sm:space-y-4">
                    <h4 className="text-base sm:text-lg font-semibold text-slate-900 mb-3 sm:mb-4">Transaction History</h4>
                    
                    {/* Table Header */}
                    <div className="bg-slate-50 rounded-lg p-3 sm:p-4">
                      <div className="grid grid-cols-12 gap-2 sm:gap-4 text-xs sm:text-sm font-semibold text-slate-600 uppercase tracking-wider">
                        <div className="col-span-4 sm:col-span-3">Transaction Details</div>
                        <div className="col-span-3 sm:col-span-2 text-center">Date</div>
                        <div className="col-span-2 text-right hidden sm:block">Debit (₹)</div>
                        <div className="col-span-2 text-right hidden sm:block">Credit (₹)</div>
                        <div className="col-span-2 text-right">Balance (₹)</div>
                        <div className="col-span-1 text-center hidden sm:block">Status</div>
                      </div>
                    </div>

                    {/* Transaction Entries */}
                    <div className="space-y-2">
                      {supplierLedgerEntries.map((entry, index) => (
                        <div key={entry.ledger_id || index} className="bg-white border border-slate-200 rounded-lg p-3 sm:p-4 hover:bg-slate-50 transition-colors">
                          <div className="grid grid-cols-12 gap-2 sm:gap-4 items-center">
                            {/* Transaction Details */}
                            <div className="col-span-4 sm:col-span-3">
                              <div className="flex items-center space-x-2 sm:space-x-3">
                                <div className="h-6 w-6 sm:h-8 sm:w-8 bg-gradient-to-br from-primary-500 to-primary-600 rounded-lg flex items-center justify-center shadow-sm flex-shrink-0">
                                  {getTransactionIcon(entry.transaction_type)}
                                </div>
                                <div className="min-w-0">
                                  <h5 className="font-semibold text-slate-900 text-xs sm:text-sm">{entry.transaction_type}</h5>
                                  <p className="text-xs text-slate-600 truncate">{entry.description || 'No description'}</p>
                                  {entry.purchaseOrder?.po_number && (
                                    <p className="text-xs text-primary-600 font-medium">PO: {entry.purchaseOrder.po_number}</p>
                                  )}
                                  {/* Mobile: Show amounts inline */}
                                  <div className="sm:hidden mt-1 space-y-1">
                                    {entry.debit_amount && parseFloat(entry.debit_amount) > 0 && (
                                      <p className="text-xs font-bold text-danger-600">Debit: ₹{parseFloat(entry.debit_amount).toFixed(2)}</p>
                                    )}
                                    {entry.credit_amount && parseFloat(entry.credit_amount) > 0 && (
                                      <p className="text-xs font-bold text-success-600">Credit: ₹{parseFloat(entry.credit_amount).toFixed(2)}</p>
                                    )}
                                    <span className={`inline-block px-2 py-1 rounded-full text-xs ${
                                      entry.payment_status === 'PAID' ? 'bg-green-100 text-green-800' : 
                                      entry.payment_status === 'PARTIAL' ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'
                                    }`}>
                                      {entry.payment_status || 'PENDING'}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Date */}
                            <div className="col-span-3 sm:col-span-2 text-center">
                              <p className="text-xs sm:text-sm text-slate-600">
                                <span className="hidden sm:inline">{new Date(entry.transaction_date).toLocaleDateString()}</span>
                                <span className="sm:hidden">{new Date(entry.transaction_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                              </p>
                            </div>

                            {/* Debit Amount - Hidden on mobile */}
                            <div className="col-span-2 text-right hidden sm:block">
                              {entry.debit_amount && parseFloat(entry.debit_amount) > 0 ? (
                                <p className="font-bold text-danger-600 text-xs sm:text-sm">
                                  ₹{parseFloat(entry.debit_amount).toFixed(2)}
                                </p>
                              ) : (
                                <p className="text-slate-400 text-xs sm:text-sm">-</p>
                              )}
                            </div>

                            {/* Credit Amount - Hidden on mobile */}
                            <div className="col-span-2 text-right hidden sm:block">
                              {entry.credit_amount && parseFloat(entry.credit_amount) > 0 ? (
                                <p className="font-bold text-success-600 text-xs sm:text-sm">
                                  ₹{parseFloat(entry.credit_amount).toFixed(2)}
                                </p>
                              ) : (
                                <p className="text-slate-400 text-xs sm:text-sm">-</p>
                              )}
                            </div>

                            {/* Running Balance */}
                            <div className="col-span-2 text-right">
                              <p className="font-semibold text-slate-900 text-xs sm:text-sm">
                                ₹{parseFloat(entry.running_balance || 0).toFixed(2)}
                              </p>
                            </div>

                            {/* Status - Hidden on mobile */}
                            <div className="col-span-1 text-center hidden sm:block">
                              <span className={`status-badge text-xs ${
                                entry.payment_status === 'PAID' ? 'status-success' : 
                                entry.payment_status === 'PARTIAL' ? 'status-warning' : 'status-pending'
                              }`}>
                                {entry.payment_status || 'PENDING'}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Summary Row */}
                    {supplierLedgerEntries.length > 0 && (
                      <div className="bg-primary-50 border border-primary-200 rounded-lg p-3 sm:p-4">
                        <div className="grid grid-cols-12 gap-2 sm:gap-4 items-center">
                          <div className="col-span-4 sm:col-span-3">
                            <p className="font-bold text-slate-900 text-xs sm:text-sm">Current Balance</p>
                          </div>
                          <div className="col-span-3 sm:col-span-2"></div>
                          <div className="col-span-2 text-right hidden sm:block">
                            <p className="text-xs sm:text-sm text-slate-600">
                              Total Debit: ₹{supplierLedgerEntries.reduce((sum, entry) => sum + parseFloat(entry.debit_amount || 0), 0).toFixed(2)}
                            </p>
                          </div>
                          <div className="col-span-2 text-right hidden sm:block">
                            <p className="text-xs sm:text-sm text-slate-600">
                              Total Credit: ₹{supplierLedgerEntries.reduce((sum, entry) => sum + parseFloat(entry.credit_amount || 0), 0).toFixed(2)}
                            </p>
                          </div>
                          <div className="col-span-2 text-right">
                            <p className="font-bold text-base sm:text-lg text-primary-600">
                              ₹{parseFloat(supplierLedgerEntries[supplierLedgerEntries.length - 1]?.running_balance || 0).toFixed(2)}
                            </p>
                          </div>
                          <div className="col-span-1 hidden sm:block"></div>
                        </div>
                        {/* Mobile: Show totals below */}
                        <div className="sm:hidden mt-3 pt-3 border-t border-primary-200 space-y-1">
                          <div className="flex justify-between text-xs text-slate-600">
                            <span>Total Debit:</span>
                            <span>₹{supplierLedgerEntries.reduce((sum, entry) => sum + parseFloat(entry.debit_amount || 0), 0).toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between text-xs text-slate-600">
                            <span>Total Credit:</span>
                            <span>₹{supplierLedgerEntries.reduce((sum, entry) => sum + parseFloat(entry.credit_amount || 0), 0).toFixed(2)}</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Payment Form Modal */}
      {showPaymentForm && selectedSupplier && (
        <div className="modal-overlay">
          <div className="modal-content animate-scale-in w-full max-w-md">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 sm:p-6 border-b border-slate-200 gap-4">
              <div>
                <h3 className="text-lg sm:text-2xl font-bold text-slate-900">
                  Record Payment
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 mt-1">
                  {selectedSupplier.supplier_name}
                </p>
              </div>
              <button
                onClick={() => setShowPaymentForm(false)}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors self-end sm:self-auto"
              >
                <X className="h-5 w-5 sm:h-6 sm:w-6" />
              </button>
            </div>

            <form onSubmit={(e) => { e.preventDefault(); handleRecordPayment(); }}>
              <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
                <div>
                  <label className="label label-required">
                    Payment Amount
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max={selectedSupplier.outstanding_balance}
                    value={formData.payment_amount}
                    onChange={(e) => setFormData(prev => ({ ...prev, payment_amount: parseFloat(e.target.value) || 0 }))}
                    className="input"
                    required
                  />
                  <p className="text-xs text-slate-500 mt-2">
                    Outstanding: ₹{selectedSupplier.outstanding_balance.toFixed(2)}
                  </p>
                </div>

                <div>
                  <label className="label label-required">
                    Payment Date
                  </label>
                  <input
                    type="date"
                    value={formData.payment_date.split('T')[0]}
                    onChange={(e) => setFormData(prev => ({ ...prev, payment_date: new Date(e.target.value).toISOString() }))}
                    className="input"
                    required
                  />
                </div>

                <div>
                  <label className="label">
                    Payment Method
                  </label>
                  <select
                    value={formData.payment_method}
                    onChange={(e) => setFormData(prev => ({ ...prev, payment_method: e.target.value }))}
                    className="input"
                  >
                    <option value="BANK_TRANSFER">Bank Transfer</option>
                    <option value="CHEQUE">Cheque</option>
                    <option value="CASH">Cash</option>
                    <option value="ONLINE">Online Payment</option>
                  </select>
                </div>

                <div>
                  <label className="label">
                    Reference Number
                  </label>
                  <input
                    type="text"
                    value={formData.reference_number}
                    onChange={(e) => setFormData(prev => ({ ...prev, reference_number: e.target.value }))}
                    className="input"
                    placeholder="Transaction/Cheque number"
                  />
                </div>

                <div>
                  <label className="label">
                    Notes
                  </label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                    className="input"
                    rows={3}
                    placeholder="Additional payment notes..."
                  />
                </div>
              </div>

              <div className="flex flex-col sm:flex-row justify-end gap-3 sm:gap-4 p-4 sm:p-6 pt-0 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowPaymentForm(false)}
                  className="btn btn-secondary w-full sm:w-auto"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="btn btn-success btn-lg shadow-lg hover:shadow-xl transition-all duration-200 w-full sm:w-auto"
                >
                  {loading ? (
                    <>
                      <div className="loading-spinner h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2"></div>
                      <span className="text-xs sm:text-sm">Recording...</span>
                    </>
                  ) : (
                    <>
                      <CreditCard className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                      <span className="text-xs sm:text-sm">Record Payment</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SupplierLedgerManagement;
