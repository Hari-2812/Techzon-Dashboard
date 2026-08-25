const mongoose = require('mongoose');
const { Schema } = mongoose;

const SaleSchema = new mongoose.Schema({
    employeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    leadId: { type: mongoose.Schema.Types.ObjectId, ref: 'Lead', required: true, index: true },
    studentName: { type: String, required: true },
    date: { type: Date, default: Date.now, index: true },
    course: { type: String, required: true },
    amount: { type: Number, required: true },
    status: {
        type: String,
        enum: ['Lead', 'Interested', 'Payment Pending', 'Partially Paid', 'Paid', 'Converted', 'Cancelled'],
        default: 'Interested',
        index: true
    },
    paymentStatus: {
        type: String,
        enum: ['Pending', 'Partially Paid', 'Paid'],
        default: 'Pending'
    },
    remarks: { type: String },
    conversionDate: { type: Date, default: Date.now }
}, { timestamps: true });

module.exports = mongoose.model('Sale', SaleSchema);
