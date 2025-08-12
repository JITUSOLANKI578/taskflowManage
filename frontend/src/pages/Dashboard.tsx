import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';
import { 
  Building2, 
  Users, 
  FolderOpen, 
  CheckSquare, 
  TrendingUp,
  Clock,
  AlertTriangle,
  CheckCircle
} from 'lucide-react';

interface DashboardStats {
  companies?: number;
  users?: number;
  teams?: number;
  projects?: number;
  tasks?: number;
  completedTasks?: number;
  overdueTasks?: number;
  upcomingDeadlines?: number;
}

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        
        if (user?.role === 'masteradmin') {
          const [companiesRes] = await Promise.all([
            axios.get('/api/companies')
          ]);
          setStats({
            companies: companiesRes.data.length
          });
        } else {
          const [projectsRes, tasksRes, usersRes, teamsRes] = await Promise.all([
            axios.get('/api/projects'),
            axios.get('/api/tasks'),
            user?.role === 'admin' ? axios.get('/api/users') : Promise.resolve({ data: [] }),
            user?.role === 'admin' ? axios.get('/api/teams') : Promise.resolve({ data: [] })
          ]);
          
          const completedTasks = tasksRes.data.filter((task: any) => task.status === 'completed').length;
          const overdueTasks = tasksRes.data.filter((task: any) => 
            new Date(task.deadline) < new Date() && task.status !== 'completed'
          ).length;
          const upcomingDeadlines = tasksRes.data.filter((task: any) => {
            const deadline = new Date(task.deadline);
            const now = new Date();
            const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
            return deadline >= now && deadline <= threeDaysFromNow && task.status !== 'completed';
          }).length;

          setStats({
            projects: projectsRes.data.length,
            tasks: tasksRes.data.length,
            completedTasks,
            overdueTasks,
            upcomingDeadlines,
            users: usersRes.data.length,
            teams: teamsRes.data.length
          });
        }
      } catch (error) {
        console.error('Error fetching stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [user]);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const getStatsCards = () => {
    if (user?.role === 'masteradmin') {
      return [
        {
          title: 'Companies',
          value: stats.companies || 0,
          icon: Building2,
          color: 'bg-blue-500',
          bgColor: 'bg-blue-50'
        }
      ];
    }

    const baseCards = [
      {
        title: 'Projects',
        value: stats.projects || 0,
        icon: FolderOpen,
        color: 'bg-slate-500',
        bgColor: 'bg-slate-50'
      },
      {
        title: 'Tasks',
        value: stats.tasks || 0,
        icon: CheckSquare,
        color: 'bg-indigo-500',
        bgColor: 'bg-indigo-50'
      },
      {
        title: 'Completed',
        value: stats.completedTasks || 0,
        icon: CheckCircle,
        color: 'bg-green-500',
        bgColor: 'bg-green-50'
      },
      {
        title: 'Overdue',
        value: stats.overdueTasks || 0,
        icon: AlertTriangle,
        color: 'bg-red-500',
        bgColor: 'bg-red-50'
      }
    ];

    if (user?.role === 'admin') {
      return [
        {
          title: 'Users',
          value: stats.users || 0,
          icon: Users,
          color: 'bg-purple-500',
          bgColor: 'bg-purple-50'
        },
        {
          title: 'Teams',
          value: stats.teams || 0,
          icon: Users,
          color: 'bg-cyan-500',
          bgColor: 'bg-cyan-50'
        },
        ...baseCards
      ];
    }

    return baseCards;
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-slate-200 rounded w-1/3 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-slate-200 rounded-xl"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900">
          {getGreeting()}, {user?.name}!
        </h1>
        <p className="text-lg text-slate-600 mt-2">
          Here's what's happening with your {user?.role === 'masteradmin' ? 'platform' : 'projects'} today.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {getStatsCards().map((card, index) => (
          <div key={index} className={`${card.bgColor} p-6 rounded-xl border border-slate-200 shadow-sm`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">{card.title}</p>
                <p className="text-3xl font-bold text-slate-900 mt-2">{card.value}</p>
              </div>
              <div className={`${card.color} p-3 rounded-lg`}>
                <card.icon className="h-6 w-6 text-white" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      {user?.role !== 'masteradmin' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">Quick Stats</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center p-4 bg-yellow-50 rounded-lg">
              <Clock className="h-8 w-8 text-yellow-500 mr-3" />
              <div>
                <p className="text-sm font-medium text-slate-600">Upcoming Deadlines</p>
                <p className="text-2xl font-bold text-slate-900">{stats.upcomingDeadlines || 0}</p>
              </div>
            </div>
            <div className="flex items-center p-4 bg-green-50 rounded-lg">
              <TrendingUp className="h-8 w-8 text-green-500 mr-3" />
              <div>
                <p className="text-sm font-medium text-slate-600">Completion Rate</p>
                <p className="text-2xl font-bold text-slate-900">
                  {stats.tasks ? Math.round(((stats.completedTasks || 0) / stats.tasks) * 100) : 0}%
                </p>
              </div>
            </div>
            <div className="flex items-center p-4 bg-blue-50 rounded-lg">
              <CheckSquare className="h-8 w-8 text-blue-500 mr-3" />
              <div>
                <p className="text-sm font-medium text-slate-600">Active Tasks</p>
                <p className="text-2xl font-bold text-slate-900">
                  {(stats.tasks || 0) - (stats.completedTasks || 0)}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;