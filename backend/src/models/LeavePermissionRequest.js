const mongoose = require('mongoose');

const LeavePermissionRequestSchema = new mongoose.Schema({
    employeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    requestType: {
        type: String,
        enum: ['LEAVE', 'PERMISSION'],
        required: true,
        index: true
    },
    date: { type: String, required: true, index: true }, // Format: YYYY-MM-DD
    startTime: { type: String }, // Format: HH:mm (Required for PERMISSION)
    endTime: { type: String }, // Format: HH:mm (Required for PERMISSION)
    reason: { type: String, required: true },
    status: {
        type: String,
        enum: ['PENDING', 'APPROVED', 'REJECTED', 'CANCELLED'],
        default: 'PENDING',
        index: true
    },
    adminRemarks: { type: String },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    approvedAt: { type: Date },
    rejectedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    rejectedAt: { type: Date }
}, { timestamps: true });

LeavePermissionRequestSchema.index({ employeeId: 1, date: 1, requestType: 1, status: 1 });

module.exports = mongoose.model('LeavePermissionRequest', LeavePermissionRequestSchema);
