require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../src/models/User');

const setupProductionAuth = async () => {
    try {
        console.log('Connecting to MongoDB...');
        if (!process.env.MONGODB_URI) {
            throw new Error('MONGODB_URI is not defined in the environment variables.');
        }

        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Database connected successfully.');

        // 1. Identify and disable old demo accounts
        console.log('Disabling old demo/test accounts...');
        const demoEmails = ['admin@techzon.com', 'arun@techzon.com'];
        const result = await User.updateMany(
            { email: { $in: demoEmails } },
            { $set: { status: 'INACTIVE', isActive: false } }
        );
        console.log(`Disabled ${result.modifiedCount} demo accounts.`);

        // 2. Setup Production Admin
        const adminName = process.env.INITIAL_ADMIN_NAME;
        const adminEmail = process.env.INITIAL_ADMIN_EMAIL;
        const adminPassword = process.env.INITIAL_ADMIN_PASSWORD;

        if (!adminName || !adminEmail || !adminPassword) {
            console.warn('INITIAL_ADMIN_* variables are not fully set in .env.');
            console.warn('Skipping initial admin creation.');
            return;
        }

        let adminUser = await User.findOne({ email: adminEmail });
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(adminPassword, salt);

        if (adminUser) {
            console.log(`Admin account with email ${adminEmail} already exists. Updating credentials and setting ACTIVE.`);
            adminUser.passwordHash = passwordHash;
            adminUser.name = adminName;
            adminUser.role = 'ADMIN';
            adminUser.status = 'ACTIVE';
            adminUser.isActive = true;
            adminUser.mustChangePassword = false;
            await adminUser.save();
            console.log('Production admin account updated successfully.');
        } else {
            console.log(`Creating initial production admin account for ${adminEmail}...`);
            adminUser = await User.create({
                name: adminName,
                email: adminEmail,
                passwordHash,
                role: 'ADMIN',
                status: 'ACTIVE',
                isActive: true,
                mustChangePassword: false
            });
            console.log('Production admin account created successfully.');
        }
    } catch (error) {
        console.error('Error during setup:', error);
    } finally {
        await mongoose.disconnect();
        console.log('Database disconnected.');
    }
};

setupProductionAuth();
