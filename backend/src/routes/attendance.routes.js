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
  requestCorrection
} = require('../controllers/attendance.controller');

router.get('/today', auth, getTodayAttendance);
router.post('/clock-in', auth, clockIn);
router.post('/clock-out', auth, clockOut);
router.post('/break/start', auth, startBreak);
router.post('/break/end', auth, endBreak);
router.post('/correction', auth, requestCorrection);
router.get('/monthly', auth, getMonthlyAttendance);
router.get('/settings', auth, getSettings);
router.post('/test-reset', auth, require('../controllers/attendance.controller').testReset);

module.exports = router;
