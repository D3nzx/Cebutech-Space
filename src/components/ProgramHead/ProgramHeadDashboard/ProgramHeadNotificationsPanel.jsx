import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import { Bell, CheckCircle, AlertCircle, Clock, Edit, X, RefreshCw, Trash2, Calendar, MapPin } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../../lib/supabaseClient';
import { getNotifications, getUnreadNotificationsCount, markNotificationAsRead, markAllNotificationsAsRead, deleteNotification } from '../../../api/notifications';
import { getRequestById } from '../../../api/reportApprovals';
import ReportsPrintView from '../../Shared/ReportsPrintView';

function ProgramHeadNotificationsPanel({ programHeadId }) {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [selectedNotification, setSelectedNotification] = useState(null);
  const [scheduleDetails, setScheduleDetails] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState(null);
  const [isRejectedScheduleModal, setIsRejectedScheduleModal] = useState(false);
  const [reportDecisionRequest, setReportDecisionRequest] = useState(null);
  const [isReportDecisionModalOpen, setIsReportDecisionModalOpen] = useState(false);
  const [reportDecisionPage, setReportDecisionPage] = useState(1);
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

  const getDecisionComment = (request, notification) => {
    const comments = Array.isArray(request?.comments) ? request.comments : [];
    const decisionComments = comments
      .filter((c) => c?.actor_role === 'dean' || c?.actor_role === 'campus_director')
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    const latest = decisionComments[decisionComments.length - 1];
    return latest?.comment || notification?.message || '';
  };

  // Expose the method via window object for easy access from modals
  useEffect(() => {
    window.clearProgramHeadNotificationsForSchedule = clearNotificationsForSchedule;
    return () => {
      delete window.clearProgramHeadNotificationsForSchedule;
    };
  }, []);

  // Load notifications
  const loadNotifications = async () => {
    if (!programHeadId) {
      console.warn('⚠️ No programHeadId provided to NotificationsPanel');
      return;
    }

    console.log('📋 Loading notifications for programHeadId:', programHeadId);
    setLoading(true);
    try {
      const { data } = await getNotifications(programHeadId, 'program_head');
      console.log('📊 Notifications loaded:', data?.length || 0);
      setNotifications(data || []);

      // Get unread count
      const { count } = await getUnreadNotificationsCount(programHeadId, 'program_head');
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
    console.log('🔄 NotificationsPanel mounted, programHeadId:', programHeadId);
    loadNotifications();
  }, [programHeadId]);

  // Polling fallback - refresh notifications every 10 seconds
  useEffect(() => {
    if (!programHeadId) return;

    console.log('⏱️ Starting polling fallback for notifications (every 10 seconds)');
    
    const pollingInterval = setInterval(() => {
      console.log('🔄 Polling for new notifications...');
      loadNotifications();
    }, 10000); // Poll every 10 seconds

    return () => {
      console.log('🧹 Stopping polling fallback');
      clearInterval(pollingInterval);
    };
  }, [programHeadId]);

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
    if (!programHeadId) {
      console.warn('⚠️ No programHeadId available for real-time subscription');
      return;
    }

    console.log('🔌 Setting up real-time subscription for programHeadId:', programHeadId);

    try {
      const channel = supabase
        .channel(`program_head_notifications_${programHeadId}`, {
          config: {
            broadcast: { self: true }
          }
        })
        // New notifications
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `recipient_id=eq.${programHeadId} and recipient_type=eq.program_head`
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
          filter: `recipient_id=eq.${programHeadId} and recipient_type=eq.program_head`
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
          filter: `recipient_id=eq.${programHeadId} and recipient_type=eq.program_head`
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
            console.log('   Filter: recipient_id=' + programHeadId + ' AND recipient_type=program_head');
          } else if (status === 'CHANNEL_ERROR') {
            console.error('❌ Real-time subscription FAILED - Will use polling fallback');
          }
        });

      console.log('✅ Real-time subscription channel created');

      return () => {
        console.log('🧹 Cleaning up real-time subscription for programHeadId:', programHeadId);
        supabase.removeChannel(channel);
      };
    } catch (error) {
      console.error('❌ Error setting up real-time subscription:', error);
      console.error('   Error message:', error.message);
      console.error('   Stack:', error.stack);
    }
  }, [programHeadId]);

  const handleNotificationClick = async (notification) => {
    const approvalRequestId = notification.related_approval_request_id || notification.related_approval_id;
    if (notification.notification_type === 'report_decision' && approvalRequestId) {
      try {
        const { data: request } = await getRequestById(approvalRequestId);
        if (request) {
          setReportDecisionRequest(request);
          setReportDecisionPage(1);
          setSelectedNotification(notification);
          setIsReportDecisionModalOpen(true);
          setIsOpen(false);
        }

        await markNotificationAsRead(notification.id);
        setNotifications(prev =>
          prev.map(n => n.id === notification.id ? { ...n, is_read: true, read_at: new Date().toISOString() } : n)
        );
        setUnreadCount(prev => Math.max(0, prev - 1));
      } catch (error) {
        console.error('Error opening report decision notification:', error);
      }
      return;
    }

    // For schedule_approved notifications, open modal to show details
    if (notification.notification_type === 'schedule_approved' && notification.related_schedule_id) {
      console.log('📍 Opening modal for approved schedule:', notification.related_schedule_id);
      
      // Fetch full schedule details without inline relationships
      try {
        const { data: schedule, error } = await supabase
          .from('schedules')
          .select('*')
          .eq('id', notification.related_schedule_id)
          .single();
        
        if (error) {
          console.error('❌ Error fetching schedule details:', error);
          alert('Error loading schedule. Please try again.');
          return;
        }
        
        // Fetch related data separately
        if (schedule) {
          const [subjectsRes, coursesRes, offeringsRes, locationsRes, facultyRes] = await Promise.all([
            schedule.subject_id ? supabase.from('subjects').select('*').eq('id', schedule.subject_id).single() : Promise.resolve({ data: null }),
            schedule.course_id ? supabase.from('courses').select('*').eq('id', schedule.course_id).single() : Promise.resolve({ data: null }),
            schedule.course_subject_offering_id ? supabase.from('course_subject_offerings').select('*').eq('id', schedule.course_subject_offering_id).single() : Promise.resolve({ data: null }),
            schedule.location_id ? supabase.from('locations').select('id, name').eq('id', schedule.location_id).single() : Promise.resolve({ data: null }),
            schedule.faculty_id ? supabase.from('faculty').select('*').eq('id', schedule.faculty_id).single() : Promise.resolve({ data: null })
          ]);
          
          // Enrich schedule with related data
          const enrichedSchedule = {
            ...schedule,
            subject: subjectsRes.data || null,
            course: coursesRes.data || null,
            course_subject_offering: offeringsRes.data || null,
            location: locationsRes.data || null,
            faculty: facultyRes.data || null
          };
          
          console.log('✅ Schedule details fetched and enriched:', enrichedSchedule);
          setScheduleDetails(enrichedSchedule);
        }
      } catch (err) {
        console.error('❌ Exception fetching schedule:', err);
        alert('Error loading schedule: ' + err.message);
        return;
      }
      
      setSelectedNotification(notification);
      setIsModalOpen(true);
      setIsOpen(false);
      return; // Don't mark as read yet - will mark after activating schedule
    }

    // For change_requested notifications, emit event to open the modal in parent component
    if (notification.notification_type === 'change_requested' && notification.related_schedule_id) {
      console.log('📍 Opening Schedule Change Requested modal:', notification.related_schedule_id);
      console.log('   Notification type:', notification.notification_type);
      console.log('   ℹ️ Notification will be marked as read only after program head saves the schedule');
      setIsOpen(false);
      
      // Dispatch custom event to parent component to open the modal
      window.dispatchEvent(new CustomEvent('openScheduleChangeRequestedModal', {
        detail: {
          scheduleId: notification.related_schedule_id,
          notificationId: notification.id
        }
      }));
      return; // Don't mark as read yet
    }

    // For schedule_rejected notifications, open modal with schedule details and rejection reason
    if (notification.notification_type === 'schedule_rejected' && notification.related_schedule_id) {
      console.log('📍 Opening rejected schedule modal:', notification.related_schedule_id);
      
      try {
        // Fetch schedule details without inline relationships
        const { data: schedule, error: scheduleError } = await supabase
          .from('schedules')
          .select('*')
          .eq('id', notification.related_schedule_id)
          .single();
        
        if (scheduleError) {
          console.error('❌ Error fetching schedule details:', scheduleError);
          alert('Error loading schedule. Please try again.');
          return;
        }
        
        // Fetch related data separately
        if (schedule) {
          const [subjectsRes, coursesRes, offeringsRes, locationsRes, facultyRes] = await Promise.all([
            schedule.subject_id ? supabase.from('subjects').select('*').eq('id', schedule.subject_id).single() : Promise.resolve({ data: null }),
            schedule.course_id ? supabase.from('courses').select('*').eq('id', schedule.course_id).single() : Promise.resolve({ data: null }),
            schedule.course_subject_offering_id ? supabase.from('course_subject_offerings').select('*').eq('id', schedule.course_subject_offering_id).single() : Promise.resolve({ data: null }),
            schedule.location_id ? supabase.from('locations').select('id, name').eq('id', schedule.location_id).single() : Promise.resolve({ data: null }),
            schedule.faculty_id ? supabase.from('faculty').select('*').eq('id', schedule.faculty_id).single() : Promise.resolve({ data: null })
          ]);
          
          // Enrich schedule with related data
          const enrichedSchedule = {
            ...schedule,
            subject: subjectsRes.data || null,
            course: coursesRes.data || null,
            course_subject_offering: offeringsRes.data || null,
            location: locationsRes.data || null,
            faculty: facultyRes.data || null
          };
          
          // Fetch approval info to get rejection reason
          const { data: approval, error: approvalError } = await supabase
            .from('schedule_approvals')
            .select('faculty_response')
            .eq('schedule_id', notification.related_schedule_id)
            .eq('status', 'rejected')
            .single();
          
          if (!approvalError && approval) {
            setRejectionReason(approval.faculty_response);
            console.log('✅ Rejection reason fetched:', approval.faculty_response);
          }
          
          console.log('✅ Schedule details fetched and enriched:', enrichedSchedule);
          setScheduleDetails(enrichedSchedule);
          setSelectedNotification(notification);
          setIsRejectedScheduleModal(true);
          setIsOpen(false);
        }
        return; // Don't mark as read yet - will mark after taking action
      } catch (err) {
        console.error('❌ Exception fetching rejected schedule:', err);
        alert('Error loading schedule: ' + err.message);
      }
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
      await markAllNotificationsAsRead(programHeadId, 'program_head');
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'schedule_approved':
        return <CheckCircle className="text-green-500" size={20} />;
      case 'schedule_rejected':
        return <AlertCircle className="text-red-500" size={20} />;
      case 'change_requested':
        return <AlertCircle className="text-orange-500" size={20} />;
      default:
        return <Bell className="text-slate-500" size={20} />;
    }
  };

  const getNotificationColor = (type) => {
    switch (type) {
      case 'schedule_approved':
        return 'bg-green-50 border-green-200';
      case 'schedule_rejected':
        return 'bg-red-50 border-red-200';
      case 'change_requested':
        return 'bg-orange-50 border-orange-200';
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

  const formatTime12Hour = (timeString) => {
    if (!timeString) return '';
    try {
      const [hours, minutes] = timeString.split(':');
      const hour = parseInt(hours, 10);
      const period = hour >= 12 ? 'PM' : 'AM';
      const displayHour = hour % 12 || 12;
      return `${displayHour}:${minutes} ${period}`;
    } catch (error) {
      return timeString;
    }
  };

  const handleActivateSchedule = async (scheduleId) => {
    try {
      console.log('🚀 Activating schedule:', scheduleId);
      
      // Update schedule to set is_active = true
      const { error: updateError } = await supabase
        .from('schedules')
        .update({ is_active: true, updated_at: new Date().toISOString() })
        .eq('id', scheduleId);
      
      if (updateError) {
        console.error('❌ Error activating schedule:', updateError);
        throw updateError;
      }
      
      console.log('✅ Schedule activated successfully');
      
      // Delete the notification
      await deleteNotification(selectedNotification.id);
      setNotifications(prev =>
        prev.filter(n => n.id !== selectedNotification.id)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
      
      setIsModalOpen(false);
      setSelectedNotification(null);
    } catch (error) {
      console.error('Error activating schedule:', error);
    }
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

      {/* Report Decision Modal */}
      {isReportDecisionModalOpen && reportDecisionRequest && ReactDOM.createPortal(
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wide">Report Decision</p>
                <h2 className="text-lg font-semibold text-slate-900">{reportDecisionRequest?.report_payload?.facultyLabel || 'Report'}</h2>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsReportDecisionModalOpen(false);
                  setReportDecisionRequest(null);
                  setSelectedNotification(null);
                }}
                className="p-2 rounded-lg bg-white/10 text-slate-800 hover:bg-slate-100 border border-slate-200 transition"
                aria-label="Close"
                title="Close"
              >
                X
              </button>
            </div>

            <div className="px-6 py-3 border-b border-slate-200 bg-slate-50 flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                <div className="flex bg-white border border-slate-200 rounded-xl p-1 gap-1 shadow-sm">
                  <button
                    type="button"
                    onClick={() => setReportDecisionPage(1)}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 focus:outline-none focus:ring-0 ${
                      reportDecisionPage === 1
                        ? 'bg-blue-600 text-white shadow-md'
                        : 'text-slate-700 bg-white hover:bg-slate-50 hover:text-blue-600'
                    }`}
                    style={{ outline: 'none', border: 'none' }}
                    onMouseDown={(e) => e.preventDefault()}
                    title="Program by Teacher"
                  >
                    Teacher
                  </button>
                  <button
                    type="button"
                    onClick={() => setReportDecisionPage(2)}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 focus:outline-none focus:ring-0 ${
                      reportDecisionPage === 2
                        ? 'bg-blue-600 text-white shadow-md'
                        : 'text-slate-700 bg-white hover:bg-slate-50 hover:text-blue-600'
                    }`}
                    style={{ outline: 'none', border: 'none' }}
                    onMouseDown={(e) => e.preventDefault()}
                    title="Program by Section"
                  >
                    Section
                  </button>
                </div>
              </div>
              <div className="text-sm text-slate-600">
                {reportDecisionRequest?.status === 'dean_rejected' || reportDecisionRequest?.status === 'cd_rejected'
                  ? null
                  : 'Approved'}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {(reportDecisionRequest?.status === 'dean_rejected' || reportDecisionRequest?.status === 'cd_rejected') && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                  <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide mb-2">
                    {reportDecisionRequest?.status === 'dean_rejected'
                      ? 'Comment from Dean'
                      : 'Comment from Campus Director'}
                  </p>
                  <p className="text-sm text-slate-800 whitespace-pre-wrap">
                    {getDecisionComment(reportDecisionRequest, selectedNotification) || 'No comment provided.'}
                  </p>
                </div>
              )}

              <div className="border border-slate-200 rounded-lg overflow-hidden bg-white">
                <ReportsPrintView
                  embedded={true}
                  page={reportDecisionPage}
                  onClose={() => setIsReportDecisionModalOpen(false)}
                  onPrint={() => window.print()}
                  programHeadName={reportDecisionRequest?.report_payload?.programHeadName}
                  facultyLabel={reportDecisionRequest?.report_payload?.facultyLabel}
                  filteredSchedules={reportDecisionPage === 1
                    ? (reportDecisionRequest?.report_payload?.filteredSchedules || [])
                    : (reportDecisionRequest?.report_payload?.filteredSchedulesPage2 || reportDecisionRequest?.report_payload?.filteredSchedules || [])}
                  summaryTotals={reportDecisionPage === 1
                    ? (reportDecisionRequest?.report_payload?.summaryTotals || {})
                    : (reportDecisionRequest?.report_payload?.summaryTotalsPage2 || reportDecisionRequest?.report_payload?.summaryTotals || {})}
                  summaryRows={reportDecisionRequest?.report_payload?.summaryRows || []}
                  summaryRowsPage2={reportDecisionRequest?.report_payload?.summaryRowsPage2 || []}
                  roleName={'Dean'}
                  roleDisplayName={reportDecisionRequest?.report_payload?.deanName || 'Dean'}
                  approvedDisplayName={reportDecisionRequest?.report_payload?.campusDirectorName || 'Campus Director'}
                  pageTitle={reportDecisionPage === 1 ? 'Program by Teacher' : 'Program by Section'}
                  showProgramTypeAndAcademicPeriod={true}
                  printProgramTypeText={reportDecisionRequest?.report_payload?.printProgramTypeText}
                  printAcademicPeriodText={reportDecisionRequest?.report_payload?.printAcademicPeriodText}
                  page2DegreeText={reportDecisionRequest?.report_payload?.page2Meta?.degree || ''}
                  page2YearText={reportDecisionRequest?.report_payload?.page2Meta?.year || ''}
                  page2SectionText={reportDecisionRequest?.report_payload?.page2Meta?.section || ''}
                  reviewedDisplayName={reportDecisionRequest?.report_payload?.deanName || 'Dean'}
                />
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

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

      {/* Schedule Approved Modal */}
      {isModalOpen && selectedNotification && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col animate-in scale-in-95 fade-in duration-300">
            {/* Header - Success State */}
            <div className="sticky top-0 bg-green-500 px-6 py-5 flex justify-between items-start flex-shrink-0">
              <div className="flex gap-4 flex-1">
                <div className="flex-shrink-0 p-2 bg-white/20 rounded-lg">
                  <CheckCircle className="text-white" size={28} />
                </div>
                <div className="flex-1">
                  <h2 className="text-2xl font-bold text-white">Schedule Approved</h2>
                  <p className="text-green-100 text-sm mt-1">Faculty approved the schedule</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setIsModalOpen(false);
                  setSelectedNotification(null);
                }}
                className="p-2 bg-white/20 border border-white/30 hover:bg-white/30 rounded-lg transition-colors flex-shrink-0"
              >
                <X size={20} className="text-white" />
              </button>
            </div>

            {/* Content - Scrollable */}
            <div className="flex-1 overflow-y-auto">
              <div className="p-6 space-y-6">
                {/* Faculty Response Card */}
                <div className="bg-green-50 rounded-xl p-5 border border-green-200 shadow-sm">
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 p-2 bg-green-100 rounded-lg">
                      <CheckCircle className="text-green-600" size={20} />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-slate-900 mb-2">Approval Status</h3>
                      <div className="space-y-2">
                        <p className="text-sm text-slate-700">
                          <span className="font-semibold text-slate-900">Status:</span>
                          <span className="ml-2 inline-flex items-center gap-1 px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-semibold">
                            ✓ Approved
                          </span>
                        </p>
                        <p className="text-sm text-slate-600">
                          <span className="font-semibold text-slate-900">Approved on:</span>
                          <span className="ml-2 text-slate-700">Just now</span>
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Schedule Details Card */}
                <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
                  <h3 className="font-bold text-slate-900 mb-5 text-lg flex items-center gap-2">
                    <div className="w-1 h-6 bg-green-500 rounded-full"></div>
                    Schedule Details
                  </h3>
                  
                  {/* Subject & Course - Card Style */}
                  <div className="mb-5 pb-5 border-b border-slate-100">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                        <p className="text-xs text-blue-700 uppercase tracking-wider font-bold mb-2">Subject Code</p>
                        <p className="text-lg font-bold text-slate-900">
                          {scheduleDetails?.subject?.subject_code || 'N/A'}
                        </p>
                        <p className="text-sm text-slate-700 mt-2 leading-relaxed">
                          {scheduleDetails?.subject?.subject_name || 'N/A'}
                        </p>
                      </div>
                      <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
                        <p className="text-xs text-purple-700 uppercase tracking-wider font-bold mb-2">Program/Course</p>
                        <p className="text-base font-bold text-slate-900">
                          {scheduleDetails?.course?.course_name || 'N/A'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Schedule Timing - Icon Style */}
                  <div className="mb-5 pb-5 border-b border-slate-100">
                    <p className="text-xs text-slate-600 uppercase tracking-wider font-bold mb-4">Class Schedule</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="flex items-start gap-3 p-3 bg-orange-50 rounded-lg border border-orange-200">
                        <div className="flex-shrink-0 p-2 bg-orange-100 rounded-lg">
                          <Calendar className="text-orange-600" size={20} />
                        </div>
                        <div className="flex-1">
                          <p className="text-xs text-orange-700 font-semibold uppercase">Day & Time</p>
                          <p className="text-sm font-bold text-slate-900 mt-1">
                            {scheduleDetails?.day_of_week}
                          </p>
                          <p className="text-sm text-slate-700 mt-1">
                            {formatTime12Hour(scheduleDetails?.start_time)} - {formatTime12Hour(scheduleDetails?.end_time)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3 p-3 bg-indigo-50 rounded-lg border border-indigo-200">
                        <div className="flex-shrink-0 p-2 bg-indigo-100 rounded-lg">
                          <MapPin className="text-indigo-600" size={20} />
                        </div>
                        <div className="flex-1">
                          <p className="text-xs text-indigo-700 font-semibold uppercase">Location</p>
                          <p className="text-sm font-bold text-slate-900 mt-1">
                            {scheduleDetails?.location?.name || 'N/A'}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Class Details - Grid */}
                  <div className="mb-5 pb-5 border-b border-slate-100">
                    <p className="text-xs text-slate-600 uppercase tracking-wider font-bold mb-4">Class Information</p>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <div className="bg-slate-50 rounded-lg p-3 border border-slate-200">
                        <p className="text-xs text-slate-600 font-semibold uppercase mb-1">Component</p>
                        <p className="text-sm font-bold text-slate-900">
                          {scheduleDetails?.course_subject_offering?.offering_type === 'LEC' ? 'Lecture' : scheduleDetails?.course_subject_offering?.offering_type === 'LAB' ? 'Lab' : 'N/A'}
                        </p>
                      </div>
                      <div className="bg-slate-50 rounded-lg p-3 border border-slate-200">
                        <p className="text-xs text-slate-600 font-semibold uppercase mb-1">Semester</p>
                        <p className="text-sm font-bold text-slate-900">
                          {scheduleDetails?.semester === 1 ? '1st' : scheduleDetails?.semester === 2 ? '2nd' : 'N/A'}
                        </p>
                      </div>
                      <div className="bg-slate-50 rounded-lg p-3 border border-slate-200">
                        <p className="text-xs text-slate-600 font-semibold uppercase mb-1">Year Level</p>
                        <p className="text-sm font-bold text-slate-900">
                          {scheduleDetails?.year_level || 'N/A'}
                        </p>
                      </div>
                      <div className="bg-slate-50 rounded-lg p-3 border border-slate-200">
                        <p className="text-xs text-slate-600 font-semibold uppercase mb-1">Section</p>
                        <p className="text-sm font-bold text-slate-900">
                          {scheduleDetails?.section || 'N/A'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Faculty Information */}
                  <div>
                    <p className="text-xs text-slate-600 uppercase tracking-wider font-bold mb-3">Assigned Faculty</p>
                    <div className="bg-gradient-to-r from-slate-50 to-slate-100 rounded-lg p-4 border border-slate-200 flex items-center gap-3">
                      <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center">
                        <span className="text-white font-bold text-lg">
                          {scheduleDetails?.faculty?.first_name?.charAt(0)}{scheduleDetails?.faculty?.last_name?.charAt(0)}
                        </span>
                      </div>
                      <div className="flex-1">
                        <p className="font-bold text-slate-900">
                          {scheduleDetails?.faculty?.first_name} {scheduleDetails?.faculty?.last_name || 'N/A'}
                        </p>
                        <p className="text-sm text-slate-600">Faculty Member</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Success Message */}
                <div className="bg-green-50 rounded-xl p-4 border-l-4 border-green-500 shadow-sm">
                  <div className="flex items-start gap-3">
                    <CheckCircle className="text-green-600 flex-shrink-0 mt-0.5" size={20} />
                    <div>
                      <p className="font-semibold text-slate-900 text-sm">Ready to Activate</p>
                      <p className="text-sm text-slate-700 mt-1">
                        The schedule is approved and ready to activate.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer - Action Buttons */}
            <div className="bg-slate-50 border-t border-slate-200 p-6 flex gap-3 justify-end flex-shrink-0">
              <button
                onClick={() => {
                  setIsModalOpen(false);
                  setSelectedNotification(null);
                }}
                className="px-6 py-2.5 bg-white text-slate-700 rounded-lg hover:bg-slate-100 font-semibold transition-all border border-slate-300 hover:border-slate-400"
              >
                Close
              </button>
              <button
                onClick={() => handleActivateSchedule(selectedNotification.related_schedule_id)}
                className="px-6 py-2.5 bg-green-500 text-white rounded-lg hover:bg-green-600 font-semibold transition-colors shadow-md hover:shadow-lg"
              >
                Activate Schedule
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rejected Schedule Modal */}
      {isRejectedScheduleModal && selectedNotification && scheduleDetails && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[85vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="bg-gradient-to-r from-red-600 to-red-700 px-6 py-5 flex justify-between items-start flex-shrink-0">
              <div className="flex gap-3 flex-1">
                <div className="flex-shrink-0 p-2 bg-white/20 rounded-lg">
                  <AlertCircle className="text-white" size={24} />
                </div>
                <div className="flex-1">
                  <h2 className="text-xl font-bold text-white">Schedule Rejected</h2>
                  <p className="text-red-100 text-xs mt-0.5 font-medium">Faculty declined this assignment</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setIsRejectedScheduleModal(false);
                  setSelectedNotification(null);
                  setScheduleDetails(null);
                  setRejectionReason(null);
                }}
                className="p-1.5 hover:bg-white/20 rounded-lg transition-colors flex-shrink-0"
              >
                <X size={20} className="text-white" />
              </button>
            </div>

            {/* Content - Scrollable */}
            <div className="flex-1 overflow-y-auto">
              <div className="p-5 space-y-4">
                {/* Assigned Faculty */}
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4 border border-blue-200">
                  <p className="text-xs font-bold text-blue-900 uppercase tracking-wide mb-3">Assigned Faculty</p>
                  <div className="flex items-center gap-3">
                    <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center">
                      <span className="text-white font-bold text-sm">
                        {scheduleDetails?.faculty?.first_name?.charAt(0)}{scheduleDetails?.faculty?.last_name?.charAt(0)}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{scheduleDetails?.faculty?.first_name} {scheduleDetails?.faculty?.last_name}</p>
                      <p className="text-xs text-slate-600">Faculty Member</p>
                    </div>
                  </div>
                </div>

                {/* Rejection Reason */}
                <div className="bg-red-50 rounded-lg p-4 border border-red-200">
                  <p className="text-xs font-bold text-red-900 uppercase tracking-wide mb-2">Reason for Rejection</p>
                  <p className="text-sm text-slate-900 leading-relaxed">
                    {rejectionReason || 'No reason provided'}
                  </p>
                </div>

                {/* Schedule Details - Compact Grid */}
                <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-lg p-4 border border-slate-200">
                  <p className="text-xs font-bold text-slate-700 uppercase tracking-wide mb-3">Schedule Details</p>
                  
                  {/* 2-Column Grid Layout */}
                  <div className="grid grid-cols-2 gap-3">
                    {/* Subject */}
                    <div>
                      <p className="text-xs text-slate-600 font-semibold mb-1">Subject</p>
                      <p className="text-sm text-slate-900">{scheduleDetails?.subject?.subject_code}</p>
                      <p className="text-xs text-slate-600 mt-0.5">{scheduleDetails?.subject?.subject_name || 'N/A'}</p>
                    </div>

                    {/* Program */}
                    <div>
                      <p className="text-xs text-slate-600 font-semibold mb-1">Program</p>
                      <p className="text-sm text-slate-900">{scheduleDetails?.course?.course_name || 'N/A'}</p>
                    </div>

                    {/* Day & Time */}
                    <div>
                      <p className="text-xs text-slate-600 font-semibold mb-1">Day & Time</p>
                      <p className="text-sm text-slate-900">{scheduleDetails?.day_of_week}</p>
                      <p className="text-xs text-slate-600 mt-0.5">{formatTime12Hour(scheduleDetails?.start_time)} - {formatTime12Hour(scheduleDetails?.end_time)}</p>
                    </div>

                    {/* Location */}
                    <div>
                      <p className="text-xs text-slate-600 font-semibold mb-1">Location</p>
                      <p className="text-sm text-slate-900">{scheduleDetails?.location?.name || 'N/A'}</p>
                    </div>

                    {/* Component Type */}
                    <div>
                      <p className="text-xs text-slate-600 font-semibold mb-1">Component</p>
                      <p className="text-sm text-slate-900">
                        {scheduleDetails?.course_subject_offering?.offering_type === 'LEC' ? 'Lecture' : scheduleDetails?.course_subject_offering?.offering_type === 'LAB' ? 'Laboratory' : 'N/A'}
                      </p>
                    </div>

                    {/* Year & Section */}
                    <div>
                      <p className="text-xs text-slate-600 font-semibold mb-1">Year & Section</p>
                      <p className="text-sm text-slate-900">{scheduleDetails?.year_level} - Sec {scheduleDetails?.section}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="bg-slate-50 border-t border-slate-200 px-5 py-3 flex gap-2 justify-end flex-shrink-0">
              <button
                onClick={() => {
                  setIsRejectedScheduleModal(false);
                  setSelectedNotification(null);
                  setScheduleDetails(null);
                  setRejectionReason(null);
                }}
                className="px-4 py-2 rounded-lg border border-slate-300 bg-white text-slate-700 text-sm font-semibold hover:bg-slate-100 transition-all"
              >
                Close
              </button>
              <button
                onClick={() => {
                  // Dispatch event to open reassign modal in Scheduling component
                  window.dispatchEvent(new CustomEvent('openReassignModal', {
                    detail: {
                      scheduleId: scheduleDetails.id,
                      notificationId: selectedNotification.id
                    }
                  }));
                  setIsRejectedScheduleModal(false);
                  setSelectedNotification(null);
                  setScheduleDetails(null);
                  setRejectionReason(null);
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-all"
              >
                <RefreshCw size={14} />
                Reassign
              </button>
              <button
                onClick={() => {
                  // Dispatch event to open delete confirmation in Scheduling component
                  window.dispatchEvent(new CustomEvent('deleteScheduleFromNotification', {
                    detail: {
                      scheduleId: scheduleDetails.id,
                      notificationId: selectedNotification.id
                    }
                  }));
                  setIsRejectedScheduleModal(false);
                  setSelectedNotification(null);
                  setScheduleDetails(null);
                  setRejectionReason(null);
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-semibold hover:bg-red-700 transition-all"
              >
                <Trash2 size={14} />
                Remove
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ProgramHeadNotificationsPanel;
