const Lead = require('../models/Lead');
const FollowUp = require('../models/FollowUp');
const Sale = require('../models/Sale');
const LeadActivity = require('../models/LeadActivity');
const User = require('../models/User');

const buildAccessQuery = (req) => {
    return req.user.role === 'ADMIN' ? {} : { assignedEmployeeId: req.user.id };
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
            Lead.countDocuments({ ...query, salesStatus: 'Not Contacted' }),
            Lead.countDocuments({ ...query, salesStatus: 'Contacted' }),
            Lead.countDocuments({ ...query, salesStatus: 'Interested' }),
            Lead.countDocuments({ 
                ...query, 
                nextFollowUp: { $lte: todayEndOfDay },
                salesStatus: { $nin: ['Converted', 'Not Interested', 'Closed'] } 
            }),
            Lead.countDocuments({ ...query, salesStatus: 'Converted' })
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
                    contacted: employeeLeads.filter(l => ['Contacted', 'Interested', 'Follow-up', 'Converted'].includes(l.salesStatus)).length,
                    interested: employeeLeads.filter(l => l.salesStatus === 'Interested').length,
                    followUp: employeeLeads.filter(l => l.nextFollowUp && new Date(l.nextFollowUp) <= todayEndOfDay).length,
                    conversions: employeeLeads.filter(l => l.salesStatus === 'Converted').length
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
            salesSource: 'EMPLOYEE_SALES',
            salesStatus: { $nin: ['Converted', 'Not Interested', 'Closed'] }
        };

        const leads = await Lead.find(query)
            .populate('assignedEmployeeId', 'name')
            .populate('importedBy', 'name')
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

            const isAUncontacted = a.salesStatus === 'Not Contacted';
            const isBUncontacted = b.salesStatus === 'Not Contacted';

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
        lead.salesStatus = 'Follow-up';
        lead.lastContactedAt = new Date();
        
        if (nextFollowUp) lead.nextFollowUp = new Date(nextFollowUp);
        
        await lead.save();

        await LeadActivity.create({
            leadId: lead._id,
            employeeId: req.user.id,
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

        lead.salesStatus = 'Contacted';
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
            employeeId: req.user.id,
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

        lead.salesStatus = 'Converted';
        lead.course = course || lead.course;
        
        await lead.save();

        const sale = await Sale.create({
            leadId: lead._id,
            employeeId: req.user.id,
            course: course || lead.course,
            amount,
            paymentStatus,
            remarks,
            conversionDate: conversionDate ? new Date(conversionDate) : new Date()
        });

        await LeadActivity.create({
            leadId: lead._id,
            employeeId: req.user.id,
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

exports.bulkUpdate = async (req, res) => {
    try {
        const { leadIds, updates } = req.body;
        if (!leadIds || !Array.isArray(leadIds) || leadIds.length === 0) {
            return res.status(400).json({ success: false, message: 'No leads provided' });
        }
        
        // Ensure only allowed fields can be updated
        const allowedUpdates = {};
        if (updates.salesStatus) allowedUpdates.salesStatus = updates.salesStatus;
        if (updates.priority) allowedUpdates.priority = updates.priority;
        if (updates.assignedEmployeeId && req.user.role === 'ADMIN') {
            allowedUpdates.assignedEmployeeId = updates.assignedEmployeeId;
        }
        
        await Lead.updateMany(
            { _id: { $in: leadIds }, ...buildAccessQuery(req) },
            { $set: allowedUpdates }
        );
        
        res.json({ success: true, message: 'Leads updated successfully' });
    } catch (error) {
        console.error('Error in bulkUpdate:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

exports.moveLeadToSales = async (req, res) => {
    try {
        const { leadId } = req.body;
        const lead = await Lead.findOne({ _id: leadId, ...buildAccessQuery(req) });
        if (!lead) return res.status(404).json({ success: false, message: 'Lead not found' });
        
        lead.salesStatus = 'Not Contacted';
        await lead.save();
        
        res.json({ success: true, lead, message: 'Lead moved to sales queue' });
    } catch (error) {
        console.error('Error in moveLeadToSales:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};
exports.updateStatus = async (req, res) => {
    try {
        const { salesStatus } = req.body;
        const lead = await Lead.findOne({ _id: req.params.id, ...buildAccessQuery(req) });
        if (!lead) return res.status(404).json({ success: false, message: 'Lead not found' });
        
        lead.salesStatus = salesStatus;
        await lead.save();
        
        req.app.get('io').emit('sales:updated', { leadId: lead._id });
        res.json({ success: true, lead });
    } catch (error) {
        console.error('Error in updateStatus:', error);
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
        
        req.app.get('io').emit('sales:updated', { leadId: lead._id });
        res.json({ success: true, lead });
    } catch (error) {
        console.error('Error in updatePriority:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

exports.importEmployeeContacts = async (req, res) => {
    try {
        if (req.user.role !== 'RGS' && req.user.role !== 'BDE' && req.user.role !== 'EMPLOYEE' && req.user.role !== 'ADMIN') {
            return res.status(403).json({ success: false, message: 'Forbidden' });
        }

        const { contacts, targetEmployeeId } = req.body;
        
        let finalTargetEmployeeId = targetEmployeeId;
        if (req.user.role !== 'ADMIN') {
            finalTargetEmployeeId = req.user.id;
        }

        if (!Array.isArray(contacts) || contacts.length === 0) {
            return res.status(400).json({ success: false, message: 'No contacts provided' });
        }

        const Lead = require('../models/Lead');
        const { normalizePhone } = require('../validations/lead.validation');
        const io = require('../server').io;

        let created = 0;
        let updated = 0;
        let duplicates = 0;
        let failed = 0;
        let errors = [];

        for (let i = 0; i < contacts.length; i++) {
            let contact = contacts[i];
            
            if (!contact.studentName || !contact.phone) {
                failed++;
                errors.push(`Row ${i+1}: Name and phone are required.`);
                continue;
            }

            const phone = normalizePhone(contact.phone);
            if (!phone) {
                failed++;
                errors.push(`Row ${i+1}: Invalid phone format (${contact.phone}).`);
                continue;
            }

            let existingLead = await Lead.findOne({ phone });
            
            // Check email if phone somehow didn't match (though rare since phone is primary)
            if (!existingLead && contact.email) {
                existingLead = await Lead.findOne({ email: contact.email });
            }

            if (existingLead) {
                // Check if it's already an employee lead
                if (existingLead.salesSource === 'EMPLOYEE_SALES' || existingLead.assignedEmployeeId) {
                    duplicates++;
                    errors.push(`Row ${i+1}: Duplicate contact found for ${contact.studentName}. Skipping to prevent mixing assignment.`);
                } else {
                    // Lead exists globally without employee assignment, assign it
                    existingLead.salesSource = 'EMPLOYEE_SALES';
                    existingLead.importedBy = req.user.id;
                    existingLead.importedAt = new Date();
                    if (finalTargetEmployeeId) {
                        existingLead.assignedEmployeeId = finalTargetEmployeeId;
                    }
                    
                    if (contact.email && !existingLead.email) existingLead.email = contact.email;
                    if (contact.collegeName && !existingLead.college) existingLead.college = contact.collegeName;
                    if (contact.interestedDomain && !existingLead.interestedDomain) existingLead.interestedDomain = contact.interestedDomain;
                    
                    await existingLead.save();
                    updated++;
                }
            } else {
                try {
                    await Lead.create({
                        studentName: contact.studentName,
                        phone: phone,
                        email: contact.email || '',
                        college: contact.collegeName || '',
                        interestedDomain: contact.interestedDomain || '',
                        salesStatus: 'Not Contacted',
                        leadStatus: 'New',
                        crStatus: 'Not Verified',
                        priority: 'MEDIUM',
                        salesSource: 'EMPLOYEE_SALES',
                        importedBy: req.user.id,
                        importedAt: new Date(),
                        ...(finalTargetEmployeeId ? { assignedEmployeeId: finalTargetEmployeeId } : {})
                    });
                    created++;
                } catch (err) {
                    failed++;
                    errors.push(`Row ${i+1}: Validation failed: ${err.message}`);
                }
            }
        }

        if (io && (created > 0 || updated > 0)) {
            io.emit('leads:employee-sales-imported', { count: created + updated, importedBy: req.user.id });
        }

        res.json({
            success: true,
            created,
            updated,
            duplicates,
            failed,
            errors
        });

    } catch (error) {
        console.error('Error importing employee contacts:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};
