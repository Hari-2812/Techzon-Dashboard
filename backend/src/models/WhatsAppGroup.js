const mongoose = require('mongoose');
const { Schema } = mongoose;

const WhatsAppGroupSchema = new mongoose.Schema({
    crId: { type: mongoose.Schema.Types.ObjectId, ref: 'CRProfile', required: true, index: true },
    assignedEmployeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    college: { type: String, required: true },
    department: { type: String, required: true },
    year: { type: String, required: true },
    section: { type: String },
    groupName: { type: String, required: true },
    groupLink: { type: String },
    status: {
        type: String,
        enum: ['Not Created', 'Creation Pending', 'Created', 'Students Joining', 'Completed'],
        default: 'Not Created',
        index: true
    },
    expectedStudents: { type: Number, default: 0 },
    joinedStudents: { type: Number, default: 0 }
}, { timestamps: true });

module.exports = mongoose.model('WhatsAppGroup', WhatsAppGroupSchema);
