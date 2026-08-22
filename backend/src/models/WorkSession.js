const mongoose = require('mongoose');
const { Schema } = mongoose;

const WorkSessionSchema = new mongoose.Schema({
    employeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    date: { type: String, required: true, index: true },
    clockInAt: { type: Date, required: true },
    clockOutAt: { type: Date },
    status: {
        type: String,
        enum: ['ACTIVE', 'COMPLETED', 'MISSING_CLOCK_OUT', 'REQUIRES_REVIEW'],
        default: 'ACTIVE',
        index: true
    },
    isTestSession: { type: Boolean, default: false },
    clockInVerification: {
        method: String,
        latitude: Number,
        longitude: Number,
        accuracy: Number,
        distanceFromOffice: Number,
        verifiedAt: Date,
        ipAddress: String,
        status: String
    },
    clockOutVerification: {
        method: String,
        latitude: Number,
        longitude: Number,
        accuracy: Number,
        distanceFromOffice: Number,
        verifiedAt: Date,
        ipAddress: String,
        status: String
    },
    breaks: [{
            startAt: { type: Date, required: true },
            endAt: { type: Date },
            reason: { type: String, enum: ['Lunch', 'Tea / Coffee', 'Personal Work', 'Client Discussion', 'Internal Meeting', 'Technical Issue', 'Training', 'Official Work', 'Other'] },
            comment: { type: String },
            resumeComment: { type: String },
            durationMinutes: { type: Number, default: 0 }
        }]
}, { timestamps: true });

// Ensure one active session per day
WorkSessionSchema.index({ employeeId: 1, date: 1, isTestSession: 1 });

module.exports = mongoose.model('WorkSession', WorkSessionSchema);
