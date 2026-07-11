import React, { useState, useEffect, useRef } from 'react';
import { Bell, CheckCircle, AlertCircle, Clock, FileText } from 'lucide-react';
import { supabase } from '../../../lib/supabaseClient';
import { getNotifications, getUnreadNotificationsCount, markNotificationAsRead, markAllNotificationsAsRead } from '../../../api/notifications';
import { getRequestById, updateRequestStatus, getRequestsForRole } from '../../../api/reportApprovals';
import { notifyProgramHeadOnDecision } from '../../../api/notifications';
import ReportApprovalViewer from '../../Shared/ReportApprovalViewer';

function CampusDirectorNotificationsPanel({ campusDirectorId, onOpenApproval }) {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [activeRequest, setActiveRequest] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [, setTimeUpdate] = useState(0);
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
    if (!campusDirectorId) return;
    setLoading(true);
    try {
      const { data } = await getNotifications(campusDirectorId, 'campus_director');
      setNotifications(data || []);
      const { count } = await getUnreadNotificationsCount(campusDirectorId, 'campus_director');
      setUnreadCount(count || 0);
    } catch (error) {
      console.error('Error loading notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNotifications();
  }, [campusDirectorId]);

  useEffect(() => {
    if (!campusDirectorId) return;
    const pollingInterval = setInterval(loadNotifications, 10000);
    return () => clearInterval(pollingInterval);
  }, [campusDirectorId]);

  useEffect(() => {
    if (!campusDirectorId) return;
    const channel = supabase
      .channel(`campus_director_notifications_${campusDirectorId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `recipient_id=eq.${campusDirectorId} and recipient_type=eq.campus_director`
      }, (payload) => {
        setNotifications(prev => [payload.new, ...prev]);
        setUnreadCount(prev => prev + 1);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [campusDirectorId]);

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

  const handleNotificationClick = async (notification) => {
    if (notification.notification_type === 'report_review' && notification.related_approval_request_id) {
      try {
        const { data: request } = await getRequestById(notification.related_approval_request_id);
        if (request) {
          setActiveRequest(request);
          setIsOpen(false);
          if (onOpenApproval) onOpenApproval(request);
        }
      } catch (error) {
        console.error('Error loading approval request:', error);
      }
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

  const handleMarkAllAsRead = async () => {
    try {
      await markAllNotificationsAsRead(campusDirectorId, 'campus_director');
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  const handleDecision = async (isApprove, comment) => {
    if (!activeRequest || !campusDirectorId) return;

    // Only keep comments for rejections/concerns, not for approvals
    const effectiveComment = isApprove ? null : comment;

    setActionLoading(true);
    try {
      const status = isApprove ? 'cd_approved' : 'cd_rejected';

      // Update request status
      await updateRequestStatus({
        requestId: activeRequest.id,
        status,
        actorRole: 'campus_director',
        actorId: campusDirectorId,
        comment: effectiveComment
      });

      // Notify Program Head
      await notifyProgramHeadOnDecision({
        programHeadId: activeRequest.program_head_id,
        approvalId: activeRequest.id,
        status,
        comment: effectiveComment
      });

      // Refresh notifications
      await loadNotifications();
      
      // Mark notification as read
      const notification = notifications.find(n => 
        n.notification_type === 'report_review' && 
        n.related_approval_request_id === activeRequest.id
      );
      if (notification) {
        await markNotificationAsRead(notification.id);
      }
      
      setActiveRequest(null);
    } catch (error) {
      console.error('Error processing approval decision:', error);
      alert('Error processing approval. Please try again.');
    } finally {
      setActionLoading(false);
    }
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'report_review':
        return <FileText className="text-blue-500" size={20} />;
      case 'report_decision':
        return <CheckCircle className="text-green-500" size={20} />;
      default:
        return <Bell className="text-slate-500" size={20} />;
    }
  };

  const getNotificationColor = (type) => {
    switch (type) {
      case 'report_review':
        return 'bg-slate-50 border-slate-200';
      case 'report_decision':
        return 'bg-slate-50 border-slate-200';
      default:
        return 'bg-slate-50 border-slate-200';
    }
  };

  return (
    <>
      {activeRequest && (
        <ReportApprovalViewer
          request={activeRequest}
          role="campus_director"
          onClose={() => setActiveRequest(null)}
          onApprove={(comment) => handleDecision(true, comment)}
          onReject={(comment) => handleDecision(false, comment)}
          loading={actionLoading}
        />
      )}
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
      </div>
    </>
  );
}

export default CampusDirectorNotificationsPanel;
