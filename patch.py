import re

with open('frontend/src/pages/AttendanceManagement.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Remove editAttendanceModalOpen and related state variables
content = re.sub(r'const \[editAttendanceModalOpen, setEditAttendanceModalOpen\] = useState\(false\);\n\s*const \[editClockInTime, setEditClockInTime\] = useState\(''\);\n\s*const \[editClockOutTime, setEditClockOutTime\] = useState\(''\);\n\s*const \[editBreakDuration, setEditBreakDuration\] = useState\(''\);\n\s*const \[editAttendanceReason, setEditAttendanceReason\] = useState\(''\);\n', '', content)

# 2. Replace the two buttons with a single unified button
old_buttons = '''                                { (!selectedEmployee.session) && (
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

new_button = '''                                <Button variant="outline" size="sm" onClick={() => {
                                   setManualEmployeeId(selectedEmployee.employeeId._id || selectedEmployee.employeeId);
                                   setManualDate(adminSelectedDate);
                                   setManualStatus(selectedEmployee.status || 'PRESENT');
                                   
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

# 3. Modify the modal
old_modal = '''      {/* Manual Correction Modal */}
      <Modal isOpen={manualCorrectionModalOpen} onClose={() => setManualCorrectionModalOpen(false)} title="Update Today's Attendance">
         <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1">Status</label>
              <select 
                value={manualStatus}
                onChange={(e) => setManualStatus(e.target.value)}
                className="w-full px-3 py-2 border border-[var(--color-border-subtle)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] bg-[var(--color-surface)] text-[var(--color-text-primary)]"
              >
                <option value="PRESENT">Present</option>
                <option value="LATE">Late</option>
                <option value="ABSENT">Absent</option>
                <option value="LEAVE">Leave</option>
                <option value="PERMISSION">Permission</option>
              </select>
            </div>

            {(manualStatus === 'PRESENT' || manualStatus === 'LATE') && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1">Clock In Time</label>
                  <input
                    type="time"
                    value={manualClockIn}
                    onChange={(e) => setManualClockIn(e.target.value)}
                    className="w-full px-3 py-2 border border-[var(--color-border-subtle)] rounded-lg bg-[var(--color-surface)] text-[var(--color-text-primary)]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1">Clock Out Time (Optional)</label>
                  <input
                    type="time"
                    value={manualClockOut}
                    onChange={(e) => setManualClockOut(e.target.value)}
                    className="w-full px-3 py-2 border border-[var(--color-border-subtle)] rounded-lg bg-[var(--color-surface)] text-[var(--color-text-primary)]"
                  />
                </div>
              </div>
            )}

            {manualStatus === 'PERMISSION' && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1">Start Time</label>
                  <input
                    type="time"
                    value={manualStartTime}
                    onChange={(e) => setManualStartTime(e.target.value)}
                    className="w-full px-3 py-2 border border-[var(--color-border-subtle)] rounded-lg bg-[var(--color-surface)] text-[var(--color-text-primary)]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1">End Time</label>
                  <input
                    type="time"
                    value={manualEndTime}
                    onChange={(e) => setManualEndTime(e.target.value)}
                    className="w-full px-3 py-2 border border-[var(--color-border-subtle)] rounded-lg bg-[var(--color-surface)] text-[var(--color-text-primary)]"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1">Admin Remarks (Optional)</label>
              <textarea 
                value={manualAdminRemarks}
                onChange={(e) => setManualAdminRemarks(e.target.value)}
                placeholder="Reason for manual update"
                className="w-full px-3 py-2 border border-[var(--color-border-subtle)] rounded-lg h-24 resize-none bg-[var(--color-surface)] text-[var(--color-text-primary)]"
              ></textarea>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <Button variant="outline" onClick={() => setManualCorrectionModalOpen(false)}>Cancel</Button>
              <Button onClick={async () => {
                 try {
                     if (!manualStatus) return alert('Status is required');
                     if (manualStatus === 'PERMISSION' && (!manualStartTime || !manualEndTime)) return alert('Start and End time are required for permission');
                     if ((manualStatus === 'PRESENT' || manualStatus === 'LATE') && !manualClockIn) return alert('Clock In time is required for Present/Late');

                     const token = (useAuthStore.getState().token || localStorage.getItem('token')) || '';
                     const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';
                     
                     const res = await fetch(${apiUrl}/attendance/admin/manual-correction, {
                         method: 'POST',
                         headers: { 'Authorization': Bearer , 'Content-Type': 'application/json' },
                         body: JSON.stringify({
                             employeeId: manualEmployeeId,
                             date: manualDate,
                             status: manualStatus,
                             clockInTime: manualClockIn,
                             clockOutTime: manualClockOut,
                             startTime: manualStartTime,
                             endTime: manualEndTime,
                             reason: manualAdminRemarks,
                             adminRemarks: manualAdminRemarks
                         })
                     });
                     
                     const data = await res.json();
                     if (data.success) {
                         alert('Attendance updated successfully');
                         setManualCorrectionModalOpen(false);
                         fetchAdminAttendance();
                         fetchNotLoggedIn();
                     } else {
                         alert(data.message || 'Error updating attendance');
                     }
                 } catch (err) {
                     alert('Failed to update attendance');
                 }
              }}>Update</Button>
            </div>
         </div>
      </Modal>'''

new_modal = '''      {/* Manual Correction Modal */}
      <Modal isOpen={manualCorrectionModalOpen} onClose={() => setManualCorrectionModalOpen(false)} title="Edit Attendance">
         <div className="space-y-4">
            <div className="bg-gray-50 p-3 rounded-lg border border-gray-100 mb-2">
               <div className="text-sm font-semibold text-[var(--color-text-primary)]">Date: {moment(manualDate).format('DD/MM/YYYY')}</div>
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1">Status</label>
              <select 
                value={manualStatus}
                onChange={(e) => setManualStatus(e.target.value)}
                className="w-full px-3 py-2 border border-[var(--color-border-subtle)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] bg-[var(--color-surface)] text-[var(--color-text-primary)]"
              >
                <option value="PRESENT">Present</option>
                <option value="LATE">Late</option>
                <option value="ABSENT">Absent</option>
                <option value="LEAVE">Leave</option>
                <option value="PERMISSION">Permission</option>
              </select>
            </div>

            {(manualStatus === 'PRESENT' || manualStatus === 'LATE') && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1">Login Time</label>
                  <input
                    type="time"
                    value={manualClockIn}
                    onChange={(e) => setManualClockIn(e.target.value)}
                    className="w-full px-3 py-2 border border-[var(--color-border-subtle)] rounded-lg bg-[var(--color-surface)] text-[var(--color-text-primary)]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1">Logout Time</label>
                  <input
                    type="time"
                    value={manualClockOut}
                    onChange={(e) => setManualClockOut(e.target.value)}
                    className="w-full px-3 py-2 border border-[var(--color-border-subtle)] rounded-lg bg-[var(--color-surface)] text-[var(--color-text-primary)]"
                  />
                </div>
              </div>
            )}

            {manualStatus === 'PERMISSION' && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1">Start Time</label>
                  <input
                    type="time"
                    value={manualStartTime}
                    onChange={(e) => setManualStartTime(e.target.value)}
                    className="w-full px-3 py-2 border border-[var(--color-border-subtle)] rounded-lg bg-[var(--color-surface)] text-[var(--color-text-primary)]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1">End Time</label>
                  <input
                    type="time"
                    value={manualEndTime}
                    onChange={(e) => setManualEndTime(e.target.value)}
                    className="w-full px-3 py-2 border border-[var(--color-border-subtle)] rounded-lg bg-[var(--color-surface)] text-[var(--color-text-primary)]"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1">Admin Remarks (Optional)</label>
              <textarea 
                value={manualAdminRemarks}
                onChange={(e) => setManualAdminRemarks(e.target.value)}
                placeholder="Reason for manual update"
                className="w-full px-3 py-2 border border-[var(--color-border-subtle)] rounded-lg h-24 resize-none bg-[var(--color-surface)] text-[var(--color-text-primary)]"
              ></textarea>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <Button variant="outline" onClick={() => setManualCorrectionModalOpen(false)}>Cancel</Button>
              <Button onClick={async () => {
                 try {
                     if (!manualStatus) return alert('Status is required');
                     if (manualStatus === 'PERMISSION' && (!manualStartTime || !manualEndTime)) return alert('Start and End time are required for permission');
                     if ((manualStatus === 'PRESENT' || manualStatus === 'LATE') && !manualClockIn) return alert('Login time is required for Present/Late');
                     if ((manualStatus === 'PRESENT' || manualStatus === 'LATE') && manualClockIn && manualClockOut && manualClockOut < manualClockIn) {
                         return alert('Logout time must be after login time.');
                     }

                     const token = (useAuthStore.getState().token || localStorage.getItem('token')) || '';
                     const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';
                     
                     const res = await fetch(${apiUrl}/attendance/admin/manual-correction, {
                         method: 'POST',
                         headers: { 'Authorization': Bearer , 'Content-Type': 'application/json' },
                         body: JSON.stringify({
                             employeeId: manualEmployeeId,
                             date: manualDate,
                             status: manualStatus,
                             clockInTime: manualClockIn,
                             clockOutTime: manualClockOut,
                             startTime: manualStartTime,
                             endTime: manualEndTime,
                             reason: manualAdminRemarks,
                             adminRemarks: manualAdminRemarks
                         })
                     });
                     
                     const data = await res.json();
                     if (data.success) {
                         setManualCorrectionModalOpen(false);
                         fetchAdminAttendance();
                         fetchNotLoggedIn();
                     } else {
                         alert(data.message || 'Error updating attendance');
                     }
                 } catch (err) {
                     alert('Failed to update attendance');
                 }
              }}>Save Changes</Button>
            </div>
         </div>
      </Modal>'''

content = content.replace(old_modal, new_modal)

# 4. Remove editAttendanceModalOpen JSX
import re
content = re.sub(r'\s*<Modal isOpen=\{editAttendanceModalOpen\}.*?</Modal>', '', content, flags=re.DOTALL)

with open('frontend/src/pages/AttendanceManagement.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
