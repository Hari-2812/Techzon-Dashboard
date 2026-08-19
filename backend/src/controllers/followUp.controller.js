const FollowUp = require('../models/FollowUp');
const CRActivity = require('../models/CRActivity');
const LeadActivity = require('../models/LeadActivity');

// @route   GET /api/follow-ups
// @desc    Get all follow-ups
exports.getFollowUps = async (req, res) => {
    try {
        let matchStage = {};
        if (req.user.role !== 'ADMIN') {
            matchStage.assignedEmployeeId = req.user.id;
        }

        // Apply filters
        if (req.query.status) matchStage.status = req.query.status;
        if (req.query.type) matchStage.type = req.query.type;
        if (req.query.priority) matchStage.priority = req.query.priority;
        
        // Handle due date filters for Today, Upcoming, Overdue
        const now = new Date();
        const todayStart = new Date(now.setHours(0, 0, 0, 0));
        const todayEnd = new Date(now.setHours(23, 59, 59, 999));

        if (req.query.dateFilter === 'TODAY') {
            matchStage.dueDate = { $gte: todayStart, $lte: todayEnd };
        } else if (req.query.dateFilter === 'UPCOMING') {
            matchStage.dueDate = { $gt: todayEnd };
        } else if (req.query.dateFilter === 'OVERDUE') {
            matchStage.dueDate = { $lt: todayStart };
            matchStage.status = { $ne: 'Completed' };
        }

        const followUps = await FollowUp.find(matchStage)
            .populate('leadId', 'studentName phone college')
            .populate('crId', 'crName phone college')
            .populate('assignedEmployeeId', 'name')
            .sort({ dueDate: 1 });

        // Update overdue status dynamically on fetch if they are pending and passed due date
        const updatedFollowUps = followUps.map(f => {
            if (f.status === 'Pending' && new Date(f.dueDate) < new Date()) {
                // Return a modified object for frontend (don't save to DB unnecessarily on every GET)
                return { ...f.toObject(), status: 'Overdue' };
            }
            return f;
        });

        res.json({ success: true, data: updatedFollowUps });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};

// @route   POST /api/follow-ups
// @desc    Create a follow-up
exports.createFollowUp = async (req, res) => {
    try {
        const { leadId, crId, type, dueDate, priority, notes } = req.body;
        
        const followUp = await FollowUp.create({
            leadId,
            crId,
            assignedEmployeeId: req.user.id, // Assuming employee creates it
            type,
            dueDate,
            priority,
            notes
        });

        // Add activity
        if (crId) {
            await CRActivity.create({
                crId,
                employeeId: req.user.id,
                activityType: 'FOLLOW_UP_SCHEDULED',
                description: `Scheduled ${type} follow-up for ${new Date(dueDate).toLocaleString()}`
            });
        }

        const io = require('../server').io;
        if (io) io.emit('followup:created', { followUpId: followUp._id });

        res.status(201).json({ success: true, data: followUp });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};

// @route   PATCH /api/follow-ups/:id
// @desc    Update a follow-up
exports.updateFollowUp = async (req, res) => {
    try {
        const followUp = await FollowUp.findById(req.params.id);
        if (!followUp) return res.status(404).json({ success: false, message: 'Not found' });

        if (req.user.role !== 'ADMIN' && followUp.assignedEmployeeId.toString() !== req.user.id) {
            return res.status(403).json({ success: false, message: 'Forbidden' });
        }

        Object.assign(followUp, req.body);
        await followUp.save();

        const io = require('../server').io;
        if (io) io.emit('followup:updated', { followUpId: followUp._id });

        res.json({ success: true, data: followUp });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};

// @route   POST /api/follow-ups/:id/complete
// @desc    Complete a follow-up
exports.completeFollowUp = async (req, res) => {
    try {
        const followUp = await FollowUp.findById(req.params.id);
        if (!followUp) return res.status(404).json({ success: false, message: 'Not found' });

        if (req.user.role !== 'ADMIN' && followUp.assignedEmployeeId.toString() !== req.user.id) {
            return res.status(403).json({ success: false, message: 'Forbidden' });
        }

        followUp.status = 'Completed';
        followUp.completedAt = new Date();
        if (req.body.notes) {
            followUp.notes = followUp.notes ? followUp.notes + '\n' + req.body.notes : req.body.notes;
        }
        await followUp.save();

        if (followUp.crId) {
            await CRActivity.create({
                crId: followUp.crId,
                employeeId: req.user.id,
                activityType: 'FOLLOW_UP_COMPLETED',
                description: `Completed ${followUp.type} follow-up`
            });
        }

        const io = require('../server').io;
        if (io) io.emit('followup:completed', { followUpId: followUp._id });

        res.json({ success: true, data: followUp });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};

// @route   POST /api/follow-ups/:id/reschedule
// @desc    Reschedule a follow-up
exports.rescheduleFollowUp = async (req, res) => {
    try {
        const { newDate, newTime, reason } = req.body;
        const followUp = await FollowUp.findById(req.params.id);
        if (!followUp) return res.status(404).json({ success: false, message: 'Not found' });

        if (req.user.role !== 'ADMIN' && followUp.assignedEmployeeId.toString() !== req.user.id) {
            return res.status(403).json({ success: false, message: 'Forbidden' });
        }

        followUp.dueDate = newDate;
        followUp.status = 'Rescheduled';
        if (reason) {
            followUp.notes = followUp.notes ? followUp.notes + '\nReschedule Reason: ' + reason : 'Reschedule Reason: ' + reason;
        }
        await followUp.save();

        if (followUp.crId) {
            await CRActivity.create({
                crId: followUp.crId,
                employeeId: req.user.id,
                activityType: 'FOLLOW_UP_RESCHEDULED',
                description: `Rescheduled ${followUp.type} to ${new Date(newDate).toLocaleString()}`
            });
        }

        const io = require('../server').io;
        if (io) io.emit('followup:updated', { followUpId: followUp._id });

        res.json({ success: true, data: followUp });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};
