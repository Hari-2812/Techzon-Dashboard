const User = require('../models/User');
const LeadActivity = require('../models/LeadActivity');
const FollowUp = require('../models/FollowUp');
const moment = require('moment-timezone');

const getDashboardAnalytics = async (req, res) => {
    try {
        const { dateRange } = req.query; // 'today', 'yesterday', 'this_week', 'this_month', 'last_month', 'all'
        
        let startDate, endDate;
        const tz = 'Asia/Kolkata';
        
        if (dateRange === 'today') {
            startDate = moment.tz(tz).startOf('day');
            endDate = moment.tz(tz).endOf('day');
        } else if (dateRange === 'yesterday') {
            startDate = moment.tz(tz).subtract(1, 'days').startOf('day');
            endDate = moment.tz(tz).subtract(1, 'days').endOf('day');
        } else if (dateRange === 'this_week') {
            startDate = moment.tz(tz).startOf('week');
            endDate = moment.tz(tz).endOf('week');
        } else if (dateRange === 'this_month') {
            startDate = moment.tz(tz).startOf('month');
            endDate = moment.tz(tz).endOf('month');
        } else if (dateRange === 'last_month') {
            startDate = moment.tz(tz).subtract(1, 'months').startOf('month');
            endDate = moment.tz(tz).subtract(1, 'months').endOf('month');
        } else {
            // all
            startDate = moment.tz('2000-01-01', tz);
            endDate = moment.tz(tz).endOf('day');
        }

        const matchStage = {
            timestamp: { $gte: startDate.toDate(), $lte: endDate.toDate() }
        };

        const employees = await User.find({ role: { $in: ['Employee', 'Sales', 'Manager'] } }).select('name role _id');
        const employeeIds = employees.map(e => e._id);

        const activities = await LeadActivity.aggregate([
            { $match: { ...matchStage, employeeId: { $in: employeeIds }, activityType: { $in: ['Sales Call', 'Sales Conversion'] } } },
            {
                $group: {
                    _id: '$employeeId',
                    totalCalls: {
                        $sum: { $cond: [{ $eq: ['$activityType', 'Sales Call'] }, 1, 0] }
                    },
                    connectedCalls: {
                        $sum: {
                            $cond: [
                                {
                                    $and: [
                                        { $eq: ['$activityType', 'Sales Call'] },
                                        { $in: ['$metadata.callResult', ['Connected', 'Interested', 'Not Interested', 'Call Back Later']] }
                                    ]
                                }, 1, 0
                            ]
                        }
                    },
                    conversions: {
                        $sum: { $cond: [{ $eq: ['$activityType', 'Sales Conversion'] }, 1, 0] }
                    }
                }
            }
        ]);

        const followUps = await FollowUp.aggregate([
            {
                $match: {
                    assignedEmployeeId: { $in: employeeIds },
                    createdAt: { $gte: startDate.toDate(), $lte: endDate.toDate() }
                }
            },
            {
                $group: {
                    _id: '$assignedEmployeeId',
                    totalFollowUps: { $sum: 1 }
                }
            }
        ]);

        let totalCallsSum = 0;
        let totalConnectedSum = 0;
        let totalConversionsSum = 0;
        let totalFollowUpsSum = 0;

        const employeeStats = employees.map(emp => {
            const act = activities.find(a => a._id.toString() === emp._id.toString()) || { totalCalls: 0, connectedCalls: 0, conversions: 0 };
            const fu = followUps.find(f => f._id.toString() === emp._id.toString()) || { totalFollowUps: 0 };
            
            totalCallsSum += act.totalCalls;
            totalConnectedSum += act.connectedCalls;
            totalConversionsSum += act.conversions;
            totalFollowUpsSum += fu.totalFollowUps;

            return {
                employeeId: emp._id,
                name: emp.name,
                role: emp.role,
                totalCalls: act.totalCalls,
                connectedCalls: act.connectedCalls,
                conversions: act.conversions,
                followUps: fu.totalFollowUps,
                conversionRate: act.totalCalls > 0 ? ((act.conversions / act.totalCalls) * 100).toFixed(2) : 0
            };
        });

        // Sort by total calls descending
        employeeStats.sort((a, b) => b.totalCalls - a.totalCalls);

        res.json({
            success: true,
            data: {
                summary: {
                    totalCalls: totalCallsSum,
                    connectedCalls: totalConnectedSum,
                    conversions: totalConversionsSum,
                    followUps: totalFollowUpsSum
                },
                employees: employeeStats
            }
        });

    } catch (error) {
        console.error('Error in getDashboardAnalytics:', error);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};

const getEmployeeCallAnalytics = async (req, res) => {
    try {
        const { employeeId } = req.params;
        const { dateRange } = req.query; 

        let startDate, endDate;
        const tz = 'Asia/Kolkata';
        
        if (dateRange === 'today') {
            startDate = moment.tz(tz).startOf('day');
            endDate = moment.tz(tz).endOf('day');
        } else if (dateRange === 'yesterday') {
            startDate = moment.tz(tz).subtract(1, 'days').startOf('day');
            endDate = moment.tz(tz).subtract(1, 'days').endOf('day');
        } else if (dateRange === 'this_week') {
            startDate = moment.tz(tz).startOf('week');
            endDate = moment.tz(tz).endOf('week');
        } else if (dateRange === 'this_month') {
            startDate = moment.tz(tz).startOf('month');
            endDate = moment.tz(tz).endOf('month');
        } else if (dateRange === 'last_month') {
            startDate = moment.tz(tz).subtract(1, 'months').startOf('month');
            endDate = moment.tz(tz).subtract(1, 'months').endOf('month');
        } else {
            startDate = moment.tz('2000-01-01', tz);
            endDate = moment.tz(tz).endOf('day');
        }

        const employee = await User.findById(employeeId).select('name role');
        if (!employee) return res.status(404).json({ success: false, message: 'Employee not found' });

        const matchStage = {
            timestamp: { $gte: startDate.toDate(), $lte: endDate.toDate() },
            employeeId: employee._id
        };

        const activities = await LeadActivity.find({ ...matchStage, activityType: { $in: ['Sales Call', 'Sales Conversion'] } })
            .populate('leadId', 'name phone domain status salesStatus')
            .sort({ timestamp: -1 });

        const calls = activities.filter(a => a.activityType === 'Sales Call');
        const conversions = activities.filter(a => a.activityType === 'Sales Conversion').length;

        const connectedCalls = calls.filter(c => ['Connected', 'Interested', 'Not Interested', 'Call Back Later'].includes(c.metadata?.callResult)).length;
        const notConnectedCalls = calls.length - connectedCalls;

        const followUps = await FollowUp.find({
            assignedEmployeeId: employee._id,
            createdAt: { $gte: startDate.toDate(), $lte: endDate.toDate() }
        });

        // Trend data (daily count of calls)
        const trendMap = {};
        calls.forEach(c => {
            const d = moment(c.timestamp).tz(tz).format('YYYY-MM-DD');
            trendMap[d] = (trendMap[d] || 0) + 1;
        });
        const trendData = Object.keys(trendMap).sort().map(k => ({ date: k, calls: trendMap[k] }));

        res.json({
            success: true,
            data: {
                employee,
                summary: {
                    totalCalls: calls.length,
                    connectedCalls,
                    notConnectedCalls,
                    conversions,
                    notConverted: calls.length - conversions,
                    followUps: followUps.length,
                    conversionRate: calls.length > 0 ? ((conversions / calls.length) * 100).toFixed(2) : 0,
                    connectionRate: calls.length > 0 ? ((connectedCalls / calls.length) * 100).toFixed(2) : 0
                },
                trend: trendData,
                history: calls.map(c => ({
                    _id: c._id,
                    date: c.timestamp,
                    customerName: c.leadId?.name || 'Unknown',
                    phone: c.leadId?.phone || '-',
                    domain: c.leadId?.domain || '-',
                    callResult: c.metadata?.callResult || '-',
                    response: c.metadata?.remarks || '-',
                    status: c.leadId?.status || '-',
                    salesStatus: c.leadId?.salesStatus || '-',
                }))
            }
        });

    } catch (error) {
        console.error('Error in getEmployeeCallAnalytics:', error);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};

module.exports = {
    getDashboardAnalytics,
    getEmployeeCallAnalytics
};
