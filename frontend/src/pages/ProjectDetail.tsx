import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';
import ChatComponent from '../components/ChatComponent';
import CommentsSection from '../components/CommentsSection';
import TaskDelegationModal from '../components/TaskDelegationModal';
import { 
  ArrowLeft, 
  Calendar, 
  Users, 
  Target, 
  Loader2, 
  Plus,
  Eye,
  Edit,
  Trash2,
  Clock,
  AlertTriangle,
  CheckCircle,
  Flag,
  FolderOpen,
  MessageSquare,
  FileText,
  Crown,
  UserPlus,
  Share2
} from 'lucide-react';

interface Project {
  _id: string;
  name: string;
  description: string;
  team: {
    _id: string;
    name: string;
    leader: {
      _id: string;
      name: string;
    };
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
    description: string;
    assignedTo: {
      _id: string;
      name: string;
      email: string;
    };
    status: string;
    priority: string;
    deadline: string;
    createdAt: string;
  }>;
  status: string;
  priority: string;
  startDate: string;
  deadline: string;
  createdAt: string;
  chatRoom: string;
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

const ProjectDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [delegationModal, setDelegationModal] = useState<{
    visible: boolean;
    taskId: string;
    taskTitle: string;
    currentAssignee: string;
  }>({
    visible: false,
    taskId: '',
    taskTitle: '',
    currentAssignee: ''
  });

  const [taskForm, setTaskForm] = useState({
    title: '',
    description: '',
    assignedTo: '',
    priority: 'medium',
    deadline: ''
  });

  useEffect(() => {
    if (id) {
      fetchProject();
    }
  }, [id]);

  const fetchProject = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`/api/projects/${id}`);
      setProject(response.data);
    } catch (error: any) {
      toast.error('Failed to fetch project details');
      if (error.response?.status === 404) {
        navigate('/projects');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskForm.title || !taskForm.description || !taskForm.assignedTo || !taskForm.deadline) {
      toast.error('Please fill in all required fields');
      return;
    }

    setCreating(true);
    try {
      await axios.post('/api/tasks', {
        ...taskForm,
        projectId: id,
        deadline: new Date(taskForm.deadline).toISOString()
      });
      
      toast.success('Task created successfully');
      setShowTaskModal(false);
      resetTaskForm();
      fetchProject();
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to create task';
      toast.error(message);
    } finally {
      setCreating(false);
    }
  };

  const resetTaskForm = () => {
    setTaskForm({
      title: '',
      description: '',
      assignedTo: '',
      priority: 'medium',
      deadline: ''
    });
  };

  const handleStatusUpdate = async (taskId: string, newStatus: string) => {
    try {
      await axios.put(`/api/tasks/${taskId}/status`, { status: newStatus });
      toast.success('Task status updated');
      fetchProject();
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
        fetchProject();
      } catch (error: any) {
        const message = error.response?.data?.message || 'Failed to delete task';
        toast.error(message);
      }
    }
  };

  const handleDelegateTask = (taskId: string, taskTitle: string, currentAssignee: string) => {
    setDelegationModal({
      visible: true,
      taskId,
      taskTitle,
      currentAssignee
    });
  };

  const getInitials = (name: string) => {
    if (!name || typeof name !== 'string') return '';
    return name.split(' ').filter(n => n && n.length > 0).map(n => n[0]).join('').toUpperCase().slice(0, 2);
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
      case 'testing': return <Target className="h-4 w-4" />;
      default: return <AlertTriangle className="h-4 w-4" />;
    }
  };

  const isOverdue = (deadline: string) => {
    return new Date(deadline) < new Date() && new Date(deadline).toDateString() !== new Date().toDateString();
  };

  const getTaskStats = () => {
    if (!project) return { total: 0, completed: 0, inProgress: 0, overdue: 0 };
    
    const total = project.tasks.length;
    const completed = project.tasks.filter(t => t.status === 'completed').length;
    const inProgress = project.tasks.filter(t => t.status === 'in_progress').length;
    const overdue = project.tasks.filter(t => isOverdue(t.deadline) && t.status !== 'completed').length;
    
    return { total, completed, inProgress, overdue };
  };

  const tabs = [
    { id: 'overview', label: 'Overview', icon: Target },
    { id: 'tasks', label: 'Tasks', icon: CheckCircle },
    { id: 'chat', label: 'Team Chat', icon: MessageSquare },
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

  if (!project) {
    return (
      <div className="p-6">
        <div className="text-center py-12 bg-white rounded-xl border border-slate-200">
          <h3 className="text-lg font-medium text-slate-900 mb-2">Project not found</h3>
          <p className="text-slate-600 mb-4">The project you're looking for doesn't exist or you don't have access to it.</p>
          <button
            onClick={() => navigate('/projects')}
            className="bg-slate-600 hover:bg-slate-700 text-white px-4 py-2 rounded-lg transition-colors"
          >
            Back to Projects
          </button>
        </div>
      </div>
    );
  }

  const taskStats = getTaskStats();
  const completionRate = taskStats.total > 0 ? Math.round((taskStats.completed / taskStats.total) * 100) : 0;

  return (
    <div className="p-6 bg-slate-50 min-h-screen">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-4 mb-4">
          <button
            onClick={() => navigate('/projects')}
            className="p-2 hover:bg-white rounded-lg border border-slate-200 transition-colors"
          >
            <ArrowLeft className="h-5 w-5 text-slate-600" />
          </button>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <h1 className="text-3xl font-bold text-slate-900">{project.name}</h1>
              {isOverdue(project.deadline) && project.status !== 'completed' && (
                <span className="px-2 py-1 bg-red-100 text-red-800 text-xs font-medium rounded-full">
                  OVERDUE
                </span>
              )}
            </div>
            <p className="text-slate-600">{project.description}</p>
          </div>
        </div>

        {/* Project Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg border border-slate-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">Total Tasks</p>
                <p className="text-2xl font-bold text-slate-900 mt-1">{taskStats.total}</p>
              </div>
              <Target className="h-8 w-8 text-slate-400" />
            </div>
          </div>

          <div className="bg-white rounded-lg border border-slate-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">Completed</p>
                <p className="text-2xl font-bold text-green-600 mt-1">{taskStats.completed}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-400" />
            </div>
          </div>

          <div className="bg-white rounded-lg border border-slate-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">In Progress</p>
                <p className="text-2xl font-bold text-blue-600 mt-1">{taskStats.inProgress}</p>
              </div>
              <Clock className="h-8 w-8 text-blue-400" />
            </div>
          </div>

          <div className="bg-white rounded-lg border border-slate-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">Progress</p>
                <p className="text-2xl font-bold text-purple-600 mt-1">{completionRate}%</p>
              </div>
              <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center">
                <div className="w-4 h-4 rounded-full bg-purple-600" style={{ 
                  background: `conic-gradient(#7c3aed ${completionRate * 3.6}deg, #e5e7eb 0deg)` 
                }}></div>
              </div>
            </div>
          </div>
        </div>
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
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Project Information */}
                <div className="lg:col-span-2 space-y-6">
                  <div className="bg-slate-50 rounded-xl p-6">
                    <h3 className="text-lg font-semibold text-slate-900 mb-4">Project Details</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <h4 className="font-medium text-slate-900 mb-3">Status & Priority</h4>
                        <div className="space-y-3">
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-slate-600">Status:</span>
                            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(project.status)}`}>
                              {getStatusIcon(project.status)}
                              {project.status.replace('_', ' ')}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-slate-600">Priority:</span>
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getPriorityColor(project.priority)}`}>
                              <Flag className="h-3 w-3 mr-1" />
                              {project.priority}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div>
                        <h4 className="font-medium text-slate-900 mb-3">Timeline</h4>
                        <div className="space-y-3">
                          <div className="flex items-center gap-2 text-sm">
                            <Calendar className="h-4 w-4 text-slate-500" />
                            <span className="text-slate-600">Started:</span>
                            <span className="font-medium text-slate-900">
                              {new Date(project.startDate).toLocaleDateString()}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-sm">
                            <Calendar className="h-4 w-4 text-slate-500" />
                            <span className="text-slate-600">Deadline:</span>
                            <span className={`font-medium ${isOverdue(project.deadline) && project.status !== 'completed' ? 'text-red-600' : 'text-slate-900'}`}>
                              {new Date(project.deadline).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-slate-50 rounded-xl p-6">
                    <h3 className="text-lg font-semibold text-slate-900 mb-4">Team Information</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <h4 className="font-medium text-slate-900 mb-3">Team & Leadership</h4>
                        <div className="space-y-3">
                          <div className="flex items-center gap-2 text-sm">
                            <Users className="h-4 w-4 text-slate-500" />
                            <span className="text-slate-600">Team:</span>
                            <span className="font-medium text-slate-900">{project.team.name}</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <Crown className="h-4 w-4 text-yellow-500" />
                            <div className="h-8 w-8 rounded-full bg-slate-600 flex items-center justify-center text-white text-xs font-medium">
                              {getInitials(project.team.leader.name)}
                            </div>
                            <div>
                              <p className="text-sm font-medium text-slate-900">{project.team.leader.name}</p>
                              <p className="text-xs text-slate-500">Team Leader</p>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div>
                        <h4 className="font-medium text-slate-900 mb-3">Project Creator</h4>
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-full bg-slate-600 flex items-center justify-center text-white text-xs font-medium">
                            {getInitials(project.createdBy.name)}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-slate-900">{project.createdBy.name}</p>
                            <p className="text-xs text-slate-500">{project.createdBy.email}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Project Members */}
                <div className="bg-slate-50 rounded-xl p-6">
                  <h3 className="text-lg font-semibold text-slate-900 mb-4">Project Members</h3>
                  <div className="space-y-3">
                    {project.members.map((member) => (
                      <div key={member._id} className="flex items-center gap-3 p-3 bg-white rounded-lg">
                        <div className="h-10 w-10 rounded-full bg-slate-600 flex items-center justify-center text-white text-sm font-medium">
                          {getInitials(member.name)}
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-slate-900">{member.name}</p>
                          <p className="text-sm text-slate-600">{member.role.replace('_', ' ')}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Tasks Tab */}
          {activeTab === 'tasks' && (
            <div>
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-slate-900">Project Tasks</h3>
                {user?.role === 'admin' && (
                  <button
                    onClick={() => setShowTaskModal(true)}
                    className="bg-slate-600 hover:bg-slate-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
                  >
                    <Plus className="h-4 w-4" />
                    Create Task
                  </button>
                )}
              </div>

              {project.tasks.length === 0 ? (
                <div className="text-center py-12 bg-slate-50 rounded-xl border border-slate-200">
                  <Target className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-slate-900 mb-2">No tasks created yet</h3>
                  <p className="text-slate-600 mb-4">
                    {user?.role === 'admin' 
                      ? 'Create the first task to get started with this project.'
                      : 'Tasks will appear here once they are created by the project admin.'
                    }
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {project.tasks.map((task) => {
                    const canUpdateStatus = user?.role === 'admin' || task.assignedTo._id === user?.id;
                    const canDelegate = task.assignedTo._id === user?.id && task.status !== 'completed';

                    return (
                      <div key={task._id} className="bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden">
                        <div className="p-6 pb-4">
                          <div className="flex items-start justify-between mb-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <h4 className="text-lg font-semibold text-slate-900">{task.title}</h4>
                                {isOverdue(task.deadline) && task.status !== 'completed' && (
                                  <span className="px-2 py-1 bg-red-100 text-red-800 text-xs font-medium rounded-full">
                                    OVERDUE
                                  </span>
                                )}
                              </div>
                              <p className="text-slate-600 text-sm line-clamp-2 mb-3">{task.description}</p>
                              
                              <div className="flex items-center gap-2 mb-3">
                                <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(task.status)}`}>
                                  {getStatusIcon(task.status)}
                                  {task.status.replace('_', ' ')}
                                </span>
                                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getPriorityColor(task.priority)}`}>
                                  {task.priority}
                                </span>
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-1 ml-2">
                              <button
                                onClick={() => navigate(`/tasks/${task._id}`)}
                                className="p-1.5 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                              >
                                <Eye className="h-4 w-4" />
                              </button>
                              {user?.role === 'admin' && (
                                <button
                                  onClick={() => handleDeleteTask(task._id)}
                                  className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              )}
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
                          <div className="flex items-center text-sm text-slate-600 mb-4">
                            <Calendar className="h-4 w-4 mr-1" />
                            <span>Due: {new Date(task.deadline).toLocaleDateString()}</span>
                          </div>
                        </div>

                        {/* Task Actions */}
                        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              {canUpdateStatus && task.status !== 'completed' && (
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
                              
                              {canDelegate && (
                                <button
                                  onClick={() => handleDelegateTask(task._id, task.title, task.assignedTo._id)}
                                  className="text-xs px-2 py-1 text-slate-600 hover:text-slate-800 border border-slate-300 rounded hover:bg-slate-100 transition-colors flex items-center gap-1"
                                >
                                  <Share2 className="h-3 w-3" />
                                  Delegate
                                </button>
                              )}
                            </div>
                            
                            <button
                              onClick={() => navigate(`/tasks/${task._id}`)}
                              className="text-xs px-3 py-1 bg-slate-600 text-white rounded hover:bg-slate-700 transition-colors"
                            >
                              View Details
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Chat Tab */}
          {activeTab === 'chat' && (
            <div>
              <h3 className="text-lg font-semibold text-slate-900 mb-4">Project Team Chat</h3>
              <div className="bg-slate-50 rounded-lg border border-slate-200 h-96">
                <ChatComponent 
                  projectId={project._id} 
                  chatRoom={project.chatRoom}
                />
              </div>
            </div>
          )}

          {/* Comments Tab */}
          {activeTab === 'comments' && (
            <div>
              <h3 className="text-lg font-semibold text-slate-900 mb-4">Project Comments</h3>
              <CommentsSection 
                type="project"
                itemId={project._id}
                comments={project.comments}
                onUpdate={fetchProject}
              />
            </div>
          )}
        </div>
      </div>

      {/* Create Task Modal */}
      {showTaskModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-200">
              <h2 className="text-xl font-semibold text-slate-900">Create New Task</h2>
            </div>
            
            <form onSubmit={handleCreateTask} className="p-6 space-y-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Task Title *
                </label>
                <input
                  type="text"
                  required
                  value={taskForm.title}
                  onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500"
                  placeholder="Enter task title"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Description *
                </label>
                <textarea
                  required
                  value={taskForm.description}
                  onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500 resize-none"
                  rows={3}
                  placeholder="Describe the task requirements"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Assign to *
                </label>
                <select
                  required
                  value={taskForm.assignedTo}
                  onChange={(e) => setTaskForm({ ...taskForm, assignedTo: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500"
                >
                  <option value="">Select team member</option>
                  {project.members.map(member => (
                    <option key={member._id} value={member._id}>
                      {member.name} ({member.role.replace('_', ' ')})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Priority
                  </label>
                  <select
                    value={taskForm.priority}
                    onChange={(e) => setTaskForm({ ...taskForm, priority: e.target.value })}
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
                    value={taskForm.deadline}
                    onChange={(e) => setTaskForm({ ...taskForm, deadline: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500"
                    min={new Date().toISOString().split('T')[0]}
                  />
                </div>
              </div>

              <div className="flex gap-4 pt-6 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => {
                    setShowTaskModal(false);
                    resetTaskForm();
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
                    'Create Task'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Task Delegation Modal */}
      <TaskDelegationModal
        visible={delegationModal.visible}
        onHide={() => setDelegationModal({ ...delegationModal, visible: false })}
        taskId={delegationModal.taskId}
        taskTitle={delegationModal.taskTitle}
        currentAssignee={delegationModal.currentAssignee}
        projectId={project._id}
        onDelegationSent={fetchProject}
      />
    </div>
  );
};

export default ProjectDetail;