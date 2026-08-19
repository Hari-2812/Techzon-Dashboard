const express = require('express');
const router = express.Router();
const { auth, checkRole } = require('../middlewares/auth');
const { getTodayAdminAttendance, getEmployeeAttendanceDetail } = require('../controllers/admin-attendance.controller');

// Only Admins can access these routes
router.use(auth, checkRole('ADMIN'));

router.get('/today', getTodayAdminAttendance);
router.get('/employees/:employeeId', getEmployeeAttendanceDetail);

module.exports = router;
