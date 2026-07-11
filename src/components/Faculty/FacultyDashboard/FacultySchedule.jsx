import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { Calendar, Clock, MapPin, BookOpen, AlertCircle, CheckCircle, User, Grid3x3, List } from 'lucide-react';
import { getSchedulesByFaculty } from '../../../api/schedules';
import { getFacultyPendingApprovals, submitScheduleApproval } from '../../../api/scheduleApprovals';
import { supabase } from '../../../lib/supabaseClient';
import ScheduleApprovalModal from './ScheduleApprovalModal';

function FacultySchedule({ facultyData, scheduleIdToApprove, onScheduleApprovalModalClosed }) {
  const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const timeSlots = ['07:00', '08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00'];
  const [schedules, setSchedules] = useState([]);
  const [rejectedSchedules, setRejectedSchedules] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pendingApprovals, setPendingApprovals] = useState([]);
  const [isApprovalModalOpen, setIsApprovalModalOpen] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState(null);
  const [isSubmittingApproval, setIsSubmittingApproval] = useState(false);
  const [highlightedScheduleId, setHighlightedScheduleId] = useState(null);
  const [isRejectedModalOpen, setIsRejectedModalOpen] = useState(false);
  const [selectedRejectedSchedule, setSelectedRejectedSchedule] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [viewMode, setViewMode] = useState('list');
  const [showScrollbar, setShowScrollbar] = useState(false);
  const scrollbarTimeoutRef = React.useRef(null);

  // Handle scrollbar auto-hide after 5 seconds of inactivity
  const handleScrollbarVisibility = useCallback(() => {
    setShowScrollbar(true);
    
    // Clear existing timeout
    if (scrollbarTimeoutRef.current) {
      clearTimeout(scrollbarTimeoutRef.current);
    }
    
    // Set new timeout to hide scrollbar after 5 seconds
    scrollbarTimeoutRef.current = setTimeout(() => {
      setShowScrollbar(false);
    }, 5000);
  }, []);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (scrollbarTimeoutRef.current) {
        clearTimeout(scrollbarTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!facultyData?.id) return;

    const fetchSchedules = async () => {
      setIsLoading(true);
      setError(null);
      try {
        console.log('🔄 Fetching schedules for faculty:', facultyData.id);
        // Fetch all schedules assigned to this faculty
        const { data: allSchedules, error: fetchError } = await getSchedulesByFaculty(facultyData.id);
        
        if (allSchedules && allSchedules.length > 0) {
          console.log('📊 All schedules fetched:', allSchedules.map(s => ({
            id: s.id,
            subject: s.subject?.subject_code,
            is_active: s.is_active,
            approval_status: s.approval_status
          })));
        }

        if (fetchError) {
          setError(fetchError);
          setSchedules([]);
          return;
        }

        // Debug: Log the raw schedule data to see course_subject_offering
        if (allSchedules && allSchedules.length > 0) {
          console.log('🔍 Raw schedule data in FacultySchedule:', allSchedules[0]);
        }

        // Fetch approval statuses for all schedules
        const { data: approvals, error: approvalsError } = await supabase
          .from('schedule_approvals')
          .select('schedule_id, status, updated_at, created_at')
          .eq('faculty_id', facultyData.id)
          .order('updated_at', { ascending: false })
          .order('created_at', { ascending: false });

        if (approvalsError) {
          console.error('❌ Error fetching approvals:', approvalsError);
          setSchedules([]);
          return;
        }

        // Create a map of schedule_id -> approval status
        const approvalMap = {};
        if (Array.isArray(approvals)) {
          approvals.forEach(approval => {
            if (!approvalMap[approval.schedule_id]) {
              approvalMap[approval.schedule_id] = approval.status;
            }
          });
        }

        // Filter schedules to show only those that are BOTH approved by faculty AND activated by Program Head
        console.log('🔍 All schedules fetched:', allSchedules.length);
        console.log('📋 Approval map:', approvalMap);
        
        let approvedSchedules = (Array.isArray(allSchedules) ? allSchedules : []).filter(schedule => {
          const status = approvalMap[schedule.id];
          const isApproved = status === 'approved';
          const isActive = schedule.is_active === true;
          
          console.log(`📋 Schedule ${schedule.id}:`, {
            subject: schedule.subject?.subject_code,
            approval_status: status,
            is_approved: isApproved,
            is_active: isActive,
            raw_is_active: schedule.is_active,
            should_show: isApproved && isActive
          });
          
          // Only show if BOTH conditions are met:
          // 1. Faculty has approved the schedule
          // 2. Program Head has activated the schedule
          const shouldShow = isApproved && isActive;
          
          return shouldShow;
        });
        
        console.log(`✅ Filtered schedules: ${approvedSchedules.length} shown out of ${allSchedules.length}`);

        // Also extract rejected schedules for display in a separate section
        let rejected = (Array.isArray(allSchedules) ? allSchedules : []).filter(schedule => {
          const status = approvalMap[schedule.id];
          return status === 'rejected';
        });

        console.log(`🔴 Rejected schedules: ${rejected.length}`);
        setRejectedSchedules(rejected);

        // Fetch missing offering types for schedules that don't have course_subject_offering populated
        const schedulesNeedingOfferings = approvedSchedules.filter(s => !s.course_subject_offering);
        
        if (schedulesNeedingOfferings.length > 0) {
          console.log(`⚠️ ${schedulesNeedingOfferings.length} schedules missing offering data, fetching...`);
          
          for (const schedule of schedulesNeedingOfferings) {
            try {
              let offering = null;
              
              // First try: fetch by course_subject_offering_id if it exists
              if (schedule.course_subject_offering_id) {
                const { data: offeringData, error: offeringError } = await supabase
                  .from('course_subject_offerings')
                  .select('id, offering_type, lecture_units, lab_units, contact_hours')
                  .eq('id', schedule.course_subject_offering_id)
                  .single();
                
                if (!offeringError && offeringData) {
                  offering = offeringData;
                  console.log(`✅ Fetched offering for schedule ${schedule.id} by ID:`, offering.offering_type);
                }
              }
              
              // Fallback: fetch by subject_id and course_id if first attempt failed
              if (!offering && schedule.subject_id && schedule.course_id) {
                console.log(`⚠️ Trying fallback lookup for schedule ${schedule.id} using subject_id and course_id...`);
                const { data: offeringData, error: offeringError } = await supabase
                  .from('course_subject_offerings')
                  .select('id, offering_type, lecture_units, lab_units, contact_hours')
                  .eq('subject_id', schedule.subject_id)
                  .eq('course_id', schedule.course_id)
                  .single();
                
                if (!offeringError && offeringData) {
                  offering = offeringData;
                  console.log(`✅ Fetched offering for schedule ${schedule.id} by subject/course:`, offering.offering_type);
                }
              }
              
              if (offering) {
                schedule.course_subject_offering = offering;
              } else {
                console.warn(`⚠️ Could not fetch offering for schedule ${schedule.id}`);
              }
            } catch (err) {
              console.error(`❌ Error fetching offering for schedule ${schedule.id}:`, err);
            }
          }
        }

        console.log(`✅ Showing ${approvedSchedules.length} approved schedules out of ${Array.isArray(allSchedules) ? allSchedules.length : 0} total`);
        console.log('📊 Filtered schedules to display:', approvedSchedules.map(s => ({
          id: s.id,
          subject: s.subject?.subject_code,
          is_active: s.is_active,
          approval_status: approvalMap[s.id]
        })));
        setSchedules(approvedSchedules);
      } catch (error) {
        console.error('❌ Error fetching schedules:', error);
        setError(error.message);
        setSchedules([]);
      } finally {
        setIsLoading(false);
      }
    };

    const fetchPendingApprovals = async () => {
      const { data } = await getFacultyPendingApprovals(facultyData.id);
      setPendingApprovals(Array.isArray(data) ? data : []);
    };

    fetchSchedules();
    fetchPendingApprovals();

    // Set up real-time subscription for schedules, subjects, locations, and courses
    const schedulesChannel = supabase
      .channel(`faculty_schedules_${facultyData.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'schedules',
          filter: `faculty_id=eq.${facultyData.id}`
        },
        async (payload) => {
          const eventType = payload.eventType || payload.event;
          const scheduleId = payload.new?.id || payload.old?.id;
          console.log(`🔄 Your schedule ${eventType} detected (ID: ${scheduleId})`, payload);
          
          // Handle DELETE events specially - remove immediately from UI
          if (eventType === 'DELETE') {
            console.log(`🗑️ Your schedule ${scheduleId} was removed by Program Head`);
            setSchedules(prev => {
              const updated = prev.filter(s => s.id !== scheduleId);
              console.log(`✅ Schedule removed from My Schedule: ${prev.length} → ${updated.length}`);
              return updated;
            });
            return;
          }
          
          // For INSERT and UPDATE, refresh schedules
          console.log('🔄 Refreshing schedule data...');
          await fetchSchedules();
        }
      )
      .subscribe((status) => {
        console.log('📡 Faculty schedules subscription status:', status);
        if (status === 'SUBSCRIBED') {
          console.log('✅ Real-time updates active - Program Head changes will appear immediately');
        }
      });

    // Also listen for changes to subjects, locations, and courses that might affect schedule display
    const subjectsChannel = supabase
      .channel('faculty_schedule_subjects_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'subjects'
        },
        async (payload) => {
          console.log('🔄 Subject data changed, refreshing schedules...', payload);
          // Refresh schedules to get updated subject names
          await fetchSchedules();
        }
      )
      .subscribe();

    const locationsChannel = supabase
      .channel('faculty_schedule_locations_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'locations'
        },
        async (payload) => {
          console.log('🔄 Location data changed, refreshing schedules...', payload);
          // Refresh schedules to get updated location names
          await fetchSchedules();
        }
      )
      .subscribe();

    const coursesChannel = supabase
      .channel('faculty_schedule_courses_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'courses'
        },
        async (payload) => {
          console.log('🔄 Course data changed, refreshing schedules...', payload);
          // Refresh schedules to get updated course names
          await fetchSchedules();
        }
      )
      .subscribe();

    // Listen for schedule approval status changes - when faculty approves, schedule should appear
    const approvalsChannel = supabase
      .channel(`faculty_approvals_${facultyData.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'schedule_approvals',
          filter: `faculty_id=eq.${facultyData.id}`
        },
        async (payload) => {
          const approvalStatus = payload.new?.status;
          const scheduleId = payload.new?.schedule_id;
          console.log(`📋 Your approval status changed for schedule ${scheduleId}: ${approvalStatus}`, payload);
          
          if (approvalStatus === 'approved') {
            console.log(`✅ Schedule ${scheduleId} approved - updating My Schedule...`);
            // Refresh schedules to show newly approved schedule
            await fetchSchedules();
          }
        }
      )
      .subscribe((status) => {
        console.log('📡 Faculty approvals subscription status:', status);
        if (status === 'SUBSCRIBED') {
          console.log('✅ Approval updates active - approved schedules will appear immediately');
        }
      });

    // Listen for new notifications assigned to this faculty
    const notificationsChannel = supabase
      .channel(`faculty_notifications_${facultyData.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `recipient_id=eq.${facultyData.id} and recipient_type=eq.faculty`
        },
        async (payload) => {
          const notification = payload.new;
          console.log('🔔 New notification received:', notification);
          
          if (notification.notification_type === 'schedule_assigned') {
            console.log('📬 New schedule assigned - refreshing pending approvals...');
            // Refresh pending approvals to show new schedule
            await fetchPendingApprovals();
          }
        }
      )
      .subscribe((status) => {
        console.log('📡 Faculty notifications subscription status:', status);
        if (status === 'SUBSCRIBED') {
          console.log('✅ Notification updates active - new schedule assignments will appear immediately');
        }
      });

    // Cleanup subscriptions on unmount
    return () => {
      supabase.removeChannel(schedulesChannel);
      supabase.removeChannel(subjectsChannel);
      supabase.removeChannel(locationsChannel);
      supabase.removeChannel(coursesChannel);
      supabase.removeChannel(approvalsChannel);
      supabase.removeChannel(notificationsChannel);
    };
  }, [facultyData?.id]);

  const schedulesByDay = useMemo(() => {
    return daysOfWeek.reduce((acc, day) => {
      const daySchedules = schedules
        .filter(schedule => schedule.day_of_week === day)
        .sort((a, b) => a.start_time.localeCompare(b.start_time));
      acc[day] = daySchedules;
      return acc;
    }, {});
  }, [daysOfWeek, schedules]);

  const formatTime = (time) => {
    if (!time) return '';
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours, 10);
    const isPM = hour >= 12;
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${isPM ? 'PM' : 'AM'}`;
  };

  const hasAnySchedules = schedules.length > 0;

  const handleApproveSchedule = (schedule) => {
    // Prevent opening approval modal if schedule is already activated
    if (schedule.is_active === true) {
      console.log('⚠️ Schedule already activated - approval modal disabled');
      return;
    }
    setSelectedSchedule(schedule);
    setIsApprovalModalOpen(true);
  };

  const handleClickRejectedSchedule = async (schedule) => {
    console.log('📍 Rejected schedule card clicked:', schedule.id);
    
    try {
      // Fetch schedule details with all relations
      const { data: scheduleData, error: scheduleError } = await supabase
        .from('schedules')
        .select(`
          id,
          day_of_week,
          start_time,
          end_time,
          semester,
          year_level,
          section,
          subject:subject_id(id, subject_code, subject_name),
          course:course_id(id, course_name),
          course_subject_offering:course_subject_offering_id(id, offering_type),
          location:location_id(id, name),
          faculty:faculty_id(id, first_name, last_name)
        `)
        .eq('id', schedule.id)
        .single();
      
      if (scheduleError) {
        console.error('❌ Error fetching schedule details:', scheduleError);
        console.log('🔄 Attempting fallback: fetching schedule without relations...');
        const { data: fallbackData, error: fallbackError } = await supabase
          .from('schedules')
          .select('*')
          .eq('id', schedule.id)
          .single();
        
        if (fallbackError) {
          console.error('❌ Fallback also failed:', fallbackError);
          alert('Error loading schedule. Please try again.');
          return;
        }
        
        console.log('✅ Fetched schedule (without relations) as fallback:', fallbackData);
        setSelectedRejectedSchedule(fallbackData);
      } else {
        console.log('✅ Schedule details fetched:', scheduleData);
        setSelectedRejectedSchedule(scheduleData);
      }
      
      // Fetch approval info to get rejection reason
      const { data: approval, error: approvalError } = await supabase
        .from('schedule_approvals')
        .select('faculty_response')
        .eq('schedule_id', schedule.id)
        .eq('status', 'rejected')
        .single();
      
      if (!approvalError && approval) {
        setRejectionReason(approval.faculty_response);
        console.log('✅ Rejection reason fetched:', approval.faculty_response);
      }
      
      setIsRejectedModalOpen(true);
    } catch (err) {
      console.error('❌ Exception fetching rejected schedule:', err);
      alert('Error loading schedule: ' + err.message);
    }
  };

  const handleSubmitApproval = async (response) => {
    if (!selectedSchedule) return;

    setIsSubmittingApproval(true);
    try {
      console.log('📝 Submitting approval for schedule:', selectedSchedule.id);
      console.log('   Response:', response);
      console.log('   Pending approvals:', pendingApprovals);
      
      // Find the approval record for this schedule
      let approval = pendingApprovals.find(a => a.schedule_id === selectedSchedule.id);
      
      if (!approval) {
        console.warn('⚠️ Approval record not found in pendingApprovals, refreshing...');
        // Try to refresh pending approvals in case they weren't loaded yet
        const { data: refreshedApprovals } = await getFacultyPendingApprovals(facultyData.id);
        const approvalsArray = Array.isArray(refreshedApprovals) ? refreshedApprovals : [];
        setPendingApprovals(approvalsArray);
        approval = approvalsArray.find(a => a.schedule_id === selectedSchedule.id);
        
        if (!approval) {
          console.error('❌ Approval record still not found for schedule:', selectedSchedule.id);
          alert('Error: Could not find approval record for this schedule. Please refresh and try again.');
          return;
        }
      }

      console.log('✅ Found approval record:', approval);
      console.log('📝 Submitting approval response:', {
        approvalId: approval.id,
        action: response.action,
        reason: response.reason,
        availabilityNotes: response.availabilityNotes
      });

      // Submit the approval
      const result = await submitScheduleApproval(approval.id, response.action, {
        reason: response.reason,
        availabilityNotes: response.availabilityNotes
      });

      if (result.error) {
        console.error('❌ Error submitting approval:', result.error);
        alert('Error submitting approval: ' + (result.error.message || JSON.stringify(result.error)));
        return;
      }

      console.log('✅ Approval submitted successfully:', result.data);
      console.log('🔔 REAL-TIME NOTIFICATION DELIVERY:');
      console.log('   ✅ Notification has been created in the database');
      console.log('   📡 Real-time event is being broadcast to Program Head dashboard');
      console.log('   ⚡ Program Head should see the notification immediately (no refresh needed)');
      console.log('   📊 Notification Type:', response.action === 'approve' ? 'schedule_approved' : response.action === 'reject' ? 'schedule_rejected' : 'change_requested');
      
      // Refresh pending approvals
      const { data: pendingData } = await getFacultyPendingApprovals(facultyData.id);
      setPendingApprovals(Array.isArray(pendingData) ? pendingData : []);

      // Refresh schedules - NOTE: Even if faculty approved, schedule stays Pending until Program Head activates
      console.log('🔄 Refreshing schedules after faculty approval...');
      const { data: allSchedules } = await getSchedulesByFaculty(facultyData.id);

      if (allSchedules) {
        // Fetch approval statuses for all schedules
        const { data: approvals } = await supabase
          .from('schedule_approvals')
          .select('schedule_id, status')
          .eq('faculty_id', facultyData.id);

        // Create a map of schedule_id -> approval status
        const approvalMap = {};
        if (Array.isArray(approvals)) {
          approvals.forEach(approval => {
            approvalMap[approval.schedule_id] = approval.status;
          });
        }

        // Filter schedules to show only those that are BOTH approved by faculty AND activated by Program Head
        // IMPORTANT: Faculty approval alone does NOT make schedule active - it must also have is_active=true from Program Head
        const approvedSchedules = (Array.isArray(allSchedules) ? allSchedules : []).filter(schedule => {
          const status = approvalMap[schedule.id];
          const isApproved = status === 'approved';
          const isActive = schedule.is_active === true;
          
          console.log(`📋 Schedule ${schedule.id} after faculty approval:`, {
            approval_status: status,
            is_approved: isApproved,
            is_active: isActive,
            should_show: isApproved && isActive,
            note: 'Faculty approval alone does NOT activate - Program Head must activate'
          });
          
          // Only show if BOTH conditions are true:
          // 1. Faculty has approved (status === 'approved')
          // 2. Program Head has activated (is_active === true)
          return isApproved && isActive;
        });

        console.log(`✅ Refreshed: Showing ${approvedSchedules.length} active schedules (faculty approved + Program Head activated)`);
        setSchedules(approvedSchedules);
      }

      // Auto-clear related notifications for any response (approve, reject, request_change)
      try {
        console.log('🔔 Attempting to auto-clear notification for schedule:', selectedSchedule.id);
        console.log('   Faculty ID:', facultyData.id);
        console.log('   Response action:', response.action);
        
        // Update the database to mark as read
        const { data: clearedNotifs, error: notifUpdateError } = await supabase
          .from('notifications')
          .update({
            is_read: true,
            read_at: new Date().toISOString()
          })
          .eq('recipient_id', facultyData.id)
          .eq('recipient_type', 'faculty')
          .eq('related_schedule_id', selectedSchedule.id)
          .select();

        if (notifUpdateError) {
          console.error('❌ Error auto-clearing notification:', notifUpdateError);
        } else {
          console.log('✅ Auto-cleared notifications:', clearedNotifs?.length || 0, 'records updated');
          if (clearedNotifs && clearedNotifs.length > 0) {
            clearedNotifs.forEach(notif => {
              console.log('   - Notification ID:', notif.id, 'Type:', notif.notification_type);
            });
          }
        }

        // If faculty rejected, also clear the original "schedule_assigned" notification to prevent duplicates
        // when Program Head reassigns the schedule back to the same faculty
        if (response.action === 'reject') {
          console.log('🗑️ Clearing original schedule_assigned notification to prevent duplicates on reassignment');
          const { data: assignedNotifs, error: assignedError } = await supabase
            .from('notifications')
            .update({
              is_read: true,
              read_at: new Date().toISOString()
            })
            .eq('recipient_id', facultyData.id)
            .eq('recipient_type', 'faculty')
            .eq('related_schedule_id', selectedSchedule.id)
            .eq('notification_type', 'schedule_assigned')
            .select();

          if (assignedError) {
            console.error('❌ Error clearing schedule_assigned notification:', assignedError);
          } else {
            console.log('✅ Cleared schedule_assigned notification:', assignedNotifs?.length || 0, 'records updated');
          }
        }

        // Also directly remove from UI via the exposed method
        if (window.clearNotificationsForSchedule) {
          console.log('🎯 Calling clearNotificationsForSchedule directly...');
          window.clearNotificationsForSchedule(selectedSchedule.id);
        }
      } catch (notifErr) {
        console.error('❌ Exception auto-clearing notification:', notifErr);
      }

      // Close modal
      setIsApprovalModalOpen(false);
      setSelectedSchedule(null);
    } catch (error) {
      console.error('❌ Error submitting approval:', error);
      alert('Error: ' + error.message);
    } finally {
      setIsSubmittingApproval(false);
    }
  };

  const isPendingApproval = (scheduleId) => {
    return pendingApprovals.some(a => a.schedule_id === scheduleId && a.status === 'pending');
  };

  // Handle navigation from notification
  useEffect(() => {
    if (!scheduleIdToApprove) return;

    const openScheduleForApproval = async () => {
      console.log('📍 Notification navigation triggered for schedule:', scheduleIdToApprove);
      console.log('   Current pending approvals:', pendingApprovals.map(a => ({ schedule_id: a.schedule_id, status: a.status })));
      
      // VALIDATION: Check if faculty has a PENDING or REQUESTED_CHANGE approval for this schedule
      let hasApprovalToHandle = pendingApprovals.some(a => 
        a.schedule_id === scheduleIdToApprove && 
        (a.status === 'pending' || a.status === 'requested_change')
      );
      
      // If no approval found, try refreshing the list (in case it was just reassigned or changed)
      if (!hasApprovalToHandle) {
        console.warn('⚠️ No pending or change-requested approval found in current list, refreshing...');
        try {
          const { data: refreshedApprovals } = await getFacultyPendingApprovals(facultyData.id);
          const approvalsArray = Array.isArray(refreshedApprovals) ? refreshedApprovals : [];
          console.log('🔄 Refreshed pending approvals:', approvalsArray.map(a => ({ schedule_id: a.schedule_id, status: a.status })));
          
          // Check again with refreshed data - look for pending OR requested_change
          hasApprovalToHandle = approvalsArray.some(a => 
            a.schedule_id === scheduleIdToApprove && 
            (a.status === 'pending' || a.status === 'requested_change')
          );
          
          if (hasApprovalToHandle) {
            console.log('✅ Found approval to handle after refresh');
            setPendingApprovals(approvalsArray);
          } else {
            console.warn('⚠️ Still no pending or change-requested approval found even after refresh');
            console.log('   Refreshed approvals:', approvalsArray.map(a => ({ schedule_id: a.schedule_id, status: a.status })));
            console.log('❌ This schedule does not require approval from this faculty member');
            return;
          }
        } catch (error) {
          console.error('❌ Error refreshing pending approvals:', error);
          return;
        }
      }
      
      console.log('✅ Pending approval found, proceeding to open modal');
      
      // Always fetch the schedule directly from the database to ensure all relations are populated
      let schedule = null;
      try {
        console.log('🔍 Fetching schedule with all relations from database...');
        const { data, error } = await supabase
          .from('schedules')
          .select(`
            *,
            subject:subject_id(id, subject_code, subject_name),
            faculty:faculty_id(id, first_name, last_name),
            location:location_id(id, name),
            course:course_id(id, course_name),
            course_subject_offering:course_subject_offering_id(id, offering_type)
          `)
          .eq('id', scheduleIdToApprove)
          .single();

        if (error) {
          console.error('❌ Error fetching schedule:', error);
          console.error('   Error code:', error.code);
          console.error('   Error message:', error.message);
          
          // Try a simpler query without relations as fallback
          console.log('🔄 Attempting fallback: fetching schedule without relations...');
          const { data: fallbackData, error: fallbackError } = await supabase
            .from('schedules')
            .select('*')
            .eq('id', scheduleIdToApprove)
            .single();
          
          if (fallbackError) {
            console.error('❌ Fallback also failed:', fallbackError);
            alert('Error loading schedule. Please try again.');
            return;
          }
          
          schedule = fallbackData;
          console.log('✅ Fetched schedule (without relations) as fallback:', schedule);
          
          // CRITICAL: Enrich schedule with all related data after fallback
          console.log('🔄 Enriching schedule with all related data...');
          try {
            const [subjectsRes, facultyRes, locationsRes, coursesRes, offeringsRes] = await Promise.all([
              schedule.subject_id ? supabase.from('subjects').select('*').eq('id', schedule.subject_id).single() : Promise.resolve({ data: null }),
              schedule.faculty_id ? supabase.from('faculty').select('*').eq('id', schedule.faculty_id).single() : Promise.resolve({ data: null }),
              schedule.location_id ? supabase.from('locations').select('*').eq('id', schedule.location_id).single() : Promise.resolve({ data: null }),
              schedule.course_id ? supabase.from('courses').select('*').eq('id', schedule.course_id).single() : Promise.resolve({ data: null }),
              schedule.course_subject_offering_id ? supabase.from('course_subject_offerings').select('*').eq('id', schedule.course_subject_offering_id).single() : Promise.resolve({ data: null })
            ]);

            // Enrich schedule with all related data
            schedule = {
              ...schedule,
              subject: subjectsRes.data || null,
              faculty: facultyRes.data || null,
              location: locationsRes.data || null,
              course: coursesRes.data || null,
              course_subject_offering: offeringsRes.data || null
            };

            console.log('✅ Schedule enriched with all related data:', schedule);
            console.log('   Subject:', schedule.subject?.subject_code);
            console.log('   Location:', schedule.location?.name);
            console.log('   Course:', schedule.course?.course_name);
            console.log('   Component Type:', schedule.course_subject_offering?.offering_type);
          } catch (enrichErr) {
            console.error('❌ Error enriching schedule:', enrichErr);
            // Continue anyway - at least we have the schedule data
          }
        } else {
          schedule = data;
          console.log('✅ Fetched schedule with all relations:', schedule);
          console.log('   course_subject_offering_id:', schedule.course_subject_offering_id);
          console.log('   course_subject_offering:', schedule.course_subject_offering);
        }
      } catch (error) {
        console.error('❌ Exception fetching schedule:', error);
        console.error('   Error message:', error.message);
        console.error('   Stack:', error.stack);
        alert('Error loading schedule: ' + error.message);
        return;
      }

      // Ensure all related data is available for the approval modal (in case inline relations worked)
      if (!schedule?.subject && schedule?.subject_id) {
        try {
          console.log('⚠️ subject not populated, fetching separately...');
          const { data: subjectData, error: subjectError } = await supabase
            .from('subjects')
            .select('*')
            .eq('id', schedule.subject_id)
            .single();

          if (!subjectError && subjectData) {
            console.log('✅ Fetched subject:', subjectData.subject_code);
            schedule = {
              ...schedule,
              subject: subjectData
            };
          }
        } catch (subjectErr) {
          console.warn('⚠️ Exception fetching subject:', subjectErr);
        }
      }

      if (!schedule?.location && schedule?.location_id) {
        try {
          console.log('⚠️ location not populated, fetching separately...');
          const { data: locationData, error: locationError } = await supabase
            .from('locations')
            .select('*')
            .eq('id', schedule.location_id)
            .single();

          if (!locationError && locationData) {
            console.log('✅ Fetched location:', locationData.name);
            schedule = {
              ...schedule,
              location: locationData
            };
          }
        } catch (locationErr) {
          console.warn('⚠️ Exception fetching location:', locationErr);
        }
      }

      if (!schedule?.course && schedule?.course_id) {
        try {
          console.log('⚠️ course not populated, fetching separately...');
          const { data: courseData, error: courseError } = await supabase
            .from('courses')
            .select('*')
            .eq('id', schedule.course_id)
            .single();

          if (!courseError && courseData) {
            console.log('✅ Fetched course:', courseData.course_name);
            schedule = {
              ...schedule,
              course: courseData
            };
          }
        } catch (courseErr) {
          console.warn('⚠️ Exception fetching course:', courseErr);
        }
      }

      if (!schedule?.course_subject_offering && schedule?.course_subject_offering_id) {
        try {
          console.log('⚠️ course_subject_offering not populated, fetching separately...');
          const { data: offeringData, error: offeringError } = await supabase
            .from('course_subject_offerings')
            .select('*')
            .eq('id', schedule.course_subject_offering_id)
            .single();

          if (!offeringError && offeringData) {
            console.log('✅ Fetched offering_type:', offeringData.offering_type);
            schedule = {
              ...schedule,
              course_subject_offering: offeringData
            };
          }
        } catch (offeringErr) {
          console.warn('⚠️ Exception fetching course_subject_offering:', offeringErr);
        }
      }

      if (!schedule?.faculty && schedule?.faculty_id) {
        try {
          console.log('⚠️ faculty not populated, fetching separately...');
          const { data: facultyData, error: facultyError } = await supabase
            .from('faculty')
            .select('*')
            .eq('id', schedule.faculty_id)
            .single();

          if (!facultyError && facultyData) {
            console.log('✅ Fetched faculty:', facultyData.first_name, facultyData.last_name);
            schedule = {
              ...schedule,
              faculty: facultyData
            };
          }
        } catch (facultyErr) {
          console.warn('⚠️ Exception fetching faculty:', facultyErr);
        }
      }

      if (schedule) {
        console.log('✅ Found schedule, opening approval modal:', schedule);
        console.log('   course_subject_offering:', schedule.course_subject_offering);
        console.log('   course_subject_offering_id:', schedule.course_subject_offering_id);
        console.log('   offering_type:', schedule.course_subject_offering?.offering_type);
        setSelectedSchedule(schedule);
        setIsApprovalModalOpen(true);
        setHighlightedScheduleId(scheduleIdToApprove);
        
        // Scroll to the schedule if it's visible
        setTimeout(() => {
          const element = document.getElementById(`schedule-${scheduleIdToApprove}`);
          if (element) {
            console.log('🎯 Scrolling to schedule element');
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
            // Add highlight effect
            element.classList.add('ring-2', 'ring-blue-400', 'bg-blue-50');
          } else {
            console.log('ℹ️ Schedule element not visible in DOM (not approved yet)');
          }
        }, 100);
      } else {
        console.warn('⚠️ Schedule not found:', scheduleIdToApprove);
        alert('Schedule not found. Please try again.');
      }
    };

    openScheduleForApproval();
    
    // Reset the scheduleIdToApprove after modal is opened to allow re-triggering
    return () => {
      // This cleanup will run before the next effect, allowing the same ID to trigger again
    };
  }, [scheduleIdToApprove, schedules, pendingApprovals]);

  return (
    <div className="space-y-6">
      {/* Page Title */}
      <div>
        <h1 className="text-2xl font-bold text-gray-800">My Schedule</h1>
      </div>

      {/* Weekly Schedule */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="p-6 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-800">Weekly Schedule</h2>
            <p className="text-sm text-gray-600 mt-1">Your assigned classes for this week</p>
          </div>
          {!isLoading && !error && schedules.length > 0 && (
            <div className="flex bg-white border border-slate-200 rounded-xl p-1 gap-1 shadow-sm">
              <button
                onClick={() => setViewMode('list')}
                title="List View"
                className={`p-2.5 rounded-lg transition-all duration-200 focus:outline-none focus:ring-0 ${
                  viewMode === 'list'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-slate-700 bg-white hover:bg-slate-50 hover:text-blue-600'
                }`}
                style={{ outline: 'none', border: 'none' }}
                onMouseDown={(e) => e.preventDefault()}
              >
                <List size={18} />
              </button>
              <button
                onClick={() => setViewMode('timetable')}
                title="Timetable View"
                className={`p-2.5 rounded-lg transition-all duration-200 focus:outline-none focus:ring-0 ${
                  viewMode === 'timetable'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-slate-700 bg-white hover:bg-slate-50 hover:text-blue-600'
                }`}
                style={{ outline: 'none', border: 'none' }}
                onMouseDown={(e) => e.preventDefault()}
              >
                <Grid3x3 size={18} />
              </button>
            </div>
          )}
        </div>

        <div className="p-6">
          {isLoading ? (
            <div className="text-center py-12 text-gray-500">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto mb-4"></div>
              Loading your schedule...
            </div>
          ) : error ? (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-4 flex items-start gap-3">
              <AlertCircle size={20} className="mt-0.5" />
              <div>
                <p className="font-medium">Unable to load schedule</p>
                <p className="text-sm">{error}</p>
              </div>
            </div>
          ) : viewMode === 'timetable' ? (
            <div 
              className="overflow-x-auto" 
              style={{ transformOrigin: 'top left' }}
              onScroll={handleScrollbarVisibility}
            >
              <style>{`
                div::-webkit-scrollbar {
                  height: 8px;
                }
                div::-webkit-scrollbar-track {
                  background: transparent;
                }
                div::-webkit-scrollbar-thumb {
                  background: ${showScrollbar ? '#cbd5e1' : 'transparent'};
                  border-radius: 4px;
                  transition: background 0.3s ease;
                }
                div::-webkit-scrollbar-thumb:hover {
                  background: #94a3b8;
                }
              `}</style>
              <div className="min-w-[1200px] bg-white rounded-lg border border-gray-200" style={{ transform: 'scale(0.9)', transformOrigin: 'top left', width: '111.11%' }}>
                {/* Header */}
                <div className="grid grid-cols-8 border-b-2 border-gray-200 bg-gradient-to-r from-gray-50 to-gray-100">
                  <div className="p-4 text-sm font-bold text-gray-800 border-r border-gray-200 uppercase tracking-wide flex items-center justify-center text-center">
                    Time
                  </div>
                  {daysOfWeek.map(day => (
                    <div
                      key={day}
                      className="p-4 text-sm font-bold text-gray-800 text-center border-r border-gray-200 last:border-r-0 uppercase tracking-wide"
                    >
                      {day.substring(0, 3)}
                    </div>
                  ))}
                </div>

                {/* Time Grid with Day Columns */}
                <div className="grid grid-cols-8">
                  {/* Time Labels Column */}
                  <div className="border-r border-gray-200 bg-gray-50/80">
                    {timeSlots.map((timeSlot) => (
                      <div
                        key={timeSlot}
                        className="p-3 text-xs font-semibold text-gray-600 border-b border-gray-100 h-[60px] flex items-center justify-center text-center"
                      >
                        {formatTime(timeSlot)}
                      </div>
                    ))}
                  </div>

                  {/* Day Columns */}
                  {daysOfWeek.map(day => {
                    const daySchedules = schedulesByDay[day] || [];
                    const totalMinutes = (21 - 7) * 60; // 7 AM to 9 PM = 14 hours
                    const containerHeight = totalMinutes; // 60px per hour = 840px total

                    return (
                      <div
                        key={day}
                        className="border-r border-gray-200 last:border-r-0 relative"
                        style={{ height: `${containerHeight}px` }}
                      >
                        {/* Time slot grid lines */}
                        {timeSlots.map((timeSlot) => (
                          <div
                            key={timeSlot}
                            className="absolute w-full border-b border-gray-100 h-[60px]"
                            style={{
                              top: `${timeSlots.indexOf(timeSlot) * 60}px`
                            }}
                          />
                        ))}

                        {/* Schedule Cards */}
                        {daySchedules.map((schedule) => {
                          const startMinutes = parseInt(schedule.start_time.split(':')[0]) * 60 + parseInt(schedule.start_time.split(':')[1]);
                          const endMinutes = parseInt(schedule.end_time.split(':')[0]) * 60 + parseInt(schedule.end_time.split(':')[1]);
                          const firstSlotMinutes = 7 * 60; // 7 AM
                          const topOffset = (startMinutes - firstSlotMinutes);
                          const height = (endMinutes - startMinutes);

                          const colorScheme = schedule.is_active === true
                            ? { bg: 'bg-green-50', border: 'border-l-green-500', hover: 'hover:bg-green-100' }
                            : { bg: 'bg-blue-50', border: 'border-l-blue-500', hover: 'hover:bg-blue-100' };

                          return (
                            <div
                              key={schedule.id}
                              onClick={() => handleApproveSchedule(schedule)}
                              className={`absolute border-l-4 rounded-lg p-2.5 overflow-hidden shadow-md transition-all duration-200 ${
                                schedule.is_active === true
                                  ? 'opacity-75'
                                  : 'cursor-pointer ' + colorScheme.hover
                              } ${colorScheme.bg} ${colorScheme.border}`}
                              style={{
                                top: `${topOffset}px`,
                                left: '4px',
                                right: '4px',
                                height: `${height}px`,
                                minHeight: '50px'
                              }}
                            >
                              <div className="flex flex-col h-full">
                                {/* Subject Code & Status */}
                                <div className="flex items-start justify-between gap-1 mb-0.5">
                                  <div className="text-xs font-bold text-gray-900 leading-tight truncate">
                                    {schedule.subject?.subject_code || 'N/A'}
                                  </div>
                                  {schedule.is_active && (
                                    <span className="text-[9px] font-bold px-1.5 py-0.5 bg-green-200 text-green-800 rounded whitespace-nowrap flex-shrink-0">
                                      Active
                                    </span>
                                  )}
                                  {isPendingApproval(schedule.id) && (
                                    <span className="text-[9px] font-bold px-1.5 py-0.5 bg-amber-200 text-amber-800 rounded whitespace-nowrap flex-shrink-0">
                                      Pending
                                    </span>
                                  )}
                                </div>

                                {/* Subject Name */}
                                <div className="text-[10px] font-medium text-gray-700 line-clamp-2 mb-1.5 leading-tight">
                                  {schedule.subject?.subject_name || 'Unknown Subject'}
                                </div>

                                {/* Details Section */}
                                <div className="space-y-1 mt-auto">
                                  <div className="flex items-center gap-1 text-[10px] text-gray-600">
                                    <span className="truncate font-semibold">
                                      {schedule.course_subject_offering?.offering_type === 'LEC' 
                                        ? 'Lec' 
                                        : schedule.course_subject_offering?.offering_type === 'LAB'
                                          ? 'Lab'
                                        : '—'}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-1 text-[10px] text-gray-600">
                                    <span className="truncate font-semibold">
                                      Units:{' '}
                                      {(() => {
                                        const lec = schedule.course_subject_offering?.lecture_units;
                                        const lab = schedule.course_subject_offering?.lab_units;
                                        const hasAny = typeof lec === 'number' || typeof lab === 'number';
                                        return hasAny ? (lec || 0) + (lab || 0) : '—';
                                      })()}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-1 text-[10px] text-gray-600">
                                    <span className="truncate font-semibold" title={schedule.course?.course_name || 'TBD'}>
                                      {schedule.course?.course_code || schedule.course?.course_name || 'TBD'}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-1 text-[10px] text-gray-600">
                                    <span className="truncate font-semibold">{schedule.year_level} • Section {schedule.section}</span>
                                  </div>
                                  <div className="flex items-center gap-1 text-[10px] text-gray-600">
                                    <MapPin size={10} className="text-gray-600 flex-shrink-0" />
                                    <span className="truncate font-semibold">{schedule.location?.name || 'N/A'}</span>
                                  </div>
                                  <div className="flex items-center gap-1 text-[10px] font-semibold text-gray-700">
                                    <Clock size={10} className="text-gray-600 flex-shrink-0" />
                                    <span className="truncate">
                                      {formatTime(schedule.start_time)} - {formatTime(schedule.end_time)}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {daysOfWeek.map((day) => {
                const daySchedules = schedulesByDay[day] || [];

                return (
                  <div key={day} className="border border-gray-200 rounded-lg overflow-hidden">
                    {/* Day Header */}
                    <div className="bg-gray-50 px-4 py-3 border-b border-gray-200 flex items-center justify-between">
                      <h3 className="font-semibold text-gray-800">{day}</h3>
                      {daySchedules.length > 0 && (
                        <span className="text-xs text-gray-500">
                          {daySchedules.length} {daySchedules.length === 1 ? 'class' : 'classes'}
                        </span>
                      )}
                    </div>

                    {/* Classes for the day */}
                    <div className="p-4 space-y-3">
                      {daySchedules.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">
                          <BookOpen size={32} className="mx-auto mb-2 text-gray-400" />
                          <p className="text-sm">No classes scheduled</p>
                        </div>
                      ) : (
                        daySchedules.map((schedule) => {
                          const hasPendingApproval = isPendingApproval(schedule.id);
                          const isHighlighted = highlightedScheduleId === schedule.id;
                          const isActive = schedule.is_active === true;
                          return (
                            <div
                              key={schedule.id}
                              id={`schedule-${schedule.id}`}
                              className={`rounded-xl border-2 p-5 transition-all ${
                                isHighlighted 
                                  ? 'border-blue-400 bg-blue-50 shadow-lg' 
                                  : isActive
                                  ? 'border-green-200 bg-green-50 shadow-md hover:shadow-lg'
                                  : 'border-slate-200 bg-white shadow-md hover:shadow-lg'
                              }`}
                            >
                              {/* Header with Time and Status */}
                              <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-3">
                                  <Clock size={18} className={isActive ? 'text-green-600' : 'text-blue-600'} />
                                  <div>
                                    <p className={`font-bold text-lg ${isActive ? 'text-green-900' : 'text-slate-900'}`}>
                                      {formatTime(schedule.start_time)} - {formatTime(schedule.end_time)}
                                    </p>
                                    <p className="text-xs text-slate-500 mt-0.5">
                                      {schedule.subject?.subject_code || 'N/A'}
                                    </p>
                                  </div>
                                </div>
                                {isActive && (
                                  <span className="px-3 py-1 bg-green-600 text-white text-xs font-bold rounded-full">
                                    Active
                                  </span>
                                )}
                              </div>

                              {/* Subject Name */}
                              <p className="text-sm font-semibold text-slate-800 mb-4">
                                {schedule.subject?.subject_name || 'Unknown Subject'}
                              </p>

                              {/* Details Grid */}
                              <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-4">
                                <div className="flex items-start gap-2">
                                  <MapPin size={16} className="mt-0.5 text-green-600 flex-shrink-0" />
                                  <div className="min-w-0">
                                    <p className="text-xs text-slate-600 font-semibold uppercase">Location</p>
                                    <p className="text-sm font-medium text-slate-900 truncate">{schedule.location?.name || 'TBD'}</p>
                                  </div>
                                </div>
                                <div className="flex items-start gap-2">
                                  <BookOpen size={16} className="mt-0.5 text-purple-600 flex-shrink-0" />
                                  <div className="min-w-0">
                                    <p className="text-xs text-slate-600 font-semibold uppercase">Course</p>
                                    <p className="text-sm font-medium text-slate-900 truncate" title={schedule.course?.course_name || 'TBD'}>
                                      {schedule.course?.course_code || schedule.course?.course_name || 'TBD'}
                                    </p>
                                  </div>
                                </div>
                                <div className="flex items-start gap-2">
                                  <Calendar size={16} className="mt-0.5 text-blue-600 flex-shrink-0" />
                                  <div className="min-w-0">
                                    <p className="text-xs text-slate-600 font-semibold uppercase">Semester</p>
                                    <p className="text-sm font-medium text-slate-900">
                                      {schedule.semester === 1 ? '1st' : schedule.semester === 2 ? '2nd' : schedule.semester}
                                    </p>
                                  </div>
                                </div>
                                <div className="flex items-start gap-2">
                                  <User size={16} className="mt-0.5 text-orange-600 flex-shrink-0" />
                                  <div className="min-w-0">
                                    <p className="text-xs text-slate-600 font-semibold uppercase">Type</p>
                                    <p className="text-sm font-medium text-slate-900">
                                      {schedule.course_subject_offering?.offering_type === 'LEC'
                                        ? 'Lecture'
                                        : schedule.course_subject_offering?.offering_type === 'LAB'
                                          ? 'Lab'
                                          : '—'}
                                    </p>
                                  </div>
                                </div>
                                <div className="flex items-start gap-2">
                                  <BookOpen size={16} className="mt-0.5 text-slate-600 flex-shrink-0" />
                                  <div className="min-w-0">
                                    <p className="text-xs text-slate-600 font-semibold uppercase">Units</p>
                                    <p className="text-sm font-medium text-slate-900">
                                      {(() => {
                                        const lec = schedule.course_subject_offering?.lecture_units;
                                        const lab = schedule.course_subject_offering?.lab_units;
                                        const hasAny = typeof lec === 'number' || typeof lab === 'number';
                                        return hasAny ? (lec || 0) + (lab || 0) : '—';
                                      })()}
                                    </p>
                                  </div>
                                </div>
                              </div>

                              {/* Year & Section */}
                              <div className="pt-4 border-t border-slate-200">
                                <p className="text-xs text-slate-600 font-semibold uppercase mb-1">Class</p>
                                <p className="text-sm font-medium text-slate-900">
                                  {schedule.year_level} • Section {schedule.section}
                                </p>
                              </div>

                              {/* Action Button */}
                              {hasPendingApproval && !isActive && (
                                <div className="mt-4 pt-4 border-t border-slate-200">
                                  <button
                                    onClick={() => handleApproveSchedule(schedule)}
                                    className="w-full px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold text-sm transition-colors"
                                  >
                                    Review & Respond
                                  </button>
                                </div>
                              )}
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Legend */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Schedule Legend</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex items-center space-x-3">
            <Clock className="text-blue-600" size={20} />
            <div>
              <p className="text-sm font-medium text-gray-800">Time</p>
              <p className="text-xs text-gray-600">Class duration</p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <MapPin className="text-green-600" size={20} />
            <div>
              <p className="text-sm font-medium text-gray-800">Location</p>
              <p className="text-xs text-gray-600">Room/Building</p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <BookOpen className="text-purple-600" size={20} />
            <div>
              <p className="text-sm font-medium text-gray-800">Subject</p>
              <p className="text-xs text-gray-600">Course details</p>
            </div>
          </div>
        </div>
      </div>

      {/* Rejected Schedules Section */}
      {rejectedSchedules.length > 0 && (
        <div className="bg-white rounded-lg border border-red-200 overflow-hidden">
          <div className="p-6 border-b border-red-200 bg-red-50">
            <div className="flex items-center gap-2">
              <AlertCircle className="text-red-600" size={20} />
              <div>
                <h2 className="text-lg font-semibold text-red-900">Rejected Schedules</h2>
                <p className="text-sm text-red-700 mt-1">Schedules that were rejected. Click to view details and wait for reassignment.</p>
              </div>
            </div>
          </div>

          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {rejectedSchedules.map((schedule) => (
                <div
                  key={schedule.id}
                  onClick={() => handleClickRejectedSchedule(schedule)}
                  className="rounded-lg border-2 border-red-200 bg-red-50 p-4 cursor-pointer hover:shadow-lg hover:border-red-400 transition-all"
                >
                  {/* Header */}
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="font-bold text-red-900">
                        {formatTime(schedule.start_time)} - {formatTime(schedule.end_time)}
                      </p>
                      <p className="text-xs text-red-700 mt-0.5">
                        {schedule.subject?.subject_code || 'N/A'}
                      </p>
                    </div>
                    <span className="px-2 py-1 bg-red-600 text-white text-xs font-bold rounded">
                      Rejected
                    </span>
                  </div>

                  {/* Subject Name */}
                  <p className="text-sm font-semibold text-red-900 mb-3">
                    {schedule.subject?.subject_name || 'Unknown Subject'}
                  </p>

                  {/* Details Grid */}
                  <div className="space-y-2 mb-3">
                    <div className="flex items-start gap-2">
                      <MapPin size={14} className="mt-0.5 text-red-600 flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="text-xs text-red-700 font-semibold">Location</p>
                        <p className="text-xs font-medium text-red-900 truncate">{schedule.location?.name || 'TBD'}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <BookOpen size={14} className="mt-0.5 text-red-600 flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="text-xs text-red-700 font-semibold">Course</p>
                        <p className="text-xs font-medium text-red-900 truncate">{schedule.course?.course_name || 'TBD'}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <User size={14} className="mt-0.5 text-red-600 flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="text-xs text-red-700 font-semibold">Type</p>
                        <p className="text-xs font-medium text-red-900">
                          {schedule.course_subject_offering?.offering_type === 'LEC'
                            ? 'Lecture'
                            : schedule.course_subject_offering?.offering_type === 'LAB'
                              ? 'Lab'
                              : '—'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Day & Section */}
                  <div className="pt-3 border-t border-red-200">
                    <p className="text-xs text-red-700 font-semibold mb-1">Class</p>
                    <p className="text-xs font-medium text-red-900">
                      {schedule.day_of_week} • {schedule.year_level} Year • Section {schedule.section}
                    </p>
                  </div>

                  {/* Click to View Button */}
                  <div className="mt-3 pt-3 border-t border-red-200">
                    <p className="text-xs text-red-600 font-semibold text-center">
                      Click to view details
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Rejected Schedule Modal */}
      {isRejectedModalOpen && selectedRejectedSchedule && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity animate-in fade-in duration-200"></div>
          <div className="relative w-full max-w-2xl transform rounded-2xl bg-white shadow-2xl transition-all animate-in scale-in-95 fade-in duration-300 overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-red-600 to-red-700 px-6 py-6">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-white/20 rounded-lg backdrop-blur-sm border border-white/20">
                  <AlertCircle size={20} className="text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">Rejected Schedule</h2>
                  <p className="text-red-100/90 mt-0.5 text-xs font-medium">Awaiting Program Head reassignment</p>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="px-6 py-6 space-y-4 max-h-[70vh] overflow-y-auto">
              {/* Schedule Details */}
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-3">
                <p className="text-xs font-bold text-slate-700 uppercase tracking-wide">Schedule Details</p>
                
                <div className="space-y-2.5">
                  {/* Subject */}
                  <div className="flex items-start gap-3">
                    <span className="text-slate-400 text-sm font-semibold min-w-fit">Subject:</span>
                    <p className="text-sm font-semibold text-slate-900">{selectedRejectedSchedule.subject?.subject_name}</p>
                  </div>

                  {/* Component Type */}
                  {selectedRejectedSchedule.course_subject_offering?.offering_type && (
                    <div className="flex items-start gap-3">
                      <span className="text-slate-400 text-sm font-semibold min-w-fit">Component:</span>
                      <p className="text-sm text-slate-700">
                        {selectedRejectedSchedule.course_subject_offering.offering_type === 'LEC' ? 'Lecture (LEC)' : selectedRejectedSchedule.course_subject_offering.offering_type === 'LAB' ? 'Laboratory (LAB)' : selectedRejectedSchedule.course_subject_offering.offering_type}
                      </p>
                    </div>
                  )}

                  {/* Program/Course */}
                  {selectedRejectedSchedule.course && (
                    <div className="flex items-start gap-3">
                      <span className="text-slate-400 text-sm font-semibold min-w-fit">Program:</span>
                      <p className="text-sm text-slate-700">{selectedRejectedSchedule.course.course_name}</p>
                    </div>
                  )}

                  {/* Location */}
                  {selectedRejectedSchedule.location && (
                    <div className="flex items-start gap-3">
                      <span className="text-slate-400 text-sm font-semibold min-w-fit">Location:</span>
                      <p className="text-sm text-slate-700">{selectedRejectedSchedule.location.name}</p>
                    </div>
                  )}

                  {/* Schedule Time */}
                  <div className="flex items-start gap-3">
                    <span className="text-slate-400 text-sm font-semibold min-w-fit">Schedule:</span>
                    <p className="text-sm text-slate-700">{selectedRejectedSchedule.day_of_week} • {formatTime(selectedRejectedSchedule.start_time)} - {formatTime(selectedRejectedSchedule.end_time)}</p>
                  </div>

                  {/* Year & Section */}
                  {(selectedRejectedSchedule.year_level || selectedRejectedSchedule.section) && (
                    <div className="flex items-start gap-3">
                      <span className="text-slate-400 text-sm font-semibold min-w-fit">Class:</span>
                      <p className="text-sm text-slate-700">{selectedRejectedSchedule.year_level} Year {selectedRejectedSchedule.section && `- Section ${selectedRejectedSchedule.section}`}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Rejection Reason */}
              {rejectionReason && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="text-xs font-bold text-red-700 uppercase tracking-wide mb-2">Rejection Reason</p>
                  <p className="text-sm text-red-900">{rejectionReason}</p>
                </div>
              )}

              {/* Status Message */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-900">
                  This schedule has been rejected. The Program Head will review and reassign it to you or another faculty member. You will receive a notification once a new assignment is made.
                </p>
              </div>
            </div>

            {/* Footer */}
            <div className="border-t border-slate-200 px-6 py-4 bg-slate-50 flex justify-end gap-3">
              <button
                onClick={() => {
                  setIsRejectedModalOpen(false);
                  setSelectedRejectedSchedule(null);
                  setRejectionReason('');
                }}
                className="px-4 py-2.5 bg-slate-200 text-slate-900 rounded-lg hover:bg-slate-300 font-semibold text-sm transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Schedule Approval Modal */}
      <ScheduleApprovalModal
        isOpen={isApprovalModalOpen}
        onClose={() => {
          console.log('🔄 Modal closed - resetting state to allow re-opening');
          setIsApprovalModalOpen(false);
          setSelectedSchedule(null);
          setHighlightedScheduleId(null);
          // Notify parent component that modal was closed so it can reset scheduleIdToApprove
          if (onScheduleApprovalModalClosed) {
            onScheduleApprovalModalClosed();
          }
        }}
        schedule={selectedSchedule}
        onSubmit={handleSubmitApproval}
        isLoading={isSubmittingApproval}
      />
    </div>
  );
}

export default FacultySchedule;
