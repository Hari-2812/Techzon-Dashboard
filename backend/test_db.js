const mongoose = require('mongoose');
mongoose.connect('mongodb://127.0.0.1:27017/techzon_crm').then(async () => {
    const User = mongoose.model('User', new mongoose.Schema({}, { strict: false }));
    const users = await User.find({ isActive: true });
    console.log('Active users:', users.length);
    const employees = await User.find({ isActive: true, role: { $ne: 'ADMIN' } });
    console.log('Employees:', employees.length);
    console.log(JSON.stringify(employees, null, 2));
    process.exit(0);
});
