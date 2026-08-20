const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');

const initializeDefaultAdmin = async () => {
    try {
        console.log('Checking default Admin account...');

        // 1. Identify and disable old demo accounts
        const demoEmails = ['admin@techzon.com', 'arun@techzon.com'];
        // We only want to disable them if they are still active and they are NOT the chosen admin email
        const adminEmail = process.env.INITIAL_ADMIN_EMAIL;
        
        const emailsToDisable = demoEmails.filter(email => email !== adminEmail);
        
        if (emailsToDisable.length > 0) {
            await User.updateMany(
                { email: { $in: emailsToDisable } },
                { $set: { status: 'INACTIVE', isActive: false } }
            );
        }

        // 2. Setup Production Admin
        const adminName = process.env.INITIAL_ADMIN_NAME;
        const adminPassword = process.env.INITIAL_ADMIN_PASSWORD;

        if (!adminName || !adminEmail || !adminPassword) {
            console.warn('INITIAL_ADMIN_* variables are not fully set in .env. Skipping initial admin creation.');
            return;
        }

        let adminUser = await User.findOne({ email: adminEmail });

        if (adminUser) {
            console.log('Default Admin already exists. Making sure it is active.');
            // Only update non-destructive fields if needed to ensure they can log in
            if (!adminUser.isActive || adminUser.status !== 'ACTIVE' || adminUser.role !== 'ADMIN') {
                adminUser.isActive = true;
                adminUser.status = 'ACTIVE';
                adminUser.role = 'ADMIN';
                await adminUser.save();
                console.log('Admin account was inactive, it has been reactivated.');
            }
        } else {
            console.log('Creating default Admin...');
            const salt = await bcrypt.genSalt(12);
            const passwordHash = await bcrypt.hash(adminPassword, salt);

            adminUser = await User.create({
                name: adminName,
                email: adminEmail,
                passwordHash,
                role: 'ADMIN',
                status: 'ACTIVE',
                isActive: true,
                mustChangePassword: false
            });
            console.log('Default Admin created successfully.');
        }
    } catch (error) {
        console.error('Error during default Admin initialization:', error);
    }
};

module.exports = initializeDefaultAdmin;
