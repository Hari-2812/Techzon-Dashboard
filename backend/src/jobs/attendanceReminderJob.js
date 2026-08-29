const cron = require('node-cron');
const moment = require('moment-timezone');
const User = require('../models/User');
const AttendanceDaily = require('../models/AttendanceDaily');
const WorkSession = require('../models/WorkSession');
const LeavePermissionRequest = require('../models/LeavePermissionRequest');
const AuditLog = require('../models/AuditLog');
const { sendAttendanceReminderEmail } = require('../services/email.service');

module.exports = (io) => {
    // Schedule cron job to run at 11:00 AM Asia/Kolkata every day from Monday to Saturday
    cron.schedule('0 11 * * 1-6', async () => {
        console.log(`[CRON] Starting Automated Attendance Reminder Job at ${moment().tz('Asia/Kolkata').format()}`);
        
        try {
            const todayStr = moment().tz('Asia/Kolkata').format('YYYY-MM-DD');

            // Find the primary Admin to serve as the Actor ID for automated logs
            const adminUser = await User.findOne({ role: 'ADMIN', status: 'ACTIVE' });
            if (!adminUser) {
                console.error('[CRON] No active ADMIN user found. Aborting attendance reminder job.');
                return;
            }

            // 1. Get active employees (exclude ADMIN)
            const employees = await User.find({ 
                status: 'ACTIVE',
                role: { $ne: 'ADMIN' }
            }).select('_id name email employeeId department');

            // 2. Get today's work sessions
            const todaySessions = await WorkSession.find({
                date: todayStr,
                isTestSession: false
            }).select('employeeId status');
            
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
            }).select('employeeId requestType status');

            // 5. Get today's sent reminder audit logs to prevent duplicates
            const todayLogs = await AuditLog.find({
                action: 'ATTENDANCE_REMINDER_SENT',
                'metadata.date': todayStr
            }).select('entityId');
            const alreadyRemindedEmployeeIds = todayLogs.map(log => log.entityId.toString());

            let sentCount = 0;

            for (const emp of employees) {
                const empIdStr = emp._id.toString();

                if (!emp.email) continue;
                if (alreadyRemindedEmployeeIds.includes(empIdStr)) continue; // Prevent duplicates
                if (clockedInEmployeeIds.includes(empIdStr)) continue; // Already clocked in

                // Check their AttendanceDaily record
                const daily = todayDailies.find(d => d.employeeId.toString() === empIdStr);
                if (daily && ['LEAVE', 'PAID_LEAVE', 'HOLIDAY', 'WEEK_OFF', 'ABSENT'].includes(daily.status)) {
                    continue; // Skip if on approved leave, holiday, or week off
                }

                // Check their Leave/Permission requests for today
                const requests = todayRequests.filter(r => r.employeeId.toString() === empIdStr);
                let hasPendingRequest = false;
                
                if (requests.length > 0) {
                    const leaveReq = requests.find(r => r.requestType === 'LEAVE');
                    const permReq = requests.find(r => r.requestType === 'PERMISSION');

                    if (leaveReq && (leaveReq.status === 'APPROVED' || leaveReq.status === 'PENDING')) {
                        hasPendingRequest = true;
                    } else if (permReq && (permReq.status === 'APPROVED' || permReq.status === 'PENDING')) {
                        hasPendingRequest = true;
                    }
                }

                if (hasPendingRequest) continue;

                // Send email
                try {
                    await sendAttendanceReminderEmail({
                        email: emp.email,
                        name: emp.name,
                        reason: 'No Prior Information',
                        message: 'Our records indicate that you have not logged in yet today. If you are working, please clock in immediately. If you are on leave or running late, please submit the appropriate request in the portal.',
                        date: todayStr
                    });

                    // Audit Log using the admin user as the actor
                    await new AuditLog({
                        actorId: adminUser._id,
                        action: 'ATTENDANCE_REMINDER_SENT',
                        entityType: 'User',
                        entityId: emp._id,
                        metadata: { 
                            date: todayStr, 
                            reason: 'No Prior Information',
                            type: 'AUTOMATED_CRON_JOB'
                        }
                    }).save();

                    sentCount++;
                } catch (emailErr) {
                    console.error(`[CRON] Failed to send reminder to ${emp.email}:`, emailErr);
                }
            }

            console.log(`[CRON] Automated Attendance Reminder Job completed. Sent ${sentCount} reminders.`);
            
        } catch (error) {
            console.error('[CRON] Automated Attendance Reminder Job encountered an error:', error);
        }
    }, {
        scheduled: true,
        timezone: "Asia/Kolkata"
    });
};
