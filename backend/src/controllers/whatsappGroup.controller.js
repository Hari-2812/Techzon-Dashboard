const WhatsAppGroup = require('../models/WhatsAppGroup');
const CRProfile = require('../models/CRProfile');
const CRActivity = require('../models/CRActivity');

// @route   GET /api/whatsapp-groups
// @desc    Get all groups with aggregated metrics
exports.getWhatsAppGroups = async (req, res) => {
    try {
        let matchStage = {};
        if (req.user.role !== 'ADMIN') {
            matchStage.assignedEmployeeId = req.user.id;
        }

        // Apply filters
        if (req.query.status) matchStage.status = req.query.status;
        if (req.query.college) matchStage.college = new RegExp(req.query.college, 'i');
        if (req.query.department) matchStage.department = new RegExp(req.query.department, 'i');
        if (req.query.year) matchStage.year = req.query.year;

        const groups = await WhatsAppGroup.aggregate([
            { $match: matchStage },
            {
                $lookup: {
                    from: 'users',
                    localField: 'assignedEmployeeId',
                    foreignField: '_id',
                    as: 'assignedEmployee'
                }
            },
            { $unwind: { path: '$assignedEmployee', preserveNullAndEmptyArrays: true } },
            {
                $lookup: {
                    from: 'crprofiles',
                    localField: 'crId',
                    foreignField: '_id',
                    as: 'cr'
                }
            },
            { $unwind: { path: '$cr', preserveNullAndEmptyArrays: true } },
            {
                $addFields: {
                    pendingStudents: { $subtract: ['$expectedStudents', '$joinedStudents'] },
                    joiningPercentage: {
                        $cond: {
                            if: { $gt: ['$expectedStudents', 0] },
                            then: { $multiply: [{ $divide: ['$joinedStudents', '$expectedStudents'] }, 100] },
                            else: 0
                        }
                    }
                }
            },
            { $sort: { createdAt: -1 } }
        ]);

        res.json({ success: true, data: groups });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};

// @route   GET /api/whatsapp-groups/:id
// @desc    Get group by ID
exports.getWhatsAppGroupById = async (req, res) => {
    try {
        const group = await WhatsAppGroup.findById(req.params.id)
            .populate('assignedEmployeeId', 'name')
            .populate('crId', 'crName phone status college department year section');
            
        if (!group) return res.status(404).json({ success: false, message: 'Not found' });

        res.json({ success: true, data: group });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};

// @route   POST /api/whatsapp-groups
// @desc    Create WhatsApp group (already handled in cr.controller, but provided for completeness)
exports.createWhatsAppGroup = async (req, res) => {
    try {
        const { crId, groupName, groupLink, expectedStudents } = req.body;
        
        const cr = await CRProfile.findById(crId);
        if (!cr) return res.status(404).json({ success: false, message: 'CR not found' });

        const existing = await WhatsAppGroup.findOne({ crId });
        if (existing) return res.status(400).json({ success: false, message: 'Group already exists for this CR' });

        const group = await WhatsAppGroup.create({
            crId,
            assignedEmployeeId: cr.assignedEmployeeId,
            college: cr.college,
            department: cr.department,
            year: cr.year,
            section: cr.section,
            groupName,
            groupLink,
            status: 'Created',
            expectedStudents: expectedStudents || 0
        });

        cr.status = 'Group Created';
        await cr.save();

        await CRActivity.create({
            crId: cr._id,
            employeeId: req.user.id,
            activityType: 'GROUP_CREATED',
            description: `WhatsApp group '${groupName}' created`
        });

        const io = require('../server').io;
        if (io) {
            io.emit('cr:updated', { crId: cr._id });
            io.emit('group:created', { groupId: group._id });
        }

        res.status(201).json({ success: true, data: group });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};

// @route   PATCH /api/whatsapp-groups/:id
// @desc    Update WhatsApp group
exports.updateWhatsAppGroup = async (req, res) => {
    try {
        const group = await WhatsAppGroup.findById(req.params.id);
        if (!group) return res.status(404).json({ success: false, message: 'Not found' });

        if (req.user.role !== 'ADMIN' && group.assignedEmployeeId.toString() !== req.user.id) {
            return res.status(403).json({ success: false, message: 'Forbidden' });
        }

        const { groupName, groupLink, expectedStudents, joinedStudents, status } = req.body;

        if (groupName !== undefined) group.groupName = groupName;
        if (groupLink !== undefined) group.groupLink = groupLink;
        
        if (expectedStudents !== undefined) group.expectedStudents = expectedStudents;
        if (joinedStudents !== undefined) {
            // Prevent joining more than expected if expected is > 0
            if (group.expectedStudents > 0 && joinedStudents > group.expectedStudents) {
                group.joinedStudents = group.expectedStudents;
            } else {
                group.joinedStudents = joinedStudents;
            }
        }

        // Automatic Status Logic
        let calculatedStatus = status || group.status;
        if (!status) {
            if (group.expectedStudents > 0 && group.joinedStudents === 0) calculatedStatus = 'Created';
            else if (group.joinedStudents > 0 && group.joinedStudents < group.expectedStudents) calculatedStatus = 'Students Joining';
            else if (group.expectedStudents > 0 && group.joinedStudents >= group.expectedStudents) calculatedStatus = 'Completed';
        }
        group.status = calculatedStatus;

        await group.save();

        await CRActivity.create({
            crId: group.crId,
            employeeId: req.user.id,
            activityType: 'GROUP_UPDATED',
            description: `WhatsApp group updated (Joined: ${group.joinedStudents}/${group.expectedStudents})`
        });

        const io = require('../server').io;
        if (io) {
            io.emit('cr:updated', { crId: group.crId });
            io.emit('group:updated', { groupId: group._id });
        }

        res.json({ success: true, data: group });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};
