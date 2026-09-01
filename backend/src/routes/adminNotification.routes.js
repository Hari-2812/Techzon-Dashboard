const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notification.controller');
const { auth, checkRole } = require('../middlewares/auth');

// Admin routes for notifications
router.use(auth, checkRole('ADMIN'));

router.get('/', notificationController.getAdminNotifications);
router.post('/', notificationController.sendAdminNotification);

module.exports = router;
