import mongoose from 'mongoose';
import User from '../models/User.js';
import Company from '../models/Company.js';
import dotenv from 'dotenv';

dotenv.config();

const fixCompanyAssignment = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/taskmanager');
    
    console.log('Connected to MongoDB');
    
    // Find users without company assignment
    const usersWithoutCompany = await User.find({ 
      $or: [
        { company: null },
        { company: { $exists: false } }
      ]
    });
    
    console.log(`Found ${usersWithoutCompany.length} users without company assignment`);
    
    if (usersWithoutCompany.length > 0) {
      // Get the first company as default (you may want to customize this)
      const defaultCompany = await Company.findOne();
      
      if (defaultCompany) {
        console.log(`Using company ${defaultCompany.name} as default`);
        
        // Update users with default company
        const result = await User.updateMany(
          { 
            $or: [
              { company: null },
              { company: { $exists: false } }
            ]
          },
          { $set: { company: defaultCompany._id } }
        );
        
        console.log(`Updated ${result.modifiedCount} users with company assignment`);
      } else {
        console.log('No companies found. Please create a company first.');
      }
    }
    
    console.log('Company assignment fix completed');
    process.exit(0);
  } catch (error) {
    console.error('Error fixing company assignment:', error);
    process.exit(1);
  }
};

fixCompanyAssignment();
