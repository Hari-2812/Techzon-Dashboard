const Notification = require('../models/Notification');
const User = require('../models/User');
const { io } = require('../server');

class NotificationService {
  /**
   * Create a new notification
   */
  static async createNotification({ recipientId, senderId, title, message, type = 'GENERAL', priority = 'NORMAL', relatedEntityId, relatedEntityType }) {
    try {
      const notification = new Notification({
        recipientId,
        senderId,
        title,
        message,
        type,
        priority,
        relatedEntityId,
        relatedEntityType
      });
      await notification.save();

      // Ensure the io instance is globally set on app or via requiring server
      const appIo = require('../server').io || require('../app').get('io');
      
      if (appIo) {
        // We emit to the specific user's room. We'll ensure users join their own ID room on socket connection.
        appIo.to(recipientId.toString()).emit('notification:new', notification);
      }

      return notification;
    } catch (error) {
      console.error('Error creating notification:', error);
      throw error;
    }
  }

  /**
   * Get notifications for a specific employee
   */
  static async getEmployeeNotifications(recipientId, { page = 1, limit = 20 }) {
    const skip = (page - 1) * limit;
    
    const [notifications, total] = await Promise.all([
      Notification.find({ recipientId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('senderId', 'name role'),
      Notification.countDocuments({ recipientId })
    ]);

    return { notifications, total, page, limit };
  }

  /**
   * Get unread count
   */
  static async getUnreadCount(recipientId) {
    return await Notification.countDocuments({ recipientId, isRead: false });
  }

  /**
   * Mark notification as read
   */
  static async markAsRead(notificationId, recipientId) {
    const notification = await Notification.findOneAndUpdate(
      { _id: notificationId, recipientId },
      { isRead: true, readAt: new Date() },
      { new: true }
    );
    return notification;
  }

  /**
   * Mark all as read
   */
  static async markAllAsRead(recipientId) {
    await Notification.updateMany(
      { recipientId, isRead: false },
      { isRead: true, readAt: new Date() }
    );
    return true;
  }

  /**
   * Delete notification
   */
  static async deleteNotification(notificationId, recipientId) {
    await Notification.findOneAndDelete({ _id: notificationId, recipientId });
    return true;
  }

  /**
   * Admin: Get all system notifications
   */
  static async getAdminNotifications({ page = 1, limit = 20, type, recipientId }) {
    const skip = (page - 1) * limit;
    
    const query = {};
    if (type) query.type = type;
    if (recipientId) query.recipientId = recipientId;

    const [notifications, total] = await Promise.all([
      Notification.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('recipientId', 'name role department')
        .populate('senderId', 'name role'),
      Notification.countDocuments(query)
    ]);

    return { notifications, total, page, limit };
  }

  /**
   * Admin: Send notification to all employees or specific employees
   */
  static async sendBulkNotification({ recipientIds = [], senderId, title, message, type = 'GENERAL', priority = 'NORMAL' }) {
    let finalRecipients = recipientIds;
    
    // If empty or "ALL" logic is needed, we resolve all active employees
    if (!recipientIds || recipientIds.length === 0 || recipientIds[0] === 'ALL') {
      const allEmployees = await User.find({ status: 'ACTIVE' }).select('_id');
      finalRecipients = allEmployees.map(e => e._id.toString());
    }

    const notifications = finalRecipients.map(id => ({
      recipientId: id,
      senderId,
      title,
      message,
      type,
      priority
    }));

    await Notification.insertMany(notifications);

    const appIo = require('../server').io || require('../app').get('io');
    if (appIo) {
      finalRecipients.forEach(id => {
        // Emit a generic refresh to those users
        appIo.to(id.toString()).emit('notification:refresh');
      });
    }

    return notifications.length;
  }
}

module.exports = NotificationService;
