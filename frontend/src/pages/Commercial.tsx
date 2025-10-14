import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  ArrowRightLeft, 
  IndianRupee, 
  Building2,
  Plus,
  Upload,
  Package,
  RefreshCw
} from 'lucide-react';
import ProjectSelector from '../components/ProjectSelector';
import { commercialAPI } from '../services/api';

const Commercial: React.FC = () => {
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);
  const [dashboardStats, setDashboardStats] = useState({
    totalMaterials: 0,
    totalValue: 0,
    activeTransfers: 0
  });
  const [loading, setLoading] = useState(false);
  const location = useLocation();

  const commercialSections = [
    {
      name: 'Petty Cash',
      href: '/commercial/petty-cash',
      icon: IndianRupee,
      description: 'Manage petty cash expenses',
      color: 'bg-yellow-50 text-yellow-700 border-yellow-200'
    },
    {
      name: 'Subcontractor Ledger',
      href: '/commercial/subcontractor-ledger',
      icon: Building2,
      description: 'Manage subcontractor payments',
      color: 'bg-blue-50 text-blue-700 border-blue-200'
    }
  ];

  useEffect(() => {
    if (selectedProjectId) {
      fetchDashboardStats();
    }
  }, [selectedProjectId]);

  const fetchDashboardStats = async () => {
    if (!selectedProjectId) return;
    
    try {
      setLoading(true);
      const response = await commercialAPI.getDashboardStats(selectedProjectId);
      setDashboardStats(response.data);
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleProjectChange = (projectId: number | null) => {
    setSelectedProjectId(projectId);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-3">
          <Building2 className="h-8 w-8 text-primary-600" />
          <h1 className="text-3xl font-bold text-gray-900">Commercial</h1>
        </div>
      </div>

      {/* Project Filter */}
      <div className="card p-6">
        <div className="flex items-center space-x-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Project
            </label>
            <ProjectSelector
              selectedProjectId={selectedProjectId}
              onProjectChange={handleProjectChange}
              className="max-w-md"
              placeholder="Select a project to manage commercial activities..."
            />
          </div>
        </div>
      </div>

      {/* Commercial Sections */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {commercialSections.map((section) => {
          const Icon = section.icon;
          const isActive = location.pathname === section.href;
          
          return (
            <Link
              key={section.name}
              to={section.href}
              className={`card p-6 hover:shadow-lg transition-all duration-200 ${
                isActive ? 'ring-2 ring-primary-500 bg-primary-50' : 'hover:shadow-md'
              }`}
            >
              <div className="flex items-start space-x-4">
                <div className={`p-3 rounded-lg ${section.color}`}>
                  <Icon className="h-6 w-6" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    {section.name}
                  </h3>
                  <p className="text-sm text-gray-600 mb-4">
                    {section.description}
                  </p>
                  <div className="flex items-center text-sm text-primary-600 font-medium">
                    Access Section
                    <ArrowRightLeft className="h-4 w-4 ml-1" />
                  </div>
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      {/* Quick Actions */}
      <div className="card p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
        <div className="flex flex-wrap gap-4">
          <button className="btn btn-primary flex items-center">
            <Plus className="h-5 w-5 mr-2" />
            Add Material
          </button>
          <button className="btn btn-secondary flex items-center">
            <Upload className="h-5 w-5 mr-2" />
            Import Excel
          </button>
          <button className="btn btn-secondary flex items-center">
            <Package className="h-5 w-5 mr-2" />
            Generate Report
          </button>
        </div>
      </div>

      {/* Project Status */}
      {selectedProjectId && (
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Project Commercial Status</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <Package className="h-8 w-8 text-blue-600 mx-auto mb-2" />
              <p className="text-sm text-gray-600">Total Materials</p>
              <p className="text-2xl font-bold text-blue-600">{dashboardStats.totalMaterials}</p>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <IndianRupee className="h-8 w-8 text-green-600 mx-auto mb-2" />
              <p className="text-sm text-gray-600">Total Value</p>
              <p className="text-2xl font-bold text-green-600">₹{dashboardStats.totalValue.toLocaleString()}</p>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <RefreshCw className="h-8 w-8 text-purple-600 mx-auto mb-2" />
              <p className="text-sm text-gray-600">Active Transfers</p>
              <p className="text-2xl font-bold text-purple-600">{dashboardStats.activeTransfers}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Commercial;
