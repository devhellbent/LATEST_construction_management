import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Users, 
  Plus, 
  Search, 
  Filter, 
  MoreVertical, 
  Edit, 
  Trash2, 
  Eye,
  ChevronDown,
  X
} from 'lucide-react';
import { projectMembersAPI, projectsAPI, usersAPI } from '../services/api';
import toast from 'react-hot-toast';

interface ProjectMember {
  project_member_id: number;
  project_id: number;
  user_id: number;
  role_id: number;
  invitation_status: 'PENDING' | 'ACCEPTED' | 'DECLINED';
  joined_at: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  user: {
    user_id: number;
    name: string;
    email: string;
    phone: string;
  };
  role: {
    role_id: number;
    name: string;
    description: string;
  };
  project: {
    project_id: number;
    name: string;
  };
}

interface Project {
  project_id: number;
  name: string;
}

interface Role {
  role_id: number;
  name: string;
  description: string;
}

interface User {
  user_id: number;
  name: string;
  email: string;
  phone: string;
}

const ProjectMembers: React.FC = () => {
  const navigate = useNavigate();
  const [members, setMembers] = useState<ProjectMember[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProject, setSelectedProject] = useState<number | null>(null);
  const [selectedRole, setSelectedRole] = useState<number | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingMember, setEditingMember] = useState<ProjectMember | null>(null);
  const [activeTab, setActiveTab] = useState<'all' | 'by-project'>('all');

  useEffect(() => {
    fetchData();
  }, [selectedProject, selectedRole, selectedStatus]);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch members with filters
      const params: any = {};
      if (selectedProject) params.project_id = selectedProject;
      if (selectedRole) params.role_id = selectedRole;
      if (selectedStatus) params.invitation_status = selectedStatus;
      
      const [membersRes, projectsRes, rolesRes, usersRes] = await Promise.all([
        projectMembersAPI.getProjectMembers(params),
        projectsAPI.getProjects(),
        projectMembersAPI.getAllRoles(),
        usersAPI.getUsers()
      ]);

      setMembers(membersRes.data.members || []);
      setProjects(projectsRes.data.projects || []);
      setRoles(rolesRes.data.roles || []);
      setUsers(usersRes.data.users || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const filteredMembers = members.filter(member => {
    const matchesSearch = member.user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         member.user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         member.role.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         member.project.name.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  // Group members by project for the "Members By Project" tab
  const membersByProject = projects.map(project => {
    const projectMembers = filteredMembers.filter(member => member.project_id === project.project_id);
    return {
      project,
      members: projectMembers
    };
  }).filter(group => group.members.length > 0); // Only show projects that have members

  const handleAddMember = () => {
    setShowAddModal(true);
  };

  const handleEditMember = (member: ProjectMember) => {
    setEditingMember(member);
    setShowAddModal(true);
  };

  const handleDeleteMember = async (memberId: number) => {
    if (window.confirm('Are you sure you want to remove this member?')) {
      try {
        await projectMembersAPI.removeProjectMember(memberId);
        toast.success('Member removed successfully');
        fetchData();
      } catch (error) {
        console.error('Error removing member:', error);
        toast.error('Failed to remove member');
      }
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACCEPTED': return 'text-green-600 bg-green-100';
      case 'PENDING': return 'text-yellow-600 bg-yellow-100';
      case 'DECLINED': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Project Associated Members</h1>
        <button 
          onClick={handleAddMember}
          className="btn btn-primary flex items-center"
        >
          <Plus className="h-5 w-5 mr-2" />
          Add Members
        </button>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button 
            onClick={() => setActiveTab('all')}
            className={`py-2 px-1 text-sm font-medium ${
              activeTab === 'all' 
                ? 'border-b-2 border-blue-500 text-blue-600' 
                : 'border-b-2 border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            All Members
          </button>
          <button 
            onClick={() => setActiveTab('by-project')}
            className={`py-2 px-1 text-sm font-medium ${
              activeTab === 'by-project' 
                ? 'border-b-2 border-blue-500 text-blue-600' 
                : 'border-b-2 border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Members By Project
          </button>
        </nav>
      </div>

      {/* Search and Filters */}
      <div className="space-y-4">
        <div className="flex items-center space-x-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search Members"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input pl-10 w-full"
            />
          </div>
          <div className="text-sm text-gray-600">
            {activeTab === 'all' ? filteredMembers.length : membersByProject.length} {activeTab === 'all' ? 'Members' : 'Projects'}
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <Filter className="h-4 w-4 text-gray-400" />
            <span className="text-sm text-gray-600">Filters:</span>
          </div>
          
          <select
            value={selectedProject || ''}
            onChange={(e) => setSelectedProject(e.target.value ? parseInt(e.target.value) : null)}
            className="input"
          >
            <option value="">All Projects</option>
            {projects.map(project => (
              <option key={project.project_id} value={project.project_id}>
                {project.name}
              </option>
            ))}
          </select>

          <select
            value={selectedRole || ''}
            onChange={(e) => setSelectedRole(e.target.value ? parseInt(e.target.value) : null)}
            className="input"
          >
            <option value="">All Roles</option>
            {roles.map(role => (
              <option key={role.role_id} value={role.role_id}>
                {role.name}
              </option>
            ))}
          </select>

          <select
            value={selectedStatus || ''}
            onChange={(e) => setSelectedStatus(e.target.value || null)}
            className="input"
          >
            <option value="">All Status</option>
            <option value="PENDING">Pending</option>
            <option value="ACCEPTED">Accepted</option>
            <option value="DECLINED">Declined</option>
          </select>

          {(selectedProject || selectedRole || selectedStatus) && (
            <button
              onClick={() => {
                setSelectedProject(null);
                setSelectedRole(null);
                setSelectedStatus(null);
              }}
              className="btn btn-secondary flex items-center"
            >
              <X className="h-4 w-4 mr-1" />
              Clear Filters
            </button>
          )}
        </div>
      </div>

      {/* Content based on active tab */}
      {activeTab === 'all' ? (
        /* All Members Table */
        <div className="card">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Member
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Invitation Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Role
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Project
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-4 text-center text-gray-500">
                      Loading...
                    </td>
                  </tr>
                ) : filteredMembers.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-4 text-center text-gray-500">
                      No members found
                    </td>
                  </tr>
                ) : (
                  filteredMembers.map((member) => (
                    <tr key={member.project_member_id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10">
                            <div className="h-10 w-10 rounded-full bg-red-500 flex items-center justify-center text-white font-medium">
                              {getInitials(member.user.name)}
                            </div>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">
                              {member.user.name}
                            </div>
                            <div className="text-sm text-gray-500">
                              {member.user.phone}
                            </div>
                            <div className="text-sm text-gray-500">
                              {member.user.email}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(member.invitation_status)}`}>
                          {member.invitation_status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <select
                            value={member.role_id}
                            onChange={(e) => {
                              // Handle role update
                              console.log('Update role:', member.project_member_id, e.target.value);
                            }}
                            className="input text-sm"
                          >
                            {roles.map(role => (
                              <option key={role.role_id} value={role.role_id}>
                                {role.name}
                              </option>
                            ))}
                          </select>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <span className="text-sm text-gray-900">{member.project.name}</span>
                          <ChevronDown className="ml-1 h-4 w-4 text-gray-400" />
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end space-x-2">
                          <button
                            onClick={() => handleEditMember(member)}
                            className="text-blue-600 hover:text-blue-900"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteMember(member.project_member_id)}
                            className="text-red-600 hover:text-red-900"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                          <button className="text-gray-400 hover:text-gray-600">
                            <MoreVertical className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
            <div className="flex-1 flex justify-between sm:hidden">
              <button className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50">
                Previous
              </button>
              <button className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50">
                Next
              </button>
            </div>
            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-gray-700">
                  Showing <span className="font-medium">1</span> to <span className="font-medium">{filteredMembers.length}</span> of{' '}
                  <span className="font-medium">{filteredMembers.length}</span> results
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-700">Rows per page:</span>
                <select className="input text-sm">
                  <option value="20">20</option>
                  <option value="50">50</option>
                  <option value="100">100</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Members By Project */
        <div className="space-y-6">
          {loading ? (
            <div className="card p-6 text-center">
              <p className="text-gray-500">Loading...</p>
            </div>
          ) : membersByProject.length === 0 ? (
            <div className="card p-6 text-center">
              <p className="text-gray-500">No projects with members found</p>
            </div>
          ) : (
            membersByProject.map((group) => (
              <div key={group.project.project_id} className="card">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h3 className="text-lg font-medium text-gray-900">{group.project.name}</h3>
                  <p className="text-sm text-gray-500">{group.members.length} member{group.members.length !== 1 ? 's' : ''}</p>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Member
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Invitation Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Role
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {group.members.map((member) => (
                        <tr key={member.project_member_id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="flex-shrink-0 h-10 w-10">
                                <div className="h-10 w-10 rounded-full bg-red-500 flex items-center justify-center text-white font-medium">
                                  {getInitials(member.user.name)}
                                </div>
                              </div>
                              <div className="ml-4">
                                <div className="text-sm font-medium text-gray-900">
                                  {member.user.name}
                                </div>
                                <div className="text-sm text-gray-500">
                                  {member.user.phone}
                                </div>
                                <div className="text-sm text-gray-500">
                                  {member.user.email}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(member.invitation_status)}`}>
                              {member.invitation_status}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <select
                                value={member.role_id}
                                onChange={(e) => {
                                  // Handle role update
                                  console.log('Update role:', member.project_member_id, e.target.value);
                                }}
                                className="input text-sm"
                              >
                                {roles.map(role => (
                                  <option key={role.role_id} value={role.role_id}>
                                    {role.name}
                                  </option>
                                ))}
                              </select>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <div className="flex items-center justify-end space-x-2">
                              <button
                                onClick={() => handleEditMember(member)}
                                className="text-blue-600 hover:text-blue-900"
                              >
                                <Edit className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteMember(member.project_member_id)}
                                className="text-red-600 hover:text-red-900"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                              <button className="text-gray-400 hover:text-gray-600">
                                <MoreVertical className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Add Member Modal */}
      {showAddModal && (
        <AddMemberModal
          isOpen={showAddModal}
          onClose={() => {
            setShowAddModal(false);
            setEditingMember(null);
          }}
          onSuccess={() => {
            setShowAddModal(false);
            setEditingMember(null);
            fetchData();
          }}
          projects={projects}
          roles={roles}
          users={users}
          editingMember={editingMember}
        />
      )}
    </div>
  );
};

// Add Member Modal Component
interface AddMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  projects: Project[];
  roles: Role[];
  users: User[];
  editingMember: ProjectMember | null;
}

const AddMemberModal: React.FC<AddMemberModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  projects,
  roles,
  users,
  editingMember
}) => {
  const [formData, setFormData] = useState({
    project_id: '',
    user_id: '',
    role_id: '',
    invitation_status: 'PENDING'
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (editingMember) {
      setFormData({
        project_id: editingMember.project_id.toString(),
        user_id: editingMember.user_id.toString(),
        role_id: editingMember.role_id.toString(),
        invitation_status: editingMember.invitation_status
      });
    } else {
      setFormData({
        project_id: '',
        user_id: '',
        role_id: '',
        invitation_status: 'PENDING'
      });
    }
  }, [editingMember]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.project_id || !formData.user_id || !formData.role_id) {
      toast.error('Please fill in all required fields');
      return;
    }

    setLoading(true);
    try {
      const memberData = {
        project_id: parseInt(formData.project_id),
        user_id: parseInt(formData.user_id),
        role_id: parseInt(formData.role_id),
        invitation_status: formData.invitation_status
      };

      if (editingMember) {
        await projectMembersAPI.updateProjectMember(editingMember.project_member_id, memberData);
        toast.success('Member updated successfully!');
      } else {
        await projectMembersAPI.addProjectMember(memberData);
        toast.success('Member added successfully!');
      }
      
      onSuccess();
    } catch (error: any) {
      console.error('Error saving member:', error);
      toast.error(error.response?.data?.message || 'Failed to save member');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <h2 className="text-xl font-bold mb-4">
          {editingMember ? 'Edit Member' : 'Add Member'}
        </h2>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Project *
            </label>
            <select
              value={formData.project_id}
              onChange={(e) => setFormData(prev => ({ ...prev, project_id: e.target.value }))}
              className="input w-full"
              required
            >
              <option value="">Select Project</option>
              {projects.map(project => (
                <option key={project.project_id} value={project.project_id}>
                  {project.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              User *
            </label>
            <select
              value={formData.user_id}
              onChange={(e) => setFormData(prev => ({ ...prev, user_id: e.target.value }))}
              className="input w-full"
              required
            >
              <option value="">Select User</option>
              {users.map(user => (
                <option key={user.user_id} value={user.user_id}>
                  {user.name} ({user.email})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Role *
            </label>
            <select
              value={formData.role_id}
              onChange={(e) => setFormData(prev => ({ ...prev, role_id: e.target.value }))}
              className="input w-full"
              required
            >
              <option value="">Select Role</option>
              {roles.map(role => (
                <option key={role.role_id} value={role.role_id}>
                  {role.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Invitation Status
            </label>
            <select
              value={formData.invitation_status}
              onChange={(e) => setFormData(prev => ({ ...prev, invitation_status: e.target.value }))}
              className="input w-full"
            >
              <option value="PENDING">Pending</option>
              <option value="ACCEPTED">Accepted</option>
              <option value="DECLINED">Declined</option>
            </select>
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="btn btn-secondary"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading}
            >
              {loading ? 'Saving...' : (editingMember ? 'Update' : 'Add')} Member
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProjectMembers;
