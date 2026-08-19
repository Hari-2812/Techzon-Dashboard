const Holiday = require('../models/Holiday');
const moment = require('moment-timezone');

// Get all holidays (Admin)
exports.getHolidays = async (req, res) => {
  try {
    const holidays = await Holiday.find().sort({ date: 1 });
    res.json({ success: true, data: holidays });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Create a holiday (Admin)
exports.createHoliday = async (req, res) => {
  try {
    const { name, date, description, type, isActive } = req.body;
    const holiday = await Holiday.create({
      name, date, description, type, isActive, createdBy: req.user._id
    });
    res.status(201).json({ success: true, data: holiday });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Update a holiday (Admin)
exports.updateHoliday = async (req, res) => {
  try {
    const holiday = await Holiday.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!holiday) return res.status(404).json({ success: false, message: 'Holiday not found' });
    res.json({ success: true, data: holiday });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Delete a holiday (Admin)
exports.deleteHoliday = async (req, res) => {
  try {
    const holiday = await Holiday.findByIdAndDelete(req.params.id);
    if (!holiday) return res.status(404).json({ success: false, message: 'Holiday not found' });
    res.json({ success: true, message: 'Holiday deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get upcoming holidays (Employee/Admin)
exports.getUpcomingHolidays = async (req, res) => {
  try {
    const today = moment().tz('Asia/Kolkata').format('YYYY-MM-DD');
    const holidays = await Holiday.find({ date: { $gte: today }, isActive: true }).sort({ date: 1 }).limit(10);
    res.json({ success: true, data: holidays });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get tomorrow's holiday (Employee)
exports.getTomorrowHoliday = async (req, res) => {
  try {
    const tomorrow = moment().tz('Asia/Kolkata').add(1, 'days').format('YYYY-MM-DD');
    const holiday = await Holiday.findOne({ date: tomorrow, isActive: true });
    
    // Check if it's past 7 PM IST today
    const now = moment().tz('Asia/Kolkata');
    const isPast7PM = now.hour() >= 19;

    res.json({ 
      success: true, 
      data: holiday || null,
      isPast7PM 
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
