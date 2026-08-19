const express = require('express');
const router = express.Router();
const { auth } = require('../middlewares/auth');
const { getAdminDashboard, getEmployeeDashboard } = require('../controllers/dashboard.controller');

router.use(auth);

router.get('/admin', getAdminDashboard);
router.get('/employee', getEmployeeDashboard);

module.exports = router;
