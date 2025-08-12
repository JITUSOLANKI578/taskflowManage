import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  role: {
    type: String,
    enum: ['masteradmin', 'admin', 'employee', 'team_leader', 'bug_fixer'],
    default: 'employee'
  },
  company: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: function() {
      // Only require company for existing users (not during initial creation)
      return this.role !== 'masteradmin' && this.isNew === false;
    }
  },
  teams: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Team'
  }],
  isActive: {
    type: Boolean,
    default: true
  },
  lastLogin: {
    type: Date
  },
  avatar: {
    type: String,
    default: null
  },
  phone: {
    type: String,
    default: null
  },
  department: {
    type: String,
    default: null
  },
  position: {
    type: String,
    default: null
  },
  location: {
    type: String,
    default: null
  },
  skills: [{
    type: String
  }],
  bio: {
    type: String,
    default: null
  },
  socialLinks: {
    linkedin: String,
    github: String,
    twitter: String
  },
  stats: {
    projectsCompleted: { type: Number, default: 0 },
    tasksCompleted: { type: Number, default: 0 },
    averageRating: { type: Number, default: 0 },
    totalHours: { type: Number, default: 0 }
  }
}, {
  timestamps: true
});

userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

userSchema.methods.comparePassword = async function(password) {
  return await bcrypt.compare(password, this.password);
};

export default mongoose.model('User', userSchema);