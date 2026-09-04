const mongoose = require('mongoose');
const { Schema } = mongoose;
const { CANONICAL_SALES_STATUSES, normalizeSalesStatus } = require('../utils/statusNormalizer');

const LeadSchema = new mongoose.Schema({
    studentName: { type: String, required: true },
    phone: { type: String, required: true, index: true },
    email: { type: String },
    college: { type: String, required: false, index: true },
    department: { type: String, required: false },
    year: { type: String, required: false },
    course: { type: String, required: false },
    interestedDomain: { type: String, required: false },
    interestedCourse: { type: String, required: false },
    interestLevel: { type: String, enum: ['High', 'Medium', 'Low', 'None'], required: false },
    studentResponse: { type: String, required: false },
    parentContactName: { type: String, required: false },
    parentContactPhone: { type: String, required: false },
    assignedEmployeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
    lastContactedAt: { type: Date, index: true },
    crStatus: {
        type: String,
        enum: ['Not Verified', 'Not Asked', 'Student Is CR', 'Student Is Not CR', 'CR Details Received', 'CR Confirmed', 'Not Applicable'],
        default: 'Not Verified',
        index: true
    },
    leadStatus: {
        type: String,
        enum: ['New', 'Assigned', 'Contact Pending', 'Contacted', 'Interested', 'Follow-up', 'CR Identified', 'Converted', 'Completed', 'Not Interested', 'No Response', 'Invalid'],
        default: 'New',
        index: true
    },
    salesStatus: {
        type: String,
        enum: CANONICAL_SALES_STATUSES,
        default: 'Not Contacted',
        index: true
    },
    lostReason: { type: String, required: false },
    priority: {
        type: String,
        enum: ['HIGH', 'MEDIUM', 'LOW'],
        default: 'MEDIUM',
        index: true
    },
    assignmentOrder: { type: Number, index: true },
    nextFollowUp: { type: Date, index: true },
    source: { type: String, enum: ['MANUAL', 'CSV', 'GOOGLE_SHEETS'], default: 'MANUAL', index: true },
    sourceSpreadsheetId: { type: String },
    sourceWorksheet: { type: String },
    sourceRowId: { type: String },
    salesSource: { type: String, enum: ['CRM', 'EMPLOYEE_SALES'], default: 'CRM', index: true },
    importedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    importedAt: { type: Date }
}, { timestamps: true });

// Pre-validate hook to normalize data before creation or full save
LeadSchema.pre('validate', function () {
    if (this.isModified('salesStatus') || this.isNew) {
        this.salesStatus = normalizeSalesStatus(this.salesStatus);
    }
});

// Pre-findOneAndUpdate hook to normalize data during updates
LeadSchema.pre('findOneAndUpdate', function () {
    const update = this.getUpdate();
    if (update.salesStatus) {
        update.salesStatus = normalizeSalesStatus(update.salesStatus);
    } else if (update.$set && update.$set.salesStatus) {
        update.$set.salesStatus = normalizeSalesStatus(update.$set.salesStatus);
    }
});

module.exports = mongoose.model('Lead', LeadSchema);
