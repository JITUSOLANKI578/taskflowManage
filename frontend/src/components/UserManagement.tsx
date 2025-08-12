import React, { useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';
import { 
  Plus, 
  Search, 
  Users as UsersIcon, 
  Mail, 
  Phone, 
  MapPin, 
  Calendar, 
  Loader2, 
  Edit,
  Trash2,
  Eye,
  EyeOff,
  Shield,
  Building2,
  UserCheck,
  UserX,
  Save,
  X
} from 'lucide-react';

interface User {
  _id: string;
  name: string;
  email: string;
  role: string;
  company?: {
    _id: string;
    name: string;
  };
  teams: Array<{
    _id: string;
    name: string;
  }>;
  isActive: boolean;
  createdAt: string;
  lastLogin?: string;
  phone?: string;
  department?: string;
  position?: string;
  location?: string;
}

const UserManagement: React.FC = () => {
  const { user } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [creating, setCreating] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: user?.role === 'masteradmin' ? 'admin' : 'employee',
    phone: '',
    department: '',
    position: '',
    location: ''
  });

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const endpoint = user?.role === 'masteradmin' ? '/api/users' : '/api/users';
      const response = await axios.get(endpoint);
      setUsers(response.data);
    } catch (error) {
      toast.error('Failed to fetch users');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.email || (!editingUser && !formData.password)) {
      toast.error('Please fill in all required fields');
      return;
    }

    setCreating(true);
    try {
      const endpoint = user?.role === 'masteradmin' ? '/api/users' : '/api/users/members';
      const payload = editingUser 
        ? { ...formData, password: formData.password || undefined }
        : formData;

      if (editingUser) {
        const updateEndpoint = user?.role === 'masteradmin' 
          ? `/api/users/${editingUser._id}`
          : `/api/users/members/${editingUser._id}`;
        await axios.put(updateEndpoint, payload);
        toast.success('User updated successfully');
      } else {
        await axios.post(endpoint, payload);
        toast.success('User created successfully');
      }

      setShowModal(false);
      resetForm();
      fetchUsers();
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to save user';
      toast.error(message);
    } finally {
      setCreating(false);
    }
  };

  const handleStatusToggle = async (userId: string, isActive: boolean) => {
    setActionLoading(userId);
    try {
      const endpoint = user?.role === 'masteradmin' 
        ? `/api/users/${userId}/status` 
        : `/api/users/members/${userId}/status`;
      
      await axios.put(endpoint, { isActive });
      toast.success(`User ${isActive ? 'activated' : 'deactivated'} successfully`);
      fetchUsers();
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to update user status';
      toast.error(message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async (userId: string) => {
    if (window.confirm('Are you sure you want to delete this user?')) {
      setActionLoading(userId);
      try {
        const endpoint = user?.role === 'masteradmin' 
          ? `/api/users/${userId}` 
          : `/api/users/members/${userId}`;
        
        await axios.delete(endpoint);
        toast.success('User deleted successfully');
        fetchUsers();
      } catch (error: any) {
        const message = error.response?.data?.message || 'Failed to delete user';
        toast.error(message);
      } finally {
        setActionLoading(null);
      }
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      password: '',
      role: user?.role === 'masteradmin' ? 'admin' : 'employee',
      phone: '',
      department: '',
      position: '',
      location: ''
    });
    setEditingUser(null);
  };

  const startEdit = (userToEdit: User) => {
    setEditingUser(userToEdit);
    setFormData({
      name: userToEdit.name,
      email: userToEdit.email,
      password: '',
      role: userToEdit.role,
      phone: userToEdit.phone || '',
      department: userToEdit.department || '',
      position: userToEdit.position || '',
      location: userToEdit.location || ''
    });
    setShowModal(true);
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'masteradmin': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'admin': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'team_leader': return 'bg-green-100 text-green-800 border-green-200';
      case 'bug_fixer': return 'bg-orange-100 text-orange-800 border-orange-200';
      default: return 'bg-slate-100 text-slate-800 border-slate-200';
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'masteradmin': return <Shield className="h-4 w-4" />;
      case 'admin': return <Building2 className="h-4 w-4" />;
      case 'team_leader': return <UserCheck className="h-4 w-4" />;
      default: return <UsersIcon className="h-4 w-4" />;
    }
  };

  const getPageTitle = () => {
    switch (user?.role) {
      case 'masteradmin': return 'System Administrators';
      case 'admin': return 'Company Members';
      default: return 'My Profile';
    }
  };

  const getPageDescription = () => {
    switch (user?.role) {
      case 'masteradmin': return 'Manage system administrators and their permissions';
      case 'admin': return 'Manage your company members and their roles';
      default: return 'View and update your profile information';
    }
  };

  const canCreateUsers = user?.role === 'masteradmin' || user?.role === 'admin';
  const canManageUsers = user?.role === 'masteradmin' || user?.role === 'admin';

  const filteredUsers = users.filter(u => {
    const matchesSearch = u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         u.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === 'all' || u.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const getRoleOptions = () => {
    if (user?.role === 'masteradmin') {
      return [
        { value: 'admin', label: 'Administrator' }
      ];
    }
    return [
      { value: 'employee', label: 'Employee' },
      { value: 'team_leader', label: 'Team Leader' },
      { value: 'bug_fixer', label: 'Bug Fixer' }
    ];
  };

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
            <h1 className="text-3xl font-bold text-slate-900">{getPageTitle()}</h1>
            <p className="text-slate-600 mt-2">{getPageDescription()}</p>
          </div>
          
          {canCreateUsers && (
            <button
              onClick={() => {
                resetForm();
                setShowModal(true);
              }}
              className="bg-slate-600 hover:bg-slate-700 text-white px-6 py-3 rounded-lg flex items-center gap-2 transition-colors font-medium shadow-sm"
            >
              <Plus className="h-5 w-5" />
              Add {user?.role === 'masteradmin' ? 'Admin' : 'Member'}
            </button>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600">Total Users</p>
              <p className="text-3xl font-bold text-slate-900 mt-2">{users.length}</p>
            </div>
            <UsersIcon className="h-8 w-8 text-slate-400" />
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600">Active Users</p>
              <p className="text-3xl font-bold text-green-600 mt-2">
                {users.filter(u => u.isActive).length}
              </p>
            </div>
            <UserCheck className="h-8 w-8 text-green-400" />
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600">Inactive Users</p>
              <p className="text-3xl font-bold text-red-600 mt-2">
                {users.filter(u => !u.isActive).length}
              </p>
            </div>
            <UserX className="h-8 w-8 text-red-400" />
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600">Team Leaders</p>
              <p className="text-3xl font-bold text-blue-600 mt-2">
                {users.filter(u => u.role === 'team_leader').length}
              </p>
            </div>
            <Shield className="h-8 w-8 text-blue-400" />
          </div>
        </div>
      </div>

      {/* Filters */}
      {canManageUsers && (
        <div className="mb-6 bg-white rounded-xl border border-slate-200 shadow-sm p-4">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-5 w-5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search users..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-transparent transition-all"
                />
              </div>
            </div>

            <div>
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500 bg-white"
              >
                <option value="all">All Roles</option>
                {user?.role === 'masteradmin' && <option value="admin">Admin</option>}
                {user?.role === 'admin' && (
                  <>
                    <option value="employee">Employee</option>
                    <option value="team_leader">Team Leader</option>
                    <option value="bug_fixer">Bug Fixer</option>
                  </>
                )}
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Users Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredUsers.map((userItem) => (
          <div key={userItem._id} className="bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden">
            {/* User Header */}
            <div className="p-6 pb-4">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-4">
                  <div className="h-16 w-16 rounded-full bg-slate-600 flex items-center justify-center text-white text-lg font-bold">
                    {getInitials(userItem.name)}
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900">{userItem.name}</h3>
                    <p className="text-sm text-slate-600">{userItem.email}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border ${getRoleColor(userItem.role)}`}>
                        {getRoleIcon(userItem.role)}
                        {userItem.role.replace('_', ' ')}
                      </span>
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        userItem.isActive 
                          ? 'bg-green-100 text-green-800 border border-green-200' 
                          : 'bg-red-100 text-red-800 border border-red-200'
                      }`}>
                        {userItem.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* User Details */}
              <div className="space-y-3">
                {userItem.phone && (
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <Phone className="h-4 w-4" />
                    <span>{userItem.phone}</span>
                  </div>
                )}
                
                {userItem.department && (
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <Building2 className="h-4 w-4" />
                    <span>{userItem.department}</span>
                  </div>
                )}
                
                {userItem.position && (
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <UserCheck className="h-4 w-4" />
                    <span>{userItem.position}</span>
                  </div>
                )}
                
                {userItem.location && (
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <MapPin className="h-4 w-4" />
                    <span>{userItem.location}</span>
                  </div>
                )}

                {userItem.company && (
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <Building2 className="h-4 w-4" />
                    <span>{userItem.company.name}</span>
                  </div>
                )}

                {userItem.teams.length > 0 && (
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <UsersIcon className="h-4 w-4" />
                    <span>{userItem.teams.map(t => t.name).join(', ')}</span>
                  </div>
                )}

                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <Calendar className="h-4 w-4" />
                  <span>Joined {new Date(userItem.createdAt).toLocaleDateString()}</span>
                </div>

                {userItem.lastLogin && (
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <Calendar className="h-4 w-4" />
                    <span>Last login {new Date(userItem.lastLogin).toLocaleDateString()}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Actions */}
            {canManageUsers && userItem._id !== user?.id && (
              <div className="px-6 py-4 bg-slate-50 border-t border-slate-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => startEdit(userItem)}
                      disabled={actionLoading === userItem._id}
                      className="p-2 text-slate-600 hover:text-slate-800 hover:bg-slate-200 rounded-lg transition-colors disabled:opacity-50"
                      title="Edit user"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(userItem._id)}
                      disabled={actionLoading === userItem._id}
                      className="p-2 text-red-600 hover:text-red-800 hover:bg-red-100 rounded-lg transition-colors disabled:opacity-50"
                      title="Delete user"
                    >
                      {actionLoading === userItem._id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                  
                  <button
                    onClick={() => handleStatusToggle(userItem._id, !userItem.isActive)}
                    disabled={actionLoading === userItem._id}
                    className={`p-2 rounded-lg transition-colors disabled:opacity-50 ${
                      userItem.isActive
                        ? 'text-red-600 hover:text-red-800 hover:bg-red-100'
                        : 'text-green-600 hover:text-green-800 hover:bg-green-100'
                    }`}
                    title={userItem.isActive ? 'Deactivate user' : 'Activate user'}
                  >
                    {actionLoading === userItem._id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : userItem.isActive ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {filteredUsers.length === 0 && (
        <div className="text-center py-12 bg-white rounded-xl border border-slate-200 shadow-sm">
          <UsersIcon className="h-12 w-12 text-slate-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-slate-900 mb-2">No users found</h3>
          <p className="text-slate-600 mb-4">
            {searchTerm || roleFilter !== 'all'
              ? 'Try adjusting your search or filters.'
              : canCreateUsers 
                ? 'Create your first user to get started.'
                : 'No users have been created yet.'
            }
          </p>
        </div>
      )}

      {/* Create/Edit User Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-200">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-slate-900">
                  {editingUser ? 'Edit User' : `Add ${user?.role === 'masteradmin' ? 'Admin' : 'Member'}`}
                </h2>
                <button
                  onClick={() => {
                    setShowModal(false);
                    resetForm();
                  }}
                  className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500"
                    placeholder="Enter full name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500"
                    placeholder="Enter email address"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Password {editingUser ? '(leave blank to keep current)' : '*'}
                  </label>
                  <input
                    type="password"
                    required={!editingUser}
                    minLength={6}
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500"
                    placeholder="Enter password"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Role *
                  </label>
                  <select
                    required
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500"
                  >
                    {getRoleOptions().map(option => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500"
                    placeholder="Enter phone number"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Department
                  </label>
                  <input
                    type="text"
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500"
                    placeholder="Enter department"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Position
                  </label>
                  <input
                    type="text"
                    value={formData.position}
                    onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500"
                    placeholder="Enter position"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Location
                  </label>
                  <input
                    type="text"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500"
                    placeholder="Enter location"
                  />
                </div>
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
                      {editingUser ? 'Updating...' : 'Creating...'}
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4" />
                      {editingUser ? 'Update User' : 'Create User'}
                    </>
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

export default UserManagement;

// export default UserManagement