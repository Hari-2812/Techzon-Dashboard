const cron = require('node-cron');
const moment = require('moment-timezone');
const User = require('../models/User');
const AttendanceDaily = require('../models/AttendanceDaily');
const WorkSession = require('../models/WorkSession');
const LeavePermissionRequest = require('../models/LeavePermissionRequest');
const AuditLog = require('../models/AuditLog');
const AttendanceReminderLog = require('../models/AttendanceReminderLog');
const AttendanceSettings = require('../models/AttendanceSettings');
const { sendAttendanceReminderEmail } = require('../services/email.service');
let globalIo = null;

const runReminderJob = async () => {
    console.log(`\n[CRON] Attendance reminder job started`);
    console.log(`[CRON] Current IST time: ${moment().tz('Asia/Kolkata').format()}`);
    
    try {
        const todayStr = moment().tz('Asia/Kolkata').format('YYYY-MM-DD');
        const currentTime = moment().tz('Asia/Kolkata');

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
        });

        let sentCount = 0;
        let failCount = 0;
        let auditFailCount = 0;
        let clockedInCount = 0;
        let leavePermissionCount = 0;
        let eligibleCount = 0;
        let skippedCount = 0;

        for (const emp of employees) {
            const empIdStr = emp._id.toString();

            if (!emp.email) {
                skippedCount++;
                continue;
            }

            // Check if already sent today
            const existingLog = await AttendanceReminderLog.findOne({ employeeId: emp._id, date: todayStr });
            if (existingLog && existingLog.status === 'SENT') {
                skippedCount++;
                continue; // Prevent duplicates
            }

            let isNotRequired = false;

            if (clockedInEmployeeIds.includes(empIdStr)) {
                clockedInCount++;
                isNotRequired = true;
            } else {
                // Check their AttendanceDaily record
                const daily = todayDailies.find(d => d.employeeId.toString() === empIdStr);
                if (daily && ['LEAVE', 'PAID_LEAVE', 'HOLIDAY', 'WEEK_OFF'].includes(daily.status)) {
                    leavePermissionCount++;
                    isNotRequired = true;
                } else {
                    // Check their Leave/Permission requests for today
                    const requests = todayRequests.filter(r => r.employeeId.toString() === empIdStr);
                    let hasExcludingRequest = false;
                    
                    for (const r of requests) {
                        if (r.requestType === 'LEAVE') {
                            hasExcludingRequest = true; // Full day leave excludes them
                            break;
                        }
                        
                        if (r.requestType === 'LATE' && r.clockInTime) {
                            const expectedLateTime = moment.tz(`${todayStr} ${r.clockInTime}`, 'YYYY-MM-DD HH:mm', 'Asia/Kolkata');
                            if (currentTime.isBefore(expectedLateTime)) {
                                hasExcludingRequest = true; // They are expected to be late and it's not time yet
                                break;
                            }
                        }
                        
                        if (r.requestType === 'PERMISSION' && r.startTime && r.endTime) {
                            const permStart = moment.tz(`${todayStr} ${r.startTime}`, 'YYYY-MM-DD HH:mm', 'Asia/Kolkata');
                            if (permStart.isSameOrBefore(currentTime)) {
                                hasExcludingRequest = true;
                                break;
                            }
                        }
                    }
                    
                    if (hasExcludingRequest) {
                        leavePermissionCount++;
                        isNotRequired = true;
                    }
                }
            }

            if (isNotRequired) {
                // Optionally save NOT_REQUIRED state for clarity if not already logged
                if (!existingLog) {
                    await AttendanceReminderLog.create({
                        employeeId: emp._id,
                        date: todayStr,
                        email: emp.email,
                        status: 'NOT_REQUIRED',
                        reason: 'Not required due to existing attendance status'
                    });
                }
                skippedCount++;
                continue;
            }

            eligibleCount++;

            // Create or update PENDING log
            let reminderLog = existingLog;
            if (!reminderLog) {
                reminderLog = new AttendanceReminderLog({
                    employeeId: emp._id,
                    date: todayStr,
                    email: emp.email,
                    status: 'PENDING',
                    reason: 'No Prior Information',
                    expectedLoginTime
                });
                await reminderLog.save();
            } else {
                reminderLog.status = 'PENDING';
                await reminderLog.save();
            }

            // Send email
            let emailSent = false;
            let emailErrorMsg = '';
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
                
                reminderLog.status = 'SENT';
                reminderLog.sentAt = new Date();
                await reminderLog.save();
            } catch (emailErr) {
                emailErrorMsg = emailErr.message || 'Unknown Brevo Error';
                console.error(`[CRON] Failed to send reminder email via Brevo to ${emp.email}:`, emailErrorMsg);
                failCount++;
                
                reminderLog.status = 'FAILED';
                reminderLog.failureReason = emailErrorMsg.substring(0, 200); // Safe truncation
                await reminderLog.save();
            }

            // Audit Log - Only if email was successful!
            if (emailSent) {
                try {
                    await new AuditLog({
                        actorId: adminUser._id,
                        action: 'SEND_ATTENDANCE_REMINDER',
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
                    auditFailCount++;
                }
            }
        }

        console.log(`[CRON] Active employees found: ${employees.length}`);
        console.log(`[CRON] Already clocked in: ${clockedInCount}`);
        console.log(`[CRON] Approved leave/permission: ${leavePermissionCount}`);
        console.log(`[CRON] Eligible for reminder: ${eligibleCount}`);
        console.log(`[CRON] Emails sent: ${sentCount}`);
        console.log(`[CRON] Emails failed: ${failCount}`);
        if (auditFailCount > 0) console.log(`[CRON] Audit logs failed: ${auditFailCount}`);
        console.log(`[CRON] Attendance reminder job completed`);

        // Emit socket event to refresh frontend dashboard
        if (globalIo) {
            globalIo.emit('attendance:reminder-status-updated', { date: todayStr });
        }
        
    } catch (error) {
        console.error('[CRON] Attendance reminder job encountered a fatal error:', error);
    }
};

module.exports = (io) => {
    globalIo = io; // Store for the background job
    console.log('[CRON] Attendance reminder scheduler initialized');
    console.log('[CRON] Schedule: 11:30 AM Asia/Kolkata');
    console.log('[CRON] Weekdays: Monday-Saturday');
    
    // Schedule cron job to run at 11:30 AM Asia/Kolkata every day from Monday to Saturday
    cron.schedule('30 11 * * 1-6', runReminderJob, {
        scheduled: true,
        timezone: "Asia/Kolkata"
    });
};

module.exports.runReminderJob = runReminderJob;
