const mongoose = require('mongoose');
const { Schema } = mongoose;

const CRActivitySchema = new mongoose.Schema({
    crId: { type: mongoose.Schema.Types.ObjectId, ref: 'CRProfile', required: true, index: true },
    employeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    activityType: { type: String, required: true },
    description: { type: String, required: true },
    metadata: { type: mongoose.Schema.Types.Mixed },
    timestamp: { type: Date, default: Date.now, index: true }
});

module.exports = mongoose.model('CRActivity', CRActivitySchema);
