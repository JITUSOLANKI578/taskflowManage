import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';
import DelegationRequestsPanel from '../components/DelegationRequestsPanel';
import { 
  Plus, 
  Search, 
  Calendar, 
  User, 
  CheckSquare, 
  Loader2, 
  Clock,
  AlertTriangle,
  CheckCircle,
  Filter,
  Grid,
  List,
  Eye,
  Edit,
  Trash2,
  Flag,
  FolderOpen
} from 'lucide-react';

interface Task {
  _id: string;
  title: string;
  description: string;
  project: {
    _id: string;
    name: string;
  };
  assignedTo: {
    _id: string;
    name: string;
    email: string;
  };
  createdBy: {
    _id: string;
    name: string;
    email: string;
  };
  status: string;
  priority: string;
  deadline: string;
  createdAt: string;
  comments: Array<{
    _id: string;
    user: {
      _id: string;
      name: string;
    };
    content: string;
    createdAt: string;
  }>;
}

const Tasks: React.FC = () => {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  useEffect(() => {
    fetchTasks();
  }, []);

  const fetchTasks = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/tasks');
      setTasks(response.data);
    } catch (error) {
      toast.error('Failed to fetch tasks');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (taskId: string, newStatus: string) => {
    try {
      await axios.put(`/api/tasks/${taskId}/status`, { status: newStatus });
      toast.success('Task status updated');
      fetchTasks();
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to update task status';
      toast.error(message);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (window.confirm('Are you sure you want to delete this task?')) {
      try {
        await axios.delete(`/api/tasks/${taskId}`);
        toast.success('Task deleted successfully');
        fetchTasks();
      } catch (error: any) {
        const message = error.response?.data?.message || 'Failed to delete task';
        toast.error(message);
      }
    }
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800 border-green-200';
      case 'in_progress': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'testing': return 'bg-purple-100 text-purple-800 border-purple-200';
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
      case 'testing': return <CheckSquare className="h-4 w-4" />;
      default: return <AlertTriangle className="h-4 w-4" />;
    }
  };

  const isOverdue = (deadline: string) => {
    return new Date(deadline) < new Date() && new Date(deadline).toDateString() !== new Date().toDateString();
  };

  const filteredTasks = tasks.filter(task => {
    const matchesSearch = task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         task.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         task.project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         task.assignedTo.name.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || task.status === statusFilter;
    const matchesPriority = priorityFilter === 'all' || task.priority === priorityFilter;
    
    return matchesSearch && matchesStatus && matchesPriority;
  });

  const getTaskStats = () => {
    const total = tasks.length;
    const completed = tasks.filter(t => t.status === 'completed').length;
    const inProgress = tasks.filter(t => t.status === 'in_progress').length;
    const overdue = tasks.filter(t => isOverdue(t.deadline) && t.status !== 'completed').length;
    
    return { total, completed, inProgress, overdue };
  };

  const taskStats = getTaskStats();

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
        {/* Show delegation requests for non-admin users */}
        {user?.role !== 'admin' && user?.role !== 'masteradmin' && (
          <DelegationRequestsPanel />
        )}
        
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">
              {user?.role === 'admin' ? 'All Tasks' : 'My Tasks'}
            </h1>
            <p className="text-slate-600 mt-2">
              {user?.role === 'admin' 
                ? 'Manage and track all tasks across projects' 
                : 'View and update your assigned tasks'
              }
            </p>
          </div>
          
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
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600">Total Tasks</p>
              <p className="text-3xl font-bold text-slate-900 mt-2">{taskStats.total}</p>
            </div>
            <CheckSquare className="h-8 w-8 text-slate-400" />
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600">Completed</p>
              <p className="text-3xl font-bold text-green-600 mt-2">{taskStats.completed}</p>
            </div>
            <CheckCircle className="h-8 w-8 text-green-400" />
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600">In Progress</p>
              <p className="text-3xl font-bold text-blue-600 mt-2">{taskStats.inProgress}</p>
            </div>
            <Clock className="h-8 w-8 text-blue-400" />
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600">Overdue</p>
              <p className="text-3xl font-bold text-red-600 mt-2">{taskStats.overdue}</p>
            </div>
            <AlertTriangle className="h-8 w-8 text-red-400" />
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-6 bg-white rounded-xl border border-slate-200 shadow-sm p-4">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Search */}
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-5 w-5 text-slate-400" />
              <input
                type="text"
                placeholder="Search tasks..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-transparent transition-all"
              />
            </div>
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-slate-500" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500 bg-white"
            >
              <option value="all">All Status</option>
              <option value="todo">To Do</option>
              <option value="in_progress">In Progress</option>
              <option value="testing">Testing</option>
              <option value="completed">Completed</option>
            </select>
          </div>

          {/* Priority Filter */}
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

      {/* Tasks Grid/List */}
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTasks.map((task) => (
            <div key={task._id} className="bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden">
              {/* Task Header */}
              <div className="p-6 pb-4">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-slate-900 mb-2 line-clamp-2">
                      {task.title}
                    </h3>
                    <p className="text-sm text-slate-600 line-clamp-2 mb-3">
                      {task.description}
                    </p>
                  </div>
                  
                  {(user?.role === 'admin' || task.assignedTo._id === user?.id) && (
                    <div className="flex items-center gap-1 ml-2">
                      <Link
                        to={`/tasks/${task._id}`}
                        className="p-1.5 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                      >
                        <Eye className="h-4 w-4" />
                      </Link>
                      {user?.role === 'admin' && (
                        <button
                          onClick={() => handleDeleteTask(task._id)}
                          className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* Status and Priority */}
                <div className="flex items-center gap-2 mb-4">
                  <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(task.status)}`}>
                    {getStatusIcon(task.status)}
                    {task.status.replace('_', ' ')}
                  </span>
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getPriorityColor(task.priority)}`}>
                    <Flag className="h-3 w-3 mr-1" />
                    {task.priority}
                  </span>
                </div>

                {/* Project */}
                <div className="mb-4">
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <FolderOpen className="h-4 w-4" />
                    <span className="font-medium">{task.project.name}</span>
                  </div>
                </div>

                {/* Assigned To */}
                <div className="mb-4">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-slate-600 flex items-center justify-center text-white text-xs font-medium">
                      {getInitials(task.assignedTo.name)}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-900">{task.assignedTo.name}</p>
                      <p className="text-xs text-slate-500">Assigned to</p>
                    </div>
                  </div>
                </div>

                {/* Deadline */}
                <div className="flex items-center justify-between text-sm text-slate-600 mb-4">
                  <div className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    <span>Due: {new Date(task.deadline).toLocaleDateString()}</span>
                  </div>
                  {isOverdue(task.deadline) && task.status !== 'completed' && (
                    <span className="text-red-600 font-medium text-xs">Overdue</span>
                  )}
                </div>

                {/* Comments Count */}
                <div className="flex items-center text-xs text-slate-500">
                  <span>{task.comments.length} comment{task.comments.length !== 1 ? 's' : ''}</span>
                </div>
              </div>

              {/* Task Actions */}
              {(user?.role === 'admin' || task.assignedTo._id === user?.id) && task.status !== 'completed' && (
                <div className="px-6 py-4 bg-slate-50 border-t border-slate-200">
                  <select
                    value={task.status}
                    onChange={(e) => handleStatusUpdate(task._id, e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500 bg-white"
                  >
                    <option value="todo">To Do</option>
                    <option value="in_progress">In Progress</option>
                    <option value="testing">Testing</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        /* List View */
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left py-4 px-6 font-semibold text-slate-900">Task</th>
                  <th className="text-left py-4 px-6 font-semibold text-slate-900">Project</th>
                  <th className="text-left py-4 px-6 font-semibold text-slate-900">Assigned To</th>
                  <th className="text-left py-4 px-6 font-semibold text-slate-900">Status</th>
                  <th className="text-left py-4 px-6 font-semibold text-slate-900">Priority</th>
                  <th className="text-left py-4 px-6 font-semibold text-slate-900">Deadline</th>
                  <th className="text-left py-4 px-6 font-semibold text-slate-900">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredTasks.map((task) => (
                  <tr key={task._id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-4 px-6">
                      <div>
                        <h4 className="font-semibold text-slate-900">{task.title}</h4>
                        <p className="text-sm text-slate-600 line-clamp-1">{task.description}</p>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <span className="font-medium text-slate-900">{task.project.name}</span>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        <div className="h-6 w-6 rounded-full bg-slate-600 flex items-center justify-center text-white text-xs font-medium">
                          {getInitials(task.assignedTo.name)}
                        </div>
                        <span className="text-sm text-slate-900">{task.assignedTo.name}</span>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(task.status)}`}>
                        {getStatusIcon(task.status)}
                        {task.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getPriorityColor(task.priority)}`}>
                        {task.priority}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      <div className="text-sm text-slate-600">
                        {new Date(task.deadline).toLocaleDateString()}
                        {isOverdue(task.deadline) && task.status !== 'completed' && (
                          <span className="block text-red-600 font-medium text-xs">Overdue</span>
                        )}
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-2">
                        <Link
                          to={`/tasks/${task._id}`}
                          className="text-slate-600 hover:text-slate-800 p-1 rounded transition-colors"
                        >
                          <Eye className="h-4 w-4" />
                        </Link>
                        {(user?.role === 'admin' || task.assignedTo._id === user?.id) && task.status !== 'completed' && (
                          <select
                            value={task.status}
                            onChange={(e) => handleStatusUpdate(task._id, e.target.value)}
                            className="text-xs px-2 py-1 border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-slate-500"
                          >
                            <option value="todo">To Do</option>
                            <option value="in_progress">In Progress</option>
                            <option value="testing">Testing</option>
                            <option value="completed">Completed</option>
                          </select>
                        )}
                        {user?.role === 'admin' && (
                          <button
                            onClick={() => handleDeleteTask(task._id)}
                            className="text-red-600 hover:text-red-800 p-1 rounded transition-colors"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {filteredTasks.length === 0 && (
        <div className="text-center py-12 bg-white rounded-xl border border-slate-200 shadow-sm">
          <CheckSquare className="h-12 w-12 text-slate-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-slate-900 mb-2">No tasks found</h3>
          <p className="text-slate-600 mb-4">
            {searchTerm || statusFilter !== 'all' || priorityFilter !== 'all'
              ? 'Try adjusting your search or filters.'
              : user?.role === 'admin' 
                ? 'Tasks will appear here once they are created in projects.'
                : 'No tasks have been assigned to you yet.'
            }
          </p>
        </div>
      )}
    </div>
  );
};

export default Tasks;