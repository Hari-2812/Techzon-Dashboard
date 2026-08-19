require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const User = require('./models/User');
const Lead = require('./models/Lead');
const CRProfile = require('./models/CRProfile');
const StudentCRRelationship = require('./models/StudentCRRelationship');

async function seedDatabase() {
  try {
    if (process.env.NODE_ENV === 'production') {
      console.log('❌ Seeding is disabled in production environments.');
      process.exit(1);
    }

    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/techzon_crm';
    await mongoose.connect(mongoUri);
    console.log('📦 Connected to MongoDB for seeding...');

    // Clear existing data
    await User.deleteMany({});
    await Lead.deleteMany({});
    await CRProfile.deleteMany({});
    await StudentCRRelationship.deleteMany({});
    console.log('Cleared existing data.');

    // Seed Users
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash('password123', salt);

    const admin = await User.create({
      name: 'Hari Admin',
      email: 'admin@techzon.com',
      passwordHash,
      role: 'ADMIN',
      phone: '9876543210'
    });

    const rgs1 = await User.create({
      name: 'Arun RGS',
      email: 'arun@techzon.com',
      passwordHash,
      role: 'RGS',
      phone: '9876543211'
    });

    const bde1 = await User.create({
      name: 'Priya BDE',
      email: 'priya@techzon.com',
      passwordHash,
      role: 'BDE',
      phone: '9876543212'
    });

    console.log('Created Users.');

    // Seed Leads
    const leadsData = [];
    for (let i = 1; i <= 50; i++) {
      leadsData.push({
        studentName: `Student ${i}`,
        phone: `9000000${i.toString().padStart(3, '0')}`,
        college: 'PSNA College of Engineering and Technology',
        department: 'CSE',
        year: '3rd Year',
        assignedEmployeeId: (i % 2 === 0) ? rgs1._id : bde1._id,
        crStatus: 'Not Verified',
        leadStatus: 'New'
      });
    }
    const createdLeads = await Lead.insertMany(leadsData);
    console.log(`Created ${createdLeads.length} Leads.`);

    // Seed a CR and Relationship
    const cr = await CRProfile.create({
      crName: 'Rahul Sharma (CR)',
      phone: '9111111111',
      college: 'PSNA College of Engineering and Technology',
      department: 'CSE',
      year: '3rd Year',
      section: 'A',
      assignedEmployeeId: rgs1._id,
      status: 'Contacted'
    });

    // Link some students to this CR
    await StudentCRRelationship.create([
      { studentId: createdLeads[0]._id, crId: cr._id, source: 'Student Claimed' },
      { studentId: createdLeads[1]._id, crId: cr._id, source: 'Student Referred' }
    ]);
    console.log('Created CR Profile and Relationships.');

    console.log('✅ Seeding completed successfully.');
    process.exit(0);
  } catch (err) {
    console.error('❌ Seeding failed:', err);
    process.exit(1);
  }
}

seedDatabase();
