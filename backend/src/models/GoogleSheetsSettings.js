const mongoose = require('mongoose');

const GoogleSheetsSettingsSchema = new mongoose.Schema({
    spreadsheetId: { type: String, default: '' },
    autoSyncEnabled: { type: Boolean, default: false },
    syncInterval: { type: String, default: 'Daily' }, // e.g. 15m, 1h, Daily
    assignmentStrategy: { type: String, enum: ['ROUND_ROBIN', 'LEAST_ASSIGNED', 'MANUAL'], default: 'ROUND_ROBIN' },
    activeEmployees: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }]
}, { timestamps: true });

module.exports = mongoose.model('GoogleSheetsSettings', GoogleSheetsSettingsSchema);
