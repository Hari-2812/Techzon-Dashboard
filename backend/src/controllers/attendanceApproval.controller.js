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
        
        const approvedTime = editedTime ? new Date(editedTime) : request.requestedTime;
        
        request.status = 'APPROVED';
        request.reviewedAt = new Date();
        request.reviewedBy = req.user.id;
        if (adminComment) request.adminComment = adminComment;
        await request.save();

        const settings = await AttendanceSettings.findOne() || new AttendanceSettings();
        let session;

        if (request.requestType === 'CLOCK_IN') {
            const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
            
            if (request.isTestSession) {
                await WorkSession.deleteMany({ employeeId: request.employeeId, date: request.date, isTestSession: true });
                await AttendanceDaily.deleteMany({ employeeId: request.employeeId, date: request.date, isTestSession: true });
            }

            session = await WorkSession.create({
                employeeId: request.employeeId,
                date: request.date,
                clockInAt: approvedTime,
                status: 'ACTIVE',
                isTestSession: request.isTestSession,
                clockInVerification: {
                    method: 'GPS',
                    latitude: request.location?.latitude,
                    longitude: request.location?.longitude,
                    accuracy: request.location?.accuracy,
                    distanceFromOffice: request.location?.distanceFromOffice,
                    verifiedAt: new Date(),
                    ipAddress: clientIp,
                    status: 'VERIFIED_BY_ADMIN'
                }
            });

            await AttendanceDaily.create({
                employeeId: request.employeeId,
                date: request.date,
                status: 'PRESENT',
                isTestSession: request.isTestSession
            });

            await AuditLog.create({
                actorId: req.user.id,
                action: 'CLOCK_IN_APPROVED',
                entityType: 'AttendanceRequest',
                entityId: request._id,
                metadata: { originalTime: request.requestedTime, approvedTime, edited: !!editedTime }
            });

            const io = require('../server').io;
            if (io) io.emit('attendance:clock-in-approved', { employeeId: request.employeeId, session, request });

        } else if (request.requestType === 'CLOCK_OUT') {
            session = await WorkSession.findOne({ employeeId: request.employeeId, date: request.date, isTestSession: request.isTestSession }).sort({ createdAt: -1 });
            if (!session) return res.status(404).json({ success: false, message: 'Session not found to clock out' });

            const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
            session.clockOutAt = approvedTime;
            session.status = 'COMPLETED';
            session.clockOutVerification = {
                method: 'GPS',
                latitude: request.location?.latitude,
                longitude: request.location?.longitude,
                accuracy: request.location?.accuracy,
                distanceFromOffice: request.location?.distanceFromOffice,
                verifiedAt: new Date(),
                ipAddress: clientIp,
                status: 'VERIFIED_BY_ADMIN'
            };
            await session.save();

            const stats = await calculateSessionStats(session, settings);
            
            const Holiday = require('../models/Holiday');
            const holiday = await Holiday.findOne({ date: request.date, isActive: true });
            if (holiday) {
               stats.status = 'HOLIDAY_WORKED';
            }
        
            let daily = await AttendanceDaily.findOneAndUpdate(
              { employeeId: request.employeeId, date: request.date, isTestSession: request.isTestSession },
              { ...stats, workedOnHoliday: !!holiday },
              { returnDocument: 'after', upsert: true }
            );

            await AuditLog.create({
                actorId: req.user.id,
                action: 'CLOCK_OUT_APPROVED',
                entityType: 'AttendanceRequest',
                entityId: request._id,
                metadata: { originalTime: request.requestedTime, approvedTime, edited: !!editedTime }
            });

            const io = require('../server').io;
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

        await AuditLog.create({
            actorId: req.user.id,
            action: request.requestType === 'CLOCK_IN' ? 'CLOCK_IN_REJECTED' : 'CLOCK_OUT_REJECTED',
            entityType: 'AttendanceRequest',
            entityId: request._id,
            metadata: { rejectionReason }
        });

        const io = require('../server').io;
        if (io) {
            const eventName = request.requestType === 'CLOCK_IN' ? 'attendance:clock-in-rejected' : 'attendance:clock-out-rejected';
            io.emit(eventName, { employeeId: request.employeeId, request });
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
            clockInVerification: {
                method: 'MANUAL_ENTRY',
                verifiedAt: new Date(),
                status: 'VERIFIED_BY_ADMIN'
            },
            clockOutVerification: clockOutAt ? {
                method: 'MANUAL_ENTRY',
                verifiedAt: new Date(),
                status: 'VERIFIED_BY_ADMIN'
            } : null,
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
