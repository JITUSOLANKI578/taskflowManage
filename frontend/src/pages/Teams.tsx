import React, { useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';
import { 
  Plus, 
  Search, 
  Users as UsersIcon, 
  Crown, 
  FolderOpen, 
  Calendar, 
  Loader2, 
  Edit,
  Trash2,
  UserPlus,
  UserMinus,
  Target
} from 'lucide-react';

interface User {
  _id: string;
  name: string;
  email: string;
  role: string;
}

interface Team {
  _id: string;
  name: string;
  description: string;
  leader: {
    _id: string;
    name: string;
    email: string;
  };
  members: User[];
  projects: Array<{
    _id: string;
    name: string;
    status: string;
  }>;
  createdAt: string;
}

const Teams: React.FC = () => {
  const { user } = useAuth();
  const [teams, setTeams] = useState<Team[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);
  const [creating, setCreating] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    leaderId: '',
    members: [] as string[]
  });

  useEffect(() => {
    fetchTeams();
    fetchUsers();
  }, []);

  const fetchTeams = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/teams');
      setTeams(response.data);
    } catch (error) {
      toast.error('Failed to fetch teams');
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await axios.get('/api/users');
      setUsers(response.data.filter((u: User) => u.role !== 'admin' && u.role !== 'masteradmin'));
    } catch (error) {
      toast.error('Failed to fetch users');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.leaderId) {
      toast.error('Please fill in all required fields');
      return;
    }

    setCreating(true);
    try {
      if (editingTeam) {
        await axios.put(`/api/teams/${editingTeam._id}`, formData);
        toast.success('Team updated successfully');
      } else {
        await axios.post('/api/teams', formData);
        toast.success('Team created successfully');
      }

      setShowModal(false);
      resetForm();
      fetchTeams();
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to save team';
      toast.error(message);
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (teamId: string) => {
    if (window.confirm('Are you sure you want to delete this team?')) {
      try {
        await axios.delete(`/api/teams/${teamId}`);
        toast.success('Team deleted successfully');
        fetchTeams();
      } catch (error: any) {
        const message = error.response?.data?.message || 'Failed to delete team';
        toast.error(message);
      }
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      leaderId: '',
      members: []
    });
    setEditingTeam(null);
  };

  const startEdit = (team: Team) => {
    setEditingTeam(team);
    setFormData({
      name: team.name,
      description: team.description,
      leaderId: team.leader._id,
      members: team.members.map(m => m._id)
    });
    setShowModal(true);
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const filteredTeams = teams.filter(team =>
    team.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    team.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    team.leader.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-slate-600" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-slate-50 min-h-screen">
      {/* Header */}
      <div className="mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Teams</h1>
            <p className="text-slate-600 mt-2">Manage your company teams and their members</p>
          </div>
          
          <button
            onClick={() => {
              resetForm();
              setShowModal(true);
            }}
            className="bg-slate-600 hover:bg-slate-700 text-white px-6 py-3 rounded-lg flex items-center gap-2 transition-colors font-medium"
          >
            <Plus className="h-5 w-5" />
            Create Team
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600">Total Teams</p>
              <p className="text-3xl font-bold text-slate-900 mt-2">{teams.length}</p>
            </div>
            <UsersIcon className="h-8 w-8 text-slate-400" />
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600">Total Members</p>
              <p className="text-3xl font-bold text-blue-600 mt-2">
                {teams.reduce((acc, team) => acc + team.members.length, 0)}
              </p>
            </div>
            <UserPlus className="h-8 w-8 text-blue-400" />
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600">Team Leaders</p>
              <p className="text-3xl font-bold text-green-600 mt-2">{teams.length}</p>
            </div>
            <Crown className="h-8 w-8 text-green-400" />
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600">Active Projects</p>
              <p className="text-3xl font-bold text-purple-600 mt-2">
                {teams.reduce((acc, team) => acc + team.projects.length, 0)}
              </p>
            </div>
            <FolderOpen className="h-8 w-8 text-purple-400" />
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="mb-6 bg-white rounded-xl border border-slate-200 shadow-sm p-4">
        <div className="relative">
          <Search className="absolute left-3 top-3 h-5 w-5 text-slate-400" />
          <input
            type="text"
            placeholder="Search teams..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-transparent transition-all"
          />
        </div>
      </div>

      {/* Teams Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredTeams.map((team) => (
          <div key={team._id} className="bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden">
            {/* Team Header */}
            <div className="p-6 pb-4">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3 className="text-xl font-semibold text-slate-900 mb-2">{team.name}</h3>
                  <p className="text-slate-600 text-sm line-clamp-2">{team.description}</p>
                </div>
                
                <div className="flex items-center gap-2 ml-4">
                  <button
                    onClick={() => startEdit(team)}
                    className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                  >
                    <Edit className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(team._id)}
                    className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Team Leader */}
              <div className="mb-4">
                <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                  <div className="h-10 w-10 rounded-full bg-slate-600 flex items-center justify-center text-white text-sm font-medium">
                    {getInitials(team.leader.name)}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-slate-900">{team.leader.name}</p>
                      <Crown className="h-4 w-4 text-yellow-500" />
                    </div>
                    <p className="text-sm text-slate-600">{team.leader.email}</p>
                  </div>
                </div>
              </div>

              {/* Team Members */}
              <div className="mb-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-medium text-slate-900">Team Members</h4>
                  <span className="text-sm text-slate-500">{team.members.length} members</span>
                </div>
                
                {team.members.length > 0 ? (
                  <div className="space-y-2 max-h-32 overflow-y-auto">
                    {team.members.slice(0, 3).map((member) => (
                      <div key={member._id} className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-slate-600 flex items-center justify-center text-white text-xs font-medium">
                          {getInitials(member.name)}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-slate-900">{member.name}</p>
                          <p className="text-xs text-slate-500">{member.role.replace('_', ' ')}</p>
                        </div>
                      </div>
                    ))}
                    {team.members.length > 3 && (
                      <div className="text-sm text-slate-500 pl-11">
                        +{team.members.length - 3} more members
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-slate-500 italic">No members assigned</p>
                )}
              </div>

              {/* Projects */}
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium text-slate-900">Projects</h4>
                  <span className="text-sm text-slate-500">{team.projects.length} projects</span>
                </div>
                
                {team.projects.length > 0 ? (
                  <div className="space-y-1">
                    {team.projects.slice(0, 2).map((project) => (
                      <div key={project._id} className="flex items-center gap-2">
                        <FolderOpen className="h-4 w-4 text-slate-400" />
                        <span className="text-sm text-slate-600">{project.name}</span>
                      </div>
                    ))}
                    {team.projects.length > 2 && (
                      <div className="text-sm text-slate-500 pl-6">
                        +{team.projects.length - 2} more projects
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-slate-500 italic">No projects assigned</p>
                )}
              </div>

              {/* Created Date */}
              <div className="flex items-center text-xs text-slate-500">
                <Calendar className="h-4 w-4 mr-1" />
                Created {new Date(team.createdAt).toLocaleDateString()}
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredTeams.length === 0 && (
        <div className="text-center py-12 bg-white rounded-xl border border-slate-200 shadow-sm">
          <UsersIcon className="h-12 w-12 text-slate-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-slate-900 mb-2">No teams found</h3>
          <p className="text-slate-600 mb-4">
            {searchTerm
              ? 'Try adjusting your search terms.'
              : 'Create your first team to get started.'
            }
          </p>
        </div>
      )}

      {/* Create/Edit Team Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-200">
              <h2 className="text-xl font-semibold text-slate-900">
                {editingTeam ? 'Edit Team' : 'Create New Team'}
              </h2>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Team Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500"
                  placeholder="Enter team name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500 resize-none"
                  rows={3}
                  placeholder="Describe the team's purpose and goals"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Team Leader *
                </label>
                <select
                  required
                  value={formData.leaderId}
                  onChange={(e) => setFormData({ ...formData, leaderId: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500"
                >
                  <option value="">Select a team leader</option>
                  {users.map(user => (
                    <option key={user._id} value={user._id}>
                      {user.name} ({user.email})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Team Members
                </label>
                <div className="border border-slate-300 rounded-lg p-4 max-h-48 overflow-y-auto">
                  {users.length === 0 ? (
                    <p className="text-sm text-slate-500 italic">No users available</p>
                  ) : (
                    <div className="space-y-2">
                      {users.map(user => (
                        <label key={user._id} className="flex items-center gap-3 p-2 hover:bg-slate-50 rounded-lg cursor-pointer">
                          <input
                            type="checkbox"
                            checked={formData.members.includes(user._id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setFormData({
                                  ...formData,
                                  members: [...formData.members, user._id]
                                });
                              } else {
                                setFormData({
                                  ...formData,
                                  members: formData.members.filter(id => id !== user._id)
                                });
                              }
                            }}
                            className="rounded border-slate-300 text-slate-600 focus:ring-slate-500"
                          />
                          <div className="h-8 w-8 rounded-full bg-slate-600 flex items-center justify-center text-white text-xs font-medium">
                            {getInitials(user.name)}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-slate-900">{user.name}</p>
                            <p className="text-xs text-slate-500">{user.email}</p>
                          </div>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
                <p className="text-sm text-slate-500 mt-2">
                  Selected {formData.members.length} member{formData.members.length !== 1 ? 's' : ''}
                </p>
              </div>

              <div className="flex gap-4 pt-6 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    resetForm();
                  }}
                  className="flex-1 px-6 py-3 text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="flex-1 px-6 py-3 bg-slate-600 text-white rounded-lg hover:bg-slate-700 disabled:opacity-50 transition-colors font-medium flex items-center justify-center gap-2"
                >
                  {creating ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      {editingTeam ? 'Updating...' : 'Creating...'}
                    </>
                  ) : (
                    editingTeam ? 'Update Team' : 'Create Team'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Teams;