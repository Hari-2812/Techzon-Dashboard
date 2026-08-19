const moment = require('moment-timezone');
const AttendanceSettings = require('../models/AttendanceSettings');

exports.calculateSessionStats = async (workSession, settings) => {
  if (!settings) {
    settings = await AttendanceSettings.findOne() || new AttendanceSettings();
  }

  const { timezone, officeStartTime, officeEndTime, gracePeriodMinutes, requiredWorkingHours, halfDayThresholdHours } = settings;

  // Convert clock-in to the specific timezone
  const clockIn = moment(workSession.clockInAt).tz(timezone);
  const clockOut = workSession.clockOutAt ? moment(workSession.clockOutAt).tz(timezone) : moment().tz(timezone);

  // 1. Calculate Break Minutes
  let breakMinutes = 0;
  if (workSession.breaks && workSession.breaks.length > 0) {
    workSession.breaks.forEach(b => {
      const start = moment(b.startAt);
      const end = b.endAt ? moment(b.endAt) : moment();
      breakMinutes += end.diff(start, 'minutes');
    });
  }

  // 2. Calculate Gross and Net Worked Minutes
  const grossWorkedMinutes = clockOut.diff(clockIn, 'minutes');
  let workedMinutes = grossWorkedMinutes - breakMinutes;
  if (workedMinutes < 0) workedMinutes = 0;

  // 3. Calculate Scheduled Minutes
  // Parse officeStartTime string (e.g. "09:30 AM") today
  const [startStr, startMeridian] = officeStartTime.split(' ');
  const [startHr, startMin] = startStr.split(':').map(Number);
  let schedStartHr = startHr;
  if (startMeridian === 'PM' && startHr !== 12) schedStartHr += 12;
  if (startMeridian === 'AM' && startHr === 12) schedStartHr = 0;

  const scheduledStart = moment(clockIn).tz(timezone).startOf('day').add(schedStartHr, 'hours').add(startMin, 'minutes');
  
  // Calculate late minutes
  let lateMinutes = clockIn.diff(scheduledStart, 'minutes');
  if (lateMinutes < 0) lateMinutes = 0;
  
  // Apply grace period
  if (lateMinutes <= gracePeriodMinutes) {
    lateMinutes = 0;
  }

  // 4. Overtime & Early Leave
  const requiredMinutes = requiredWorkingHours * 60;
  let overtimeMinutes = 0;
  let earlyLeaveMinutes = 0;

  if (workedMinutes > requiredMinutes) {
    overtimeMinutes = workedMinutes - requiredMinutes;
  } else if (workedMinutes < requiredMinutes) {
    earlyLeaveMinutes = requiredMinutes - workedMinutes;
  }

  // 5. Determine Status
  let status = 'PRESENT';
  
  if (workedMinutes < (halfDayThresholdHours * 60)) {
    status = 'ABSENT';
  } else if (workedMinutes < requiredMinutes) {
    status = 'HALF_DAY';
  } else if (lateMinutes > 0) {
    status = 'LATE';
  }
  
  // If they forgot to clock out and we are just projecting, it might be incomplete
  if (!workSession.clockOutAt && workSession.status === 'MISSING_CLOCK_OUT') {
    status = 'REQUIRES_REVIEW';
  }

  return {
    scheduledMinutes: requiredMinutes,
    workedMinutes,
    breakMinutes,
    lateMinutes,
    earlyLeaveMinutes,
    overtimeMinutes,
    status
  };
};
