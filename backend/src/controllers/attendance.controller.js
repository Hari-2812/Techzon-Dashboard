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

const getTodayDateString = (timezone) => moment().tz(timezone || 'Asia/Kolkata').format('YYYY-MM-DD');

exports.getTodayAttendance = async (req, res) => {
  try {
    const settings = await AttendanceSettings.findOne() || new AttendanceSettings();
    const dateStr = getTodayDateString(settings.timezone);
    
    // Find the most recent session for today (could be test or real)
    let session = await WorkSession.findOne({ employeeId: req.user.id, date: dateStr }).sort({ createdAt: -1 });
    let daily = await AttendanceDaily.findOne({ employeeId: req.user.id, date: dateStr }).sort({ createdAt: -1 });
    
    res.json({ success: true, data: { session, daily, settings, serverTime: new Date() } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

exports.clockIn = async (req, res) => {
  try {
    const { latitude, longitude, accuracy, isTest } = req.body;
    const settings = await AttendanceSettings.findOne() || new AttendanceSettings();
    const dateStr = getTodayDateString(settings.timezone);
    
    const isTestMode = (process.env.NODE_ENV === 'development' || req.headers.host?.includes('localhost')) && isTest === true;

    // Check if they already have a pending request
    const AttendanceRequest = require('../models/AttendanceRequest');
    const existingReq = await AttendanceRequest.findOne({ employeeId: req.user.id, date: dateStr, requestType: 'CLOCK_IN', status: 'PENDING', isTestSession: isTestMode });
    if (existingReq) {
      return res.status(400).json({ success: false, message: 'You already have a pending Clock-In request.' });
    }

    // Check if they are already clocked in
    const existingSession = await WorkSession.findOne({ employeeId: req.user.id, date: dateStr, isTestSession: isTestMode });
    if (existingSession) {
      return res.status(400).json({ success: false, message: 'Already clocked in today' });
    }

    // Location Verification Logic
    let distance = null;
    let insideOfficeRadius = true;

    if (settings.officeLatitude && settings.officeLongitude && latitude && longitude) {
        distance = getDistanceFromLatLonInM(settings.officeLatitude, settings.officeLongitude, latitude, longitude);
        if (distance > settings.allowedRadiusMeters && !isTestMode) {
            insideOfficeRadius = false;
        }
    } else if (!isTestMode && (!latitude || !longitude)) {
        insideOfficeRadius = false;
    }

    // Create the WorkSession directly
    const session = new WorkSession({
        employeeId: req.user.id,
        date: dateStr,
        clockInAt: new Date(),
        status: 'ACTIVE',
        isTestSession: isTestMode,
        clockInVerification: {
            method: 'GPS',
            latitude,
            longitude,
            accuracy,
            distanceFromOffice: distance,
            insideOfficeRadius,
            verifiedAt: new Date(),
            status: insideOfficeRadius ? 'VERIFIED' : 'OUTSIDE_RADIUS'
        }
    });
    
    await session.save();

    let daily;
    try {
        // Also initialize the AttendanceDaily record
        daily = await AttendanceDaily.create({
            employeeId: req.user.id,
            date: dateStr,
            status: 'WORKING',
            isTestSession: isTestMode
        });
    } catch (error) {
        await WorkSession.deleteOne({ _id: session._id });
        throw error;
    }

    // Notify Admin Realtime
    const io = require('../server').io;
    const User = require('../models/User');
    const emp = await User.findById(req.user.id);
    if (io) {
      io.emit('employee:clocked-in', { 
        employeeId: req.user.id,
        employeeName: emp ? emp.name : 'Unknown',
        time: session.clockInAt,
        session
      });
    }

    res.json({ success: true, data: session, message: 'Clocked in successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

exports.clockOut = async (req, res) => {
  try {
    const { latitude, longitude, accuracy, isTest } = req.body;
    const settings = await AttendanceSettings.findOne() || new AttendanceSettings();
    const dateStr = getTodayDateString(settings.timezone);
    
    const isTestMode = (process.env.NODE_ENV === 'development' || req.headers.host?.includes('localhost')) && isTest === true;

    // Check if they already have a pending request
    const AttendanceRequest = require('../models/AttendanceRequest');
    const existingReq = await AttendanceRequest.findOne({ employeeId: req.user.id, date: dateStr, requestType: 'CLOCK_OUT', status: 'PENDING', isTestSession: isTestMode });
    if (existingReq) {
      return res.status(400).json({ success: false, message: 'You already have a pending Clock-Out request.' });
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

    let distance = null;
    let insideOfficeRadius = true;

    if (settings.requireLocationForClockOut) {
        if (settings.officeLatitude && settings.officeLongitude && latitude && longitude) {
            distance = getDistanceFromLatLonInM(settings.officeLatitude, settings.officeLongitude, latitude, longitude);
            if (distance > settings.allowedRadiusMeters && !isTestMode) {
                insideOfficeRadius = false;
            }
        } else if (!isTestMode && (!latitude || !longitude)) {
            insideOfficeRadius = false;
        }
    }

    // Direct Clock Out
    session.clockOutAt = new Date();
    session.status = 'COMPLETED';
    session.clockOutVerification = {
        method: 'GPS',
        latitude,
        longitude,
        accuracy,
        distanceFromOffice: distance,
        insideOfficeRadius,
        verifiedAt: new Date(),
        status: insideOfficeRadius ? 'VERIFIED' : 'OUTSIDE_RADIUS'
    };
    await session.save();

    // Recalculate daily stats and update AttendanceDaily
    const stats = await calculateSessionStats(session, settings);
    const daily = await AttendanceDaily.findOneAndUpdate(
      { employeeId: req.user.id, date: dateStr, isTestSession: isTestMode },
      { ...stats, status: 'COMPLETED' },
      { new: true }
    );

    // Notify Admin Realtime
    const io = require('../server').io;
    const User = require('../models/User');
    const emp = await User.findById(req.user.id);
    if (io) {
      io.emit('employee:clocked-out', { 
        employeeId: req.user.id,
        employeeName: emp ? emp.name : 'Unknown',
        time: session.clockOutAt,
        session,
        daily
      });
    }

    res.json({ success: true, data: session, message: 'Clocked out successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

exports.startBreak = async (req, res) => {
  try {
    const { reason, comment } = req.body;
    if (!reason) return res.status(400).json({ success: false, message: 'Break reason is required' });
    if (reason === 'Other' && (!comment || comment.trim() === '')) {
      return res.status(400).json({ success: false, message: 'Comment is required when reason is Other' });
    }

    const settings = await AttendanceSettings.findOne() || new AttendanceSettings();
    const dateStr = getTodayDateString(settings.timezone);
    
    let session = await WorkSession.findOne({ employeeId: req.user.id, date: dateStr }).sort({ createdAt: -1 });
    if (!session || session.clockOutAt) {
      return res.status(400).json({ success: false, message: 'Not actively clocked in' });
    }

    if (session.breaks.length > 0 && !session.breaks[session.breaks.length - 1].endAt) {
      return res.status(400).json({ success: false, message: 'Already on a break' });
    }

    session.breaks.push({ startAt: new Date(), reason, comment });
    await session.save();

    const AuditLog = require('../models/AuditLog');
    await AuditLog.create({
      actorId: req.user.id,
      action: 'BREAK_STARTED',
      entityType: 'WorkSession',
      entityId: session._id,
      metadata: { reason, comment }
    });

    const io = require('../server').io;
    if (io) io.emit('employee:on-break', { employeeId: req.user.id, session });

    res.json({ success: true, data: session });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

exports.endBreak = async (req, res) => {
  try {
    const { resumeComment } = req.body;
    const settings = await AttendanceSettings.findOne() || new AttendanceSettings();
    const dateStr = getTodayDateString(settings.timezone);
    
    let session = await WorkSession.findOne({ employeeId: req.user.id, date: dateStr }).sort({ createdAt: -1 });
    if (!session || session.clockOutAt) {
      return res.status(400).json({ success: false, message: 'Not actively clocked in' });
    }

    if (session.breaks.length === 0 || session.breaks[session.breaks.length - 1].endAt) {
      return res.status(400).json({ success: false, message: 'Not on a break' });
    }

    const lastBreak = session.breaks[session.breaks.length - 1];
    lastBreak.endAt = new Date();
    if (resumeComment) lastBreak.resumeComment = resumeComment;
    
    const start = moment(lastBreak.startAt);
    const end = moment(lastBreak.endAt);
    lastBreak.durationMinutes = Math.max(0, end.diff(start, 'minutes'));

    await session.save();

    const AuditLog = require('../models/AuditLog');
    await AuditLog.create({
      actorId: req.user.id,
      action: 'WORK_RESUMED',
      entityType: 'WorkSession',
      entityId: session._id,
      metadata: { durationMinutes: lastBreak.durationMinutes, resumeComment }
    });

    const io = require('../server').io;
    if (io) io.emit('employee:resumed', { employeeId: req.user.id, session });

    res.json({ success: true, data: session });
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
       session.clockOutAt = newValue ? new Date(newValue) : new Date();
       session.status = 'COMPLETED';
       session.clockOutVerification = {
           method: 'ADMIN_CORRECTION',
           verifiedAt: new Date(),
           status: 'VERIFIED'
       };
    } else if (type === 'CLOCK_IN') {
       oldValue = session.clockInAt;
       session.clockInAt = new Date(newValue);
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
