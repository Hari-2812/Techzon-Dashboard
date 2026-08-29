const mongoose = require('mongoose');
const WorkSession = require('./src/models/WorkSession');
const AttendanceDaily = require('./src/models/AttendanceDaily');
const User = require('./src/models/User');
const AttendanceSettings = require('./src/models/AttendanceSettings');
const moment = require('moment-timezone');

async function testAttendance() {
    try {
        await mongoose.connect('mongodb://localhost:27017/techzon_dashboard', {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });

        const dateStr = moment().tz('Asia/Kolkata').format('YYYY-MM-DD');
        console.log('Today Date:', dateStr);

        const sessions = await WorkSession.find({ date: dateStr }).populate('employeeId', 'name email role');
        const existingDailies = await AttendanceDaily.find({ date: dateStr }).populate('employeeId', 'name email role');
        
        console.log('Sessions count:', sessions.length);
        console.log('Dailies count:', existingDailies.length);

        if (sessions.length > 0) {
            console.log('First session status:', sessions[0].status);
        }

        if (existingDailies.length > 0) {
            console.log('First daily status:', existingDailies[0].status);
        }
        
        let summary = {
          present: 0,
          late: 0,
          halfDay: 0,
          absent: 0,
          onLeave: 0,
          currentlyWorking: 0,
          missingClockOut: 0,
          onBreak: 0,
          notClockedIn: 0
        };

        existingDailies.forEach(d => {
          if (d.status === 'PRESENT') summary.present++;
          if (d.status === 'LATE') summary.late++;
          if (d.status === 'HALF_DAY') summary.halfDay++;
          if (d.status === 'ABSENT') summary.absent++;
          if (d.status === 'PAID_LEAVE' || d.status === 'Leave Approved') summary.onLeave++;
          if (d.isSynthesized && (d.status === 'No Prior Information' || d.status === 'Not Clocked In')) summary.notClockedIn++;
        });

        sessions.forEach(s => {
          if (s.status === 'RUNNING' || s.status === 'ACTIVE') summary.currentlyWorking++;
          if (s.status === 'ON_BREAK' || s.status === 'PENDING_BREAK_APPROVAL') summary.onBreak++;
          if (s.status === 'MISSING_CLOCK_OUT') summary.missingClockOut++;
        });

        console.log('Summary output:', summary);
        
    } catch (e) {
        console.error(e);
    } finally {
        mongoose.connection.close();
    }
}

testAttendance();
