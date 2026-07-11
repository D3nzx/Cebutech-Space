import React, { useState, useEffect, useRef } from 'react';
import { Bell, CheckCircle, X, UserPlus, AlertCircle } from 'lucide-react';
import { supabase } from '../../../lib/supabaseClient';
import { getNotifications, getUnreadNotificationsCount, markNotificationAsRead, markAllNotificationsAsRead } from '../../../api/notifications';

function AdminNotificationsPanel({ adminId }) {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState({});
  const [isReviewOpen, setIsReviewOpen] = useState(false);
  const [selectedNotification, setSelectedNotification] = useState(null);
  const [userDetails, setUserDetails] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsError, setDetailsError] = useState('');
  const panelRef = useRef(null);

  const formatNotificationTime = (value) => {
    if (!value) return '';
    const raw = String(value);
    const hasTimezone = /z$|[+-]\d{2}:?\d{2}$/i.test(raw);
    const normalized = hasTimezone
      ? raw
      : raw.includes('T')
        ? `${raw}Z`
        : `${raw.replace(' ', 'T')}Z`;
    const date = new Date(normalized);
    if (Number.isNaN(date.getTime())) return raw;
    return date.toLocaleString();
  };

  const loadNotifications = async () => {
    if (!adminId) return;
    setLoading(true);
    try {
      const { data } = await getNotifications(adminId, 'admin');
      setNotifications(data || []);
      const { count } = await getUnreadNotificationsCount(adminId, 'admin');
      setUnreadCount(count || 0);
    } catch (error) {
      console.error('Error loading notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNotifications();
  }, [adminId]);

  useEffect(() => {
    if (!adminId) return;
    const pollingInterval = setInterval(loadNotifications, 10000);
    return () => clearInterval(pollingInterval);
  }, [adminId]);

  // Real-time notifications subscription
  useEffect(() => {
    if (!adminId) return;
    const channel = supabase
      .channel(`admin_notifications_${adminId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `recipient_id=eq.${adminId} and recipient_type=eq.admin`
      }, (payload) => {
        console.log('🔔 New admin notification received:', payload.new);
        setNotifications(prev => [payload.new, ...prev]);
        setUnreadCount(prev => prev + 1);
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'notifications',
        filter: `recipient_id=eq.${adminId} and recipient_type=eq.admin`
      }, (payload) => {
        setNotifications(prev =>
          prev.map(n => n.id === payload.new.id ? payload.new : n)
        );
        if (payload.new.is_read) {
          setUnreadCount(prev => Math.max(0, prev - 1));
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [adminId]);

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

  const createProfileFromPending = async (pending) => {
    if (!pending?.user_type) {
      return { data: null, error: new Error('Missing pending registration type') };
    }

    switch (pending.user_type) {
      case 'program_head': {
        return supabase
          .from('program_heads')
          .upsert(
            {
              auth_user_id: pending.auth_user_id,
              first_name: pending.first_name,
              last_name: pending.last_name,
              email: pending.email,
              college: pending.college,
              program: pending.program,
              is_active: true,
            },
            { onConflict: 'auth_user_id' }
          );
      }
      case 'faculty': {
        return supabase
          .from('faculty')
          .upsert(
            {
              auth_user_id: pending.auth_user_id,
              first_name: pending.first_name,
              last_name: pending.last_name,
              email: pending.email,
              college: pending.college,
              program: pending.program,
              is_active: true,
            },
            { onConflict: 'auth_user_id' }
          );
      }
      case 'student': {
        return supabase
          .from('students')
          .upsert(
            {
              auth_user_id: pending.auth_user_id,
              first_name: pending.first_name,
              last_name: pending.last_name,
              email: pending.email,
              college: pending.college,
              program: pending.program,
              year_level: pending.year_level,
              section: pending.section,
              is_active: true,
            },
            { onConflict: 'auth_user_id' }
          );
      }
      case 'dean': {
        return supabase
          .from('deans')
          .upsert(
            {
              auth_user_id: pending.auth_user_id,
              first_name: pending.first_name,
              last_name: pending.last_name,
              email: pending.email,
              is_active: true,
            },
            { onConflict: 'auth_user_id' }
          );
      }
      case 'campus_director': {
        return supabase
          .from('campus_directors')
          .upsert(
            {
              auth_user_id: pending.auth_user_id,
              first_name: pending.first_name,
              last_name: pending.last_name,
              email: pending.email,
              is_active: true,
              status: 'approved',
            },
            { onConflict: 'auth_user_id' }
          );
      }
      default:
        return { data: null, error: new Error(`Unknown user type: ${pending.user_type}`) };
    }
  };

  const handleApproveRegistration = async (notification) => {
    if (!notification.related_user_id || !notification.related_user_type) return;
    
    setActionLoading(prev => ({ ...prev, [notification.id]: true }));
    
    try {
      const { data: pending, error: pendingError } = await supabase
        .from('pending_registrations')
        .select('*')
        .eq('id', notification.related_user_id)
        .single();

      if (pendingError || !pending) {
        alert('Unable to load pending registration. Please refresh and try again.');
        return;
      }

      if (pending.status !== 'pending') {
        alert('This registration request has already been processed. Please refresh your notifications.');
        await markNotificationAsRead(notification.id);
        return;
      }

      const { error: createError } = await createProfileFromPending(pending);
      if (createError) {
        alert(`Error approving registration: ${createError.message}`);
        return;
      }

      const { error: approvePendingError } = await supabase
        .from('pending_registrations')
        .update({ status: 'approved' })
        .eq('id', pending.id);

      if (approvePendingError) {
        console.error('Error updating pending registration status:', approvePendingError);
      }
      
      // Mark notification as read
      await markNotificationAsRead(notification.id);
      
      // Update local state
      setNotifications(prev =>
        prev.map(n =>
          n.id === notification.id
            ? { ...n, is_read: true, read_at: new Date().toISOString() }
            : n
        )
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
      
      alert('Registration approved successfully! The user can now log in.');
      setIsReviewOpen(false);
      setSelectedNotification(null);
      setUserDetails(null);
    } catch (error) {
      console.error('Error approving registration:', error);
      alert('Error approving registration. Please try again.');
    } finally {
      setActionLoading(prev => ({ ...prev, [notification.id]: false }));
    }
  };

  const handleDismissNotification = async (notification) => {
    try {
      if (notification?.related_user_id) {
        const { error: disapprovePendingError } = await supabase
          .from('pending_registrations')
          .update({ status: 'disapproved' })
          .eq('id', notification.related_user_id)
          .eq('status', 'pending');

        if (disapprovePendingError) {
          console.error('Error updating pending registration status:', disapprovePendingError);
        }
      }

      await markNotificationAsRead(notification.id);
      setNotifications(prev =>
        prev.map(n =>
          n.id === notification.id
            ? { ...n, is_read: true, read_at: new Date().toISOString() }
            : n
        )
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
      setIsReviewOpen(false);
      setSelectedNotification(null);
      setUserDetails(null);
    } catch (error) {
      console.error('Error dismissing notification:', error);
    }
  };

  const fetchUserDetails = async (notification) => {
    if (!notification?.related_user_id || !notification?.related_user_type) {
      setDetailsError('Missing user information for this request.');
      return;
    }

    setDetailsLoading(true);
    setDetailsError('');
    setUserDetails(null);

    try {
      const { data, error } = await supabase
        .from('pending_registrations')
        .select('*')
        .eq('id', notification.related_user_id)
        .single();

      if (error || !data) {
        setDetailsError('Unable to load user details. Please try again.');
        return;
      }

      setUserDetails(data);
    } catch (error) {
      console.error('Error fetching user details:', error);
      setDetailsError('Unable to load user details. Please try again.');
    } finally {
      setDetailsLoading(false);
    }
  };

  const handleReviewRegistration = async (notification) => {
    setSelectedNotification(notification);
    setIsReviewOpen(true);
    await fetchUserDetails(notification);
  };

  const getDisplayFields = (details) => {
    if (!details) return [];
    const userTypeLabels = {
      'program_head': 'Program Head',
      'faculty': 'Faculty',
      'student': 'Student',
      'dean': 'Dean',
      'campus_director': 'Campus Director'
    };
    const hiddenKeys = new Set([
      'id',
      'auth_user_id',
      'created_at',
      'updated_at',
      'is_active',
      'is_verified',
      'status'
    ]);
    return Object.entries(details)
      .filter(([key, value]) => !hiddenKeys.has(key) && value !== null && value !== undefined && value !== '')
      .map(([key, value]) => ({
        key,
        label: key.replace(/_/g, ' ').replace(/\b\w/g, letter => letter.toUpperCase()),
        value: key === 'user_type' ? (userTypeLabels[String(value)] || String(value)) : value
      }));
  };

  const handleMarkAllAsRead = async () => {
    try {
      await markAllNotificationsAsRead(adminId, 'admin');
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'registration_pending':
        return <UserPlus className="text-blue-500" size={20} />;
      default:
        return <Bell className="text-slate-500" size={20} />;
    }
  };

  const getUserTypeLabel = (userType) => {
    const labels = {
      'program_head': 'Program Head',
      'faculty': 'Faculty',
      'student': 'Student',
      'dean': 'Dean',
      'campus_director': 'Campus Director'
    };
    return labels[userType] || userType;
  };

  const getNotificationColor = (type) => {
    switch (type) {
      case 'registration_pending':
        return 'bg-slate-50 border-slate-200';
      default:
        return 'bg-slate-50 border-slate-200';
    }
  };

  const handleNotificationClick = async (notification) => {
    if (notification.notification_type === 'registration_pending') {
      setIsOpen(false);
      await handleReviewRegistration(notification);
      return;
    }

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

  return (
    <div className="relative" ref={panelRef}>
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

      {isOpen && (
        <div className="absolute right-0 mt-2 w-96 bg-white rounded-xl shadow-2xl border border-slate-200 z-50 max-h-[600px] overflow-hidden flex flex-col">
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-slate-200 p-4 sticky top-0">
            <div>
              <h3 className="font-semibold text-slate-900">Notifications</h3>
              {unreadCount > 0 && (
                <p className="text-xs text-slate-600">{unreadCount} unread</p>
              )}
            </div>
          </div>

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
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    onClick={() => handleNotificationClick(notification)}
                    className={`p-4 border-l-4 cursor-pointer transition-colors hover:bg-slate-50 ${
                      notification.is_read ? 'bg-white' : 'bg-blue-50'
                    } ${getNotificationColor(notification.notification_type)}`}
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
                          {formatNotificationTime(notification.created_at)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

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

      {isReviewOpen && selectedNotification && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/60 px-4 py-6">
          <div className="w-full max-w-xl max-h-[85vh] bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col">
            <div className="flex flex-col gap-3 px-6 py-5 border-b border-slate-200 bg-gradient-to-r from-slate-50 via-white to-slate-50">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-2xl bg-slate-900 text-white flex items-center justify-center text-sm font-semibold uppercase">
                    {selectedNotification.related_user_type?.slice(0, 2) || 'UR'}
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Registration Request</p>
                    <h3 className="text-xl font-semibold text-slate-900">
                      {getUserTypeLabel(selectedNotification.related_user_type)} Review
                    </h3>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setIsReviewOpen(false);
                    setSelectedNotification(null);
                    setUserDetails(null);
                  }}
                  className="bg-white/10 text-slate-700 border border-slate-200 rounded-xl p-2.5 shadow-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-slate-300 hover:bg-slate-900/5 hover:scale-105"
                  aria-label="Close"
                >
                  <X size={20} />
                </button>
              </div>
              <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                <span className="inline-flex items-center gap-1 rounded-full bg-slate-900/90 px-3 py-1 text-white">
                  Pending Approval
                </span>
                <span>{formatNotificationTime(selectedNotification.created_at)}</span>
              </div>
            </div>

            <div className="px-6 py-5 space-y-5 overflow-y-auto registration-request-scroll">
              {detailsLoading && (
                <div className="text-sm text-slate-600">Loading user details...</div>
              )}
              {!detailsLoading && detailsError && (
                <div className="text-sm text-red-600 flex items-center gap-2">
                  <AlertCircle size={16} />
                  {detailsError}
                </div>
              )}
              {!detailsLoading && !detailsError && (
                <>
                  <div className="rounded-2xl border border-slate-200 bg-white p-4">
                    <p className="text-sm text-slate-600 leading-relaxed">
                      {selectedNotification.message}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      {getDisplayFields(userDetails).map((field) => (
                        <div key={field.key} className="rounded-xl bg-white border border-slate-100 p-3">
                          <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">{field.label}</p>
                          <p className="text-sm text-slate-900 break-all mt-1">{String(field.value)}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>

            <div className="flex flex-col gap-3 px-6 py-4 border-t border-slate-200 bg-white sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-slate-500">Review all fields before taking action.</p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleDismissNotification(selectedNotification)}
                  disabled={actionLoading[selectedNotification.id]}
                  className="px-4 py-2 text-sm font-medium bg-slate-200 text-slate-700 rounded-xl hover:bg-slate-300 disabled:opacity-50"
                >
                  Disapprove
                </button>
                <button
                  onClick={() => handleApproveRegistration(selectedNotification)}
                  disabled={actionLoading[selectedNotification.id]}
                  className="px-4 py-2 text-sm font-medium bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 disabled:opacity-50"
                >
                  {actionLoading[selectedNotification.id] ? 'Approving...' : 'Approve'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminNotificationsPanel;
