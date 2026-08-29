const express = require('express');
const router = express.Router();
const { auth } = require('../middlewares/auth');
const { 
  getTodayAttendance, 
  clockIn, 
  clockOut, 
  startBreak, 
  endBreak, 
  getMonthlyAttendance,
  getSettings,
  updateSettings,
  getVerificationLogs,
  adminCorrectAttendance,
  requestCorrection,
  testReset,
  adminForceClockOut,
  adminEditClockOut,
  adminEditAttendance
} = require('../controllers/attendance.controller');

const {
  getPendingRequests,
  getMyPendingRequests,
  approveRequest,
  rejectRequest,
  createManualAttendance
} = require('../controllers/attendanceApproval.controller');

router.get('/today', auth, getTodayAttendance);
router.post('/clock-in', auth, clockIn); // This is now clock-in request
router.post('/clock-out', auth, clockOut); // This is now clock-out request

router.get('/requests/pending', auth, getPendingRequests);
router.get('/requests/my-pending', auth, getMyPendingRequests);
router.post('/requests/:requestId/approve', auth, approveRequest);
router.post('/requests/:requestId/reject', auth, rejectRequest);
router.post('/manual', auth, createManualAttendance);

const {
  submitRequest,
  getMyRequests,
  getAllRequests,
  approveRequest: approveLeaveRequest,
  rejectRequest: rejectLeaveRequest,
  adminCreateLeave
} = require('../controllers/leavePermission.controller');

router.post('/leave-permission', auth, submitRequest);
router.get('/leave-permission/my', auth, getMyRequests);
router.get('/leave-permission/all', auth, getAllRequests); // Admin only conceptually
router.put('/leave-permission/:id/approve', auth, approveLeaveRequest);
router.put('/leave-permission/:id/reject', auth, rejectLeaveRequest);
router.post('/leave-permission/admin', auth, adminCreateLeave);

const { getNotLoggedInEmployees, sendRemindersBulk } = require('../controllers/attendanceReminder.controller');
router.get('/not-logged-in', auth, getNotLoggedInEmployees);
router.post('/send-reminders-bulk', auth, sendRemindersBulk);

router.post('/break/start', auth, startBreak);
router.post('/break/end', auth, endBreak);
router.post('/correction', auth, requestCorrection);
router.get('/monthly', auth, getMonthlyAttendance);
router.get('/settings', auth, getSettings);
router.put('/settings', auth, updateSettings);
router.get('/logs', auth, getVerificationLogs);
router.put('/admin-correct', auth, adminCorrectAttendance);
router.post('/test-reset', auth, testReset);
router.post('/admin/force-clock-out/:employeeId', auth, adminForceClockOut);
router.put('/admin/edit-clock-out/:sessionId', auth, adminEditClockOut); // Keeping for backwards compatibility if needed
router.put('/admin/edit-attendance/:sessionId', auth, adminEditAttendance);

module.exports = router;
