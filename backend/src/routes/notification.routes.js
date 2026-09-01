const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notification.controller');
const { auth } = require('../middlewares/auth');

// Apply protection to all notification routes
router.use(auth);

// Employee routes
router.get('/', notificationController.getNotifications);
router.get('/unread-count', notificationController.getUnreadCount);
router.put('/read-all', notificationController.markAllAsRead);
router.put('/:id/read', notificationController.markAsRead);
router.delete('/:id', notificationController.deleteNotification);

module.exports = router;
