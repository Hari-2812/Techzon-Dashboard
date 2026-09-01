const mongoose = require('mongoose');

const NotificationSchema = new mongoose.Schema({
  recipientId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true,
    index: true 
  },
  senderId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User' 
  },
  title: { 
    type: String, 
    required: true 
  },
  message: { 
    type: String, 
    required: true 
  },
  type: {
    type: String,
    enum: ['SYSTEM', 'ATTENDANCE', 'LEAVE', 'PERMISSION', 'LEAD', 'FOLLOW_UP', 'GENERAL'],
    default: 'GENERAL'
  },
  priority: {
    type: String,
    enum: ['LOW', 'NORMAL', 'HIGH'],
    default: 'NORMAL'
  },
  relatedEntityId: { 
    type: mongoose.Schema.Types.ObjectId 
  },
  relatedEntityType: { 
    type: String 
  },
  isRead: { 
    type: Boolean, 
    default: false,
    index: true
  },
  readAt: { 
    type: Date 
  }
}, { timestamps: true });

// Compound index for getting user's notifications sorted by latest
NotificationSchema.index({ recipientId: 1, createdAt: -1 });

module.exports = mongoose.model('Notification', NotificationSchema);
