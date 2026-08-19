const moment = require('moment-timezone');
const WorkSession = require('../models/WorkSession');
const AttendanceDaily = require('../models/AttendanceDaily');
const AttendanceSettings = require('../models/AttendanceSettings');

const getTodayDateString = (timezone) => moment().tz(timezone || 'Asia/Kolkata').format('YYYY-MM-DD');

exports.getTodayAdminAttendance = async (req, res) => {
  try {
    const settings = await AttendanceSettings.findOne() || new AttendanceSettings();
    const dateStr = getTodayDateString(settings.timezone);
    
    // Get all sessions and daily records for today
    const sessions = await WorkSession.find({ date: dateStr }).populate('employeeId', 'name email role');
    const dailies = await AttendanceDaily.find({ date: dateStr }).populate('employeeId', 'name email role');
    
    // Aggregations
    let summary = {
      present: 0,
      late: 0,
      halfDay: 0,
      absent: 0,
      onLeave: 0,
      currentlyWorking: 0,
      missingClockOut: 0
    };

    dailies.forEach(d => {
      if (d.status === 'PRESENT') summary.present++;
      if (d.status === 'LATE') summary.late++;
      if (d.status === 'HALF_DAY') summary.halfDay++;
      if (d.status === 'ABSENT') summary.absent++;
      if (d.status === 'PAID_LEAVE') summary.onLeave++;
    });

    sessions.forEach(s => {
      if (s.status === 'ACTIVE') summary.currentlyWorking++;
      if (s.status === 'MISSING_CLOCK_OUT') summary.missingClockOut++;
    });

    res.json({ success: true, data: { summary, sessions, dailies, date: dateStr } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

exports.getEmployeeAttendanceDetail = async (req, res) => {
  try {
    const { employeeId } = req.params;
    const { month, year } = req.query; // e.g. "08", "2026"
    
    let query = { employeeId };
    if (month && year) {
      const prefix = `${year}-${month.padStart(2, '0')}`;
      query.date = { $regex: `^${prefix}` };
    }
    
    const records = await AttendanceDaily.find(query).sort({ date: 1 });
    const sessions = await WorkSession.find(query).sort({ date: 1 });
    
    res.json({ success: true, data: { records, sessions } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};
