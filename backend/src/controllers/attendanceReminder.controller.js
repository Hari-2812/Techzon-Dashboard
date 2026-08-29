const User = require('../models/User');
const AttendanceDaily = require('../models/AttendanceDaily');
const WorkSession = require('../models/WorkSession');
const LeavePermissionRequest = require('../models/LeavePermissionRequest');
const AuditLog = require('../models/AuditLog');
const { sendAttendanceReminderEmail } = require('../services/email.service');
const moment = require('moment-timezone');

exports.getNotLoggedInEmployees = async (req, res) => {
    try {
        const todayStr = moment().tz('Asia/Kolkata').format('YYYY-MM-DD');

        // 1. Get active employees (exclude ADMIN)
        const employees = await User.find({ 
            status: 'ACTIVE',
            role: { $ne: 'ADMIN' }
        }).select('_id name email employeeId department');

        // 2. Get today's work sessions (anyone who clocked in)
        const todaySessions = await WorkSession.find({
            date: todayStr,
            isTestSession: false
        }).select('employeeId status clockInAt');
        
        const clockedInEmployeeIds = todaySessions.map(s => s.employeeId.toString());

        // 3. Get today's Daily Attendance records (for approved leave, holiday, etc.)
        const todayDailies = await AttendanceDaily.find({
            date: todayStr,
            isTestSession: false
        }).select('employeeId status');

        // 4. Get today's Leave/Permission requests
        const todayRequests = await LeavePermissionRequest.find({
            date: todayStr,
            status: { $in: ['PENDING', 'APPROVED'] }
        }).select('employeeId requestType status startTime endTime reason');

        const notLoggedInList = [];

        for (const emp of employees) {
            const empIdStr = emp._id.toString();

            // Skip if they have a WorkSession (meaning they clocked in)
            if (clockedInEmployeeIds.includes(empIdStr)) {
                continue;
            }

            // Check their AttendanceDaily record
            const daily = todayDailies.find(d => d.employeeId.toString() === empIdStr);
            if (daily) {
                // If they are on full-day leave, holiday, week off, skip them.
                if (['LEAVE', 'PAID_LEAVE', 'HOLIDAY', 'WEEK_OFF', 'ABSENT'].includes(daily.status)) {
                    continue; // They are not expected to clock in normally or are already categorized
                }
            }

            // Check their Leave/Permission requests for today
            const requests = todayRequests.filter(r => r.employeeId.toString() === empIdStr);
            
            let status = 'Not Logged In';
            let requestStatus = null;

            if (requests.length > 0) {
                const leaveReq = requests.find(r => r.requestType === 'LEAVE');
                const permReq = requests.find(r => r.requestType === 'PERMISSION');

                if (leaveReq) {
                    if (leaveReq.status === 'APPROVED') {
                        // Normally caught by daily check, but just in case
                        continue;
                    } else if (leaveReq.status === 'PENDING') {
                        status = 'Leave Requested';
                        requestStatus = 'Pending Leave';
                    }
                } else if (permReq) {
                    status = permReq.status === 'APPROVED' ? 'Permission Approved' : 'Permission Requested';
                    requestStatus = `${permReq.startTime} - ${permReq.endTime} (${permReq.status})`;
                }
            }

            // Optional: determine Late Login based on time, e.g. if time > 10:00 AM. 
            // For now, default is 'No Prior Information' unless marked.
            if (status === 'Not Logged In') {
                status = 'No Prior Information'; // Fallback descriptive state
            }

            notLoggedInList.push({
                _id: emp._id,
                name: emp.name,
                email: emp.email,
                employeeId: emp.employeeId,
                department: emp.department || 'N/A',
                status,
                requestStatus
            });
        }

        res.json({ success: true, data: notLoggedInList });
    } catch (error) {
        console.error('Error fetching not logged in employees:', error);
        res.status(500).json({ success: false, message: 'Unable to load employees who have not logged in.' });
    }
};

exports.sendRemindersBulk = async (req, res) => {
    try {
        const { employeeIds, reason, message } = req.body;

        if (!req.user || !req.user.id) {
            return res.status(401).json({ success: false, message: 'Unauthorized. Actor ID not found.' });
        }

        if (req.user.role !== 'ADMIN') {
            return res.status(403).json({ success: false, message: 'Permission denied: Admin only' });
        }

        if (!employeeIds || !Array.isArray(employeeIds) || employeeIds.length === 0) {
            return res.status(400).json({ success: false, message: 'Please select at least one employee.' });
        }
        if (!reason) {
            return res.status(400).json({ success: false, message: 'Reason is required.' });
        }

        const todayStr = moment().tz('Asia/Kolkata').format('YYYY-MM-DD');
        const employees = await User.find({ _id: { $in: employeeIds } }).select('name email employeeId');

        let successCount = 0;
        let failCount = 0;
        const results = [];

        for (const emp of employees) {
            try {
                // Validate email
                if (!emp.email) {
                    throw new Error('Employee email not found');
                }

                // Send email
                await sendAttendanceReminderEmail({
                    email: emp.email,
                    name: emp.name,
                    reason,
                    message,
                    date: todayStr
                });

                // Audit Log (Using req.user.id securely)
                await new AuditLog({
                    actorId: req.user.id,
                    action: 'SEND_ATTENDANCE_REMINDER',
                    entityType: 'User',
                    entityId: emp._id,
                    metadata: { 
                        employeeId: emp.employeeId,
                        employeeEmail: emp.email,
                        reason, 
                        adminMessage: message, 
                        sentAt: new Date(),
                        emailStatus: 'SENT'
                    }
                }).save();

                successCount++;
                results.push({ employeeId: emp._id, success: true });
            } catch (err) {
                console.error(`Failed to send email to ${emp.email}:`, err);
                failCount++;
                results.push({ employeeId: emp._id, success: false, error: err.message });
                
                // Note: We don't fail the entire request if one email/audit fails.
            }
        }

        res.json({ 
            success: true, 
            sent: successCount,
            failed: failCount,
            results,
            message: failCount === 0 ? 'Emails sent successfully.' : `Sent ${successCount} emails, failed to send ${failCount}.` 
        });
    } catch (error) {
        console.error('Error sending bulk reminders:', error);
        res.status(500).json({ success: false, message: 'Internal server error while sending reminders.' });
    }
};
