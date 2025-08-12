import bcrypt from 'bcryptjs';
import User from '../models/User.js';

export const createMasterAdmin = async () => {
  try {
    const existingMaster = await User.findOne({ role: 'masteradmin' });
    
    if (!existingMaster) {
      const hashedPassword = await bcrypt.hash(process.env.MASTER_ADMIN_PASSWORD, 12);
      
      await User.create({
        name: 'Master Admin',
        email: process.env.MASTER_ADMIN_EMAIL,
        password: hashedPassword,
        role: 'masteradmin',
        isActive: true
      });
      
      console.log('Master admin created successfully');
    }
  } catch (error) {
    console.error('Error creating master admin:', error);
  }
};