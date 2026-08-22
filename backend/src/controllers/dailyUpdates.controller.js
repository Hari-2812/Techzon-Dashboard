const DailyLeadUpdate = require('../models/DailyLeadUpdate');
const Lead = require('../models/Lead');
const FollowUp = require('../models/FollowUp');
const LeadActivity = require('../models/LeadActivity');
const User = require('../models/User');

exports.createUpdate = async (req, res) => {
    try {
        const { leadId } = req.body;
        const lead = await Lead.findById(leadId);
        
        if (!lead) {
            return res.status(404).json({ success: false, message: 'Lead not found' });
        }

        // Authorization check: Admin or assigned employee
        if (req.user.role !== 'ADMIN' && lead.assignedEmployeeId.toString() !== req.user.id) {
            return res.status(403).json({ success: false, message: 'Not authorized to update this lead' });
        }

        const updateData = {
            employeeId: req.user.id,
            leadId,
            studentSnapshot: {
                studentName: lead.studentName,
                phone: lead.phone,
                college: lead.college,
                department: lead.department,
                year: lead.year
            },
            callOutcome: req.body.callOutcome,
            studentResponse: req.body.studentResponse,
            leadStatus: req.body.leadStatus,
            crStatus: req.body.crStatus,
            salesStatus: req.body.salesStatus,
            courseInterested: req.body.courseInterested,
            followUpRequired: req.body.followUpRequired,
            nextFollowUpDate: req.body.nextFollowUpDate,
            nextFollowUpTime: req.body.nextFollowUpTime,
            followUpType: req.body.followUpType,
            priority: req.body.priority,
            notes: req.body.notes
        };

        // 1. Update Lead Status automatically based on logic provided
        let newLeadStatus = lead.leadStatus;
        if (updateData.callOutcome === 'Connected' && lead.leadStatus === 'New') newLeadStatus = 'Contacted';
        if (updateData.studentResponse === 'Interested') newLeadStatus = 'Follow-up';
        if (updateData.salesStatus === 'Converted') newLeadStatus = 'Completed';
        
        // Manual override if provided explicitly in the body
        if (req.body.leadStatus) newLeadStatus = req.body.leadStatus;

        lead.leadStatus = newLeadStatus;

        if (updateData.crStatus) {
            lead.crStatus = updateData.crStatus;
        }

        if (updateData.courseInterested) {
            lead.course = updateData.courseInterested;
        }
        
        await lead.save();
        updateData.leadStatus = lead.leadStatus;

        // 2. Handle FollowUp creation
        if (updateData.followUpRequired && updateData.nextFollowUpDate) {
            // Check if there's already a pending follow-up and complete it
            await FollowUp.updateMany(
                { leadId: lead._id, status: 'Pending' },
                { status: 'Completed', completedAt: new Date() }
            );

            // Create new Follow-up
            const followUp = await FollowUp.create({
                leadId: lead._id,
                assignedEmployeeId: lead.assignedEmployeeId,
                type: updateData.followUpType || 'Final Follow-up',
                dueDate: new Date(`${updateData.nextFollowUpDate}T${updateData.nextFollowUpTime || '10:00'}:00`),
                priority: updateData.priority || 'MEDIUM',
                notes: updateData.notes,
                status: 'Pending'
            });

            updateData.followUpId = followUp._id;
        }

        // 3. Save the Daily Update
        const dailyUpdate = await DailyLeadUpdate.create(updateData);

        // 4. Record Activity History
        await LeadActivity.create({
            leadId: lead._id,
            employeeId: req.user.id,
            activityType: 'Daily Update',
            description: `Call Outcome: ${updateData.callOutcome || 'N/A'}. Response: ${updateData.studentResponse || 'N/A'}. Notes: ${updateData.notes}`,
            metadata: {
                dailyUpdateId: dailyUpdate._id,
                callOutcome: updateData.callOutcome,
                studentResponse: updateData.studentResponse,
                salesStatus: updateData.salesStatus,
                crStatus: updateData.crStatus,
                followUpRequired: updateData.followUpRequired,
                nextFollowUpDate: updateData.nextFollowUpDate
            }
        });

        res.status(201).json({ success: true, data: dailyUpdate });
    } catch (error) {
        console.error('Error in createUpdate:', error);
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
            callsCompleted: updates.filter(u => u.callOutcome && u.callOutcome !== 'Not Contacted').length,
            followUpsCreated: updates.filter(u => u.followUpRequired).length,
            crsIdentified: updates.filter(u => u.crStatus === 'Student Is CR' || u.crStatus === 'CR Confirmed').length,
            interestedLeads: updates.filter(u => u.studentResponse === 'Interested' || u.salesStatus === 'Interested').length,
            salesConverted: updates.filter(u => u.salesStatus === 'Converted').length
        };

        let employeeActivity = [];
        
        if (req.user.role === 'ADMIN') {
            // Calculate employee breakdown
            const users = await User.find({ role: { $ne: 'ADMIN' }, isActive: true });
            
            for (const user of users) {
                const assignedLeadsCount = await Lead.countDocuments({ assignedEmployeeId: user._id });
                const userUpdates = updates.filter(u => u.employeeId.toString() === user._id.toString());
                
                // Uniquely updated leads today
                const uniqueUpdatedLeads = new Set(userUpdates.map(u => u.leadId.toString())).size;
                
                const callsCompleted = userUpdates.filter(u => u.callOutcome && u.callOutcome !== 'Not Contacted').length;
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
                    updatedLeads: uniqueUpdatedLeads,
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
             // For Employee: also send assigned count today
             const assignedLeadsCount = await Lead.countDocuments({ assignedEmployeeId: req.user.id });
             const uniqueUpdatedLeads = new Set(updates.map(u => u.leadId.toString())).size;
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
