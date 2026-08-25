const Lead = require('../models/Lead');
const FollowUp = require('../models/FollowUp');
const Sale = require('../models/Sale');
const LeadActivity = require('../models/LeadActivity');
const User = require('../models/User');
const mongoose = require('mongoose');

// Helper to check access
const buildAccessQuery = (req) => {
    return req.user.role === 'Admin' ? {} : { assignedEmployeeId: req.user._id };
};

exports.getDashboard = async (req, res) => {
    try {
        const query = {
            ...buildAccessQuery(req),
            salesStatus: { $nin: ['Not Contacted'] }
        };

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const [
            totalSalesLeads,
            newResponsesToday,
            interestedStudents,
            callsPending,
            convertedStudents
        ] = await Promise.all([
            Lead.countDocuments(query),
            Lead.countDocuments({ ...query, lastContactedAt: { $gte: today } }),
            Lead.countDocuments({ ...query, salesStatus: 'INTERESTED' }),
            Lead.countDocuments({ ...query, salesStatus: { $in: ['SALES QUEUE', 'CALL PENDING'] } }),
            Lead.countDocuments({ ...query, salesStatus: 'CONVERTED' })
        ]);

        const callsCompletedToday = await LeadActivity.countDocuments({
            activityType: 'Sales Call',
            timestamp: { $gte: today },
            ...(req.user.role === 'Admin' ? {} : { employeeId: req.user._id })
        });

        const followUpsDueToday = await FollowUp.countDocuments({
            type: 'Sales Follow-up',
            status: 'Pending',
            dueDate: { $gte: today, $lt: new Date(today.getTime() + 86400000) },
            ...(req.user.role === 'Admin' ? {} : { assignedEmployeeId: req.user._id })
        });

        const conversionRate = totalSalesLeads > 0 ? ((convertedStudents / totalSalesLeads) * 100).toFixed(2) : 0;

        // Performance per employee
        let performance = [];
        if (req.user.role === 'Admin') {
            performance = await User.aggregate([
                { $match: { role: { $ne: 'Admin' } } },
                {
                    $lookup: {
                        from: 'leads',
                        localField: '_id',
                        foreignField: 'assignedEmployeeId',
                        as: 'leads'
                    }
                },
                {
                    $project: {
                        name: 1,
                        totalLeads: {
                            $size: {
                                $filter: { input: '$leads', as: 'l', cond: { $ne: ['$$l.salesStatus', 'Not Contacted'] } }
                            }
                        },
                        conversions: {
                            $size: {
                                $filter: { input: '$leads', as: 'l', cond: { $eq: ['$$l.salesStatus', 'CONVERTED'] } }
                            }
                        }
                    }
                }
            ]);
        }

        res.json({
            success: true,
            kpis: {
                totalSalesLeads,
                newResponsesToday,
                interestedStudents,
                callsPending,
                callsCompletedToday,
                followUpsDueToday,
                convertedStudents,
                conversionRate
            },
            performance
        });
    } catch (error) {
        console.error('Error fetching sales dashboard:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

exports.getSales = async (req, res) => {
    try {
        const { search, priority, status, employeeId, page = 1, limit = 50 } = req.query;
        let query = {
            ...buildAccessQuery(req),
            salesStatus: { $ne: 'Not Contacted' }
        };

        if (search) {
            query.$or = [
                { studentName: new RegExp(search, 'i') },
                { phone: new RegExp(search, 'i') },
                { college: new RegExp(search, 'i') }
            ];
        }
        if (priority) query.priority = priority;
        if (status) query.salesStatus = status;
        if (employeeId && req.user.role === 'Admin') query.assignedEmployeeId = employeeId;

        const leads = await Lead.find(query)
            .populate('assignedEmployeeId', 'name')
            .sort({ updatedAt: -1 })
            .skip((page - 1) * limit)
            .limit(parseInt(limit));
            
        const total = await Lead.countDocuments(query);

        res.json({ success: true, leads, total, pages: Math.ceil(total / limit) });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

exports.getCallQueue = async (req, res) => {
    try {
        const query = {
            ...buildAccessQuery(req),
            salesStatus: { $in: ['SALES QUEUE', 'CALL PENDING'] }
        };

        const leads = await Lead.find(query)
            .populate('assignedEmployeeId', 'name')
            .sort({ priority: 1, nextFollowUp: 1, updatedAt: 1 })
            .limit(100);

        // Sort HIGH first
        leads.sort((a, b) => {
            const pMap = { HIGH: 1, MEDIUM: 2, LOW: 3 };
            const pA = pMap[a.priority] || 4;
            const pB = pMap[b.priority] || 4;
            return pA - pB;
        });

        res.json({ success: true, queue: leads });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

exports.getSalesDetail = async (req, res) => {
    try {
        const lead = await Lead.findOne({ _id: req.params.id, ...buildAccessQuery(req) })
            .populate('assignedEmployeeId', 'name');
            
        if (!lead) return res.status(404).json({ success: false, message: 'Sales lead not found' });

        const activities = await LeadActivity.find({ leadId: lead._id })
            .populate('employeeId', 'name')
            .sort({ timestamp: -1 });

        const followUps = await FollowUp.find({ leadId: lead._id, type: 'Sales Follow-up' })
            .sort({ dueDate: 1 });
            
        const sales = await Sale.find({ leadId: lead._id });

        res.json({ success: true, lead, activities, followUps, sales });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

exports.addResponse = async (req, res) => {
    try {
        const { interestedDomain, interestedCourse, interestLevel, studentResponse, priority, remarks, nextFollowUp } = req.body;
        const lead = await Lead.findOne({ _id: req.params.id, ...buildAccessQuery(req) });
        if (!lead) return res.status(404).json({ success: false, message: 'Lead not found' });

        lead.interestedDomain = interestedDomain || lead.interestedDomain;
        lead.interestedCourse = interestedCourse || lead.interestedCourse;
        lead.interestLevel = interestLevel || lead.interestLevel;
        lead.studentResponse = studentResponse || lead.studentResponse;
        lead.priority = priority || lead.priority;
        lead.salesStatus = 'SALES QUEUE';
        lead.lastContactedAt = new Date();
        
        if (nextFollowUp) lead.nextFollowUp = new Date(nextFollowUp);
        
        await lead.save();

        await LeadActivity.create({
            leadId: lead._id,
            employeeId: req.user._id,
            activityType: 'Sales Response',
            description: 'Added student response',
            metadata: { studentResponse, remarks }
        });

        req.app.get('io').emit('sales:updated', { leadId: lead._id });
        res.json({ success: true, lead });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

exports.logCall = async (req, res) => {
    try {
        const { callResult, nextFollowUp, remarks } = req.body;
        const lead = await Lead.findOne({ _id: req.params.id, ...buildAccessQuery(req) });
        if (!lead) return res.status(404).json({ success: false, message: 'Lead not found' });

        lead.salesStatus = 'CALLED';
        lead.lastContactedAt = new Date();
        if (nextFollowUp) {
            lead.nextFollowUp = new Date(nextFollowUp);
            await FollowUp.create({
                leadId: lead._id,
                assignedEmployeeId: lead.assignedEmployeeId,
                type: 'Sales Follow-up',
                dueDate: new Date(nextFollowUp),
                notes: remarks,
                priority: lead.priority
            });
        }
        await lead.save();

        await LeadActivity.create({
            leadId: lead._id,
            employeeId: req.user._id,
            activityType: 'Sales Call',
            description: `Logged call: ${callResult}`,
            metadata: { callResult, remarks }
        });

        req.app.get('io').emit('sales:updated', { leadId: lead._id });
        res.json({ success: true, lead });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

exports.convertSale = async (req, res) => {
    try {
        const { course, amount, paymentStatus, remarks, conversionDate } = req.body;
        const lead = await Lead.findOne({ _id: req.params.id, ...buildAccessQuery(req) });
        if (!lead) return res.status(404).json({ success: false, message: 'Lead not found' });

        lead.salesStatus = 'CONVERTED';
        lead.course = course || lead.course;
        await lead.save();

        const sale = await Sale.create({
            employeeId: lead.assignedEmployeeId || req.user._id,
            leadId: lead._id,
            studentName: lead.studentName,
            course,
            amount,
            paymentStatus: paymentStatus || 'Pending',
            status: 'Converted',
            remarks,
            conversionDate: conversionDate ? new Date(conversionDate) : new Date()
        });

        await LeadActivity.create({
            leadId: lead._id,
            employeeId: req.user._id,
            activityType: 'Conversion',
            description: 'Converted student to sale',
            metadata: { course, amount, paymentStatus }
        });

        req.app.get('io').emit('sales:updated', { leadId: lead._id });
        res.json({ success: true, lead, sale });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

exports.updateStatus = async (req, res) => {
    try {
        const { salesStatus, lostReason } = req.body;
        const lead = await Lead.findOne({ _id: req.params.id, ...buildAccessQuery(req) });
        if (!lead) return res.status(404).json({ success: false, message: 'Lead not found' });

        lead.salesStatus = salesStatus;
        if (salesStatus === 'Lost' && lostReason) {
            lead.lostReason = lostReason;
        }
        await lead.save();

        await LeadActivity.create({
            leadId: lead._id,
            employeeId: req.user._id,
            activityType: 'Sales Status Change',
            description: `Changed status to ${salesStatus}${lostReason ? ` - Reason: ${lostReason}` : ''}`
        });

        req.app.get('io').emit('sales:updated', { leadId: lead._id });
        res.json({ success: true, lead });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

exports.moveLeadToSales = async (req, res) => {
    try {
        const { leadId } = req.body;
        const lead = await Lead.findById(leadId);
        
        if (!lead) return res.status(404).json({ success: false, message: 'Lead not found' });
        
        // If it's already in sales pipeline (not 'New Lead' and not 'Not Contacted' etc)
        // But for simplicity, let's just make sure it gets added to Sales
        lead.salesStatus = 'New Lead';
        await lead.save();
        
        await LeadActivity.create({
            leadId: lead._id,
            employeeId: req.user._id,
            activityType: 'Moved to Sales',
            description: 'Lead was moved to the Sales Pipeline'
        });
        
        req.app.get('io').emit('sales:updated', { leadId: lead._id });
        res.json({ success: true, lead });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

exports.updatePriority = async (req, res) => {
    try {
        const { priority } = req.body;
        const lead = await Lead.findOne({ _id: req.params.id, ...buildAccessQuery(req) });
        if (!lead) return res.status(404).json({ success: false, message: 'Lead not found' });

        lead.priority = priority;
        await lead.save();

        await LeadActivity.create({
            leadId: lead._id,
            employeeId: req.user._id,
            activityType: 'Sales Priority Change',
            description: `Changed priority to ${priority}`
        });

        req.app.get('io').emit('sales:updated', { leadId: lead._id });
        res.json({ success: true, lead });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

exports.bulkUpdate = async (req, res) => {
    try {
        if (req.user.role !== 'Admin') return res.status(403).json({ success: false, message: 'Admin only' });
        const { leadIds, assignedEmployeeId, salesStatus, priority } = req.body;

        const updateData = {};
        if (assignedEmployeeId) updateData.assignedEmployeeId = assignedEmployeeId;
        if (salesStatus) updateData.salesStatus = salesStatus;
        if (priority) updateData.priority = priority;

        await Lead.updateMany({ _id: { $in: leadIds } }, { $set: updateData });

        req.app.get('io').emit('sales:updated', { bulk: true });
        res.json({ success: true, message: 'Bulk update applied' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
};
