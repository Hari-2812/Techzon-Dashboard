import React, { useState, useRef, useEffect } from 'react';
import { Bell, Check, Trash2, ArrowRight } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import moment from 'moment';
import { getNotifications, getUnreadCount, markAsRead, markAllAsRead } from '../../api/notifications';

const NotificationBell = () => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const { data: unreadCount = 0 } = useQuery({
    queryKey: ['notifications', 'unread-count'],
    queryFn: getUnreadCount,
    refetchInterval: 60000, // Optional polling fallback
  });

  const { data: notificationsData } = useQuery({
    queryKey: ['notifications', 'dropdown'],
    queryFn: () => getNotifications(1, 5),
    enabled: isOpen,
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

  const handleNotificationClick = (notification: any) => {
    if (!notification.isRead) {
      markReadMutation.mutate(notification._id);
    }
    setIsOpen(false);
    navigate('/notifications');
  };

  const notifications = notificationsData?.data?.notifications || [];

  return (
    <div className="relative" ref={dropdownRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="p-2.5 relative text-gray-500 hover:text-[var(--color-primary)] hover:bg-indigo-50 rounded-xl transition-colors"
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white ring-2 ring-white">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-xl shadow-xl border border-[var(--color-border-subtle)] overflow-hidden z-50">
          <div className="flex items-center justify-between p-4 border-b border-[var(--color-border-subtle)] bg-gray-50/50">
            <h3 className="font-semibold text-gray-800">Notifications</h3>
            {unreadCount > 0 && (
              <button 
                onClick={() => markAllReadMutation.mutate()}
                className="text-xs font-medium text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
              >
                <Check size={14} /> Mark all read
              </button>
            )}
          </div>

          <div className="max-h-[60vh] overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-8 text-center text-gray-500 flex flex-col items-center">
                <Bell size={24} className="text-gray-300 mb-2" />
                <p className="text-sm">You're all caught up!</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {notifications.map((notif: any) => (
                  <div 
                    key={notif._id}
                    onClick={() => handleNotificationClick(notif)}
                    className={`p-4 cursor-pointer hover:bg-gray-50 transition-colors ${!notif.isRead ? 'bg-indigo-50/30' : ''}`}
                  >
                    <div className="flex justify-between items-start mb-1">
                      <h4 className={`text-sm font-medium ${!notif.isRead ? 'text-gray-900' : 'text-gray-700'}`}>
                        {notif.title}
                      </h4>
                      {!notif.isRead && <span className="w-2 h-2 rounded-full bg-indigo-600 mt-1.5 shrink-0"></span>}
                    </div>
                    <p className={`text-xs mb-2 line-clamp-2 ${!notif.isRead ? 'text-gray-700' : 'text-gray-500'}`}>
                      {notif.message}
                    </p>
                    <span className="text-[10px] text-gray-400 font-medium">
                      {moment(notif.createdAt).fromNow()}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <Link 
            to="/notifications" 
            onClick={() => setIsOpen(false)}
            className="block p-3 text-center text-sm text-indigo-600 hover:bg-indigo-50 font-medium border-t border-[var(--color-border-subtle)] transition-colors"
          >
            View all notifications
          </Link>
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
