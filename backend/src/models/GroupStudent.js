const mongoose = require('mongoose');
const { Schema } = mongoose;

const GroupStudentSchema = new mongoose.Schema({
    groupId: { type: mongoose.Schema.Types.ObjectId, ref: 'WhatsAppGroup', required: true, index: true },
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Lead', index: true },
    studentName: { type: String, required: true },
    phone: { type: String, required: true },
    status: {
        type: String,
        enum: ['Pending', 'Invited', 'Joined', 'Not Interested', 'Invalid Number'],
        default: 'Pending',
        index: true
    },
    invitedAt: { type: Date },
    joinedAt: { type: Date },
    lastFollowUpAt: { type: Date },
    followUpCount: { type: Number, default: 0 },
    notes: { type: String }
}, { timestamps: true });

module.exports = mongoose.model('GroupStudent', GroupStudentSchema);
