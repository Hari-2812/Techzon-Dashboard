const Lead = require('../models/Lead');
const FollowUp = require('../models/FollowUp');
const WhatsAppGroup = require('../models/WhatsAppGroup');
const GroupStudent = require('../models/GroupStudent');

exports.getAdminDashboard = async (req, res) => {
  try {
    const totalLeads = await Lead.countDocuments();
    const newLeads = await Lead.countDocuments({ leadStatus: 'New' });
    const pendingCalls = await Lead.countDocuments({ leadStatus: 'Contact Pending' });
    const crsIdentified = await Lead.countDocuments({ leadStatus: 'CR Identified' });
    const groupsCreated = await WhatsAppGroup.countDocuments();
    const studentsJoined = await GroupStudent.countDocuments({ status: 'Joined' });
    
    // Follow-ups due today or overdue
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);
    
    const followupsDue = await FollowUp.countDocuments({ 
        status: 'Pending', 
        dueDate: { $lte: endOfToday } 
    });

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
    
    const totalLeads = await Lead.countDocuments({ assignedEmployeeId: employeeId });
    const newLeads = await Lead.countDocuments({ assignedEmployeeId: employeeId, leadStatus: 'New' });
    const pendingCalls = await Lead.countDocuments({ assignedEmployeeId: employeeId, leadStatus: 'Contact Pending' });
    const crsIdentified = await Lead.countDocuments({ assignedEmployeeId: employeeId, leadStatus: 'CR Identified' });
    const groupsCreated = await WhatsAppGroup.countDocuments({ assignedEmployeeId: employeeId });
    
    // Employee follows up due
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);
    
    const followupsDue = await FollowUp.countDocuments({ 
        assignedEmployeeId: employeeId,
        status: 'Pending', 
        dueDate: { $lte: endOfToday } 
    });

    // To get students joined for an employee, we must find their groups first
    const employeeGroups = await WhatsAppGroup.find({ assignedEmployeeId: employeeId }).select('_id');
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
