import React from 'react';
import { Users as UsersIcon, Plus } from 'lucide-react';

const Users: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Users</h1>
        <button className="btn btn-primary flex items-center">
          <Plus className="h-5 w-5 mr-2" />
          Add User
        </button>
      </div>
      
      <div className="card p-6">
        <div className="text-center py-12">
          <UsersIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Users Module</h3>
          <p className="text-gray-600">User management functionality will be implemented here.</p>
        </div>
      </div>
    </div>
  );
};

export default Users;
