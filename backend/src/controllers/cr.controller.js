const CRProfile = require('../models/CRProfile');
const CRActivity = require('../models/CRActivity');

// @route   GET /api/crs
exports.getCRs = async (req, res) => {
  try {
    let matchStage = {};
    if (req.user.role !== 'ADMIN') {
        matchStage.assignedEmployeeId = req.user.id;
    }

    const crs = await CRProfile.aggregate([
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
                from: 'studentcrrelationships',
                localField: '_id',
                foreignField: 'crId',
                as: 'sourceStudents'
            }
        },
        {
            $lookup: {
                from: 'whatsappgroups',
                localField: '_id',
                foreignField: 'crId',
                as: 'group'
            }
        },
        { $unwind: { path: '$group', preserveNullAndEmptyArrays: true } },
        {
            $addFields: {
                sourceStudentCount: { $size: '$sourceStudents' },
                expectedStudents: { $ifNull: ['$group.expectedStudents', 0] },
                joinedStudents: { $ifNull: ['$group.joinedStudents', 0] }
            }
        },
        {
            $addFields: {
                pendingStudents: { $subtract: ['$expectedStudents', '$joinedStudents'] }
            }
        },
        { $sort: { createdAt: -1 } }
    ]);

    res.json({ success: true, data: crs });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// @route   GET /api/crs/:id
exports.getCRById = async (req, res) => {
  try {
    const cr = await CRProfile.findById(req.params.id).populate('assignedEmployeeId', 'name email');
    if (!cr) return res.status(404).json({ success: false, message: 'CR not found' });
    res.json({ success: true, data: cr });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// @route   GET /api/crs/:id/activities
exports.getCRActivities = async (req, res) => {
  try {
    const activities = await CRActivity.find({ crId: req.params.id })
      .populate('employeeId', 'name role')
      .sort({ timestamp: -1 });
    res.json({ success: true, data: activities });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// @route   PATCH /api/crs/:id/status
exports.updateCRStatus = async (req, res) => {
    try {
        const { status } = req.body;
        const cr = await CRProfile.findById(req.params.id);
        if (!cr) return res.status(404).json({ success: false, message: 'CR not found' });
        
        // RBAC
        if (req.user.role !== 'ADMIN' && cr.assignedEmployeeId.toString() !== req.user.id) {
            return res.status(403).json({ success: false, message: 'Forbidden' });
        }

        cr.status = status;
        await cr.save();

        await CRActivity.create({
            crId: cr._id,
            employeeId: req.user.id,
            activityType: 'STATUS_UPDATED',
            description: `Status changed to ${status}`
        });

        const io = require('../server').io;
        if (io) io.emit('cr:updated', { crId: cr._id });

        res.json({ success: true, data: cr });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};

// @route   PATCH /api/crs/:id/assign
exports.updateCRAssignment = async (req, res) => {
    try {
        if (req.user.role !== 'ADMIN') return res.status(403).json({ success: false, message: 'Admin only' });
        
        const { assignedEmployeeId } = req.body;
        const cr = await CRProfile.findById(req.params.id);
        if (!cr) return res.status(404).json({ success: false, message: 'CR not found' });

        cr.assignedEmployeeId = assignedEmployeeId;
        await cr.save();

        await CRActivity.create({
            crId: cr._id,
            employeeId: req.user.id,
            activityType: 'CR_REASSIGNED',
            description: `Assigned to employee ${assignedEmployeeId}`
        });

        const io = require('../server').io;
        if (io) io.emit('cr:updated', { crId: cr._id });

        res.json({ success: true, data: cr });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};

// @route   GET /api/crs/:id/source-students
exports.getSourceStudents = async (req, res) => {
    try {
        const StudentCRRelationship = require('../models/StudentCRRelationship');
        const relationships = await StudentCRRelationship.find({ crId: req.params.id })
            .populate({
                path: 'studentId',
                select: 'studentName phone college department year leadStatus assignedEmployeeId',
                populate: { path: 'assignedEmployeeId', select: 'name' }
            });
            
        res.json({ success: true, data: relationships });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};

// @route   POST /api/crs/:id/follow-ups
exports.createFollowUp = async (req, res) => {
    try {
        const FollowUp = require('../models/FollowUp');
        const { type, dueDate, priority, notes } = req.body;
        
        const cr = await CRProfile.findById(req.params.id);
        if (!cr) return res.status(404).json({ success: false, message: 'CR not found' });

        const followUp = await FollowUp.create({
            crId: cr._id,
            assignedEmployeeId: cr.assignedEmployeeId,
            type,
            dueDate,
            priority,
            notes
        });

        await CRActivity.create({
            crId: cr._id,
            employeeId: req.user.id,
            activityType: 'FOLLOW_UP_SCHEDULED',
            description: `Scheduled ${type} follow-up for ${new Date(dueDate).toLocaleString()}`
        });

        const io = require('../server').io;
        if (io) io.emit('cr:updated', { crId: cr._id });

        res.json({ success: true, data: followUp });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};

// @route   POST /api/crs/:id/whatsapp-groups
exports.createWhatsAppGroup = async (req, res) => {
    try {
        const WhatsAppGroup = require('../models/WhatsAppGroup');
        const { groupName, expectedStudents } = req.body;
        
        const cr = await CRProfile.findById(req.params.id);
        if (!cr) return res.status(404).json({ success: false, message: 'CR not found' });

        const existing = await WhatsAppGroup.findOne({ crId: cr._id });
        if (existing) return res.status(400).json({ success: false, message: 'Group already exists for this CR' });

        const group = await WhatsAppGroup.create({
            crId: cr._id,
            assignedEmployeeId: cr.assignedEmployeeId,
            college: cr.college,
            department: cr.department,
            year: cr.year,
            section: cr.section,
            groupName,
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
        if (io) io.emit('cr:updated', { crId: cr._id });

        res.json({ success: true, data: group });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};

// @route   PATCH /api/crs/:id/whatsapp-groups
exports.updateWhatsAppGroup = async (req, res) => {
    try {
        const WhatsAppGroup = require('../models/WhatsAppGroup');
        const { groupLink, joinedStudents, status } = req.body;
        
        const group = await WhatsAppGroup.findOne({ crId: req.params.id });
        if (!group) return res.status(404).json({ success: false, message: 'Group not found' });

        if (groupLink !== undefined) group.groupLink = groupLink;
        if (joinedStudents !== undefined) group.joinedStudents = joinedStudents;
        if (status !== undefined) group.status = status;
        
        await group.save();

        await CRActivity.create({
            crId: req.params.id,
            employeeId: req.user.id,
            activityType: 'GROUP_UPDATED',
            description: `WhatsApp group updated (Joined: ${group.joinedStudents})`
        });

        const io = require('../server').io;
        if (io) io.emit('cr:updated', { crId: req.params.id });

        res.json({ success: true, data: group });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};

// @route   POST /api/crs
exports.createCR = async (req, res) => {
    try {
        if (req.user.role !== 'ADMIN') return res.status(403).json({ success: false, message: 'Admin only' });
        const newCR = await CRProfile.create(req.body);
        
        await CRActivity.create({
            crId: newCR._id,
            employeeId: req.user.id,
            activityType: 'CR_CREATED',
            description: 'CR Profile created'
        });
        
        const io = require('../app').get('io');
        if (io) io.emit('cr:updated', { bulk: true });
        
        res.status(201).json({ success: true, data: newCR });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Server Error', error: err.message });
    }
};

// @route   PUT /api/crs/:id
exports.updateCR = async (req, res) => {
    try {
        if (req.user.role !== 'ADMIN') return res.status(403).json({ success: false, message: 'Admin only' });
        const cr = await CRProfile.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!cr) return res.status(404).json({ success: false, message: 'CR not found' });
        
        await CRActivity.create({
            crId: cr._id,
            employeeId: req.user.id,
            activityType: 'CR_UPDATED',
            description: 'CR Profile details updated'
        });
        
        const io = require('../app').get('io');
        if (io) io.emit('cr:updated', { crId: cr._id });
        
        res.json({ success: true, data: cr });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};

// @route   DELETE /api/crs/:id
exports.deleteCR = async (req, res) => {
    try {
        if (req.user.role !== 'ADMIN') return res.status(403).json({ success: false, message: 'Admin only' });
        const cr = await CRProfile.findByIdAndDelete(req.params.id);
        if (!cr) return res.status(404).json({ success: false, message: 'CR not found' });
        
        const io = require('../app').get('io');
        if (io) io.emit('cr:updated', { bulk: true });
        
        res.json({ success: true, message: 'CR deleted successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};
