const mongoose = require('mongoose');

const SyncHistorySchema = new mongoose.Schema({
    adminId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    spreadsheetId: { type: String, required: true },
    worksheetName: { type: String, required: true },
    startedAt: { type: Date, required: true },
    completedAt: { type: Date },
    totalRows: { type: Number, default: 0 },
    newLeads: { type: Number, default: 0 },
    updatedLeads: { type: Number, default: 0 },
    duplicates: { type: Number, default: 0 },
    invalidRows: { type: Number, default: 0 },
    assignedLeads: { type: Number, default: 0 },
    unassignedLeads: { type: Number, default: 0 },
    status: { type: String, enum: ['Success', 'Failed'], required: true },
    errors: { type: Array, default: [] }
}, { timestamps: true });

SyncHistorySchema.index({ createdAt: -1 });

module.exports = mongoose.model('SyncHistory', SyncHistorySchema);
