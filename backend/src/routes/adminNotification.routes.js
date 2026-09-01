const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notification.controller');
const { protect, authorize } = require('../middlewares/auth');

// Admin routes for notifications
router.use(protect, authorize('ADMIN'));

router.get('/', notificationController.getAdminNotifications);
router.post('/', notificationController.sendAdminNotification);

module.exports = router;
