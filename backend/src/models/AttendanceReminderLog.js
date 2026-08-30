const mongoose = require('mongoose');

const AttendanceReminderLogSchema = new mongoose.Schema({
    employeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    date: { type: String, required: true, index: true }, // Format: YYYY-MM-DD
    email: { type: String, required: true },
    status: {
        type: String,
        enum: ['SENT', 'FAILED', 'PENDING', 'NOT_REQUIRED'],
        default: 'PENDING',
        index: true
    },
    triggerType: {
        type: String,
        enum: ['AUTOMATIC', 'MANUAL'],
        default: 'AUTOMATIC'
    },
    sentAt: { type: Date },
    failureReason: { type: String },
    reason: { type: String, default: 'No Prior Information' },
    expectedLoginTime: { type: String }
}, { timestamps: true });

// Ensure idempotency for a given employee and date
AttendanceReminderLogSchema.index({ employeeId: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('AttendanceReminderLog', AttendanceReminderLogSchema);
