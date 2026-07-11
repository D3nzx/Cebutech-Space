import { supabase } from '../lib/supabaseClient';
import { createScheduleApproval } from './scheduleApprovals';
import { notifyScheduleAssigned } from './notifications';

 const timeToMinutes = (timeValue) => {
  if (!timeValue) return null;
  const str = String(timeValue);
  const [h, m] = str.split(':');
  const hours = Number(h);
  const minutes = Number(m);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return null;
  return hours * 60 + minutes;
};

 const validateScheduleDurationFromOffering = async (scheduleData) => {
   const startMinutes = timeToMinutes(scheduleData?.start_time);
   const endMinutes = timeToMinutes(scheduleData?.end_time);
   if (startMinutes == null || endMinutes == null) {
     return { ok: true, error: null };
   }

   const durationMinutes = endMinutes - startMinutes;
   if (durationMinutes <= 0) {
     return { ok: false, error: 'Invalid time range: end time must be after start time.' };
   }

   let offeringQuery = supabase
     .from('course_subject_offerings')
     .select('id, offering_type, lecture_units, lab_units, contact_hours')
     .eq('is_active', true);

   if (scheduleData?.course_subject_offering_id) {
     offeringQuery = offeringQuery.eq('id', scheduleData.course_subject_offering_id);
   } else if (scheduleData?.course_id && scheduleData?.subject_id) {
     offeringQuery = offeringQuery
       .eq('course_id', scheduleData.course_id)
       .eq('subject_id', scheduleData.subject_id);
   } else {
     return { ok: true, error: null };
   }

   const { data: offering, error: offeringError } = await offeringQuery.maybeSingle();
   if (offeringError) {
     console.warn('⚠️ Error fetching course_subject_offering for duration validation:', offeringError);
     return { ok: true, error: null };
   }
   if (!offering) {
     return { ok: true, error: null };
   }

   if (offering.offering_type === 'LEC-LAB') {
     return { ok: false, error: "Unsupported offering type 'LEC-LAB'. Only 'LEC' and 'LAB' are allowed." };
   }

   const lectureUnits = Number(offering.lecture_units ?? 0);
   const labUnits = Number(offering.lab_units ?? 0);
   const expectedHours = lectureUnits * 1 + labUnits * 3;
   const expectedMinutes = expectedHours * 60;

   if (expectedMinutes > 0 && durationMinutes !== expectedMinutes) {
     return {
       ok: false,
       error: `Invalid duration. Expected ${expectedHours} hour(s) based on units (LEC: ${lectureUnits} unit(s) = ${lectureUnits} hr, LAB: ${labUnits} unit(s) = ${labUnits * 3} hr).`
     };
   }

   return { ok: true, error: null };
 };


export const getSchedules = async (options = {}) => {
  try {
    // Single query with nested joins — replaces the previous 6 round-trips.
    // schedule_approvals uses a !inner-style alias so we get approval_status inline.
    let query = supabase
      .from('schedules')
      .select(`
        id,
        course_id,
        subject_id,
        faculty_id,
        location_id,
        course_subject_offering_id,
        created_by_program_head_id,
        day_of_week,
        start_time,
        end_time,
        year_level,
        section,
        school_year,
        semester,
        is_active,
        created_at,
        updated_at,
        subject:subjects(*),
        location:locations(*),
        course:courses(*),
        faculty:faculty(*),
        course_subject_offering:course_subject_offerings(*),
        created_by_program_head:program_heads!created_by_program_head_id(
          id,
          program_head_code,
          first_name,
          last_name,
          program
        ),
        schedule_approvals(schedule_id, status)
      `)
      .order('created_at', { ascending: false });

    if (options?.created_by_program_head_id) {
      query = query.eq('created_by_program_head_id', options.created_by_program_head_id);
    }
    if (options?.school_year) {
      query = query.eq('school_year', options.school_year);
    }
    if (options?.semester != null && options?.semester !== '') {
      query = query.eq('semester', options.semester);
    }

    const { data, error } = await query;
    if (error) throw error;

    if (!data) return { data: [], error: null };

    // Normalise the approval_status field so callers get the same shape as before.
    const enrichedData = data.map(schedule => {
      const { schedule_approvals, ...rest } = schedule;
      return {
        ...rest,
        approval_status: schedule_approvals?.[0]?.status ?? null,
      };
    });

    return { data: enrichedData, error: null };
  } catch (error) {
    console.error('Error fetching schedules:', error);
    return { data: null, error: error.message };
  }
};


export const getSchedulesByDateRange = async (startDate, endDate) => {
  try {
    const { data, error } = await supabase
      .from('schedules')
      .select('*')
      .gte('start_date', startDate)
      .lte('end_date', endDate)
      .order('start_time', { ascending: true });

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Error fetching schedules by date range:', error);
    return { data: null, error: error.message };
  }
};


export const checkRoomConflict = async (locationId, dayOfWeek, startTime, endTime, excludeId = null) => {
  try {
    let query = supabase
      .from('schedules')
      .select(`
        *,
        subject:subjects(*),
        location:locations(*),
        faculty:faculty(*)
      `)
      .eq('location_id', locationId)
      .eq('day_of_week', dayOfWeek);

    if (excludeId) {
      query = query.neq('id', excludeId);
    }

    const { data, error } = await query;
    if (error) throw error;

    const newStart = timeToMinutes(startTime);
    const newEnd = timeToMinutes(endTime);
    const conflicts = (data ?? []).filter(schedule => {
      const scheduleStart = timeToMinutes(schedule.start_time);
      const scheduleEnd = timeToMinutes(schedule.end_time);
      if (newStart == null || newEnd == null || scheduleStart == null || scheduleEnd == null) return false;
      return newStart < scheduleEnd && newEnd > scheduleStart;
    });

    if (conflicts.length > 0) {
      return { hasConflict: true, conflicts, error: null };
    }

    return { hasConflict: false, conflicts: [], error: null };
  } catch (error) {
    console.error('Error checking room conflict:', error);
    return { hasConflict: false, conflicts: [], error: error.message };
  }
};


export const checkFacultyConflict = async (facultyId, dayOfWeek, startTime, endTime, excludeId = null) => {
  try {
    let query = supabase
      .from('schedules')
      .select(`
        *,
        subject:subjects(*),
        location:locations(*),
        faculty:faculty(*)
      `)
      .eq('faculty_id', facultyId)
      .eq('day_of_week', dayOfWeek);

    if (excludeId) {
      query = query.neq('id', excludeId);
    }

    const { data, error } = await query;
    if (error) throw error;

    const newStart = timeToMinutes(startTime);
    const newEnd = timeToMinutes(endTime);
    const conflicts = (data ?? []).filter(schedule => {
      const scheduleStart = timeToMinutes(schedule.start_time);
      const scheduleEnd = timeToMinutes(schedule.end_time);
      if (newStart == null || newEnd == null || scheduleStart == null || scheduleEnd == null) return false;
      return newStart < scheduleEnd && newEnd > scheduleStart;
    });

    if (conflicts.length > 0) {
      return { hasConflict: true, conflicts, error: null };
    }

    return { hasConflict: false, conflicts: [], error: null };
  } catch (error) {
    console.error('Error checking faculty conflict:', error);
    return { hasConflict: false, conflicts: [], error: error.message };
  }
};


export const checkAllConflicts = async (scheduleData, excludeId = null) => {
  try {
    const [roomCheck, facultyCheck] = await Promise.all([
      checkRoomConflict(
        scheduleData.location_id,
        scheduleData.day_of_week,
        scheduleData.start_time,
        scheduleData.end_time,
        excludeId
      ),
      checkFacultyConflict(
        scheduleData.faculty_id,
        scheduleData.day_of_week,
        scheduleData.start_time,
        scheduleData.end_time,
        excludeId
      )
    ]);

    return {
      hasConflict: roomCheck.hasConflict || facultyCheck.hasConflict,
      roomConflicts: roomCheck.conflicts,
      facultyConflicts: facultyCheck.conflicts,
      error: null
    };
  } catch (error) {
    console.error('Error checking conflicts:', error);
    return {
      hasConflict: false,
      roomConflicts: [],
      facultyConflicts: [],
      error: error.message
    };
  }
};


export const createSchedule = async (scheduleData) => {
  try {
    
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    
    if (!currentUser) {
      return { data: null, error: 'User not authenticated', conflicts: null };
    }

    
    const { data: programHead, error: programHeadError } = await supabase
      .from('program_heads')
      .select('id')
      .eq('auth_user_id', currentUser.id)
      .single();

    if (programHeadError || !programHead) {
      console.warn('Could not find program head record for current user:', programHeadError);
      
    }

    
    const { _offering_type_display, ...cleanedScheduleData } = scheduleData;
    const scheduleDataWithCreator = {
      ...cleanedScheduleData,
      ...(programHead && { created_by_program_head_id: programHead.id })
    };

    const durationValidation = await validateScheduleDurationFromOffering(scheduleDataWithCreator);
    if (!durationValidation.ok) {
      return { data: null, error: durationValidation.error, conflicts: null };
    }

    
    if (scheduleDataWithCreator.faculty_id) {
      const { data: facultyRow, error: facultyErr } = await supabase
        .from('faculty')
        .select('id, is_active')
        .eq('id', scheduleDataWithCreator.faculty_id)
        .maybeSingle();

      if (facultyErr) {
        console.warn('⚠️ Error validating faculty active status:', facultyErr);
      } else if (facultyRow?.is_active === false) {
        return { data: null, error: 'Cannot assign schedule: selected faculty account is disabled.', conflicts: null };
      }
    }

    
    const conflictCheck = await checkAllConflicts(scheduleDataWithCreator);
    
    if (conflictCheck.hasConflict) {
      
      let errorMessage = 'Schedule conflicts detected: ';
      const conflictTypes = [];
      
      if (conflictCheck.roomConflicts && conflictCheck.roomConflicts.length > 0) {
        conflictTypes.push(`${conflictCheck.roomConflicts.length} room conflict(s)`);
      }
      if (conflictCheck.facultyConflicts && conflictCheck.facultyConflicts.length > 0) {
        conflictTypes.push(`${conflictCheck.facultyConflicts.length} faculty conflict(s)`);
      }
      
      errorMessage += conflictTypes.join(' and ');
      
      return {
        data: null,
        error: errorMessage,
        conflicts: {
          room: conflictCheck.roomConflicts,
          faculty: conflictCheck.facultyConflicts
        }
      };
    }

    const { data, error } = await supabase
      .from('schedules')
      .insert([scheduleDataWithCreator])
      .select('*')
      .single();

    if (error) throw error;

    const subjectCode = await (async () => {
      let code = 'Unknown Subject';
      try {
        const { data: subjectData, error: subjectError } = await supabase
          .from('subjects')
          .select('subject_code')
          .eq('id', scheduleData.subject_id)
          .single();

        if (!subjectError && subjectData?.subject_code) {
          code = subjectData.subject_code;
          console.log('✅ Subject code fetched:', code);
        } else {
          console.warn('⚠️ Could not fetch subject code, using fallback:', code);
        }
      } catch (subjectFetchError) {
        console.warn('⚠️ Exception fetching subject code:', subjectFetchError.message);
      }
      return code;
    })();

    if (data && scheduleData.faculty_id) {
      if (!programHead) {
        console.warn('⚠️ Program head record not found for current user. Notifications will still be created for faculty, but approval records cannot be created without a program head.');
      }

      if (programHead) {
        try {
          console.log('📝 Creating schedule approval for faculty:', scheduleData.faculty_id);
          const approvalResult = await createScheduleApproval(data.id, scheduleData.faculty_id, programHead.id);
          console.log('✅ Approval created:', approvalResult);
        } catch (approvalError) {
          console.error('❌ Error creating schedule approval:', approvalError);
        }
      }

      console.log('🔔 Creating notification for faculty:', {
        facultyId: scheduleData.faculty_id,
        scheduleId: data.id,
        subjectCode,
        programId: scheduleData.course_id,
        programHeadId: programHead?.id || null
      });

      try {
        const notificationResult = await notifyScheduleAssigned(
          scheduleData.faculty_id,
          data.id,
          { subjectCode },
          scheduleData.course_id,
          programHead?.id || null
        );

        console.log('✅ Notification result:', notificationResult);

        if (notificationResult.error) {
          console.error('❌ Notification creation error:', notificationResult.error);
          console.error('   Error details:', JSON.stringify(notificationResult.error, null, 2));
        } else if (notificationResult.data) {
          console.log('✅ Notification created successfully:', notificationResult.data);
        } else {
          console.warn('⚠️ Notification result has no data or error');
        }
      } catch (notificationError) {
        console.error('❌ Exception creating notification:', notificationError);
        console.error('   Error message:', notificationError.message);
      }
    } else {
      console.warn('⚠️ Skipping faculty notification creation - schedule has no faculty_id or schedule data missing:', {
        hasData: !!data,
        hasFacultyId: !!scheduleData.faculty_id,
        programHeadId: programHead?.id || null
      });
    }

    return { data, error: null, conflicts: null };
  } catch (error) {
    console.error('Error creating schedule:', error);
    return { data: null, error: error.message, conflicts: null };
  }
};


export const updateSchedule = async (id, scheduleData) => {
  try {

    const durationValidation = await validateScheduleDurationFromOffering(scheduleData);
    if (!durationValidation.ok) {
      return { data: null, error: durationValidation.error, conflicts: null };
    }
    
    if (scheduleData?.faculty_id) {
      const { data: facultyRow, error: facultyErr } = await supabase
        .from('faculty')
        .select('id, is_active')
        .eq('id', scheduleData.faculty_id)
        .maybeSingle();

      if (facultyErr) {
        console.warn('⚠️ Error validating faculty active status:', facultyErr);
      } else if (facultyRow?.is_active === false) {
        return { data: null, error: 'Cannot assign schedule: selected faculty account is disabled.', conflicts: null };
      }
    }

    
    const conflictCheck = await checkAllConflicts(scheduleData, id);
    
    if (conflictCheck.hasConflict) {
      
      let errorMessage = 'Schedule conflicts detected: ';
      const conflictTypes = [];
      
      if (conflictCheck.roomConflicts && conflictCheck.roomConflicts.length > 0) {
        conflictTypes.push(`${conflictCheck.roomConflicts.length} room conflict(s)`);
      }
      if (conflictCheck.facultyConflicts && conflictCheck.facultyConflicts.length > 0) {
        conflictTypes.push(`${conflictCheck.facultyConflicts.length} faculty conflict(s)`);
      }
      
      errorMessage += conflictTypes.join(' and ');
      
      return {
        data: null,
        error: errorMessage,
        conflicts: {
          room: conflictCheck.roomConflicts,
          faculty: conflictCheck.facultyConflicts
        }
      };
    }

    const { data, error } = await supabase
      .from('schedules')
      .update(scheduleData)
      .eq('id', id)
      .select('*')
      .single();

    if (error) throw error;
    
    
    if (data && data.faculty_id) {
      console.log('📬 Sending schedule update notification to faculty:', data.faculty_id);
      
      try {
        
        const { data: { user: currentUser } } = await supabase.auth.getUser();
        let programHeadId = null;
        
        if (currentUser) {
          const { data: programHead } = await supabase
            .from('program_heads')
            .select('id')
            .eq('auth_user_id', currentUser.id)
            .single();
          programHeadId = programHead?.id;
        }
        
        
        const { data: subjectData } = await supabase
          .from('subjects')
          .select('subject_code, subject_name')
          .eq('id', data.subject_id)
          .single();

        const subjectCode = subjectData?.subject_code || 'Unknown Subject';
        
        
        const { notifyScheduleUpdated } = await import('./notifications.js');
        
        const notificationResult = await notifyScheduleUpdated(
          data.faculty_id, 
          id, 
          {
            subjectCode: subjectCode,
            dayOfWeek: data.day_of_week,
            startTime: data.start_time,
            endTime: data.end_time
          },
          data.course_id,    
          programHeadId      
        );
        
        if (notificationResult.error) {
          console.error('❌ Error sending schedule update notification:', notificationResult.error);
        } else {
          console.log('✅ Schedule update notification sent successfully');
        }
      } catch (notificationError) {
        console.error('❌ Exception sending notification:', notificationError);
        
      }
    }
    
    return { data, error: null, conflicts: null };
  } catch (error) {
    console.error('Error updating schedule:', error);
    return { data: null, error: error.message, conflicts: null };
  }
};


export const deleteSchedule = async (id) => {
  try {
    const { error } = await supabase
      .from('schedules')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return { error: null };
  } catch (error) {
    console.error('Error deleting schedule:', error);
    return { error: error.message };
  }
};


export const getSchedulesByFaculty = async (facultyId) => {
  try {
    // Single query with nested joins — replaces the previous 4 round-trips.
    const { data, error } = await supabase
      .from('schedules')
      .select(`
        *,
        subject:subjects(*),
        location:locations(*),
        course:courses(*),
        course_subject_offering:course_subject_offerings(*)
      `)
      .eq('faculty_id', facultyId)
      .order('day_of_week', { ascending: true })
      .order('start_time', { ascending: true });

    if (error) throw error;

    return { data: data ?? [], error: null };
  } catch (error) {
    console.error('Error fetching faculty schedules:', error);
    return { data: null, error: error.message };
  }
};


export const getSchedulesByLocation = async (locationId) => {
  try {
    const { data, error } = await supabase
      .from('schedules')
      .select('*')
      .eq('location_id', locationId)
      .order('day_of_week', { ascending: true })
      .order('start_time', { ascending: true });

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Error fetching location schedules:', error);
    return { data: null, error: error.message };
  }
};


export const getSchedulesByCourse = async (courseId) => {
  try {
    const { data, error } = await supabase
      .from('schedules')
      .select('*')
      .eq('course_id', courseId)
      .order('day_of_week', { ascending: true })
      .order('start_time', { ascending: true });

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Error fetching course schedules:', error);
    return { data: null, error: error.message };
  }
};


export const bulkCreateSchedules = async (schedulesArray) => {
  try {
    
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    
    if (!currentUser) {
      return { data: null, error: 'User not authenticated', conflictDetails: null };
    }

    
    const { data: programHead, error: programHeadError } = await supabase
      .from('program_heads')
      .select('id')
      .eq('auth_user_id', currentUser.id)
      .single();

    if (programHeadError || !programHead) {
      console.warn('Could not find program head record for current user:', programHeadError);
    }

    
    const schedulesWithCreator = schedulesArray.map(schedule => ({
      ...schedule,
      ...(programHead && { created_by_program_head_id: programHead.id })
    }));

    
    const conflictChecks = await Promise.all(
      schedulesWithCreator.map(schedule => checkAllConflicts(schedule))
    );

    const hasAnyConflict = conflictChecks.some(check => check.hasConflict);
    
    if (hasAnyConflict) {
      const conflictDetails = conflictChecks
        .map((check, index) => ({
          index,
          schedule: schedulesWithCreator[index],
          conflicts: check
        }))
        .filter(item => item.conflicts.hasConflict);

      return {
        data: null,
        error: 'Some schedules have conflicts',
        conflictDetails
      };
    }

    const { data, error } = await supabase
      .from('schedules')
      .insert(schedulesWithCreator)
      .select('*');

    if (error) throw error;
    return { data, error: null, conflictDetails: null };
  } catch (error) {
    console.error('Error bulk creating schedules:', error);
    return { data: null, error: error.message, conflictDetails: null };
  }
};
