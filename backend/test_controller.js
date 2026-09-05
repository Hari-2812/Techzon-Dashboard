const mongoose = require('mongoose');
const { getTodayAdminAttendance } = require('./src/controllers/admin-attendance.controller');

mongoose.connect('mongodb://127.0.0.1:27017/techzon_crm').then(async () => {
    const req = { query: {}, headers: {} };
    const res = { 
        json: (data) => {
            console.log(JSON.stringify(data, null, 2));
            process.exit(0);
        },
        status: (code) => ({ json: (data) => console.log('Error', code, data) })
    };
    await getTodayAdminAttendance(req, res);
});
