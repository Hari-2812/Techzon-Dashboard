const HolidayResponse = require('../models/HolidayResponse');
const Holiday = require('../models/Holiday');
const User = require('../models/User');

// Submit response (Employee)
exports.submitResponse = async (req, res) => {
  try {
    const { holidayId, response, comment } = req.body;
    
    const holiday = await Holiday.findById(holidayId);
    if (!holiday) return res.status(404).json({ success: false, message: 'Holiday not found' });

    const existingResponse = await HolidayResponse.findOne({ employeeId: req.user.id, holidayId });
    if (existingResponse) {
      return res.status(400).json({ success: false, message: 'You have already responded for this holiday.' });
    }

    const status = response === 'WILL_WORK' ? 'CONFIRMED' : 'PENDING';

    const holidayResponse = await HolidayResponse.create({
      employeeId: req.user.id,
      holidayId,
      holidayDate: holiday.date,
      response,
      status,
      comment
    });

    // Notify Admin via Socket.IO
    const { io } = require('../server');
    if (io) {
      io.emit('holiday:response-submitted', holidayResponse);
    }

    res.status(201).json({ success: true, data: holidayResponse });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get my responses (Employee)
exports.getMyResponses = async (req, res) => {
  try {
    const responses = await HolidayResponse.find({ employeeId: req.user.id }).populate('holidayId');
    res.json({ success: true, data: responses });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get all responses for a holiday (Admin)
exports.getResponsesByHoliday = async (req, res) => {
  try {
    const { holidayId } = req.params;
    const responses = await HolidayResponse.find({ holidayId }).populate('employeeId', 'name role email');
    res.json({ success: true, data: responses });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Approve/Reject leave (Admin)
exports.reviewResponse = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body; // 'APPROVED' or 'REJECTED'

    if (!['APPROVED', 'REJECTED'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status' });
    }

    const response = await HolidayResponse.findById(id);
    if (!response) return res.status(404).json({ success: false, message: 'Response not found' });

    response.status = status;
    response.reviewedBy = req.user.id;
    response.reviewedAt = new Date();
    await response.save();

    // Notify Employee via Socket.IO
    const { io } = require('../server');
    if (io) {
      io.emit(`holiday:reviewed:${response.employeeId}`, response);
    }

    res.json({ success: true, data: response });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Send manual reminder to pending employees (Admin)
exports.remindPending = async (req, res) => {
  try {
    const { holidayId } = req.body;
    const holiday = await Holiday.findById(holidayId);
    if (!holiday) return res.status(404).json({ success: false, message: 'Holiday not found' });

    const activeEmployees = await User.find({ status: 'ACTIVE', role: { $ne: 'ADMIN' } });
    const responses = await HolidayResponse.find({ holidayId });
    const respondedEmployeeIds = responses.map(r => r.employeeId.toString());

    const pendingEmployees = activeEmployees.filter(emp => !respondedEmployeeIds.includes(emp._id.toString()));

    // Emit socket event to these employees to trigger the notification/popup again
    const { io } = require('../server');
    if (io) {
      pendingEmployees.forEach(emp => {
        io.emit(`holiday:reminder:${emp._id}`, {
          holiday,
          message: 'Please submit your response for the upcoming holiday.'
        });
      });
    }

    res.json({ success: true, message: `Reminders sent to ${pendingEmployees.length} employees.` });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
