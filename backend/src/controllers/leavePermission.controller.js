const LeavePermissionRequest = require('../models/LeavePermissionRequest');
const AttendanceDaily = require('../models/AttendanceDaily');
const WorkSession = require('../models/WorkSession');
const moment = require('moment-timezone');

exports.submitRequest = async (req, res) => {
    try {
        const { requestType, date, startTime, endTime, reason } = req.body;
        
        if (!['LEAVE', 'PERMISSION'].includes(requestType)) {
            return res.status(400).json({ success: false, message: 'Invalid request type' });
        }
        
        if (!date || !reason) {
            return res.status(400).json({ success: false, message: 'Date and reason are required' });
        }

        if (requestType === 'PERMISSION' && (!startTime || !endTime)) {
            return res.status(400).json({ success: false, message: 'Start time and end time are required for permission' });
        }

        // Check for duplicate pending or approved requests for the same date/type
        const existingRequest = await LeavePermissionRequest.findOne({
            employeeId: req.user._id,
            date,
            status: { $in: ['PENDING', 'APPROVED'] }
        });

        if (existingRequest) {
            if (existingRequest.requestType === 'LEAVE') {
                 return res.status(400).json({ success: false, message: 'You already have a leave request for this date.' });
            }
        }

        const newReq = new LeavePermissionRequest({
            employeeId: req.user._id,
            requestType,
            date,
            startTime,
            endTime,
            reason,
            status: 'PENDING'
        });

        await newReq.save();

        res.status(201).json({ success: true, request: newReq });
    } catch (err) {
        console.error('Submit Leave/Permission error:', err);
        res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
};

exports.getMyRequests = async (req, res) => {
    try {
        const requests = await LeavePermissionRequest.find({ employeeId: req.user._id }).sort({ createdAt: -1 });
        res.json({ success: true, requests });
    } catch (err) {
        console.error('Get My Requests error:', err);
        res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
};

exports.getAllRequests = async (req, res) => {
    try {
        const { status, type } = req.query;
        let filter = {};
        if (status && status !== 'ALL') filter.status = status;
        if (type && type !== 'ALL') filter.requestType = type;

        const requests = await LeavePermissionRequest.find(filter)
            .populate('employeeId', 'name email employeeId')
            .sort({ createdAt: -1 });
        res.json({ success: true, requests });
    } catch (err) {
        console.error('Get All Requests error:', err);
        res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
};

exports.approveRequest = async (req, res) => {
    try {
        const { id } = req.params;
        const leaveReq = await LeavePermissionRequest.findById(id);
        if (!leaveReq) return res.status(404).json({ success: false, message: 'Request not found' });
        
        leaveReq.status = 'APPROVED';
        leaveReq.approvedBy = req.user._id;
        leaveReq.approvedAt = new Date();
        await leaveReq.save();

        // Dynamic Attendance Logic for LEAVE
        if (leaveReq.requestType === 'LEAVE') {
            const dateStr = leaveReq.date; // already YYYY-MM-DD in Asia/Kolkata
            
            // Check if AttendanceDaily exists for this date
            let daily = await AttendanceDaily.findOne({ employeeId: leaveReq.employeeId, date: dateStr, isTestSession: false });
            if (!daily) {
                daily = new AttendanceDaily({
                    employeeId: leaveReq.employeeId,
                    date: dateStr,
                    status: 'LEAVE',
                    isTestSession: false
                });
            } else {
                daily.status = 'LEAVE';
            }
            await daily.save();
        }

        const io = req.app.get('io');
        if (io) {
            io.emit('leaveRequest:updated', { 
                employeeId: leaveReq.employeeId,
                requestId: leaveReq._id,
                status: 'APPROVED',
                requestType: leaveReq.requestType,
                date: leaveReq.date
            });
        }

        res.json({ success: true, request: leaveReq });
    } catch (err) {
        console.error('Approve Request error:', err);
        res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
};

exports.rejectRequest = async (req, res) => {
    try {
        const { id } = req.params;
        const { reason } = req.body;
        if (!reason) return res.status(400).json({ success: false, message: 'Rejection reason is required' });

        const leaveReq = await LeavePermissionRequest.findById(id);
        if (!leaveReq) return res.status(404).json({ success: false, message: 'Request not found' });
        
        leaveReq.status = 'REJECTED';
        leaveReq.adminRemarks = reason;
        leaveReq.rejectedBy = req.user._id;
        leaveReq.rejectedAt = new Date();
        await leaveReq.save();

        const io = req.app.get('io');
        if (io) {
            io.emit('leaveRequest:updated', { 
                employeeId: leaveReq.employeeId,
                requestId: leaveReq._id,
                status: 'REJECTED',
                requestType: leaveReq.requestType,
                date: leaveReq.date,
                reason
            });
        }

        res.json({ success: true, request: leaveReq });
    } catch (err) {
        console.error('Reject Request error:', err);
        res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
};

exports.adminCreateLeave = async (req, res) => {
    try {
        const { employeeId, requestType, date, startTime, endTime, reason } = req.body;

        if (!employeeId || !date || !reason || !requestType) {
            return res.status(400).json({ success: false, message: 'Employee, Date, Type, and Reason are required.' });
        }

        if (requestType === 'PERMISSION' && (!startTime || !endTime)) {
            return res.status(400).json({ success: false, message: 'Start time and end time are required for permission.' });
        }

        if (requestType === 'LEAVE') {
            const activeSession = await WorkSession.findOne({ 
                employeeId, 
                date, 
                isTestSession: false, 
                status: { $in: ['RUNNING', 'ON_BREAK'] } 
            });
            if (activeSession) {
                return res.status(400).json({ success: false, message: 'Employee has an active work session for this date. Force clock-out first.' });
            }
            
            const completedSession = await WorkSession.findOne({ 
                employeeId, 
                date, 
                isTestSession: false, 
                status: 'COMPLETED' 
            });
            if (completedSession) {
                return res.status(400).json({ success: false, message: 'Employee already completed a work session for this date. Cannot mark as full-day leave.' });
            }
        }

        const existingRequest = await LeavePermissionRequest.findOne({
            employeeId,
            date,
            requestType,
            status: { $in: ['PENDING', 'APPROVED'] }
        });

        if (existingRequest) {
            return res.status(400).json({ success: false, message: 'Employee already has a pending or approved request for this date.' });
        }

        const leaveReq = new LeavePermissionRequest({
            employeeId,
            requestType,
            date,
            startTime,
            endTime,
            reason,
            status: 'APPROVED',
            adminRemarks: 'Created by Admin',
            approvedBy: req.user._id,
            approvedAt: new Date()
        });

        await leaveReq.save();

        if (requestType === 'LEAVE') {
            let daily = await AttendanceDaily.findOne({ employeeId, date, isTestSession: false });
            if (!daily) {
                daily = new AttendanceDaily({
                    employeeId,
                    date,
                    status: 'LEAVE',
                    isTestSession: false
                });
            } else {
                daily.status = 'LEAVE';
            }
            await daily.save();
        }

        const io = req.app.get('io');
        if (io) {
            io.emit('leaveRequest:updated', { 
                employeeId,
                requestId: leaveReq._id,
                status: 'APPROVED',
                requestType: leaveReq.requestType,
                date: leaveReq.date
            });
        }

        res.status(201).json({ success: true, request: leaveReq });
    } catch (err) {
        console.error('Admin Create Leave error:', err);
        res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
};
