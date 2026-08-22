const mongoose = require('mongoose');

const GoogleSheetsSettingsSchema = new mongoose.Schema({
    spreadsheetId: { type: String, default: '' },
    autoSyncEnabled: { type: Boolean, default: false },
    syncInterval: { type: String, default: 'Daily' }, // e.g. 15m, 1h, Daily
    assignmentStrategy: { type: String, enum: ['ROUND_ROBIN', 'LEAST_ASSIGNED', 'MANUAL'], default: 'ROUND_ROBIN' },
    activeEmployees: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    // OAuth 2.0 Tokens (stored securely server-side)
    accessToken: { type: String, default: null },
    refreshToken: { type: String, default: null },
    tokenExpiry: { type: Number, default: null }
}, { timestamps: true });

module.exports = mongoose.model('GoogleSheetsSettings', GoogleSheetsSettingsSchema);
