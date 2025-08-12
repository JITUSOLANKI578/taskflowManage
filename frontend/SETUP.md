# Task Management System Setup Guide

## Prerequisites
- Node.js (v16 or higher)
- MongoDB (local installation or MongoDB Atlas)
- npm or yarn package manager

## Environment Setup

### 1. Install Dependencies
```bash
npm install
```

### 2. Environment Variables
Copy the example environment file and update with your values:

```bash
cp .env.example .env
```

Edit `.env` file with your configuration:

```env
# Server Configuration
PORT=5000

# Database - Choose one option:

# Option A: Local MongoDB
MONGODB_URI=mongodb://localhost:27017/task-management

# Option B: MongoDB Atlas (Cloud)
# MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/task-management?retryWrites=true&w=majority

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRE=30d

# Master Admin Credentials
MASTER_ADMIN_EMAIL=admin@example.com
MASTER_ADMIN_PASSWORD=admin123
```

### 3. Database Setup
Ensure MongoDB is running:
- **Local MongoDB**: Start MongoDB service
- **MongoDB Atlas**: Ensure your cluster is running and whitelist your IP

### 4. Create Master Admin User
```bash
cd server
node seed-master-admin.js
```

This will create the master admin user with the credentials specified in your .env file.

### 5. Start the Development Server
```bash
# Terminal 1 - Start the backend
npm run dev:server

# Terminal 2 - Start the frontend
npm run dev
```

## Troubleshooting

### MongoDB Connection Issues
If you see "MONGODB_URI is not defined":
1. Ensure `.env` file exists in the project root
2. Ensure MONGODB_URI is properly set in `.env`
3. Ensure MongoDB is running and accessible

### Common MongoDB URI Formats
- **Local**: `mongodb://localhost:27017/database-name`
- **With authentication**: `mongodb://username:password@localhost:27017/database-name`
- **MongoDB Atlas**: `mongodb+srv://username:password@cluster.mongodb.net/database-name`

### Port Already in Use
If port 5000 is already in use, change the PORT in `.env` file:
```env
PORT=5001
```

## Verification
After setup, you should be able to:
1. Access the application at `http://localhost:5173`
2. Login with master admin credentials
3. Create additional users and companies
