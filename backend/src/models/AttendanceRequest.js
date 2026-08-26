const mongoose = require('mongoose');

const AttendanceRequestSchema = new mongoose.Schema({
    employeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    date: { type: String, required: true, index: true },
    requestType: {
        type: String,
        enum: ['CHECK_IN', 'CHECK_OUT', 'BREAK'],
        required: true,
        index: true
    },
    breakReason: { type: String },
    status: {
        type: String,
        enum: ['PENDING', 'APPROVED', 'REJECTED'],
        default: 'PENDING',
        index: true
    },
    requestedTime: { type: Date, required: true },
    reviewedAt: { type: Date },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    location: { type: mongoose.Schema.Types.Mixed },
    adminComment: { type: String },
    rejectionReason: { type: String },
    isTestSession: { type: Boolean, default: false }
}, { timestamps: true });

AttendanceRequestSchema.index({ employeeId: 1, date: 1, requestType: 1, status: 1 });

module.exports = mongoose.model('AttendanceRequest', AttendanceRequestSchema);
