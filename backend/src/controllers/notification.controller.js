const NotificationService = require('../services/notification.service');

exports.getNotifications = async (req, res) => {
  try {
    const { page, limit } = req.query;
    const result = await NotificationService.getEmployeeNotifications(req.user._id, {
      page: parseInt(page) || 1,
      limit: parseInt(limit) || 20
    });
    return res.status(200).json({ success: true, data: result, message: 'Notifications fetched successfully' });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.getUnreadCount = async (req, res) => {
  try {
    const count = await NotificationService.getUnreadCount(req.user._id);
    return res.status(200).json({ success: true, data: { count }, message: 'Unread count fetched' });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.markAsRead = async (req, res) => {
  try {
    const notification = await NotificationService.markAsRead(req.params.id, req.user._id);
    if (!notification) {
      return res.status(404).json({ success: false, message: 'Notification not found' });
    }
    return res.status(200).json({ success: true, data: notification, message: 'Notification marked as read' });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.markAllAsRead = async (req, res) => {
  try {
    await NotificationService.markAllAsRead(req.user._id);
    return res.status(200).json({ success: true, data: null, message: 'All notifications marked as read' });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.deleteNotification = async (req, res) => {
  try {
    await NotificationService.deleteNotification(req.params.id, req.user._id);
    return res.status(200).json({ success: true, data: null, message: 'Notification deleted' });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.getAdminNotifications = async (req, res) => {
  try {
    const { page, limit, type, recipientId } = req.query;
    const result = await NotificationService.getAdminNotifications({
      page: parseInt(page) || 1,
      limit: parseInt(limit) || 20,
      type,
      recipientId
    });
    return res.status(200).json({ success: true, data: result, message: 'Admin notifications fetched' });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.sendAdminNotification = async (req, res) => {
  try {
    const { recipientIds, title, message, type, priority } = req.body;
    
    if (!title || !message) {
      return res.status(400).json({ success: false, message: 'Title and message are required' });
    }

    const count = await NotificationService.sendBulkNotification({
      recipientIds,
      senderId: req.user._id,
      title,
      message,
      type,
      priority
    });

    return res.status(200).json({ success: true, data: { count }, message: `Notification sent to ${count} users` });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
