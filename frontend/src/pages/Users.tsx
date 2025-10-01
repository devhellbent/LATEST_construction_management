import React from 'react';
import { Users as UsersIcon, Plus } from 'lucide-react';

const Users: React.FC = () => {
  return (
    <div className="space-responsive">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-responsive-3xl font-bold text-slate-900">Users</h1>
        <button className="btn btn-primary flex items-center w-full sm:w-auto">
          <Plus className="h-5 w-5 mr-2" />
          Add User
        </button>
      </div>
      
      <div className="card-mobile">
        <div className="text-center py-8 sm:py-12">
          <UsersIcon className="h-10 w-10 sm:h-12 sm:w-12 text-slate-400 mx-auto mb-4" />
          <h3 className="text-base sm:text-lg font-medium text-slate-900 mb-2">Users Module</h3>
          <p className="text-slate-600 text-sm sm:text-base">User management functionality will be implemented here.</p>
        </div>
      </div>
    </div>
  );
};

export default Users;
