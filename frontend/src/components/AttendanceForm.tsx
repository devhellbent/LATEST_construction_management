import React, { useState, useEffect } from 'react';
import { X, Save, Calendar, Clock, Users } from 'lucide-react';
import { laboursAPI } from '../services/api';

interface AttendanceFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  projectId: number;
  labourId?: number;
  attendance?: {
    attendance_id: number;
    labour_id: number;
    project_id: number;
    date: string;
    hours_worked: number;
  } | null;
}

interface Labour {
  labour_id: number;
  name: string;
  skill: string;
  wage_rate: number;
  contact: string;
}

const AttendanceForm: React.FC<AttendanceFormProps> = ({
  isOpen,
  onClose,
  onSuccess,
  projectId,
  labourId,
  attendance
}) => {
  const [formData, setFormData] = useState({
    labour_id: labourId || '',
    date: '',
    hours_worked: ''
  });
  const [labours, setLabours] = useState<Labour[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetchLabours();
      if (attendance) {
        setFormData({
          labour_id: attendance.labour_id.toString(),
          date: attendance.date,
          hours_worked: attendance.hours_worked.toString()
        });
      } else {
        setFormData({
          labour_id: labourId?.toString() || '',
          date: new Date().toISOString().split('T')[0],
          hours_worked: ''
        });
      }
    }
  }, [isOpen, attendance, labourId]);

  const fetchLabours = async () => {
    try {
      const response = await laboursAPI.getLaboursByProject(projectId);
      setLabours(response.data.labours || []);
    } catch (err) {
      console.error('Error fetching labours:', err);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const submitData = {
        project_id: projectId,
        date: formData.date,
        hours_worked: parseFloat(formData.hours_worked)
      };

      if (attendance) {
        await laboursAPI.updateAttendance(attendance.attendance_id, submitData.hours_worked);
      } else {
        await laboursAPI.recordAttendance(parseInt(formData.labour_id.toString()), submitData);
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Error saving attendance:', err);
      setError(err.response?.data?.message || 'Failed to save attendance');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-900">
            {attendance ? 'Edit Attendance' : 'Record Attendance'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-3">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {/* Labour Selection */}
          {!attendance && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Users className="h-4 w-4 inline mr-1" />
                Select Labour *
              </label>
              <select
                name="labour_id"
                value={formData.labour_id}
                onChange={handleInputChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Select labour</option>
                {labours.map((labour) => (
                  <option key={labour.labour_id} value={labour.labour_id}>
                    {labour.name} {labour.skill && `(${labour.skill})`}
                  </option>
                ))}
              </select>
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
              name="date"
              value={formData.date}
              onChange={handleInputChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Hours Worked */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Clock className="h-4 w-4 inline mr-1" />
              Hours Worked *
            </label>
            <input
              type="number"
              name="hours_worked"
              value={formData.hours_worked}
              onChange={handleInputChange}
              required
              min="0"
              max="24"
              step="0.5"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter hours worked"
            />
          </div>

          {/* Form Actions */}
          <div className="flex justify-end space-x-3 pt-4">
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
                  {attendance ? 'Update' : 'Record'} Attendance
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AttendanceForm;
