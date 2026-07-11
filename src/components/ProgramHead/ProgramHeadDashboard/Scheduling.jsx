import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Calendar, List, AlertCircle, CheckCircle, Loader, MapPin, Trash2, X, RefreshCw } from 'lucide-react';
import { deleteNotificationsForSchedule } from '../../../api/notifications';
import ScheduleFormModal from './Scheduling/ScheduleFormModalEnhanced';
import ScheduleChangeRequestedModal from './ScheduleChangeRequestedModal';
import ConflictWarning from './Scheduling/ConflictWarning';
import WeeklyTimetable from './Scheduling/WeeklyTimetable';
import ScheduleFilters from './Scheduling/ScheduleFilters';
import SimpleSelector from '../../SimpleSelector';
import { getSchedules, createSchedule, updateSchedule, deleteSchedule } from '../../../api/schedules';
import { getSubjects } from '../../../api/subjects';
import { getFaculty } from '../../../api/faculty';
import { getLocations } from '../../../api/location';
import { getCourses, getColleges } from '../../../api/courses';
import { getCourseSubjectOfferings } from '../../../api/courseSubjectOfferings';
import { supabase } from '../../../lib/supabaseClient';

// Utility function to convert 24-hour time to 12-hour format
const formatTime12Hour = (time24) => {
  if (!time24) return '';
  // Extract hours and minutes from "HH:MM:SS" or "HH:MM"
  const [hours, minutes] = time24.split(':');
  const hour = parseInt(hours, 10);
  const minute = minutes || '00';
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const hour12 = hour % 12 || 12;
  return `${hour12}:${minute}${ampm}`;
};

function Scheduling({ programHeadData, scheduleIdToEdit, onScheduleEdited }) {
  console.log('📍 Scheduling component mounted with programHeadData:', programHeadData);
  console.log('📝 Schedule to edit:', scheduleIdToEdit);
  
  const [error, setError] = useState(null);
  const [schedules, setSchedules] = useState([]);
  const [filteredSchedules, setFilteredSchedules] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [faculty, setFaculty] = useState([]);
  const [filteredFaculty, setFilteredFaculty] = useState([]); // Faculty filtered by program
  const [locations, setLocations] = useState([]);
  const [courses, setCourses] = useState([]);
  const [allCourses, setAllCourses] = useState([]); // Store all courses for reference
  const [colleges, setColleges] = useState([]);
  const [courseSubjectOfferings, setCourseSubjectOfferings] = useState([]);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState(null);
  const [editingScheduleApprovalStatus, setEditingScheduleApprovalStatus] = useState(null);
  const [conflicts, setConflicts] = useState(null);
  const [showConflictWarning, setShowConflictWarning] = useState(false);
  const [pendingScheduleData, setPendingScheduleData] = useState(null);
  const [prefillScheduleData, setPrefillScheduleData] = useState(null);
  const [pendingFormStep, setPendingFormStep] = useState(null); // Track which step to return to
  
  const [showChangeRequestedModal, setShowChangeRequestedModal] = useState(false);
  const [changeRequestedScheduleId, setChangeRequestedScheduleId] = useState(null);
  
  const [showReassignModal, setShowReassignModal] = useState(false);
  const [scheduleToReassign, setScheduleToReassign] = useState(null);
  const [selectedReassignFaculty, setSelectedReassignFaculty] = useState(null);
  const [isReassigning, setIsReassigning] = useState(false);
  
  const [showRejectedScheduleModal, setShowRejectedScheduleModal] = useState(false);
  const [selectedRejectedSchedule, setSelectedRejectedSchedule] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');
  
  const [showChangeRequestModal, setShowChangeRequestModal] = useState(false);
  const [selectedChangeRequestSchedule, setSelectedChangeRequestSchedule] = useState(null);
  const [changeRequestReason, setChangeRequestReason] = useState('');
  
  const [filters, setFilters] = useState({
    school_year: '',
    semester: '',
    college_id: '',
    course_id: '',
    year_level: '',
    faculty_id: '',
    location_id: '',
    section: '',
    day_of_week: ''
  });
  
  const [viewMode, setViewMode] = useState('timetable'); // 'timetable' or 'list'
  const [loading, setLoading] = useState(true);
  const [notification, setNotification] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [scheduleToDelete, setScheduleToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showScrollbar, setShowScrollbar] = useState(false);
  const scrollbarTimeoutRef = React.useRef(null);
  const realtimeHadErrorRef = React.useRef(false);
  const programHeadIdRef = React.useRef(programHeadData?.id || null);

  useEffect(() => {
    programHeadIdRef.current = programHeadData?.id || null;
  }, [programHeadData?.id]);

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

  // Helper function to check if form has significant data (not just defaults)
  const hasSignificantFormData = (formData) => {
    if (!formData) return false;
    // Check if user has filled in any important fields beyond defaults
    return !!(
      formData.subject_id ||
      formData.faculty_id ||
      formData.location_id ||
      formData.course_id ||
      formData.day_of_week ||
      (formData.start_time && formData.start_time !== '07:00') ||
      (formData.end_time && formData.end_time !== '15:00') ||
      formData.section ||
      formData.year_level
    );
  };

  // Clear modal states on component mount to prevent auto-opening on refresh
  useEffect(() => {
    try {
      // IMPORTANT: Close the modal on mount to prevent auto-opening on page refresh
      // User must explicitly click to create/edit a schedule
      setIsModalOpen(false);
      setEditingSchedule(null);
      setPrefillScheduleData(null);
      setPendingFormStep(1);
      console.log('🔒 Modal closed on component mount to prevent auto-opening');

      // Clear any empty saved modal states
      const savedFormState = sessionStorage.getItem('modal_scheduleFormModal');
      if (savedFormState) {
        try {
          const { formData: savedFormData } = JSON.parse(savedFormState);
          // Only keep the saved state if it has significant data
          if (!savedFormData || !Object.values(savedFormData).some(v => v && v !== '')) {
            console.log('🗑️ Clearing empty saved form state on mount');
            sessionStorage.removeItem('modal_scheduleFormModal');
          }
        } catch (e) {
          console.log('🗑️ Clearing invalid saved form state');
          sessionStorage.removeItem('modal_scheduleFormModal');
        }
      }

      // Restore conflict warning modal only if it has data
      const savedConflictState = sessionStorage.getItem('modal_conflictWarningModal');
      if (savedConflictState) {
        const { isOpen: wasOpen, formData: savedConflicts } = JSON.parse(savedConflictState);
        if (wasOpen && savedConflicts) {
          console.log('♻️ Restoring conflict warning modal on mount');
          setConflicts(savedConflicts);
          setShowConflictWarning(true);
        }
      }
    } catch (error) {
      console.error('❌ Error processing modals on mount:', error);
    }

    // Listen for Schedule Change Requested modal opening from notifications
    const handleOpenChangeRequestedModal = (event) => {
      const { scheduleId, notificationId } = event.detail;
      console.log('📢 Event received: openScheduleChangeRequestedModal', { scheduleId, notificationId });
      setChangeRequestedScheduleId(scheduleId);
      setShowChangeRequestedModal(true);
    };

    // Listen for Reassign modal opening from notifications
    const handleOpenReassignModalFromNotification = async (event) => {
      const { scheduleId, notificationId } = event.detail;
      console.log('📢 Event received: openReassignModal', { scheduleId, notificationId });
      
      // Fast path: use already-loaded schedules list if present
      const existingSchedule = schedules?.find(s => s.id === scheduleId);
      if (existingSchedule) {
        console.log('✅ Using already-loaded schedule for reassign:', existingSchedule);
        setScheduleToReassign(existingSchedule);
        setSelectedReassignFaculty(null);
        setShowReassignModal(true);
        return;
      }

      // Fetch the schedule details
      try {
        const { data: scheduleBase, error: baseError } = await supabase
          .from('schedules')
          .select('id, location_id, faculty_id, course_id, subject_id, day_of_week, start_time, end_time, year_level, section')
          .eq('id', scheduleId)
          .single();
        
        if (baseError) {
          console.error('❌ Error fetching schedule for reassign (base row):', baseError);
          showNotification(`Error loading schedule for reassign: ${baseError.message || baseError}`, 'error');
          return;
        }

        const [subjectRes, facultyRes, courseRes, locationRes] = await Promise.all([
          scheduleBase?.subject_id
            ? supabase.from('subjects').select('id, subject_code, subject_name').eq('id', scheduleBase.subject_id).single()
            : Promise.resolve({ data: null, error: null }),
          scheduleBase?.faculty_id
            ? supabase.from('faculty').select('id, first_name, last_name').eq('id', scheduleBase.faculty_id).single()
            : Promise.resolve({ data: null, error: null }),
          scheduleBase?.course_id
            ? supabase.from('courses').select('id, course_name').eq('id', scheduleBase.course_id).single()
            : Promise.resolve({ data: null, error: null }),
          scheduleBase?.location_id
            ? supabase.from('locations').select('id, name').eq('id', scheduleBase.location_id).single()
            : Promise.resolve({ data: null, error: null })
        ]);

        const schedule = {
          ...scheduleBase,
          subject: subjectRes.data || null,
          faculty: facultyRes.data || null,
          course: courseRes.data || null,
          location: locationRes.data || null
        };
        
        console.log('✅ Schedule fetched for reassign:', schedule);
        setScheduleToReassign(schedule);
        setSelectedReassignFaculty(null);
        setShowReassignModal(true);
      } catch (err) {
        console.error('❌ Exception fetching schedule for reassign:', err);
        showNotification('Error loading schedule for reassign: ' + (err?.message || String(err)), 'error');
      }
    };

    // Listen for delete schedule event from rejected schedule modal
    const handleDeleteScheduleFromNotification = (event) => {
      const { scheduleId, notificationId } = event.detail;
      console.log('📢 Event received: deleteScheduleFromNotification', { scheduleId, notificationId });
      
      // Find the schedule and trigger delete
      const scheduleToDelete = schedules.find(s => s.id === scheduleId);
      if (scheduleToDelete) {
        handleDeleteSchedule(scheduleToDelete);
      }
    };

    window.addEventListener('openScheduleChangeRequestedModal', handleOpenChangeRequestedModal);
    window.addEventListener('openReassignModal', handleOpenReassignModalFromNotification);
    window.addEventListener('deleteScheduleFromNotification', handleDeleteScheduleFromNotification);

    return () => {
      window.removeEventListener('openScheduleChangeRequestedModal', handleOpenChangeRequestedModal);
      window.removeEventListener('openReassignModal', handleOpenReassignModalFromNotification);
      window.removeEventListener('deleteScheduleFromNotification', handleDeleteScheduleFromNotification);
    };
  }, []);

  // Helper function to filter courses by program head's college
  const filterCoursesByCollege = useCallback((coursesToFilter) => {
    if (!coursesToFilter || coursesToFilter.length === 0) {
      console.log('⚠️ No courses to filter');
      return [];
    }
    
    if (!programHeadData?.college) {
      console.log('⚠️ No program head college data available yet, returning all courses');
      return coursesToFilter;
    }
    
    const collegeToFilter = programHeadData.college.trim();
    console.log(`🔍 Filtering for college: "${collegeToFilter}"`);
    console.log(`   College length: ${collegeToFilter.length}, Char codes: ${Array.from(collegeToFilter).map(c => c.charCodeAt(0)).join(',')}`);
    console.log('📊 Available courses and their colleges:', coursesToFilter.map(c => ({ name: c.course_name, college: c.college_name, collegeLength: c.college_name?.length })));
    
    const filtered = coursesToFilter.filter(course => {
      const courseCollege = course.college_name?.trim() || '';
      console.log(`   Comparing "${courseCollege}" (len: ${courseCollege.length}) === "${collegeToFilter}" (len: ${collegeToFilter.length})`);
      console.log(`   Char codes: ${Array.from(courseCollege).map(c => c.charCodeAt(0)).join(',')}`);
      const matches = courseCollege === collegeToFilter;
      if (!matches) {
        console.log(`   ❌ NO MATCH for "${course.course_name}"`);
      } else {
        console.log(`   ✅ MATCH for "${course.course_name}"`);
      }
      return matches;
    });
    
    console.log(`✅ Final filtered courses: ${filtered.length}`, filtered.map(c => c.course_name));
    return filtered;
  }, [programHeadData]);

  // Filter faculty by program head's assigned program and active status
  useEffect(() => {
    console.log('🔍 Faculty filtering triggered');
    console.log('   programHeadData:', programHeadData);
    console.log('   faculty count:', faculty?.length);
    console.log('   faculty data:', faculty);
    
    if (!programHeadData?.program) {
      console.log('⚠️ No program head program assigned');
      setFilteredFaculty(faculty?.filter(f => f.is_active !== false) || []);
      return;
    }

    if (!faculty || faculty.length === 0) {
      console.log('⚠️ No faculty available');
      setFilteredFaculty([]);
      return;
    }

    const normalize = (str) => (str || '').trim().toLowerCase();
    const targetProgram = normalize(programHeadData.program);
    
    console.log(`🎓 Program Head Program: "${programHeadData.program}" (normalized: "${targetProgram}")`);
    console.log(`📋 Faculty list with programs:`);
    faculty.forEach(fac => {
      const isActive = fac.is_active !== false ? '✅ ACTIVE' : '❌ DISABLED';
      console.log(`   - ${fac.first_name} ${fac.last_name}: program="${fac.program}" (normalized: "${normalize(fac.program)}") ${isActive}`);
    });
    
    const filtered = faculty.filter(fac => {
      // Only include faculty that are active (is_active !== false)
      if (fac.is_active === false) {
        console.log(`   ❌ ${fac.first_name} ${fac.last_name}: DISABLED - excluding from schedule creation`);
        return false;
      }
      
      const facProgram = normalize(fac.program);
      const matches = facProgram === targetProgram;
      console.log(`   ✓ ${fac.first_name} ${fac.last_name}: ${matches ? '✅ MATCH' : '❌ NO MATCH'}`);
      return matches;
    });

    console.log(`👥 Total faculty available: ${faculty.length}`);
    console.log(`👥 Active faculty filtered for this program: ${filtered.length}`, filtered.map(f => `${f.first_name} ${f.last_name}`));
    
    setFilteredFaculty(filtered);
  }, [faculty, programHeadData?.program]);

  useEffect(() => {
    if (!programHeadData?.id) {
      return;
    }

    loadInitialData();
    
    // Set up real-time subscriptions with better error handling and status checking
    const setupSubscriptions = () => {
      const channels = [];
      
      // Subjects subscription
      const subjectsChannel = supabase
        .channel(`scheduling_subjects_${Date.now()}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'subjects'
          },
          async (payload) => {
            console.log('🔄 Subjects data changed, refreshing...', payload);
            showNotification('Subjects updated', 'success');
            try {
              const { data, error } = await getSubjects();
              if (!error && data) {
                setSubjects(data);
              }
            } catch (error) {
              console.error('Error refreshing subjects:', error);
            }
          }
        )
        .subscribe((status) => {
          console.log('📡 Subjects subscription status:', status);
          if (status === 'SUBSCRIBED') {
            console.log('✅ Subjects real-time active');
          } else if (status === 'CHANNEL_ERROR') {
            console.error('❌ Subjects subscription error');
            realtimeHadErrorRef.current = true;
          }
        });
      channels.push(subjectsChannel);

      // Courses subscription
      const coursesChannel = supabase
        .channel(`scheduling_courses_${Date.now()}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'courses'
          },
          async (payload) => {
            console.log('🔄 Courses data changed, refreshing...', payload);
            showNotification('Programs updated', 'success');
            try {
              const { data, error } = await getCourses();
              if (!error && data) {
                setAllCourses(data);
                const filteredCourses = filterCoursesByCollege(data);
                setCourses(filteredCourses);
              }
            } catch (error) {
              console.error('Error refreshing courses:', error);
            }
          }
        )
        .subscribe((status) => {
          console.log('📡 Courses subscription status:', status);
          if (status === 'SUBSCRIBED') {
            console.log('✅ Courses real-time active');
          } else if (status === 'CHANNEL_ERROR') {
            console.error('❌ Courses subscription error');
            realtimeHadErrorRef.current = true;
          }
        });
      channels.push(coursesChannel);

      // Locations subscription
      const locationsChannel = supabase
        .channel(`scheduling_locations_${Date.now()}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'locations'
          },
          async (payload) => {
            console.log('🔄 Locations data changed, refreshing...', payload);
            showNotification('Locations updated', 'success');
            try {
              const { data, error } = await getLocations();
              if (!error && data) {
                setLocations(data);
              }
            } catch (error) {
              console.error('Error refreshing locations:', error);
            }
          }
        )
        .subscribe((status) => {
          console.log('📡 Locations subscription status:', status);
          if (status === 'SUBSCRIBED') {
            console.log('✅ Locations real-time active');
          } else if (status === 'CHANNEL_ERROR') {
            console.error('❌ Locations subscription error');
            realtimeHadErrorRef.current = true;
          }
        });
      channels.push(locationsChannel);

      // Faculty subscription
      const facultyChannel = supabase
        .channel(`scheduling_faculty_${Date.now()}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'faculty'
          },
          async (payload) => {
            console.log('🔄 Faculty data changed, refreshing...', payload);
            showNotification('Faculty list updated', 'success');
            try {
              const { data, error } = await getFaculty();
              if (!error && data) {
                setFaculty(data);
              }
            } catch (error) {
              console.error('Error refreshing faculty:', error);
            }
          }
        )
        .subscribe((status) => {
          console.log('📡 Faculty subscription status:', status);
          if (status === 'SUBSCRIBED') {
            console.log('✅ Faculty real-time active');
          } else if (status === 'CHANNEL_ERROR') {
            console.error('❌ Faculty subscription error');
            realtimeHadErrorRef.current = true;
          }
        });
      channels.push(facultyChannel);

      // Colleges subscription
      const collegesChannel = supabase
        .channel(`scheduling_colleges_${Date.now()}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'colleges'
          },
          async (payload) => {
            console.log('🔄 Colleges data changed, refreshing...', payload);
            try {
              const { data, error } = await getColleges();
              if (!error && data) {
                setColleges(data);
              }
            } catch (error) {
              console.error('Error refreshing colleges:', error);
            }
          }
        )
        .subscribe((status) => {
          console.log('📡 Colleges subscription status:', status);
          if (status === 'SUBSCRIBED') {
            console.log('✅ Colleges real-time active');
          } else if (status === 'CHANNEL_ERROR') {
            console.error('❌ Colleges subscription error');
            realtimeHadErrorRef.current = true;
          }
        });
      channels.push(collegesChannel);

      // Schedules subscription - CRITICAL for immediate display of new schedules
      const schedulesChannel = supabase
        .channel(`scheduling_schedules_${Date.now()}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'schedules'
          },
          async (payload) => {
            const eventType = payload.eventType || payload.event;
            const scheduleId = payload.new?.id || payload.old?.id;
            console.log(`🔄 Schedule ${eventType} detected (ID: ${scheduleId})`, payload);
            
            // Handle DELETE events specially - remove immediately from UI
            if (eventType === 'DELETE') {
              console.log(`🗑️ Removing schedule ${scheduleId} from UI`);
              setSchedules(prev => {
                const updated = prev.filter(s => s.id !== scheduleId);
                console.log(`✅ Schedule removed: ${prev.length} → ${updated.length}`);
                return updated;
              });
              return;
            }
            
            // For INSERT and UPDATE, refresh all schedules
            try {
              const { data, error } = await getSchedules();
              if (!error && data) {
                console.log(`✅ Schedules refreshed: ${data.length} total schedules`);
                setSchedules(data);
              }
            } catch (error) {
              console.error('Error refreshing schedules:', error);
            }
          }
        )
        .subscribe((status) => {
          console.log('📡 Schedules subscription status:', status);
          if (status === 'SUBSCRIBED') {
            console.log('✅ Schedules real-time active - listening for INSERT, UPDATE, DELETE');
          } else if (status === 'CHANNEL_ERROR') {
            console.error('❌ Schedules subscription error');
            realtimeHadErrorRef.current = true;
          }
        });
      channels.push(schedulesChannel);

      // Course Subject Offerings subscription
      const offeringsChannel = supabase
        .channel(`scheduling_offerings_${Date.now()}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'course_subject_offerings'
          },
          async (payload) => {
            console.log('🔄 Course Subject Offerings data changed, refreshing...', payload);
            showNotification('Subject offerings updated', 'success');
            try {
              const { data, error } = await getCourseSubjectOfferings();
              if (!error && data) {
                setCourseSubjectOfferings(data);
              }
            } catch (error) {
              console.error('Error refreshing course subject offerings:', error);
            }
          }
        )
        .subscribe((status) => {
          console.log('📡 Course Subject Offerings subscription status:', status);
          if (status === 'SUBSCRIBED') {
            console.log('✅ Course Subject Offerings real-time active');
          } else if (status === 'CHANNEL_ERROR') {
            console.error('❌ Course Subject Offerings subscription error');
            realtimeHadErrorRef.current = true;
          }
        });
      channels.push(offeringsChannel);

      // Schedule Approvals subscription - Listen for faculty approvals
      const approvalsChannel = supabase
        .channel(`scheduling_approvals_${Date.now()}`)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'schedule_approvals'
          },
          async (payload) => {
            console.log('📋 Schedule approval status changed:', payload);
            const approvalStatus = payload.new?.status;
            const scheduleId = payload.new?.schedule_id;
            
            if (approvalStatus === 'approved') {
              console.log(`✅ Schedule ${scheduleId} approved by faculty - updating UI...`);
              // Refresh schedules to update approval status
              try {
                const { data, error } = await getSchedules();
                if (!error && data) {
                  console.log(`✅ Schedules refreshed after approval: ${data.length} total`);
                  setSchedules(data);
                  // Re-apply current filters to update filtered view
                  let filtered = [...data];
                  Object.entries(filters).forEach(([key, value]) => {
                    if (value) {
                      filtered = filtered.filter(schedule => {
                        if (key === 'semester') {
                          const scheduleSemester = schedule.semester === 1 ? '1st Semester' : 
                                                 schedule.semester === 2 ? '2nd Semester' : 
                                                 String(schedule.semester || '');
                          return scheduleSemester === value;
                        }
                        if (key === 'school_year' || key === 'section' || key === 'day_of_week') {
                          const scheduleValue = schedule[key];
                          if (!scheduleValue) return false;
                          return String(scheduleValue).toLowerCase().includes(String(value).toLowerCase());
                        } else if (key === 'college_id') {
                          const course = courses?.find(c => c.id === schedule.course_id);
                          return course?.college_id === value;
                        }
                        return schedule[key] === value;
                      });
                    }
                  });
                  setFilteredSchedules(filtered);
                  showNotification('Schedule approved by faculty', 'success');
                }
              } catch (error) {
                console.error('Error refreshing schedules after approval:', error);
              }
            }
          }
        )
        .subscribe((status) => {
          console.log('📡 Schedule Approvals subscription status:', status);
          if (status === 'SUBSCRIBED') {
            console.log('✅ Schedule Approvals real-time active - listening for faculty approvals');
          } else if (status === 'CHANNEL_ERROR') {
            console.error('❌ Schedule Approvals subscription error');
            realtimeHadErrorRef.current = true;
          }
        });
      channels.push(approvalsChannel);

      return channels;
    };

    const channels = setupSubscriptions();

    const pollingInterval = setInterval(async () => {
      if (!realtimeHadErrorRef.current) {
        return;
      }

      console.log('🔄 Polling for data updates...');
      try {
        const phId = programHeadIdRef.current;
        const [subjectsRes, coursesRes, locationsRes, facultyRes, collegesRes, schedulesRes] = await Promise.all([
          getSubjects(),
          getCourses(),
          getLocations(),
          getFaculty(),
          getColleges(),
          phId ? getSchedules({ created_by_program_head_id: phId }) : getSchedules()
        ]);

        // Only update if data actually changed (simple comparison)
        if (!subjectsRes.error && subjectsRes.data) {
          setSubjects(prev => {
            const prevStr = JSON.stringify(prev);
            const newStr = JSON.stringify(subjectsRes.data);
            if (prevStr !== newStr) {
              console.log('📊 Subjects changed via polling');
              return subjectsRes.data;
            }
            return prev;
          });
        }

        if (!coursesRes.error && coursesRes.data) {
          setAllCourses(coursesRes.data);
          setCourses(prev => {
            const newFilteredCourses = filterCoursesByCollege(coursesRes.data);
            const prevStr = JSON.stringify(prev);
            const newStr = JSON.stringify(newFilteredCourses);
            if (prevStr !== newStr) {
              console.log('📊 Courses changed via polling');
              return newFilteredCourses;
            }
            return prev;
          });
        }

        if (!locationsRes.error && locationsRes.data) {
          setLocations(prev => {
            const prevStr = JSON.stringify(prev);
            const newStr = JSON.stringify(locationsRes.data);
            if (prevStr !== newStr) {
              console.log('📊 Locations changed via polling');
              return locationsRes.data;
            }
            return prev;
          });
        }

        if (!facultyRes.error && facultyRes.data) {
          setFaculty(prev => {
            const prevStr = JSON.stringify(prev);
            const newStr = JSON.stringify(facultyRes.data);
            if (prevStr !== newStr) {
              console.log('📊 Faculty changed via polling');
              return facultyRes.data;
            }
            return prev;
          });
        }

        if (!collegesRes.error && collegesRes.data) {
          setColleges(prev => {
            const prevStr = JSON.stringify(prev);
            const newStr = JSON.stringify(collegesRes.data);
            if (prevStr !== newStr) {
              console.log('📊 Colleges changed via polling');
              return collegesRes.data;
            }
            return prev;
          });
        }

        if (!schedulesRes.error && schedulesRes.data) {
          setSchedules(prev => {
            const prevStr = JSON.stringify(prev);
            const newStr = JSON.stringify(schedulesRes.data);
            if (prevStr !== newStr) {
              console.log('📊 Schedules changed via polling');
              return schedulesRes.data;
            }
            return prev;
          });
        }
      } catch (error) {
        console.error('Error in polling:', error);
      }
    }, 10000); // Poll every 10 seconds

    // Cleanup subscriptions and polling on unmount
    return () => {
      channels.forEach(channel => {
        supabase.removeChannel(channel);
      });
      clearInterval(pollingInterval);
    };
  }, [programHeadData?.id]);

  useEffect(() => {
    applyFilters();
  }, [schedules, filters]);

  // Re-filter courses when programHeadData changes (after initial load)
  useEffect(() => {
    if (allCourses && allCourses.length > 0 && programHeadData?.college) {
      console.log('🔄 Re-filtering courses due to programHeadData change');
      const filteredCourses = filterCoursesByCollege(allCourses);
      setCourses(filteredCourses);
    }
  }, [programHeadData, allCourses, filterCoursesByCollege]);

  // Handle schedule edit from notification
  useEffect(() => {
    if (scheduleIdToEdit) {
      console.log('📝 Schedule ID to edit received:', scheduleIdToEdit);
      console.log('   Current schedules count:', schedules.length);
      console.log('   All schedules:', schedules);
      
      // Wait a bit for schedules to load if needed
      const timer = setTimeout(() => {
        // Find the schedule to edit
        const scheduleToEdit = schedules.find(s => s.id === scheduleIdToEdit);
        
        console.log('🔍 Looking for schedule:', scheduleIdToEdit);
        console.log('   Found:', scheduleToEdit);
        
        if (scheduleToEdit) {
          console.log('✅ Found schedule to edit:', scheduleToEdit);
          
          // Set the editing schedule
          setEditingSchedule(scheduleToEdit);
          
          // Open the modal
          setIsModalOpen(true);
          
          // Scroll to the schedule in the list view
          setTimeout(() => {
            const scheduleElement = document.getElementById(`schedule-${scheduleIdToEdit}`);
            console.log('🎯 Schedule element:', scheduleElement);
            if (scheduleElement) {
              scheduleElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
              // Highlight the schedule
              scheduleElement.classList.add('ring-2', 'ring-amber-400', 'bg-amber-50');
              console.log('✨ Schedule highlighted');
            }
          }, 200);
          
          // Call the callback to clear the state in parent
          if (onScheduleEdited) {
            console.log('🔄 Calling onScheduleEdited callback');
            onScheduleEdited();
          }
        } else {
          console.warn('⚠️ Schedule not found:', scheduleIdToEdit);
          console.warn('   Available schedules:', schedules.map(s => s.id));
        }
      }, 500); // Wait 500ms for schedules to load
      
      return () => clearTimeout(timer);
    }
  }, [scheduleIdToEdit, schedules, onScheduleEdited]);

  const loadInitialData = async () => {
    setLoading(true);
    setError(null);
    try {
      if (!programHeadData?.id) {
        return;
      }

      const [schedulesRes, subjectsRes, facultyRes, locationsRes, colleglesRes, coursesRes, offeringsRes] = await Promise.all([
        getSchedules({ created_by_program_head_id: programHeadData.id }),
        getSubjects(),
        getFaculty(),
        getLocations(),
        getColleges(),
        getCourses(),
        getCourseSubjectOfferings()
      ]);

      // Handle responses - check for errors in each response
      if (schedulesRes.error) {
        console.error('Error loading schedules:', schedulesRes.error);
      } else if (schedulesRes.data) {
        console.log('✅ Schedules loaded:', schedulesRes.data.length, schedulesRes.data);
        setSchedules(schedulesRes.data);
      } else {
        console.warn('⚠️ No schedules data returned');
      }

      if (subjectsRes.error) {
        console.error('Error loading subjects:', subjectsRes.error);
      } else if (subjectsRes.data) {
        setSubjects(subjectsRes.data);
      }

      if (facultyRes.error) {
        console.error('❌ Error loading faculty:', facultyRes.error);
      } else if (facultyRes.data) {
        console.log(`✅ Faculty data loaded: ${facultyRes.data.length} records`);
        console.log('📋 Faculty details:', facultyRes.data);
        setFaculty(facultyRes.data);
      } else {
        console.warn('⚠️ No faculty data returned');
      }

      if (locationsRes.error) {
        console.error('Error loading locations:', locationsRes.error);
      } else if (locationsRes.data) {
        setLocations(locationsRes.data);
      }

      if (colleglesRes.error) {
        console.error('Error loading colleges:', colleglesRes.error);
      } else if (colleglesRes.data) {
        setColleges(colleglesRes.data);
      }

      if (coursesRes.error) {
        console.error('Error loading courses:', coursesRes.error);
      } else if (coursesRes.data) {
        setAllCourses(coursesRes.data);
        const filteredCourses = filterCoursesByCollege(coursesRes.data);
        console.log(`🎓 Program Head College: "${programHeadData?.college}"`);
        console.log(`📚 Total courses available: ${coursesRes.data.length}`);
        console.log(`📚 Filtered courses for this college: ${filteredCourses.length}`, filteredCourses.map(c => c.course_name));
        // Set filtered courses for filters, but pass ALL courses to the modal for Program dropdown
        setCourses(filteredCourses);
      }

      if (offeringsRes.error) {
        console.error('Error loading course subject offerings:', offeringsRes.error);
      } else if (offeringsRes.data) {
        setCourseSubjectOfferings(offeringsRes.data);
      }

      // Only set default filters on initial load (when filters are empty)
      // Don't reset filters when reloading data after creating/updating schedules
      setFilters(prev => {
        const hasActiveFilters = Object.values(prev).some(v => v);
        if (!hasActiveFilters) {
          // First load - set default filters
          const currentYear = new Date().getFullYear();
          const nextYear = currentYear + 1;
          return {
            ...prev,
            school_year: `${currentYear}-${nextYear}`,
            semester: '1st Semester'
          };
        }
        // Subsequent loads - keep existing filters
        return prev;
      });
    } catch (err) {
      console.error('Error loading data:', err);
      setError(err.message || 'Failed to load scheduling data. Please try again.');
      showNotification('Error loading data. Please refresh the page.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...schedules];

    console.log('🔍 Applying filters...');
    console.log('📊 Total schedules before filtering:', schedules.length);
    console.log('🎯 Active filters:', Object.entries(filters).filter(([k, v]) => v));

    Object.entries(filters).forEach(([key, value]) => {
      if (value) {
        const beforeCount = filtered.length;
        filtered = filtered.filter(schedule => {
          // Special handling for semester filter
          if (key === 'semester') {
            // Convert numeric semester to string format for comparison
            const scheduleSemester = schedule.semester === 1 ? '1st Semester' : 
                                   schedule.semester === 2 ? '2nd Semester' : 
                                   String(schedule.semester || '');
            return scheduleSemester === value;
          }
          
          if (key === 'school_year' || key === 'section' || key === 'day_of_week') {
            const scheduleValue = schedule[key];
            // Safely convert to string and check if it includes the filter value
            if (!scheduleValue) return false;
            const matches = String(scheduleValue).toLowerCase().includes(String(value).toLowerCase());
            if (!matches) {
              console.log(`   ❌ ${key}: "${scheduleValue}" does not match filter "${value}"`);
            }
            return matches;
          } else if (key === 'college_id') {
            // Find the course for this schedule and check if it matches the college_id
            const course = courses?.find(c => c.id === schedule.course_id);
            return course?.college_id === value;
          }
          return schedule[key] === value;
        });
        console.log(`   📉 After "${key}" filter: ${beforeCount} → ${filtered.length}`);
      }
    });

    console.log('✅ Final filtered schedules:', filtered.length);
    setFilteredSchedules(filtered);
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleClearFilters = () => {
    setFilters({
      school_year: '',
      semester: '',
      college_id: '',
      course_id: '',
      year_level: '',
      faculty_id: '',
      location_id: '',
      section: '',
      day_of_week: ''
    });
  };

  // Calculate total active schedules (is_active === true AND approval_status === 'approved')
  const getTotalActiveSchedules = () => {
    return schedules.filter(schedule => schedule.is_active && schedule.approval_status === 'approved').length;
  };

  // Calculate unique faculty members from filtered schedules with Active status only
  const getActiveFacultyCount = () => {
    // Get unique faculty IDs from filtered schedules where status is "Active"
    // A schedule is Active when: is_active === true AND approval_status === 'approved'
    const uniqueFacultyIds = new Set(
      filteredSchedules
        .filter(schedule => schedule.is_active && schedule.approval_status === 'approved')
        .map(schedule => schedule.faculty_id)
        .filter(id => id) // Filter out null/undefined
    );
    return uniqueFacultyIds.size;
  };

  const handleCreateSchedule = () => {
    setEditingSchedule(null);

    // Auto-select the program head's assigned program (match trimmed + case-insensitive)
    const normalize = (str) => (str || '').trim().toLowerCase();
    const targetProgram = normalize(programHeadData?.program);
    const coursePool = (allCourses && allCourses.length > 0 ? allCourses : courses) || [];
    const assignedCourse = coursePool.find(
      (c) => normalize(c.course_name) === targetProgram
    );

    const prefillData = {
      course_id: assignedCourse?.id || ''
    };

    setPrefillScheduleData(prefillData);
    setIsModalOpen(true);
  };

  const handleEditSchedule = async (schedule) => {
    // Block edits for pending schedules
    if (schedule?.approval_status === 'pending') {
      showNotification('Pending schedules cannot be edited. Please wait for approval or cancel the request.', 'warning');
      return;
    }

    // Block edits for rejected schedules
    if (schedule?.approval_status === 'rejected') {
      showNotification('Rejected schedules cannot be edited. Please reassign or remove the schedule.', 'warning');
      return;
    }

    // Block edits for change request schedules
    if (schedule?.approval_status === 'requested_change') {
      showNotification('Schedules with change requests cannot be edited directly. Please respond to the change request first.', 'warning');
      return;
    }

    // Check if the current Program Head can edit this schedule
    if (!canEditSchedule(schedule)) {
      showNotification('You can only edit schedules that you created', 'error');
      return;
    }
    
    // Fetch the approval status for this schedule
    try {
      const { data: approvalData, error } = await supabase
        .from('schedule_approvals')
        .select('status')
        .eq('schedule_id', schedule.id)
        .single();
      
      if (!error && approvalData) {
        console.log('📋 Approval status for schedule:', approvalData.status);
        setEditingScheduleApprovalStatus(approvalData.status);
      } else {
        setEditingScheduleApprovalStatus(null);
      }
    } catch (err) {
      console.error('Error fetching approval status:', err);
      setEditingScheduleApprovalStatus(null);
    }
    
    setPrefillScheduleData(null);
    setEditingSchedule(schedule);
    setIsModalOpen(true);
  };

  // Check if the current Program Head can edit/delete a schedule
  const canEditSchedule = (schedule) => {
    console.log('🔍 canEditSchedule check:', {
      programHeadData,
      scheduleCreatedBy: schedule.created_by_program_head_id,
      scheduleId: schedule.id,
      scheduleProgram: schedule.course?.course_name
    });
    
    // If no program head data, cannot edit
    if (!programHeadData) {
      console.log('❌ No programHeadData available');
      return false;
    }
    
    // Allow editing if the schedule belongs to the program head's assigned program
    // This allows any program head to edit schedules in their college/program
    if (schedule.course?.course_name && programHeadData.program) {
      const normalize = (str) => (str || '').trim().toLowerCase();
      const scheduleProgram = normalize(schedule.course.course_name);
      const programHeadProgram = normalize(programHeadData.program);
      
      if (scheduleProgram === programHeadProgram) {
        console.log('✅ Schedule belongs to this program head\'s assigned program');
        return true;
      }
    }
    
    // Fallback: check if program head created this schedule (for backward compatibility)
    if (schedule.created_by_program_head_id && programHeadData.id) {
      const canEdit = schedule.created_by_program_head_id === programHeadData.id;
      console.log(canEdit ? '✅ Program Head created this schedule' : '❌ Program Head did not create this schedule');
      return canEdit;
    }
    
    // If schedule has no creator (old schedules), allow editing for backward compatibility
    if (!schedule.created_by_program_head_id) {
      console.log('✅ Schedule has no creator - allowing edit (backward compatibility)');
      return true;
    }
    
    console.log('❌ Cannot determine edit permission');
    return false;
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingSchedule(null);
    setEditingScheduleApprovalStatus(null);
    setPrefillScheduleData(null);
    setPendingFormStep(1); // Reset to step 1 when modal closes
  };

  const handleOpenReassignModal = (schedule) => {
    console.log('🔄 Opening reassign modal for schedule:', schedule.id);
    setScheduleToReassign(schedule);
    setSelectedReassignFaculty(null);
    setShowReassignModal(true);
  };

  const handleRejectedScheduleClick = async (schedule) => {
    console.log('📍 Rejected schedule card clicked:', schedule.id);
    
    try {
      // Fetch schedule details without inline relationships
      const { data: scheduleData, error: scheduleError } = await supabase
        .from('schedules')
        .select('*')
        .eq('id', schedule.id)
        .single();
      
      if (scheduleError) {
        console.error('❌ Error fetching schedule details:', scheduleError);
        showNotification('Error loading schedule. Please try again.', 'error');
        return;
      }
      
      // Fetch related data separately
      if (scheduleData) {
        const [subjectsRes, coursesRes, offeringsRes, locationsRes, facultyRes] = await Promise.all([
          scheduleData.subject_id ? supabase.from('subjects').select('*').eq('id', scheduleData.subject_id).single() : Promise.resolve({ data: null }),
          scheduleData.course_id ? supabase.from('courses').select('*').eq('id', scheduleData.course_id).single() : Promise.resolve({ data: null }),
          scheduleData.course_subject_offering_id ? supabase.from('course_subject_offerings').select('*').eq('id', scheduleData.course_subject_offering_id).single() : Promise.resolve({ data: null }),
          scheduleData.location_id ? supabase.from('locations').select('*').eq('id', scheduleData.location_id).single() : Promise.resolve({ data: null }),
          scheduleData.faculty_id ? supabase.from('faculty').select('*').eq('id', scheduleData.faculty_id).single() : Promise.resolve({ data: null })
        ]);
        
        // Enrich schedule with related data
        const enrichedSchedule = {
          ...scheduleData,
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
          .eq('schedule_id', schedule.id)
          .eq('status', 'rejected')
          .single();
        
        if (!approvalError && approval) {
          setRejectionReason(approval.faculty_response);
          console.log('✅ Rejection reason fetched:', approval.faculty_response);
        }
        
        console.log('✅ Schedule details fetched and enriched:', enrichedSchedule);
        setSelectedRejectedSchedule(enrichedSchedule);
        setShowRejectedScheduleModal(true);
      }
    } catch (err) {
      console.error('❌ Exception fetching rejected schedule:', err);
      showNotification('Error loading schedule: ' + err.message, 'error');
    }
  };

  const handleChangeRequestClick = async (schedule) => {
    console.log('📍 Change request schedule card clicked:', schedule.id);
    console.log('   Opening Schedule Change Requested modal directly...');
    
    // Open the ScheduleChangeRequestedModal directly
    setShowChangeRequestedModal(true);
    setChangeRequestedScheduleId(schedule.id);
  };

  const handleConfirmReassign = async () => {
    if (!scheduleToReassign || !selectedReassignFaculty) {
      showNotification('Please select a faculty member', 'error');
      return;
    }

    setIsReassigning(true);
    try {
      console.log('🔄 Reassigning schedule to new faculty:', selectedReassignFaculty.id);
      
      // Update schedule with new faculty
      const result = await updateSchedule(scheduleToReassign.id, {
        faculty_id: selectedReassignFaculty.id,
        location_id: scheduleToReassign.location_id,
        day_of_week: scheduleToReassign.day_of_week,
        start_time: scheduleToReassign.start_time,
        end_time: scheduleToReassign.end_time,
        is_active: false, // Reset to inactive so faculty must re-approve
        updated_at: new Date().toISOString()
      });

      if (result.error) {
        showNotification('Failed to reassign schedule: ' + result.error, 'error');
        return;
      }

      // Reset approval status to pending for new faculty
      const { error: approvalError } = await supabase
        .from('schedule_approvals')
        .update({ 
          status: 'pending',
          faculty_id: selectedReassignFaculty.id,
          faculty_response: null,
          faculty_availability_notes: null,
          faculty_responded_at: null,
          program_head_response: null,
          program_head_action_at: null,
          updated_at: new Date().toISOString()
        })
        .eq('schedule_id', scheduleToReassign.id);

      if (approvalError) {
        console.warn('⚠️ Could not reset approval status:', approvalError);
      }

      // Clear any old notifications for this faculty on this schedule before creating new one
      try {
        console.log('🗑️ Clearing old notifications for faculty:', selectedReassignFaculty.id, 'on schedule:', scheduleToReassign.id);
        
        const { data: deletedNotifs, error: deleteError } = await supabase
          .from('notifications')
          .delete()
          .eq('recipient_id', selectedReassignFaculty.id)
          .eq('recipient_type', 'faculty')
          .eq('related_schedule_id', scheduleToReassign.id)
          .select();

        if (deleteError) {
          console.error('❌ Error deleting old notifications:', deleteError);
        } else {
          console.log('✅ Deleted old notifications:', deletedNotifs?.length || 0, 'records removed');
        }
      } catch (deleteErr) {
        console.error('❌ Exception deleting old notifications:', deleteErr);
      }

      // Create notification for newly assigned faculty
      try {
        console.log('📬 Creating notification for newly assigned faculty:', selectedReassignFaculty.id);
        console.log('   Schedule data:', {
          schedule_id: scheduleToReassign.id,
          subject_id: scheduleToReassign.subject_id,
          subject: scheduleToReassign.subject
        });
        
        // Fetch subject code for notification
        let subjectCode = 'Unknown Subject';
        
        // Try to get subject code from the schedule object first
        if (scheduleToReassign.subject?.subject_code) {
          subjectCode = scheduleToReassign.subject.subject_code;
          console.log('✅ Found subject code from schedule object:', subjectCode);
        } else if (scheduleToReassign.subject_id) {
          // If not in object, fetch from database
          const { data: subjectData, error: subjectError } = await supabase
            .from('subjects')
            .select('subject_code, subject_name')
            .eq('id', scheduleToReassign.subject_id)
            .single();

          if (subjectError) {
            console.error('❌ Error fetching subject:', subjectError);
          } else if (subjectData?.subject_code) {
            subjectCode = subjectData.subject_code;
            console.log('✅ Fetched subject code from database:', subjectCode);
          }
        } else {
          console.warn('⚠️ No subject_id found in schedule object');
        }
        
        // Create notification for new faculty
        const { error: notifError } = await supabase
          .from('notifications')
          .insert({
            recipient_id: selectedReassignFaculty.id,
            recipient_type: 'faculty',
            notification_type: 'schedule_assigned',
            title: 'New Schedule Assigned',
            message: `You have been assigned to teach ${subjectCode} - awaiting your approval`,
            related_schedule_id: scheduleToReassign.id,
            is_read: false,
            created_at: new Date().toISOString()
          });

        if (notifError) {
          console.error('❌ Error creating notification for new faculty:', notifError);
        } else {
          console.log('✅ Notification created and sent to new faculty immediately');
          console.log('   Faculty ID:', selectedReassignFaculty.id);
          console.log('   Subject Code:', subjectCode);
          console.log('   Real-time event will be broadcast to faculty dashboard');
        }
      } catch (notifErr) {
        console.error('❌ Exception creating notification:', notifErr);
      }

      // Reload schedules
      const { data: updatedSchedules } = await getSchedules();
      if (updatedSchedules) {
        setSchedules(updatedSchedules);
      }

      // Auto-clear the schedule_rejected notification
      try {
        console.log('🔔 Auto-clearing schedule_rejected notification for schedule:', scheduleToReassign.id);
        await supabase
          .from('notifications')
          .update({ is_read: true, read_at: new Date().toISOString() })
          .eq('related_schedule_id', scheduleToReassign.id)
          .eq('notification_type', 'schedule_rejected');
        
        // Remove from UI via exposed method
        if (window.clearProgramHeadNotificationsForSchedule) {
          window.clearProgramHeadNotificationsForSchedule(scheduleToReassign.id);
        }
        console.log('✅ Notification cleared');
      } catch (notifErr) {
        console.error('❌ Error clearing notification:', notifErr);
      }

      showNotification(`Schedule reassigned to ${selectedReassignFaculty.first_name} ${selectedReassignFaculty.last_name}`, 'success');
      setShowReassignModal(false);
      setScheduleToReassign(null);
      setSelectedReassignFaculty(null);
    } catch (error) {
      console.error('Error reassigning schedule:', error);
      showNotification('Error reassigning schedule', 'error');
    } finally {
      setIsReassigning(false);
    }
  };

  const resolveOfferingPayload = (payload) => {
    // If course_subject_offering_id is already set, use it directly (form already resolved it)
    if (payload?.course_subject_offering_id) {
      const offering = courseSubjectOfferings.find(
        item => item.id === payload.course_subject_offering_id
      );
      if (offering) {
        console.log('✅ Using pre-resolved course_subject_offering_id:', payload.course_subject_offering_id, 'offering_type:', offering.offering_type);
        const subjectId = offering.subject_id ?? offering.subject?.id ?? payload.subject_id;
        // Remove offering_type from payload since we already have the offering_id
        const { offering_type, _offering_type_display, ...cleanPayload } = payload;
        return {
          ...cleanPayload,
          course_id: offering.course_id ?? payload.course_id,
          subject_id: subjectId,
          course_subject_offering_id: payload.course_subject_offering_id
        };
      }
    }

    // If offering_type is provided, find the matching course_subject_offering
    if (payload?.subject_id && payload?.course_id && payload?.offering_type) {
      const offering = courseSubjectOfferings.find(
        item => 
          item.subject_id === payload.subject_id &&
          item.course_id === payload.course_id &&
          item.offering_type === payload.offering_type
      );

      if (offering) {
        console.log('✅ Found course_subject_offering:', offering.id, 'for', payload.offering_type);
        const { offering_type, ...cleanPayload } = payload;
        return {
          ...cleanPayload,
          course_subject_offering_id: offering.id
        };
      } else {
        // If LAB offering not found, try to find LEC offering as fallback
        // This allows schedules to be created even if LAB offering doesn't exist in course_subject_offerings
        const lecOffering = courseSubjectOfferings.find(
          item => 
            item.subject_id === payload.subject_id &&
            item.course_id === payload.course_id &&
            item.offering_type === 'LEC'
        );

        if (lecOffering) {
          console.warn('⚠️ LAB offering not found for subject, using LEC offering as fallback:', {
            subject_id: payload.subject_id,
            course_id: payload.course_id,
            requested_type: payload.offering_type,
            fallback_to: 'LEC'
          });
          const { offering_type, ...cleanPayload } = payload;
          return {
            ...cleanPayload,
            course_subject_offering_id: lecOffering.id
          };
        }

        console.warn('⚠️ No course_subject_offering found for:', {
          subject_id: payload.subject_id,
          course_id: payload.course_id,
          offering_type: payload.offering_type
        });
        // Remove offering_type from payload and store it in a custom field for display purposes
        const { offering_type, ...cleanPayload } = payload;
        return {
          ...cleanPayload,
          // Keep offering_type as a temporary field for display (will be removed before DB insert)
          _offering_type_display: offering_type
        };
      }
    }

    // Remove offering_type if it exists but no course_subject_offering was found
    const { offering_type, _offering_type_display, ...cleanPayload } = payload;
    return cleanPayload;
  };

  const handleSubmitSchedule = async (formData) => {
    try {
      let result = { data: null, error: null, conflicts: null };
      let conflictPayload = null;
      
      if (editingSchedule) {
        const { days, ...updatePayload } = formData;
        const payload = resolveOfferingPayload(updatePayload);
        
        // IMPORTANT: When updating a schedule, set is_active to false so it goes back to "Pending" status
        // Faculty must wait for Program Head to activate it again
        payload.is_active = false;
        console.log('🔄 Setting is_active to false for updated schedule - faculty must re-approve and Program Head must re-activate');
        
        // Remove old "New Schedule Assigned" notifications for this schedule
        // This prevents duplicate notifications when rescheduling after "Request Change"
        try {
          console.log('🗑️ Removing old notifications for rescheduled schedule:', editingSchedule.id);
          await deleteNotificationsForSchedule(editingSchedule.id);
        } catch (notifErr) {
          console.error('Error removing old notifications:', notifErr);
        }
        
        result = await updateSchedule(editingSchedule.id, payload);
        conflictPayload = payload;
        
        // If schedule was updated, reset approval status to "pending" for faculty re-approval
        if (!result.error && result.data) {
          console.log('🔄 Resetting approval status to pending for updated schedule...');
          try {
            // Update the approval record to reset status to pending
            const { error: approvalError } = await supabase
              .from('schedule_approvals')
              .update({ status: 'pending', updated_at: new Date().toISOString() })
              .eq('schedule_id', editingSchedule.id);
            
            if (approvalError) {
              console.warn('⚠️ Could not reset approval status:', approvalError);
            } else {
              console.log('✅ Approval status reset to pending');
            }
          } catch (error) {
            console.error('Error resetting approval status:', error);
          }
        }
      } else {
        const { days = [], ...basePayload } = formData;
        const daysToCreate = days.length > 0
          ? days
          : [formData.day_of_week];

        for (const day of daysToCreate) {
          const payload = {
            ...basePayload,
            day_of_week: day
          };

          const resolvedPayload = resolveOfferingPayload(payload);
          result = await createSchedule(resolvedPayload);

          if (result?.conflicts || result?.error) {
            // Store the original formData (not resolvedPayload) to preserve offering_type and semester
            conflictPayload = payload;
            break;
          }
        }
      }

      if (result.conflicts) {
        // Show conflict warning
        setConflicts(result.conflicts);
        // Use the original formData to preserve all user selections including offering_type and semester
        setPendingScheduleData(conflictPayload || formData);
        
        // Determine which step to return to based on form data
        // Step 4 (Schedule & Location) is where conflicts are detected
        setPendingFormStep(4);
        
        setShowConflictWarning(true);
        return;
      }

      if (result.error) {
        showNotification(result.error, 'error');
        return;
      }

      // Success
      console.log('✅ Schedule submitted successfully');
      console.log('📊 Reloading all data...');
      const { data: updatedSchedules } = await getSchedules();
      
      if (updatedSchedules) {
        console.log(`✅ Loaded ${updatedSchedules.length} schedules`);
        console.log('📋 Schedule data:', updatedSchedules);
        setSchedules(updatedSchedules);
        
        // For new schedules, show all schedules without filters
        if (!editingSchedule) {
          console.log('🔄 Displaying all schedules for newly created schedule...');
          console.log('📋 Filtered schedules to display:', updatedSchedules);
          setFilteredSchedules(updatedSchedules);
          // Clear filters
          setFilters({
            school_year: '',
            semester: '',
            college_id: '',
            course_id: '',
            year_level: '',
            faculty_id: '',
            location_id: '',
            section: '',
            day_of_week: ''
          });
        } else {
          // For edited schedules, auto-clear the change_requested notification
          try {
            console.log('🔔 Attempting to auto-clear notification for edited schedule:', editingSchedule.id);
            
            // Mark the change_requested notification as read
            const { error: notifUpdateError } = await supabase
              .from('notifications')
              .update({
                is_read: true,
                read_at: new Date().toISOString()
              })
              .eq('recipient_id', programHeadData?.id)
              .eq('recipient_type', 'program_head')
              .eq('related_schedule_id', editingSchedule.id)
              .eq('notification_type', 'change_requested');
            
            if (notifUpdateError) {
              console.error('❌ Error auto-clearing notification:', notifUpdateError);
            } else {
              console.log('✅ Auto-cleared change_requested notification for schedule:', editingSchedule.id);
            }
          } catch (notifErr) {
            console.error('❌ Exception auto-clearing notification:', notifErr);
          }

          // Re-apply current filters
          let filtered = [...updatedSchedules];
          Object.entries(filters).forEach(([key, value]) => {
            if (value) {
              filtered = filtered.filter(schedule => {
                if (key === 'semester') {
                  const scheduleSemester = schedule.semester === 1 ? '1st Semester' : 
                                         schedule.semester === 2 ? '2nd Semester' : 
                                         String(schedule.semester || '');
                  return scheduleSemester === value;
                }
                if (key === 'school_year' || key === 'section' || key === 'day_of_week') {
                  const scheduleValue = schedule[key];
                  if (!scheduleValue) return false;
                  return String(scheduleValue).toLowerCase().includes(String(value).toLowerCase());
                } else if (key === 'college_id') {
                  const course = courses?.find(c => c.id === schedule.course_id);
                  return course?.college_id === value;
                }
                return schedule[key] === value;
              });
            }
          });
          setFilteredSchedules(filtered);
        }
      }
      
      handleCloseModal();
      showNotification(
        editingSchedule ? 'Schedule updated successfully' : 'Schedule created successfully',
        'success'
      );
    } catch (error) {
      console.error('Error submitting schedule:', error);
      showNotification('An error occurred', 'error');
    }
  };

  const handleDeleteSchedule = (schedule) => {
    // Check if the current Program Head can delete this schedule
    if (!canEditSchedule(schedule)) {
      showNotification('You can only delete schedules that you created', 'error');
      return;
    }

    setScheduleToDelete(schedule);
    setShowDeleteModal(true);
  };

  const confirmDeleteSchedule = async () => {
    if (!scheduleToDelete) return;

    setIsDeleting(true);
    try {
      console.log(`🗑️ Deleting schedule: ${scheduleToDelete.id}`);
      
      // Optimistically remove from UI immediately
      setSchedules(prev => {
        const updated = prev.filter(s => s.id !== scheduleToDelete.id);
        console.log(`✅ Removed from UI: ${prev.length} → ${updated.length} schedules`);
        return updated;
      });
      
      const result = await deleteSchedule(scheduleToDelete.id);
      
      if (result.error) {
        console.error('❌ Delete failed, reloading data:', result.error);
        // If delete failed, reload to restore the schedule
        await loadInitialData();
        showNotification('Failed to delete schedule: ' + result.error, 'error');
        setShowDeleteModal(false);
        setScheduleToDelete(null);
        return;
      }

      console.log('✅ Schedule deleted from database');
      showNotification('Schedule deleted successfully', 'success');
      setShowDeleteModal(false);
      setScheduleToDelete(null);
      
      // Refresh data in background to ensure consistency
      await loadInitialData();
    } catch (error) {
      console.error('Error deleting schedule:', error);
      // Reload data to restore UI state
      await loadInitialData();
      showNotification('An error occurred while deleting', 'error');
      setShowDeleteModal(false);
      setScheduleToDelete(null);
    } finally {
      setIsDeleting(false);
    }
  };

  const showNotification = (message, type = 'info') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 5000);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[600px]">
        <div className="text-center">
          <Loader className="animate-spin text-blue-600 mx-auto mb-4" size={48} />
          <p className="text-slate-600">Loading scheduling data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <div className="flex items-start gap-4">
            <AlertCircle size={24} className="text-red-600 flex-shrink-0 mt-1" />
            <div>
              <h3 className="font-semibold text-red-900 mb-2">Error Loading Scheduling</h3>
              <p className="text-red-800 mb-4">{error}</p>
              <button
                onClick={() => {
                  setError(null);
                  loadInitialData();
                }}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                Try Again
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  console.log('✅ Rendering Scheduling component - loading:', loading, 'error:', error);
  
  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Class Management</h1>
        </div>
        <div className="flex items-center gap-3">
          {/* View Toggle */}
          <div className="flex bg-white border border-slate-200 rounded-xl p-1 gap-1 shadow-sm">
            <button
              onClick={() => setViewMode('timetable')}
              className={`p-2.5 rounded-lg transition-all duration-200 focus:outline-none focus:ring-0 ${
                viewMode === 'timetable'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-slate-700 bg-white hover:bg-slate-50 hover:text-blue-600'
              }`}
              style={{ outline: 'none', border: 'none' }}
              onMouseDown={(e) => e.preventDefault()}
              title="Timetable View"
            >
              <Calendar size={18} />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2.5 rounded-lg transition-all duration-200 focus:outline-none focus:ring-0 ${
                viewMode === 'list'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-slate-700 bg-white hover:bg-slate-50 hover:text-blue-600'
              }`}
              style={{ outline: 'none', border: 'none' }}
              onMouseDown={(e) => e.preventDefault()}
              title="List View"
            >
              <List size={18} />
            </button>
          </div>

          {/* Create Button */}
          <button
            onClick={handleCreateSchedule}
            className="px-5 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all duration-200 shadow-md hover:shadow-lg font-semibold text-sm focus:outline-none focus-visible:outline-none focus:ring-2 focus-visible:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            Create Schedule
          </button>
        </div>
      </div>

      {/* Notification Modal */}
      {notification && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity animate-in fade-in duration-200"></div>
          <div className="relative w-full max-w-sm transform rounded-2xl bg-white shadow-2xl transition-all animate-in scale-in-95 fade-in duration-300 overflow-hidden">
            {/* Content */}
            <div className="px-8 py-8 flex flex-col items-center text-center">
              {/* Icon */}
              <div className={`p-3 rounded-full mb-4 ${
                notification.type === 'success'
                  ? 'bg-green-100'
                  : notification.type === 'error'
                    ? 'bg-red-100'
                    : 'bg-amber-100'
              }`}>
                {notification.type === 'success' ? (
                  <CheckCircle size={24} className="text-green-600" />
                ) : notification.type === 'error' ? (
                  <AlertCircle size={24} className="text-red-600" />
                ) : (
                  <AlertCircle size={24} className="text-amber-600" />
                )}
              </div>

              {/* Title */}
              <h2 className="text-lg font-bold text-slate-900 mb-2">
                {notification.type === 'success'
                  ? 'Success'
                  : notification.type === 'error'
                    ? 'Error'
                    : 'Notice'}
              </h2>

              {/* Message */}
              <p className="text-sm text-slate-600 leading-relaxed">{notification.message}</p>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <ScheduleFilters
        filters={filters}
        onFilterChange={handleFilterChange}
        onClearFilters={handleClearFilters}
        courses={allCourses || []}
        colleges={colleges || []}
        faculty={faculty || []}
        locations={locations || []}
      />

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 hover:shadow-md transition-shadow duration-200">
          <div className="text-sm font-medium text-slate-600 mb-2">Total Schedules</div>
          <div className="text-3xl font-bold text-slate-900">{getTotalActiveSchedules()}</div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 hover:shadow-md transition-shadow duration-200">
          <div className="text-sm font-medium text-slate-600 mb-2">Filtered Results</div>
          <div className="text-3xl font-bold text-blue-600">{filteredSchedules.length}</div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 hover:shadow-md transition-shadow duration-200">
          <div className="text-sm font-medium text-slate-600 mb-2">Active Faculty</div>
          <div className="text-3xl font-bold text-slate-900">{getActiveFacultyCount()}</div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 hover:shadow-md transition-shadow duration-200">
          <div className="text-sm font-medium text-slate-600 mb-2">Available Rooms</div>
          <div className="text-3xl font-bold text-slate-900">{locations.length}</div>
        </div>
      </div>

      {/* Content */}
      {viewMode === 'timetable' ? (
        <div className="origin-top-left md:transform md:scale-90 md:origin-top-left md:w-[111.111%] w-full overflow-x-auto">
          <div className="min-w-[1000px] md:min-w-[1200px]">
            <WeeklyTimetable
              schedules={filteredSchedules || []}
              onEdit={handleEditSchedule}
              onDelete={handleDeleteSchedule}
              onRejectedScheduleClick={handleRejectedScheduleClick}
              onChangeRequestClick={handleChangeRequestClick}
              programHeadData={programHeadData}
            />
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div 
            className="overflow-x-auto"
            onScroll={handleScrollbarVisibility}
            style={{
              scrollbarWidth: 'auto',
              msOverflowStyle: 'auto',
            }}
          >
            <style>{`
              div::-webkit-scrollbar {
                height: 8px;
              }
              div::-webkit-scrollbar-track {
                background: #f1f5f9;
              }
              div::-webkit-scrollbar-thumb {
                background: #cbd5e1;
                border-radius: 4px;
                transition: background 0.3s ease;
              }
              div::-webkit-scrollbar-thumb:hover {
                background: #94a3b8;
              }
            `}</style>
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-gradient-to-r from-slate-50 to-slate-100">
                <tr>
                  <th className="px-6 py-4 text-center text-xs font-bold text-slate-800 uppercase tracking-wider border-r border-slate-200">
                    Subject
                  </th>
                  <th className="px-6 py-4 text-center text-xs font-bold text-slate-800 uppercase tracking-wider border-r border-slate-200">
                    Faculty
                  </th>
                  <th className="px-6 py-4 text-center text-xs font-bold text-slate-800 uppercase tracking-wider border-r border-slate-200">
                    Schedule
                  </th>
                  <th className="px-6 py-4 text-center text-xs font-bold text-slate-800 uppercase tracking-wider border-r border-slate-200">
                    Location
                  </th>
                  <th className="px-6 py-4 text-center text-xs font-bold text-slate-800 uppercase tracking-wider border-r border-slate-200">
                    Course/Year/Section
                  </th>
                  <th className="px-6 py-4 text-center text-xs font-bold text-slate-800 uppercase tracking-wider border-r border-slate-200">
                    Status
                  </th>
                  <th className="px-6 py-4 text-center text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-100">
                {filteredSchedules.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="px-6 py-20 text-center">
                      <div className="flex flex-col items-center justify-center">
                        <div className="bg-slate-100 rounded-full p-4 mb-4">
                          <Calendar className="text-slate-400" size={48} />
                        </div>
                        <p className="text-lg font-semibold text-slate-900 mb-2">No schedules found</p>
                        <p className="text-sm text-slate-600 max-w-md">
                          Try adjusting your filters or create a new schedule to get started.
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredSchedules.map((schedule, index) => {
                    const isEditable = canEditSchedule(schedule);
                    return (
                    <tr 
                      key={schedule.id}
                      id={`schedule-${schedule.id}`}
                      className="transition-all duration-200 border-b border-slate-100 group hover:bg-blue-50/50"
                    >
                      <td className="px-6 py-5 whitespace-nowrap border-r border-slate-100">
                        <div className="flex items-start gap-3">
                          <div className="flex-shrink-0 w-1 h-full bg-blue-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"></div>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-bold text-slate-900 mb-1">
                              {schedule.subject?.subject_code || 'N/A'}
                        </div>
                            <div className="text-sm text-slate-700 leading-relaxed">
                          {schedule.subject?.subject_name}
                          {schedule.course_subject_offering?.offering_type && (
                                <span className="ml-2 inline-flex items-center px-2 py-0.5 text-xs font-bold rounded-md bg-blue-100 text-blue-700 border border-blue-200">
                              {schedule.course_subject_offering.offering_type}
                            </span>
                          )}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-5 whitespace-nowrap border-r border-slate-100">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-sm">
                            {(schedule.faculty?.first_name?.[0] || '') + (schedule.faculty?.last_name?.[0] || '')}
                          </div>
                          <div className="text-sm font-semibold text-slate-900">
                          {schedule.faculty?.first_name} {schedule.faculty?.last_name}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-5 whitespace-nowrap border-r border-slate-100">
                        <div className="flex items-center gap-2">
                          <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center">
                            <Calendar size={16} className="text-slate-600" />
                          </div>
                          <div>
                            <div className="text-sm font-bold text-slate-900">{schedule.day_of_week}</div>
                            <div className="text-xs text-slate-600 font-medium mt-0.5">
                          {formatTime12Hour(schedule.start_time)} - {formatTime12Hour(schedule.end_time)}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-5 whitespace-nowrap border-r border-slate-100">
                        <div className="flex items-center gap-2">
                          <MapPin size={16} className="text-slate-400 flex-shrink-0" />
                          <span className="text-sm font-semibold text-slate-900">
                            {schedule.location?.name || 'N/A'}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-5 whitespace-nowrap border-r border-slate-100">
                        <div>
                          <div className="text-sm font-semibold text-slate-900 mb-1">
                          {schedule.course?.course_name}
                        </div>
                          <div className="text-xs text-slate-600 font-medium">
                          {schedule.year_level} - Section {schedule.section}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-5 whitespace-nowrap border-r border-slate-100 text-center">
                        {schedule.is_active && schedule.approval_status === 'approved' && (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800 border border-blue-200">
                            Active
                          </span>
                        )}
                        {schedule.approval_status === 'pending' && (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
                            Pending
                          </span>
                        )}
                        {schedule.approval_status === 'approved' && !schedule.is_active && (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-green-100 text-green-800 border border-green-200">
                            Approved
                          </span>
                        )}
                        {schedule.approval_status === 'rejected' && (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-red-100 text-red-800 border border-red-200">
                            Rejected
                          </span>
                        )}
                        {schedule.approval_status === 'requested_change' && (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-orange-100 text-orange-800 border border-orange-200">
                            Change Req
                          </span>
                        )}
                        {!schedule.approval_status && (
                          <span className="text-xs text-slate-400">—</span>
                        )}
                      </td>
                      <td className="px-6 py-5 whitespace-nowrap text-center">
                        {isEditable ? (
                          schedule.approval_status === 'pending' ? (
                            <button
                              onClick={() => handleDeleteSchedule(schedule)}
                              className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg text-xs font-semibold bg-red-600 text-white hover:bg-red-700 active:bg-red-800 transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md"
                              title="Cancel Schedule"
                            >
                              Cancel
                            </button>
                          ) : schedule.approval_status === 'rejected' ? (
                            <div className="flex items-center justify-center gap-2">
                              <button
                                onClick={() => handleOpenReassignModal(schedule)}
                                className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg text-xs font-semibold bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800 transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md"
                                title="Reassign to Another Faculty"
                              >
                                Reassign
                              </button>
                              <button
                                onClick={() => handleDeleteSchedule(schedule)}
                                className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg text-xs font-semibold bg-red-600 text-white hover:bg-red-700 active:bg-red-800 transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md"
                                title="Remove Schedule"
                              >
                                Remove
                              </button>
                            </div>
                          ) : schedule.approval_status === 'requested_change' ? (
                            <button
                              onClick={() => {
                                setChangeRequestedScheduleId(schedule.id);
                                setShowChangeRequestedModal(true);
                              }}
                              className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg text-xs font-semibold bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800 transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md"
                              title="Edit Schedule Change Request"
                            >
                              Edit
                            </button>
                          ) : (
                            <div className="flex items-center justify-center gap-2">
                              <button
                                onClick={() => handleEditSchedule(schedule)}
                                className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg text-xs font-semibold bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800 transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md"
                                title="Edit Schedule"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => handleDeleteSchedule(schedule)}
                                className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg text-xs font-semibold bg-red-600 text-white hover:bg-red-700 active:bg-red-800 transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md"
                                title="Remove Schedule"
                              >
                                Remove
                              </button>
                            </div>
                          )
                        ) : (
                          <span className="text-xs text-slate-400">—</span>
                        )}
                      </td>
                    </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modals */}
      <ScheduleFormModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onSubmit={handleSubmitSchedule}
        editingSchedule={editingSchedule}
        initialFormData={prefillScheduleData}
        initialStep={pendingFormStep}
        subjects={subjects || []}
        faculty={filteredFaculty || []}
        locations={locations || []}
        courses={allCourses || []}
        courseSubjectOfferings={courseSubjectOfferings || []}
        approvalStatus={editingScheduleApprovalStatus}
      />

      <ConflictWarning
        conflicts={conflicts}
        onClose={() => {
          setShowConflictWarning(false);
          setConflicts(null);

          if (pendingScheduleData) {
            if (editingSchedule) {
              setEditingSchedule(prev => (prev ? { ...prev, ...pendingScheduleData } : prev));
              setPrefillScheduleData(null);
            } else {
              setPrefillScheduleData(pendingScheduleData);
            }
            setIsModalOpen(true);
          }

          setPendingScheduleData(null);
          setPendingFormStep(null);
        }}
      />

      {/* Delete Schedule Confirmation Modal */}
      {showDeleteModal && scheduleToDelete && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity animate-in fade-in duration-200"></div>
          <div className="relative w-full max-w-md transform rounded-2xl bg-white shadow-2xl transition-all animate-in scale-in-95 fade-in duration-300 overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-red-600 to-red-700 px-6 py-6">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-white/20 rounded-lg backdrop-blur-sm border border-white/20">
                  <Trash2 size={20} className="text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">Remove Schedule</h2>
                  <p className="text-red-100/90 mt-0.5 text-xs font-medium">This action cannot be undone</p>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="px-6 py-6 space-y-4">
              {/* Schedule Details */}
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-3">
                <p className="text-xs font-bold text-slate-700 uppercase tracking-wide">Schedule Details</p>
                
                <div className="space-y-2.5">
                  {/* Subject */}
                  <div className="flex items-start gap-3">
                    <span className="text-slate-400 text-sm font-semibold min-w-fit">Subject:</span>
                    <p className="text-sm font-semibold text-slate-900">{scheduleToDelete.subject?.subject_name}</p>
                  </div>

                  {/* Component Type */}
                  {scheduleToDelete.course_subject_offering?.offering_type && (
                    <div className="flex items-start gap-3">
                      <span className="text-slate-400 text-sm font-semibold min-w-fit">Component:</span>
                      <p className="text-sm text-slate-700">
                        {scheduleToDelete.course_subject_offering.offering_type === 'LEC' ? 'Lecture (LEC)' : scheduleToDelete.course_subject_offering.offering_type === 'LAB' ? 'Laboratory (LAB)' : scheduleToDelete.course_subject_offering.offering_type}
                      </p>
                    </div>
                  )}

                  {/* Faculty */}
                  {scheduleToDelete.faculty && (
                    <div className="flex items-start gap-3">
                      <span className="text-slate-400 text-sm font-semibold min-w-fit">Faculty:</span>
                      <p className="text-sm text-slate-700">{`${scheduleToDelete.faculty.last_name}, ${scheduleToDelete.faculty.first_name}`}</p>
                    </div>
                  )}

                  {/* Program/Course */}
                  {scheduleToDelete.course && (
                    <div className="flex items-start gap-3">
                      <span className="text-slate-400 text-sm font-semibold min-w-fit">Program:</span>
                      <p className="text-sm text-slate-700">{scheduleToDelete.course.course_name}</p>
                    </div>
                  )}

                  {/* Location */}
                  {scheduleToDelete.location && (
                    <div className="flex items-start gap-3">
                      <span className="text-slate-400 text-sm font-semibold min-w-fit">Location:</span>
                      <p className="text-sm text-slate-700">{scheduleToDelete.location.name}</p>
                    </div>
                  )}

                  {/* Schedule Time */}
                  <div className="flex items-start gap-3">
                    <span className="text-slate-400 text-sm font-semibold min-w-fit">Schedule:</span>
                    <p className="text-sm text-slate-700">{scheduleToDelete.day_of_week} • {formatTime12Hour(scheduleToDelete.start_time)} - {formatTime12Hour(scheduleToDelete.end_time)}</p>
                  </div>

                  {/* Year & Section */}
                  {(scheduleToDelete.year_level || scheduleToDelete.section) && (
                    <div className="flex items-start gap-3">
                      <span className="text-slate-400 text-sm font-semibold min-w-fit">Class:</span>
                      <p className="text-sm text-slate-700">{scheduleToDelete.year_level} Year {scheduleToDelete.section && `- Section ${scheduleToDelete.section}`}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Impact Warning */}
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <p className="text-xs font-bold text-amber-900 uppercase tracking-wide mb-2">Impact</p>
                <ul className="text-xs text-amber-900 space-y-1.5 ml-3 list-disc">
                  <li>Faculty member will lose this teaching assignment</li>
                  <li>Students in this class will have this schedule removed</li>
                  <li>Location availability will be updated</li>
                </ul>
              </div>
            </div>

            {/* Footer */}
            <div className="flex gap-3 border-t border-slate-200 bg-slate-50/50 px-6 py-4">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setScheduleToDelete(null);
                }}
                disabled={isDeleting}
                className="flex-1 px-4 py-2.5 rounded-lg border-2 border-slate-300 bg-white text-slate-700 font-semibold hover:bg-slate-100 hover:border-slate-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                Cancel
              </button>
              <button
                onClick={confirmDeleteSchedule}
                disabled={isDeleting}
                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-gradient-to-r from-red-600 to-red-700 text-white font-semibold hover:shadow-lg hover:from-red-700 hover:to-red-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                <Trash2 size={16} />
                {isDeleting ? 'Removing...' : 'Remove Schedule'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reassign Faculty Modal */}
      {showReassignModal && scheduleToReassign && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity animate-in fade-in duration-200"></div>
          <div className="relative w-full max-w-md transform rounded-2xl bg-white shadow-2xl transition-all animate-in scale-in-95 fade-in duration-300 overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-6">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-white/20 rounded-lg backdrop-blur-sm border border-white/20">
                  <Calendar size={20} className="text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">Reassign Schedule</h2>
                  <p className="text-blue-100/90 mt-0.5 text-xs font-medium">Select a new faculty member</p>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="px-6 py-6 space-y-4">
              {/* Current Schedule Details */}
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-3">
                <p className="text-xs font-bold text-slate-700 uppercase tracking-wide">Current Assignment</p>
                
                <div className="space-y-2">
                  <div className="flex items-start gap-3">
                    <span className="text-slate-400 text-sm font-semibold min-w-fit">Subject:</span>
                    <p className="text-sm font-semibold text-slate-900">{scheduleToReassign.subject?.subject_code}</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="text-slate-400 text-sm font-semibold min-w-fit">Current Faculty:</span>
                    <p className="text-sm text-slate-700">{scheduleToReassign.faculty?.first_name} {scheduleToReassign.faculty?.last_name}</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="text-slate-400 text-sm font-semibold min-w-fit">Schedule:</span>
                    <p className="text-sm text-slate-700">{scheduleToReassign.day_of_week} • {formatTime12Hour(scheduleToReassign.start_time)} - {formatTime12Hour(scheduleToReassign.end_time)}</p>
                  </div>
                </div>
              </div>

              {/* Faculty Selection */}
              <div>
                <label className="block text-sm font-semibold text-slate-900 mb-3">Select New Faculty Member</label>
                <SimpleSelector
                  options={filteredFaculty.map(fac => ({
                    value: fac.id,
                    label: `${fac.first_name} ${fac.last_name}`
                  }))}
                  value={selectedReassignFaculty?.id || ''}
                  onChange={(value) => {
                    const selected = filteredFaculty.find(fac => fac.id === value);
                    setSelectedReassignFaculty(selected || null);
                  }}
                  placeholder={
                    filteredFaculty.length === 0 
                      ? "No faculty members available" 
                      : "Select Faculty"
                  }
                  disabled={filteredFaculty.length === 0}
                  searchable={true}
                />
              </div>
            </div>

            {/* Footer */}
            <div className="flex gap-3 border-t border-slate-200 bg-slate-50/50 px-6 py-4">
              <button
                onClick={() => {
                  setShowReassignModal(false);
                  setScheduleToReassign(null);
                  setSelectedReassignFaculty(null);
                }}
                disabled={isReassigning}
                className="flex-1 px-4 py-2.5 rounded-lg border-2 border-slate-300 bg-white text-slate-700 font-semibold hover:bg-slate-100 hover:border-slate-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmReassign}
                disabled={isReassigning || !selectedReassignFaculty}
                className="flex-1 px-4 py-2.5 rounded-lg bg-gradient-to-r from-blue-600 to-blue-700 text-white font-semibold hover:shadow-lg hover:from-blue-700 hover:to-blue-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {isReassigning ? 'Reassigning...' : 'Confirm Reassign'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Schedule Change Requested Modal */}
      <ScheduleChangeRequestedModal
        isOpen={showChangeRequestedModal}
        onClose={() => {
          setShowChangeRequestedModal(false);
          setChangeRequestedScheduleId(null);
        }}
        scheduleId={changeRequestedScheduleId}
        facultyData={programHeadData}
        locations={locations}
        onScheduleUpdated={() => {
          console.log('✅ Schedule updated from change request modal');
          loadInitialData();
        }}
      />

      {/* Rejected Schedule Modal */}
      {showRejectedScheduleModal && selectedRejectedSchedule && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden">
          <div 
            className="fixed inset-0 bg-black/60 backdrop-blur-md transition-opacity"
            onClick={() => {
              setShowRejectedScheduleModal(false);
              setSelectedRejectedSchedule(null);
              setRejectionReason('');
            }}
            aria-hidden="true"
          ></div>
          
          <div className="relative bg-white rounded-2xl shadow-2xl max-w-2xl w-full mx-4 max-h-[85vh] overflow-hidden flex flex-col transform transition-all">
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
                  setShowRejectedScheduleModal(false);
                  setSelectedRejectedSchedule(null);
                  setRejectionReason('');
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
                        {selectedRejectedSchedule?.faculty?.first_name?.charAt(0)}{selectedRejectedSchedule?.faculty?.last_name?.charAt(0)}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{selectedRejectedSchedule?.faculty?.first_name} {selectedRejectedSchedule?.faculty?.last_name}</p>
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
                      <p className="text-sm text-slate-900">{selectedRejectedSchedule?.subject?.subject_code}</p>
                      <p className="text-xs text-slate-600 mt-0.5">{selectedRejectedSchedule?.subject?.subject_name || 'N/A'}</p>
                    </div>

                    {/* Program */}
                    <div>
                      <p className="text-xs text-slate-600 font-semibold mb-1">Program</p>
                      <p className="text-sm text-slate-900">{selectedRejectedSchedule?.course?.course_name || 'N/A'}</p>
                    </div>

                    {/* Day & Time */}
                    <div>
                      <p className="text-xs text-slate-600 font-semibold mb-1">Day & Time</p>
                      <p className="text-sm text-slate-900">{selectedRejectedSchedule?.day_of_week}</p>
                      <p className="text-xs text-slate-600 mt-0.5">{formatTime12Hour(selectedRejectedSchedule?.start_time)} - {formatTime12Hour(selectedRejectedSchedule?.end_time)}</p>
                    </div>

                    {/* Location */}
                    <div>
                      <p className="text-xs text-slate-600 font-semibold mb-1">Location</p>
                      <p className="text-sm text-slate-900">{selectedRejectedSchedule?.location?.name || 'N/A'}</p>
                    </div>

                    {/* Component Type */}
                    <div>
                      <p className="text-xs text-slate-600 font-semibold mb-1">Component</p>
                      <p className="text-sm text-slate-900">
                        {selectedRejectedSchedule?.course_subject_offering?.offering_type === 'LEC' ? 'Lecture' : selectedRejectedSchedule?.course_subject_offering?.offering_type === 'LAB' ? 'Laboratory' : 'N/A'}
                      </p>
                    </div>

                    {/* Year & Section */}
                    <div>
                      <p className="text-xs text-slate-600 font-semibold mb-1">Year & Section</p>
                      <p className="text-sm text-slate-900">{selectedRejectedSchedule?.year_level} - Sec {selectedRejectedSchedule?.section}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="bg-slate-50 border-t border-slate-200 px-5 py-3 flex gap-2 justify-end flex-shrink-0">
              <button
                onClick={() => {
                  setShowRejectedScheduleModal(false);
                  setSelectedRejectedSchedule(null);
                  setRejectionReason('');
                }}
                className="px-4 py-2 rounded-lg border border-slate-300 bg-white text-slate-700 text-sm font-semibold hover:bg-slate-100 transition-all"
              >
                Close
              </button>
              <button
                onClick={() => {
                  setShowRejectedScheduleModal(false);
                  handleOpenReassignModal(selectedRejectedSchedule);
                  setSelectedRejectedSchedule(null);
                  setRejectionReason('');
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-all"
              >
                <RefreshCw size={14} />
                Reassign
              </button>
              <button
                onClick={() => {
                  setShowRejectedScheduleModal(false);
                  setShowDeleteModal(true);
                  setScheduleToDelete(selectedRejectedSchedule);
                  setSelectedRejectedSchedule(null);
                  setRejectionReason('');
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-semibold hover:bg-red-700 transition-all"
              >
                <Trash2 size={14} />
                <span>Remove</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Scheduling;


