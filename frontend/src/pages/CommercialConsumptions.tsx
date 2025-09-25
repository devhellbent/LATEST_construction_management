import React, { useState, useEffect } from 'react';
import { RefreshCw, Download, MoreHorizontal, Settings, Calculator } from 'lucide-react';
import { commercialAPI } from '../services/api';

interface MaterialConsumption {
  consumption_id: number;
  project_id: number;
  material_id: number;
  quantity_consumed: number;
  consumption_date: string;
  consumption_purpose: string;
  location: string;
  recorded_by_user_id: number;
  created_at: string;
  project?: { name: string };
  material?: { name: string };
  recorded_by?: { name: string };
}

const CommercialConsumptions: React.FC = () => {
  const [consumptions, setConsumptions] = useState<MaterialConsumption[]>([]);
  const [calculatedConsumptions, setCalculatedConsumptions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [calculating, setCalculating] = useState(false);
  const [showCalculated, setShowCalculated] = useState(false);

  useEffect(() => {
    fetchConsumptions();
  }, []);

  const fetchConsumptions = async () => {
    try {
      setLoading(true);
      const response = await commercialAPI.getConsumptions();
      setConsumptions(response.data.consumptions || []);
    } catch (error) {
      console.error('Error fetching consumptions:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateConsumptions = async () => {
    try {
      setCalculating(true);
      const response = await commercialAPI.calculateConsumptions();
      setCalculatedConsumptions(response.data.consumptions || []);
      setShowCalculated(true);
      // Refresh the regular consumptions to show updated data
      fetchConsumptions();
    } catch (error) {
      console.error('Error calculating consumptions:', error);
    } finally {
      setCalculating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header with Navigation Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <div className="flex items-center space-x-2 py-2 px-1 text-gray-500 hover:text-gray-700 cursor-pointer">
            <span className="font-medium">Inventory</span>
          </div>
          <div className="flex items-center space-x-2 py-2 px-1 text-gray-500 hover:text-gray-700 cursor-pointer">
            <span className="font-medium">Site Transfers</span>
          </div>
          <div className="flex items-center space-x-2 py-2 px-1 text-gray-500 hover:text-gray-700 cursor-pointer">
            <span className="font-medium">Material Issue</span>
          </div>
          <div className="flex items-center space-x-2 py-2 px-1 text-gray-500 hover:text-gray-700 cursor-pointer">
            <span className="font-medium">Material Return</span>
          </div>
          <div className="flex items-center space-x-2 py-2 px-1 text-gray-500 hover:text-gray-700 cursor-pointer">
            <span className="font-medium">Petty Cash</span>
          </div>
          <div className="flex items-center space-x-2 py-2 px-1 border-b-2 border-primary-500">
            <RefreshCw className="h-5 w-5 text-primary-600" />
            <span className="text-primary-600 font-medium">Consumptions</span>
          </div>
        </nav>
      </div>

      {/* Filter and Action Bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          {/* Filter Dropdowns */}
          <select className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500">
            <option>Project</option>
          </select>
          <select className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500">
            <option>Material</option>
          </select>
          <select className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500">
            <option>Entry By</option>
          </select>
          <select className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500">
            <option>Members</option>
          </select>
          <select className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500">
            <option>Sub Contractors</option>
          </select>
          <select className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500">
            <option>Tags</option>
          </select>
          <select className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500">
            <option>Entry Date</option>
          </select>
          <select className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500">
            <option>Type</option>
          </select>
          <button className="btn btn-secondary text-sm px-3 py-2">
            <MoreHorizontal className="h-4 w-4 mr-1" />
            + More
          </button>
        </div>

        <div className="flex items-center space-x-4">
          <button 
            onClick={calculateConsumptions}
            disabled={calculating}
            className="btn btn-primary flex items-center"
          >
            <Calculator className="h-4 w-4 mr-2" />
            {calculating ? 'Calculating...' : 'Calculate Consumptions'}
          </button>
          <button className="btn btn-secondary flex items-center">
            <Download className="h-4 w-4 mr-2" />
            Export Excel
          </button>
          <button className="btn btn-secondary flex items-center">
            <Settings className="h-4 w-4 mr-2" />
            Manage Columns
          </button>
        </div>
      </div>

      {/* Data Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Project Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Material
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Quantity
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Entry By
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  tags
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Entry Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Remark
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Specification
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Issued To
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Checked By
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={11} className="px-6 py-12 text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
                    <p className="mt-2 text-gray-600">Loading consumptions...</p>
                  </td>
                </tr>
              ) : consumptions.length === 0 ? (
                <tr>
                  <td colSpan={11} className="px-6 py-12 text-center text-gray-500">
                    No Rows To Show
                  </td>
                </tr>
              ) : (
                consumptions.map((consumption) => (
                  <tr key={consumption.consumption_id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {consumption.project?.name || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {consumption.material?.name || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {consumption.quantity_consumed}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {consumption.recorded_by?.name || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      -
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(consumption.consumption_date).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {consumption.consumption_purpose || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      -
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      -
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      -
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      -
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Calculated Consumptions Section */}
      {showCalculated && calculatedConsumptions.length > 0 && (
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Automated Consumption Calculation</h3>
            <p className="text-sm text-gray-500">Materials consumed = Issued - Returned - Transferred Out</p>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Project</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Material</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Issued</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Returned</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Transferred</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Consumed</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cost/Unit</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Cost</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {calculatedConsumptions.map((consumption) => (
                  <tr key={`${consumption.project_id}-${consumption.material_id}`} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {consumption.project_name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {consumption.material_name} ({consumption.material_type})
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {consumption.total_issued} {consumption.material_unit}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {consumption.total_returned} {consumption.material_unit}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {consumption.total_transferred_out} {consumption.material_unit}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-green-600">
                      {consumption.consumed_quantity} {consumption.material_unit}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      ₹{consumption.cost_per_unit || 0}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      ₹{consumption.total_cost || 0}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
            <div className="flex justify-between items-center">
              <div className="text-sm text-gray-600">
                Total Materials: {calculatedConsumptions.length} | 
                Total Consumed: {calculatedConsumptions.reduce((sum, c) => sum + c.consumed_quantity, 0)} | 
                Total Cost: ₹{calculatedConsumptions.reduce((sum, c) => sum + c.total_cost, 0)}
              </div>
              <button 
                onClick={() => setShowCalculated(false)}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                Hide Details
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CommercialConsumptions;