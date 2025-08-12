import React, { useState, useEffect } from 'react';
import { Card } from 'primereact/card';
import { Button } from 'primereact/button';
import { Badge } from 'primereact/badge';
import { Message } from 'primereact/message';
import { ProgressSpinner } from 'primereact/progressspinner';
import { Divider } from 'primereact/divider';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';

interface DelegationRequest {
  _id: string;
  task: {
    _id: string;
    title: string;
    description: string;
    priority: string;
  };
  fromUser: {
    _id: string;
    name: string;
    email: string;
  };
  toUser: {
    _id: string;
    name: string;
    email: string;
  };
  reason: string;
  status: 'pending' | 'accepted' | 'rejected';
  createdAt: string;
}

const DelegationRequestsPanel: React.FC = () => {
  const { user } = useAuth();
  const [requests, setRequests] = useState<DelegationRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    fetchDelegationRequests();
  }, []);

  const fetchDelegationRequests = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/tasks/delegation-requests');
      setRequests(response.data);
    } catch (error) {
      toast.error('Failed to fetch delegation requests');
    } finally {
      setLoading(false);
    }
  };

  const handleRequestAction = async (requestId: string, action: 'accept' | 'reject') => {
    setActionLoading(requestId);
    try {
      await axios.put(`/api/tasks/delegation-requests/${requestId}`, { action });
      toast.success(`Request ${action}ed successfully`);
      fetchDelegationRequests();
    } catch (error: any) {
      const message = error.response?.data?.message || `Failed to ${action} request`;
      toast.error(message);
    } finally {
      setActionLoading(null);
    }
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'danger';
      case 'high': return 'warning';
      case 'medium': return 'info';
      default: return 'success';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <Card title="Delegation Requests">
        <div className="flex justify-content-center p-4">
          <ProgressSpinner size="50" />
        </div>
      </Card>
    );
  }

  const pendingRequests = requests.filter(req => req.status === 'pending');

  return (
    <Card 
      title={
        <div className="flex align-items-center gap-2">
          <span>Delegation Requests</span>
          {pendingRequests.length > 0 && (
            <Badge value={pendingRequests.length} severity="danger" />
          )}
        </div>
      }
      className="mb-4"
    >
      {requests.length === 0 ? (
        <Message 
          severity="info" 
          text="No delegation requests found."
        />
      ) : (
        <div className="flex flex-column gap-3">
          {requests.map((request) => (
            <div key={request._id} className="border-1 border-200 border-round p-3">
              <div className="flex justify-content-between align-items-start mb-3">
                <div className="flex align-items-center gap-3">
                  <div 
                    className="flex align-items-center justify-content-center"
                    style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '50%',
                      background: 'var(--primary-600)',
                      color: 'white',
                      fontSize: '0.875rem',
                      fontWeight: '600'
                    }}
                  >
                    {getInitials(request.fromUser.name)}
                  </div>
                  <div>
                    <div className="font-semibold text-900">
                      {request.fromUser.name}
                    </div>
                    <div className="text-sm text-600">
                      {request.fromUser.email}
                    </div>
                  </div>
                </div>
                <Badge 
                  value={request.status.toUpperCase()} 
                  severity={
                    request.status === 'pending' ? 'warning' :
                    request.status === 'accepted' ? 'success' : 'danger'
                  }
                />
              </div>

              <div className="mb-3">
                <div className="flex align-items-center gap-2 mb-2">
                  <span className="font-semibold">Task:</span>
                  <span className="text-900">{request.task.title}</span>
                  <Badge 
                    value={request.task.priority.toUpperCase()} 
                    severity={getPriorityColor(request.task.priority)}
                    size="small"
                  />
                </div>
                <div className="text-sm text-600 mb-2">
                  {request.task.description}
                </div>
              </div>

              <div className="mb-3">
                <div className="font-semibold mb-1">Reason:</div>
                <div className="text-600 text-sm bg-50 p-2 border-round">
                  {request.reason}
                </div>
              </div>

              <div className="flex justify-content-between align-items-center">
                <div className="text-xs text-500">
                  Requested on {formatDate(request.createdAt)}
                </div>
                
                {request.status === 'pending' && request.toUser._id === user?.id && (
                  <div className="flex gap-2">
                    <Button
                      label="Accept"
                      size="small"
                      severity="success"
                      onClick={() => handleRequestAction(request._id, 'accept')}
                      loading={actionLoading === request._id}
                      disabled={actionLoading !== null}
                    />
                    <Button
                      label="Reject"
                      size="small"
                      severity="danger"
                      outlined
                      onClick={() => handleRequestAction(request._id, 'reject')}
                      loading={actionLoading === request._id}
                      disabled={actionLoading !== null}
                    />
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
};

export default DelegationRequestsPanel;