const mongoose = require('mongoose');
const User = require('../src/models/User');
const Lead = require('../src/models/Lead');
const CRProfile = require('../src/models/CRProfile');
const FollowUp = require('../src/models/FollowUp');
const WhatsAppGroup = require('../src/models/WhatsAppGroup');
const GroupStudent = require('../src/models/GroupStudent');
const LeadActivity = require('../src/models/LeadActivity');
const CRActivity = require('../src/models/CRActivity');
const StudentCRRelationship = require('../src/models/StudentCRRelationship');
const AuditLog = require('../src/models/AuditLog');
const WorkSession = require('../src/models/WorkSession');
const AttendanceDaily = require('../src/models/AttendanceDaily');
require('dotenv').config();

const resetDB = async () => {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/techzon');
        console.log('Connected.');

        console.log('Wiping CRM and Attendance collections...');
        await Lead.deleteMany({});
        await CRProfile.deleteMany({});
        await FollowUp.deleteMany({});
        await WhatsAppGroup.deleteMany({});
        await GroupStudent.deleteMany({});
        await LeadActivity.deleteMany({});
        await CRActivity.deleteMany({});
        await StudentCRRelationship.deleteMany({});
        await AuditLog.deleteMany({});
        await WorkSession.deleteMany({});
        await AttendanceDaily.deleteMany({});
        
        console.log('Removing mock users (except admin and arun)...');
        await User.deleteMany({ email: { $nin: ['admin@techzon.com', 'arun@techzon.com'] } });

        console.log('Database reset complete.');
        process.exit(0);
    } catch (error) {
        console.error('Error resetting database:', error);
        process.exit(1);
    }
};

resetDB();
