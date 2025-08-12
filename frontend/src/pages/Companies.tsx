import React, { useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { 
  Building2, 
  Plus, 
  Users, 
  Calendar, 
  Loader2, 
  Search,
  Edit,
  Trash2,
  Eye,
  EyeOff,
  AlertTriangle,
  CheckCircle,
  FolderOpen,
  UserCheck
} from 'lucide-react';

interface Company {
  _id: string;
  name: string;
  description: string;
  admin: {
    _id: string;
    name: string;
    email: string;
  };
  employees: any[];
  teams: any[];
  projects: any[];
  isActive: boolean;
  createdAt: string;
}

const Companies: React.FC = () => {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showInactive, setShowInactive] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    adminName: '',
    adminEmail: '',
    adminPassword: ''
  });
  const [creating, setCreating] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    fetchCompanies();
  }, []);

  const fetchCompanies = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/companies', {
        params: {
          includeInactive: showInactive ? 'true' : 'false'
        }
      });
      setCompanies(response.data);
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to fetch companies';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      toast.error('Company name is required');
      return;
    }
    
    if (!editingCompany && (!formData.adminName.trim() || !formData.adminEmail.trim() || !formData.adminPassword.trim())) {
      toast.error('All admin fields are required for new companies');
      return;
    }

    setCreating(true);
    try {
      if (editingCompany) {
        await axios.put(`/api/companies/${editingCompany._id}`, {
          name: formData.name,
          description: formData.description
        });
        toast.success('Company updated successfully');
      } else {
        await axios.post('/api/companies', formData);
        toast.success('Company created successfully');
      }
      
      setShowModal(false);
      resetForm();
      fetchCompanies();
    } catch (error: any) {
      const message = error.response?.data?.message || `Failed to ${editingCompany ? 'update' : 'create'} company`;
      toast.error(message);
    } finally {
      setCreating(false);
    }
  };

  const handleToggleStatus = async (companyId: string, isActive: boolean) => {
    setActionLoading(companyId);
    try {
      if (isActive) {
        await axios.delete(`/api/companies/${companyId}`);
        toast.success('Company deactivated successfully');
      } else {
        await axios.put(`/api/companies/${companyId}/activate`);
        toast.success('Company reactivated successfully');
      }
      fetchCompanies();
    } catch (error: any) {
      const message = error.response?.data?.message || `Failed to ${isActive ? 'deactivate' : 'reactivate'} company`;
      toast.error(message);
    } finally {
      setActionLoading(null);
    }
  };

  const startEdit = (company: Company) => {
    setEditingCompany(company);
    setFormData({
      name: company.name,
      description: company.description,
      adminName: '',
      adminEmail: '',
      adminPassword: ''
    });
    setShowModal(true);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      adminName: '',
      adminEmail: '',
      adminPassword: ''
    });
    setEditingCompany(null);
  };

  const filteredCompanies = companies.filter(company =>
    (showInactive || company.isActive) &&
    (company.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    company.admin.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    company.admin.email.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
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
            <h1 className="text-3xl font-bold text-slate-900">Companies</h1>
            <p className="text-slate-600 mt-2">Manage all companies and their administrators</p>
          </div>
          <button
            onClick={() => {
              resetForm();
              setShowModal(true);
            }}
            className="bg-slate-600 hover:bg-slate-700 text-white px-6 py-3 rounded-lg flex items-center gap-2 transition-colors font-medium"
          >
            <Plus className="h-5 w-5" />
            Add Company
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600">Total Companies</p>
              <p className="text-3xl font-bold text-slate-900 mt-2">{companies.length}</p>
            </div>
            <Building2 className="h-8 w-8 text-slate-400" />
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600">Active Companies</p>
              <p className="text-3xl font-bold text-green-600 mt-2">
                {companies.filter(c => c.isActive).length}
              </p>
            </div>
            <CheckCircle className="h-8 w-8 text-green-400" />
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600">Total Employees</p>
              <p className="text-3xl font-bold text-blue-600 mt-2">
                {companies.reduce((acc, company) => acc + company.employees.length, 0)}
              </p>
            </div>
            <Users className="h-8 w-8 text-blue-400" />
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600">Total Projects</p>
              <p className="text-3xl font-bold text-purple-600 mt-2">
                {companies.reduce((acc, company) => acc + company.projects.length, 0)}
              </p>
            </div>
            <FolderOpen className="h-8 w-8 text-purple-400" />
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="mb-6 bg-white rounded-xl border border-slate-200 shadow-sm p-4 flex items-center justify-between">
        <div className="relative flex-grow">
          <Search className="absolute left-3 top-3 h-5 w-5 text-slate-400" />
          <input
            type="text"
            placeholder="Search companies..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-transparent transition-all"
          />
        </div>
        <div className="ml-4 flex items-center gap-2">
          <input
            type="checkbox"
            id="showInactive"
            checked={showInactive}
            onChange={() => {
              setShowInactive(!showInactive);
              fetchCompanies();
            }}
            className="h-4 w-4 rounded border-gray-300 text-slate-600 focus:ring-slate-500"
          />
          <label htmlFor="showInactive" className="text-sm text-slate-700 select-none cursor-pointer">
            Show Inactive
          </label>
        </div>
      </div>

      {/* Companies Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredCompanies.map((company) => (
          <div key={company._id} className="bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden">
            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-4">
                  <div className="bg-slate-100 p-3 rounded-lg">
                    <Building2 className="h-6 w-6 text-slate-600" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-semibold text-slate-900">{company.name}</h3>
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        company.isActive 
                          ? 'bg-green-100 text-green-800 border border-green-200' 
                          : 'bg-red-100 text-red-800 border border-red-200'
                      }`}>
                        {company.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    <p className="text-sm text-slate-600">Admin: {company.admin.name}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => startEdit(company)}
                    className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                    title="Edit company"
                  >
                    <Edit className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleToggleStatus(company._id, company.isActive)}
                    disabled={actionLoading === company._id}
                    className={`p-2 rounded-lg transition-colors ${
                      company.isActive
                        ? 'text-red-500 hover:text-red-700 hover:bg-red-50'
                        : 'text-green-500 hover:text-green-700 hover:bg-green-50'
                    }`}
                    title={company.isActive ? 'Deactivate company' : 'Reactivate company'}
                  >
                    {actionLoading === company._id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : company.isActive ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>
              
              {company.description && (
                <p className="text-slate-600 mb-4 text-sm">{company.description}</p>
              )}

              {/* Admin Info */}
              <div className="mb-4 p-3 bg-slate-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-slate-600 flex items-center justify-center text-white text-sm font-medium">
                    {getInitials(company.admin.name)}
                  </div>
                  <div>
                    <p className="font-medium text-slate-900">{company.admin.name}</p>
                    <p className="text-sm text-slate-600">{company.admin.email}</p>
                  </div>
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-4 mb-4">
                <div className="text-center">
                  <div className="flex items-center justify-center mb-1">
                    <Users className="h-4 w-4 text-slate-500" />
                  </div>
                  <p className="text-lg font-semibold text-slate-900">{company.employees.length}</p>
                  <p className="text-xs text-slate-600">Employees</p>
                </div>
                <div className="text-center">
                  <div className="flex items-center justify-center mb-1">
                    <UserCheck className="h-4 w-4 text-slate-500" />
                  </div>
                  <p className="text-lg font-semibold text-slate-900">{company.teams.length}</p>
                  <p className="text-xs text-slate-600">Teams</p>
                </div>
                <div className="text-center">
                  <div className="flex items-center justify-center mb-1">
                    <FolderOpen className="h-4 w-4 text-slate-500" />
                  </div>
                  <p className="text-lg font-semibold text-slate-900">{company.projects.length}</p>
                  <p className="text-xs text-slate-600">Projects</p>
                </div>
              </div>

              <div className="flex items-center text-xs text-slate-500">
                <Calendar className="h-4 w-4 mr-1" />
                Created {new Date(company.createdAt).toLocaleDateString()}
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredCompanies.length === 0 && (
        <div className="text-center py-12 bg-white rounded-xl border border-slate-200 shadow-sm">
          <Building2 className="h-12 w-12 text-slate-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-slate-900 mb-2">No companies found</h3>
          <p className="text-slate-600 mb-4">
            {searchTerm
              ? 'Try adjusting your search terms.'
              : 'Create your first company to get started.'
            }
          </p>
        </div>
      )}

      {/* Create/Edit Company Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-200">
              <h2 className="text-xl font-semibold text-slate-900">
                {editingCompany ? 'Edit Company' : 'Create New Company'}
              </h2>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Company Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500"
                  placeholder="Enter company name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500"
                  rows={3}
                  placeholder="Enter company description"
                />
              </div>

              {!editingCompany && (
                <>
                  <div className="border-t pt-4">
                    <h3 className="text-sm font-semibold text-slate-900 mb-3">Company Administrator</h3>
                    
                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                          Admin Name *
                        </label>
                        <input
                          type="text"
                          required
                          value={formData.adminName}
                          onChange={(e) => setFormData({ ...formData, adminName: e.target.value })}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500"
                          placeholder="Enter admin name"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                          Admin Email *
                        </label>
                        <input
                          type="email"
                          required
                          value={formData.adminEmail}
                          onChange={(e) => setFormData({ ...formData, adminEmail: e.target.value })}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500"
                          placeholder="Enter admin email"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                          Admin Password *
                        </label>
                        <input
                          type="password"
                          required
                          minLength={6}
                          value={formData.adminPassword}
                          onChange={(e) => setFormData({ ...formData, adminPassword: e.target.value })}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500"
                          placeholder="Enter admin password"
                        />
                      </div>
                    </div>
                  </div>
                </>
              )}

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    resetForm();
                  }}
                  className="flex-1 px-4 py-2 text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="flex-1 px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700 disabled:opacity-50 transition-colors font-medium flex items-center justify-center gap-2"
                >
                  {creating ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      {editingCompany ? 'Updating...' : 'Creating...'}
                    </>
                  ) : (
                    editingCompany ? 'Update Company' : 'Create Company'
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

export default Companies;