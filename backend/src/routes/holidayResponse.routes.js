const express = require('express');
const router = express.Router();
const holidayResponseController = require('../controllers/holidayResponse.controller');
const { auth, checkRole } = require('../middlewares/auth');

// Employee Routes
router.post('/', auth, holidayResponseController.submitResponse);
router.get('/my', auth, holidayResponseController.getMyResponses);

// Admin Routes
router.get('/:holidayId', auth, checkRole('ADMIN'), holidayResponseController.getResponsesByHoliday);
router.put('/:id/review', auth, checkRole('ADMIN'), holidayResponseController.reviewResponse);
router.post('/remind', auth, checkRole('ADMIN'), holidayResponseController.remindPending);

module.exports = router;
