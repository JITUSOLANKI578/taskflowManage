import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './models/User.js';

dotenv.config();

const createMasterAdminUser = async () => {
  try {
    // Validate environment variables
    if (!process.env.MONGODB_URI) {
      console.error('❌ MONGODB_URI is not defined in your environment variables.');
      console.error('Please check your .env file and ensure MONGODB_URI is set.');
      console.error('Example: MONGODB_URI=mongodb://localhost:27017/task-management');
      process.exit(1);
    }

    // Connect to MongoDB
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB connected successfully');

    // Check if master admin already exists
    const existingAdmin = await User.findOne({ email: 'admin@example.com' });
    if (existingAdmin) {
      console.log('Admin user already exists:', existingAdmin.email);
      console.log('Login with: admin@example.com / password: admin123');
      process.exit(0);
    }

    // Create master admin user (no company required for masteradmin role)
    const adminUser = await User.create({
      name: 'Master Admin',
      email: 'admin@example.com',
      password: 'admin123',
      role: 'masteradmin',
      isActive: true
    });
     const admin = await User.create({
      name: 'Master Admin',
      email: 'admin1@example.com',
      password: 'admin123',
      role: 'admin',
      isActive: true
    });

    console.log('Master admin user created successfully!');
    console.log('Login with: admin@example.com / password: admin123');
    console.log('Role: masteradmin');
    process.exit(0);
  } catch (error) {
    console.error('Error creating admin user:', error);
    process.exit(1);
  }
};

createMasterAdminUser();
