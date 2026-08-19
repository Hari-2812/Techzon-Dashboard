const mongoose = require('mongoose');
const { Schema } = mongoose;

const StudentCRRelationshipSchema = new mongoose.Schema({
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Lead', required: true, index: true },
    crId: { type: mongoose.Schema.Types.ObjectId, ref: 'CRProfile', required: true, index: true },
    source: { type: String, enum: ['STUDENT_IS_CR', 'STUDENT_PROVIDED', 'MANUAL_LINK'], default: 'STUDENT_PROVIDED' },
    identifiedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('StudentCRRelationship', StudentCRRelationshipSchema);
