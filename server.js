const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const adminRoutes = require('./routes/adminRoutes');
const internRoutes = require('./routes/internRoutes');

const app = express();

// Middlewares
app.use(cors({
  origin: '*', // In production, restrict to frontend URL
  credentials: true
}));
app.use(express.json());

// Ensure uploads folder exists
const uploadsPath = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsPath)) {
  fs.mkdirSync(uploadsPath, { recursive: true });
}

// Static Route for Uploaded Images & Documents (Supports direct and /interns subpath)
app.use('/uploads', express.static(uploadsPath));
app.use('/interns/uploads', express.static(uploadsPath));

// Routes (Supports direct, root, and /interns subpath proxying)
app.use('/api/admin', adminRoutes);
app.use('/api/intern', internRoutes);
app.use('/interns/api/admin', adminRoutes);
app.use('/interns/api/intern', internRoutes);

// Root route for server verification
app.get('/', (req, res) => {
  res.json({
    message: 'Internship Management System API is running',
    databaseMode: global.USE_LOCAL_DB ? 'Embedded Local JSON Database' : 'MongoDB'
  });
});

// Port and DB Connection
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/intern_management';

// Connect with a 2-second timeout. If MongoDB is not installed/running, fallback to local JSON database instantly!
mongoose.connect(MONGO_URI, { serverSelectionTimeoutMS: 2000 })
  .then(() => {
    console.log('✅ MongoDB connected successfully.');
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT} [MongoDB Mode]`);
    });
  })
  .catch(err => {
    global.USE_LOCAL_DB = true;
    console.log('\n=============================================================');
    console.log('⚡ FAST STARTUP: MongoDB is offline or not installed.');
    console.log('⚡ Automatically activated Embedded Local JSON Database.');
    console.log('📁 Data will persist seamlessly in: backend/data.json');
    console.log('=============================================================\n');
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT} [Fast Embedded DB Mode]`);
    });
  });
