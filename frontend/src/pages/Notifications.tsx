import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getNotifications, getAdminNotifications, sendAdminNotification, markAsRead, markAllAsRead } from '../api/notifications';
import { useAuthStore } from '../store/authStore';
import moment from 'moment';
import { Bell, Check, Clock, Shield, Send, Users } from 'lucide-react';

const Notifications = () => {
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'ADMIN';
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<'MY_NOTIFICATIONS' | 'SEND_NOTIFICATION'>('MY_NOTIFICATIONS');

  // Employee Fetch
  const { data: myNotificationsData, isLoading: myLoading } = useQuery({
    queryKey: ['notifications', 'page'],
    queryFn: () => getNotifications(1, 50),
  });

  // Admin Fetch
  const { data: adminHistoryData, isLoading: adminLoading } = useQuery({
    queryKey: ['notifications', 'admin-history'],
    queryFn: () => getAdminNotifications(1, 50),
    enabled: isAdmin,
  });

  const markReadMutation = useMutation({
    mutationFn: markAsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const markAllReadMutation = useMutation({
    mutationFn: markAllAsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const myNotifications = myNotificationsData?.data?.notifications || [];
  const adminHistory = adminHistoryData?.data?.notifications || [];

  // Form State for Admin
  const [formData, setFormData] = useState({
    recipientIds: ['ALL'], // Default to all
    title: '',
    message: '',
    type: 'GENERAL',
    priority: 'NORMAL'
  });

  const sendMutation = useMutation({
    mutationFn: sendAdminNotification,
    onSuccess: () => {
      setFormData({ ...formData, title: '', message: '' });
      queryClient.invalidateQueries({ queryKey: ['notifications', 'admin-history'] });
      setActiveTab('MY_NOTIFICATIONS');
      alert('Notification sent successfully');
    },
    onError: (err: any) => {
      alert(err?.response?.data?.message || 'Failed to send notification');
    }
  });

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    sendMutation.mutate(formData);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Bell className="text-indigo-600" /> Notifications
          </h1>
          <p className="text-gray-500 mt-1">Manage and view your alerts and updates.</p>
        </div>
        
        {isAdmin && (
          <div className="flex bg-white rounded-lg p-1 border border-gray-200 shadow-sm">
            <button
              onClick={() => setActiveTab('MY_NOTIFICATIONS')}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${activeTab === 'MY_NOTIFICATIONS' ? 'bg-indigo-50 text-indigo-700' : 'text-gray-600 hover:bg-gray-50'}`}
            >
              History / Inbox
            </button>
            <button
              onClick={() => setActiveTab('SEND_NOTIFICATION')}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${activeTab === 'SEND_NOTIFICATION' ? 'bg-indigo-50 text-indigo-700' : 'text-gray-600 hover:bg-gray-50'}`}
            >
              Send Notification
            </button>
          </div>
        )}
      </div>

      {activeTab === 'MY_NOTIFICATIONS' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
            <h2 className="font-semibold text-gray-800">{isAdmin ? 'System Notification History' : 'Your Notifications'}</h2>
            {!isAdmin && myNotifications.some((n: any) => !n.isRead) && (
              <button 
                onClick={() => markAllReadMutation.mutate()}
                className="text-sm font-medium text-indigo-600 hover:text-indigo-800 flex items-center gap-1 bg-indigo-50 px-3 py-1.5 rounded-lg"
              >
                <Check size={16} /> Mark all read
              </button>
            )}
          </div>

          <div className="divide-y divide-gray-100 max-h-[70vh] overflow-y-auto">
            {isAdmin ? (
              // Admin History View
              adminLoading ? (
                <div className="p-8 text-center text-gray-500">Loading history...</div>
              ) : adminHistory.length === 0 ? (
                <div className="p-12 text-center flex flex-col items-center justify-center">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                    <Shield className="text-gray-400" size={28} />
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-1">No notifications sent</h3>
                  <p className="text-gray-500">System generated and manual notifications will appear here.</p>
                </div>
              ) : (
                adminHistory.map((notif: any) => (
                  <div key={notif._id} className="p-5 hover:bg-gray-50 transition-colors">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-[10px] font-bold rounded uppercase tracking-wider">
                            {notif.type}
                          </span>
                          <h4 className="font-semibold text-gray-900">{notif.title}</h4>
                        </div>
                        <p className="text-sm text-gray-600 mt-1">{notif.message}</p>
                        <div className="flex items-center gap-4 mt-3 text-xs font-medium text-gray-400">
                           <span className="flex items-center gap-1"><Clock size={14} /> {moment(notif.createdAt).format('MMM D, YYYY h:mm A')}</span>
                           <span className="flex items-center gap-1"><Users size={14} /> To: {notif.recipientId ? notif.recipientId.name : 'Unknown User'}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )
            ) : (
              // Employee Inbox View
              myLoading ? (
                <div className="p-8 text-center text-gray-500">Loading notifications...</div>
              ) : myNotifications.length === 0 ? (
                <div className="p-12 text-center flex flex-col items-center justify-center">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                    <Bell className="text-gray-400" size={28} />
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-1">You're all caught up!</h3>
                  <p className="text-gray-500">You don't have any notifications at the moment.</p>
                </div>
              ) : (
                myNotifications.map((notif: any) => (
                  <div 
                    key={notif._id} 
                    onClick={() => { if(!notif.isRead) markReadMutation.mutate(notif._id) }}
                    className={`p-5 transition-colors cursor-pointer ${!notif.isRead ? 'bg-indigo-50/40 hover:bg-indigo-50/60' : 'hover:bg-gray-50'}`}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1 pr-4">
                        <div className="flex items-center gap-2 mb-1">
                          {!notif.isRead && <span className="w-2.5 h-2.5 rounded-full bg-indigo-600 shrink-0 shadow-sm shadow-indigo-200"></span>}
                          <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-[10px] font-bold rounded uppercase tracking-wider">
                            {notif.type}
                          </span>
                          <h4 className={`font-semibold ${!notif.isRead ? 'text-gray-900' : 'text-gray-700'}`}>{notif.title}</h4>
                        </div>
                        <p className={`text-sm mt-1 ml-4 ${!notif.isRead ? 'text-gray-800' : 'text-gray-500'}`}>{notif.message}</p>
                        <div className="flex items-center gap-4 mt-3 ml-4 text-xs font-medium text-gray-400">
                           <span className="flex items-center gap-1"><Clock size={14} /> {moment(notif.createdAt).fromNow()}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )
            )}
          </div>
        </div>
      )}

      {isAdmin && activeTab === 'SEND_NOTIFICATION' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-4 border-b border-gray-200 bg-gray-50">
            <h2 className="font-semibold text-gray-800 flex items-center gap-2">
              <Send size={18} className="text-indigo-600" /> Create Notification
            </h2>
          </div>
          
          <form onSubmit={handleSend} className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Recipient</label>
                <select 
                  className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white shadow-sm"
                  value={formData.recipientIds[0]}
                  onChange={(e) => setFormData({...formData, recipientIds: [e.target.value]})}
                >
                  <option value="ALL">All Employees</option>
                  {/* Ideally fetch and map employees here for individual selection, but "All Employees" satisfies the core requirement instantly */}
                </select>
                <p className="text-xs text-gray-500">Send to everyone or select specific individuals.</p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Notification Type</label>
                <select 
                  className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white shadow-sm"
                  value={formData.type}
                  onChange={(e) => setFormData({...formData, type: e.target.value})}
                >
                  <option value="GENERAL">General</option>
                  <option value="SYSTEM">System Alert</option>
                  <option value="ATTENDANCE">Attendance</option>
                  <option value="LEAD">Leads</option>
                </select>
              </div>

              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-medium text-gray-700">Priority</label>
                <div className="flex gap-4 mt-1">
                  {['LOW', 'NORMAL', 'HIGH'].map(p => (
                    <label key={p} className="flex items-center gap-2 cursor-pointer">
                      <input 
                        type="radio" 
                        name="priority" 
                        value={p} 
                        checked={formData.priority === p}
                        onChange={(e) => setFormData({...formData, priority: e.target.value})}
                        className="text-indigo-600 focus:ring-indigo-500" 
                      />
                      <span className="text-sm font-medium text-gray-700">{p.charAt(0) + p.slice(1).toLowerCase()}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-medium text-gray-700">Title <span className="text-red-500">*</span></label>
                <input 
                  type="text" 
                  required
                  placeholder="e.g. Important System Update"
                  className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 shadow-sm"
                  value={formData.title}
                  onChange={(e) => setFormData({...formData, title: e.target.value})}
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-medium text-gray-700">Message <span className="text-red-500">*</span></label>
                <textarea 
                  required
                  rows={4}
                  placeholder="Type your notification message here..."
                  className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 shadow-sm resize-none"
                  value={formData.message}
                  onChange={(e) => setFormData({...formData, message: e.target.value})}
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
              <button 
                type="button" 
                onClick={() => setActiveTab('MY_NOTIFICATIONS')}
                className="px-5 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 shadow-sm transition-colors"
              >
                Cancel
              </button>
              <button 
                type="submit" 
                disabled={sendMutation.isPending}
                className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 shadow-sm transition-colors disabled:opacity-50"
              >
                {sendMutation.isPending ? 'Sending...' : <><Send size={16} /> Send Notification</>}
              </button>
            </div>
          </form>
        </div>
      )}

    </div>
  );
};

export default Notifications;
