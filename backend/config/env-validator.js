import dotenv from 'dotenv';

dotenv.config();

const requiredEnvVars = [
  'JWT_SECRET',
  'JWT_EXPIRE',
  'MASTER_ADMIN_EMAIL',
  'MASTER_ADMIN_PASSWORD',
  'MONGODB_URI',
  'PORT'
];

export const validateEnv = () => {
  const missing = requiredEnvVars.filter(envVar => !process.env[envVar]);
  
  if (missing.length > 0) {
    console.error('Missing required environment variables:', missing);
    process.exit(1);
  }
  
  console.log('✅ All required environment variables are set');
};

// Set default values if not provided
process.env.JWT_EXPIRE = process.env.JWT_EXPIRE || '30d';
process.env.PORT = process.env.PORT || '5000';
