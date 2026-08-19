const mongoose = require('mongoose');
const { Schema } = mongoose;

const LeadActivitySchema = new mongoose.Schema({
    leadId: { type: mongoose.Schema.Types.ObjectId, ref: 'Lead', required: true, index: true },
    employeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    activityType: { type: String, required: true },
    description: { type: String, required: true },
    metadata: { type: mongoose.Schema.Types.Mixed },
    timestamp: { type: Date, default: Date.now, index: true }
});

module.exports = mongoose.model('LeadActivity', LeadActivitySchema);
