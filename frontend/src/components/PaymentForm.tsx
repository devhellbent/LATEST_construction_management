import React, { useState, useEffect } from 'react';
import { X, User, Building, DollarSign, Calendar, FileText, Phone } from 'lucide-react';
import { paymentsAPI, projectsAPI, usersAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

interface PaymentFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  projectId?: number;
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

interface Project {
  project_id: number;
  name: string;
}

interface User {
  user_id: number;
  name: string;
  email: string;
}

const PaymentForm: React.FC<PaymentFormProps> = ({ isOpen, onClose, onSuccess, projectId }) => {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    project_id: projectId?.toString() || '',
    payment_type_id: '',
    category_id: '',
    paid_to_type: 'TEAM_MEMBER' as 'TEAM_MEMBER' | 'VENDOR' | 'LABOUR' | 'SUBCONTRACTOR' | 'OTHER',
    paid_to_user_id: '',
    paid_to_name: '',
    paid_to_contact: '',
    paid_by_user_id: '',
    amount: '',
    payment_date: new Date().toISOString().split('T')[0],
    description: '',
    notes: ''
  });

  const [paymentTypes, setPaymentTypes] = useState<PaymentType[]>([]);
  const [categories, setCategories] = useState<PaymentCategory[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [teamMembers, setTeamMembers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetchInitialData();
    }
  }, [isOpen]);

  const fetchInitialData = async () => {
    try {
      const [paymentTypesRes, categoriesRes, projectsRes, usersRes] = await Promise.all([
        paymentsAPI.getPaymentTypes(),
        paymentsAPI.getPaymentCategories(),
        projectsAPI.getProjects(),
        usersAPI.getUsers()
      ]);

      setPaymentTypes(paymentTypesRes.data.paymentTypes || []);
      setCategories(categoriesRes.data.categories || []);
      setProjects(projectsRes.data.projects || []);
      setTeamMembers(usersRes.data.users || []);

      // Set current user as paid_by_user_id
      if (user?.user_id) {
        setFormData(prev => ({ ...prev, paid_by_user_id: user.user_id.toString() }));
      }
    } catch (err) {
      console.error('Error fetching initial data:', err);
      setError('Failed to load form data');
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Get current user ID from auth context
      if (!user?.user_id) {
        setError('User not authenticated. Please log in again.');
        setLoading(false);
        return;
      }

      const currentUserId = user.user_id;

      const submitData = {
        project_id: parseInt(formData.project_id),
        payment_type_id: parseInt(formData.payment_type_id),
        category_id: parseInt(formData.category_id),
        paid_to_type: formData.paid_to_type,
        paid_to_user_id: formData.paid_to_type === 'TEAM_MEMBER' && formData.paid_to_user_id ? parseInt(formData.paid_to_user_id) : null,
        paid_to_name: formData.paid_to_type !== 'TEAM_MEMBER' && formData.paid_to_name ? formData.paid_to_name : null,
        paid_to_contact: formData.paid_to_type !== 'TEAM_MEMBER' && formData.paid_to_contact ? formData.paid_to_contact : null,
        paid_by_user_id: currentUserId, // Use current user ID directly
        amount: parseFloat(formData.amount),
        payment_date: formData.payment_date,
        description: formData.description || null,
        notes: formData.notes || null
      };

      console.log('Payment form submit data:', submitData);
      console.log('Current user ID:', currentUserId);

      await paymentsAPI.createPayment(submitData);
      onSuccess();
      onClose();
      resetForm();
    } catch (err: any) {
      console.error('Error creating payment:', err);
      setError(err.response?.data?.message || 'Failed to create payment');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      project_id: projectId?.toString() || '',
      payment_type_id: '',
      category_id: '',
      paid_to_type: 'TEAM_MEMBER',
      paid_to_user_id: '',
      paid_to_name: '',
      paid_to_contact: '',
      paid_by_user_id: user?.user_id ? user.user_id.toString() : '',
      amount: '',
      payment_date: new Date().toISOString().split('T')[0],
      description: '',
      notes: ''
    });
    setError(null);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Record New Payment</h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          )}

          {/* Hidden field for paid_by_user_id */}
          <input type="hidden" name="paid_by_user_id" value={formData.paid_by_user_id} />

          {/* Project Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Project *
            </label>
            <select
              name="project_id"
              value={formData.project_id}
              onChange={handleInputChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Select a project</option>
              {projects.map((project) => (
                <option key={project.project_id} value={project.project_id}>
                  {project.name}
                </option>
              ))}
            </select>
          </div>

          {/* Payment Type and Category */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Payment Type *
              </label>
              <select
                name="payment_type_id"
                value={formData.payment_type_id}
                onChange={handleInputChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Select payment type</option>
                {paymentTypes.map((type) => (
                  <option key={type.payment_type_id} value={type.payment_type_id}>
                    {type.type_name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Category *
              </label>
              <select
                name="category_id"
                value={formData.category_id}
                onChange={handleInputChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Select category</option>
                {categories.map((category) => (
                  <option key={category.category_id} value={category.category_id}>
                    {category.category_name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Paid To Section */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Paid To Type *
            </label>
            <select
              name="paid_to_type"
              value={formData.paid_to_type}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="TEAM_MEMBER">Team Member</option>
              <option value="VENDOR">Vendor</option>
              <option value="LABOUR">Labour</option>
              <option value="SUBCONTRACTOR">Subcontractor</option>
              <option value="OTHER">Other</option>
            </select>
          </div>

          {formData.paid_to_type === 'TEAM_MEMBER' ? (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Team Member *
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <select
                  name="paid_to_user_id"
                  value={formData.paid_to_user_id}
                  onChange={handleInputChange}
                  required
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Select team member</option>
                  {teamMembers.map((member) => (
                    <option key={member.user_id} value={member.user_id}>
                      {member.name} ({member.email})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Name *
                </label>
                <div className="relative">
                  <Building className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    name="paid_to_name"
                    value={formData.paid_to_name}
                    onChange={handleInputChange}
                    required
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter name"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Contact
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    name="paid_to_contact"
                    value={formData.paid_to_contact}
                    onChange={handleInputChange}
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter contact"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Amount and Date */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Amount *
              </label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="number"
                  name="amount"
                  value={formData.amount}
                  onChange={handleInputChange}
                  required
                  min="0"
                  step="0.01"
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="0.00"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Payment Date *
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="date"
                  name="payment_date"
                  value={formData.payment_date}
                  onChange={handleInputChange}
                  required
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <div className="relative">
              <FileText className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <textarea
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                rows={3}
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter payment description"
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Notes
            </label>
            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleInputChange}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Additional notes (optional)"
            />
          </div>

          {/* Form Actions */}
          <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Creating...' : 'Create Payment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PaymentForm;
