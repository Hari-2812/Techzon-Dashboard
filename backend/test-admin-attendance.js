const mongoose = require('mongoose');
const { getTodayAdminAttendance } = require('./src/controllers/admin-attendance.controller');

async function test() {
    await mongoose.connect('mongodb://localhost:27017/techzon_crm');
    
    // Mock req, res
    const req = {};
    const res = {
        json: (data) => console.log('Response:', JSON.stringify(data, null, 2)),
        status: (code) => {
            console.log('Status code:', code);
            return res;
        }
    };
    
    console.log('Testing getTodayAdminAttendance...');
    await getTodayAdminAttendance(req, res);
    mongoose.connection.close();
}
test();
