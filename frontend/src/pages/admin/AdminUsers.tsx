import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { toast } from 'react-hot-toast';
import { 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  Eye, 
  User,
  Mail,
  Phone,
  Shield,
  CheckCircle,
  XCircle,
  AlertCircle
} from 'lucide-react';
import { adminAPI } from '../../services/api';

interface User {
  user_id: number;
  name: string;
  email: string;
  phone?: string;
  contact_info?: string;
  role_id: number;
  is_active: boolean;
  invitation_status: string;
  created_at: string;
  updated_at: string;
  role?: {
    role_id: number;
    name: string;
    description?: string;
  };
}

interface Role {
  role_id: number;
  name: string;
  description?: string;
}

interface Pagination {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
}

const AdminUsers: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [viewingUser, setViewingUser] = useState<User | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const queryClient = useQueryClient();

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role_id: '',
    phone: '',
    contact_info: '',
    is_active: true
  });

  // Fetch users
  const { data: usersData, isLoading, error } = useQuery(
    ['admin-users', { search: searchTerm, role_id: roleFilter, page: currentPage }],
    () => adminAPI.getUsers({ 
      search: searchTerm || undefined, 
      role_id: roleFilter || undefined,
      page: currentPage,
      limit: 20 
    }),
    {
      onError: (error: any) => {
        toast.error(error.response?.data?.message || 'Failed to fetch users');
      }
    }
  );

  // Fetch roles
  const { data: rolesData } = useQuery(
    ['admin-roles'],
    () => adminAPI.getRoles(),
    {
      onError: (error: any) => {
        toast.error(error.response?.data?.message || 'Failed to fetch roles');
      }
    }
  );

  const users: User[] = usersData?.data?.users || [];
  const roles: Role[] = rolesData?.data?.roles || [];
  const pagination: Pagination = usersData?.data?.pagination || {
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    itemsPerPage: 20
  };

  // Create user mutation
  const createUserMutation = useMutation(
    (userData: any) => adminAPI.createUser(userData),
    {
      onSuccess: () => {
        toast.success('User created successfully');
        queryClient.invalidateQueries(['admin-users']);
        setIsModalOpen(false);
        resetForm();
      },
      onError: (error: any) => {
        toast.error(error.response?.data?.message || 'Failed to create user');
      }
    }
  );

  // Update user mutation
  const updateUserMutation = useMutation(
    ({ id, data }: { id: number; data: any }) => adminAPI.updateUser(id, data),
    {
      onSuccess: () => {
        toast.success('User updated successfully');
        queryClient.invalidateQueries(['admin-users']);
        setIsModalOpen(false);
        setEditingUser(null);
        resetForm();
      },
      onError: (error: any) => {
        toast.error(error.response?.data?.message || 'Failed to update user');
      }
    }
  );

  // Delete user mutation
  const deleteUserMutation = useMutation(
    (id: number) => adminAPI.deleteUser(id),
    {
      onSuccess: () => {
        toast.success('User deleted successfully');
        queryClient.invalidateQueries(['admin-users']);
      },
      onError: (error: any) => {
        toast.error(error.response?.data?.message || 'Failed to delete user');
      }
    }
  );

  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      password: '',
      role_id: '',
      phone: '',
      contact_info: '',
      is_active: true
    });
  };

  const handleEdit = (user: User) => {
    setEditingUser(user);
    setFormData({
      name: user.name,
      email: user.email,
      password: '',
      role_id: user.role_id.toString(),
      phone: user.phone || '',
      contact_info: user.contact_info || '',
      is_active: user.is_active
    });
    setIsModalOpen(true);
  };

  const handleView = (user: User) => {
    setViewingUser(user);
  };

  const handleDelete = (id: number) => {
    if (window.confirm('Are you sure you want to delete this user?')) {
      deleteUserMutation.mutate(id);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const submitData = {
      ...formData,
      role_id: parseInt(formData.role_id)
    };

    if (editingUser) {
      // Remove password from update if empty
      if (!submitData.password) {
        delete submitData.password;
      }
      updateUserMutation.mutate({ 
        id: editingUser.user_id, 
        data: submitData 
      });
    } else {
      createUserMutation.mutate(submitData);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
  };

  const getStatusBadge = (isActive: boolean) => {
    if (isActive) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
          <CheckCircle className="w-3 h-3 mr-1" />
          Active
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
        <XCircle className="w-3 h-3 mr-1" />
        Inactive
      </span>
    );
  };

  const getInvitationStatusBadge = (status: string) => {
    switch (status) {
      case 'ACCEPTED':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
            <CheckCircle className="w-3 h-3 mr-1" />
            Accepted
          </span>
        );
      case 'PENDING':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
            <AlertCircle className="w-3 h-3 mr-1" />
            Pending
          </span>
        );
      case 'DECLINED':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
            <XCircle className="w-3 h-3 mr-1" />
            Declined
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
            Unknown
          </span>
        );
    }
  };

  const getRoleBadge = (roleName: string) => {
    const colors = {
      'Admin': 'bg-purple-100 text-purple-800',
      'Project Manager': 'bg-blue-100 text-blue-800',
      'Project On-site Team': 'bg-green-100 text-green-800',
      'Inventory Manager': 'bg-orange-100 text-orange-800',
      'Store Incharge': 'bg-indigo-100 text-indigo-800',
      'Site Engineer': 'bg-teal-100 text-teal-800',
      'Accountant': 'bg-pink-100 text-pink-800'
    };

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
        colors[roleName as keyof typeof colors] || 'bg-gray-100 text-gray-800'
      }`}>
        <Shield className="w-3 h-3 mr-1" />
        {roleName}
      </span>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">User Management</h1>
          <p className="text-slate-600">Manage system users and their roles</p>
        </div>
        <button
          onClick={() => {
            setEditingUser(null);
            resetForm();
            setIsModalOpen(true);
          }}
          className="mt-4 sm:mt-0 inline-flex items-center px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add User
        </button>
      </div>

      {/* Search and Filters */}
      <div className="card-mobile">
        <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search users..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
          </div>
          <div className="sm:w-48">
            <select
              value={roleFilter}
              onChange={(e) => {
                setRoleFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              <option value="">All Roles</option>
              {roles.map((role) => (
                <option key={role.role_id} value={role.role_id}>
                  {role.name}
                </option>
              ))}
            </select>
          </div>
          <button
            type="submit"
            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            Search
          </button>
        </form>
      </div>

      {/* Users Table */}
      <div className="card-mobile">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Contact
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Role
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-200">
              {users.map((user) => (
                <tr key={user.user_id} className="hover:bg-slate-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10">
                        <div className="h-10 w-10 rounded-full bg-primary-100 flex items-center justify-center">
                          <User className="h-5 w-5 text-primary-600" />
                        </div>
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-slate-900">
                          {user.name}
                        </div>
                        <div className="text-sm text-slate-500">
                          ID: {user.user_id}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-slate-900">
                      <div className="flex items-center">
                        <Mail className="w-3 h-3 mr-1 text-slate-400" />
                        {user.email}
                      </div>
                      {user.phone && (
                        <div className="flex items-center text-slate-500">
                          <Phone className="w-3 h-3 mr-1" />
                          {user.phone}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="space-y-1">
                      {user.role && getRoleBadge(user.role.name)}
                      {getInvitationStatusBadge(user.invitation_status)}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getStatusBadge(user.is_active)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleView(user)}
                        className="text-slate-600 hover:text-slate-900"
                        title="View Details"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleEdit(user)}
                        className="text-primary-600 hover:text-primary-900"
                        title="Edit"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(user.user_id)}
                        className="text-red-600 hover:text-red-900"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-slate-200 sm:px-6">
            <div className="flex-1 flex justify-between sm:hidden">
              <button
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="relative inline-flex items-center px-4 py-2 border border-slate-300 text-sm font-medium rounded-md text-slate-700 bg-white hover:bg-slate-50 disabled:opacity-50"
              >
                Previous
              </button>
              <button
                onClick={() => setCurrentPage(Math.min(pagination.totalPages, currentPage + 1))}
                disabled={currentPage === pagination.totalPages}
                className="ml-3 relative inline-flex items-center px-4 py-2 border border-slate-300 text-sm font-medium rounded-md text-slate-700 bg-white hover:bg-slate-50 disabled:opacity-50"
              >
                Next
              </button>
            </div>
            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-slate-700">
                  Showing{' '}
                  <span className="font-medium">
                    {(currentPage - 1) * pagination.itemsPerPage + 1}
                  </span>{' '}
                  to{' '}
                  <span className="font-medium">
                    {Math.min(currentPage * pagination.itemsPerPage, pagination.totalItems)}
                  </span>{' '}
                  of{' '}
                  <span className="font-medium">{pagination.totalItems}</span>{' '}
                  results
                </p>
              </div>
              <div>
                <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                  <button
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-slate-300 bg-white text-sm font-medium text-slate-500 hover:bg-slate-50 disabled:opacity-50"
                  >
                    Previous
                  </button>
                  {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map((page) => (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                        page === currentPage
                          ? 'z-10 bg-primary-50 border-primary-500 text-primary-600'
                          : 'bg-white border-slate-300 text-slate-500 hover:bg-slate-50'
                      }`}
                    >
                      {page}
                    </button>
                  ))}
                  <button
                    onClick={() => setCurrentPage(Math.min(pagination.totalPages, currentPage + 1))}
                    disabled={currentPage === pagination.totalPages}
                    className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-slate-300 bg-white text-sm font-medium text-slate-500 hover:bg-slate-50 disabled:opacity-50"
                  >
                    Next
                  </button>
                </nav>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-slate-900">
                  {editingUser ? 'Edit User' : 'Add New User'}
                </h3>
                <button
                  onClick={() => {
                    setIsModalOpen(false);
                    setEditingUser(null);
                    resetForm();
                  }}
                  className="text-slate-400 hover:text-slate-600"
                >
                  <XCircle className="w-6 h-6" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Full Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Email *
                    </label>
                    <input
                      type="email"
                      required
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Password {!editingUser && '*'}
                    </label>
                    <input
                      type="password"
                      required={!editingUser}
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                      placeholder={editingUser ? "Leave blank to keep current password" : ""}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Role *
                    </label>
                    <select
                      required
                      value={formData.role_id}
                      onChange={(e) => setFormData({ ...formData, role_id: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    >
                      <option value="">Select Role</option>
                      {roles.map((role) => (
                        <option key={role.role_id} value={role.role_id}>
                          {role.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Phone
                    </label>
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Contact Info
                    </label>
                    <input
                      type="text"
                      value={formData.contact_info}
                      onChange={(e) => setFormData({ ...formData, contact_info: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={formData.is_active}
                        onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                        className="rounded border-slate-300 text-primary-600 shadow-sm focus:border-primary-300 focus:ring focus:ring-primary-200 focus:ring-opacity-50"
                      />
                      <span className="ml-2 text-sm text-slate-700">Active</span>
                    </label>
                  </div>
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setIsModalOpen(false);
                      setEditingUser(null);
                      resetForm();
                    }}
                    className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={createUserMutation.isLoading || updateUserMutation.isLoading}
                    className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-50"
                  >
                    {createUserMutation.isLoading || updateUserMutation.isLoading
                      ? 'Saving...'
                      : editingUser
                      ? 'Update User'
                      : 'Create User'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* View Modal */}
      {viewingUser && (
        <div className="fixed inset-0 bg-slate-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-slate-900">User Details</h3>
                <button
                  onClick={() => setViewingUser(null)}
                  className="text-slate-400 hover:text-slate-600"
                >
                  <XCircle className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700">Full Name</label>
                    <p className="text-sm text-slate-900">{viewingUser.name}</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700">Email</label>
                    <p className="text-sm text-slate-900">{viewingUser.email}</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700">Phone</label>
                    <p className="text-sm text-slate-900">{viewingUser.phone || 'N/A'}</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700">Contact Info</label>
                    <p className="text-sm text-slate-900">{viewingUser.contact_info || 'N/A'}</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700">Role</label>
                    <div className="mt-1">
                      {viewingUser.role && getRoleBadge(viewingUser.role.name)}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700">Status</label>
                    <div className="mt-1">
                      {getStatusBadge(viewingUser.is_active)}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700">Invitation Status</label>
                    <div className="mt-1">
                      {getInvitationStatusBadge(viewingUser.invitation_status)}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700">User ID</label>
                    <p className="text-sm text-slate-900">{viewingUser.user_id}</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700">Created At</label>
                    <p className="text-sm text-slate-900">
                      {new Date(viewingUser.created_at).toLocaleDateString()}
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700">Last Updated</label>
                    <p className="text-sm text-slate-900">
                      {new Date(viewingUser.updated_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-4">
                <button
                  onClick={() => setViewingUser(null)}
                  className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminUsers;
