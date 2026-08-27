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
    const dateStr = getBusinessDateIST();
    
    // Find the most recent session for today (could be test or real)
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

    const settings = await AttendanceSettings.findOne() || new AttendanceSettings();
    res.json({ success: true, data: { session, daily, settings, serverTime: new Date() } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

exports.clockIn = async (req, res) => {
  try {
    const { isTest } = req.body;
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
        isTestSession: isTestMode
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
               note: holiday ? holiday.name : 'Approved Holiday Leave'
           });
       }
    }

    records.sort((a, b) => a.date.localeCompare(b.date));

    res.json({ success: true, data: records });
  } catch (err) {
    console.error(err);
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
