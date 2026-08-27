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
  adminForceClockOut
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

module.exports = router;
