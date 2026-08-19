const Lead = require('../models/Lead');
const CRProfile = require('../models/CRProfile');
const StudentCRRelationship = require('../models/StudentCRRelationship');
const LeadActivity = require('../models/LeadActivity');
const CRActivity = require('../models/CRActivity');
const AuditLog = require('../models/AuditLog');

exports.recordCall = async (leadId, employeeId, outcome, notes) => {
    const lead = await Lead.findById(leadId);
    if (!lead) throw new Error('Lead not found');

    // Create activity
    await LeadActivity.create({
        leadId,
        employeeId,
        activityType: outcome,
        description: `Call outcome: ${outcome}`,
        metadata: { notes }
    });

    // Update lead status
    if (lead.leadStatus === 'New' || lead.leadStatus === 'Assigned' || lead.leadStatus === 'Contact Pending') {
        if (outcome === 'CALL_COMPLETED') {
            lead.leadStatus = 'Contacted';
        } else {
            lead.leadStatus = 'No Response';
        }
    }

    await lead.save();

    // Audit log
    await AuditLog.create({
        actorId: employeeId,
        action: 'CALL_RECORDED',
        entityType: 'Lead',
        entityId: lead._id,
        metadata: { outcome }
    });

    return lead;
};

exports.verifyCR = async (leadId, employeeId, isCR, crDetails) => {
    const lead = await Lead.findById(leadId);
    if (!lead) throw new Error('Lead not found');

    let crProfile;
    let relationshipSource = 'STUDENT_PROVIDED';

    if (isCR) {
        relationshipSource = 'STUDENT_IS_CR';
        crDetails = {
            crName: lead.studentName,
            phone: lead.phone,
            college: lead.college,
            department: lead.department,
            year: lead.year,
            section: crDetails?.section || ''
        };
    }

    const { normalizePhone } = require('../validations/lead.validation');
    crDetails.phone = normalizePhone(crDetails.phone);

    // Check if CR phone already exists to prevent duplicates
    crProfile = await CRProfile.findOne({ phone: crDetails.phone });
    
    if (!crProfile) {
        crProfile = await CRProfile.create({
            ...crDetails,
            assignedEmployeeId: lead.assignedEmployeeId // CR inherits lead owner
        });

        await CRActivity.create({
            crId: crProfile._id,
            employeeId,
            activityType: 'CR_CREATED',
            description: 'CR Profile created during lead verification'
        });
    }

    // Create relationship
    await StudentCRRelationship.create({
        studentId: lead._id,
        crId: crProfile._id,
        source: relationshipSource
    });

    // Update lead status
    lead.crStatus = isCR ? 'Student Is CR' : 'CR Details Received';
    lead.leadStatus = 'CR Identified';
    await lead.save();

    // Activities
    await LeadActivity.create({
        leadId: lead._id,
        employeeId,
        activityType: 'CR_IDENTIFIED',
        description: `CR identified: ${crProfile.crName} (${crProfile.phone})`
    });

    await CRActivity.create({
        crId: crProfile._id,
        employeeId,
        activityType: 'STUDENT_LINKED',
        description: `Linked to student lead ${lead.studentName}`
    });

    // Audit
    await AuditLog.create({
        actorId: employeeId,
        action: 'CR_IDENTIFIED',
        entityType: 'Lead',
        entityId: lead._id,
        newValue: { crId: crProfile._id }
    });

    return { lead, crProfile };
};
