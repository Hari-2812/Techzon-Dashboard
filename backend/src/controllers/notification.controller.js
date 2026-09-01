const NotificationService = require('../services/notification.service');
const { successResponse, errorResponse } = require('../utils/response');

exports.getNotifications = async (req, res) => {
  try {
    const { page, limit } = req.query;
    const result = await NotificationService.getEmployeeNotifications(req.user._id, {
      page: parseInt(page) || 1,
      limit: parseInt(limit) || 20
    });
    return successResponse(res, result, 'Notifications fetched successfully');
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

exports.getUnreadCount = async (req, res) => {
  try {
    const count = await NotificationService.getUnreadCount(req.user._id);
    return successResponse(res, { count }, 'Unread count fetched');
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

exports.markAsRead = async (req, res) => {
  try {
    const notification = await NotificationService.markAsRead(req.params.id, req.user._id);
    if (!notification) {
      return errorResponse(res, 'Notification not found', 404);
    }
    return successResponse(res, notification, 'Notification marked as read');
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

exports.markAllAsRead = async (req, res) => {
  try {
    await NotificationService.markAllAsRead(req.user._id);
    return successResponse(res, null, 'All notifications marked as read');
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

exports.deleteNotification = async (req, res) => {
  try {
    await NotificationService.deleteNotification(req.params.id, req.user._id);
    return successResponse(res, null, 'Notification deleted');
  } catch (error) {
    return errorResponse(res, error.message, 500);
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
    return successResponse(res, result, 'Admin notifications fetched');
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

exports.sendAdminNotification = async (req, res) => {
  try {
    const { recipientIds, title, message, type, priority } = req.body;
    
    if (!title || !message) {
      return errorResponse(res, 'Title and message are required', 400);
    }

    const count = await NotificationService.sendBulkNotification({
      recipientIds,
      senderId: req.user._id,
      title,
      message,
      type,
      priority
    });

    return successResponse(res, { count }, `Notification sent to ${count} users`);
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};
