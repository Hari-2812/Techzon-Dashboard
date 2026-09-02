const express = require('express');
const router = express.Router();
const performanceController = require('../controllers/performance.controller');
const { auth, checkRole } = require('../middlewares/auth');

router.use(auth);

router.get('/', performanceController.getPerformance);
router.get('/attendance/my', performanceController.getMyAttendancePerformance);
router.get('/attendance/admin/:employeeId', checkRole('ADMIN'), performanceController.getAdminAttendancePerformance);

module.exports = router;
