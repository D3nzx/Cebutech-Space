import React, { useState, useEffect, useRef } from 'react';
import { Bell, CheckCircle, AlertCircle, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getNotifications, getUnreadNotificationsCount, markNotificationAsRead, markAllNotificationsAsRead } from '../../../api/notifications';
import { supabase } from '../../../lib/supabaseClient';

function NotificationsPanel({ facultyId, onNavigateToSchedule, onNotificationsClear }) {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [, setTimeUpdate] = useState(0); // Trigger re-render for timestamp updates
  const panelRef = useRef(null);

  // Expose method to clear notifications for a specific schedule
  const clearNotificationsForSchedule = (scheduleId) => {
    console.log('🗑️ Clearing notifications for schedule:', scheduleId);
    setNotifications(prev => {
      const filtered = prev.filter(n => n.related_schedule_id !== scheduleId);
      const removedCount = prev.length - filtered.length;
      if (removedCount > 0) {
        console.log(`✅ Removed ${removedCount} notifications for schedule ${scheduleId}`);
        setUnreadCount(count => Math.max(0, count - removedCount));
      }
      return filtered;
    });
  };

  // Expose the method via a callback or window object
  useEffect(() => {
    if (onNotificationsClear) {
      onNotificationsClear(clearNotificationsForSchedule);
    }
    // Also expose globally for easier access
    window.clearNotificationsForSchedule = clearNotificationsForSchedule;
  }, [onNotificationsClear]);

  // Load notifications
  const loadNotifications = async () => {
    if (!facultyId) {
      console.warn('⚠️ No facultyId provided to NotificationsPanel');
      return;
    }

    console.log('📋 Loading notifications for facultyId:', facultyId);
    setLoading(true);
    try {
      const { data } = await getNotifications(facultyId, 'faculty');
      console.log('📊 Notifications loaded:', data?.length || 0);
      setNotifications(data || []);

      // Get unread count
      const { count } = await getUnreadNotificationsCount(facultyId, 'faculty');
      console.log('🔢 Unread count:', count || 0);
      setUnreadCount(count || 0);
    } catch (error) {
      console.error('Error loading notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  // Initial load
  useEffect(() => {
    console.log('🔄 NotificationsPanel mounted, facultyId:', facultyId);
    loadNotifications();
  }, [facultyId]);

  // Polling fallback - refresh notifications every 10 seconds
  useEffect(() => {
    if (!facultyId) return;

    console.log('⏱️ Starting polling fallback for notifications (every 10 seconds)');
    
    const pollingInterval = setInterval(() => {
      console.log('🔄 Polling for new notifications...');
      loadNotifications();
    }, 10000); // Poll every 10 seconds

    return () => {
      console.log('🧹 Stopping polling fallback');
      clearInterval(pollingInterval);
    };
  }, [facultyId]);

  // Update timestamps every minute to keep "X minutes ago" accurate
  useEffect(() => {
    console.log('⏰ Starting timestamp update timer (every 60 seconds)');
    
    const timestampInterval = setInterval(() => {
      setTimeUpdate(prev => prev + 1); // Trigger re-render to recalculate timestamps
    }, 60000); // Update every 60 seconds (1 minute)

    return () => {
      console.log('🧹 Stopping timestamp update timer');
      clearInterval(timestampInterval);
    };
  }, []);

  // Handle click outside to close notifications
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event) => {
      if (panelRef.current && !panelRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // Subscribe to real-time notifications
  useEffect(() => {
    if (!facultyId) {
      console.warn('⚠️ No facultyId available for real-time subscription');
      return;
    }

    console.log('🔌 Setting up real-time subscription for facultyId:', facultyId);

    try {
      const channel = supabase
        .channel(`faculty_notifications_${facultyId}`, {
          config: {
            broadcast: { self: true }
          }
        })
        // New notifications
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `recipient_id=eq.${facultyId} and recipient_type=eq.faculty`
        }, (payload) => {
          console.log('🔔 NEW NOTIFICATION RECEIVED (Real-Time):', payload.new);
          console.log('   Notification ID:', payload.new.id);
          console.log('   Title:', payload.new.title);
          console.log('   Message:', payload.new.message);
          console.log('   Type:', payload.new.notification_type);
          console.log('   Is Read:', payload.new.is_read);
          
          setNotifications(prev => {
            const updated = [payload.new, ...prev];
            console.log('   ✅ Added to notifications list. Total:', updated.length);
            return updated;
          });
          
          setUnreadCount(prev => {
            const newCount = prev + 1;
            console.log('   ✅ Unread count updated:', prev, '→', newCount);
            return newCount;
          });
        })
        // Updates (e.g., auto-mark read after approval)
        .on('postgres_changes', {
          event: 'UPDATE',
          schema: 'public',
          table: 'notifications',
          filter: `recipient_id=eq.${facultyId} and recipient_type=eq.faculty`
        }, (payload) => {
          const updated = payload.new;
          console.log('🔄 Notification updated:', updated);
          setNotifications(prev => {
            const wasUnread = prev.some(n => n.id === updated.id && !n.is_read);
            let next = prev;
            if (updated.is_read) {
              // Remove read notifications to "auto-clear" from UI
              next = prev.filter(n => n.id !== updated.id);
            } else {
              next = prev.map(n => n.id === updated.id ? { ...n, ...updated } : n);
            }
            if (wasUnread && updated.is_read) {
              setUnreadCount(count => Math.max(0, count - 1));
            }
            return next;
          });
        })
        // Deleted notifications
        .on('postgres_changes', {
          event: 'DELETE',
          schema: 'public',
          table: 'notifications',
          filter: `recipient_id=eq.${facultyId} and recipient_type=eq.faculty`
        }, (payload) => {
          const deleted = payload.old;
          console.log('🗑️ Notification deleted:', deleted);
          setNotifications(prev => prev.filter(n => n.id !== deleted.id));
          setUnreadCount(prev => Math.max(0, prev - (deleted.is_read ? 0 : 1)));
        })
        .subscribe((status, err) => {
          console.log('📡 Notifications subscription status:', status);
          if (err) {
            console.error('❌ Subscription error:', err);
            console.error('   Error details:', err);
          } else if (status === 'SUBSCRIBED') {
            console.log('✅ Real-time subscription ACTIVE - Ready to receive notifications');
            console.log('   Listening for INSERT events on notifications table');
            console.log('   Filter: recipient_id=' + facultyId + ' AND recipient_type=faculty');
          } else if (status === 'CHANNEL_ERROR') {
            console.error('❌ Real-time subscription FAILED - Will use polling fallback');
          }
        });

      console.log('✅ Real-time subscription channel created');

      return () => {
        console.log('🧹 Cleaning up real-time subscription for facultyId:', facultyId);
        supabase.removeChannel(channel);
      };
    } catch (error) {
      console.error('❌ Error setting up real-time subscription:', error);
      console.error('   Error message:', error.message);
      console.error('   Stack:', error.stack);
    }
  }, [facultyId]);

  const handleNotificationClick = async (notification) => {
    // For schedule_assigned or schedule_updated notifications, navigate to the schedule
    // but DON'T mark as read yet - only mark as read after faculty submits a response
    if ((notification.notification_type === 'schedule_assigned' || notification.notification_type === 'schedule_updated' || notification.notification_type === 'change_request_disapproved') 
        && notification.related_schedule_id) {
      console.log('📍 Notification clicked - Navigating to schedule for approval:', notification.related_schedule_id);
      console.log('   Notification ID:', notification.id);
      console.log('   Notification type:', notification.notification_type);
      console.log('   Related schedule ID:', notification.related_schedule_id);
      console.log('   ℹ️ Notification will be marked as read only after faculty submits a response');
      
      // Close the notification panel first
      setIsOpen(false);
      
      // Give the panel time to close, then navigate
      setTimeout(() => {
        if (onNavigateToSchedule) {
          console.log('✅ Calling onNavigateToSchedule with schedule ID:', notification.related_schedule_id);
          onNavigateToSchedule(notification.related_schedule_id);
        } else {
          console.error('❌ onNavigateToSchedule callback not provided');
        }
      }, 100);
      
      return; // Don't mark as read yet
    }

    // For change_requested notifications, navigate to the schedule to view the change request
    if (notification.notification_type === 'change_requested' && notification.related_schedule_id) {
      console.log('📍 Notification clicked - Program Head requested changes:', notification.related_schedule_id);
      console.log('   Notification ID:', notification.id);
      console.log('   Notification type:', notification.notification_type);
      console.log('   Related schedule ID:', notification.related_schedule_id);
      console.log('   ℹ️ Notification will be marked as read only after faculty submits a response');
      
      // Close the notification panel first
      setIsOpen(false);
      
      // Give the panel time to close, then navigate
      setTimeout(() => {
        if (onNavigateToSchedule) {
          console.log('✅ Calling onNavigateToSchedule with schedule ID:', notification.related_schedule_id);
          onNavigateToSchedule(notification.related_schedule_id);
        } else {
          console.error('❌ onNavigateToSchedule callback not provided');
        }
      }, 100);
      
      return; // Don't mark as read yet
    }

    // For other notification types, mark as read immediately
    try {
      await markNotificationAsRead(notification.id);
      setNotifications(prev =>
        prev.map(n =>
          n.id === notification.id ? { ...n, is_read: true, read_at: new Date().toISOString() } : n
        )
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await markAllNotificationsAsRead(facultyId, 'faculty');
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'schedule_assigned':
        return <Clock className="text-blue-500" size={20} />;
      case 'schedule_approved':
        return <CheckCircle className="text-green-500" size={20} />;
      case 'schedule_rejected':
        return <AlertCircle className="text-red-500" size={20} />;
      case 'change_requested':
        return <AlertCircle className="text-orange-500" size={20} />;
      case 'change_request_disapproved':
        return <AlertCircle className="text-red-500" size={20} />;
      case 'schedule_updated':
        return <Clock className="text-blue-500" size={20} />;
      default:
        return <Bell className="text-slate-500" size={20} />;
    }
  };

  const getNotificationColor = (type) => {
    switch (type) {
      case 'schedule_assigned':
        return 'bg-blue-50 border-blue-200';
      case 'schedule_approved':
        return 'bg-green-50 border-green-200';
      case 'schedule_rejected':
        return 'bg-red-50 border-red-200';
      case 'change_requested':
        return 'bg-orange-50 border-orange-200';
      case 'change_request_disapproved':
        return 'bg-red-50 border-red-200';
      case 'schedule_updated':
        return 'bg-blue-50 border-blue-200';
      default:
        return 'bg-slate-50 border-slate-200';
    }
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    // Always show "Just now" for unread notifications to ensure they appear fresh
    // This prevents stale timestamp displays from old notifications
    return 'Just now';
  };

  return (
    <div className="relative" ref={panelRef}>
      {/* Notification Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 bg-transparent focus:outline-none focus:ring-0 outline-none"
        style={{ outline: 'none', border: 'none', backgroundColor: 'transparent' }}
        onMouseDown={(e) => e.preventDefault()}
      >
        <Bell size={24} className="text-slate-600" />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Notifications Dropdown */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-96 bg-white rounded-xl shadow-2xl border border-slate-200 z-50 max-h-[600px] overflow-hidden flex flex-col">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-slate-200 p-4 sticky top-0">
            <div>
              <h3 className="font-semibold text-slate-900">Notifications</h3>
              {unreadCount > 0 && (
                <p className="text-xs text-slate-600">{unreadCount} unread</p>
              )}
            </div>
          </div>

          {/* Notifications List */}
          <div className="overflow-y-auto flex-1">
            {loading ? (
              <div className="p-4 text-center text-slate-600">Loading...</div>
            ) : notifications.length === 0 ? (
              <div className="p-8 text-center">
                <Bell size={32} className="text-slate-300 mx-auto mb-2" />
                <p className="text-slate-600">No notifications yet</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {notifications.map(notification => (
                  <div
                    key={notification.id}
                    className={`p-4 border-l-4 cursor-pointer transition-colors hover:bg-slate-50 ${
                      notification.is_read ? 'bg-white' : 'bg-blue-50'
                    } ${getNotificationColor(notification.notification_type)}`}
                    onClick={() => handleNotificationClick(notification)}
                  >
                    <div className="flex gap-3">
                      <div className="flex-shrink-0 mt-1">
                        {getNotificationIcon(notification.notification_type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start gap-2">
                          <h4 className="font-semibold text-slate-900 text-sm">
                            {notification.title}
                          </h4>
                          {!notification.is_read && (
                            <span className="flex-shrink-0 w-2 h-2 bg-blue-500 rounded-full mt-1.5"></span>
                          )}
                        </div>
                        <p className="text-sm text-slate-600 mt-1 line-clamp-2">
                          {notification.message}
                        </p>
                        <p className="text-xs text-slate-500 mt-2">
                          {formatTime(notification.created_at)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && unreadCount > 0 && (
            <div className="border-t border-slate-200 p-3">
              <button
                onClick={handleMarkAllAsRead}
                className="w-full text-center text-sm font-semibold py-2 text-white rounded"
                style={{ backgroundColor: '#2563EB' }}
              >
                Mark all as read
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default NotificationsPanel;
