const mongoose = require('mongoose');

const HolidaySchema = new mongoose.Schema({
  name: { type: String, required: true },
  date: { type: String, required: true }, // Format: YYYY-MM-DD
  description: { type: String },
  type: { 
    type: String, 
    enum: ['Government Holiday', 'Public Holiday', 'Company Holiday', 'Optional Holiday'], 
    default: 'Government Holiday' 
  },
  isActive: { type: Boolean, default: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, {
  timestamps: true
});

module.exports = mongoose.model('Holiday', HolidaySchema);
