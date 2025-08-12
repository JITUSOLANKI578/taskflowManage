import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';
import CommentsSection from '../components/CommentsSection';
import ChatComponent from '../components/ChatComponent';
import { 
  ArrowLeft, 
  Calendar, 
  User, 
  CheckSquare, 
  Loader2, 
  Edit,
  Trash2,
  Clock,
  AlertTriangle,
  CheckCircle,
  FolderOpen,
  MessageSquare,
  FileText,
  Flag,
  Target,
  Save,
  X
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
      email: string;
    };
    content: string;
    createdAt: string;
    isEdited?: boolean;
    editedAt?: string;
  }>;
}

const TaskDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [task, setTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    title: '',
    description: '',
    priority: '',
    deadline: ''
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (id) {
      fetchTask();
    }
  }, [id]);

  const fetchTask = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`/api/tasks/${id}`);
      setTask(response.data);
      setEditForm({
        title: response.data.title,
        description: response.data.description,
        priority: response.data.priority,
        deadline: new Date(response.data.deadline).toISOString().split('T')[0]
      });
    } catch (error: any) {
      toast.error('Failed to fetch task details');
      if (error.response?.status === 404) {
        navigate('/tasks');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (newStatus: string) => {
    try {
      await axios.put(`/api/tasks/${id}/status`, { status: newStatus });
      toast.success('Task status updated');
      fetchTask();
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to update task status';
      toast.error(message);
    }
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      await axios.put(`/api/tasks/${id}`, editForm);
      toast.success('Task updated successfully');
      setEditing(false);
      fetchTask();
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to update task';
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (window.confirm('Are you sure you want to delete this task?')) {
      try {
        await axios.delete(`/api/tasks/${id}`);
        toast.success('Task deleted successfully');
        navigate('/tasks');
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

  const tabs = [
    { id: 'overview', label: 'Overview', icon: Target },
    { id: 'chat', label: 'Task Chat', icon: MessageSquare },
    { id: 'comments', label: 'Comments', icon: FileText }
  ];

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-slate-600" />
        </div>
      </div>
    );
  }

  if (!task) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <h3 className="text-lg font-medium text-slate-900 mb-2">Task not found</h3>
          <p className="text-slate-600 mb-4">The task you're looking for doesn't exist or you don't have access to it.</p>
          <button
            onClick={() => navigate('/tasks')}
            className="bg-slate-600 hover:bg-slate-700 text-white px-4 py-2 rounded-lg transition-colors"
          >
            Back to Tasks
          </button>
        </div>
      </div>
    );
  }

  const canEdit = user?.role === 'admin' || task.assignedTo._id === user?.id;

  return (
    <div className="p-6 bg-slate-50 min-h-screen">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-4 mb-4">
          <button
            onClick={() => navigate('/tasks')}
            className="p-2 hover:bg-white rounded-lg border border-slate-200 transition-colors"
          >
            <ArrowLeft className="h-5 w-5 text-slate-600" />
          </button>
          <div className="flex-1">
            {editing ? (
              <form onSubmit={handleEdit} className="space-y-4">
                <input
                  type="text"
                  value={editForm.title}
                  onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                  className="text-3xl font-bold text-slate-900 bg-transparent border-b-2 border-slate-300 focus:border-slate-600 outline-none w-full"
                  required
                />
                <textarea
                  value={editForm.description}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                  className="text-slate-600 bg-transparent border border-slate-300 rounded-lg p-2 w-full resize-none"
                  rows={2}
                  required
                />
                <div className="flex items-center gap-4">
                  <select
                    value={editForm.priority}
                    onChange={(e) => setEditForm({ ...editForm, priority: e.target.value })}
                    className="px-3 py-1 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                  <input
                    type="date"
                    value={editForm.deadline}
                    onChange={(e) => setEditForm({ ...editForm, deadline: e.target.value })}
                    className="px-3 py-1 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500"
                    required
                  />
                  <div className="flex items-center gap-2">
                    <button
                      type="submit"
                      disabled={saving}
                      className="bg-slate-600 hover:bg-slate-700 text-white px-3 py-1 rounded-lg transition-colors flex items-center gap-1"
                    >
                      {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                      Save
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditing(false)}
                      className="text-slate-600 hover:text-slate-800 px-3 py-1 rounded-lg transition-colors flex items-center gap-1"
                    >
                      <X className="h-4 w-4" />
                      Cancel
                    </button>
                  </div>
                </div>
              </form>
            ) : (
              <>
                <div className="flex items-start justify-between">
                  <div>
                    <h1 className="text-3xl font-bold text-slate-900">{task.title}</h1>
                    <p className="text-slate-600 mt-1">{task.description}</p>
                  </div>
                  {canEdit && (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setEditing(true)}
                        className="p-2 text-slate-600 hover:text-slate-800 hover:bg-white rounded-lg border border-slate-200 transition-colors"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      {user?.role === 'admin' && (
                        <button
                          onClick={handleDelete}
                          className="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg border border-red-200 transition-colors"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Task Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg border border-slate-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">Status</p>
                <div className="mt-1">
                  <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(task.status)}`}>
                    {getStatusIcon(task.status)}
                    {task.status.replace('_', ' ')}
                  </span>
                </div>
              </div>
              <Target className="h-8 w-8 text-slate-400" />
            </div>
          </div>

          <div className="bg-white rounded-lg border border-slate-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">Priority</p>
                <div className="mt-1">
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getPriorityColor(task.priority)}`}>
                    {task.priority}
                  </span>
                </div>
              </div>
              <Flag className="h-8 w-8 text-slate-400" />
            </div>
          </div>

          <div className="bg-white rounded-lg border border-slate-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">Project</p>
                <p className="text-sm font-semibold text-slate-900 mt-1">{task.project.name}</p>
              </div>
              <FolderOpen className="h-8 w-8 text-slate-400" />
            </div>
          </div>

          <div className="bg-white rounded-lg border border-slate-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">Deadline</p>
                <p className="text-sm font-semibold text-slate-900 mt-1">
                  {new Date(task.deadline).toLocaleDateString()}
                </p>
                {isOverdue(task.deadline) && task.status !== 'completed' && (
                  <p className="text-xs text-red-600 font-medium">Overdue</p>
                )}
              </div>
              <Calendar className="h-8 w-8 text-slate-400" />
            </div>
          </div>
        </div>

        {/* Status Update */}
        {canEdit && task.status !== 'completed' && (
          <div className="bg-white rounded-lg border border-slate-200 p-4 mb-6">
            <div className="flex items-center gap-4">
              <span className="text-sm font-medium text-slate-700">Update Status:</span>
              <select
                value={task.status}
                onChange={(e) => handleStatusUpdate(e.target.value)}
                className="px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500 bg-white"
              >
                <option value="todo">To Do</option>
                <option value="in_progress">In Progress</option>
                <option value="testing">Testing</option>
                <option value="completed">Completed</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm">
        <div className="border-b border-slate-200">
          <nav className="flex space-x-8 px-6">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-slate-600 text-slate-900'
                    : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                }`}
              >
                <tab.icon className="h-4 w-4" />
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Task Information */}
              <div>
                <h3 className="text-lg font-semibold text-slate-900 mb-4">Task Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-slate-50 rounded-lg p-4">
                    <h4 className="font-medium text-slate-900 mb-3">Assignment</h4>
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-slate-600 flex items-center justify-center text-white text-sm font-medium">
                          {getInitials(task.assignedTo.name)}
                        </div>
                        <div>
                          <p className="font-medium text-slate-900">{task.assignedTo.name}</p>
                          <p className="text-sm text-slate-600">{task.assignedTo.email}</p>
                          <p className="text-xs text-slate-500">Assigned to</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-slate-50 rounded-lg p-4">
                    <h4 className="font-medium text-slate-900 mb-3">Created By</h4>
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-slate-600 flex items-center justify-center text-white text-sm font-medium">
                          {getInitials(task.createdBy.name)}
                        </div>
                        <div>
                          <p className="font-medium text-slate-900">{task.createdBy.name}</p>
                          <p className="text-sm text-slate-600">{task.createdBy.email}</p>
                          <p className="text-xs text-slate-500">Task creator</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Timeline */}
              <div>
                <h3 className="text-lg font-semibold text-slate-900 mb-4">Timeline</h3>
                <div className="bg-slate-50 rounded-lg p-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-600">Created:</span>
                      <span className="font-medium text-slate-900">
                        {new Date(task.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-600">Deadline:</span>
                      <span className={`font-medium ${isOverdue(task.deadline) && task.status !== 'completed' ? 'text-red-600' : 'text-slate-900'}`}>
                        {new Date(task.deadline).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-600">Days remaining:</span>
                      <span className="font-medium text-slate-900">
                        {Math.ceil((new Date(task.deadline).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))} days
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Chat Tab */}
          {activeTab === 'chat' && (
            <div>
              <h3 className="text-lg font-semibold text-slate-900 mb-4">Task Discussion</h3>
              <div className="bg-slate-50 rounded-lg border border-slate-200 h-96">
                <ChatComponent 
                  projectId={task.project._id} 
                  taskId={task._id}
                />
              </div>
            </div>
          )}

          {/* Comments Tab */}
          {activeTab === 'comments' && (
            <div>
              <h3 className="text-lg font-semibold text-slate-900 mb-4">Task Comments</h3>
              <CommentsSection 
                type="task"
                itemId={task._id}
                comments={task.comments}
                onUpdate={fetchTask}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TaskDetail;