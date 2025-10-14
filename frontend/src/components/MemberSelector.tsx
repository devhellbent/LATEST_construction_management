import React, { useState, useEffect } from 'react';
import { User, ChevronDown } from 'lucide-react';
import { projectMembersAPI } from '../services/api';

interface ProjectMember {
  project_member_id: number;
  project_id: number;
  user_id: number;
  role_id: number;
  user: {
    user_id: number;
    name: string;
    email: string;
  };
  role: {
    role_id: number;
    name: string;
  };
}

interface MemberSelectorProps {
  projectId: number | null;
  selectedMemberId: number | null;
  onMemberChange: (memberId: number | null) => void;
  className?: string;
  placeholder?: string;
  disabled?: boolean;
}

const MemberSelector: React.FC<MemberSelectorProps> = ({
  projectId,
  selectedMemberId,
  onMemberChange,
  className = '',
  placeholder = 'Select a member...',
  disabled = false
}) => {
  const [members, setMembers] = useState<ProjectMember[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (projectId) {
      fetchMembers();
    } else {
      setMembers([]);
    }
  }, [projectId]);

  const fetchMembers = async () => {
    if (!projectId) return;
    
    try {
      setLoading(true);
      setError(null);
      const response = await projectMembersAPI.getProjectMembersByProject(projectId);
      setMembers(response.data.members || []);
    } catch (err: any) {
      console.error('Error fetching project members:', err);
      setError('Failed to load members');
      setMembers([]);
    } finally {
      setLoading(false);
    }
  };

  const selectedMember = members.find(m => m.user_id === selectedMemberId);

  const handleMemberSelect = (memberId: number) => {
    onMemberChange(memberId);
    setIsOpen(false);
  };

  const handleClearSelection = () => {
    onMemberChange(null);
    setIsOpen(false);
  };

  if (loading) {
    return (
      <div className={`relative ${className}`}>
        <div className="input w-full flex items-center">
          <User className="h-4 w-4 text-gray-400 mr-2" />
          <span className="text-gray-500">Loading members...</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled || !projectId}
        className={`input w-full text-left flex items-center justify-between ${
          disabled || !projectId ? 'bg-gray-100 cursor-not-allowed' : 'cursor-pointer'
        }`}
      >
        <div className="flex items-center">
          <User className="h-4 w-4 text-gray-400 mr-2" />
          {selectedMember ? (
            <span className="text-gray-900">{selectedMember.user.name}</span>
          ) : (
            <span className="text-gray-500">{placeholder}</span>
          )}
        </div>
        <ChevronDown className="h-4 w-4 text-gray-400" />
      </button>

      {error && (
        <p className="text-sm text-red-600 mt-1">{error}</p>
      )}

      {!projectId && (
        <p className="text-sm text-gray-500 mt-1">Please select a project first</p>
      )}

      {isOpen && projectId && (
        <>
          <div
            className="fixed inset-0 z-[9998]"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute z-[9999] w-full mt-1 bg-white border border-slate-300 rounded-lg shadow-xl max-h-60 overflow-auto">
            <div className="p-2">
              <button
                onClick={handleClearSelection}
                className="w-full text-left px-3 py-2 text-xs sm:text-sm text-slate-500 hover:bg-slate-100 rounded"
              >
                Clear Selection
              </button>
            </div>
            {members.length === 0 ? (
              <div className="px-4 py-3 text-xs sm:text-sm text-slate-500 text-center">
                No members found for this project
              </div>
            ) : (
              members.map((member) => (
                <button
                  key={member.user_id}
                  onClick={() => handleMemberSelect(member.user_id)}
                  className={`w-full text-left px-3 py-2 text-xs sm:text-sm hover:bg-slate-100 rounded mx-2 my-1 ${
                    selectedMemberId === member.user_id
                      ? 'bg-primary-50 text-primary-700'
                      : 'text-slate-900'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-medium">{member.user.name}</span>
                      <div className="text-xs text-gray-500">{member.user.email}</div>
                    </div>
                    <span className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded">
                      {member.role.name}
                    </span>
                  </div>
                </button>
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default MemberSelector;
