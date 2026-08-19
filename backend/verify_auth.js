require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./src/models/User');

async function run() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const users = await User.find({ email: { $in: ['admin@techzon.com', 'arun@techzon.com'] } });
        console.log(JSON.stringify(users, null, 2));
    } catch (e) {
        console.error("Error:", e);
    } finally {
        await mongoose.disconnect();
    }
}

run();
