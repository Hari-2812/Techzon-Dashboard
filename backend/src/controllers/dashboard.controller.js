const Lead = require('../models/Lead');
const FollowUp = require('../models/FollowUp');
const WhatsAppGroup = require('../models/WhatsAppGroup');
const GroupStudent = require('../models/GroupStudent');

exports.getAdminDashboard = async (req, res) => {
  try {
    // Follow-ups due today or overdue
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);
    
    const [
      totalLeads,
      newLeads,
      pendingCalls,
      crsIdentified,
      groupsCreated,
      studentsJoined,
      followupsDue
    ] = await Promise.all([
      Lead.countDocuments(),
      Lead.countDocuments({ leadStatus: 'New' }),
      Lead.countDocuments({ leadStatus: 'Contact Pending' }),
      Lead.countDocuments({ leadStatus: 'CR Identified' }),
      WhatsAppGroup.countDocuments(),
      GroupStudent.countDocuments({ status: 'Joined' }),
      FollowUp.countDocuments({ 
          status: 'Pending', 
          dueDate: { $lte: endOfToday } 
      })
    ]);

    res.json({
      success: true,
      data: {
        totalLeads,
        newLeads,
        pendingCalls,
        crsIdentified,
        followupsDue,
        groupsCreated,
        studentsJoined
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

exports.getEmployeeDashboard = async (req, res) => {
  try {
    const employeeId = req.user.id;
    
    // Employee follows up due
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);
    
    const [
      totalLeads,
      newLeads,
      pendingCalls,
      crsIdentified,
      groupsCreated,
      followupsDue,
      employeeGroups
    ] = await Promise.all([
      Lead.countDocuments({ assignedEmployeeId: employeeId }),
      Lead.countDocuments({ assignedEmployeeId: employeeId, leadStatus: 'New' }),
      Lead.countDocuments({ assignedEmployeeId: employeeId, leadStatus: 'Contact Pending' }),
      Lead.countDocuments({ assignedEmployeeId: employeeId, leadStatus: 'CR Identified' }),
      WhatsAppGroup.countDocuments({ assignedEmployeeId: employeeId }),
      FollowUp.countDocuments({ 
          assignedEmployeeId: employeeId,
          status: 'Pending', 
          dueDate: { $lte: endOfToday } 
      }),
      WhatsAppGroup.find({ assignedEmployeeId: employeeId }).select('_id')
    ]);

    // To get students joined for an employee, we must find their groups first
    const groupIds = employeeGroups.map(g => g._id);
    const studentsJoined = await GroupStudent.countDocuments({ groupId: { $in: groupIds }, status: 'Joined' });

    res.json({
      success: true,
      data: {
        totalLeads,
        newLeads,
        pendingCalls,
        crsIdentified,
        followupsDue,
        groupsCreated,
        studentsJoined
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};
