import React, { useState } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';
import { 
  MessageSquare, 
  Edit, 
  Trash2, 
  Send, 
  Loader2, 
  User,
  Clock,
  Check,
  X
} from 'lucide-react';

interface Comment {
  _id: string;
  user: {
    _id: string;
    name: string;
    email: string;
    avatar?: string;
  };
  content: string;
  createdAt: string;
  isEdited?: boolean;
  editedAt?: string;
}

interface CommentsSectionProps {
  type: 'project' | 'task';
  itemId: string;
  comments: Comment[];
  onUpdate: () => void;
}

const CommentsSection: React.FC<CommentsSectionProps> = ({ type, itemId, comments, onUpdate }) => {
  const { user } = useAuth();
  const [newComment, setNewComment] = useState('');
  const [editingComment, setEditingComment] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 1) {
      const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
      return diffInMinutes < 1 ? 'Just now' : `${diffInMinutes}m ago`;
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)}h ago`;
    } else if (diffInHours < 24 * 7) {
      return date.toLocaleDateString([], { weekday: 'short', hour: '2-digit', minute: '2-digit' });
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    setSubmitting(true);
    try {
      const endpoint = type === 'project' ? `/api/projects/${itemId}/comments` : `/api/tasks/${itemId}/comments`;
      await axios.post(endpoint, { content: newComment.trim() });
      setNewComment('');
      toast.success('Comment added successfully');
      onUpdate();
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to add comment';
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditComment = async (commentId: string) => {
    if (!editContent.trim()) return;

    setLoading(true);
    try {
      const endpoint = type === 'project' 
        ? `/api/projects/${itemId}/comments/${commentId}` 
        : `/api/tasks/${itemId}/comments/${commentId}`;
      await axios.put(endpoint, { content: editContent.trim() });
      setEditingComment(null);
      setEditContent('');
      toast.success('Comment updated successfully');
      onUpdate();
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to update comment';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!window.confirm('Are you sure you want to delete this comment?')) return;

    setLoading(true);
    try {
      const endpoint = type === 'project' 
        ? `/api/projects/${itemId}/comments/${commentId}` 
        : `/api/tasks/${itemId}/comments/${commentId}`;
      await axios.delete(endpoint);
      toast.success('Comment deleted successfully');
      onUpdate();
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to delete comment';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const startEdit = (comment: Comment) => {
    setEditingComment(comment._id);
    setEditContent(comment.content);
  };

  const cancelEdit = () => {
    setEditingComment(null);
    setEditContent('');
  };

  return (
    <div className="space-y-6">
      {/* Add Comment Form */}
      <div className="bg-slate-50 rounded-xl border border-slate-200 p-6">
        <h4 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          Add Comment
        </h4>
        
        <form onSubmit={handleAddComment} className="space-y-4">
          <div>
            <textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder={`Add a comment to this ${type}...`}
              className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-transparent resize-none transition-all"
              rows={3}
              required
            />
          </div>
          
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={!newComment.trim() || submitting}
              className="bg-slate-600 hover:bg-slate-700 text-white px-6 py-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center gap-2 font-medium"
            >
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              {submitting ? 'Adding...' : 'Add Comment'}
            </button>
          </div>
        </form>
      </div>

      {/* Comments List */}
      <div className="space-y-4">
        <h4 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          Comments ({comments.length})
        </h4>

        {comments.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl border border-slate-200">
            <MessageSquare className="h-12 w-12 text-slate-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-900 mb-2">No comments yet</h3>
            <p className="text-slate-600">Be the first to add a comment to this {type}.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {comments.map((comment) => (
              <div key={comment._id} className="bg-white rounded-xl border border-slate-200 p-6 hover:shadow-sm transition-shadow">
                <div className="flex items-start gap-4">
                  {/* User Avatar */}
                  <div className="flex-shrink-0">
                    <div className="h-10 w-10 rounded-full bg-slate-600 flex items-center justify-center text-white font-medium">
                      {getInitials(comment.user.name)}
                    </div>
                  </div>

                  {/* Comment Content */}
                  <div className="flex-1 min-w-0">
                    {/* User Info */}
                    <div className="flex items-center gap-2 mb-2">
                      <h5 className="font-semibold text-slate-900">{comment.user.name}</h5>
                      <span className="text-sm text-slate-500">{comment.user.email}</span>
                      <span className="text-xs text-slate-400">•</span>
                      <span className="text-xs text-slate-500 flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatTime(comment.createdAt)}
                      </span>
                      {comment.isEdited && (
                        <>
                          <span className="text-xs text-slate-400">•</span>
                          <span className="text-xs text-slate-500 italic">edited</span>
                        </>
                      )}
                    </div>

                    {/* Comment Text */}
                    {editingComment === comment._id ? (
                      <div className="space-y-3">
                        <textarea
                          value={editContent}
                          onChange={(e) => setEditContent(e.target.value)}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-transparent resize-none"
                          rows={3}
                        />
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleEditComment(comment._id)}
                            disabled={!editContent.trim() || loading}
                            className="bg-slate-600 hover:bg-slate-700 text-white px-3 py-1.5 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm flex items-center gap-1"
                          >
                            {loading ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <Check className="h-3 w-3" />
                            )}
                            Save
                          </button>
                          <button
                            onClick={cancelEdit}
                            className="text-slate-600 hover:text-slate-800 px-3 py-1.5 rounded-lg transition-colors text-sm flex items-center gap-1"
                          >
                            <X className="h-3 w-3" />
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <p className="text-slate-700 whitespace-pre-wrap break-words leading-relaxed">
                        {comment.content}
                      </p>
                    )}
                  </div>

                  {/* Actions */}
                  {comment.user._id === user?.id && editingComment !== comment._id && (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => startEdit(comment)}
                        className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                        title="Edit comment"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteComment(comment._id)}
                        className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete comment"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default CommentsSection;