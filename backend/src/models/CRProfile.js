const mongoose = require('mongoose');
const { Schema } = mongoose;

const CRProfileSchema = new mongoose.Schema({
    crName: { type: String, required: true },
    phone: { type: String, required: true, index: true },
    college: { type: String, required: true, index: true },
    department: { type: String, required: true },
    year: { type: String, required: true },
    section: { type: String },
    assignedEmployeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true, required: true },
    status: {
        type: String,
        enum: ['Pending Contact', 'Contacted', 'Interested', 'Follow-up', 'Agreed', 'Group Pending', 'Group Created', 'Students Joining', 'Completed', 'Not Interested', 'No Response'],
        default: 'Pending Contact',
        index: true
    }
}, { timestamps: true });

module.exports = mongoose.model('CRProfile', CRProfileSchema);
