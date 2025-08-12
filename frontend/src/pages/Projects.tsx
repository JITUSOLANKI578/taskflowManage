import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';
import { 
  Plus, 
  Search, 
  FolderOpen, 
  Users, 
  Calendar, 
  Loader2, 
  Eye,
  Edit,
  Trash2,
  Clock,
  AlertTriangle,
  CheckCircle,
  Target,
  Filter,
  Grid,
  List,
  Flag,
  MessageSquare
} from 'lucide-react';

interface Team {
  _id: string;
  name: string;
  description: string;
  leader: {
    _id: string;
    name: string;
  };
  members: Array<{
    _id: string;
    name: string;
    email: string;
    role: string;
  }>;
}

interface Project {
  _id: string;
  name: string;
  description: string;
  team: {
    _id: string;
    name: string;
  };
  createdBy: {
    _id: string;
    name: string;
    email: string;
  };
  members: Array<{
    _id: string;
    name: string;
    email: string;
    role: string;
  }>;
  tasks: Array<{
    _id: string;
    title: string;
    status: string;
    priority: string;
  }>;
  status: string;
  priority: string;
  startDate: string;
  deadline: string;
  createdAt: string;
  chatRoom: string;
}

const Projects: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showModal, setShowModal] = useState(false);
  const [creating, setCreating] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    teamId: '',
    members: [] as string[],
    priority: 'medium',
    deadline: ''
  });

  useEffect(() => {
    fetchProjects();
    if (user?.role === 'admin') {
      fetchTeams();
    }
  }, [user]);

  const fetchProjects = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/projects');
      setProjects(response.data);
    } catch (error) {
      toast.error('Failed to fetch projects');
    } finally {
      setLoading(false);
    }
  };

  const fetchTeams = async () => {
    try {
      const response = await axios.get('/api/teams');
      setTeams(response.data);
    } catch (error) {
      toast.error('Failed to fetch teams');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.description || !formData.teamId || !formData.deadline) {
      toast.error('Please fill in all required fields');
      return;
    }

    setCreating(true);
    try {
      await axios.post('/api/projects', {
        ...formData,
        deadline: new Date(formData.deadline).toISOString()
      });
      
      toast.success('Project created successfully with auto-generated chat group');
      setShowModal(false);
      resetForm();
      fetchProjects();
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to create project';
      toast.error(message);
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (projectId: string) => {
    if (window.confirm('Are you sure you want to delete this project?')) {
      try {
        await axios.delete(`/api/projects/${projectId}`);
        toast.success('Project deleted successfully');
        fetchProjects();
      } catch (error: any) {
        const message = error.response?.data?.message || 'Failed to delete project';
        toast.error(message);
      }
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      teamId: '',
      members: [],
      priority: 'medium',
      deadline: ''
    });
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800 border-green-200';
      case 'in_progress': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'on_hold': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default: return 'bg-slate-100 text-slate-800 border-slate-200';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-800 border-red-200';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default: return 'bg-green-100 text-green-800 border-green-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="h-4 w-4" />;
      case 'in_progress': return <Clock className="h-4 w-4" />;
      case 'on_hold': return <AlertTriangle className="h-4 w-4" />;
      default: return <Target className="h-4 w-4" />;
    }
  };

  const isOverdue = (deadline: string) => {
    return new Date(deadline) < new Date() && new Date(deadline).toDateString() !== new Date().toDateString();
  };

  const getTaskStats = (tasks: any[]) => {
    const total = tasks.length;
    const completed = tasks.filter(t => t.status === 'completed').length;
    const inProgress = tasks.filter(t => t.status === 'in_progress').length;
    return { total, completed, inProgress };
  };

  const filteredProjects = projects.filter(project => {
    const matchesSearch = project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         project.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         project.team.name.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || project.status === statusFilter;
    const matchesPriority = priorityFilter === 'all' || project.priority === priorityFilter;
    
    return matchesSearch && matchesStatus && matchesPriority;
  });

  const selectedTeam = teams.find(team => team._id === formData.teamId);

  const getProjectStats = () => {
    const total = projects.length;
    const completed = projects.filter(p => p.status === 'completed').length;
    const inProgress = projects.filter(p => p.status === 'in_progress').length;
    const overdue = projects.filter(p => isOverdue(p.deadline) && p.status !== 'completed').length;
    
    return { total, completed, inProgress, overdue };
  };

  const projectStats = getProjectStats();

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
            <h1 className="text-3xl font-bold text-slate-900">Projects</h1>
            <p className="text-slate-600 mt-2">
              {user?.role === 'admin' 
                ? 'Manage and track all company projects' 
                : 'View your assigned projects and collaborate with your team'
              }
            </p>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="flex items-center bg-white rounded-lg border border-slate-200 shadow-sm">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded-l-lg transition-colors ${
                  viewMode === 'grid' 
                    ? 'bg-slate-100 text-slate-700' 
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <Grid className="h-4 w-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded-r-lg transition-colors ${
                  viewMode === 'list' 
                    ? 'bg-slate-100 text-slate-700' 
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <List className="h-4 w-4" />
              </button>
            </div>

            {user?.role === 'admin' && (
              <button
                onClick={() => {
                  resetForm();
                  setShowModal(true);
                }}
                className="bg-slate-600 hover:bg-slate-700 text-white px-6 py-3 rounded-lg flex items-center gap-2 transition-colors font-medium"
              >
                <Plus className="h-5 w-5" />
                Create Project
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600">Total Projects</p>
              <p className="text-3xl font-bold text-slate-900 mt-2">{projectStats.total}</p>
            </div>
            <FolderOpen className="h-8 w-8 text-slate-400" />
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600">Completed</p>
              <p className="text-3xl font-bold text-green-600 mt-2">{projectStats.completed}</p>
            </div>
            <CheckCircle className="h-8 w-8 text-green-400" />
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600">In Progress</p>
              <p className="text-3xl font-bold text-blue-600 mt-2">{projectStats.inProgress}</p>
            </div>
            <Clock className="h-8 w-8 text-blue-400" />
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600">Overdue</p>
              <p className="text-3xl font-bold text-red-600 mt-2">{projectStats.overdue}</p>
            </div>
            <AlertTriangle className="h-8 w-8 text-red-400" />
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-6 bg-white rounded-xl border border-slate-200 shadow-sm p-4">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-5 w-5 text-slate-400" />
              <input
                type="text"
                placeholder="Search projects..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-transparent transition-all"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-slate-500" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500 bg-white"
            >
              <option value="all">All Status</option>
              <option value="not_started">Not Started</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
              <option value="on_hold">On Hold</option>
            </select>
          </div>

          <div>
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500 bg-white"
            >
              <option value="all">All Priority</option>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
          </div>
        </div>
      </div>

      {/* Projects Grid/List */}
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProjects.map((project) => {
            const taskStats = getTaskStats(project.tasks);
            const completionRate = taskStats.total > 0 ? Math.round((taskStats.completed / taskStats.total) * 100) : 0;

            return (
              <div key={project._id} className="bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden">
                {/* Project Header */}
                <div className="p-6 pb-4">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="text-xl font-semibold text-slate-900">{project.name}</h3>
                        {isOverdue(project.deadline) && project.status !== 'completed' && (
                          <span className="px-2 py-1 bg-red-100 text-red-800 text-xs font-medium rounded-full">
                            OVERDUE
                          </span>
                        )}
                      </div>
                      <p className="text-slate-600 text-sm line-clamp-2 mb-3">{project.description}</p>
                      
                      <div className="flex items-center gap-2 mb-3">
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(project.status)}`}>
                          {getStatusIcon(project.status)}
                          {project.status.replace('_', ' ')}
                        </span>
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getPriorityColor(project.priority)}`}>
                          <Flag className="h-3 w-3 mr-1" />
                          {project.priority}
                        </span>
                      </div>
                    </div>
                    
                    {user?.role === 'admin' && (
                      <div className="flex items-center gap-1 ml-2">
                        <button
                          onClick={() => navigate(`/projects/${project._id}`)}
                          className="p-1.5 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(project._id)}
                          className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Team Info */}
                  <div className="mb-4">
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <Users className="h-4 w-4" />
                      <span className="font-medium">{project.team.name}</span>
                    </div>
                  </div>

                  {/* Task Stats */}
                  <div className="grid grid-cols-3 gap-4 mb-4">
                    <div className="text-center p-2 bg-slate-50 rounded-lg">
                      <div className="text-lg font-bold text-slate-900">{taskStats.total}</div>
                      <div className="text-xs text-slate-600">Total Tasks</div>
                    </div>
                    <div className="text-center p-2 bg-green-50 rounded-lg">
                      <div className="text-lg font-bold text-green-600">{taskStats.completed}</div>
                      <div className="text-xs text-slate-600">Completed</div>
                    </div>
                    <div className="text-center p-2 bg-blue-50 rounded-lg">
                      <div className="text-lg font-bold text-blue-600">{completionRate}%</div>
                      <div className="text-xs text-slate-600">Progress</div>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="mb-4">
                    <div className="flex justify-between text-sm text-slate-600 mb-1">
                      <span>Progress</span>
                      <span>{completionRate}%</span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-2">
                      <div 
                        className="bg-slate-600 h-2 rounded-full transition-all duration-300" 
                        style={{ width: `${completionRate}%` }}
                      ></div>
                    </div>
                  </div>

                  {/* Team Members */}
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-slate-700">Team Members</span>
                      <span className="text-xs text-slate-500">{project.members.length} members</span>
                    </div>
                    <div className="flex items-center gap-1">
                      {project.members.slice(0, 4).map((member, index) => (
                        <div
                          key={member._id}
                          className="h-8 w-8 rounded-full bg-slate-600 flex items-center justify-center text-white text-xs font-medium border-2 border-white"
                          style={{
                            marginLeft: index > 0 ? '-8px' : '0',
                            zIndex: 4 - index
                          }}
                          title={member.name}
                        >
                          {getInitials(member.name)}
                        </div>
                      ))}
                      {project.members.length > 4 && (
                        <div
                          className="h-8 w-8 rounded-full bg-slate-300 flex items-center justify-center text-slate-700 text-xs font-medium border-2 border-white"
                          style={{ marginLeft: '-8px' }}
                        >
                          +{project.members.length - 4}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Deadline */}
                  <div className="flex items-center justify-between text-sm text-slate-600 mb-4">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      <span>Due: {new Date(project.deadline).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="px-6 py-4 bg-slate-50 border-t border-slate-200">
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-slate-600">
                      Created by {project.createdBy.name}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => navigate(`/projects/${project._id}`)}
                        className="text-slate-600 hover:text-slate-800 p-1 rounded transition-colors"
                        title="View project chat"
                      >
                        <MessageSquare className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => navigate(`/projects/${project._id}`)}
                        className="bg-slate-600 hover:bg-slate-700 text-white px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
                      >
                        View Details
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* List View */
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left py-4 px-6 font-semibold text-slate-900">Project</th>
                  <th className="text-left py-4 px-6 font-semibold text-slate-900">Team</th>
                  <th className="text-left py-4 px-6 font-semibold text-slate-900">Status</th>
                  <th className="text-left py-4 px-6 font-semibold text-slate-900">Priority</th>
                  <th className="text-left py-4 px-6 font-semibold text-slate-900">Progress</th>
                  <th className="text-left py-4 px-6 font-semibold text-slate-900">Deadline</th>
                  <th className="text-left py-4 px-6 font-semibold text-slate-900">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredProjects.map((project) => {
                  const taskStats = getTaskStats(project.tasks);
                  const completionRate = taskStats.total > 0 ? Math.round((taskStats.completed / taskStats.total) * 100) : 0;

                  return (
                    <tr key={project._id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-4 px-6">
                        <div>
                          <h4 className="font-semibold text-slate-900">{project.name}</h4>
                          <p className="text-sm text-slate-600 line-clamp-1">{project.description}</p>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <span className="font-medium text-slate-900">{project.team.name}</span>
                      </td>
                      <td className="py-4 px-6">
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(project.status)}`}>
                          {getStatusIcon(project.status)}
                          {project.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="py-4 px-6">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getPriorityColor(project.priority)}`}>
                          {project.priority}
                        </span>
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-2">
                          <div className="w-16 bg-slate-200 rounded-full h-2">
                            <div 
                              className="bg-slate-600 h-2 rounded-full" 
                              style={{ width: `${completionRate}%` }}
                            ></div>
                          </div>
                          <span className="text-sm text-slate-600">{completionRate}%</span>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <div className="text-sm text-slate-600">
                          {new Date(project.deadline).toLocaleDateString()}
                          {isOverdue(project.deadline) && project.status !== 'completed' && (
                            <span className="block text-red-600 font-medium text-xs">Overdue</span>
                          )}
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => navigate(`/projects/${project._id}`)}
                            className="text-slate-600 hover:text-slate-800 p-1 rounded transition-colors"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          {user?.role === 'admin' && (
                            <button
                              onClick={() => handleDelete(project._id)}
                              className="text-red-600 hover:text-red-800 p-1 rounded transition-colors"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
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

      {filteredProjects.length === 0 && (
        <div className="text-center py-12 bg-white rounded-xl border border-slate-200 shadow-sm">
          <FolderOpen className="h-12 w-12 text-slate-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-slate-900 mb-2">No projects found</h3>
          <p className="text-slate-600 mb-4">
            {searchTerm || statusFilter !== 'all' || priorityFilter !== 'all'
              ? 'Try adjusting your search or filters.'
              : user?.role === 'admin' 
                ? 'Create your first project to get started.'
                : 'No projects have been assigned to you yet.'
            }
          </p>
        </div>
      )}

      {/* Create Project Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-200">
              <h2 className="text-xl font-semibold text-slate-900">Create New Project</h2>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Project Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500"
                  placeholder="Enter project name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Description *
                </label>
                <textarea
                  required
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500 resize-none"
                  rows={4}
                  placeholder="Describe the project goals and objectives"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Assign to Team *
                </label>
                <select
                  required
                  value={formData.teamId}
                  onChange={(e) => {
                    setFormData({ ...formData, teamId: e.target.value, members: [] });
                  }}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500"
                >
                  <option value="">Select a team</option>
                  {teams.map(team => (
                    <option key={team._id} value={team._id}>
                      {team.name} ({team.members.length} members)
                    </option>
                  ))}
                </select>
              </div>

              {selectedTeam && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Project Members (Optional)
                  </label>
                  <div className="border border-slate-300 rounded-lg p-4 max-h-48 overflow-y-auto">
                    {selectedTeam.members.length === 0 ? (
                      <p className="text-sm text-slate-500 italic">No team members available</p>
                    ) : (
                      <div className="space-y-2">
                        {selectedTeam.members.map(member => (
                          <label key={member._id} className="flex items-center gap-3 p-2 hover:bg-slate-50 rounded-lg cursor-pointer">
                            <input
                              type="checkbox"
                              checked={formData.members.includes(member._id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setFormData({
                                    ...formData,
                                    members: [...formData.members, member._id]
                                  });
                                } else {
                                  setFormData({
                                    ...formData,
                                    members: formData.members.filter(id => id !== member._id)
                                  });
                                }
                              }}
                              className="rounded border-slate-300 text-slate-600 focus:ring-slate-500"
                            />
                            <div className="h-8 w-8 rounded-full bg-slate-600 flex items-center justify-center text-white text-xs font-medium">
                              {getInitials(member.name)}
                            </div>
                            <div>
                              <p className="text-sm font-medium text-slate-900">{member.name}</p>
                              <p className="text-xs text-slate-500">{member.role.replace('_', ' ')}</p>
                            </div>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                  <p className="text-sm text-slate-500 mt-2">
                    {formData.members.length === 0 
                      ? 'If no members are selected, all team members will have access to the project.'
                      : `Selected ${formData.members.length} member${formData.members.length !== 1 ? 's' : ''}`
                    }
                  </p>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Priority
                  </label>
                  <select
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Deadline *
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.deadline}
                    onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500"
                    min={new Date().toISOString().split('T')[0]}
                  />
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <MessageSquare className="h-5 w-5 text-blue-600 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-blue-900">Auto Chat Group Creation</h4>
                    <p className="text-sm text-blue-700 mt-1">
                      A dedicated chat group will be automatically created for this project to facilitate team communication and collaboration.
                    </p>
                  </div>
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
                      Creating...
                    </>
                  ) : (
                    'Create Project'
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

export default Projects;