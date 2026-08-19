const mongoose = require('mongoose');
const { Schema } = mongoose;

const LeadSchema = new mongoose.Schema({
    studentName: { type: String, required: true },
    phone: { type: String, required: true, index: true },
    email: { type: String },
    college: { type: String, required: true, index: true },
    department: { type: String, required: false },
    year: { type: String, required: false },
    course: { type: String, required: false },
    parentContactName: { type: String, required: false },
    parentContactPhone: { type: String, required: false },
    assignedEmployeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
    crStatus: {
        type: String,
        enum: ['Not Verified', 'Asked Student', 'Student Is CR', 'Student Is Not CR', 'CR Details Received', 'CR Confirmed'],
        default: 'Not Verified',
        index: true
    },
    leadStatus: {
        type: String,
        enum: ['New', 'Assigned', 'Contact Pending', 'Contacted', 'CR Identified', 'Follow-up', 'Completed', 'No Response', 'Invalid'],
        default: 'New',
        index: true
    },
    priority: {
        type: String,
        enum: ['HIGH', 'MEDIUM', 'LOW'],
        default: 'MEDIUM',
        index: true
    },
    nextFollowUp: { type: Date, index: true }
}, { timestamps: true });

module.exports = mongoose.model('Lead', LeadSchema);
