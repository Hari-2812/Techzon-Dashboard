const express = require('express');
const router = express.Router();
const employeeController = require('../controllers/employee.controller');
const { auth, checkRole } = require('../middlewares/auth');
const upload = require('../utils/upload');

// Employee generic routes
router.get('/', auth, employeeController.getEmployees);
router.get('/:id', auth, employeeController.getEmployeeById);

// Admin only routes
router.post('/', auth, checkRole('ADMIN'), upload.single('profilePhoto'), employeeController.createEmployee);
router.patch('/:id/status', auth, checkRole('ADMIN'), employeeController.updateEmployeeStatus);
router.post('/:id/resend-invitation', auth, checkRole('ADMIN'), employeeController.resendInvitation);

router.put('/:id', auth, checkRole('ADMIN'), upload.single('profilePhoto'), employeeController.updateEmployee);
router.post('/:id/reset-password', auth, checkRole('ADMIN'), employeeController.resetPassword);

module.exports = router;
