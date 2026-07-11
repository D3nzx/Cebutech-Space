import React from 'react';
import { Clock, MapPin, User, Edit2, Trash2, AlertCircle } from 'lucide-react';

function WeeklyTimetable({ schedules, onEdit, onDelete, onRejectedScheduleClick, onChangeRequestClick, programHeadData, showLegend = true, showCourseInfo = true, showYearPrefix = true, printCompact = false, highlightApprovedOnly = false }) {
  // Check if the current Program Head can edit/delete a schedule
  const canEditSchedule = (schedule) => {
    if (!programHeadData?.id) return false;
    // If schedule has no creator (old schedules), allow editing for backward compatibility
    if (!schedule.created_by_program_head_id) return true;
    // Only allow if the current Program Head created this schedule
    return schedule.created_by_program_head_id === programHeadData.id;
  };
  const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const timeSlots = generateTimeSlots();

  function generateTimeSlots() {
    const slots = [];
    for (let hour = 7; hour <= 21; hour++) {
      slots.push(`${hour.toString().padStart(2, '0')}:00`);
    }
    return slots;
  }

  const formatTime = (time) => {
    if (!time) return '';
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  const getSchedulesForDayAndTime = (day, timeSlot) => {
    const slotMinutes = parseTime(timeSlot);

    return schedules.filter(schedule => {
      if (schedule.day_of_week !== day) return false;

      const scheduleStart = parseTime(schedule.start_time);
      const scheduleEnd = parseTime(schedule.end_time);

      return scheduleStart <= slotMinutes && scheduleEnd > slotMinutes;
    });
  };

  const calculateScheduleHeight = (startTime, endTime) => {
    const start = parseTime(startTime);
    const end = parseTime(endTime);
    const durationInHours = (end - start) / 60;
    const slotHeight = printCompact ? 44 : 60; // px per hour
    return durationInHours * slotHeight;
  };

  const calculateScheduleTop = (startTime, firstTimeSlot) => {
    const start = parseTime(startTime);
    const slotStart = parseTime(firstTimeSlot);
    const offsetInHours = (start - slotStart) / 60;
    const slotHeight = printCompact ? 44 : 60; // px per hour
    return offsetInHours * slotHeight;
  };

  const parseTime = (timeString) => {
    const [hours, minutes] = timeString.split(':').map(Number);
    return hours * 60 + minutes;
  };

  const getScheduleColor = (schedule) => {
    // If highlighting approved only, return blue for approved schedules
    if (highlightApprovedOnly && schedule.approval_status === 'approved') {
      return {
        bg: 'bg-blue-500',
        border: 'border-l-blue-700',
        text: 'text-white',
        icon: 'text-blue-100',
        hover: 'hover:bg-blue-600'
      };
    }
    
    // Use a hash of the schedule ID for consistent colors
    const scheduleId = schedule.id;
    const hash = scheduleId ? scheduleId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) : 0;
    const colors = [
      {
        bg: 'bg-blue-50',
        border: 'border-l-blue-500',
        text: 'text-blue-900',
        icon: 'text-blue-600',
        hover: 'hover:bg-blue-100'
      },
      {
        bg: 'bg-emerald-50',
        border: 'border-l-emerald-500',
        text: 'text-emerald-900',
        icon: 'text-emerald-600',
        hover: 'hover:bg-emerald-100'
      },
      {
        bg: 'bg-purple-50',
        border: 'border-l-purple-500',
        text: 'text-purple-900',
        icon: 'text-purple-600',
        hover: 'hover:bg-purple-100'
      },
      {
        bg: 'bg-amber-50',
        border: 'border-l-amber-500',
        text: 'text-amber-900',
        icon: 'text-amber-600',
        hover: 'hover:bg-amber-100'
      },
      {
        bg: 'bg-rose-50',
        border: 'border-l-rose-500',
        text: 'text-rose-900',
        icon: 'text-rose-600',
        hover: 'hover:bg-rose-100'
      },
      {
        bg: 'bg-indigo-50',
        border: 'border-l-indigo-500',
        text: 'text-indigo-900',
        icon: 'text-indigo-600',
        hover: 'hover:bg-indigo-100'
      },
    ];
    return colors[hash % colors.length];
  };

  // Check if a specific schedule has conflicts with other schedules
  const getScheduleConflicts = (schedule) => {
    const conflicts = {
      room: [],
      faculty: []
    };
    
    // Check against all other schedules on the same day
    for (const otherSchedule of schedules) {
      if (otherSchedule.id === schedule.id) continue; // Skip self
      if (otherSchedule.day_of_week !== schedule.day_of_week) continue; // Different day, no conflict
      
      // Check if times actually overlap
      const scheduleStart = parseTime(schedule.start_time);
      const scheduleEnd = parseTime(schedule.end_time);
      const otherStart = parseTime(otherSchedule.start_time);
      const otherEnd = parseTime(otherSchedule.end_time);
      
      const timesOverlap = (scheduleStart < otherEnd && scheduleEnd > otherStart);
      
      if (!timesOverlap) continue;
      
      // Room conflict: same location with overlapping times
      if (schedule.location_id === otherSchedule.location_id) {
        conflicts.room.push(otherSchedule);
      }
      
      // Faculty conflict: same faculty with overlapping times
      if (schedule.faculty_id === otherSchedule.faculty_id) {
        conflicts.faculty.push(otherSchedule);
      }
    }
    
    return conflicts;
  };
  
  // Check if a schedule has any conflicts
  const scheduleHasConflict = (schedule) => {
    const conflicts = getScheduleConflicts(schedule);
    return conflicts.room.length > 0 || conflicts.faculty.length > 0;
  };

  return (
    <div className={`bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden ${printCompact ? 'print:rounded-none print:shadow-none print:border-slate-300' : ''}`}>
      <div className={printCompact ? 'overflow-visible' : 'overflow-x-auto'} style={printCompact ? {} : { WebkitOverflowScrolling: 'touch' }}>
        <div className={printCompact ? 'min-w-0' : 'min-w-[900px] md:min-w-[1200px]'}>
          {/* Header */}
          <div className="grid grid-cols-8 border-b-2 border-slate-200 bg-gradient-to-r from-slate-50 to-slate-100">
            <div className={printCompact ? "p-2 text-xs font-bold text-slate-800 border-r border-slate-200 uppercase tracking-wide flex items-center justify-center text-center" : "p-4 text-sm font-bold text-slate-800 border-r border-slate-200 uppercase tracking-wide flex items-center justify-center text-center"}>
              Time
            </div>
            {daysOfWeek.map(day => (
              <div
                key={day}
                className={printCompact ? "p-2 text-xs font-bold text-slate-800 text-center border-r border-slate-200 last:border-r-0 uppercase tracking-wide" : "p-4 text-sm font-bold text-slate-800 text-center border-r border-slate-200 last:border-r-0 uppercase tracking-wide"}
              >
                {day.substring(0, 3)}
              </div>
            ))}
          </div>

          {/* Time Grid */}
          <div className="relative bg-white">
            {timeSlots.map((timeSlot, index) => (
              <div key={timeSlot} className="grid grid-cols-8 border-b border-slate-100 last:border-b-0 hover:bg-slate-50/50 transition-colors">
                {/* Time Column */}
                <div className={printCompact ? "p-2 text-[11px] font-semibold text-slate-600 border-r border-slate-200 bg-slate-50/80 h-[44px] flex items-center justify-center text-center" : "p-3 text-xs font-semibold text-slate-600 border-r border-slate-200 bg-slate-50/80 h-[44px] md:h-[60px] flex items-center justify-center text-center"}>
                  {formatTime(timeSlot)}
                </div>

                {/* Day Columns */}
                {daysOfWeek.map(day => {
                  const schedulesInSlot = getSchedulesForDayAndTime(day, timeSlot);
                  const slotMinutes = parseTime(timeSlot);
                  const isFirstSlotForSchedules = schedulesInSlot.filter(
                    schedule => parseTime(schedule.start_time) === slotMinutes
                  );

                  // Group overlapping schedules to position them side-by-side
                  const getOverlappingGroups = (schedules) => {
                    if (schedules.length === 0) return [];
                    
                    const groups = [];
                    const processed = new Set();
                    
                    schedules.forEach(schedule => {
                      if (processed.has(schedule.id)) return;
                      
                      const group = [schedule];
                      processed.add(schedule.id);
                      
                      const scheduleStart = parseTime(schedule.start_time);
                      const scheduleEnd = parseTime(schedule.end_time);
                      
                      schedules.forEach(otherSchedule => {
                        if (processed.has(otherSchedule.id)) return;
                        
                        const otherStart = parseTime(otherSchedule.start_time);
                        const otherEnd = parseTime(otherSchedule.end_time);
                        
                        // Check if times overlap
                        if (scheduleStart < otherEnd && scheduleEnd > otherStart) {
                          group.push(otherSchedule);
                          processed.add(otherSchedule.id);
                        }
                      });
                      
                      groups.push(group);
                    });
                    
                    return groups;
                  };
                  
                  const overlappingGroups = getOverlappingGroups(isFirstSlotForSchedules);

                  return (
                    <div
                      key={`${day}-${timeSlot}`}
                      className={printCompact ? "border-r border-slate-100 last:border-r-0 h-[44px] relative bg-white" : "border-r border-slate-100 last:border-r-0 h-[44px] md:h-[60px] relative bg-white"}
                    >
                      {/* Render schedules grouped by overlap */}
                      {overlappingGroups.map((group, groupIdx) => {
                        return group.map((schedule, idx) => {
                        const height = calculateScheduleHeight(schedule.start_time, schedule.end_time);
                        const colorScheme = getScheduleColor(schedule);
                          const isEditable = canEditSchedule(schedule);
                          
                          // Calculate width and position for side-by-side display
                          const groupSize = group.length;
                          const widthPercent = 100 / groupSize;
                          const leftPercent = (idx * widthPercent);
                          
                          // Add small gap between overlapping schedules
                          const gap = groupSize > 1 ? 1 : 0; // 1px gap
                          const inset = printCompact ? 2 : 4;
                          const adjustedWidth = groupSize > 1 ? `calc(${widthPercent}% - ${gap}px)` : `calc(100% - ${inset * 2}px)`;
                          const adjustedLeft = groupSize > 1 ? `calc(${leftPercent}% + ${idx * gap}px + ${inset}px)` : `${inset}px`;

                        return (
                          <div
                            key={schedule.id}
                              className={`absolute border-l-4 rounded-lg overflow-hidden shadow-md transition-all duration-200 group ${
                                isEditable || schedule.approval_status === 'rejected'
                                  ? `${colorScheme.bg} ${colorScheme.border} ${colorScheme.hover} cursor-pointer hover:shadow-lg` 
                                  : `${colorScheme.bg} ${colorScheme.border} cursor-default`
                              } ${groupSize > 1 ? 'border-r-2 border-r-slate-200' : ''} ${printCompact ? 'p-1.5' : 'p-2.5'}`}
                            style={{
                              height: `${height}px`,
                                width: adjustedWidth,
                                left: adjustedLeft,
                                zIndex: 10 + groupIdx * 10 + idx,
                              minHeight: printCompact ? '80px' : '80px'
                            }}
                              onClick={() => {
                                if (schedule.approval_status === 'rejected' && onRejectedScheduleClick) {
                                  onRejectedScheduleClick(schedule);
                                } else if (schedule.approval_status === 'requested_change' && onChangeRequestClick) {
                                  onChangeRequestClick(schedule);
                                } else if (isEditable) {
                                  onEdit(schedule);
                                }
                              }}
                          >
                            <div className="flex flex-col h-full">
                              {/* Subject Code & Name */}
                              {printCompact ? (
                                <>
                                  <div className="min-w-0">
                                    <div className="text-[11px] font-bold text-slate-900 leading-tight truncate">
                                      {schedule.subject?.subject_code || 'N/A'}
                                    </div>
                                    <div className="text-[10px] font-medium text-slate-700 leading-tight truncate">
                                      {schedule.subject?.subject_name || 'Unknown Subject'}
                                    </div>
                                  </div>

                                  <div className="mt-1 space-y-0.5">
                                    {(schedule.year_level || schedule.section) && (
                                      <div className="text-[9px] text-slate-600 leading-tight break-words whitespace-normal">
                                        {schedule.year_level ? `${showYearPrefix ? 'Year ' : ''}${schedule.year_level}` : ''}
                                        {schedule.year_level && schedule.section ? <br /> : null}
                                        {schedule.section ? `Section ${schedule.section}` : ''}
                                      </div>
                                    )}
                                    <div className="text-[9px] text-slate-600 leading-tight break-words whitespace-normal">
                                      {schedule.location?.name || 'N/A'}
                                    </div>
                                  </div>
                                </>
                              ) : (
                                <>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-start justify-between gap-1 mb-0.5">
                                      <div className="text-xs font-bold text-slate-900 leading-tight truncate">
                                        {schedule.subject?.subject_code || 'N/A'}
                                      </div>
                                      {schedule.is_active && schedule.approval_status === 'approved' && (
                                        <span className="text-[9px] font-bold px-1.5 py-0.5 bg-blue-100 text-blue-800 rounded whitespace-nowrap flex-shrink-0">
                                          Active
                                        </span>
                                      )}
                                      {schedule.approval_status === 'pending' && (
                                        <span className="text-[9px] font-bold px-1.5 py-0.5 bg-amber-100 text-amber-800 rounded whitespace-nowrap flex-shrink-0">
                                          Pending
                                        </span>
                                      )}
                                      {schedule.approval_status === 'rejected' && (
                                        <span className="text-[9px] font-bold px-1.5 py-0.5 bg-red-100 text-red-800 rounded whitespace-nowrap flex-shrink-0">
                                          Rejected
                                        </span>
                                      )}
                                      {schedule.approval_status === 'requested_change' && (
                                        <span className="text-[9px] font-bold px-1.5 py-0.5 bg-orange-100 text-orange-800 rounded whitespace-nowrap flex-shrink-0">
                                          Change Req
                                        </span>
                                      )}
                                      {schedule.approval_status === 'approved' && !schedule.is_active && (
                                        <span className="text-[9px] font-bold px-1.5 py-0.5 bg-green-100 text-green-800 rounded whitespace-nowrap flex-shrink-0">
                                          Approved
                                        </span>
                                      )}
                                    </div>
                                    <div className="text-[10px] font-medium text-slate-700 line-clamp-2 mb-1.5 leading-tight">
                                      {schedule.subject?.subject_name || 'Unknown Subject'}
                                    </div>
                                  </div>

                                  {/* Details Section - Compact for overlapping schedules */}
                                  <div className="space-y-1 mt-auto">
                                    {showCourseInfo && (
                                      <div className="flex items-center gap-1 text-[10px] text-slate-600">
                                        <span className="truncate font-semibold" title={schedule.course?.course_name || 'TBD'}>
                                          {schedule.course?.course_code || schedule.course?.course_name || 'TBD'}
                                        </span>
                                      </div>
                                    )}
                                    {(schedule.year_level || schedule.section) && (
                                      <div className="flex items-center gap-1 text-[10px] text-slate-600">
                                        <span className="truncate font-medium">
                                          {schedule.year_level ? `${showYearPrefix ? 'Year ' : ''}${schedule.year_level}` : ''}
                                          {schedule.year_level && schedule.section ? ' • ' : ''}
                                          {schedule.section ? `Section ${schedule.section}` : ''}
                                        </span>
                                      </div>
                                    )}
                                    <div className="flex items-center gap-1 text-[10px] text-slate-600">
                                      <MapPin size={10} className={`${colorScheme.icon} flex-shrink-0`} />
                                      <span className="truncate font-semibold">{schedule.location?.name || 'N/A'}</span>
                                    </div>
                                    <div className="flex items-center gap-1 text-[10px] text-slate-600">
                                      <User size={10} className={`${colorScheme.icon} flex-shrink-0`} />
                                      <span className="truncate font-medium">
                                        {schedule.faculty?.first_name} {schedule.faculty?.last_name}
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-1 text-[10px] font-semibold text-slate-700">
                                      <Clock size={10} className={`${colorScheme.icon} flex-shrink-0`} />
                                      <span className="truncate">
                                        {formatTime(schedule.start_time)} - {formatTime(schedule.end_time)}
                                      </span>
                                    </div>
                                  </div>
                                </>
                              )}
                            </div>
                            
                              {/* Action buttons - only show for editable schedules and approved status (not for Change Request or Rejected) */}
                              {isEditable && schedule.approval_status === 'approved' && schedule.approval_status !== 'requested_change' && schedule.approval_status !== 'rejected' && (
                                <div className="absolute top-1.5 right-1.5 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onEdit(schedule);
                                }}
                                    className="p-1 bg-white rounded shadow-sm hover:bg-blue-50 hover:shadow transition-all border border-slate-200"
                                title="Edit Schedule"
                              >
                                    <Edit2 size={12} className="text-blue-600" />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onDelete(schedule);
                                }}
                                    className="p-1 bg-white rounded shadow-sm hover:bg-red-50 hover:shadow transition-all border border-slate-200"
                                    title="Remove Schedule"
                              >
                                    <Trash2 size={12} className="text-red-600" />
                              </button>
                            </div>
                              )}
                              
                              {/* Conflict indicator */}
                              {(() => {
                                const conflicts = getScheduleConflicts(schedule);
                                const hasRoomConflict = conflicts.room.length > 0;
                                const hasFacultyConflict = conflicts.faculty.length > 0;
                                const hasAnyConflict = hasRoomConflict || hasFacultyConflict;
                                
                                if (!hasAnyConflict) return null;
                                
                                let conflictMessages = [];
                                if (hasRoomConflict) {
                                  const roomConflicts = conflicts.room.map(c => 
                                    `${c.subject?.subject_code || 'Schedule'} (${c.faculty?.first_name} ${c.faculty?.last_name})`
                                  ).join(', ');
                                  conflictMessages.push(`Room conflict: ${roomConflicts}`);
                                }
                                if (hasFacultyConflict) {
                                  const facultyConflicts = conflicts.faculty.map(c => 
                                    `${c.subject?.subject_code || 'Schedule'} at ${c.location?.name || 'location'}`
                                  ).join(', ');
                                  conflictMessages.push(`Faculty conflict: ${facultyConflicts}`);
                                }
                                const tooltip = conflictMessages.join('\n');
                                
                                return (
                                  <div className="absolute top-1.5 left-1.5 z-30">
                                    <div 
                                      className="bg-red-500 text-white rounded-full p-1 shadow-lg border-2 border-white hover:bg-red-600 transition-colors cursor-help" 
                                      title={tooltip}
                                    >
                                      <AlertCircle size={10} />
                                    </div>
                                  </div>
                                );
                              })()}
                          </div>
                        );
                        });
                      })}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      {showLegend && (
        <div className="border-t-2 border-slate-200 bg-gradient-to-r from-slate-50 to-slate-100 px-6 py-4">
          <div className="flex flex-wrap items-center justify-between gap-6 text-xs">
            <div className="flex flex-wrap items-center gap-6">
              <div className="flex items-center gap-2.5">
                <div className="w-4 h-4 bg-blue-50 border-l-4 border-blue-500 rounded-lg shadow-sm"></div>
                <span className="font-semibold text-slate-700">Click to edit schedule</span>
              </div>
              <div className="flex items-center gap-2.5">
                <div className="bg-red-500 text-white rounded-full p-1 border-2 border-white shadow-sm">
                  <AlertCircle size={12} />
                </div>
                <span className="font-semibold text-slate-700">Conflict: Same room or faculty at overlapping times</span>
              </div>
            </div>
            <div className="text-slate-600 font-medium">
              💡 Hover over schedule cards to see action buttons
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default WeeklyTimetable;
