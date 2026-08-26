const AttendanceRequest = require('../models/AttendanceRequest');
const WorkSession = require('../models/WorkSession');
const AttendanceDaily = require('../models/AttendanceDaily');
const AttendanceSettings = require('../models/AttendanceSettings');
const AttendanceVerificationLog = require('../models/AttendanceVerificationLog');
const AuditLog = require('../models/AuditLog');
const { calculateSessionStats } = require('../services/attendance.service');
const moment = require('moment-timezone');

const getTodayDateString = (timezone) => moment().tz(timezone || 'Asia/Kolkata').format('YYYY-MM-DD');

exports.getPendingRequests = async (req, res) => {
    try {
        if (req.user.role !== 'ADMIN') return res.status(403).json({ success: false, message: 'Forbidden' });
        
        const requests = await AttendanceRequest.find({ status: 'PENDING' })
            .populate('employeeId', 'name employeeId')
            .sort({ requestedTime: -1 });
            
        res.json({ success: true, data: requests });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};

exports.getMyPendingRequests = async (req, res) => {
    try {
        const settings = await AttendanceSettings.findOne() || new AttendanceSettings();
        const dateStr = getTodayDateString(settings.timezone);
        
        const requests = await AttendanceRequest.find({ employeeId: req.user.id, date: dateStr, status: 'PENDING' })
            .sort({ requestedTime: -1 });
            
        res.json({ success: true, data: requests });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};

exports.approveRequest = async (req, res) => {
    try {
        if (req.user.role !== 'ADMIN') return res.status(403).json({ success: false, message: 'Forbidden' });
        
        const { requestId } = req.params;
        const { editedTime, adminComment } = req.body; 
        
        const request = await AttendanceRequest.findById(requestId);
        if (!request) return res.status(404).json({ success: false, message: 'Request not found' });
        if (request.status !== 'PENDING') return res.status(400).json({ success: false, message: 'Request is already processed' });
        
        const approvedTime = editedTime ? new Date(editedTime) : new Date(request.requestedTime);
        
        if (isNaN(approvedTime.getTime())) {
            return res.status(400).json({ success: false, message: 'Invalid timestamp provided' });
        }
        
        // Ensure the approved time is not in the future (allowing a 5 min leeway for clock drift)
        if (approvedTime.getTime() > Date.now() + 5 * 60000) {
            return res.status(400).json({ success: false, message: 'Approved time cannot be in the future' });
        }
        
        request.status = 'APPROVED';
        request.reviewedAt = new Date();
        request.reviewedBy = req.user.id;
        if (adminComment) request.adminComment = adminComment;
        await request.save();

        const settings = await AttendanceSettings.findOne() || new AttendanceSettings();
        let session;

        if (request.requestType === 'CHECK_IN') {
            if (request.isTestSession) {
                await WorkSession.deleteMany({ employeeId: request.employeeId, date: request.date, isTestSession: true });
                // We keep the daily record but update it
            }

            session = await WorkSession.create({
                employeeId: request.employeeId,
                date: request.date,
                clockInAt: approvedTime,
                status: 'WORKING',
                isTestSession: request.isTestSession
            });

            await AttendanceDaily.findOneAndUpdate(
                { employeeId: request.employeeId, date: request.date, isTestSession: request.isTestSession },
                { status: 'WORKING' },
                { upsert: true }
            );

            await AuditLog.create({
                actorId: req.user.id,
                action: 'CLOCK_IN_APPROVED',
                entityType: 'AttendanceRequest',
                entityId: request._id,
                metadata: { originalTime: request.requestedTime, approvedTime, edited: !!editedTime }
            });

            const io = req.app.get('io') || require('../server').io;
            if (io) io.emit('attendance:clock-in-approved', { employeeId: request.employeeId, session, request });

        } else if (request.requestType === 'BREAK') {
            session = await WorkSession.findOne({ employeeId: request.employeeId, date: request.date, isTestSession: request.isTestSession }).sort({ createdAt: -1 });
            if (!session) return res.status(404).json({ success: false, message: 'Session not found to take break' });
            
            session.breaks.push({
                startAt: approvedTime,
                reason: request.breakReason,
                comment: request.adminComment
            });
            session.status = 'ON_BREAK';
            await session.save();
            
            await AttendanceDaily.findOneAndUpdate(
                { employeeId: request.employeeId, date: request.date, isTestSession: request.isTestSession },
                { status: 'ON_BREAK' }
            );
            
            await AuditLog.create({
                actorId: req.user.id,
                action: 'BREAK_APPROVED',
                entityType: 'AttendanceRequest',
                entityId: request._id,
                metadata: { originalTime: request.requestedTime, approvedTime, reason: request.breakReason }
            });
            
            const io = req.app.get('io') || require('../server').io;
            if (io) io.emit('attendance:break-approved', { employeeId: request.employeeId, session, request });
            
        } else if (request.requestType === 'CHECK_OUT') {
            session = await WorkSession.findOne({ employeeId: request.employeeId, date: request.date, isTestSession: request.isTestSession }).sort({ createdAt: -1 });
            if (!session) return res.status(404).json({ success: false, message: 'Session not found to clock out' });

            session.clockOutAt = approvedTime;
            session.status = 'COMPLETED';
            await session.save();

            const stats = await calculateSessionStats(session, settings);
            
            const Holiday = require('../models/Holiday');
            const holiday = await Holiday.findOne({ date: request.date, isActive: true });
            if (holiday) {
               stats.status = 'HOLIDAY_WORKED';
            }
        
            let daily = await AttendanceDaily.findOneAndUpdate(
              { employeeId: request.employeeId, date: request.date, isTestSession: request.isTestSession },
              { ...stats, workedOnHoliday: !!holiday, status: 'COMPLETED' },
              { returnDocument: 'after', upsert: true }
            );

            await AuditLog.create({
                actorId: req.user.id,
                action: 'CLOCK_OUT_APPROVED',
                entityType: 'AttendanceRequest',
                entityId: request._id,
                metadata: { originalTime: request.requestedTime, approvedTime, edited: !!editedTime }
            });

            const io = req.app.get('io') || require('../server').io;
            if (io) io.emit('attendance:clock-out-approved', { employeeId: request.employeeId, session, daily, request });
        }

        res.json({ success: true, message: 'Request approved successfully', session });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};

exports.rejectRequest = async (req, res) => {
    try {
        if (req.user.role !== 'ADMIN') return res.status(403).json({ success: false, message: 'Forbidden' });
        
        const { requestId } = req.params;
        const { rejectionReason } = req.body;
        
        const request = await AttendanceRequest.findById(requestId);
        if (!request) return res.status(404).json({ success: false, message: 'Request not found' });
        if (request.status !== 'PENDING') return res.status(400).json({ success: false, message: 'Request is already processed' });
        
        request.status = 'REJECTED';
        request.reviewedAt = new Date();
        request.reviewedBy = req.user.id;
        request.rejectionReason = rejectionReason || 'Rejected by Admin';
        await request.save();

        let session;
        if (request.requestType === 'BREAK' || request.requestType === 'CHECK_OUT') {
            session = await WorkSession.findOne({ employeeId: request.employeeId, date: request.date, isTestSession: request.isTestSession }).sort({ createdAt: -1 });
            if (session) {
                session.status = 'WORKING';
                await session.save();
                
                await AttendanceDaily.findOneAndUpdate(
                    { employeeId: request.employeeId, date: request.date, isTestSession: request.isTestSession },
                    { status: 'WORKING' }
                );
            }
        } else if (request.requestType === 'CHECK_IN') {
             await AttendanceDaily.findOneAndUpdate(
                 { employeeId: request.employeeId, date: request.date, isTestSession: request.isTestSession },
                 { status: 'REJECTED' }
             );
        }

        await AuditLog.create({
            actorId: req.user.id,
            action: `${request.requestType}_REJECTED`,
            entityType: 'AttendanceRequest',
            entityId: request._id,
            metadata: { rejectionReason }
        });

        const io = req.app.get('io') || require('../server').io;
        if (io) {
            io.emit('attendance:request-rejected', { employeeId: request.employeeId, request, session });
        }

        res.json({ success: true, message: 'Request rejected successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};

exports.createManualAttendance = async (req, res) => {
    try {
        if (req.user.role !== 'ADMIN') return res.status(403).json({ success: false, message: 'Forbidden' });
        
        const { employeeId, date, clockInAt, clockOutAt, status, reason, breaks } = req.body;
        
        if (!employeeId || !date || !clockInAt || !status || !reason) {
            return res.status(400).json({ success: false, message: 'Missing required fields' });
        }

        const existingSession = await WorkSession.findOne({ employeeId, date, isTestSession: false });
        if (existingSession) {
            return res.status(400).json({ success: false, message: 'Attendance already exists for this date. Use Correction instead.' });
        }

        const session = await WorkSession.create({
            employeeId,
            date,
            clockInAt: new Date(clockInAt),
            clockOutAt: clockOutAt ? new Date(clockOutAt) : null,
            status: clockOutAt ? 'COMPLETED' : 'ACTIVE',
            isTestSession: false,
            breaks: breaks || []
        });

        const settings = await AttendanceSettings.findOne() || new AttendanceSettings();
        const stats = await calculateSessionStats(session, settings);
        
        await AttendanceDaily.create({
            employeeId,
            date,
            status,
            isTestSession: false,
            ...stats
        });

        await AuditLog.create({
            actorId: req.user.id,
            action: 'MANUAL_ATTENDANCE_CREATED',
            entityType: 'WorkSession',
            entityId: session._id,
            metadata: { date, reason }
        });

        res.json({ success: true, message: 'Manual attendance created successfully', data: session });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};
