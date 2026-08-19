const FollowUp = require('../models/FollowUp');
const LeadActivity = require('../models/LeadActivity');
const AuditLog = require('../models/AuditLog');

exports.scheduleFollowUp = async (employeeId, data) => {
    const followup = await FollowUp.create({
        ...data,
        assignedEmployeeId: employeeId
    });

    if (data.leadId) {
        await LeadActivity.create({
            leadId: data.leadId,
            employeeId,
            activityType: 'FOLLOW_UP_SCHEDULED',
            description: `Scheduled ${data.type} follow-up for ${new Date(data.dueDate).toLocaleString()}`
        });
    }

    await AuditLog.create({
        actorId: employeeId,
        action: 'FOLLOW_UP_SCHEDULED',
        entityType: 'FollowUp',
        entityId: followup._id,
        newValue: followup
    });

    return followup;
};

exports.completeFollowUp = async (followupId, employeeId, notes) => {
    const followup = await FollowUp.findById(followupId);
    if (!followup) throw new Error('Follow-up not found');

    followup.status = 'Completed';
    followup.completedAt = new Date();
    if (notes) followup.notes = (followup.notes ? followup.notes + '\n' : '') + notes;
    await followup.save();

    if (followup.leadId) {
        await LeadActivity.create({
            leadId: followup.leadId,
            employeeId,
            activityType: 'FOLLOW_UP_COMPLETED',
            description: `Completed follow-up: ${followup.type}`,
            metadata: { notes }
        });
    }

    return followup;
};
