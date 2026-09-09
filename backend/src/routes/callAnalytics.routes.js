const express = require('express');
const router = express.Router();
const { getDashboardAnalytics, getEmployeeCallAnalytics } = require('../controllers/callAnalytics.controller');
const auth = require('../middleware/auth');
const authorize = require('../middleware/authorize');

// Only Admins can view complete employee call analytics
router.get('/dashboard', auth, authorize('Admin'), getDashboardAnalytics);
router.get('/employee/:employeeId', auth, authorize('Admin'), getEmployeeCallAnalytics);

module.exports = router;
