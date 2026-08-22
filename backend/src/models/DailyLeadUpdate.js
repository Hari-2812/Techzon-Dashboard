const mongoose = require('mongoose');

const DailyLeadUpdateSchema = new mongoose.Schema({
    employeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    leadId: { type: mongoose.Schema.Types.ObjectId, ref: 'Lead', index: true }, // Optional

    studentName: { type: String, required: true },
    phone: { type: String, required: true },
    email: { type: String },
    college: { type: String, required: true },
    department: { type: String, required: true },
    year: { type: String },
    courseInterested: { type: String },

    leadStatus: { type: String, required: true },
    callStatus: { type: String },
    studentResponse: { type: String },

    crStatus: { type: String },
    crName: { type: String },
    crPhone: { type: String },
    crCollege: { type: String },
    crDepartment: { type: String },
    crYear: { type: String },
    crSection: { type: String },

    salesStatus: { type: String },
    expectedConversionDate: { type: Date },

    followUpRequired: { type: Boolean, default: false },
    followUpId: { type: mongoose.Schema.Types.ObjectId, ref: 'FollowUp' },
    followUpDate: { type: Date },
    followUpTime: { type: String },
    followUpType: { type: String },
    followUpPriority: { type: String },
    followUpNotes: { type: String },

    dailyNotes: { type: String, required: true }
}, { timestamps: true });

DailyLeadUpdateSchema.index({ employeeId: 1, createdAt: -1 });
DailyLeadUpdateSchema.index({ phone: 1 });
DailyLeadUpdateSchema.index({ college: 1 });
DailyLeadUpdateSchema.index({ createdAt: -1 });
DailyLeadUpdateSchema.index({ leadStatus: 1 });
DailyLeadUpdateSchema.index({ salesStatus: 1 });
DailyLeadUpdateSchema.index({ followUpDate: 1 });

module.exports = mongoose.model('DailyLeadUpdate', DailyLeadUpdateSchema);
