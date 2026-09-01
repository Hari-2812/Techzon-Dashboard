const moment = require('moment-timezone');
const WorkSession = require('../models/WorkSession');
const AttendanceDaily = require('../models/AttendanceDaily');
const AttendanceSettings = require('../models/AttendanceSettings');
const AttendanceVerificationLog = require('../models/AttendanceVerificationLog');
const { calculateSessionStats } = require('../services/attendance.service');

function getDistanceFromLatLonInM(lat1, lon1, lat2, lon2) {
  const R = 6371; // Radius of the earth in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180); 
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * 
    Math.sin(dLon / 2) * Math.sin(dLon / 2); 
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)); 
  return Math.round(R * c * 1000); // Distance in meters
}

const getBusinessDateIST = () => moment().tz('Asia/Kolkata').format('YYYY-MM-DD');

exports.getTodayAttendance = async (req, res) => {
  try {
    const { date } = req.query;
    const settings = await AttendanceSettings.findOne() || new AttendanceSettings();
    const dateStr = date || getBusinessDateIST();
    
    // Find the most recent session for the given date (could be test or real)
    let session = await WorkSession.findOne({ employeeId: req.user.id, date: dateStr }).sort({ createdAt: -1 });
    let daily = await AttendanceDaily.findOne({ employeeId: req.user.id, date: dateStr }).sort({ createdAt: -1 });
    
    // Safety check for bogus future timestamps (from previous buggy code that added 5.5 hours)
    // We sanitize it purely in memory for the response so the UI works, but we DO NOT save it 
    // to avoid triggering mongoose validation errors on legacy enums.
    if (session && session.clockInAt) {
       if (new Date(session.clockInAt).getTime() > Date.now() + 60000) {
           session.clockInAt = new Date(new Date(session.clockInAt).getTime() - (5.5 * 60 * 60 * 1000));
       }
    }

    // Synthesize Week Off if querying a Monday and no record exists
    if (!daily && !session) {
      const moment = require('moment-timezone');
      const reqDate = moment.tz(dateStr, 'YYYY-MM-DD', settings.timezone || 'Asia/Kolkata');
      if (reqDate.day() === 1 && reqDate.isSameOrBefore(moment.tz(settings.timezone || 'Asia/Kolkata'), 'day')) {
          daily = {
              status: 'WEEK_OFF',
              date: dateStr,
              isSynthesized: true,
              workedMinutes: 0,
              breakMinutes: 0
          };
      }
    }
    
    let hasReminder = false;
    // Only check reminder for today, not historical dates
    if (!date || date === getBusinessDateIST()) {
        const AuditLog = require('../models/AuditLog');
        const todayStart = moment().tz('Asia/Kolkata').startOf('day').toDate();
        const reminderLog = await AuditLog.findOne({
           entityId: req.user.id,
           action: 'SEND_ATTENDANCE_REMINDER',
           timestamp: { $gte: todayStart }
        });
        if (reminderLog) {
           hasReminder = true;
        }
    }

    res.json({ success: true, data: { session, daily, settings, serverTime: new Date(), hasReminder, date: dateStr } });
  } catch (err) {
    console.error('Error fetching today attendance:', err);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

exports.clockIn = async (req, res) => {
  try {
    const { isTest, lateReason } = req.body || {};
    const dateStr = getBusinessDateIST();
    
    const isTestMode = (process.env.NODE_ENV === 'development' || req.headers.host?.includes('localhost')) && isTest === true;

    // Check if they already have a pending request
    const AttendanceRequest = require('../models/AttendanceRequest');
    const existingReq = await AttendanceRequest.findOne({ employeeId: req.user.id, date: dateStr, requestType: 'CHECK_IN', status: 'PENDING', isTestSession: isTestMode });
    if (existingReq) {
      return res.status(400).json({ success: false, message: 'You already have a pending Check-In request.' });
    }

    // Check if they are already clocked in
    const existingSession = await WorkSession.findOne({ employeeId: req.user.id, date: dateStr, isTestSession: isTestMode });
    if (existingSession) {
      return res.status(400).json({ success: false, message: 'Already clocked in today' });
    }

    // Create the Request
    const request = await AttendanceRequest.create({
        employeeId: req.user.id,
        date: dateStr,
        requestType: 'CHECK_IN',
        status: 'PENDING',
        requestedTime: new Date(),
        isTestSession: isTestMode,
        reason: lateReason || ''
    });
    
    let daily = await AttendanceDaily.findOne({ employeeId: req.user.id, date: dateStr, isTestSession: isTestMode });
    if (!daily) {
      daily = await AttendanceDaily.create({
        employeeId: req.user.id,
        date: dateStr,
        status: 'PENDING',
        isTestSession: isTestMode
      });
    } else {
      daily.status = 'PENDING';
      await daily.save();
    }

    // Notify Admin Realtime
    const io = req.app.get('io') || require('../server').io;
    const User = require('../models/User');
    const emp = await User.findById(req.user.id);
    if (io) {
      io.emit('attendance:clock-in-request', { 
        requestId: request._id,
        employeeName: emp ? emp.name : 'Unknown',
        time: request.requestedTime
      });
    }

    res.json({ success: true, data: request, message: 'Check-in request sent for admin approval' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

exports.clockOut = async (req, res) => {
  try {
    const { isTest } = req.body;
    const dateStr = getBusinessDateIST();
    
    const isTestMode = (process.env.NODE_ENV === 'development' || req.headers.host?.includes('localhost')) && isTest === true;

    // Check if they already have a pending request
    const AttendanceRequest = require('../models/AttendanceRequest');
    const existingReq = await AttendanceRequest.findOne({ employeeId: req.user.id, date: dateStr, requestType: 'CHECK_OUT', status: 'PENDING', isTestSession: isTestMode });
    if (existingReq) {
      return res.status(400).json({ success: false, message: 'You already have a pending Check-Out request.' });
    }

    let session = await WorkSession.findOne({ employeeId: req.user.id, date: dateStr, isTestSession: isTestMode }).sort({ createdAt: -1 });
    if (!session || session.clockOutAt) {
      return res.status(400).json({ success: false, message: 'Not actively clocked in' });
    }

    // Prevent clocking out while on an active break
    if (session.breaks && session.breaks.length > 0) {
      const lastBreak = session.breaks[session.breaks.length - 1];
      if (!lastBreak.endAt) {
        return res.status(400).json({ success: false, message: 'You are currently on a break. Please resume work before clocking out.' });
      }
    }

    // Create the Request
    const request = await AttendanceRequest.create({
        employeeId: req.user.id,
        date: dateStr,
        requestType: 'CHECK_OUT',
        status: 'PENDING',
        requestedTime: new Date(),
        isTestSession: isTestMode
    });

    session.status = 'PENDING_CHECK_OUT_APPROVAL';
    await session.save();
    
    let daily = await AttendanceDaily.findOne({ employeeId: req.user.id, date: dateStr, isTestSession: isTestMode });
    if (daily) {
        daily.status = 'PENDING_CHECK_OUT_APPROVAL';
        await daily.save();
    }

    // Notify Admin Realtime
    const io = req.app.get('io') || require('../server').io;
    const User = require('../models/User');
    const emp = await User.findById(req.user.id);
    if (io) {
      io.emit('attendance:clock-out-request', { 
        requestId: request._id,
        employeeName: emp ? emp.name : 'Unknown',
        time: request.requestedTime
      });
    }

    res.json({ success: true, data: request, message: 'Check-out request sent for admin approval' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

exports.startBreak = async (req, res) => {
  try {
    const { reason, comment, isTest } = req.body;
    if (!reason) return res.status(400).json({ success: false, message: 'Break reason is required' });
    
    const dateStr = getBusinessDateIST();
    const isTestMode = (process.env.NODE_ENV === 'development' || req.headers.host?.includes('localhost')) && isTest === true;
    
    let session = await WorkSession.findOne({ employeeId: req.user.id, date: dateStr, isTestSession: isTestMode }).sort({ createdAt: -1 });
    if (!session || session.clockOutAt) {
      return res.status(400).json({ success: false, message: 'Not actively clocked in' });
    }

    if (session.breaks && session.breaks.length > 0 && !session.breaks[session.breaks.length - 1].endAt) {
      return res.status(400).json({ success: false, message: 'Already on a break' });
    }
    
    // Check pending break request
    const AttendanceRequest = require('../models/AttendanceRequest');
    const existingReq = await AttendanceRequest.findOne({ employeeId: req.user.id, date: dateStr, requestType: 'BREAK', status: 'PENDING', isTestSession: isTestMode });
    if (existingReq) return res.status(400).json({ success: false, message: 'You already have a pending Break request.' });

    // Create the Request
    const request = await AttendanceRequest.create({
        employeeId: req.user.id,
        date: dateStr,
        requestType: 'BREAK',
        status: 'PENDING',
        requestedTime: new Date(),
        breakReason: reason,
        adminComment: comment,
        isTestSession: isTestMode
    });
    
    session.status = 'PENDING_BREAK_APPROVAL';
    await session.save();
    
    let daily = await AttendanceDaily.findOne({ employeeId: req.user.id, date: dateStr, isTestSession: isTestMode });
    if (daily) {
        daily.status = 'PENDING_BREAK_APPROVAL';
        await daily.save();
    }

    const io = req.app.get('io') || require('../server').io;
    const User = require('../models/User');
    const emp = await User.findById(req.user.id);
    if (io) {
      io.emit('attendance:break-request', { 
        requestId: request._id,
        employeeName: emp ? emp.name : 'Unknown',
        time: request.requestedTime
      });
    }

    res.json({ success: true, data: request, message: 'Break request sent for admin approval' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

exports.endBreak = async (req, res) => {
  try {
    const { resumeComment, isTest } = req.body;
    const dateStr = getBusinessDateIST();
    const isTestMode = (process.env.NODE_ENV === 'development' || req.headers.host?.includes('localhost')) && isTest === true;
    
    let session = await WorkSession.findOne({ employeeId: req.user.id, date: dateStr, isTestSession: isTestMode }).sort({ createdAt: -1 });
    if (!session || session.clockOutAt) {
      return res.status(400).json({ success: false, message: 'Not actively clocked in' });
    }

    if (!session.breaks || session.breaks.length === 0 || session.breaks[session.breaks.length - 1].endAt) {
      return res.status(400).json({ success: false, message: 'Not on a break' });
    }

    const lastBreak = session.breaks[session.breaks.length - 1];
    const endTime = new Date();
    lastBreak.endAt = endTime;
    if (resumeComment) lastBreak.resumeComment = resumeComment;
    
    // Calculate break duration
    lastBreak.durationMinutes = Math.round((endTime.getTime() - new Date(lastBreak.startAt).getTime()) / 60000);
    
    session.status = 'RUNNING';
    await session.save();
    
    let daily = await AttendanceDaily.findOne({ employeeId: req.user.id, date: dateStr, isTestSession: isTestMode });
    if (daily) {
        daily.status = 'WORKING';
        await daily.save();
    }

    const AuditLog = require('../models/AuditLog');
    await AuditLog.create({
      actorId: req.user.id,
      action: 'BREAK_ENDED',
      entityType: 'WorkSession',
      entityId: session._id,
      metadata: { resumeComment, breakDurationMinutes: lastBreak.durationMinutes }
    });

    const io = req.app.get('io') || require('../server').io;
    if (io) io.emit('employee:break-ended', { employeeId: req.user.id, session });

    res.json({ success: true, data: session, message: 'Resumed work successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

exports.getMonthlyAttendance = async (req, res) => {
  try {
    const { month, year } = req.query; // e.g. "08", "2026"
    if (!month || !year) return res.status(400).json({ success: false, message: 'month and year query params required' });
    
    const prefix = `${year}-${month.padStart(2, '0')}`;
    
    let records = await AttendanceDaily.find({ 
      employeeId: req.user.id, 
      date: { $regex: `^${prefix}` },
      isTestSession: { $ne: true }
    }).lean();
    
    // Inject approved holidays
    const HolidayResponse = require('../models/HolidayResponse');
    const Holiday = require('../models/Holiday');
    
    const holidayResponses = await HolidayResponse.find({
      employeeId: req.user.id,
      holidayDate: { $regex: `^${prefix}` },
      response: 'TAKE_LEAVE',
      status: 'APPROVED'
    }).lean();

    const existingDates = new Set(records.map(r => r.date));

    for (const hr of holidayResponses) {
       if (!existingDates.has(hr.holidayDate)) {
           const holiday = await Holiday.findById(hr.holidayId);
           records.push({
               date: hr.holidayDate,
               status: 'HOLIDAY',
               workedMinutes: 0,
               breakMinutes: 0,
               isSynthesized: true,
               note: holiday ? holiday.name : 'Approved Holiday Leave'
           });
           existingDates.add(hr.holidayDate);
       }
    }
    
    // Inject Week Off for Mondays without records
    const moment = require('moment-timezone');
    const AttendanceSettings = require('../models/AttendanceSettings');
    const settings = await AttendanceSettings.findOne() || new AttendanceSettings();
    const tz = settings.timezone || 'Asia/Kolkata';
    const daysInMonth = moment.tz(`${prefix}-01`, 'YYYY-MM-DD', tz).daysInMonth();
    
    for (let i = 1; i <= daysInMonth; i++) {
        const dateStr = `${prefix}-${i.toString().padStart(2, '0')}`;
        const currentDay = moment.tz(dateStr, 'YYYY-MM-DD', tz);
        
        if (!existingDates.has(dateStr) && currentDay.isSameOrBefore(moment.tz(tz), 'day')) {
           if (currentDay.day() === 1) { // Monday
               records.push({
                   date: dateStr,
                   status: 'WEEK_OFF',
                   workedMinutes: 0,
                   breakMinutes: 0,
                   isSynthesized: true
               });
               existingDates.add(dateStr);
           }
        }
    }

    records.sort((a, b) => a.date.localeCompare(b.date));
    
    let summary = {
      present: 0,
      late: 0,
      halfDay: 0,
      absent: 0,
      onLeave: 0,
      weekOff: 0
    };

    records.forEach(d => {
      if (['PRESENT', 'WORKING', 'ON_BREAK', 'COMPLETED', 'EARLY_LEAVE', 'OVERTIME', 'PENDING_BREAK_APPROVAL', 'PENDING_CHECK_OUT_APPROVAL'].includes(d.status)) summary.present++;
      else if (d.status === 'LATE') summary.late++;
      else if (d.status === 'HALF_DAY') summary.halfDay++;
      else if (d.status === 'ABSENT') summary.absent++;
      else if (d.status === 'PAID_LEAVE' || d.status === 'Leave Approved' || d.status === 'LEAVE' || d.status === 'HOLIDAY') summary.onLeave++;
      else if (d.status === 'Week Off' || d.status === 'WEEK_OFF') summary.weekOff++;
    });

    res.json({ success: true, data: { summary, records } });
  } catch (err) {
    console.error('Error fetching monthly attendance:', err);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

exports.getSettings = async (req, res) => {
  try {
    let settings = await AttendanceSettings.findOne();
    if (!settings) {
      settings = await AttendanceSettings.create({});
    }
    res.json({ success: true, data: settings });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

exports.testReset = async (req, res) => {
    try {
        if (process.env.NODE_ENV !== 'development' && !req.headers.host.includes('localhost')) {
             return res.status(403).json({ success: false, message: 'Only available in dev/test environment' });
        }
        
        await WorkSession.deleteMany({ employeeId: req.user.id, isTestSession: true });
        const AttendanceDaily = require('../models/AttendanceDaily');
        await AttendanceDaily.deleteMany({ employeeId: req.user.id, isTestSession: true });

        res.json({ success: true, message: 'Test attendance sessions reset.' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};

exports.requestCorrection = async (req, res) => {
  try {
    const { date, type, reason, comment } = req.body;
    if (!date || !type || !reason) {
      return res.status(400).json({ success: false, message: 'Date, type, and reason are required' });
    }

    const AttendanceCorrection = require('../models/AttendanceCorrection');
    const correction = await AttendanceCorrection.create({
      employeeId: req.user.id,
      date,
      type,
      reason,
      comment
    });

    res.json({ success: true, data: correction });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

exports.updateSettings = async (req, res) => {
  try {
    if (req.user.role !== 'ADMIN') return res.status(403).json({ success: false, message: 'Forbidden' });
    let settings = await AttendanceSettings.findOne();
    if (!settings) {
      settings = new AttendanceSettings();
    }
    Object.assign(settings, req.body);
    await settings.save();
    res.json({ success: true, data: settings });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

exports.getVerificationLogs = async (req, res) => {
  try {
    if (req.user.role !== 'ADMIN') return res.status(403).json({ success: false, message: 'Forbidden' });
    const logs = await AttendanceVerificationLog.find()
      .populate('employeeId', 'name employeeId department')
      .sort({ timestamp: -1 })
      .limit(200);
    res.json({ success: true, data: logs });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

exports.adminCorrectAttendance = async (req, res) => {
  try {
    if (req.user.role !== 'ADMIN') return res.status(403).json({ success: false, message: 'Forbidden' });
    const { employeeId, date, type, newValue, reason } = req.body;
    if (!employeeId || !date || !reason) {
       return res.status(400).json({ success: false, message: 'employeeId, date, and reason are required' });
    }

    let session = await WorkSession.findOne({ employeeId, date, isTestSession: false });
    if (!session) {
       return res.status(404).json({ success: false, message: 'Session not found for that date' });
    }

    const AuditLog = require('../models/AuditLog');
    let oldValue = null;

    if (type === 'CLOCK_OUT') {
       oldValue = session.clockOutAt;
       const newTime = newValue ? new Date(newValue) : new Date();
       if (isNaN(newTime.getTime())) return res.status(400).json({ success: false, message: 'Invalid timestamp provided' });
       session.clockOutAt = newTime;
       session.status = 'COMPLETED';
       session.clockOutVerification = {
           method: 'ADMIN_CORRECTION',
           verifiedAt: new Date(),
           status: 'VERIFIED'
       };
    } else if (type === 'CLOCK_IN') {
       oldValue = session.clockInAt;
       const newTime = new Date(newValue);
       if (isNaN(newTime.getTime())) return res.status(400).json({ success: false, message: 'Invalid timestamp provided' });
       if (newTime.getTime() > Date.now() + 5 * 60000) return res.status(400).json({ success: false, message: 'Clock-in time cannot be in the future' });
       session.clockInAt = newTime;
    }

    await session.save();

    // Recalculate daily stats
    const settings = await AttendanceSettings.findOne() || new AttendanceSettings();
    const stats = await calculateSessionStats(session, settings);
    
    await AttendanceDaily.findOneAndUpdate(
      { employeeId, date, isTestSession: false },
      { ...stats },
      { upsert: true }
    );

    await AuditLog.create({
      actorId: req.user.id,
      action: 'ATTENDANCE_CORRECTED',
      entityType: 'WorkSession',
      entityId: session._id,
      metadata: { type, oldValue, newValue, reason, employeeId, date }
    });

    res.json({ success: true, message: 'Attendance corrected' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

exports.adminForceClockOut = async (req, res) => {
  try {
    if (req.user.role !== 'ADMIN') {
      return res.status(403).json({ success: false, message: 'Forbidden: Only Admins can force clock out' });
    }

    const { employeeId } = req.params;
    const dateStr = getBusinessDateIST();

    // Check for an active session (can be real or test)
    let session = await WorkSession.findOne({ 
      employeeId, 
      date: dateStr, 
      status: { $in: ['RUNNING', 'ON_BREAK'] } 
    }).sort({ createdAt: -1 });

    if (!session) {
      return res.status(400).json({ success: false, message: 'Employee is already clocked out or has no active session.' });
    }

    const clockOutTime = new Date();

    // Handle open breaks
    if (session.status === 'ON_BREAK' && session.breaks && session.breaks.length > 0) {
      const lastBreak = session.breaks[session.breaks.length - 1];
      if (!lastBreak.endAt) {
        lastBreak.endAt = clockOutTime;
        lastBreak.resumeComment = 'System: Auto-closed due to Admin Force Clock-Out';
        const duration = moment(lastBreak.endAt).diff(moment(lastBreak.startAt), 'minutes');
        lastBreak.durationMinutes = duration > 0 ? duration : 0;
      }
    }

    session.clockOutAt = clockOutTime;
    session.status = 'COMPLETED';
    await session.save();

    const settings = await AttendanceSettings.findOne() || new AttendanceSettings();
    const stats = await calculateSessionStats(session, settings);

    const Holiday = require('../models/Holiday');
    const holiday = await Holiday.findOne({ date: dateStr, isActive: true });
    if (holiday) {
        stats.status = 'HOLIDAY_WORKED';
    }

    const daily = await AttendanceDaily.findOneAndUpdate(
      { employeeId, date: dateStr, isTestSession: session.isTestSession },
      { ...stats, workedOnHoliday: !!holiday, status: 'COMPLETED' },
      { returnDocument: 'after', upsert: true }
    );

    const AuditLog = require('../models/AuditLog');
    await AuditLog.create({
      actorId: req.user.id,
      action: 'ADMIN_FORCE_CLOCK_OUT',
      entityType: 'WorkSession',
      entityId: session._id,
      metadata: { 
        employeeId, 
        clockInTime: session.clockInAt,
        clockOutTime,
        workedMinutes: stats.workedMinutes
      }
    });

    const io = req.app.get('io') || require('../server').io;
    if (io) {
      io.emit('attendance:admin-force-clock-out', { 
        employeeId, 
        session, 
        daily 
      });
    }

    res.json({ success: true, message: 'Employee forcefully clocked out.', session, daily });

  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

exports.adminEditClockOut = async (req, res) => {
  try {
    if (req.user.role !== 'ADMIN') {
      return res.status(403).json({ success: false, message: 'Forbidden: Only Admins can edit clock out time' });
    }

    const { sessionId } = req.params;
    const { clockOut, reason } = req.body;

    if (!clockOut) {
      return res.status(400).json({ success: false, message: 'Clock Out time is required' });
    }

    let session = await WorkSession.findById(sessionId);

    if (!session) {
      return res.status(404).json({ success: false, message: 'Work session not found' });
    }

    if (session.status !== 'COMPLETED' || !session.clockOutAt) {
      return res.status(400).json({ success: false, message: 'Only completed sessions can be edited. Please force clock out first if the session is still active.' });
    }

    const newClockOutTime = new Date(clockOut);
    if (isNaN(newClockOutTime.getTime())) {
      return res.status(400).json({ success: false, message: 'Invalid clock-out timestamp provided' });
    }

    if (newClockOutTime <= session.clockInAt) {
      return res.status(400).json({ success: false, message: 'Clock-out time must be after clock-in time.' });
    }

    if (newClockOutTime.getTime() > Date.now() + 5 * 60000) {
      return res.status(400).json({ success: false, message: 'Clock-out time cannot be in the future.' });
    }

    const originalClockOutTime = session.clockOutAt;
    
    // Check if new clockOut time is before any break ends. If so, adjusting it might corrupt the break durations.
    // For simplicity, we assume breaks are valid, but if the new clockOut is before the last break ends, we should throw an error.
    if (session.breaks && session.breaks.length > 0) {
      const lastBreak = session.breaks[session.breaks.length - 1];
      if (lastBreak.endAt && newClockOutTime < lastBreak.endAt) {
         return res.status(400).json({ success: false, message: 'New clock-out time cannot be before the end of the last break.' });
      }
    }

    session.clockOutAt = newClockOutTime;
    await session.save();

    const settings = await AttendanceSettings.findOne() || new AttendanceSettings();
    const stats = await calculateSessionStats(session, settings);

    const Holiday = require('../models/Holiday');
    const holiday = await Holiday.findOne({ date: session.date, isActive: true });
    if (holiday) {
        stats.status = 'HOLIDAY_WORKED';
    }

    const daily = await AttendanceDaily.findOneAndUpdate(
      { employeeId: session.employeeId, date: session.date, isTestSession: session.isTestSession },
      { ...stats, workedOnHoliday: !!holiday, status: 'COMPLETED' },
      { returnDocument: 'after', upsert: true }
    );

    const AuditLog = require('../models/AuditLog');
    await AuditLog.create({
      actorId: req.user.id,
      action: 'ADMIN_EDIT_CLOCK_OUT',
      entityType: 'WorkSession',
      entityId: session._id,
      metadata: { 
        employeeId: session.employeeId,
        originalClockOutTime,
        newClockOutTime,
        workedMinutes: stats.workedMinutes,
        reason: reason || 'No reason provided'
      }
    });

    const io = req.app.get('io') || require('../server').io;
    if (io) {
      io.emit('attendance:admin-edit-clock-out', { 
        employeeId: session.employeeId, 
        session, 
        daily 
      });
    }

    res.json({ success: true, message: 'Clock-out time updated successfully.', session, daily });

  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

exports.adminEditAttendance = async (req, res) => {
  try {
    if (req.user.role !== 'ADMIN') {
      return res.status(403).json({ success: false, message: 'Forbidden: Only Admins can edit attendance' });
    }

    const { sessionId } = req.params;
    const { clockIn, clockOut, clearClockOut, breakDurationMinutes, reason } = req.body;

    if (!clockIn) {
      return res.status(400).json({ success: false, message: 'Clock In time is required' });
    }

    let session = await WorkSession.findById(sessionId);
    if (!session) {
      return res.status(404).json({ success: false, message: 'Work session not found' });
    }

    const originalClockInTime = session.clockInAt;
    const originalClockOutTime = session.clockOutAt;

    const newClockInTime = new Date(clockIn);
    if (isNaN(newClockInTime.getTime())) {
      return res.status(400).json({ success: false, message: 'Invalid clock-in timestamp provided' });
    }

    session.clockInAt = newClockInTime;

    if (clearClockOut) {
      session.clockOutAt = undefined;
      session.status = 'RUNNING'; // Default to running, though calculateSessionStats might tweak it
    } else if (clockOut) {
      const newClockOutTime = new Date(clockOut);
      if (isNaN(newClockOutTime.getTime())) {
        return res.status(400).json({ success: false, message: 'Invalid clock-out timestamp provided' });
      }
      if (newClockOutTime <= session.clockInAt) {
        return res.status(400).json({ success: false, message: 'Clock-out time must be after clock-in time.' });
      }
      if (newClockOutTime.getTime() > Date.now() + 5 * 60000) {
        return res.status(400).json({ success: false, message: 'Clock-out time cannot be in the future.' });
      }
      session.clockOutAt = newClockOutTime;
      session.status = 'COMPLETED';
    }

    // Handle Break Duration Adjustment
    // To allow arbitrary breakDurationMinutes, we will replace the breaks array with a single manual break
    // that starts at Clock-In and ends breakDurationMinutes later. 
    // This avoids complex timezone overlapping logic while still satisfying calculateSessionStats.
    if (breakDurationMinutes !== undefined && breakDurationMinutes !== null && breakDurationMinutes >= 0) {
      const moment = require('moment-timezone');
      if (breakDurationMinutes > 0) {
        const breakStart = moment(session.clockInAt);
        const breakEnd = moment(session.clockInAt).add(breakDurationMinutes, 'minutes');
        
        session.breaks = [{
          startAt: breakStart.toDate(),
          endAt: breakEnd.toDate(),
          reason: 'Other',
          comment: 'Admin Adjusted Break',
          durationMinutes: breakDurationMinutes
        }];
      } else {
        session.breaks = [];
      }
    }

    await session.save();

    const settings = await AttendanceSettings.findOne() || new AttendanceSettings();
    const stats = await calculateSessionStats(session, settings);

    const Holiday = require('../models/Holiday');
    const holiday = await Holiday.findOne({ date: session.date, isActive: true });
    if (holiday && session.status === 'COMPLETED') {
        stats.status = 'HOLIDAY_WORKED';
    }

    // if clearClockOut is true, the user might still be working
    const updateStatus = clearClockOut ? 'WORKING' : (session.status === 'COMPLETED' ? 'COMPLETED' : stats.status);

    const daily = await AttendanceDaily.findOneAndUpdate(
      { employeeId: session.employeeId, date: session.date, isTestSession: session.isTestSession },
      { ...stats, workedOnHoliday: !!holiday, status: updateStatus },
      { returnDocument: 'after', upsert: true }
    );

    const AuditLog = require('../models/AuditLog');
    await AuditLog.create({
      actorId: req.user.id,
      action: 'ADMIN_EDIT_ATTENDANCE',
      entityType: 'WorkSession',
      entityId: session._id,
      metadata: { 
        employeeId: session.employeeId,
        originalClockInTime,
        newClockInTime: session.clockInAt,
        originalClockOutTime,
        newClockOutTime: session.clockOutAt,
        breakDurationMinutes,
        workedMinutes: stats.workedMinutes,
        reason: reason || 'No reason provided'
      }
    });

    const io = req.app.get('io') || require('../server').io;
    if (io) {
      io.emit('attendance:admin-edit-attendance', { 
        employeeId: session.employeeId, 
        session, 
        daily 
      });
    }

    res.json({ success: true, message: 'Attendance updated successfully.', session, daily });

  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

