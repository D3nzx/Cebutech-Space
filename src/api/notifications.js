import { supabase } from '../lib/supabaseClient';


export const getNotifications = async (recipientId, recipientType) => {
  try {
    console.log('🔔 Fetching notifications for:', { recipientId, recipientType });

    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('recipient_id', recipientId)
      .eq('recipient_type', recipientType)
      .eq('is_read', false)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      console.error('❌ Error fetching notifications:', error);
      console.error('   Error details:', {
        message: error.message,
        code: error.code,
        details: error.details
      });
      return { data: null, error };
    }

    console.log('✅ Fetched notifications:', data?.length || 0);
    if (data && data.length > 0) {
      console.log('   First notification:', data[0]);
    }
    return { data, error: null };
  } catch (error) {
    console.error('Error in getNotifications:', error);
    return { data: null, error };
  }
};


export const getUnreadNotificationsCount = async (recipientId, recipientType) => {
  try {
    const { data, error, count } = await supabase
      .from('notifications')
      .select('id', { count: 'exact' })
      .eq('recipient_id', recipientId)
      .eq('recipient_type', recipientType)
      .eq('is_read', false);

    if (error) {
      console.error('❌ Error fetching unread count:', error);
      return { count: 0, error };
    }

    return { count: count || 0, error: null };
  } catch (error) {
    console.error('Error in getUnreadNotificationsCount:', error);
    return { count: 0, error };
  }
};


export const createNotification = async (notification) => {
  try {
    console.log('📨 Creating notification:', notification);
    console.log('   Recipient ID:', notification.recipientId);
    console.log('   Recipient Type:', notification.recipientType);
    console.log('   Type:', notification.type);
    console.log('   Program ID:', notification.programId);
    console.log('   Program Head ID:', notification.programHeadId);

    const baseInsertData = {
      recipient_id: notification.recipientId,
      recipient_type: notification.recipientType,
      notification_type: notification.type,
      title: notification.title,
      message: notification.message,
      related_schedule_id: notification.scheduleId || null,
      related_approval_id: notification.approvalId || null,
      is_read: false,
      created_at: new Date().toISOString()
    };

    const optionalInsertData = {};
    if (notification.approvalRequestId != null) {
      optionalInsertData.related_approval_request_id = notification.approvalRequestId;
    }
    if (notification.relatedUserId != null) {
      optionalInsertData.related_user_id = notification.relatedUserId;
    }
    if (notification.relatedUserType != null) {
      optionalInsertData.related_user_type = notification.relatedUserType;
    }

    const payloads = [
      { ...baseInsertData, ...optionalInsertData },
      baseInsertData
    ];

    console.log('   Insert payloads:', payloads);

    let lastError = null;
    for (const insertData of payloads) {
      const { data, error } = await supabase
        .from('notifications')
        .insert(insertData)
        .select();

      if (!error) {
        console.log('✅ Notification created successfully');
        console.log('   Data:', data);
        return { data: data?.[0], error: null };
      }

      const isSchemaError = error?.code === '42703' || /column .* does not exist/i.test(error?.message || '') || /does not exist/i.test(error?.details || '');
      if (!isSchemaError) {
        console.error('❌ Error creating notification:', error);
        console.error('   Error message:', error.message);
        console.error('   Error code:', error.code);
        console.error('   Error details:', error.details);
        console.error('   Full error:', JSON.stringify(error, null, 2));
        return { data: null, error };
      }

      lastError = error;
      console.warn('⚠️ Notification insert hit a schema mismatch, retrying without optional columns:', error.message);
    }

    console.error('❌ Error creating notification after retrying:', lastError);
    return { data: null, error: lastError };
  } catch (error) {
    console.error('❌ Exception in createNotification:', error);
    console.error('   Error message:', error.message);
    console.error('   Stack:', error.stack);
    return { data: null, error };
  }
};


export const markNotificationAsRead = async (notificationId) => {
  try {
    const { data, error } = await supabase
      .from('notifications')
      .update({
        is_read: true,
        read_at: new Date().toISOString()
      })
      .eq('id', notificationId)
      .select();

    if (error) {
      console.error('❌ Error marking as read:', error);
      return { data: null, error };
    }

    return { data: data?.[0], error: null };
  } catch (error) {
    console.error('Error in markNotificationAsRead:', error);
    return { data: null, error };
  }
};


export const markAllNotificationsAsRead = async (recipientId, recipientType) => {
  try {
    const { data, error } = await supabase
      .from('notifications')
      .update({
        is_read: true,
        read_at: new Date().toISOString()
      })
      .eq('recipient_id', recipientId)
      .eq('recipient_type', recipientType)
      .eq('is_read', false)
      .select();

    if (error) {
      console.error('❌ Error marking all as read:', error);
      return { data: null, error };
    }

    console.log('✅ All notifications marked as read');
    return { data, error: null };
  } catch (error) {
    console.error('Error in markAllNotificationsAsRead:', error);
    return { data: null, error };
  }
};


export const deleteNotification = async (notificationId) => {
  try {
    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('id', notificationId);

    if (error) {
      console.error('❌ Error deleting notification:', error);
      return { error };
    }

    console.log('✅ Notification deleted');
    return { error: null };
  } catch (error) {
    console.error('Error in deleteNotification:', error);
    return { error };
  }
};


export const deleteNotificationsForSchedule = async (scheduleId) => {
  try {
    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('related_schedule_id', scheduleId);

    if (error) {
      console.error('❌ Error deleting notifications for schedule:', error);
      return { error };
    }

    console.log('✅ Notifications for schedule deleted');
    return { error: null };
  } catch (error) {
    console.error('Error in deleteNotificationsForSchedule:', error);
    return { error };
  }
};


export const notifyScheduleAssigned = async (facultyId, scheduleId, scheduleDetails, programId = null, programHeadId = null) => {
  return createNotification({
    recipientId: facultyId,
    recipientType: 'faculty',
    type: 'schedule_assigned',
    title: 'New Schedule Assigned',
    message: `You have been assigned to teach ${scheduleDetails.subjectCode} - awaiting your approval`,
    scheduleId,
    programId,
    programHeadId
  });
};


export const notifyScheduleApproved = async (programHeadId, scheduleId, facultyName, subjectCode, programId = null) => {
  return createNotification({
    recipientId: programHeadId,
    recipientType: 'program_head',
    type: 'schedule_approved',
    title: 'Schedule Approved',
    message: `${facultyName} approved the schedule for ${subjectCode}`,
    scheduleId,
    programId,
    programHeadId
  });
};


export const notifyScheduleRejected = async (programHeadId, scheduleId, facultyName, subjectCode, reason, programId = null) => {
  return createNotification({
    recipientId: programHeadId,
    recipientType: 'program_head',
    type: 'schedule_rejected',
    title: 'Schedule Rejected',
    message: `${facultyName} rejected the schedule for ${subjectCode} - ${reason}`,
    scheduleId,
    programId,
    programHeadId
  });
};


export const notifyChangeRequested = async (programHeadId, scheduleId, facultyName, subjectCode, reason, programId = null) => {
  return createNotification({
    recipientId: programHeadId,
    recipientType: 'program_head',
    type: 'change_requested',
    title: 'Schedule Change Requested',
    message: `${facultyName} requested changes to ${subjectCode} - ${reason}`,
    scheduleId,
    programId,
    programHeadId
  });
};


export const notifyScheduleUpdated = async (facultyId, scheduleId, details, programId = null, programHeadId = null) => {
  
  const subjectCode = typeof details === 'string' ? details : details?.subjectCode || 'Unknown Subject';
  
  
  const message = `You have been assigned to teach ${subjectCode} - awaiting your approval`;
  
  return createNotification({
    recipientId: facultyId,
    recipientType: 'faculty',
    type: 'schedule_updated',
    title: 'New Schedule Assigned',
    message: message,
    scheduleId,
    programId,
    programHeadId
  });
};


export const notifyPendingApprovals = async (programHeadId, count, programId = null) => {
  return createNotification({
    recipientId: programHeadId,
    recipientType: 'program_head',
    type: 'pending_approvals',
    title: 'Pending Scheduling Requests',
    message: `You have ${count} schedule${count !== 1 ? 's' : ''} awaiting faculty approval`,
    programId,
    programHeadId
  });
};

// Report approval workflow notifications
export const notifyDeanForReportReview = async ({ deanId, approvalId, facultyLabel }) => {
  // First get the dean_id from deans table
  let actualDeanId = deanId;
  if (!actualDeanId) {
    const { data: deans } = await supabase.from('deans').select('id').limit(1).maybeSingle();
    actualDeanId = deans?.id;
  }
  
  if (!actualDeanId) {
    console.warn('No dean found for notification');
    return { data: null, error: new Error('No dean found') };
  }

  const { data, error } = await supabase
    .from('notifications')
    .insert({
      recipient_id: actualDeanId,
      recipient_type: 'dean',
      notification_type: 'report_review',
      title: 'Report review requested',
      message: `Program Head sent reports for ${facultyLabel || 'faculty'} for review.`,
      related_approval_request_id: approvalId,
      is_read: false,
      created_at: new Date().toISOString()
    })
    .select()
    .single();

  return { data, error };
};

export const notifyCampusDirectorForReportReview = async ({ campusDirectorId, approvalId, facultyLabel }) => {
  // First get the campus_director_id from campus_directors table
  let actualCdId = campusDirectorId;
  if (!actualCdId) {
    const { data: cds } = await supabase.from('campus_directors').select('id').limit(1).maybeSingle();
    actualCdId = cds?.id;
  }
  
  if (!actualCdId) {
    console.warn('No campus director found for notification');
    return { data: null, error: new Error('No campus director found') };
  }

  const { data, error } = await supabase
    .from('notifications')
    .insert({
      recipient_id: actualCdId,
      recipient_type: 'campus_director',
      notification_type: 'report_review',
      title: 'Report review requested',
      message: `Dean forwarded reports for ${facultyLabel || 'faculty'} for approval.`,
      related_approval_request_id: approvalId,
      is_read: false,
      created_at: new Date().toISOString()
    })
    .select()
    .single();

  return { data, error };
};

export const notifyProgramHeadOnDecision = async ({ programHeadId, approvalId, status, comment }) => {
  const isRejected = status === 'dean_rejected' || status === 'cd_rejected';
  const actorLabel = status === 'dean_approved' || status === 'dean_rejected'
    ? 'Dean'
    : status === 'cd_approved' || status === 'cd_rejected'
      ? 'Campus Director'
      : 'Approver';

  const title = isRejected ? `Returned by ${actorLabel}` : `Approved by ${actorLabel}`;
  const message = isRejected
    ? (comment ? comment.slice(0, 200) : 'Returned with comments')
    : 'Decision Approved';

  return createNotification({
    recipientId: programHeadId,
    recipientType: 'program_head',
    type: 'report_decision',
    title,
    message,
    approvalRequestId: approvalId,
    programHeadId
  });
};

export const notifyDeanOnCampusDirectorDecision = async ({ deanId, approvalId, status, comment }) => {
  const statusLabel = status === 'cd_rejected' ? 'Returned by Campus Director' : 'Approved by Campus Director';
  return createNotification({
    recipientId: deanId,
    recipientType: 'dean',
    type: 'report_decision',
    title: statusLabel,
    message: comment ? comment.slice(0, 200) : 'Decision recorded',
    approvalRequestId: approvalId
  });
};

// Admin notification for new user registrations
export const notifyAdminForRegistration = async (userData) => {
  try {
    console.log('📨 Notifying admins about new registration:', userData);

    // Fetch all active admin IDs
    const { data: admins, error: adminError } = await supabase
      .from('admins')
      .select('id')
      .or('is_active.is.null,is_active.eq.true');

    if (adminError) {
      console.error('❌ Error fetching admins:', adminError);
      return { data: null, error: adminError };
    }

    if (!admins || admins.length === 0) {
      console.warn('⚠️ No active admins found to notify');
      return { data: null, error: null };
    }

    // Format user type for display
    const userTypeLabels = {
      'program_head': 'Program Head',
      'faculty': 'Faculty',
      'student': 'Student',
      'dean': 'Dean',
      'campus_director': 'Campus Director'
    };

    const userTypeLabel = userTypeLabels[userData.userType] || userData.userType;

    // Create notifications for all admins
    console.log(`📬 Creating ${admins.length} notification(s) for admins`);

    const results = await Promise.all(admins.map(admin => createNotification({
      recipientId: admin.id,
      recipientType: 'admin',
      type: 'registration_pending',
      title: `New ${userTypeLabel} Registration`,
      message: `${userData.userName} (${userData.userEmail}) has registered and is pending approval.`,
      relatedUserId: userData.userId,
      relatedUserType: userData.userType
    })));

    const failures = results.filter(result => result.error);
    if (failures.length > 0) {
      const firstError = failures[0].error;
      console.error('❌ Error creating admin notifications:', firstError);
      const rawMessage = String(firstError?.message || '');
      const rawDetails = String(firstError?.details || '');
      const combined = `${rawMessage} ${rawDetails}`.toLowerCase();

      let actionableHint = '';
      if (combined.includes('related_user_id') || combined.includes('related_user_type') || combined.includes('column') && combined.includes('related_user')) {
        actionableHint = 'Database schema is missing registration notification columns. Apply database/FINAL SCHEMA/TABLE/12_notifications_admin_update.sql to add related_user_id and related_user_type.';
      } else if (combined.includes('recipient_type') && (combined.includes('check') || combined.includes('constraint') || combined.includes('violat'))) {
        actionableHint = 'Database schema is missing admin recipient support. Apply database/FINAL SCHEMA/TABLE/12_notifications_admin_update.sql to allow recipient_type=admin.';
      } else if (combined.includes('row level security') || combined.includes('permission') || combined.includes('rls')) {
        actionableHint = 'Database RLS/policies are blocking inserts into notifications. Ensure notifications has an INSERT policy (or use service_role for server-side notification inserts).';
      }

      if (actionableHint) {
        console.error(`ℹ️ Registration notification hint: ${actionableHint}`);
      }

      return {
        data: null,
        error: {
          ...firstError,
          actionableHint: actionableHint || undefined,
        },
      };
    }

    console.log('✅ Admin notifications created successfully');
    return { data: results.map(result => result.data).filter(Boolean), error: null };
  } catch (error) {
    console.error('❌ Exception in notifyAdminForRegistration:', error);
    return { data: null, error };
  }
};