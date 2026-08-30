const LeavePermissionRequest = require('../models/LeavePermissionRequest');
const User = require('../models/User');
const AuditLog = require('../models/AuditLog');
const moment = require('moment-timezone');
const WorkSession = require('../models/WorkSession');
const AttendanceDaily = require('../models/AttendanceDaily');
const AttendanceSettings = require('../models/AttendanceSettings');

const getTodayDateString = (timezone) => moment().tz(timezone || 'Asia/Kolkata').format('YYYY-MM-DD');

exports.getTodayAdminAttendance = async (req, res) => {
  try {
    const settings = await AttendanceSettings.findOne() || new AttendanceSettings();
    const dateStr = getTodayDateString(settings.timezone);
    const isTestMode = (process.env.NODE_ENV === 'development' || req.headers.host?.includes('localhost'));
    const queryCondition = { date: dateStr, ...(isTestMode ? {} : { isTestSession: false }) };
    
    // Get all sessions and daily records for today
    const sessions = await WorkSession.find(queryCondition).populate('employeeId', 'name email role');
    const existingDailies = await AttendanceDaily.find(queryCondition).populate('employeeId', 'name email role');
    
    // Get all active employees (excluding ADMINs)
    const employees = await User.find({ isActive: true, role: { $ne: 'ADMIN' } }).select('_id name email role employeeId department');
    
    // Get all leave/permission requests for today
    const todayRequests = await LeavePermissionRequest.find({
        date: dateStr,
        status: { $in: ['PENDING', 'APPROVED'] }
    });
    
    // Build the full dailies array combining existing records and synthesized records
    let dailies = [];
    
    for (const emp of employees) {
        const empIdStr = emp._id.toString();
        const existingDaily = existingDailies.find(d => d.employeeId && d.employeeId._id.toString() === empIdStr);
        
        if (existingDaily) {
            dailies.push(existingDaily);
        } else {
            // Check for leave/permission requests
            const requests = todayRequests.filter(r => r.employeeId.toString() === empIdStr);
            let status = 'Not Clocked In';
            let requestStatus = null;
            
            if (requests.length > 0) {
                const leaveReq = requests.find(r => r.requestType === 'LEAVE');
                const permReq = requests.find(r => r.requestType === 'PERMISSION');

                if (leaveReq) {
                    if (leaveReq.status === 'APPROVED') {
                        status = 'Leave Approved';
                    } else if (leaveReq.status === 'PENDING') {
                        status = 'Leave Requested';
                    }
                } else if (permReq) {
                    status = permReq.status === 'APPROVED' ? 'Permission Approved' : 'Permission Requested';
                }
            } else {
                status = 'No Prior Information';
            }
            
            // Push synthesized record
            dailies.push({
                _id: 'synth_' + empIdStr,
                employeeId: emp,
                date: dateStr,
                status: status,
                workedMinutes: 0,
                breakMinutes: 0,
                lateMinutes: 0,
                isSynthesized: true // Helpful flag for frontend
            });
        }
    }

    // Aggregations
    let summary = {
      present: 0,
      late: 0,
      halfDay: 0,
      absent: 0,
      onLeave: 0,
      currentlyWorking: 0,
      missingClockOut: 0,
      onBreak: 0,
      notClockedIn: 0
    };

    dailies.forEach(d => {
      if (['PRESENT', 'LATE', 'HALF_DAY', 'WORKING', 'ON_BREAK', 'COMPLETED', 'EARLY_LEAVE', 'OVERTIME', 'PENDING_BREAK_APPROVAL', 'PENDING_CHECK_OUT_APPROVAL'].includes(d.status)) summary.present++;
      
      if (d.status === 'WORKING' || d.status === 'PENDING_BREAK_APPROVAL' || d.status === 'PENDING_CHECK_OUT_APPROVAL') summary.currentlyWorking++;
      if (d.status === 'ON_BREAK') summary.onBreak++;
      if (d.status === 'LATE') summary.late++;
      if (d.status === 'HALF_DAY') summary.halfDay++;
      if (d.status === 'ABSENT') summary.absent++;
      if (d.status === 'PAID_LEAVE' || d.status === 'Leave Approved') summary.onLeave++;
      if (d.status === 'MISSING_CLOCK_OUT') summary.missingClockOut++;
      
      if (d.isSynthesized && (d.status === 'No Prior Information' || d.status === 'Not Clocked In')) {
          summary.notClockedIn++;
      } else if (!d.isSynthesized && ['PENDING', 'PENDING_CHECK_IN_APPROVAL', 'REJECTED'].includes(d.status)) {
          summary.notClockedIn++;
      }
    });

    res.json({ success: true, data: { summary, sessions, dailies, date: dateStr } });
  } catch (err) {
    console.error('Error fetching today admin attendance:', err);
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


exports.manualCorrection = async (req, res) => {
    try {
        const { employeeId, date, status, clockInTime, clockOutTime, reason, adminRemarks, startTime, endTime } = req.body;
        
        if (!employeeId || !date || !status) {
            return res.status(400).json({ success: false, message: 'Employee, date, and status are required.' });
        }

        const AttendanceDaily = require('../models/AttendanceDaily');
        const WorkSession = require('../models/WorkSession');
        const LeavePermissionRequest = require('../models/LeavePermissionRequest');
        const AuditLog = require('../models/AuditLog');
        const moment = require('moment-timezone');

        let daily = await AttendanceDaily.findOne({ employeeId, date, isTestSession: false });
        let session = await WorkSession.findOne({ employeeId, date, isTestSession: false }).sort({ createdAt: -1 });

        const oldStatus = daily ? daily.status : 'Not Clocked In';
        const oldClockIn = session ? session.clockInAt : null;
        const oldClockOut = session ? session.clockOutAt : null;

        // Date/Time Parsing Logic
        const parseTime = (timeStr) => {
            if (!timeStr) return null;
            const [hours, minutes] = timeStr.split(':');
            return moment.tz(date, 'Asia/Kolkata').set({ hour: parseInt(hours), minute: parseInt(minutes), second: 0 }).toDate();
        };

        const newClockIn = parseTime(clockInTime);
        const newClockOut = parseTime(clockOutTime);

        // Manage LeavePermissionRequest if status is LEAVE or PERMISSION
        if (['LEAVE', 'PERMISSION'].includes(status)) {
            const existingReq = await LeavePermissionRequest.findOne({
                employeeId, date, requestType: status, status: { $in: ['PENDING', 'APPROVED'] }
            });
            if (!existingReq) {
                const leaveReq = new LeavePermissionRequest({
                    employeeId,
                    requestType: status,
                    date,
                    startTime: status === 'PERMISSION' ? startTime : undefined,
                    endTime: status === 'PERMISSION' ? endTime : undefined,
                    reason: reason || 'Manually updated by Admin',
                    status: 'APPROVED',
                    adminRemarks: adminRemarks || 'Created via Admin Manual Correction',
                    approvedBy: req.user.id,
                    approvedAt: new Date()
                });
                await leaveReq.save();
            }
        }

        // AttendanceDaily logic
        if (!daily) {
            daily = new AttendanceDaily({ employeeId, date, isTestSession: false });
        }

        if (['LEAVE', 'ABSENT'].includes(status)) {
            daily.status = status;
            // End active session if any
            if (session && !session.clockOutAt) {
                session.clockOutAt = moment.tz('Asia/Kolkata').toDate();
                session.status = 'COMPLETED';
                await session.save();
            }
        } else if (['PRESENT', 'LATE', 'PERMISSION'].includes(status)) {
            daily.status = status === 'PERMISSION' ? (daily.status === 'PENDING' ? 'WORKING' : daily.status) : (status === 'PRESENT' ? 'WORKING' : 'LATE');
            
            // Manage WorkSession for PRESENT and LATE
            if (newClockIn) {
                if (!session) {
                    session = new WorkSession({ employeeId, date, isTestSession: false });
                }
                session.clockInAt = newClockIn;
                if (newClockOut) {
                    session.clockOutAt = newClockOut;
                    session.status = 'COMPLETED';
                } else {
                    session.clockOutAt = null;
                    session.status = 'RUNNING';
                }
                await session.save();
            }
        }

        await daily.save();

        // Save AuditLog
        const logEntry = new AuditLog({
            actorId: req.user.id,
            action: 'ADMIN_MANUAL_ATTENDANCE_CORRECTION',
            entityType: 'Attendance',
            entityId: daily._id,
            metadata: {
                employeeId,
                date,
                oldStatus,
                newStatus: status,
                oldClockIn,
                newClockIn,
                oldClockOut,
                newClockOut,
                reason,
                adminRemarks,
                startTime,
                endTime
            },
            timestamp: new Date()
        });
        await logEntry.save();

        const io = req.app.get('io');
        if (io) {
            io.emit('attendance:admin-edit-attendance', { employeeId, date, status });
        }

        res.json({ success: true, message: 'Attendance manually corrected successfully.' });
    } catch (err) {
        console.error('Manual Correction error:', err);
        res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
};
