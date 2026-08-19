const express = require('express');
const router = express.Router();
const followUpController = require('../controllers/followUp.controller');
const { auth } = require('../middlewares/auth');

router.use(auth);

router.get('/', followUpController.getFollowUps);
router.post('/', followUpController.createFollowUp);
router.patch('/:id', followUpController.updateFollowUp);
router.post('/:id/complete', followUpController.completeFollowUp);
router.post('/:id/reschedule', followUpController.rescheduleFollowUp);

module.exports = router;
