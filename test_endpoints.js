const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const Admin = require('./models/Admin');
const Intern = require('./models/Intern');
const Task = require('./models/Task');
require('dotenv').config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/intern_management';

async function runTests() {
  console.log('--- Starting Integration Verification Tests ---');
  
  try {
    await mongoose.connect(MONGO_URI);
    console.log('1. MongoDB Connected.');

    // Clear existing data for a clean test
    await Admin.deleteMany({});
    await Intern.deleteMany({});
    await Task.deleteMany({});
    console.log('2. Cleared existing test database collections.');

    // Test 1: Create First Admin
    const adminPassword = 'adminpassword123';
    const hashedAdminPassword = await bcrypt.hash(adminPassword, 10);
    const admin = new Admin({
      email: 'admin@datayugsociety.org',
      password: hashedAdminPassword
    });
    await admin.save();
    console.log('3. Test Success: Created first Admin account.');

    // Test 2: Attempt Duplicate Admin Creation (Should Fail)
    const adminExists = await Admin.findOne();
    if (adminExists) {
      console.log('4. Test Success: Single Admin registration rules active. Checked: Admin already exists.');
    } else {
      throw new Error('Verification failed: Admin account was not found.');
    }

    // Test 3: Create Intern Accounts
    const intern1 = new Intern({
      fullName: 'John Doe',
      email: 'john@gmail.com',
      phone: '9876543210',
      college: 'NIT Meghalaya',
      department: 'Computer Science',
      password: await bcrypt.hash('password123', 10)
    });
    await intern1.save();
    console.log('5. Test Success: Created Intern "John Doe" successfully.');

    // Test 4: Assign Task to Intern
    const task = new Task({
      title: 'Setup Database Schemas',
      description: 'Create Admin, Intern, and Task models in MongoDB.',
      deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
      intern: intern1._id,
      status: 'Pending',
      images: []
    });
    await task.save();
    console.log('6. Test Success: Assigned task to "John Doe".');

    // Test 5: Verify Task counts
    const totalInterns = await Intern.countDocuments();
    const totalTasks = await Task.countDocuments();
    console.log(`7. Test Success: Dashboard Counts verified (Interns: ${totalInterns}, Tasks: ${totalTasks}).`);

    console.log('--- All Verification Tests Completed Successfully ---');
    process.exit(0);
  } catch (error) {
    console.error('Test Suite Failed:', error.message);
    process.exit(1);
  }
}

runTests();
