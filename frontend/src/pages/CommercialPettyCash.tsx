import React, { useState } from 'react';
import { IndianRupee, Plus } from 'lucide-react';
import ProjectSelector from '../components/ProjectSelector';

const CommercialPettyCash: React.FC = () => {
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);

  const handleProjectChange = (projectId: number | null) => {
    setSelectedProjectId(projectId);
  };

  return (
    <div className="space-y-6">
      {/* Header with Navigation Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <div className="flex items-center space-x-2 py-2 px-1 text-gray-500 hover:text-gray-700">
            <span className="font-medium">Inventory</span>
          </div>
          <div className="flex items-center space-x-2 py-2 px-1 text-gray-500 hover:text-gray-700">
            <span className="font-medium">Material Issue</span>
          </div>
          <div className="flex items-center space-x-2 py-2 px-1 text-gray-500 hover:text-gray-700">
            <span className="font-medium">Material Return</span>
          </div>
          <div className="flex items-center space-x-2 py-2 px-1 border-b-2 border-primary-500">
            <IndianRupee className="h-5 w-5 text-primary-600" />
            <span className="text-primary-600 font-medium">Petty Cash</span>
          </div>
          <div className="flex items-center space-x-2 py-2 px-1 text-gray-500 hover:text-gray-700">
            <span className="font-medium">Consumptions</span>
          </div>
        </nav>
      </div>

      {/* Left Sidebar Navigation */}
      <div className="flex space-x-6">
        <div className="w-64 space-y-2">
          <div className="space-y-1">
            <div className="text-sm font-medium text-gray-900 px-3 py-2">All Expenses</div>
            <div className="text-sm font-medium text-gray-900 px-3 py-2">Pending Expenses</div>
            <div className="text-sm font-medium text-gray-900 px-3 py-2">Approved Expenses</div>
          </div>
          
          {/* Project Selector */}
          <div className="mt-6">
            <div className="text-sm font-medium text-gray-700 mb-2 px-3">Project Selection</div>
            <div className="px-3">
              <ProjectSelector
                selectedProjectId={selectedProjectId}
                onProjectChange={handleProjectChange}
                className="w-full"
                placeholder="Select project..."
              />
            </div>
            {selectedProjectId && (
              <div className="mt-2 px-3 py-2 bg-primary-50 rounded-lg flex items-center">
                <IndianRupee className="h-4 w-4 text-primary-600 mr-2" />
                <span className="text-sm text-primary-700 font-medium">Project Petty Cash</span>
                <span className="ml-auto text-primary-600">✓</span>
              </div>
            )}
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold text-gray-900">Petty Cash</h1>
            <button className="btn btn-primary flex items-center">
              <Plus className="h-5 w-5 mr-2" />
              Add Expense
            </button>
          </div>

          {/* Content */}
          <div className="card p-6">
            <div className="text-center py-12">
              <div className="mx-auto w-24 h-24 bg-gray-100 rounded-lg flex items-center justify-center mb-6">
                <IndianRupee className="h-12 w-12 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Manage Petty Cash Expenses
              </h3>
              <p className="text-gray-600 mb-6">
                Track and manage small cash expenses for project activities.
              </p>
              <button className="btn btn-primary flex items-center mx-auto">
                <Plus className="h-5 w-5 mr-2" />
                Add Expense
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CommercialPettyCash;

