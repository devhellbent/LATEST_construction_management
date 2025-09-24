import React, { useState, useEffect } from 'react';
import { X, Save, Calendar, Users, Clock } from 'lucide-react';
import { laboursAPI } from '../services/api';

interface BulkAttendanceFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  projectId: number;
}

interface Labour {
  labour_id: number;
  name: string;
  skill: string;
  wage_rate: number;
  contact: string;
}

interface AttendanceRecord {
  labour_id: number;
  hours_worked: string;
}

const BulkAttendanceForm: React.FC<BulkAttendanceFormProps> = ({
  isOpen,
  onClose,
  onSuccess,
  projectId
}) => {
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    attendance_records: [] as AttendanceRecord[]
  });
  const [labours, setLabours] = useState<Labour[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetchLabours();
    }
  }, [isOpen]);

  const fetchLabours = async () => {
    try {
      const response = await laboursAPI.getLaboursByProject(projectId);
      const laboursData = response.data.labours || [];
      setLabours(laboursData);
      
      // Initialize attendance records
      setFormData(prev => ({
        ...prev,
        attendance_records: laboursData.map((labour: Labour) => ({
          labour_id: labour.labour_id,
          hours_worked: ''
        }))
      }));
    } catch (err) {
      console.error('Error fetching labours:', err);
    }
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      date: e.target.value
    }));
  };

  const handleHoursChange = (labourId: number, hours: string) => {
    setFormData(prev => ({
      ...prev,
      attendance_records: prev.attendance_records.map(record =>
        record.labour_id === labourId
          ? { ...record, hours_worked: hours }
          : record
      )
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const attendance_records = formData.attendance_records
        .filter(record => record.hours_worked && parseFloat(record.hours_worked) > 0)
        .map(record => ({
          labour_id: record.labour_id,
          hours_worked: parseFloat(record.hours_worked)
        }));

      if (attendance_records.length === 0) {
        setError('Please enter hours for at least one labour');
        return;
      }

      await laboursAPI.bulkAttendance({
        project_id: projectId,
        date: formData.date,
        attendance_records
      });

      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Error saving bulk attendance:', err);
      setError(err.response?.data?.message || 'Failed to save attendance');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-900">
            Bulk Attendance Recording
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto max-h-[calc(90vh-200px)]">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-3">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {/* Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Calendar className="h-4 w-4 inline mr-1" />
              Date *
            </label>
            <input
              type="date"
              value={formData.date}
              onChange={handleDateChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Attendance Records */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Users className="h-4 w-4 inline mr-1" />
              Labour Hours
            </label>
            <div className="space-y-3">
              {labours.map((labour) => {
                const record = formData.attendance_records.find(r => r.labour_id === labour.labour_id);
                return (
                  <div key={labour.labour_id} className="flex items-center space-x-4 p-3 bg-gray-50 rounded-md">
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">{labour.name}</p>
                      <p className="text-sm text-gray-600">
                        {labour.skill && `${labour.skill} • `}
                        {labour.wage_rate && `₹${labour.wage_rate}/day`}
                      </p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Clock className="h-4 w-4 text-gray-400" />
                      <input
                        type="number"
                        value={record?.hours_worked || ''}
                        onChange={(e) => handleHoursChange(labour.labour_id, e.target.value)}
                        min="0"
                        max="24"
                        step="0.5"
                        className="w-20 px-2 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="0"
                      />
                      <span className="text-sm text-gray-500">hrs</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex justify-end space-x-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Record Attendance
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default BulkAttendanceForm;
