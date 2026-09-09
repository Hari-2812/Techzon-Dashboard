import re

with open('frontend/src/pages/AttendanceManagement.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Replace the two buttons in the drawer
old_buttons = '''                              { (!selectedEmployee.session) && (
                                <Button variant="outline" size="sm" onClick={() => {
                                   setManualEmployeeId(selectedEmployee.employeeId._id || selectedEmployee.employeeId);
                                   setManualDate(moment().format('YYYY-MM-DD'));
                                   setManualStatus('PRESENT');
                                   setManualClockIn('');
                                   setManualClockOut('');
                                   setManualStartTime('');
                                   setManualEndTime('');
                                   setManualAdminRemarks('');
                                   setManualCorrectionModalOpen(true);
                                }}>
                                  Update Attendance
                                </Button>
                              )}
                              { (selectedEmployee.session) && (
                                <Button variant="outline" size="sm" onClick={() => {
                                   setEditClockInTime(moment(selectedEmployee.session.clockInAt).format('YYYY-MM-DDTHH:mm'));
                                   setEditClockOutTime(selectedEmployee.session.clockOutAt ? moment(selectedEmployee.session.clockOutAt).format('YYYY-MM-DDTHH:mm') : '');
                                   setEditBreakDuration(selectedEmployee.breakMinutes ? selectedEmployee.breakMinutes.toString() : '0');
                                   setEditAttendanceReason('');
                                   setEditAttendanceModalOpen(true);
                                }}>
                                  Edit Attendance
                                </Button>
                              )}'''

new_button = '''                              <Button variant="outline" size="sm" onClick={() => {
                                 setManualEmployeeId(selectedEmployee.employeeId._id || selectedEmployee.employeeId);
                                 setManualDate(adminSelectedDate);
                                 
                                 const statusFromBackend = selectedEmployee.status || 'PRESENT';
                                 const mappedStatus = ['WORKING', 'COMPLETED'].includes(statusFromBackend) ? 'PRESENT' 
                                                    : ['PAID_LEAVE'].includes(statusFromBackend) ? 'LEAVE'
                                                    : statusFromBackend;
                                 
                                 setManualStatus(mappedStatus);
                                 
                                 if (selectedEmployee.session?.clockInAt) {
                                     setManualClockIn(moment(selectedEmployee.session.clockInAt).tz('Asia/Kolkata').format('HH:mm'));
                                 } else {
                                     setManualClockIn('');
                                 }
                                 
                                 if (selectedEmployee.session?.clockOutAt) {
                                     setManualClockOut(moment(selectedEmployee.session.clockOutAt).tz('Asia/Kolkata').format('HH:mm'));
                                 } else {
                                     setManualClockOut('');
                                 }
                                 
                                 setManualStartTime('');
                                 setManualEndTime('');
                                 setManualAdminRemarks('');
                                 setManualCorrectionModalOpen(true);
                              }}>
                                Edit Attendance
                              </Button>'''

content = content.replace(old_buttons, new_button)

with open('frontend/src/pages/AttendanceManagement.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
