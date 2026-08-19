const mongoose = require('mongoose');
const { Schema } = mongoose;

const AttendanceDailySchema = new mongoose.Schema({
    employeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    date: { type: String, required: true, index: true },
    scheduledMinutes: { type: Number, default: 0 },
    workedMinutes: { type: Number, default: 0 },
    breakMinutes: { type: Number, default: 0 },
    lateMinutes: { type: Number, default: 0 },
    earlyLeaveMinutes: { type: Number, default: 0 },
    overtimeMinutes: { type: Number, default: 0 },
    status: {
        type: String,
        enum: ['PRESENT', 'LATE', 'HALF_DAY', 'ABSENT', 'PAID_LEAVE', 'HOLIDAY', 'WEEK_OFF', 'EARLY_LEAVE', 'OVERTIME', 'REQUIRES_REVIEW'],
        required: true,
        index: true
    },
    correctionStatus: { type: String, enum: ['Pending', 'Approved', 'Rejected'] },
    correctionReason: { type: String },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    approvedAt: { type: Date },
    isLocked: { type: Boolean, default: false },
    isTestSession: { type: Boolean, default: false }
}, { timestamps: true });

AttendanceDailySchema.index({ employeeId: 1, date: 1, isTestSession: 1 }, { unique: true });

module.exports = mongoose.model('AttendanceDaily', AttendanceDailySchema);
