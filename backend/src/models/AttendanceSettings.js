const mongoose = require('mongoose');

const AttendanceSettingsSchema = new mongoose.Schema({
  officeStartTime: { type: String, default: '09:30 AM' },
  officeEndTime: { type: String, default: '06:30 PM' },
  gracePeriodMinutes: { type: Number, default: 10 },
  requiredWorkingHours: { type: Number, default: 8 },
  breakDurationMinutes: { type: Number, default: 45 },
  halfDayThresholdHours: { type: Number, default: 4 },
  timezone: { type: String, default: 'Asia/Kolkata' },
  overtimeEnabled: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.model('AttendanceSettings', AttendanceSettingsSchema);
