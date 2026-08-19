const mongoose = require('mongoose');

const HolidayResponseSchema = new mongoose.Schema({
  employeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  holidayId: { type: mongoose.Schema.Types.ObjectId, ref: 'Holiday', required: true },
  holidayDate: { type: String, required: true }, // YYYY-MM-DD
  response: { 
    type: String, 
    enum: ['TAKE_LEAVE', 'WILL_WORK'], 
    required: true 
  },
  status: { 
    type: String, 
    enum: ['PENDING', 'APPROVED', 'REJECTED', 'CONFIRMED'], 
    default: 'PENDING' 
  },
  comment: { type: String },
  respondedAt: { type: Date, default: Date.now },
  reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  reviewedAt: { type: Date }
}, {
  timestamps: true
});

// Indexes for fast lookup and uniqueness
HolidayResponseSchema.index({ employeeId: 1, holidayId: 1 }, { unique: true });
HolidayResponseSchema.index({ holidayId: 1 });
HolidayResponseSchema.index({ holidayDate: 1 });
HolidayResponseSchema.index({ status: 1 });

module.exports = mongoose.model('HolidayResponse', HolidayResponseSchema);
