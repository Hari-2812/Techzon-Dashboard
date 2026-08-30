const cron = require('node-cron');
const moment = require('moment-timezone');
const User = require('../models/User');
const AttendanceDaily = require('../models/AttendanceDaily');
const WorkSession = require('../models/WorkSession');
const LeavePermissionRequest = require('../models/LeavePermissionRequest');
const AuditLog = require('../models/AuditLog');
const AttendanceSettings = require('../models/AttendanceSettings');
const { sendAttendanceReminderEmail } = require('../services/email.service');

const runReminderJob = async () => {
    console.log(`\n[CRON] Running 11:30 attendance reminder job for ${moment().tz('Asia/Kolkata').format('YYYY-MM-DD')} Asia/Kolkata`);
    
    try {
        const todayStr = moment().tz('Asia/Kolkata').format('YYYY-MM-DD');

        // Find the primary Admin to serve as the Actor ID for automated logs
        const adminUser = await User.findOne({ role: 'ADMIN', status: 'ACTIVE' });
        if (!adminUser) {
            console.error('[CRON] No active ADMIN user found. Aborting attendance reminder job.');
            return;
        }

        // Get Settings for Expected Login Time
        const settings = await AttendanceSettings.findOne() || { officeStartTime: '09:30 AM' };
        const expectedLoginTime = settings.officeStartTime || '09:30 AM';

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
        let failCount = 0;
        let clockedInCount = 0;
        let leavePermissionCount = 0;

        for (const emp of employees) {
            const empIdStr = emp._id.toString();

            if (!emp.email) continue;
            if (alreadyRemindedEmployeeIds.includes(empIdStr)) continue; // Prevent duplicates
            if (clockedInEmployeeIds.includes(empIdStr)) {
                clockedInCount++;
                continue; // Already clocked in
            }

            // Check their AttendanceDaily record
            const daily = todayDailies.find(d => d.employeeId.toString() === empIdStr);
            if (daily && ['LEAVE', 'PAID_LEAVE', 'HOLIDAY', 'WEEK_OFF'].includes(daily.status)) {
                leavePermissionCount++;
                continue; // Skip if on approved leave, holiday, or week off (ABSENT/LATE are NOT skipped if not clocked in)
            }

            // Check their Leave/Permission requests for today
            const requests = todayRequests.filter(r => r.employeeId.toString() === empIdStr);
            let hasPendingRequest = requests.some(r => r.status === 'APPROVED' || r.status === 'PENDING');
            
            if (hasPendingRequest) {
                leavePermissionCount++;
                continue;
            }

            // Send email
            let emailSent = false;
            try {
                await sendAttendanceReminderEmail({
                    email: emp.email,
                    name: emp.name,
                    reason: 'No Prior Information',
                    message: 'Our records indicate that you have not logged in yet today. If you are working, please clock in immediately. If you are on leave or running late, please submit the appropriate request in the portal.',
                    date: todayStr,
                    expectedLoginTime,
                    currentStatus: 'Not Clocked In'
                });
                emailSent = true;
                sentCount++;
            } catch (emailErr) {
                console.error(`[CRON] Failed to send reminder email via Brevo to ${emp.email}:`, emailErr.message);
                failCount++;
            }

            // Audit Log - Only if email was successful!
            if (emailSent) {
                try {
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
                } catch (auditErr) {
                    console.error(`[CRON] AuditLog validation failed for ${emp.email} but email was successfully sent:`, auditErr.message);
                }
            }
        }

        console.log(`[CRON] Job completed for ${todayStr}. Active Employees checked: ${employees.length} | Already clocked in: ${clockedInCount} | Excluded for Leave/Permission: ${leavePermissionCount} | Emails Sent: ${sentCount} | Emails Failed: ${failCount}`);
        
    } catch (error) {
        console.error('[CRON] Automated Attendance Reminder Job encountered a fatal error:', error);
    }
};

module.exports = (io) => {
    console.log('[CRON] Attendance reminder scheduler initialized — 11:30 AM Asia/Kolkata weekdays');
    
    // Schedule cron job to run at 11:30 AM Asia/Kolkata every day from Monday to Saturday
    cron.schedule('30 11 * * 1-6', runReminderJob, {
        scheduled: true,
        timezone: "Asia/Kolkata"
    });
};

module.exports.runReminderJob = runReminderJob;
