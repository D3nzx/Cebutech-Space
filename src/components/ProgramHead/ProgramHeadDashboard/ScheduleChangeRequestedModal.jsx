import React, { useState, useEffect } from 'react';
import { X, AlertCircle, Clock, MapPin, BookOpen, User, ChevronRight, CheckCircle, ArrowLeft, Info } from 'lucide-react';
import { supabase } from '../../../lib/supabaseClient';
import { markNotificationAsRead } from '../../../api/notifications';
import SimpleSelector from '../../SimpleSelector';
import LocationSelector from '../../LocationSelector';

function ScheduleChangeRequestedModal({ isOpen, onClose, scheduleId, facultyData, onScheduleUpdated, locations = [] }) {
  const [schedule, setSchedule] = useState(null);
  const [approval, setApproval] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentStep, setCurrentStep] = useState(1);
  const [editedSchedule, setEditedSchedule] = useState(null);
  const [error, setError] = useState(null);
  const [isSending, setIsSending] = useState(false);
  const [errors, setErrors] = useState({});
  const [conflicts, setConflicts] = useState(null);
  const [showConflictWarning, setShowConflictWarning] = useState(false);
  const [allSchedules, setAllSchedules] = useState([]);

  const daysOfWeek = [
    { value: 'Monday', label: 'Monday' },
    { value: 'Tuesday', label: 'Tuesday' },
    { value: 'Wednesday', label: 'Wednesday' },
    { value: 'Thursday', label: 'Thursday' },
    { value: 'Friday', label: 'Friday' },
    { value: 'Saturday', label: 'Saturday' },
    { value: 'Sunday', label: 'Sunday' }
  ];

  // Reset step when modal opens
  useEffect(() => {
    if (isOpen) {
      setCurrentStep(1);
      setError(null);
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && scheduleId) {
      fetchScheduleAndApproval();
    }
  }, [isOpen, scheduleId]);

  const fetchScheduleAndApproval = async () => {
    setIsLoading(true);
    setError(null);
    try {
      // Fetch schedule details without inline relationships (Supabase schema cache issue)
      const { data: scheduleData, error: scheduleError } = await supabase
        .from('schedules')
        .select('*')
        .eq('id', scheduleId)
        .single();

      if (scheduleError) {
        console.error('❌ Error fetching schedule:', scheduleError);
        setError('Failed to load schedule details');
        setIsLoading(false);
        return;
      }

      // Fetch related data separately
      if (scheduleData) {
        const [subjectsRes, facultyRes, locationsRes, coursesRes, offeringsRes] = await Promise.all([
          scheduleData.subject_id ? supabase.from('subjects').select('*').eq('id', scheduleData.subject_id).single() : Promise.resolve({ data: null }),
          scheduleData.faculty_id ? supabase.from('faculty').select('*').eq('id', scheduleData.faculty_id).single() : Promise.resolve({ data: null }),
          scheduleData.location_id ? supabase.from('locations').select('*').eq('id', scheduleData.location_id).single() : Promise.resolve({ data: null }),
          scheduleData.course_id ? supabase.from('courses').select('*').eq('id', scheduleData.course_id).single() : Promise.resolve({ data: null }),
          scheduleData.course_subject_offering_id ? supabase.from('course_subject_offerings').select('*').eq('id', scheduleData.course_subject_offering_id).single() : Promise.resolve({ data: null })
        ]);

        // Enrich schedule with related data
        const enrichedSchedule = {
          ...scheduleData,
          subject: subjectsRes.data || null,
          faculty: facultyRes.data || null,
          location: locationsRes.data || null,
          course: coursesRes.data || null,
          course_subject_offering: offeringsRes.data || null
        };

        // Fetch approval details with faculty's change request
        const { data: approvalData, error: approvalError } = await supabase
          .from('schedule_approvals')
          .select('*')
          .eq('schedule_id', scheduleId)
          .eq('status', 'requested_change')
          .single();

        if (approvalError && approvalError.code !== 'PGRST116') {
          console.error('❌ Error fetching approval:', approvalError);
        }

        // Fetch all schedules for conflict detection without inline relationships
        const { data: allSchedulesData } = await supabase
          .from('schedules')
          .select('*');

        // Enrich all schedules with related data
        if (allSchedulesData && allSchedulesData.length > 0) {
          const subjectIds = [...new Set(allSchedulesData.map(s => s.subject_id).filter(Boolean))];
          const facultyIds = [...new Set(allSchedulesData.map(s => s.faculty_id).filter(Boolean))];
          const locationIds = [...new Set(allSchedulesData.map(s => s.location_id).filter(Boolean))];
          const courseIds = [...new Set(allSchedulesData.map(s => s.course_id).filter(Boolean))];

          const [subjectsDataRes, facultyDataRes, locationsDataRes, coursesDataRes] = await Promise.all([
            subjectIds.length > 0 ? supabase.from('subjects').select('*').in('id', subjectIds) : Promise.resolve({ data: [] }),
            facultyIds.length > 0 ? supabase.from('faculty').select('*').in('id', facultyIds) : Promise.resolve({ data: [] }),
            locationIds.length > 0 ? supabase.from('locations').select('*').in('id', locationIds) : Promise.resolve({ data: [] }),
            courseIds.length > 0 ? supabase.from('courses').select('*').in('id', courseIds) : Promise.resolve({ data: [] })
          ]);

          // Create lookup maps
          const subjectsMap = {};
          const facultyMap = {};
          const locationsMap = {};
          const coursesMap = {};

          if (subjectsDataRes.data) subjectsDataRes.data.forEach(s => subjectsMap[s.id] = s);
          if (facultyDataRes.data) facultyDataRes.data.forEach(f => facultyMap[f.id] = f);
          if (locationsDataRes.data) locationsDataRes.data.forEach(l => locationsMap[l.id] = l);
          if (coursesDataRes.data) coursesDataRes.data.forEach(c => coursesMap[c.id] = c);

          // Enrich all schedules
          const enrichedAllSchedules = allSchedulesData.map(schedule => ({
            ...schedule,
            subject: subjectsMap[schedule.subject_id] || null,
            faculty: facultyMap[schedule.faculty_id] || null,
            location: locationsMap[schedule.location_id] || null,
            course: coursesMap[schedule.course_id] || null
          }));

          setAllSchedules(enrichedAllSchedules);
        }

        setSchedule(enrichedSchedule);
        setApproval(approvalData || null);
        setEditedSchedule(enrichedSchedule);
      }
    } catch (err) {
      console.error('❌ Exception fetching data:', err);
      setError('An error occurred while loading schedule details');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDisapproveChangeRequest = async () => {
    try {
      setIsSending(true);
      setError(null);

      const facultyId = editedSchedule?.faculty_id || schedule?.faculty_id;
      const subjectId = editedSchedule?.subject_id || schedule?.subject_id;

      if (!facultyId) {
        setError('Unable to determine the faculty for this schedule');
        return;
      }

      const { error: approvalError } = await supabase
        .from('schedule_approvals')
        .update({
          status: 'pending',
          updated_at: new Date().toISOString()
        })
        .eq('schedule_id', scheduleId)
        .eq('status', 'requested_change');

      if (approvalError) {
        console.error('❌ Error resetting approval after disapprove:', approvalError);
        setError('Failed to disapprove change request');
        return;
      }

      const { data: subjectData } = await supabase
        .from('subjects')
        .select('subject_code')
        .eq('id', subjectId)
        .single();

      await supabase
        .from('notifications')
        .insert({
          recipient_id: facultyId,
          recipient_type: 'faculty',
          notification_type: 'change_request_disapproved',
          title: 'Change Request Disapproved',
          message: `Your change request for ${subjectData?.subject_code || 'this subject'} was disapproved by the Program Head. Please review the original schedule and respond.`,
          related_schedule_id: scheduleId,
          created_at: new Date().toISOString()
        });

      try {
        const { error: notifUpdateError } = await supabase
          .from('notifications')
          .update({
            is_read: true,
            read_at: new Date().toISOString()
          })
          .eq('related_schedule_id', scheduleId)
          .eq('notification_type', 'change_requested');

        if (notifUpdateError) {
          console.error('❌ Error auto-clearing change_requested notification:', notifUpdateError);
        }

        if (window.clearProgramHeadNotificationsForSchedule) {
          window.clearProgramHeadNotificationsForSchedule(scheduleId);
        }
      } catch (notifErr) {
        console.error('❌ Exception auto-clearing notification:', notifErr);
      }

      if (onScheduleUpdated) {
        onScheduleUpdated();
      }

      onClose();
    } catch (err) {
      console.error('❌ Exception disapproving change request:', err);
      setError('An error occurred while disapproving the change request');
    } finally {
      setIsSending(false);
    }
  };

  // Parse time string to minutes for comparison
  const parseTime = (timeStr) => {
    if (!timeStr) return 0;
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
  };

  // Check for conflicts with other schedules
  const detectConflicts = (scheduleToCheck) => {
    const conflicts = {
      room: [],
      faculty: []
    };

    for (const otherSchedule of allSchedules) {
      // Skip self
      if (otherSchedule.id === scheduleId) continue;
      // Different day, no conflict
      if (otherSchedule.day_of_week !== scheduleToCheck.day_of_week) continue;

      // Check if times overlap
      const checkStart = parseTime(scheduleToCheck.start_time);
      const checkEnd = parseTime(scheduleToCheck.end_time);
      const otherStart = parseTime(otherSchedule.start_time);
      const otherEnd = parseTime(otherSchedule.end_time);

      const timesOverlap = (checkStart < otherEnd && checkEnd > otherStart);

      if (!timesOverlap) continue;

      // Room conflict: same location with overlapping times
      if (scheduleToCheck.location_id === otherSchedule.location_id) {
        conflicts.room.push(otherSchedule);
      }

      // Faculty conflict: same faculty with overlapping times
      if (scheduleToCheck.faculty_id === otherSchedule.faculty_id) {
        conflicts.faculty.push(otherSchedule);
      }
    }

    return conflicts;
  };

  const handleEditChange = (field, value) => {
    setEditedSchedule(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const getTimeValidationWarning = (timeField) => {
    const timeValue = editedSchedule?.[timeField];
    if (!timeValue) return null;

    const [hours, minutes] = timeValue.split(':').map(Number);
    if (hours > 21 || (hours === 21 && minutes > 0)) {
      return 'Value must be 9:00 PM or earlier';
    }
    return null;
  };

  const validateStep2 = () => {
    const newErrors = {};
    let isValid = true;

    if (!editedSchedule?.day_of_week) {
      newErrors.day_of_week = 'Day is required';
      isValid = false;
    }
    if (!editedSchedule?.start_time) {
      newErrors.start_time = 'Start time is required';
      isValid = false;
    }
    if (!editedSchedule?.end_time) {
      newErrors.end_time = 'End time is required';
      isValid = false;
    }
    if (editedSchedule?.start_time && editedSchedule?.end_time && editedSchedule.start_time >= editedSchedule.end_time) {
      newErrors.end_time = 'End time must be after start time';
      isValid = false;
    }
    if (!editedSchedule?.location_id) {
      newErrors.location_id = 'Location is required';
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

  const handleNextStep = () => {
    // If on Step 2, validate and check for conflicts before proceeding to Step 3
    if (currentStep === 2) {
      if (!validateStep2()) {
        console.log('❌ Step 2 validation failed');
        return;
      }

      // Perform conflict detection
      console.log('🔍 Detecting conflicts for modified schedule...');
      const detectedConflicts = detectConflicts(editedSchedule);

      if (detectedConflicts.room.length > 0 || detectedConflicts.faculty.length > 0) {
        console.log('⚠️ Conflicts detected:', detectedConflicts);
        setConflicts(detectedConflicts);
        setShowConflictWarning(true);
        return; // Don't proceed to Step 3 yet
      }

      console.log('✅ No conflicts detected, proceeding to Step 3');
    }

    // Move to next step
    setCurrentStep(prev => Math.min(prev + 1, 3));
  };

  const handlePreviousStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const formatTime = (time) => {
    if (!time) return '';
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours, 10);
    const isPM = hour >= 12;
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${isPM ? 'PM' : 'AM'}`;
  };

  if (!isOpen) return null;

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-2xl w-full">
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-200 border-t-blue-600"></div>
          </div>
          <p className="text-center text-gray-600 mt-4">Loading schedule details...</p>
        </div>
      </div>
    );
  }


  const handleConfirmResend = async () => {
    try {
      setIsSending(true);
      
      // Update the schedule with new details
      const { error: updateError } = await supabase
        .from('schedules')
        .update({
          day_of_week: editedSchedule.day_of_week,
          start_time: editedSchedule.start_time,
          end_time: editedSchedule.end_time,
          location_id: editedSchedule.location_id,
          is_active: false,
          updated_at: new Date().toISOString()
        })
        .eq('id', scheduleId);

      if (updateError) {
        console.error('❌ Error updating schedule:', updateError);
        setError('Failed to update schedule');
        return;
      }

      // Reset approval status to pending
      const { error: approvalError } = await supabase
        .from('schedule_approvals')
        .update({
          status: 'pending',
          faculty_response: null,
          faculty_availability_notes: null,
          updated_at: new Date().toISOString()
        })
        .eq('schedule_id', scheduleId);

      if (approvalError) {
        console.error('❌ Error resetting approval:', approvalError);
      }

      // Create notification for faculty
      const { data: subjectData } = await supabase
        .from('subjects')
        .select('subject_code')
        .eq('id', editedSchedule.subject_id)
        .single();

      await supabase
        .from('notifications')
        .insert({
          recipient_id: editedSchedule.faculty_id,
          recipient_type: 'faculty',
          notification_type: 'schedule_updated',
          title: 'Schedule Updated',
          message: `Your schedule for ${subjectData?.subject_code || 'Unknown Subject'} has been updated. Please review and approve.`,
          related_schedule_id: scheduleId,
          created_at: new Date().toISOString()
        });

      // Auto-clear the "change_requested" notification for Program Head
      try {
        console.log('🔔 Attempting to auto-clear change_requested notification for schedule:', scheduleId);
        
        // Update the database to mark as read
        const { data: clearedNotifs, error: notifUpdateError } = await supabase
          .from('notifications')
          .update({
            is_read: true,
            read_at: new Date().toISOString()
          })
          .eq('related_schedule_id', scheduleId)
          .eq('notification_type', 'change_requested')
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

        // Also directly remove from UI via the exposed method
        if (window.clearProgramHeadNotificationsForSchedule) {
          console.log('🎯 Calling clearProgramHeadNotificationsForSchedule directly...');
          window.clearProgramHeadNotificationsForSchedule(scheduleId);
        }
      } catch (notifErr) {
        console.error('❌ Exception auto-clearing notification:', notifErr);
      }

      console.log('✅ Schedule updated and notification sent');
      
      if (onScheduleUpdated) {
        onScheduleUpdated();
      }
      
      onClose();
    } catch (err) {
      console.error('❌ Exception updating schedule:', err);
      setError('An error occurred while updating the schedule');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden">
      <div 
        className="fixed inset-0 bg-black/60 backdrop-blur-md transition-opacity"
        aria-hidden="true"
        style={{ 
          WebkitBackdropFilter: 'blur(12px)',
          backdropFilter: 'blur(12px)'
        }}
      ></div>
      
      <div className="relative bg-white rounded-2xl shadow-2xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-hidden flex flex-col transform transition-all">
        {/* Header with Step Indicator */}
        <div className="bg-gradient-to-r from-amber-50 to-orange-50 border-b border-amber-200 p-6">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Schedule Change Requested</h2>
              <p className="text-sm text-gray-600 mt-1">Step {currentStep} of 3</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 bg-slate-100 border border-slate-300 hover:bg-slate-200 rounded-lg transition-colors"
            >
              <X size={24} className="text-gray-600" />
            </button>
          </div>
          
          {/* Step Indicator */}
          <div className="flex gap-2">
            {[1, 2, 3].map(step => (
              <div
                key={step}
                className={`flex-1 h-2 rounded-full transition-colors ${
                  step <= currentStep ? 'bg-amber-500' : 'bg-amber-200'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Content Area - Scrollable */}
        <div className="flex-1 overflow-y-auto p-6">
          {error && (
            <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-lg mb-6">
              <AlertCircle size={20} className="text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          {/* STEP 1: Faculty's Change Request */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <div className="bg-amber-50 border-2 border-amber-200 rounded-xl p-6">
                <h3 className="font-bold text-amber-900 text-lg mb-4 flex items-center gap-2">
                  <AlertCircle size={20} />
                  Change Request Details
                </h3>
                <div className="space-y-4">
                  <div>
                    <p className="text-xs text-amber-700 uppercase tracking-wider font-semibold mb-2">Reason for Change</p>
                    <p className="text-sm text-amber-900 bg-white rounded-lg p-4 border border-amber-100">
                      {approval?.faculty_response || 'No reason provided'}
                    </p>
                  </div>
                  {approval?.faculty_availability_notes && (
                    <div>
                      <p className="text-xs text-amber-700 uppercase tracking-wider font-semibold mb-2">Available Times</p>
                      <p className="text-sm text-amber-900 bg-white rounded-lg p-4 border border-amber-100">
                        {approval.faculty_availability_notes}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
                <h3 className="font-bold text-blue-900 text-lg mb-4">Current Schedule</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-blue-700 uppercase tracking-wider font-semibold">Subject</p>
                    <p className="text-sm font-semibold text-blue-900 mt-2">
                      {schedule?.subject?.subject_code} - {schedule?.subject?.subject_name}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-blue-700 uppercase tracking-wider font-semibold">Schedule</p>
                    <p className="text-sm font-semibold text-blue-900 mt-2">
                      {schedule?.day_of_week}, {formatTime(schedule?.start_time)} - {formatTime(schedule?.end_time)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-blue-700 uppercase tracking-wider font-semibold">Location</p>
                    <p className="text-sm font-semibold text-blue-900 mt-2">{schedule?.location?.name}</p>
                  </div>
                  <div>
                    <p className="text-xs text-blue-700 uppercase tracking-wider font-semibold">Year & Section</p>
                    <p className="text-sm font-semibold text-blue-900 mt-2">
                      {schedule?.year_level} • Section {schedule?.section}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: Modify Schedule */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <div className="bg-green-50 border border-green-200 rounded-xl p-6">
                <h3 className="font-bold text-green-900 text-lg mb-6">Update Schedule</h3>
                
                <div className="space-y-5">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      Day
                    </label>
                    <SimpleSelector
                      options={daysOfWeek}
                      value={editedSchedule?.day_of_week || ''}
                      onChange={(value) => {
                        handleEditChange('day_of_week', value);
                        if (errors.day_of_week) setErrors(prev => ({ ...prev, day_of_week: '' }));
                      }}
                      placeholder="Select Day"
                      searchable={false}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">
                        Start Time
                      </label>
                      <input
                        type="time"
                        value={editedSchedule?.start_time || ''}
                        onChange={(e) => {
                          handleEditChange('start_time', e.target.value);
                          if (errors.start_time) setErrors(prev => ({ ...prev, start_time: '' }));
                        }}
                        max="21:00"
                        className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all bg-white"
                      />
                      {getTimeValidationWarning('start_time') && (
                        <div className="flex items-center gap-2 mt-2 px-3 py-2 bg-orange-100 border border-orange-300 rounded-lg">
                          <AlertCircle size={16} className="text-orange-600 flex-shrink-0" />
                          <span className="text-sm text-orange-700 font-medium">{getTimeValidationWarning('start_time')}</span>
                        </div>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">
                        End Time
                      </label>
                      <input
                        type="time"
                        value={editedSchedule?.end_time || ''}
                        onChange={(e) => {
                          handleEditChange('end_time', e.target.value);
                          if (errors.end_time) setErrors(prev => ({ ...prev, end_time: '' }));
                        }}
                        max="21:00"
                        className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all bg-white"
                      />
                      {getTimeValidationWarning('end_time') && (
                        <div className="flex items-center gap-2 mt-2 px-3 py-2 bg-orange-100 border border-orange-300 rounded-lg">
                          <AlertCircle size={16} className="text-orange-600 flex-shrink-0" />
                          <span className="text-sm text-orange-700 font-medium">{getTimeValidationWarning('end_time')}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      Room/Location
                    </label>
                    <LocationSelector
                      locations={locations || []}
                      value={editedSchedule?.location_id || ''}
                      onChange={(locationId) => {
                        handleEditChange('location_id', locationId);
                        if (errors.location_id) setErrors(prev => ({ ...prev, location_id: '' }));
                      }}
                      placeholder="Select Location"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: Confirm & Send */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-300 rounded-xl p-6">
                <h3 className="font-bold text-blue-900 text-lg mb-6 flex items-center gap-2">
                  <CheckCircle size={20} />
                  Review & Confirm Changes
                </h3>

                {/* Side-by-side Comparison */}
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="bg-white rounded-lg p-4 border border-blue-200">
                    <p className="text-xs text-gray-600 uppercase tracking-wider font-semibold mb-3">Original Schedule</p>
                    <div className="space-y-2">
                      <div>
                        <p className="text-xs text-gray-500">Day</p>
                        <p className="text-sm font-semibold text-gray-900">{schedule?.day_of_week}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Time</p>
                        <p className="text-sm font-semibold text-gray-900">
                          {formatTime(schedule?.start_time)} - {formatTime(schedule?.end_time)}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white rounded-lg p-4 border border-green-200">
                    <p className="text-xs text-gray-600 uppercase tracking-wider font-semibold mb-3">New Schedule</p>
                    <div className="space-y-2">
                      <div>
                        <p className="text-xs text-gray-500">Day</p>
                        <p className="text-sm font-semibold text-green-700">{editedSchedule?.day_of_week}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Time</p>
                        <p className="text-sm font-semibold text-green-700">
                          {formatTime(editedSchedule?.start_time)} - {formatTime(editedSchedule?.end_time)}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Faculty's Request Summary */}
                <div className="bg-white rounded-lg p-4 border border-blue-200">
                  <p className="text-xs text-gray-600 uppercase tracking-wider font-semibold mb-2">Change Request Reason</p>
                  <p className="text-sm text-gray-700">{approval?.faculty_response || 'No reason provided'}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-gray-50 border-t border-gray-200 p-6 flex gap-3 justify-between">
          <button
            onClick={currentStep === 1 ? onClose : handlePreviousStep}
            className="px-6 py-2.5 bg-slate-100 border border-slate-300 text-gray-700 rounded-lg hover:bg-slate-200 font-semibold transition-colors flex items-center gap-2"
            disabled={isSending}
          >
            <ArrowLeft size={16} />
            {currentStep === 1 ? 'Cancel' : 'Back'}
          </button>

          <div className="flex gap-3">
            {currentStep === 1 && (
              <button
                onClick={handleDisapproveChangeRequest}
                className="px-6 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 font-semibold transition-colors disabled:opacity-50"
                disabled={isSending}
              >
                {isSending ? 'Processing...' : 'Disapprove Request'}
              </button>
            )}
            {currentStep < 3 && (
              <button
                onClick={handleNextStep}
                className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold transition-colors flex items-center gap-2 disabled:opacity-50"
                disabled={isSending}
              >
                Next
                <ChevronRight size={16} />
              </button>
            )}

            {currentStep === 3 && (
              <button
                onClick={handleConfirmResend}
                className="px-6 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold transition-colors disabled:opacity-50"
                disabled={isSending}
              >
                {isSending ? 'Saving...' : 'Save Changes'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Conflict Warning Modal */}
      {showConflictWarning && conflicts && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden">
          <div 
            className="fixed inset-0 bg-black/60 backdrop-blur-md transition-opacity"
            aria-hidden="true"
            style={{ 
              WebkitBackdropFilter: 'blur(12px)',
              backdropFilter: 'blur(12px)'
            }}
          ></div>
          
          {/* Modal */}
          <div className="relative bg-white rounded-2xl shadow-2xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-hidden flex flex-col transform transition-all">
            {/* Header */}
            <div className="bg-gradient-to-r from-red-600 to-red-700 px-8 py-6">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm border border-white/30 flex-shrink-0">
                  <AlertCircle className="text-white" size={28} />
                </div>
                <div className="flex-1">
                  <h2 className="text-2xl font-bold text-white mb-1">Schedule Conflicts Detected</h2>
                  <p className="text-red-100 text-sm leading-relaxed">
                    We found scheduling conflicts. Please adjust your schedule to resolve these issues.
                  </p>
                </div>
              </div>
            </div>

            {/* Content - Scrollable */}
            <div className="flex-1 overflow-y-auto bg-white">
              <div className="p-8 space-y-6">
                {/* Room Conflicts */}
                {conflicts.room && conflicts.room.length > 0 && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-3 pb-3 border-b border-gray-200">
                      <div className="p-2.5 bg-red-100 rounded-lg">
                        <MapPin className="text-red-600" size={20} />
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-gray-900">Room Conflicts</h3>
                        <p className="text-xs text-gray-500 mt-0.5">{conflicts.room.length} room{conflicts.room.length !== 1 ? 's' : ''} unavailable at this time</p>
                      </div>
                    </div>
                    <div className="space-y-3">
                      {conflicts.room.map((conflict, index) => (
                        <div
                          key={index}
                          className="bg-gradient-to-br from-red-50 to-red-50/50 border border-red-200 rounded-xl p-5"
                        >
                          <p className="font-semibold text-gray-900 text-base mb-3">
                            {conflict.subject?.subject_name || 'Unknown Subject'}
                          </p>
                          <div className="space-y-2.5">
                            <div className="flex items-center gap-3 text-sm">
                              <User size={16} className="text-red-600" />
                              <span className="text-gray-700">
                                {conflict.faculty?.first_name && conflict.faculty?.last_name
                                  ? `${conflict.faculty.first_name} ${conflict.faculty.last_name}`
                                  : 'Unknown Faculty'}
                              </span>
                            </div>
                            <div className="flex items-center gap-3 text-sm">
                              <Clock size={16} className="text-red-600" />
                              <span className="text-gray-700 font-medium">
                                {formatTime(conflict.start_time)} – {formatTime(conflict.end_time)}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Faculty Conflicts */}
                {conflicts.faculty && conflicts.faculty.length > 0 && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-3 pb-3 border-b border-gray-200">
                      <div className="p-2.5 bg-orange-100 rounded-lg">
                        <User className="text-orange-600" size={20} />
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-gray-900">Faculty Conflicts</h3>
                        <p className="text-xs text-gray-500 mt-0.5">{conflicts.faculty.length} faculty member{conflicts.faculty.length !== 1 ? 's' : ''} unavailable at this time</p>
                      </div>
                    </div>
                    <div className="space-y-3">
                      {conflicts.faculty.map((conflict, index) => (
                        <div
                          key={index}
                          className="bg-gradient-to-br from-orange-50 to-orange-50/50 border border-orange-200 rounded-xl p-5"
                        >
                          <p className="font-semibold text-gray-900 text-base mb-3">
                            {conflict.subject?.subject_name || 'Unknown Subject'}
                          </p>
                          <div className="space-y-2.5">
                            <div className="flex items-center gap-3 text-sm">
                              <MapPin size={16} className="text-orange-600" />
                              <span className="text-gray-700 font-medium">{conflict.location?.name || 'Unknown Location'}</span>
                            </div>
                            <div className="flex items-center gap-3 text-sm">
                              <Clock size={16} className="text-orange-600" />
                              <span className="text-gray-700 font-medium">
                                {formatTime(conflict.start_time)} – {formatTime(conflict.end_time)}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="border-t border-gray-200 bg-gray-50 px-8 py-5 flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowConflictWarning(false);
                  setConflicts(null);
                }}
                className="px-6 py-2.5 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-100 hover:border-gray-400 transition-all duration-200 font-medium text-sm focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2"
              >
                Go Back
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ScheduleChangeRequestedModal;
