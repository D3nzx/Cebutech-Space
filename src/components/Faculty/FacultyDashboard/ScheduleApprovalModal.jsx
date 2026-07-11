import React, { useState, useEffect } from 'react';
import { X, AlertCircle, Clock, Calendar } from 'lucide-react';
import { supabase } from '../../../lib/supabaseClient';

function ScheduleApprovalModal({ isOpen, onClose, schedule, onSubmit, isLoading }) {
  const [action, setAction] = useState(null); // 'approve', 'reject', 'request_change'
  const [reason, setReason] = useState('');
  const [availabilityNotes, setAvailabilityNotes] = useState('');
  const [selectedDays, setSelectedDays] = useState([]);
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [error, setError] = useState('');
  const [validationModal, setValidationModal] = useState({ isOpen: false, title: '', message: '', type: '' });
  const [lastChangeRequest, setLastChangeRequest] = useState(null);
  const [offeringUnits, setOfferingUnits] = useState(null);

  const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  // Save approval form data to sessionStorage whenever it changes
  useEffect(() => {
    if (isOpen && schedule) {
      const approvalData = {
        action,
        reason,
        selectedDays,
        startTime,
        endTime,
        scheduleId: schedule.id,
        timestamp: Date.now()
      };
      sessionStorage.setItem(`approvalModal_${schedule.id}`, JSON.stringify(approvalData));
      console.log('💾 Saved approval form data for schedule:', schedule.id);
    }
  }, [isOpen, action, reason, selectedDays, startTime, endTime, schedule]);

  // Restore approval form data from sessionStorage on modal open
  useEffect(() => {
    if (isOpen && schedule) {
      try {
        const savedData = sessionStorage.getItem(`approvalModal_${schedule.id}`);
        if (savedData) {
          const { action: savedAction, reason: savedReason, selectedDays: savedDays, startTime: savedStart, endTime: savedEnd } = JSON.parse(savedData);
          console.log('♻️ Restoring approval form data for schedule:', schedule.id);
          setAction(savedAction || null);
          setReason(savedReason || '');
          setSelectedDays(savedDays || []);
          setStartTime(savedStart || '');
          setEndTime(savedEnd || '');
        }
      } catch (error) {
        console.error('❌ Error restoring approval form data:', error);
      }
    }
  }, [isOpen, schedule]);

  // Load last saved change request details (reason + availability) for this schedule
  useEffect(() => {
    const loadLastChangeRequest = async () => {
      if (!isOpen || !schedule?.id) return;
      try {
        const { data, error: fetchError } = await supabase
          .from('schedule_approvals')
          .select('id, status, faculty_response, faculty_availability_notes, faculty_responded_at, updated_at')
          .eq('schedule_id', schedule.id)
          .maybeSingle();

        if (fetchError) {
          console.warn('⚠️ Error loading last change request details:', fetchError);
          setLastChangeRequest(null);
          return;
        }

        setLastChangeRequest(data || null);
      } catch (e) {
        console.warn('⚠️ Exception loading last change request details:', e);
        setLastChangeRequest(null);
      }
    };

    loadLastChangeRequest();
  }, [isOpen, schedule?.id]);

  // Load units (LEC/LAB) from course_subject_offerings for this schedule
  useEffect(() => {
    const loadOfferingUnits = async () => {
      if (!isOpen || !schedule?.id) return;

      // Reset first to avoid showing stale data when switching schedules
      setOfferingUnits(null);

      try {
        // Prefer resolving by course+subject+offering_type (most stable)
        const courseId = schedule.course_id;
        const subjectId = schedule.subject_id;
        const offeringType = schedule.course_subject_offering?.offering_type;

        if (courseId && subjectId && offeringType) {
          const { data, error: fetchError } = await supabase
            .from('course_subject_offerings')
            .select('id, lecture_units, lab_units, contact_hours, offering_type')
            .eq('course_id', courseId)
            .eq('subject_id', subjectId)
            .eq('offering_type', offeringType)
            .maybeSingle();

          if (fetchError) {
            console.warn('⚠️ Error loading offering units (by course/subject/type):', fetchError);
            return;
          }

          setOfferingUnits(data || null);
          return;
        }

        // Fallback: resolve by course_subject_offering_id if present
        const offeringId = schedule.course_subject_offering_id;
        if (offeringId) {
          const { data, error: fetchError } = await supabase
            .from('course_subject_offerings')
            .select('id, lecture_units, lab_units, contact_hours, offering_type')
            .eq('id', offeringId)
            .maybeSingle();

          if (fetchError) {
            console.warn('⚠️ Error loading offering units (by id):', fetchError);
            return;
          }

          setOfferingUnits(data || null);
        }
      } catch (e) {
        console.warn('⚠️ Exception loading offering units:', e);
      }
    };

    loadOfferingUnits();
  }, [isOpen, schedule?.id]);

  const toggleDay = (day) => {
    setSelectedDays(prev =>
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
    );
  };

  const convertTo12Hour = (time24) => {
    if (!time24) return '';
    const [hours, minutes] = time24.split(':');
    const hour = parseInt(hours, 10);
    const isPM = hour >= 12;
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${isPM ? 'PM' : 'AM'}`;
  };

  const generateAvailabilityText = () => {
    if (selectedDays.length === 0 || !startTime || !endTime) {
      return '';
    }
    const dayRange = selectedDays.join(', ');
    const startTime12 = convertTo12Hour(startTime);
    const endTime12 = convertTo12Hour(endTime);
    return `Available: ${dayRange}, ${startTime12} - ${endTime12}`;
  };

  const handleSubmit = () => {
    if (!action) {
      setValidationModal({
        isOpen: true,
        title: 'Action Required',
        message: 'Please select an action (Approve, Request Change, or Reject) before submitting.',
        type: 'warning'
      });
      return;
    }

    if (action === 'reject' && !reason.trim()) {
      setValidationModal({
        isOpen: true,
        title: 'Rejection Reason Required',
        message: 'Please provide a reason for rejecting this schedule. This helps the Program Head understand your constraints.',
        type: 'error'
      });
      return;
    }

    if (action === 'request_change' && !reason.trim()) {
      setValidationModal({
        isOpen: true,
        title: 'Change Request Details Required',
        message: 'Please explain what changes you need to the schedule before submitting your request.',
        type: 'error'
      });
      return;
    }

    if (action === 'request_change' && selectedDays.length === 0) {
      setValidationModal({
        isOpen: true,
        title: 'Availability Days Required',
        message: 'Please select at least one day when you are available for this class.',
        type: 'error'
      });
      return;
    }

    if (action === 'request_change' && (!startTime || !endTime)) {
      setValidationModal({
        isOpen: true,
        title: 'Availability Times Required',
        message: 'Please specify your available start and end times for the selected days.',
        type: 'error'
      });
      return;
    }

    const availabilityText = generateAvailabilityText();
    const response = {
      action,
      reason: reason.trim(),
      availabilityNotes: availabilityText
    };

    onSubmit(response);
    
    // Reset modal state after submission (for both 'Request Change' and 'Reject')
    handleClose();
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === 'startTime') {
      setStartTime(value);
    } else if (name === 'endTime') {
      setEndTime(value);
    }
    setError('');
  };

  const handleClose = () => {
    setAction(null);
    setReason('');
    setAvailabilityNotes('');
    setSelectedDays([]);
    setStartTime('');
    setEndTime('');
    setError('');
    // Clear persisted approval data when modal closes
    if (schedule) {
      sessionStorage.removeItem(`approvalModal_${schedule.id}`);
      console.log('🗑️ Cleared approval form data for schedule:', schedule.id);
    }
    onClose();
  };

  // Set default times when action changes to request_change
  React.useEffect(() => {
    if (action === 'request_change') {
      setStartTime('07:00'); // 7:00 AM
      setEndTime('15:00');   // 3:00 PM
    }
  }, [action]);

  if (!isOpen || !schedule) return null;

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
      
      <div className="relative bg-white rounded-2xl shadow-2xl max-w-2xl w-full mx-4 max-h-[95vh] overflow-y-auto flex flex-col transform transition-all">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-slate-200 px-6 py-4 flex justify-between items-center flex-shrink-0">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Schedule Approval</h2>
            <p className="text-xs text-slate-600 mt-0.5">Review and respond to your schedule</p>
          </div>
          <button
            onClick={handleClose}
            className="p-2 bg-slate-100 border border-slate-300 hover:bg-slate-200 rounded-lg transition-colors flex-shrink-0"
          >
            <X size={20} className="text-slate-600" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Previous Change Request Details (if any) */}
          {lastChangeRequest?.status === 'requested_change' && (lastChangeRequest?.faculty_response || lastChangeRequest?.faculty_availability_notes) && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <div className="flex items-start gap-2">
                <AlertCircle size={18} className="text-amber-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-bold text-amber-900">Your Change Request Details</p>
                  {lastChangeRequest?.faculty_response && (
                    <div className="mt-3">
                      <p className="text-xs text-amber-700 uppercase tracking-wider font-semibold mb-1">Reason for Change</p>
                      <p className="text-sm text-amber-900 bg-white rounded-lg p-3 border border-amber-100">
                        {lastChangeRequest.faculty_response}
                      </p>
                    </div>
                  )}
                  {lastChangeRequest?.faculty_availability_notes && (
                    <div className="mt-3">
                      <p className="text-xs text-amber-700 uppercase tracking-wider font-semibold mb-1">Available Times</p>
                      <p className="text-sm text-amber-900 bg-white rounded-lg p-3 border border-amber-100">
                        {lastChangeRequest.faculty_availability_notes}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Schedule Details - Compact */}
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-4 border border-blue-200">
            <div className="grid grid-cols-2 gap-3">
              {/* Subject & Type Row */}
              <div>
                <p className="text-xs text-blue-600 font-bold uppercase tracking-wide">Subject</p>
                <p className="text-sm font-semibold text-slate-900 truncate">{schedule.subject?.subject_code}</p>
                <p className="text-xs text-slate-600 truncate">{schedule.subject?.subject_name}</p>
              </div>
              <div>
                <p className="text-xs text-blue-600 font-bold uppercase tracking-wide">Type</p>
                <p className="text-sm font-semibold text-slate-900">
                  {schedule.course_subject_offering?.offering_type === 'LEC' ? '📚 LEC' : schedule.course_subject_offering?.offering_type === 'LAB' ? '🔬 LAB' : 'N/A'}
                </p>
              </div>
              
              {/* Schedule & Location Row */}
              <div className="pt-2 border-t border-blue-200">
                <p className="text-xs text-blue-600 font-bold uppercase tracking-wide">Schedule</p>
                <p className="text-sm font-semibold text-slate-900">{schedule.day_of_week}</p>
                <p className="text-xs text-slate-600">{convertTo12Hour(schedule.start_time)} - {convertTo12Hour(schedule.end_time)}</p>
              </div>
              <div className="pt-2 border-t border-blue-200">
                <p className="text-xs text-blue-600 font-bold uppercase tracking-wide">Location</p>
                <p className="text-sm font-semibold text-slate-900">{schedule.location?.name}</p>
                <p className="text-xs text-slate-600">{schedule.year_level} - Sec {schedule.section}</p>
              </div>
            </div>
          </div>

          {/* Units */}
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
            {(() => {
              const lecUnits = offeringUnits?.lecture_units ?? null;
              const labUnits = offeringUnits?.lab_units ?? null;
              const contactHours = offeringUnits?.contact_hours ?? null;
              const totalUnits =
                typeof lecUnits === 'number' || typeof labUnits === 'number'
                  ? (lecUnits || 0) + (labUnits || 0)
                  : null;

              return (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold text-slate-700 uppercase tracking-wide">Units</p>
                    <span className="text-xs font-semibold text-slate-600">
                      {schedule.subject?.subject_code}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div className="bg-white border border-slate-200 rounded-lg px-3 py-2">
                      <p className="text-[11px] text-slate-500 font-semibold">LEC</p>
                      <p className="text-sm font-bold text-slate-900">{typeof lecUnits === 'number' ? lecUnits : '—'}</p>
                    </div>
                    <div className="bg-white border border-slate-200 rounded-lg px-3 py-2">
                      <p className="text-[11px] text-slate-500 font-semibold">LAB</p>
                      <p className="text-sm font-bold text-slate-900">{typeof labUnits === 'number' ? labUnits : '—'}</p>
                    </div>
                    <div className="bg-white border border-slate-200 rounded-lg px-3 py-2">
                      <p className="text-[11px] text-slate-500 font-semibold">TOTAL</p>
                      <p className="text-sm font-bold text-slate-900">{typeof totalUnits === 'number' ? totalUnits : '—'}</p>
                    </div>
                  </div>

                  {typeof contactHours === 'number' && (
                    <p className="text-xs text-slate-600 font-medium">
                      Contact hours: <span className="font-bold text-slate-900">{contactHours}</span>
                    </p>
                  )}

                  {!offeringUnits && (
                    <p className="text-xs text-amber-700 font-semibold">
                      Units not configured for this subject/component.
                    </p>
                  )}
                </div>
              );
            })()}
          </div>

          {/* Action Selection */}
          <div>
            <h3 className="font-semibold text-slate-900 mb-2.5 text-sm">Your Decision</h3>
            <div className="grid grid-cols-3 gap-2">
              <label className="flex flex-col items-center p-3 border-2 rounded-lg cursor-pointer transition-all"
                style={{
                  borderColor: action === 'approve' ? '#3b82f6' : '#e2e8f0',
                  backgroundColor: action === 'approve' ? '#eff6ff' : '#f8fafc'
                }}
              >
                <input
                  type="radio"
                  name="action"
                  value="approve"
                  checked={action === 'approve'}
                  onChange={(e) => {
                    setAction(e.target.value);
                    setError('');
                  }}
                  className="w-4 h-4"
                />
                <span className="text-center mt-2">
                  <span className="font-bold text-slate-900 text-sm block">✓ Approve</span>
                  <p className="text-xs text-slate-600 mt-1">Accept</p>
                </span>
              </label>

              <label className="flex flex-col items-center p-3 border-2 rounded-lg cursor-pointer transition-all"
                style={{
                  borderColor: action === 'request_change' ? '#f59e0b' : '#e2e8f0',
                  backgroundColor: action === 'request_change' ? '#fffbeb' : '#f8fafc'
                }}
              >
                <input
                  type="radio"
                  name="action"
                  value="request_change"
                  checked={action === 'request_change'}
                  onChange={(e) => {
                    setAction(e.target.value);
                    setError('');
                  }}
                  className="w-4 h-4"
                />
                <span className="text-center mt-2">
                  <span className="font-bold text-slate-900 text-sm block">⟲ Request Change</span>
                  <p className="text-xs text-slate-600 mt-1">Suggest changes</p>
                </span>
              </label>

              <label className="flex flex-col items-center p-3 border-2 rounded-lg cursor-pointer transition-all"
                style={{
                  borderColor: action === 'reject' ? '#ef4444' : '#e2e8f0',
                  backgroundColor: action === 'reject' ? '#fef2f2' : '#f8fafc'
                }}
              >
                <input
                  type="radio"
                  name="action"
                  value="reject"
                  checked={action === 'reject'}
                  onChange={(e) => {
                    setAction(e.target.value);
                    setError('');
                  }}
                  className="w-4 h-4"
                />
                <span className="text-center mt-2">
                  <span className="font-bold text-slate-900 text-sm block">✗ Reject</span>
                  <p className="text-xs text-slate-600 mt-1">Unable to teach</p>
                </span>
              </label>
            </div>
          </div>

          {/* Reason Input */}
          {(action === 'reject' || action === 'request_change') && (
            <div>
              <label className="block text-sm font-semibold text-slate-900 mb-2">
                {action === 'reject' ? "Why can't you teach this?" : 'Why do you need changes?'}
              </label>
              <textarea
                value={reason}
                onChange={(e) => {
                  setReason(e.target.value);
                  setError('');
                }}
                placeholder="Please provide details..."
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none text-sm"
                rows="2"
              />
            </div>
          )}

          {/* Availability Picker */}
          {action === 'request_change' && (
            <div className="space-y-3 bg-amber-50 rounded-lg p-4 border border-amber-200">
              <label className="block text-sm font-semibold text-slate-900 flex items-center gap-2">
                <Calendar size={16} className="text-amber-600" />
                When are you available?
              </label>
              
              {/* Days Selection */}
              <div>
                <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-2">Available Days</p>
                <div className="grid grid-cols-4 gap-1.5">
                  {daysOfWeek.map(day => (
                    <button
                      key={day}
                      type="button"
                      onClick={() => {
                        toggleDay(day);
                        setError('');
                      }}
                      className={`px-2 py-2 rounded font-medium text-xs transition-all ${
                        selectedDays.includes(day)
                          ? 'bg-blue-600 text-white shadow-sm'
                          : 'bg-white border border-slate-300 text-slate-700 hover:border-blue-400'
                      }`}
                    >
                      {day.slice(0, 3)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Time Selection */}
              <div>
                <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                  <Clock size={12} />
                  Available Time
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Start</label>
                    <input
                      type="time"
                      name="startTime"
                      value={startTime}
                      onChange={handleChange}
                      max="21:00"
                      className="w-full px-2.5 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">End</label>
                    <input
                      type="time"
                      name="endTime"
                      value={endTime}
                      onChange={handleChange}
                      max="21:00"
                      className="w-full px-2.5 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    />
                  </div>
                </div>
              </div>

              {/* Availability Preview */}
              {selectedDays.length > 0 && startTime && endTime && (
                <div className="p-2.5 bg-white border border-amber-300 rounded-lg">
                  <p className="text-xs font-semibold text-amber-900">
                    ✓ {generateAvailabilityText()}
                  </p>
                </div>
              )}
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-slate-50 border-t border-slate-200 px-5 py-4 flex gap-2 justify-end flex-shrink-0">
          <button
            onClick={handleClose}
            className="px-5 py-2 bg-slate-100 text-slate-700 border border-slate-300 rounded-lg hover:bg-slate-200 font-semibold transition-colors text-sm"
            disabled={isLoading}
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            className="px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold transition-colors disabled:opacity-50 text-sm"
            disabled={isLoading || !action}
          >
            {isLoading ? 'Submitting...' : 'Submit'}
          </button>
        </div>
      </div>

      {/* Validation Error Modal */}
      {validationModal.isOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center overflow-hidden">
          <div 
            className="fixed inset-0 bg-black/60 backdrop-blur-md transition-opacity"
            onClick={() => setValidationModal({ isOpen: false, title: '', message: '', type: '' })}
            aria-hidden="true"
          ></div>
          
          <div className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 transform transition-all">
            {/* Header */}
            <div className="bg-gradient-to-r from-red-600 to-red-700 px-6 py-5 flex items-center justify-between border-b border-red-800">
              <div className="flex items-center gap-3">
                <AlertCircle size={24} className="text-white" />
                <h3 className="text-lg font-bold text-white">{validationModal.title}</h3>
              </div>
              <button
                onClick={() => setValidationModal({ isOpen: false, title: '', message: '', type: '' })}
                className="bg-white/10 text-white border border-white/20 rounded-lg p-1.5 hover:bg-white/20 transition-all"
              >
                <X size={18} />
              </button>
            </div>

            {/* Content */}
            <div className="p-6">
              <p className="text-slate-600 text-sm mb-4">
                {validationModal.message}
              </p>
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-slate-200 bg-slate-50">
              <button
                onClick={() => setValidationModal({ isOpen: false, title: '', message: '', type: '' })}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all font-medium"
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ScheduleApprovalModal;
