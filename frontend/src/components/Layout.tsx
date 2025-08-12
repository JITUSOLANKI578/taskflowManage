import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  Building2,
  Users,
  FolderOpen,
  CheckSquare,
  LogOut,
  Home,
  UserCog,
  Menu,
  X
} from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Sidebar toggle state
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const getNavItems = () => {
    const baseItems = [
      { path: '/', icon: Home, label: 'Dashboard' }
    ];

    if (user?.role === 'masteradmin') {
      return [
        ...baseItems,
        { path: '/companies', icon: Building2, label: 'Companies' },
        { path: '/users', icon: UserCog, label: 'Admins' }
      ];
    }

    if (user?.role === 'admin') {
      return [
        ...baseItems,
        { path: '/users', icon: UserCog, label: 'Members' },
        { path: '/teams', icon: Users, label: 'Teams' },
        { path: '/projects', icon: FolderOpen, label: 'Projects' }
      ];
    }

    return [
      ...baseItems,
      { path: '/users', icon: UserCog, label: 'Profile' },
      { path: '/projects', icon: FolderOpen, label: 'Projects' },
      { path: '/tasks', icon: CheckSquare, label: 'Tasks' }
    ];
  };

  const navItems = getNavItems();

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Top Navbar for small screen */}
      <div className="lg:hidden flex items-center justify-between bg-slate-800 text-white px-4 py-3 shadow-md">
        <div className="flex items-center">
          <Building2 className="h-6 w-6 text-slate-300" />
          <span className="ml-2 text-lg font-semibold">ProjectFlow</span>
        </div>
        <button onClick={() => setIsSidebarOpen(!isSidebarOpen)}>
          {isSidebarOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {/* Sidebar */}
      <div
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-slate-800 shadow-lg transform 
          ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} 
          transition-transform duration-300 ease-in-out lg:translate-x-0`}
      >
        <div className="flex h-full flex-col">
          {/* Logo - Only show on large screens */}
          <div className="hidden lg:flex h-16 items-center justify-center border-b border-slate-700 px-6">
            <Building2 className="h-8 w-8 text-slate-300" />
            <span className="ml-2 text-xl font-semibold text-white">ProjectFlow</span>
          </div>

          {/* User Info */}
          <div className="border-b border-slate-700 p-4">
            <div className="flex items-center">
              <div className="h-10 w-10 rounded-full bg-slate-600 flex items-center justify-center">
                <span className="text-sm font-medium text-white">
                  {user?.name?.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-white">{user?.name}</p>
                <p className="text-xs text-slate-400 capitalize">{user?.role}</p>
                {user?.company && (
                  <p className="text-xs text-slate-400">{user.company.name}</p>
                )}
              </div>
            </div>
          </div>

          {/* Navigation */}
          <div className="flex-1 px-4 py-6 overflow-y-auto">
            <nav className="space-y-2">
              {navItems.map((item) => {
                const isActive = location.pathname === item.path;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setIsSidebarOpen(false)} // Auto close on mobile link click
                    className={`flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-slate-700 text-white'
                        : 'text-slate-300 hover:bg-slate-700 hover:text-white'
                    }`}
                  >
                    <item.icon className="h-5 w-5 mr-3" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Logout */}
          <div className="border-t border-slate-700 p-4">
            <button
              onClick={() => {
                handleLogout();
                setIsSidebarOpen(false);
              }}
              className="flex w-full items-center px-3 py-2 rounded-lg text-sm font-medium text-slate-300 hover:bg-slate-700 hover:text-white transition-colors"
            >
              <LogOut className="h-5 w-5 mr-3" />
              Logout
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="lg:pl-64 flex-1">
        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
};

export default Layout;
