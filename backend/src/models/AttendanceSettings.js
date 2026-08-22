const mongoose = require('mongoose');

const AttendanceSettingsSchema = new mongoose.Schema({
  officeName: { type: String, default: 'Main Office' },
  officeAddress: { type: String, default: '' },
  officeLatitude: { type: Number, default: 0 },
  officeLongitude: { type: Number, default: 0 },
  allowedRadiusMeters: { type: Number, default: 100 },
  requireLocationForClockOut: { type: Boolean, default: true },
  attendanceVerificationMode: { 
    type: String, 
    enum: ['GPS_ONLY', 'NETWORK_PLUS_GPS', 'GPS_PLUS_NETWORK'], 
    default: 'GPS_ONLY' 
  },
  trustedOfficeIps: [{ type: String }],
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
