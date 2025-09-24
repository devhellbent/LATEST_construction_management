import React, { useState, useEffect } from 'react';
import { Users, Plus, Filter, Calendar, Clock, Edit, Trash2, Eye, BarChart3 } from 'lucide-react';
import ProjectSelector from '../components/ProjectSelector';
import LabourForm from '../components/LabourForm';
import AttendanceForm from '../components/AttendanceForm';
import BulkAttendanceForm from '../components/BulkAttendanceForm';
import { laboursAPI } from '../services/api';

interface Labour {
  labour_id: number;
  name: string;
  skill: string;
  wage_rate: number;
  contact: string;
  attendance?: Attendance[];
}

interface Attendance {
  attendance_id: number;
  labour_id: number;
  project_id: number;
  date: string;
  hours_worked: number;
  project?: {
    project_id: number;
    name: string;
  };
}

const Labours: React.FC = () => {
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);
  const [labours, setLabours] = useState<Labour[]>([]);
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isFetching, setIsFetching] = useState(false);
  
  // Form states
  const [showLabourForm, setShowLabourForm] = useState(false);
  const [showAttendanceForm, setShowAttendanceForm] = useState(false);
  const [showBulkAttendanceForm, setShowBulkAttendanceForm] = useState(false);
  const [editingLabour, setEditingLabour] = useState<Labour | null>(null);
  const [editingAttendance, setEditingAttendance] = useState<Attendance | null>(null);

  useEffect(() => {
    fetchData();
  }, [selectedProjectId]);

  const fetchData = async () => {
    if (isFetching) return; // Prevent multiple simultaneous calls
    
    try {
      setIsFetching(true);
      setLoading(true);
      setError(null);
      
      if (selectedProjectId) {
        const [laboursResponse, attendanceResponse] = await Promise.all([
          laboursAPI.getLaboursByProject(selectedProjectId),
          laboursAPI.getAttendanceByProject(selectedProjectId)
        ]);
        const laboursData = Array.isArray(laboursResponse.data.labours) ? laboursResponse.data.labours : [];
        const attendanceData = Array.isArray(attendanceResponse.data.attendance) ? attendanceResponse.data.attendance : [];
        setLabours(laboursData);
        setAttendance(attendanceData);
      } else {
        const response = await laboursAPI.getLabours();
        const laboursData = Array.isArray(response.data.labours) ? response.data.labours : [];
        setLabours(laboursData);
        setAttendance([]);
      }
    } catch (err) {
      console.error('Error fetching labour data:', err);
      setError('Failed to load labour data');
      setLabours([]);
      setAttendance([]);
    } finally {
      setLoading(false);
      setIsFetching(false);
    }
  };

  const handleProjectChange = (projectId: number | null) => {
    setSelectedProjectId(projectId);
  };

  const handleCreateLabour = () => {
    setEditingLabour(null);
    setShowLabourForm(true);
  };

  const handleEditLabour = (labour: Labour) => {
    setEditingLabour(labour);
    setShowLabourForm(true);
  };

  const handleDeleteLabour = async (labourId: number) => {
    if (!window.confirm('Are you sure you want to delete this labour?')) return;
    
    try {
      await laboursAPI.deleteLabour(labourId);
      fetchData();
    } catch (err) {
      console.error('Error deleting labour:', err);
      alert('Failed to delete labour');
    }
  };

  const handleRecordAttendance = (labourId?: number) => {
    setEditingAttendance(null);
    setShowAttendanceForm(true);
  };

  const handleEditAttendance = (attendance: Attendance) => {
    setEditingAttendance(attendance);
    setShowAttendanceForm(true);
  };

  const handleDeleteAttendance = async (attendanceId: number) => {
    if (!window.confirm('Are you sure you want to delete this attendance record?')) return;
    
    try {
      await laboursAPI.deleteAttendance(attendanceId);
      fetchData();
    } catch (err) {
      console.error('Error deleting attendance:', err);
      alert('Failed to delete attendance record');
    }
  };

  const handleBulkAttendance = () => {
    if (!selectedProjectId) {
      alert('Please select a project first');
      return;
    }
    setShowBulkAttendanceForm(true);
  };

  const handleFormSuccess = () => {
    fetchData();
  };

  const getTotalHours = (labourId: number) => {
    return attendance
      .filter(record => record.labour_id === labourId)
      .reduce((sum, record) => sum + record.hours_worked, 0);
  };

  const getTotalEarnings = (labour: Labour) => {
    const totalDays = attendance
      .filter(record => record.labour_id === labour.labour_id)
      .length;
    return labour.wage_rate ? totalDays * labour.wage_rate : 0;
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Labours</h1>
        <div className="flex space-x-3">
          {selectedProjectId && (
            <>
              <button 
                onClick={handleBulkAttendance}
                className="btn btn-secondary flex items-center"
              >
                <Calendar className="h-5 w-5 mr-2" />
                Bulk Attendance
              </button>
              <button 
                onClick={() => handleRecordAttendance()}
                className="btn btn-secondary flex items-center"
              >
                <Clock className="h-5 w-5 mr-2" />
                Record Attendance
              </button>
            </>
          )}
          <button onClick={handleCreateLabour} className="btn btn-primary flex items-center">
            <Plus className="h-5 w-5 mr-2" />
            Add Labour
          </button>
        </div>
      </div>

      {/* Project Filter */}
      <div className="card p-6">
        <div className="flex items-center space-x-4">
          <Filter className="h-5 w-5 text-gray-500" />
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Filter by Project
            </label>
            <ProjectSelector
              selectedProjectId={selectedProjectId}
              onProjectChange={handleProjectChange}
              className="max-w-md"
              placeholder="Select a project to filter labours..."
            />
          </div>
        </div>
      </div>
      
      {/* Labours Content */}
      <div className="card p-6">
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading labour data...</p>
          </div>
        ) : error ? (
          <div className="text-center py-12">
            <Users className="h-12 w-12 text-red-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Error Loading Labour Data</h3>
            <p className="text-gray-600 mb-4">{error}</p>
            <button 
              onClick={fetchData}
              className="btn btn-secondary"
            >
              Try Again
            </button>
          </div>
        ) : labours.length === 0 ? (
          <div className="text-center py-12">
            <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {selectedProjectId ? 'No Labours Found' : 'No Labours Available'}
            </h3>
            <p className="text-gray-600">
              {selectedProjectId 
                ? 'This project doesn\'t have any labours assigned yet.' 
                : 'No labours have been added yet.'
              }
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-medium text-gray-900">
                {selectedProjectId ? `Labours for Selected Project` : 'All Labours'} ({labours.length})
              </h3>
            </div>
            
            <div className="grid gap-4">
              {labours.map((labour) => (
                <div key={labour.labour_id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3">
                        <h4 className="font-medium text-gray-900">{labour.name}</h4>
                        {labour.skill && (
                          <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full">
                            {labour.skill}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center space-x-4 mt-2 text-sm text-gray-500">
                        {labour.wage_rate && (
                          <span>Wage Rate: ₹{labour.wage_rate}/day</span>
                        )}
                        {labour.contact && <span>Contact: {labour.contact}</span>}
                      </div>
                      {selectedProjectId && (
                        <div className="flex items-center space-x-4 mt-2 text-sm">
                          <span className="text-gray-600">
                            Total Days: <span className="font-medium">{attendance.filter(record => record.labour_id === labour.labour_id).length}</span>
                          </span>
                          <span className="text-gray-600">
                            Total Hours: <span className="font-medium">{getTotalHours(labour.labour_id)}</span>
                          </span>
                          {labour.wage_rate && (
                            <span className="text-gray-600">
                              Total Earnings: <span className="font-medium text-green-600">₹{getTotalEarnings(labour).toFixed(2)}</span>
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="flex space-x-2">
                      <button 
                        onClick={() => handleEditLabour(labour)}
                        className="btn btn-sm btn-secondary flex items-center"
                      >
                        <Edit className="h-4 w-4 mr-1" />
                        Edit
                      </button>
                      {selectedProjectId && (
                        <button 
                          onClick={() => handleRecordAttendance(labour.labour_id)}
                          className="btn btn-sm btn-primary flex items-center"
                        >
                          <Clock className="h-4 w-4 mr-1" />
                          Attendance
                        </button>
                      )}
                      <button 
                        onClick={() => handleDeleteLabour(labour.labour_id)}
                        className="btn btn-sm btn-danger flex items-center"
                      >
                        <Trash2 className="h-4 w-4 mr-1" />
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Attendance Section */}
            {selectedProjectId && attendance.length > 0 && (
              <div className="mt-8">
                <h4 className="text-lg font-medium text-gray-900 mb-4">Recent Attendance</h4>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Labour
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Date
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Hours
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {attendance.slice(0, 10).map((record) => {
                        const labour = labours.find(l => l.labour_id === record.labour_id);
                        return (
                          <tr key={record.attendance_id}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              {labour?.name || 'Unknown'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {new Date(record.date).toLocaleDateString()}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {record.hours_worked} hours
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              <div className="flex space-x-2">
                                <button 
                                  onClick={() => handleEditAttendance(record)}
                                  className="text-blue-600 hover:text-blue-900"
                                >
                                  <Edit className="h-4 w-4" />
                                </button>
                                <button 
                                  onClick={() => handleDeleteAttendance(record.attendance_id)}
                                  className="text-red-600 hover:text-red-900"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Forms */}
      <LabourForm
        isOpen={showLabourForm}
        onClose={() => setShowLabourForm(false)}
        onSuccess={handleFormSuccess}
        labour={editingLabour}
        selectedProjectId={selectedProjectId}
      />

      <AttendanceForm
        isOpen={showAttendanceForm}
        onClose={() => setShowAttendanceForm(false)}
        onSuccess={handleFormSuccess}
        projectId={selectedProjectId || 0}
        labourId={editingAttendance?.labour_id}
        attendance={editingAttendance}
      />

      <BulkAttendanceForm
        isOpen={showBulkAttendanceForm}
        onClose={() => setShowBulkAttendanceForm(false)}
        onSuccess={handleFormSuccess}
        projectId={selectedProjectId || 0}
      />
    </div>
  );
};

export default Labours;
