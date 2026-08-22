const mongoose = require('mongoose');

const AttendanceRequestSchema = new mongoose.Schema({
    employeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    date: { type: String, required: true, index: true },
    requestType: {
        type: String,
        enum: ['CLOCK_IN', 'CLOCK_OUT'],
        required: true,
        index: true
    },
    status: {
        type: String,
        enum: ['PENDING', 'APPROVED', 'REJECTED'],
        default: 'PENDING',
        index: true
    },
    requestedTime: { type: Date, required: true },
    reviewedAt: { type: Date },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    location: {
        latitude: { type: Number },
        longitude: { type: Number },
        accuracy: { type: Number },
        distanceFromOffice: { type: Number },
        insideOfficeRadius: { type: Boolean },
        capturedAt: { type: Date }
    },
    adminComment: { type: String },
    rejectionReason: { type: String },
    isTestSession: { type: Boolean, default: false }
}, { timestamps: true });

AttendanceRequestSchema.index({ employeeId: 1, date: 1, requestType: 1, status: 1 });

module.exports = mongoose.model('AttendanceRequest', AttendanceRequestSchema);
