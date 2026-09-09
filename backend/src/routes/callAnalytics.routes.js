const express = require('express');
const router = express.Router();
const { getDashboardAnalytics, getEmployeeCallAnalytics } = require('../controllers/callAnalytics.controller');
const { auth, checkRole } = require('../middlewares/auth');

// Only Admins can view complete employee call analytics
router.get('/dashboard', auth, checkRole('ADMIN'), getDashboardAnalytics);
router.get('/employee/:employeeId', auth, checkRole('ADMIN'), getEmployeeCallAnalytics);

module.exports = router;
