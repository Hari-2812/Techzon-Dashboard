const Lead = require('../models/Lead');
const LeadActivity = require('../models/LeadActivity');
const CRActivity = require('../models/CRActivity');
const FollowUp = require('../models/FollowUp');
const Sale = require('../models/Sale');
const User = require('../models/User');

async function getMetricsForEmployeeAndDate(uid, start, end) {
    const dateQuery = { $gte: start, $lte: end };

    const leadsAssigned = await LeadActivity.countDocuments({
        employeeId: uid,
        activityType: { $in: ['LEAD_ASSIGNED', 'LEAD_REASSIGNED'] },
        timestamp: dateQuery
    });

    const leadsContacted = await LeadActivity.countDocuments({
        employeeId: uid,
        activityType: { $in: ['CALL_COMPLETED', 'CALL_RECORDED'] },
        timestamp: dateQuery
    });

    const leadsCompleted = await LeadActivity.countDocuments({
        employeeId: uid,
        activityType: 'LEAD_COMPLETED',
        timestamp: dateQuery
    });

    const pendingLeads = Math.max(0, leadsAssigned - leadsCompleted);

    const salesAssigned = await Sale.countDocuments({
        employeeId: uid,
        date: dateQuery
    });

    const salesContacted = await Sale.countDocuments({
        employeeId: uid,
        status: { $ne: 'Lead' },
        updatedAt: dateQuery
    });

    const salesConvertedList = await Sale.find({
        employeeId: uid,
        status: { $in: ['Converted', 'Payment Received'] },
        updatedAt: dateQuery
    });

    const salesConverted = salesConvertedList.length;
    const pendingSales = Math.max(0, salesAssigned - salesConverted);
    const revenue = salesConvertedList.reduce((acc, sale) => acc + sale.amount, 0);

    const conversionRate = salesAssigned > 0 ? parseFloat(((salesConverted / salesAssigned) * 100).toFixed(2)) : 0;
    const completionRate = leadsAssigned > 0 ? parseFloat(((leadsCompleted / leadsAssigned) * 100).toFixed(2)) : 0;

    let performanceScore = 'Needs Attention';
    if (conversionRate >= 80 || completionRate >= 80) performanceScore = 'Excellent';
    else if (conversionRate >= 50 || completionRate >= 50) performanceScore = 'Good';

    // Also get CRs and followups just in case UI needs them, though mostly omitted in new tables
    const crsIdentified = await LeadActivity.countDocuments({
        employeeId: uid,
        activityType: 'CR_IDENTIFIED',
        timestamp: dateQuery
    });

    const followUpsCompleted = await FollowUp.countDocuments({
        assignedEmployeeId: uid,
        status: 'Completed',
        completedAt: dateQuery
    });

    return {
        leadsAssigned, leadsContacted, leadsCompleted, pendingLeads, completionRate,
        salesAssigned, salesContacted, salesConverted, pendingSales, conversionRate, revenue,
        performanceScore, crsIdentified, followUpsCompleted
    };
}

exports.getPerformance = async (req, res) => {
    try {
        const { dateFilter, employeeId, specificDate } = req.query;
        let startDate, endDate;
        
        const now = new Date();
        const offset = 5.5 * 60 * 60 * 1000;
        
        if (specificDate) {
            startDate = new Date(`${specificDate}T00:00:00+05:30`);
            endDate = new Date(`${specificDate}T23:59:59.999+05:30`);
        } else {
            const todayStr = new Date(now.getTime() + offset).toISOString().split('T')[0];
            startDate = new Date(`${todayStr}T00:00:00+05:30`);
            endDate = new Date(`${todayStr}T23:59:59.999+05:30`);
            
            if (dateFilter === 'Yesterday') {
                const yesterday = new Date(startDate.getTime() - 24 * 60 * 60 * 1000);
                startDate = new Date(yesterday.toISOString().split('T')[0] + 'T00:00:00+05:30');
                endDate = new Date(yesterday.toISOString().split('T')[0] + 'T23:59:59.999+05:30');
            } else if (dateFilter === 'This Week') {
                const day = startDate.getDay();
                const diff = startDate.getDate() - day + (day == 0 ? -6:1);
                startDate = new Date(startDate.setDate(diff));
            } else if (dateFilter === 'This Month') {
                startDate = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
                startDate = new Date(`${startDate.toISOString().split('T')[0]}T00:00:00+05:30`);
            }
        }

        const isSpecificEmployee = req.user.role !== 'ADMIN' || (employeeId && employeeId !== 'all');
        const uid = req.user.role !== 'ADMIN' ? req.user.id : employeeId;

        if (isSpecificEmployee) {
            // Aggregate totals for the period
            const aggregate = await getMetricsForEmployeeAndDate(uid, startDate, endDate);
            
            // Build daily history if range > 1 day
            const history = [];
            let currentDate = new Date(startDate.getTime());
            while (currentDate <= endDate && currentDate <= new Date(now.getTime() + offset)) {
                const dayEnd = new Date(currentDate.getTime());
                dayEnd.setHours(23, 59, 59, 999);
                
                const dailyMetrics = await getMetricsForEmployeeAndDate(uid, currentDate, dayEnd);
                
                // Only push if there's actual activity to avoid empty rows as requested
                if (dailyMetrics.leadsAssigned > 0 || dailyMetrics.leadsCompleted > 0 || dailyMetrics.salesAssigned > 0 || dailyMetrics.salesConverted > 0 || dailyMetrics.crsIdentified > 0) {
                    history.push({
                        date: currentDate.toISOString().split('T')[0],
                        ...dailyMetrics
                    });
                }
                
                currentDate.setDate(currentDate.getDate() + 1);
            }

            const user = await User.findById(uid, 'name role');

            return res.json({
                success: true,
                data: {
                    employee: { _id: user._id, name: user.name, role: user.role },
                    aggregate,
                    history: history.sort((a,b) => new Date(b.date) - new Date(a.date)) // descending
                }
            });
        }

        // All employees view
        const users = await User.find({ role: { $in: ['RGS', 'BDE'] }, isActive: true }, 'name role email');
        const performanceData = [];

        for (let user of users) {
            const metrics = await getMetricsForEmployeeAndDate(user._id.toString(), startDate, endDate);
            performanceData.push({
                employee: { _id: user._id, name: user.name, role: user.role },
                ...metrics
            });
        }

        res.json({
            success: true,
            data: { list: performanceData }
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};

const calculateAttendancePerformance = async (employeeId, month, year) => {
    const attendanceService = require('../services/attendance.service');
    const { summary, records } = await attendanceService.buildMonthlyAttendanceData(employeeId, month, year);
    
    // Performance Calculations based on actual data
    const workingDays = summary.present + summary.late + summary.halfDay + summary.absent + summary.onLeave; 
    // Exclude weekOffs from total working days divisor typically
    
    // On-Time = Present (without late) / Working Days
    const onTimeDays = summary.present; // Assuming 'present' excludes 'LATE', wait, let's look at buildMonthlyAttendance: 'PRESENT' is counted, 'LATE' is separate.
    
    const attendanceRate = workingDays > 0 ? parseFloat((((onTimeDays + summary.late + summary.halfDay) / workingDays) * 100).toFixed(2)) : 0;
    const onTimePercentage = workingDays > 0 ? parseFloat(((onTimeDays / workingDays) * 100).toFixed(2)) : 0;
    const latePercentage = workingDays > 0 ? parseFloat(((summary.late / workingDays) * 100).toFixed(2)) : 0;

    const totalWorkedHours = parseFloat((summary.totalWorkedMinutes / 60).toFixed(2));
    const totalBreakHours = parseFloat((summary.totalBreakMinutes / 60).toFixed(2));
    
    const daysWithWork = records.filter(r => r.workedMinutes > 0).length;
    const averageWorkedHours = daysWithWork > 0 ? parseFloat((totalWorkedHours / daysWithWork).toFixed(2)) : 0;

    return {
        attendanceRate,
        onTimePercentage,
        latePercentage,
        workingDays,
        present: summary.present,
        late: summary.late,
        absent: summary.absent,
        leave: summary.onLeave,
        permission: 0, // Injected under onLeave
        weekOff: summary.weekOff,
        totalWorkedHours,
        totalBreakHours,
        averageWorkedHours
    };
};

exports.getMyAttendancePerformance = async (req, res) => {
    try {
        const { month, year } = req.query;
        if (!month || !year) return res.status(400).json({ success: false, message: 'month and year required' });
        
        const performance = await calculateAttendancePerformance(req.user.id, month, year);
        res.json({ success: true, data: performance });
    } catch (err) {
        console.error('Error in getMyAttendancePerformance:', err);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};

exports.getAdminAttendancePerformance = async (req, res) => {
    try {
        const { employeeId } = req.params;
        const { month, year } = req.query;
        if (!employeeId || !month || !year) return res.status(400).json({ success: false, message: 'employeeId, month, and year required' });
        
        const performance = await calculateAttendancePerformance(employeeId, month, year);
        res.json({ success: true, data: performance });
    } catch (err) {
        console.error('Error in getAdminAttendancePerformance:', err);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};
