import React, { useState, useEffect } from 'react';
import { Dialog } from 'primereact/dialog';
import { Button } from 'primereact/button';
import { Dropdown } from 'primereact/dropdown';
import { InputTextarea } from 'primereact/inputtextarea';
import { Message } from 'primereact/message';
import { ProgressSpinner } from 'primereact/progressspinner';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';

interface User {
  _id: string;
  name: string;
  email: string;
  role: string;
}

interface TaskDelegationModalProps {
  visible: boolean;
  onHide: () => void;
  taskId: string;
  taskTitle: string;
  currentAssignee: string;
  projectId: string;
  onDelegationSent: () => void;
}

const TaskDelegationModal: React.FC<TaskDelegationModalProps> = ({
  visible,
  onHide,
  taskId,
  taskTitle,
  currentAssignee,
  projectId,
  onDelegationSent
}) => {
  const { user } = useAuth();
  const [availableUsers, setAvailableUsers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetchingUsers, setFetchingUsers] = useState(false);

  useEffect(() => {
    if (visible && projectId) {
      fetchProjectMembers();
    }
  }, [visible, projectId]);

  const fetchProjectMembers = async () => {
    try {
      setFetchingUsers(true);
      const response = await axios.get(`/api/projects/${projectId}`);
      const project = response.data;
      
      // Filter out current assignee and current user
      const filteredMembers = project.members.filter(
        (member: User) => member._id !== currentAssignee && member._id !== user?.id
      );
      
      setAvailableUsers(filteredMembers);
    } catch (error) {
      toast.error('Failed to fetch project members');
    } finally {
      setFetchingUsers(false);
    }
  };

  const handleDelegation = async () => {
    if (!selectedUser || !reason.trim()) {
      toast.error('Please select a user and provide a reason');
      return;
    }

    setLoading(true);
    try {
      await axios.post(`/api/tasks/${taskId}/delegate`, {
        toUserId: selectedUser._id,
        reason: reason.trim()
      });

      toast.success('Delegation request sent successfully');
      onDelegationSent();
      onHide();
      setSelectedUser(null);
      setReason('');
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to send delegation request';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const userOptionTemplate = (option: User) => {
    const getInitials = (name: string) => {
      return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    };

    return (
      <div className="flex align-items-center gap-2">
        <div 
          className="flex align-items-center justify-content-center"
          style={{
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            background: 'var(--primary-600)',
            color: 'white',
            fontSize: '0.75rem',
            fontWeight: '600'
          }}
        >
          {getInitials(option.name)}
        </div>
        <div>
          <div className="font-semibold">{option.name}</div>
          <div className="text-sm text-color-secondary">{option.role}</div>
        </div>
      </div>
    );
  };

  const selectedUserTemplate = (option: User) => {
    if (!option) return <span>Select a team member</span>;
    
    const getInitials = (name: string) => {
      return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    };

    return (
      <div className="flex align-items-center gap-2">
        <div 
          className="flex align-items-center justify-content-center"
          style={{
            width: '24px',
            height: '24px',
            borderRadius: '50%',
            background: 'var(--primary-600)',
            color: 'white',
            fontSize: '0.625rem',
            fontWeight: '600'
          }}
        >
          {getInitials(option.name)}
        </div>
        <span>{option.name}</span>
      </div>
    );
  };

  return (
    <Dialog
      header="Delegate Task"
      visible={visible}
      onHide={onHide}
      style={{ width: '500px' }}
      modal
      className="p-fluid"
    >
      <div className="flex flex-column gap-4">
        <Message 
          severity="info" 
          text={`You are requesting to delegate the task "${taskTitle}" to another team member.`}
        />

        {fetchingUsers ? (
          <div className="flex justify-content-center p-4">
            <ProgressSpinner size="50" />
          </div>
        ) : (
          <>
            <div className="field">
              <label htmlFor="user-select" className="font-semibold">
                Select Team Member
              </label>
              <Dropdown
                id="user-select"
                value={selectedUser}
                options={availableUsers}
                onChange={(e) => setSelectedUser(e.value)}
                optionLabel="name"
                placeholder="Choose a team member"
                itemTemplate={userOptionTemplate}
                valueTemplate={selectedUserTemplate}
                filter
                filterBy="name"
                emptyMessage="No team members available"
                className="w-full"
              />
            </div>

            <div className="field">
              <label htmlFor="reason" className="font-semibold">
                Reason for Delegation
              </label>
              <InputTextarea
                id="reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Explain why you need to delegate this task..."
                rows={4}
                className="w-full"
              />
            </div>

            {availableUsers.length === 0 && !fetchingUsers && (
              <Message 
                severity="warn" 
                text="No other team members available for delegation."
              />
            )}
          </>
        )}

        <div className="flex justify-content-end gap-2 pt-3">
          <Button
            label="Cancel"
            severity="secondary"
            onClick={onHide}
            disabled={loading}
          />
          <Button
            label={loading ? 'Sending...' : 'Send Request'}
            onClick={handleDelegation}
            disabled={loading || !selectedUser || !reason.trim() || fetchingUsers}
            loading={loading}
          />
        </div>
      </div>
    </Dialog>
  );
};

export default TaskDelegationModal;