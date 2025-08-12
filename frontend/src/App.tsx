import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './contexts/AuthContext';
import { SocketProvider } from './contexts/SocketContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Companies from './pages/Companies';
import Users from './pages/Users';
import Teams from './pages/Teams';
import Projects from './pages/Projects';
import ProjectDetail from './pages/ProjectDetail';
import Tasks from './pages/Tasks';
import TaskDetail from './pages/TaskDetail';
import DelegationRequestsPanel from './components/DelegationRequestsPanel';
import axios from 'axios';

// Set axios base URL
axios.defaults.baseURL = 'https://taskflowmanage.onrender.com';

function App() {
  return (
    <AuthProvider>
      <SocketProvider>
        <Router>
          <div className="App">
            <Toaster 
              position="top-right"
              toastOptions={{
                duration: 4000,
                style: {
                  background: '#1e293b',
                  color: '#fff',
                },
              }}
            />
            
            <Routes>
              <Route path="/login" element={<Login />} />
              
              <Route
                path="/*"
                element={
                  <ProtectedRoute>
                    <Layout>
                      <Routes>
                        <Route path="/" element={<Dashboard />} />
                        
                        <Route
                          path="/companies"
                          element={
                            <ProtectedRoute roles={['masteradmin']}>
                              <Companies />
                            </ProtectedRoute>
                          }
                        />
                        
                        {/* Placeholder routes for other pages */}
                        <Route
                          path="/users"
                          element={
                            <ProtectedRoute>
                              <Users />
                            </ProtectedRoute>
                          }
                        />
                        
                        <Route
                          path="/teams"
                          element={
                            <ProtectedRoute roles={['admin']}>
                              <Teams />
                            </ProtectedRoute>
                          }
                        />
                        
                        <Route
                          path="/projects"
                          element={
                            <ProtectedRoute>
                              <Projects />
                            </ProtectedRoute>
                          }
                        />
                        
                        <Route
                          path="/projects/:id"
                          element={
                            <ProtectedRoute>
                              <ProjectDetail />
                            </ProtectedRoute>
                          }
                        />
                        
                        <Route
                          path="/tasks"
                          element={
                            <ProtectedRoute>
                              <Tasks />
                            </ProtectedRoute>
                          }
                        />
                        
                        <Route
                          path="/tasks/:id"
                          element={
                            <ProtectedRoute>
                              <TaskDetail />
                            </ProtectedRoute>
                          }
                        />
                        
                        <Route
                          path="/unauthorized"
                          element={
                            <div className="min-h-screen flex items-center justify-center bg-slate-50">
                              <div className="text-center">
                                <h1 className="text-2xl font-bold text-slate-900 mb-2">Unauthorized</h1>
                                <p className="text-slate-600">You don't have permission to access this page.</p>
                              </div>
                            </div>
                          }
                        />
                      </Routes>
                    </Layout>
                  </ProtectedRoute>
                }
              />
            </Routes>
          </div>
        </Router>
      </SocketProvider>
    </AuthProvider>
  );
}

export default App;