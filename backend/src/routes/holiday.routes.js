const express = require('express');
const router = express.Router();
const holidayController = require('../controllers/holiday.controller');
const { auth, checkRole } = require('../middlewares/auth');

// Public/Employee Routes
router.get('/upcoming', auth, holidayController.getUpcomingHolidays);
router.get('/tomorrow', auth, holidayController.getTomorrowHoliday);

// Admin Routes
router.get('/', auth, checkRole('ADMIN'), holidayController.getHolidays);
router.post('/', auth, checkRole('ADMIN'), holidayController.createHoliday);
router.put('/:id', auth, checkRole('ADMIN'), holidayController.updateHoliday);
router.delete('/:id', auth, checkRole('ADMIN'), holidayController.deleteHoliday);

module.exports = router;
