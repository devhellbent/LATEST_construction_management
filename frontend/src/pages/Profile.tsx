import React from 'react';
import { User } from 'lucide-react';

const Profile: React.FC = () => {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-900">Profile</h1>
      
      <div className="card p-6">
        <div className="text-center py-12">
          <User className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Profile Module</h3>
          <p className="text-gray-600">User profile management functionality will be implemented here.</p>
        </div>
      </div>
    </div>
  );
};

export default Profile;
