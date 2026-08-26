const DailyLeadUpdate = require('../models/DailyLeadUpdate');
const Lead = require('../models/Lead');
const FollowUp = require('../models/FollowUp');
const LeadActivity = require('../models/LeadActivity');
const User = require('../models/User');
const { normalizeSalesStatus } = require('../utils/statusNormalizer');

exports.createUpdate = async (req, res) => {
    try {
        const io = req.app.get('io');
        const { 
            entryType, // 'existing' or 'manual'
            createLead, // true if manual and wants to create Lead
            leadId,
            studentName, phone, email, college, department, year, courseInterested,
            callOutcome, studentResponse, leadStatus,
            crStatus, crName, crPhone, crCollege, crDepartment, crYear, crSection,
            salesStatus, expectedConversionDate,
            followUpRequired, followUpDate, followUpTime, followUpType, followUpPriority, followUpNotes,
            notes
        } = req.body;

        let finalLeadId = leadId;
        let lead = null;
        
        // Only normalize the incoming sales status if it was explicitly provided
        let finalSalesStatus;
        if (salesStatus !== undefined && salesStatus !== null && salesStatus !== '') {
            finalSalesStatus = normalizeSalesStatus(salesStatus);
        }

        // Determine if we need to fetch an existing lead or create a new one
        if (entryType === 'existing' && leadId) {
            lead = await Lead.findById(leadId);
            if (!lead) return res.status(404).json({ success: false, message: 'Lead not found' });
            
            // Authorization check: Admin or assigned employee
            if (req.user.role !== 'ADMIN' && lead.assignedEmployeeId.toString() !== req.user.id) {
                return res.status(403).json({ success: false, message: 'Not authorized to update this lead' });
            }
        } else if (entryType === 'manual' && createLead) {
            // Check if lead with this phone already exists
            lead = await Lead.findOne({ phone });
            if (lead) {
                // Lead exists, we use it instead of creating duplicate
                finalLeadId = lead._id;
                // Update basic info if not set
                lead.email = lead.email || email;
                lead.college = college || lead.college;
            } else {
                // Create new Lead
                lead = await Lead.create({
                    studentName,
                    phone,
                    email,
                    college,
                    department,
                    year,
                    course: courseInterested,
                    assignedEmployeeId: req.user.id,
                    leadStatus: leadStatus || 'New'
                });
                finalLeadId = lead._id;
            }
        }

        const updateData = {
            employeeId: req.user.id,
            leadId: finalLeadId, // Will be undefined if manual and createLead=false
            studentName,
            phone,
            email,
            college,
            department,
            year,
            courseInterested,
            
            callStatus: callOutcome,
            studentResponse,
            leadStatus,
            
            crStatus,
            crName,
            crPhone,
            crCollege,
            crDepartment,
            crYear,
            crSection,

            salesStatus: finalSalesStatus,
            expectedConversionDate,

            followUpRequired,
            followUpDate,
            followUpTime,
            followUpType,
            followUpPriority,
            followUpNotes,

            dailyNotes: notes
        };

        // 1. Update Lead Status automatically based on logic provided
        if (lead) {
            let newLeadStatus = lead.leadStatus;
            if (callOutcome === 'Connected' && lead.leadStatus === 'New') newLeadStatus = 'Contacted';
            if (studentResponse === 'Interested') newLeadStatus = 'Follow-up';
            if (finalSalesStatus === 'Converted') newLeadStatus = 'Converted';
            if (crStatus === 'Student Is CR' || crStatus === 'CR Confirmed') newLeadStatus = 'CR Identified';
            
            // Manual override if provided explicitly in the body
            if (leadStatus) newLeadStatus = leadStatus;

            lead.leadStatus = newLeadStatus;
            if (finalSalesStatus) {
                lead.salesStatus = finalSalesStatus;
            }

            if (crStatus) lead.crStatus = crStatus;
            if (courseInterested) lead.course = courseInterested;
            if (finalSalesStatus === 'Converted') {
                // Logic to not double-count sales could go here if needed
                lead.leadStatus = 'Completed'; 
            }
            
            await lead.save();
            updateData.leadStatus = lead.leadStatus;
        }

        // 2. Handle FollowUp creation
        let createdFollowUpId = null;
        if (followUpRequired && followUpDate && finalLeadId) {
            // Check if there's already a pending follow-up and complete it
            await FollowUp.updateMany(
                { leadId: finalLeadId, status: 'Pending' },
                { status: 'Completed', completedAt: new Date() }
            );

            // Create new Follow-up
            const followUp = await FollowUp.create({
                leadId: finalLeadId,
                assignedEmployeeId: req.user.id,
                type: followUpType || 'Final Follow-up',
                dueDate: new Date(`${followUpDate}T${followUpTime || '10:00'}:00`),
                priority: followUpPriority || 'MEDIUM',
                notes: followUpNotes,
                status: 'Pending'
            });

            createdFollowUpId = followUp._id;
            updateData.followUpId = createdFollowUpId;
        }

        // 3. Save the Daily Update
        const dailyUpdate = await DailyLeadUpdate.create(updateData);

        // 4. Record Activity History (only if tied to a lead)
        if (finalLeadId) {
            await LeadActivity.create({
                leadId: finalLeadId,
                employeeId: req.user.id,
                activityType: 'Daily Update',
                description: `Call Outcome: ${callOutcome || 'N/A'}. Response: ${studentResponse || 'N/A'}. Notes: ${notes}`,
                metadata: {
                    dailyUpdateId: dailyUpdate._id,
                    callOutcome,
                    studentResponse,
                    salesStatus: finalSalesStatus || (lead ? lead.salesStatus : undefined),
                    crStatus,
                    followUpRequired,
                    followUpDate
                }
            });
        }

        // Emit Socket event for real-time dashboard updates
        if (io) {
            io.emit('dailyUpdateCreated', { employeeId: req.user.id, dailyUpdateId: dailyUpdate._id });
        }

        res.status(201).json({ success: true, data: dailyUpdate });
    } catch (error) {
        console.error('Error in createUpdate:', error);
        if (error.name === 'ValidationError') {
            const errorDetails = Object.keys(error.errors).map(key => error.errors[key].message).join(', ');
            return res.status(400).json({ 
                success: false, 
                message: 'Validation failed',
                error: errorDetails
            });
        }
        res.status(500).json({ success: false, message: 'Failed to save daily update', error: error.message });
    }
};

exports.updateRecord = async (req, res) => {
    try {
        const { id } = req.params;
        const updateData = req.body;
        
        const record = await DailyLeadUpdate.findById(id);
        if (!record) return res.status(404).json({ success: false, message: 'Record not found' });
        
        if (req.user.role !== 'ADMIN' && record.employeeId.toString() !== req.user.id) {
            return res.status(403).json({ success: false, message: 'Not authorized to edit this record' });
        }

        // Audit trace mapping (could be logged in LeadActivity if tied to lead)
        const updatedRecord = await DailyLeadUpdate.findByIdAndUpdate(id, updateData, { new: true });
        
        const io = req.app.get('io');
        if (io) io.emit('dailyUpdateCreated', { employeeId: req.user.id, dailyUpdateId: id }); // Refresh clients

        res.json({ success: true, data: updatedRecord });
    } catch (error) {
        console.error('Error in updateRecord:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

exports.getUpdates = async (req, res) => {
    try {
        const { date, employeeId, limit = 50, page = 1 } = req.query;
        let query = {};

        // Restrict to own updates if not Admin
        if (req.user.role !== 'ADMIN') {
            query.employeeId = req.user.id;
        } else if (employeeId) {
            query.employeeId = employeeId;
        }

        if (date) {
            const startOfDay = new Date(date);
            startOfDay.setHours(0, 0, 0, 0);
            const endOfDay = new Date(date);
            endOfDay.setHours(23, 59, 59, 999);
            query.createdAt = { $gte: startOfDay, $lte: endOfDay };
        } else {
            // Default to today if not provided
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            query.createdAt = { $gte: today };
        }

        const skip = (parseInt(page) - 1) * parseInt(limit);

        const updates = await DailyLeadUpdate.find(query)
            .populate('employeeId', 'name employeeId')
            .populate('leadId', 'studentName phone college leadStatus assignedEmployeeId')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(parseInt(limit));
            
        const total = await DailyLeadUpdate.countDocuments(query);

        res.json({ success: true, data: updates, total, page: parseInt(page), pages: Math.ceil(total / limit) });
    } catch (error) {
        console.error('Error in getUpdates:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

exports.getAnalytics = async (req, res) => {
    try {
        const { date } = req.query;
        
        let startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);
        let endOfDay = new Date();
        endOfDay.setHours(23, 59, 59, 999);
        
        if (date) {
            startOfDay = new Date(date);
            startOfDay.setHours(0, 0, 0, 0);
            endOfDay = new Date(date);
            endOfDay.setHours(23, 59, 59, 999);
        }

        let query = { createdAt: { $gte: startOfDay, $lte: endOfDay } };
        
        if (req.user.role !== 'ADMIN') {
            query.employeeId = req.user.id;
        }

        // Overall Stats
        const updates = await DailyLeadUpdate.find(query);
        
        const summary = {
            totalUpdates: updates.length,
            callsCompleted: updates.filter(u => u.callStatus && u.callStatus !== 'Not Called').length,
            followUpsCreated: updates.filter(u => u.followUpRequired).length,
            crsIdentified: updates.filter(u => u.crStatus === 'Student Is CR' || u.crStatus === 'CR Confirmed').length,
            interestedLeads: updates.filter(u => u.studentResponse === 'Interested' || u.salesStatus === 'Interested').length,
            salesConverted: updates.filter(u => u.salesStatus === 'Converted').length
        };

        let employeeActivity = [];
        
        if (req.user.role === 'ADMIN') {
            const users = await User.find({ role: { $ne: 'ADMIN' }, isActive: true });
            
            for (const user of users) {
                const assignedLeadsCount = await Lead.countDocuments({ assignedEmployeeId: user._id });
                const userUpdates = updates.filter(u => u.employeeId.toString() === user._id.toString());
                
                // Count unique valid leads updated
                const uniqueUpdatedLeads = new Set(userUpdates.filter(u => u.leadId).map(u => u.leadId.toString())).size;
                
                const callsCompleted = userUpdates.filter(u => u.callStatus && u.callStatus !== 'Not Called').length;
                const followUps = userUpdates.filter(u => u.followUpRequired).length;
                const crs = userUpdates.filter(u => u.crStatus === 'Student Is CR' || u.crStatus === 'CR Confirmed').length;
                const interested = userUpdates.filter(u => u.studentResponse === 'Interested' || u.salesStatus === 'Interested').length;
                const converted = userUpdates.filter(u => u.salesStatus === 'Converted').length;
                
                const lastActivity = userUpdates.length > 0 
                    ? userUpdates.sort((a, b) => b.createdAt - a.createdAt)[0].createdAt 
                    : null;
                    
                const activityPercent = assignedLeadsCount > 0 
                    ? Math.round((uniqueUpdatedLeads / assignedLeadsCount) * 100) 
                    : 0;

                employeeActivity.push({
                    employeeId: user._id,
                    name: user.name,
                    role: user.role,
                    assignedLeads: assignedLeadsCount,
                    updatedLeads: uniqueUpdatedLeads, // Valid unique leads updated
                    totalUpdates: userUpdates.length, // Raw total manual entries
                    callsCompleted,
                    followUpsCreated: followUps,
                    crsIdentified: crs,
                    interestedLeads: interested,
                    salesConverted: converted,
                    lastActivity,
                    activityPercent
                });
            }
            
            // Sort by activity percent descending
            employeeActivity.sort((a, b) => b.activityPercent - a.activityPercent);
        } else {
             const assignedLeadsCount = await Lead.countDocuments({ assignedEmployeeId: req.user.id });
             const uniqueUpdatedLeads = new Set(updates.filter(u => u.leadId).map(u => u.leadId.toString())).size;
             summary.assignedLeads = assignedLeadsCount;
             summary.updatedLeads = uniqueUpdatedLeads;
             summary.activityPercent = assignedLeadsCount > 0 ? Math.round((uniqueUpdatedLeads / assignedLeadsCount) * 100) : 0;
        }

        res.json({ success: true, data: { summary, employeeActivity } });
    } catch (error) {
        console.error('Error in getAnalytics:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

exports.getLeadUpdates = async (req, res) => {
    try {
        const { leadId } = req.params;
        const updates = await DailyLeadUpdate.find({ leadId })
            .populate('employeeId', 'name')
            .sort({ createdAt: -1 });
            
        res.json({ success: true, data: updates });
    } catch (error) {
        console.error('Error in getLeadUpdates:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};
