import api from '../services/api';

export interface Notification {
  _id: string;
  title: string;
  message: string;
  type: string;
  priority: string;
  isRead: boolean;
  createdAt: string;
  senderId?: {
    name: string;
    role: string;
  };
}

export const getNotifications = async (page = 1, limit = 20) => {
  const response = await api.get(`/notifications?page=${page}&limit=${limit}`);
  return response.data;
};

export const getUnreadCount = async () => {
  const response = await api.get('/notifications/unread-count');
  return response.data.data.count;
};

export const markAsRead = async (id: string) => {
  const response = await api.put(`/notifications/${id}/read`);
  return response.data;
};

export const markAllAsRead = async () => {
  const response = await api.put('/notifications/read-all');
  return response.data;
};

// Admin Endpoints
export const getAdminNotifications = async (page = 1, limit = 20, type?: string, recipientId?: string) => {
  const params = new URLSearchParams();
  params.append('page', page.toString());
  params.append('limit', limit.toString());
  if (type) params.append('type', type);
  if (recipientId) params.append('recipientId', recipientId);
  
  const response = await api.get(`/admin/notifications?${params.toString()}`);
  return response.data;
};

export const sendAdminNotification = async (data: { recipientIds: string[], title: string, message: string, type: string, priority: string }) => {
  const response = await api.post('/admin/notifications', data);
  return response.data;
};
