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
    breaks: [{
            startAt: { type: Date, required: true },
            endAt: { type: Date },
            reason: { type: String, enum: ['Lunch', 'Tea / Coffee', 'Personal Work', 'Client Discussion', 'Internal Meeting', 'Technical Issue', 'Training', 'Official Work', 'Other'] },
            comment: { type: String },
            resumeComment: { type: String },
            durationMinutes: { type: Number, default: 0 }
        }]
}, { timestamps: true });

module.exports = mongoose.model('WorkSession', WorkSessionSchema);
