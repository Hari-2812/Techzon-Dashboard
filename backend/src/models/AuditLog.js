const mongoose = require('mongoose');
const { Schema } = mongoose;

const AuditLogSchema = new mongoose.Schema({
    actorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    action: { type: String, required: true, index: true },
    entityType: { type: String, required: true, index: true },
    entityId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
    oldValue: { type: mongoose.Schema.Types.Mixed },
    newValue: { type: mongoose.Schema.Types.Mixed },
    metadata: { type: mongoose.Schema.Types.Mixed },
    timestamp: { type: Date, default: Date.now, index: true }
});

module.exports = mongoose.model('AuditLog', AuditLogSchema);
