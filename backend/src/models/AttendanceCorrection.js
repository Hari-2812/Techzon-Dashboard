const mongoose = require('mongoose');
const { Schema } = mongoose;

const AttendanceCorrectionSchema = new mongoose.Schema({
    employeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    date: { type: String, required: true, index: true },
    type: { type: String, required: true }, // e.g. "Missing Clock-Out", "Incorrect Break"
    reason: { type: String, required: true },
    comment: { type: String },
    status: {
        type: String,
        enum: ['PENDING', 'APPROVED', 'REJECTED'],
        default: 'PENDING'
    }
}, { timestamps: true });

module.exports = mongoose.model('AttendanceCorrection', AttendanceCorrectionSchema);
