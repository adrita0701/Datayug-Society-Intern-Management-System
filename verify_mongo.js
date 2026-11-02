const mongoose = require('mongoose');
require('dotenv').config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/intern_management';

console.log('Connecting to MongoDB at:', MONGO_URI);
mongoose.connect(MONGO_URI)
  .then(() => {
    console.log('Connection successful! MongoDB is up and running.');
    process.exit(0);
  })
  .catch(err => {
    console.error('Connection failed:', err.message);
    process.exit(1);
  });
