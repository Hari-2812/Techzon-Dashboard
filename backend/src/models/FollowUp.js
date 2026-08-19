const mongoose = require('mongoose');
const { Schema } = mongoose;

const FollowUpSchema = new mongoose.Schema({
    leadId: { type: mongoose.Schema.Types.ObjectId, ref: 'Lead', index: true },
    crId: { type: mongoose.Schema.Types.ObjectId, ref: 'CRProfile', index: true },
    assignedEmployeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    type: {
        type: String,
        enum: ['Student Verification', 'CR Identification', 'CR First Contact', 'CR Follow-up', 'Group Creation', 'Group Link Collection', 'Student Joining Follow-up', 'Final Follow-up'],
        required: true
    },
    dueDate: { type: Date, required: true, index: true },
    priority: { type: String, enum: ['HIGH', 'MEDIUM', 'LOW'], default: 'MEDIUM' },
    notes: { type: String },
    status: { type: String, enum: ['Pending', 'Completed', 'Rescheduled', 'Cancelled'], default: 'Pending', index: true },
    completedAt: { type: Date }
}, { timestamps: true });

module.exports = mongoose.model('FollowUp', FollowUpSchema);
