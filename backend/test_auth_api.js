require('dotenv').config();
const mongoose = require('mongoose');
const { server } = require('./src/server');

async function run() {
    try {
        await new Promise(resolve => setTimeout(resolve, 2000)); // wait for db
        
        const res = await fetch(`http://localhost:${process.env.PORT || 5000}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'admin@techzon.com', password: 'password123' })
        });
        
        const data = await res.json();
        console.log("Status:", res.status);
        console.log("Body:", JSON.stringify(data, null, 2));

    } catch (e) {
        console.error("Error:", e);
    } finally {
        server.close();
        await mongoose.disconnect();
        process.exit(0);
    }
}
run();
