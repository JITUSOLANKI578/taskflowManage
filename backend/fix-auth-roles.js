import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './models/User.js';

dotenv.config();

const fixAuthRoles = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('MongoDB connected');

    // Fix existing masteradmin users to admin role
    const result = await User.updateMany(
      { role: 'masteradmin' },
      { $set: { role: 'admin' } }
    );
    
    console.log(`Updated ${result.modifiedCount} users from 'masteradmin' to 'admin' role`);

    // Verify the admin user exists with correct role
    const adminUser = await User.findOne({ email: 'admin@example.com' });
    if (adminUser) {
      console.log('Admin user found:', {
        email: adminUser.email,
        role: adminUser.role,
        isActive: adminUser.isActive
      });
      
      if (adminUser.role !== 'admin') {
        adminUser.role = 'admin';
        await adminUser.save();
        console.log('Fixed admin user role to "admin"');
      }
    } else {
      console.log('Creating new admin user...');
      await User.create({
        name: 'Admin',
        email: 'admin@example.com',
        password: 'admin123',
        role: 'admin',
        isActive: true
      });
      console.log('New admin user created with role "admin"');
    }

    console.log('Auth role fix completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error fixing auth roles:', error);
    process.exit(1);
  }
};

fixAuthRoles();
