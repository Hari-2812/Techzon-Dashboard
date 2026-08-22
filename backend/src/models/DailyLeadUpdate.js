const mongoose = require('mongoose');

const DailyLeadUpdateSchema = new mongoose.Schema({
    employeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    leadId: { type: mongoose.Schema.Types.ObjectId, ref: 'Lead', required: true, index: true },
    studentSnapshot: {
        studentName: String,
        phone: String,
        college: String,
        department: String,
        year: String
    },
    callOutcome: { type: String },
    studentResponse: { type: String },
    leadStatus: { type: String },
    crStatus: { type: String },
    salesStatus: { type: String },
    courseInterested: { type: String },
    followUpRequired: { type: Boolean, default: false },
    followUpId: { type: mongoose.Schema.Types.ObjectId, ref: 'FollowUp' },
    nextFollowUpDate: { type: Date },
    nextFollowUpTime: { type: String },
    followUpType: { type: String },
    priority: { type: String },
    notes: { type: String, required: true }
}, { timestamps: true });

DailyLeadUpdateSchema.index({ employeeId: 1, createdAt: -1 });
DailyLeadUpdateSchema.index({ leadId: 1, createdAt: -1 });
DailyLeadUpdateSchema.index({ createdAt: -1 });
DailyLeadUpdateSchema.index({ salesStatus: 1 });
DailyLeadUpdateSchema.index({ crStatus: 1 });

module.exports = mongoose.model('DailyLeadUpdate', DailyLeadUpdateSchema);
