import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './models/User.js';
import Company from './models/Company.js';

dotenv.config();

const createAdminUser = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('MongoDB connected');

    // Check if admin already exists
    const existingAdmin = await User.findOne({ email: 'admin@example.com' });
    if (existingAdmin) {
      console.log('Admin user already exists:', existingAdmin.email);
      console.log('Login with: admin@example.com / password: admin123');
      process.exit(0);
    }

    // Create a company first
    const company = await Company.create({
      name: 'Test Company',
      description: 'Test company for admin user',
      admin: null, // Will be updated after user creation
      isActive: true
    });

    // Create admin user
    const adminUser = await User.create({
      name: 'Admin User',
      email: 'admin@example.com',
      password: 'admin123',
      role: 'admin',
      company: company._id,
      isActive: true
    });

    // Update company admin
    company.admin = adminUser._id;
    await company.save();

    console.log('Admin user created successfully!');
    console.log('Login with: admin@example.com / password: admin123');
    console.log('Role: admin');
    console.log('Company: Test Company');
    process.exit(0);
  } catch (error) {
    console.error('Error creating admin user:', error);
    process.exit(1);
  }
};

createAdminUser();
