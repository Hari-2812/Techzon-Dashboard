const cron = require('node-cron');
const moment = require('moment-timezone');
const Holiday = require('../models/Holiday');
const HolidayResponse = require('../models/HolidayResponse');
const User = require('../models/User');
// Optional: If you have a Notification model, import it here
// const Notification = require('../models/Notification');

module.exports = (io) => {
  // Run every day at 19:00 (7:00 PM) Asia/Kolkata
  cron.schedule('0 19 * * *', async () => {
    try {
      console.log('Running Holiday Scheduler Job...');
      const tomorrow = moment().tz('Asia/Kolkata').add(1, 'days').format('YYYY-MM-DD');

      // 1. Find tomorrow's active holiday
      const holiday = await Holiday.findOne({ date: tomorrow, isActive: true });
      
      if (!holiday) {
        console.log('No holiday scheduled for tomorrow.');
        return;
      }

      console.log(`Holiday found for tomorrow: ${holiday.name}`);

      // 2. Find active employees
      const activeEmployees = await User.find({ status: 'ACTIVE', role: { $ne: 'ADMIN' } });

      // 3. Find employees who have NOT responded yet
      const responses = await HolidayResponse.find({ holidayId: holiday._id });
      const respondedIds = responses.map(r => r.employeeId.toString());

      const pendingEmployees = activeEmployees.filter(emp => !respondedIds.includes(emp._id.toString()));

      if (pendingEmployees.length === 0) {
        console.log('All employees have already responded to the holiday notification.');
        return;
      }

      // 4. Emit Socket.IO event
      pendingEmployees.forEach(emp => {
        io.emit(`holiday:tomorrow-alert:${emp._id}`, {
          holiday,
          message: `Tomorrow is a Government Holiday: ${holiday.name}. Please confirm your availability.`
        });
        
        // 5. Optional: Save to Notification Collection
        /*
        if (Notification) {
          Notification.create({
            userId: emp._id,
            title: 'Government Holiday Tomorrow',
            message: `"${holiday.name}" is tomorrow. Please confirm whether you would like to take leave.`,
            link: '/dashboard',
            type: 'HOLIDAY_ALERT'
          });
        }
        */
      });

      console.log(`Sent holiday notification to ${pendingEmployees.length} employees.`);

    } catch (error) {
      console.error('Error in Holiday Scheduler:', error);
    }
  }, {
    scheduled: true,
    timezone: "Asia/Kolkata"
  });
};
