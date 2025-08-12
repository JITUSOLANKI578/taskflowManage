import mongoose from 'mongoose';

const chatMessageSchema = new mongoose.Schema({
  project: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    required: true
  },
  task: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Task'
  },
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  content: {
    type: String,
    required: function() {
      return !this.file && !this.code;
    }
  },
  messageType: {
    type: String,
    enum: ['text', 'file', 'code'],
    default: 'text'
  },
  file: {
    filename: String,
    originalName: String,
    path: String,
    size: Number,
    mimeType: String
  },
  code: {
    language: String,
    content: String
  },
  isEdited: {
    type: Boolean,
    default: false
  },
  editedAt: Date
}, {
  timestamps: true
});

export default mongoose.model('ChatMessage', chatMessageSchema);