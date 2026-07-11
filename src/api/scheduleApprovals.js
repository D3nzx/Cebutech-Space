import { supabase } from '../lib/supabaseClient';
import { createNotification } from './notifications';


export const getFacultyPendingApprovals = async (facultyId) => {
  try {
    console.log('🔍 Fetching pending approvals for faculty:', facultyId);
    
    
    const { data, error } = await supabase
      .from('schedule_approvals')
      .select('*')
      .eq('faculty_id', facultyId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Error fetching pending approvals:', error);
      return { data: null, error };
    }

    if (!data || data.length === 0) {
      console.log('✅ No pending approvals found');
      return { data: [], error: null };
    }

    
    const scheduleIds = [...new Set(data.map(a => a.schedule_id).filter(Boolean))];
    const programHeadIds = [...new Set(data.map(a => a.program_head_id).filter(Boolean))];
    
    
    const [schedulesRes, programHeadsRes] = await Promise.all([
      scheduleIds.length > 0 ? supabase.from('schedules').select('*').in('id', scheduleIds) : Promise.resolve({ data: [] }),
      programHeadIds.length > 0 ? supabase.from('program_heads').select('*').in('id', programHeadIds) : Promise.resolve({ data: [] })
    ]);

    
    const scheduleDetailsMap = {};
    if (schedulesRes.data && schedulesRes.data.length > 0) {
      const subjectIds = [...new Set(schedulesRes.data.map(s => s.subject_id).filter(Boolean))];
      const courseIds = [...new Set(schedulesRes.data.map(s => s.course_id).filter(Boolean))];
      const locationIds = [...new Set(schedulesRes.data.map(s => s.location_id).filter(Boolean))];
      const offeringIds = [...new Set(schedulesRes.data.map(s => s.course_subject_offering_id).filter(Boolean))];

      const [subjectsRes, coursesRes, locationsRes, offeringsRes] = await Promise.all([
        subjectIds.length > 0 ? supabase.from('subjects').select('*').in('id', subjectIds) : Promise.resolve({ data: [] }),
        courseIds.length > 0 ? supabase.from('courses').select('*').in('id', courseIds) : Promise.resolve({ data: [] }),
        locationIds.length > 0 ? supabase.from('locations').select('*').in('id', locationIds) : Promise.resolve({ data: [] }),
        offeringIds.length > 0 ? supabase.from('course_subject_offerings').select('*').in('id', offeringIds) : Promise.resolve({ data: [] })
      ]);

      
      const subjectsMap = {};
      const coursesMap = {};
      const locationsMap = {};
      const offeringsMap = {};

      if (subjectsRes.data) subjectsRes.data.forEach(s => subjectsMap[s.id] = s);
      if (coursesRes.data) coursesRes.data.forEach(c => coursesMap[c.id] = c);
      if (locationsRes.data) locationsRes.data.forEach(l => locationsMap[l.id] = l);
      if (offeringsRes.data) offeringsRes.data.forEach(o => offeringsMap[o.id] = o);

      
      schedulesRes.data.forEach(schedule => {
        scheduleDetailsMap[schedule.id] = {
          ...schedule,
          subject: subjectsMap[schedule.subject_id] || null,
          course: coursesMap[schedule.course_id] || null,
          location: locationsMap[schedule.location_id] || null,
          course_subject_offering: offeringsMap[schedule.course_subject_offering_id] || null
        };
      });
    }

    
    const programHeadsMap = {};
    if (programHeadsRes.data) {
      programHeadsRes.data.forEach(ph => programHeadsMap[ph.id] = ph);
    }

    
    const enrichedData = data.map(approval => ({
      ...approval,
      schedule: scheduleDetailsMap[approval.schedule_id] || null,
      program_head: programHeadsMap[approval.program_head_id] || null
    }));

    console.log('✅ Fetched pending approvals:', enrichedData?.length);
    return { data: enrichedData, error: null };
  } catch (error) {
    console.error('Error in getFacultyPendingApprovals:', error);
    return { data: null, error };
  }
};


export const getProgramHeadApprovals = async (programHeadId) => {
  try {
    console.log('🔍 Fetching approvals for program head:', programHeadId);
    
    const { data, error } = await supabase
      .from('schedule_approvals')
      .select(`
        *,
        schedule:schedule_id(
          id,
          day_of_week,
          start_time,
          end_time,
          subject:subject_id(id, subject_name, subject_code),
          course:course_id(id, course_name),
          location:location_id(id, name),
          year_level,
          section
        ),
        faculty:faculty_id(id, first_name, last_name, email)
      `)
      .eq('program_head_id', programHeadId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Error fetching approvals:', error);
      return { data: null, error };
    }

    console.log('✅ Fetched approvals:', data?.length);
    return { data, error: null };
  } catch (error) {
    console.error('Error in getProgramHeadApprovals:', error);
    return { data: null, error };
  }
};


export const getPendingApprovalsCount = async (programHeadId) => {
  try {
    const { data, error, count } = await supabase
      .from('schedule_approvals')
      .select('id', { count: 'exact' })
      .eq('program_head_id', programHeadId)
      .eq('status', 'pending');

    if (error) {
      console.error('❌ Error fetching pending count:', error);
      return { count: 0, error };
    }

    return { count: count || 0, error: null };
  } catch (error) {
    console.error('Error in getPendingApprovalsCount:', error);
    return { count: 0, error };
  }
};


export const submitScheduleApproval = async (approvalId, status, response) => {
  try {
    console.log('📝 Submitting approval:', { approvalId, status, response });

    
    const statusMap = {
      'approve': 'approved',
      'reject': 'rejected',
      'request_change': 'requested_change'
    };

    const dbStatus = statusMap[status] || status;
    console.log('📝 Mapped status:', { inputStatus: status, dbStatus });

    const updateData = {
      status: dbStatus,
      faculty_responded_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    if (dbStatus === 'rejected') {
      updateData.faculty_response = response.reason;
    } else if (dbStatus === 'requested_change') {
      updateData.faculty_response = response.reason;
      updateData.faculty_availability_notes = response.availabilityNotes;
    }

    const { data, error } = await supabase
      .from('schedule_approvals')
      .update(updateData)
      .eq('id', approvalId)
      .select(`
        *,
        schedule:schedule_id(id, subject_id),
        faculty:faculty_id(id, first_name, last_name),
        program_head:program_head_id(id)
      `);

    if (error) {
      console.error('❌ Error submitting approval:', error);
      return { data: null, error };
    }

    
    const approval = data?.[0];
    if (approval) {
      console.log('📢 Sending notification to Program Head:', approval.program_head_id);
      
      const { data: subjectData } = await supabase
        .from('subjects')
        .select('subject_code')
        .eq('id', approval.schedule?.subject_id)
        .single();

      const facultyName = `${approval.faculty?.first_name} ${approval.faculty?.last_name}`;
      const subjectCode = subjectData?.subject_code || 'Unknown Subject';

      let notificationTitle = '';
      let notificationMessage = '';

      if (dbStatus === 'approved') {
        notificationTitle = 'Schedule Approved';
        notificationMessage = `${facultyName} approved the schedule for ${subjectCode}`;
      } else if (dbStatus === 'rejected') {
        notificationTitle = 'Schedule Rejected';
        notificationMessage = `${facultyName} rejected the schedule for ${subjectCode} - Reason: ${response.reason}`;
      } else if (dbStatus === 'requested_change') {
        notificationTitle = 'Schedule Change Requested';
        notificationMessage = `${facultyName} requested changes to ${subjectCode} - Reason: ${response.reason}`;
      }

      
      const { data: scheduleData } = await supabase
        .from('schedules')
        .select('course_id')
        .eq('id', approval.schedule_id)
        .single();

      const programId = scheduleData?.course_id;

      
      console.log('📨 Creating notification with data:', {
        recipient_id: approval.program_head_id,
        recipient_type: 'program_head',
        notification_type: dbStatus === 'approved' ? 'schedule_approved' : dbStatus === 'rejected' ? 'schedule_rejected' : 'change_requested',
        title: notificationTitle,
        message: notificationMessage,
        related_schedule_id: approval.schedule_id,
        related_approval_id: approvalId,
        program_id: programId,
        program_head_id: approval.program_head_id
      });

      const notificationType = dbStatus === 'approved' ? 'schedule_approved' : dbStatus === 'rejected' ? 'schedule_rejected' : 'change_requested';
      const { data: notifData, error: notifError } = await createNotification({
        recipientId: approval.program_head_id,
        recipientType: 'program_head',
        type: notificationType,
        title: notificationTitle,
        message: notificationMessage,
        scheduleId: approval.schedule_id,
        approvalId,
        programId,
        programHeadId: approval.program_head_id
      });

      if (notifError) {
        console.error('❌ Error creating notification for Program Head:', notifError);
        console.error('   Error message:', notifError.message);
        console.error('   Error code:', notifError.code);
        console.error('   Error details:', notifError.details);
      } else {
        console.log('✅ Notification created and sent to Program Head immediately');
        console.log('   Notification ID:', notifData?.id);
        console.log('   Status:', dbStatus);
        console.log('   Real-time event will be broadcast to Program Head dashboard');
      }
    }

    console.log('✅ Approval submitted successfully');
    return { data: data?.[0], error: null };
  } catch (error) {
    console.error('Error in submitScheduleApproval:', error);
    return { data: null, error };
  }
};


export const respondToFacultyRequest = async (approvalId, response) => {
  try {
    console.log('📝 Program Head responding to faculty request:', { approvalId, response });

    const { data, error } = await supabase
      .from('schedule_approvals')
      .update({
        program_head_response: response,
        program_head_action_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', approvalId)
      .select();

    if (error) {
      console.error('❌ Error responding to request:', error);
      return { data: null, error };
    }

    console.log('✅ Response submitted successfully');
    return { data: data?.[0], error: null };
  } catch (error) {
    console.error('Error in respondToFacultyRequest:', error);
    return { data: null, error };
  }
};


export const createScheduleApproval = async (scheduleId, facultyId, programHeadId) => {
  try {
    console.log('➕ Creating schedule approval:', { scheduleId, facultyId, programHeadId });

    const { data, error } = await supabase
      .from('schedule_approvals')
      .insert({
        schedule_id: scheduleId,
        faculty_id: facultyId,
        program_head_id: programHeadId,
        status: 'pending',
        created_at: new Date().toISOString()
      })
      .select();

    if (error) {
      console.error('❌ Error creating approval:', error);
      return { data: null, error };
    }

    console.log('✅ Approval record created');
    return { data: data?.[0], error: null };
  } catch (error) {
    console.error('Error in createScheduleApproval:', error);
    return { data: null, error };
  }
};


export const getApprovalHistory = async (scheduleId) => {
  try {
    const { data, error } = await supabase
      .from('schedule_approvals')
      .select(`
        *,
        faculty:faculty_id(id, first_name, last_name),
        program_head:program_head_id(id, first_name, last_name)
      `)
      .eq('schedule_id', scheduleId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Error fetching approval history:', error);
      return { data: null, error };
    }

    return { data, error: null };
  } catch (error) {
    console.error('Error in getApprovalHistory:', error);
    return { data: null, error };
  }
};
