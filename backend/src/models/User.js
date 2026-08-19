const mongoose = require('mongoose');
const { Schema } = mongoose;

const UserSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, index: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ['ADMIN', 'RGS', 'BDE'], required: true },
    phone: { type: String },
    
    // Employee Specific Fields
    employeeId: { type: String, unique: true, sparse: true, index: true },
    profilePhoto: { type: String },
    joiningDate: { type: Date },
    department: { type: String },
    designation: { type: String },
    status: { type: String, enum: ['ACTIVE', 'INVITED', 'SUSPENDED', 'INACTIVE'], default: 'ACTIVE' },
    isActive: { type: Boolean, default: true }, // Keeping for backwards compatibility
    
    dob: { type: Date },
    gender: { type: String, enum: ['Male', 'Female', 'Other'] },
    employmentType: { type: String, enum: ['Full Time', 'Part Time', 'Intern', 'Contract'] },
    workLocation: { type: String },
    
    emergencyContact: {
        name: { type: String },
        phone: { type: String },
        relationship: { type: String }
    },
    
    mustChangePassword: { type: Boolean, default: false }
}, { timestamps: true });

module.exports = mongoose.model('User', UserSchema);
