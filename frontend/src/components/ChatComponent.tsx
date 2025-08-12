import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';
import { useSocket } from '../contexts/SocketContext';
import { 
  Send, 
  Paperclip, 
  Code, 
  Image, 
  Download, 
  Copy, 
  Loader2, 
  Users,
  MessageSquare,
  File,
  Eye,
  X
} from 'lucide-react';

interface ChatMessage {
  _id: string;
  sender: {
    _id: string;
    name: string;
    email: string;
    role: string;
  };
  content?: string;
  messageType: 'text' | 'file' | 'code';
  file?: {
    filename: string;
    originalName: string;
    size: number;
    mimeType: string;
  };
  code?: {
    language: string;
    content: string;
  };
  createdAt: string;
  isEdited?: boolean;
  editedAt?: string;
}

interface ChatComponentProps {
  projectId: string;
  taskId?: string;
  chatRoom?: string;
}

const ChatComponent: React.FC<ChatComponentProps> = ({ projectId, taskId, chatRoom }) => {
  const { user } = useAuth();
  const { socket, isConnected } = useSocket();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [showCodeModal, setShowCodeModal] = useState(false);
  const [showFileModal, setShowFileModal] = useState(false);
  const [codeContent, setCodeContent] = useState('');
  const [codeLanguage, setCodeLanguage] = useState('javascript');
  const [selectedFiles, setSelectedFiles] = useState<FileList | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const codeLanguages = [
    { label: 'JavaScript', value: 'javascript' },
    { label: 'TypeScript', value: 'typescript' },
    { label: 'Python', value: 'python' },
    { label: 'Java', value: 'java' },
    { label: 'CSS', value: 'css' },
    { label: 'JSON', value: 'json' },
    { label: 'SQL', value: 'sql' },
    { label: 'Bash', value: 'bash' }
  ];

  useEffect(() => {
    fetchMessages();
    
    if (socket && isConnected) {
      socket.emit('join-project', projectId);
      
      socket.on('new-message', handleNewMessage);
      socket.on('user-typing', handleUserTyping);
      socket.on('user-stop-typing', handleUserStopTyping);
      
      return () => {
        socket.off('new-message', handleNewMessage);
        socket.off('user-typing', handleUserTyping);
        socket.off('user-stop-typing', handleUserStopTyping);
      };
    }
  }, [socket, isConnected, projectId, taskId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const fetchMessages = async () => {
    try {
      setLoading(true);
      const url = taskId 
        ? `/api/chat/${projectId}?taskId=${taskId}`
        : `/api/chat/${projectId}`;
      const response = await axios.get(url);
      setMessages(response.data);
    } catch (error) {
      toast.error('Failed to fetch messages');
    } finally {
      setLoading(false);
    }
  };

  const handleNewMessage = (message: ChatMessage) => {
    setMessages(prev => [...prev, message]);
  };

  const handleUserTyping = (data: { userId: string; userName: string; taskId?: string }) => {
    if (data.userId !== user?.id && (!taskId || data.taskId === taskId)) {
      setTypingUsers(prev => [...prev.filter(name => name !== data.userName), data.userName]);
    }
  };

  const handleUserStopTyping = (data: { userId: string; taskId?: string }) => {
    if (!taskId || data.taskId === taskId) {
      setTypingUsers(prev => prev.filter(name => name !== data.userId));
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || sending) return;

    setSending(true);
    try {
      const messageData = {
        projectId,
        chatRoom,
        taskId,
        content: newMessage.trim(),
        messageType: 'text'
      };

      if (socket && isConnected) {
        socket.emit('send-message', messageData);
        setNewMessage('');
      } else {
        toast.error('Not connected to chat server');
      }
    } catch (error) {
      toast.error('Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const handleSendCode = async () => {
    if (!codeContent.trim()) {
      toast.error('Please enter some code');
      return;
    }

    setSending(true);
    try {
      const messageData = {
        projectId,
        chatRoom,
        taskId,
        messageType: 'code',
        code: {
          language: codeLanguage,
          content: codeContent.trim()
        }
      };

      if (socket && isConnected) {
        socket.emit('send-message', messageData);
        setShowCodeModal(false);
        setCodeContent('');
        setCodeLanguage('javascript');
      } else {
        toast.error('Not connected to chat server');
      }
    } catch (error) {
      toast.error('Failed to send code');
    } finally {
      setSending(false);
    }
  };

  const handleFileUpload = async () => {
    if (!selectedFiles || selectedFiles.length === 0) {
      toast.error('Please select files to upload');
      return;
    }

    setSending(true);
    try {
      for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i];
        const formData = new FormData();
        formData.append('file', file);

        const uploadResponse = await axios.post('/api/chat/upload', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });

        const messageData = {
          projectId,
          chatRoom,
          taskId,
          messageType: 'file',
          file: uploadResponse.data
        };

        if (socket && isConnected) {
          socket.emit('send-message', messageData);
        }
      }
      
      setShowFileModal(false);
      setSelectedFiles(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      toast.success('File(s) uploaded successfully');
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to upload file';
      toast.error(message);
    } finally {
      setSending(false);
    }
  };

  const handleTyping = () => {
    if (socket && isConnected) {
      socket.emit('typing', { projectId, taskId });
      
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      
      typingTimeoutRef.current = setTimeout(() => {
        socket.emit('stop-typing', { projectId, taskId });
      }, 1000);
    }
  };

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
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      toast.success('Code copied to clipboard');
    }).catch(() => {
      toast.error('Failed to copy code');
    });
  };

  const downloadFile = (filename: string, originalName: string) => {
    const link = document.createElement('a');
    link.href = `/uploads/${filename}`;
    link.download = originalName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const isImageFile = (mimeType: string) => {
    return mimeType.startsWith('image/');
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-slate-600" />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-white rounded-lg border border-slate-200">
      {/* Chat Header */}
      <div className="flex items-center justify-between p-4 border-b border-slate-200 bg-slate-50 rounded-t-lg">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-slate-600" />
          <span className="font-medium text-slate-900">
            {taskId ? 'Task Discussion' : 'Project Team Chat'}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
          <span className="text-sm text-slate-600">
            {isConnected ? 'Connected' : 'Disconnected'}
          </span>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="text-center py-8">
            <MessageSquare className="h-12 w-12 text-slate-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-900 mb-2">No messages yet</h3>
            <p className="text-slate-600">
              {taskId 
                ? "Start the discussion about this task!"
                : "Start chatting with your team!"
              }
            </p>
          </div>
        ) : (
          messages.map((message) => (
            <div key={message._id} className="flex gap-3">
              <div className="h-8 w-8 rounded-full bg-slate-600 flex items-center justify-center text-white text-xs font-medium flex-shrink-0">
                {getInitials(message.sender.name)}
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium text-slate-900">{message.sender.name}</span>
                  <span className="px-2 py-0.5 bg-slate-100 text-slate-600 text-xs rounded-full">
                    {message.sender.role.replace('_', ' ')}
                  </span>
                  <span className="text-xs text-slate-500">{formatTime(message.createdAt)}</span>
                  {message.isEdited && (
                    <span className="text-xs text-slate-500 italic">(edited)</span>
                  )}
                </div>
                
                <div className="bg-slate-50 rounded-lg p-3">
                  {message.messageType === 'text' && (
                    <p className="text-slate-800 whitespace-pre-wrap break-words">{message.content}</p>
                  )}
                  
                  {message.messageType === 'code' && message.code && (
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="px-2 py-1 bg-slate-600 text-white text-xs rounded">
                          {message.code.language}
                        </span>
                        <button
                          onClick={() => copyToClipboard(message.code!.content)}
                          className="p-1 text-slate-500 hover:text-slate-700 hover:bg-slate-200 rounded transition-colors"
                          title="Copy code"
                        >
                          <Copy className="h-4 w-4" />
                        </button>
                      </div>
                      <pre className="bg-slate-800 text-slate-100 p-3 rounded overflow-x-auto text-sm">
                        <code>{message.code.content}</code>
                      </pre>
                    </div>
                  )}
                  
                  {message.messageType === 'file' && message.file && (
                    <div className="flex items-center justify-between p-3 border border-slate-200 rounded-lg bg-white">
                      <div className="flex items-center gap-3">
                        {isImageFile(message.file.mimeType) ? (
                          <Image className="h-8 w-8 text-blue-500" />
                        ) : (
                          <File className="h-8 w-8 text-slate-500" />
                        )}
                        <div>
                          <p className="font-medium text-slate-900">{message.file.originalName}</p>
                          <p className="text-sm text-slate-600">{formatFileSize(message.file.size)}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {isImageFile(message.file.mimeType) && (
                          <button
                            onClick={() => window.open(`/uploads/${message.file!.filename}`, '_blank')}
                            className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded transition-colors"
                            title="Preview image"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                        )}
                        <button
                          onClick={() => downloadFile(message.file!.filename, message.file!.originalName)}
                          className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded transition-colors"
                          title="Download file"
                        >
                          <Download className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
        
        {/* Typing Indicator */}
        {typingUsers.length > 0 && (
          <div className="flex items-center gap-2 text-slate-600 text-sm">
            <div className="flex gap-1">
              <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"></div>
              <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
              <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
            </div>
            <span>
              {typingUsers.length === 1 
                ? `${typingUsers[0]} is typing...`
                : `${typingUsers.join(', ')} are typing...`
              }
            </span>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 border-t border-slate-200 bg-slate-50 rounded-b-lg">
        <form onSubmit={handleSendMessage} className="flex items-center gap-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => {
              setNewMessage(e.target.value);
              handleTyping();
            }}
            placeholder="Type your message..."
            className="flex-1 px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-transparent"
            disabled={!isConnected || sending}
          />
          
          <button
            type="button"
            onClick={() => setShowCodeModal(true)}
            className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-200 rounded-lg transition-colors"
            disabled={!isConnected || sending}
            title="Share code"
          >
            <Code className="h-5 w-5" />
          </button>
          
          <button
            type="button"
            onClick={() => setShowFileModal(true)}
            className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-200 rounded-lg transition-colors"
            disabled={!isConnected || sending}
            title="Upload file"
          >
            <Paperclip className="h-5 w-5" />
          </button>
          
          <button
            type="submit"
            disabled={!newMessage.trim() || !isConnected || sending}
            className="bg-slate-600 hover:bg-slate-700 text-white p-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {sending ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Send className="h-5 w-5" />
            )}
          </button>
        </form>
      </div>

      {/* Code Sharing Modal */}
      {showCodeModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-200 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-slate-900">Share Code</h2>
              <button
                onClick={() => setShowCodeModal(false)}
                className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Programming Language
                </label>
                <select
                  value={codeLanguage}
                  onChange={(e) => setCodeLanguage(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500"
                >
                  {codeLanguages.map(lang => (
                    <option key={lang.value} value={lang.value}>
                      {lang.label}
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Code Content
                </label>
                <textarea
                  value={codeContent}
                  onChange={(e) => setCodeContent(e.target.value)}
                  placeholder="Paste your code here..."
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500 font-mono text-sm resize-none"
                  rows={10}
                />
              </div>
              
              <div className="flex gap-4 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCodeModal(false)}
                  className="flex-1 px-6 py-3 text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSendCode}
                  disabled={!codeContent.trim() || sending}
                  className="flex-1 px-6 py-3 bg-slate-600 text-white rounded-lg hover:bg-slate-700 disabled:opacity-50 transition-colors font-medium flex items-center justify-center gap-2"
                >
                  {sending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Sharing...
                    </>
                  ) : (
                    'Share Code'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* File Upload Modal */}
      {showFileModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-md">
            <div className="p-6 border-b border-slate-200 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-slate-900">Upload Files</h2>
              <button
                onClick={() => setShowFileModal(false)}
                className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-700">
                  You can upload multiple files at once. Maximum file size: 10MB per file.
                </p>
              </div>
              
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  onChange={(e) => setSelectedFiles(e.target.files)}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500"
                />
              </div>
              
              {selectedFiles && selectedFiles.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-slate-700">Selected files:</p>
                  {Array.from(selectedFiles).map((file, index) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-slate-50 rounded">
                      <span className="text-sm text-slate-900">{file.name}</span>
                      <span className="text-xs text-slate-500">{formatFileSize(file.size)}</span>
                    </div>
                  ))}
                </div>
              )}
              
              <div className="flex gap-4 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowFileModal(false);
                    setSelectedFiles(null);
                    if (fileInputRef.current) {
                      fileInputRef.current.value = '';
                    }
                  }}
                  className="flex-1 px-6 py-3 text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={handleFileUpload}
                  disabled={!selectedFiles || selectedFiles.length === 0 || sending}
                  className="flex-1 px-6 py-3 bg-slate-600 text-white rounded-lg hover:bg-slate-700 disabled:opacity-50 transition-colors font-medium flex items-center justify-center gap-2"
                >
                  {sending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    'Upload Files'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatComponent;