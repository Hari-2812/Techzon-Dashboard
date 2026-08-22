const mongoose = require('mongoose');
const { Schema } = mongoose;

const AttendanceVerificationLogSchema = new mongoose.Schema({
    employeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    action: { type: String, enum: ['CLOCK_IN', 'CLOCK_OUT'], required: true },
    timestamp: { type: Date, required: true },
    latitude: { type: Number },
    longitude: { type: Number },
    accuracy: { type: Number },
    distanceFromOffice: { type: Number },
    verificationStatus: { type: String, enum: ['VERIFIED', 'REJECTED', 'BYPASSED'], required: true },
    failureReason: { type: String },
    ipAddress: { type: String },
    userAgent: { type: String },
    isTest: { type: Boolean, default: false }
}, { timestamps: true });

// Create indexes
AttendanceVerificationLogSchema.index({ employeeId: 1, timestamp: -1 });
AttendanceVerificationLogSchema.index({ verificationStatus: 1 });
AttendanceVerificationLogSchema.index({ action: 1 });

module.exports = mongoose.model('AttendanceVerificationLog', AttendanceVerificationLogSchema);
