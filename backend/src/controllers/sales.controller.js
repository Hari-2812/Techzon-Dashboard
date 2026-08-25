const Lead = require('../models/Lead');
const FollowUp = require('../models/FollowUp');
const Sale = require('../models/Sale');
const LeadActivity = require('../models/LeadActivity');
const User = require('../models/User');

const buildAccessQuery = (req) => {
    return req.user.role === 'ADMIN' ? {} : { assignedEmployeeId: req.user._id };
};

exports.getDashboard = async (req, res) => {
    try {
        const query = {
            ...buildAccessQuery(req)
        };

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayEndOfDay = new Date();
        todayEndOfDay.setHours(23, 59, 59, 999);

        const [
            totalSalesLeads,
            notContacted,
            contactedStudents,
            interestedStudents,
            followUpsDue,
            convertedStudents
        ] = await Promise.all([
            Lead.countDocuments({ ...query }),
            Lead.countDocuments({ ...query, salesStatus: 'NOT_CONTACTED' }),
            Lead.countDocuments({ ...query, salesStatus: 'CONTACTED' }),
            Lead.countDocuments({ ...query, salesStatus: 'INTERESTED' }),
            Lead.countDocuments({ 
                ...query, 
                nextFollowUp: { $lte: todayEndOfDay },
                salesStatus: { $nin: ['CONVERTED', 'NOT_INTERESTED', 'NO_RESPONSE'] } 
            }),
            Lead.countDocuments({ ...query, salesStatus: 'CONVERTED' })
        ]);

        const conversionRate = totalSalesLeads > 0 ? ((convertedStudents / totalSalesLeads) * 100).toFixed(2) : 0;

        let performance = [];
        if (req.user.role === 'ADMIN') {
            const users = await User.aggregate([
                { $match: { role: { $ne: 'ADMIN' }, isActive: true } },
                {
                    $lookup: {
                        from: 'leads',
                        localField: '_id',
                        foreignField: 'assignedEmployeeId',
                        as: 'leads'
                    }
                }
            ]);

            performance = users.map(user => {
                const employeeLeads = user.leads || [];
                return {
                    _id: user._id,
                    name: user.name,
                    totalLeads: employeeLeads.length,
                    contacted: employeeLeads.filter(l => ['CONTACTED', 'INTERESTED', 'FOLLOW_UP', 'CONVERTED', 'CALL_BACK'].includes(l.salesStatus)).length,
                    interested: employeeLeads.filter(l => l.salesStatus === 'INTERESTED').length,
                    followUp: employeeLeads.filter(l => l.nextFollowUp && new Date(l.nextFollowUp) <= todayEndOfDay).length,
                    conversions: employeeLeads.filter(l => l.salesStatus === 'CONVERTED').length
                };
            });
        }

        res.json({
            success: true,
            kpis: {
                totalSalesLeads,
                notContacted,
                contactedStudents,
                interestedStudents,
                followUpsDue,
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
            ...buildAccessQuery(req)
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
        if (employeeId && req.user.role === 'ADMIN') query.assignedEmployeeId = employeeId;

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
            salesStatus: { $nin: ['CONVERTED', 'NOT_INTERESTED', 'NO_RESPONSE'] }
        };

        const leads = await Lead.find(query)
            .populate('assignedEmployeeId', 'name')
            .lean();

        const todayEndOfDay = new Date();
        todayEndOfDay.setHours(23, 59, 59, 999);

        // Sorting Logic:
        // 1. Follow-up due (Overdue or Today)
        // 2. High priority
        // 3. Oldest uncontacted (salesStatus === 'NOT_CONTACTED')
        // 4. Newly added leads
        
        leads.sort((a, b) => {
            const isAFollowUpDue = a.nextFollowUp && new Date(a.nextFollowUp) <= todayEndOfDay;
            const isBFollowUpDue = b.nextFollowUp && new Date(b.nextFollowUp) <= todayEndOfDay;

            if (isAFollowUpDue && !isBFollowUpDue) return -1;
            if (!isAFollowUpDue && isBFollowUpDue) return 1;

            if (a.priority === 'HIGH' && b.priority !== 'HIGH') return -1;
            if (a.priority !== 'HIGH' && b.priority === 'HIGH') return 1;

            const isAUncontacted = a.salesStatus === 'NOT_CONTACTED';
            const isBUncontacted = b.salesStatus === 'NOT_CONTACTED';

            if (isAUncontacted && isBUncontacted) {
                return new Date(a.createdAt) - new Date(b.createdAt); // Oldest first
            }
            if (isAUncontacted) return -1;
            if (isBUncontacted) return 1;

            return new Date(b.createdAt) - new Date(a.createdAt); // Newest first fallback
        });

        // Paginate manually after sorting
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 100;
        const start = (page - 1) * limit;
        const paginatedQueue = leads.slice(start, start + limit);

        res.json({ success: true, queue: paginatedQueue, total: leads.length });
    } catch (error) {
        console.error('Error in getCallQueue', error);
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
        lead.salesStatus = 'FOLLOW_UP';
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

        lead.salesStatus = 'CONTACTED';
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
            leadId: lead._id,
            employeeId: req.user._id,
            course: course || lead.course,
            amount,
            paymentStatus,
            remarks,
            conversionDate: conversionDate ? new Date(conversionDate) : new Date()
        });

        await LeadActivity.create({
            leadId: lead._id,
            employeeId: req.user._id,
            activityType: 'Sales Conversion',
            description: `Converted sale for ${course}`,
            metadata: { saleId: sale._id }
        });

        req.app.get('io').emit('sales:updated', { leadId: lead._id });
        res.json({ success: true, lead, sale });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
};
