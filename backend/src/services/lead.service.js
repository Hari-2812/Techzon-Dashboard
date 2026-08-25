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

    crDetails = crDetails || {};

    if (isCR) {
        relationshipSource = 'STUDENT_IS_CR';
        crDetails = {
            crName: lead.studentName,
            phone: lead.phone,
            college: lead.college || crDetails.college,
            department: lead.department || crDetails.department,
            year: lead.year || crDetails.year,
            section: lead.section || crDetails.section || ''
        };
    }

    // Validate required fields if we are creating or updating a CR profile
    const missingFields = [];
    if (!crDetails.college || !String(crDetails.college).trim()) missingFields.push('college');
    if (!crDetails.department || !String(crDetails.department).trim()) missingFields.push('department');
    if (!crDetails.year || !String(crDetails.year).trim()) missingFields.push('year');

    if (missingFields.length > 0) {
        const err = new Error(`Missing required fields: ${missingFields.join(', ')}`);
        err.code = 'MISSING_CR_FIELDS';
        throw err;
    }

    const { normalizePhone } = require('../validations/lead.validation');
    crDetails.phone = normalizePhone(crDetails.phone);

    // Check if CR phone already exists
    crProfile = await CRProfile.findOne({ phone: crDetails.phone });
    
    if (crProfile) {
        // Update missing/new information in the existing CR Profile
        let updated = false;
        if (!crProfile.college && crDetails.college) { crProfile.college = crDetails.college; updated = true; }
        if (!crProfile.department && crDetails.department) { crProfile.department = crDetails.department; updated = true; }
        if (!crProfile.year && crDetails.year) { crProfile.year = crDetails.year; updated = true; }
        if (!crProfile.section && crDetails.section) { crProfile.section = crDetails.section; updated = true; }
        
        if (updated) {
            await crProfile.save();
            await CRActivity.create({
                crId: crProfile._id,
                employeeId,
                activityType: 'CR_UPDATED',
                description: 'CR Profile updated during lead verification'
            });
        }
    } else {
        // Create new CR Profile
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

    // Create relationship if it doesn't exist
    const existingRel = await StudentCRRelationship.findOne({ studentId: lead._id, crId: crProfile._id });
    if (!existingRel) {
        await StudentCRRelationship.create({
            studentId: lead._id,
            crId: crProfile._id,
            source: relationshipSource
        });
    }

    // Update lead status
    lead.crStatus = isCR ? 'Student Is CR' : 'CR Details Received';
    lead.leadStatus = 'CR Identified';
    
    // Also save the provided college/department/year back to the lead if it was missing
    if (!lead.college && crDetails.college) lead.college = crDetails.college;
    if (!lead.department && crDetails.department) lead.department = crDetails.department;
    if (!lead.year && crDetails.year) lead.year = crDetails.year;

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
