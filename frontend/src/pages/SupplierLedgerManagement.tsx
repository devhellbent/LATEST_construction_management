import React, { useState, useEffect } from 'react';
import { 
  supplierLedgerAPI, 
  suppliersAPI,
  purchaseOrdersAPI 
} from '../services/api';

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
    payment_date: new Date().toISOString().split('T')[0],
    payment_method: 'BANK_TRANSFER',
    reference_number: '',
    notes: ''
  });

  useEffect(() => {
    loadData();
  }, []);

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
        amount: formData.payment_amount,
        transaction_date: formData.payment_date,
        description: `Payment - ${formData.payment_method} - Ref: ${formData.reference_number}`,
        payment_method: formData.payment_method,
        reference_number: formData.reference_number,
        notes: formData.notes
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
      case 'PURCHASE': return '🛒';
      case 'PAYMENT': return '💰';
      case 'ADJUSTMENT': return '⚖️';
      default: return '📄';
    }
  };

  if (loading && supplierSummaries.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Supplier Ledger Management</h1>
        <p className="text-gray-600 mt-2">Track supplier transactions, payments, and outstanding balances</p>
      </div>

      {/* Tab Navigation */}
      <div className="mb-6">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('summary')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'summary'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Supplier Summary
            </button>
            <button
              onClick={() => setActiveTab('ledger')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'ledger'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Transaction Ledger
            </button>
            <button
              onClick={() => setActiveTab('overdue')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'overdue'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Overdue Payments
            </button>
          </nav>
        </div>
      </div>

      {activeTab === 'summary' && (
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Supplier Summary</h2>
            
            {supplierSummaries.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500">No supplier data available</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Supplier
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Total Purchases
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Total Payments
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Outstanding Balance
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Last Transaction
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {supplierSummaries.map((supplier) => (
                      <tr key={supplier.supplier_id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {supplier.supplier_name}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          ₹{supplier.total_purchases.toFixed(2)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          ₹{supplier.total_payments.toFixed(2)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            supplier.outstanding_balance > 0 ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                          }`}>
                            ₹{supplier.outstanding_balance.toFixed(2)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(supplier.last_transaction_date).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          {supplier.outstanding_balance > 0 && (
                            <button
                              onClick={() => handleSelectSupplier(supplier)}
                              className="text-blue-600 hover:text-blue-900"
                            >
                              Record Payment
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
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Transaction Ledger</h2>
            
            {ledgerEntries.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500">No transaction entries available</p>
              </div>
            ) : (
              <div className="space-y-3">
                {ledgerEntries.map((entry) => (
                  <div key={entry.ledger_id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex justify-between items-start">
                      <div className="flex items-center space-x-3">
                        <span className="text-lg">{getTransactionIcon(entry.transaction_type)}</span>
                        <div>
                          <h4 className="font-medium text-gray-900">{entry.supplier_name}</h4>
                          <p className="text-sm text-gray-600">{entry.description}</p>
                          {entry.po_reference_id && (
                            <p className="text-xs text-blue-600">PO: {entry.po_reference_id}</p>
                          )}
                        </div>
                      </div>
                      
                      <div className="text-right">
                        <div className="flex items-center space-x-4">
                          <div>
                            <p className={`font-medium ${
                              entry.transaction_type === 'PURCHASE' ? 'text-red-600' : 'text-green-600'
                            }`}>
                              {entry.transaction_type === 'PURCHASE' ? '-' : '+'}₹{entry.amount.toFixed(2)}
                            </p>
                            <p className="text-sm text-gray-600">
                              Balance: ₹{entry.balance.toFixed(2)}
                            </p>
                          </div>
                          <div className="text-right">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(entry.payment_status)}`}>
                              {entry.payment_status}
                            </span>
                            <p className="text-xs text-gray-500 mt-1">
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

      {activeTab === 'overdue' && (
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Overdue Payments</h2>
            <div className="text-center py-8">
              <p className="text-gray-500">Overdue payments feature coming soon...</p>
            </div>
          </div>
        </div>
      )}

      {/* Payment Form Modal */}
      {showPaymentForm && selectedSupplier && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-semibold text-gray-900">
                Record Payment - {selectedSupplier.supplier_name}
              </h3>
              <button
                onClick={() => setShowPaymentForm(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>

            <form onSubmit={(e) => { e.preventDefault(); handleRecordPayment(); }}>
              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Payment Amount *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max={selectedSupplier.outstanding_balance}
                    value={formData.payment_amount}
                    onChange={(e) => setFormData(prev => ({ ...prev, payment_amount: parseFloat(e.target.value) || 0 }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Outstanding: ₹{selectedSupplier.outstanding_balance.toFixed(2)}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Payment Date
                  </label>
                  <input
                    type="date"
                    value={formData.payment_date}
                    onChange={(e) => setFormData(prev => ({ ...prev, payment_date: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Payment Method
                  </label>
                  <select
                    value={formData.payment_method}
                    onChange={(e) => setFormData(prev => ({ ...prev, payment_method: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="BANK_TRANSFER">Bank Transfer</option>
                    <option value="CHEQUE">Cheque</option>
                    <option value="CASH">Cash</option>
                    <option value="ONLINE">Online Payment</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Reference Number
                  </label>
                  <input
                    type="text"
                    value={formData.reference_number}
                    onChange={(e) => setFormData(prev => ({ ...prev, reference_number: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Transaction/Cheque number"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Notes
                  </label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    rows={3}
                    placeholder="Additional payment notes..."
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-4">
                <button
                  type="button"
                  onClick={() => setShowPaymentForm(false)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                >
                  {loading ? 'Recording...' : 'Record Payment'}
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
