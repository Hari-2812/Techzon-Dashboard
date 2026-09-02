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
  // Parse officeStartTime string (e.g. "11:30 AM") today
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

exports.buildMonthlyAttendanceData = async (employeeId, month, year) => {
  const AttendanceDaily = require('../models/AttendanceDaily');
  const HolidayResponse = require('../models/HolidayResponse');
  const Holiday = require('../models/Holiday');
  
  const prefix = `${year}-${month.padStart(2, '0')}`;
  
  let records = await AttendanceDaily.find({ 
    employeeId: employeeId, 
    date: { $regex: `^${prefix}` },
    isTestSession: { $ne: true }
  }).lean();
  
  // Inject approved holidays
  const holidayResponses = await HolidayResponse.find({
    employeeId: employeeId,
    holidayDate: { $regex: `^${prefix}` },
    response: 'TAKE_LEAVE',
    status: 'APPROVED'
  }).lean();

  const existingDates = new Set(records.map(r => r.date));

  for (const hr of holidayResponses) {
     if (!existingDates.has(hr.holidayDate)) {
         const holiday = await Holiday.findById(hr.holidayId);
         records.push({
             date: hr.holidayDate,
             status: 'HOLIDAY',
             workedMinutes: 0,
             breakMinutes: 0,
             isSynthesized: true,
             note: holiday ? holiday.name : 'Approved Holiday Leave'
         });
         existingDates.add(hr.holidayDate);
     }
  }
  
  // Inject Week Off for Mondays without records
  let settings = await AttendanceSettings.findOne() || new AttendanceSettings();
  const tz = settings.timezone || 'Asia/Kolkata';
  const daysInMonth = moment.tz(`${prefix}-01`, 'YYYY-MM-DD', tz).daysInMonth();
  
  for (let i = 1; i <= daysInMonth; i++) {
      const dateStr = `${prefix}-${i.toString().padStart(2, '0')}`;
      const currentDay = moment.tz(dateStr, 'YYYY-MM-DD', tz);
      
      if (!existingDates.has(dateStr) && currentDay.isSameOrBefore(moment.tz(tz), 'day')) {
         if (currentDay.day() === 1) { // Monday
             records.push({
                 date: dateStr,
                 status: 'WEEK_OFF',
                 workedMinutes: 0,
                 breakMinutes: 0,
                 isSynthesized: true
             });
             existingDates.add(dateStr);
         }
      }
  }

  records.sort((a, b) => a.date.localeCompare(b.date));
  
  let summary = {
    present: 0,
    late: 0,
    halfDay: 0,
    absent: 0,
    onLeave: 0,
    weekOff: 0,
    totalWorkedMinutes: 0,
    totalBreakMinutes: 0
  };

  records.forEach(d => {
    if (d.workedMinutes) summary.totalWorkedMinutes += d.workedMinutes;
    if (d.breakMinutes) summary.totalBreakMinutes += d.breakMinutes;

    if (['PRESENT', 'WORKING', 'ON_BREAK', 'COMPLETED', 'EARLY_LEAVE', 'OVERTIME', 'PENDING_BREAK_APPROVAL', 'PENDING_CHECK_OUT_APPROVAL'].includes(d.status)) summary.present++;
    else if (d.status === 'LATE') summary.late++;
    else if (d.status === 'HALF_DAY') summary.halfDay++;
    else if (d.status === 'ABSENT') summary.absent++;
    else if (d.status === 'PAID_LEAVE' || d.status === 'Leave Approved' || d.status === 'LEAVE' || d.status === 'HOLIDAY' || d.status === 'PERMISSION') summary.onLeave++;
    else if (d.status === 'Week Off' || d.status === 'WEEK_OFF') summary.weekOff++;
  });

  return { summary, records };
};
