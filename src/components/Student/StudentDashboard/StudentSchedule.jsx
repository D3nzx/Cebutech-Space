import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { Calendar, Clock, MapPin, BookOpen, AlertCircle, Grid3x3, List, User } from 'lucide-react';
import { supabase } from '../../../lib/supabaseClient';

function StudentSchedule({ studentData }) {
  const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const timeSlots = ['07:00', '08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00'];
  const [schedules, setSchedules] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [viewMode, setViewMode] = useState('list');
  const [showScrollbar, setShowScrollbar] = useState(false);
  const scrollbarTimeoutRef = React.useRef(null);

  const handleScrollbarVisibility = useCallback(() => {
    setShowScrollbar(true);
    
    if (scrollbarTimeoutRef.current) {
      clearTimeout(scrollbarTimeoutRef.current);
    }
    
    scrollbarTimeoutRef.current = setTimeout(() => {
      setShowScrollbar(false);
    }, 5000);
  }, []);

  useEffect(() => {
    return () => {
      if (scrollbarTimeoutRef.current) {
        clearTimeout(scrollbarTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!studentData?.id) return;

    const fetchSchedules = async () => {
      setIsLoading(true);
      setError(null);
      try {
        console.log('🔄 Fetching schedules for student:', studentData.id);
        
        // Get student's program and year level to find relevant schedules
        const { data: allSchedules, error: fetchError } = await supabase
          .from('schedules')
          .select('*')
          .eq('year_level', studentData.year_level)
          .eq('section', studentData.section)
          .eq('is_active', true)
          .order('day_of_week', { ascending: true })
          .order('start_time', { ascending: true });

        if (fetchError) {
          console.error('Error fetching schedules:', fetchError);
          setError(fetchError.message);
          setSchedules([]);
          return;
        }

        if (!allSchedules || allSchedules.length === 0) {
          setSchedules([]);
          setIsLoading(false);
          return;
        }

        // Get unique IDs for related tables
        const subjectIds = [...new Set(allSchedules.map(s => s.subject_id).filter(Boolean))];
        const locationIds = [...new Set(allSchedules.map(s => s.location_id).filter(Boolean))];
        const facultyIds = [...new Set(allSchedules.map(s => s.faculty_id).filter(Boolean))];
        const courseOfferingIds = [...new Set(allSchedules.map(s => s.course_subject_offering_id).filter(Boolean))];
        
        // Fetch related data in parallel
        const [subjectsRes, locationsRes, facultyRes, offeringsRes] = await Promise.all([
          subjectIds.length > 0 ? supabase.from('subjects').select('*').in('id', subjectIds) : Promise.resolve({ data: [] }),
          locationIds.length > 0 ? supabase.from('locations').select('*').in('id', locationIds) : Promise.resolve({ data: [] }),
          facultyIds.length > 0 ? supabase.from('faculty').select('*').in('id', facultyIds) : Promise.resolve({ data: [] }),
          courseOfferingIds.length > 0 ? supabase.from('course_subject_offerings').select('*').in('id', courseOfferingIds) : Promise.resolve({ data: [] })
        ]);
        
        // Create lookup maps
        const subjectsMap = {};
        const locationsMap = {};
        const facultyMap = {};
        const offeringsMap = {};
        
        if (subjectsRes.data) subjectsRes.data.forEach(s => subjectsMap[s.id] = s);
        if (locationsRes.data) locationsRes.data.forEach(l => locationsMap[l.id] = l);
        if (facultyRes.data) facultyRes.data.forEach(f => facultyMap[f.id] = f);
        if (offeringsRes.data) offeringsRes.data.forEach(o => offeringsMap[o.id] = o);
        
        // Enrich schedule data with related objects
        const enrichedData = allSchedules.map(schedule => ({
          ...schedule,
          subject: subjectsMap[schedule.subject_id] || null,
          location: locationsMap[schedule.location_id] || null,
          faculty: facultyMap[schedule.faculty_id] || null,
          course_subject_offering: offeringsMap[schedule.course_subject_offering_id] || null
        }));

        console.log('📊 Schedules fetched:', enrichedData);
        setSchedules(enrichedData || []);
      } catch (err) {
        console.error('Exception fetching schedules:', err);
        setError(err.message);
        setSchedules([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSchedules();

    // Set up real-time subscription for schedule changes
    const subscription = supabase
      .channel('student-schedules')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'schedules',
          filter: `year_level=eq.${studentData.year_level}` 
        },
        async (payload) => {
          console.log('📡 Real-time schedule update received:', payload);
          
          // Re-fetch schedules to get updated data with relationships
          const { data: updatedSchedules, error: fetchError } = await supabase
            .from('schedules')
            .select('*')
            .eq('year_level', studentData.year_level)
            .eq('section', studentData.section)
            .eq('is_active', true)
            .order('day_of_week', { ascending: true })
            .order('start_time', { ascending: true });

          if (!fetchError && updatedSchedules && updatedSchedules.length > 0) {
            // Get unique IDs for related tables
            const subjectIds = [...new Set(updatedSchedules.map(s => s.subject_id).filter(Boolean))];
            const locationIds = [...new Set(updatedSchedules.map(s => s.location_id).filter(Boolean))];
            const facultyIds = [...new Set(updatedSchedules.map(s => s.faculty_id).filter(Boolean))];
            const courseOfferingIds = [...new Set(updatedSchedules.map(s => s.course_subject_offering_id).filter(Boolean))];
            
            // Fetch related data in parallel
            const [subjectsRes, locationsRes, facultyRes, offeringsRes] = await Promise.all([
              subjectIds.length > 0 ? supabase.from('subjects').select('*').in('id', subjectIds) : Promise.resolve({ data: [] }),
              locationIds.length > 0 ? supabase.from('locations').select('*').in('id', locationIds) : Promise.resolve({ data: [] }),
              facultyIds.length > 0 ? supabase.from('faculty').select('*').in('id', facultyIds) : Promise.resolve({ data: [] }),
              courseOfferingIds.length > 0 ? supabase.from('course_subject_offerings').select('*').in('id', courseOfferingIds) : Promise.resolve({ data: [] })
            ]);
            
            // Create lookup maps
            const subjectsMap = {};
            const locationsMap = {};
            const facultyMap = {};
            const offeringsMap = {};
            
            if (subjectsRes.data) subjectsRes.data.forEach(s => subjectsMap[s.id] = s);
            if (locationsRes.data) locationsRes.data.forEach(l => locationsMap[l.id] = l);
            if (facultyRes.data) facultyRes.data.forEach(f => facultyMap[f.id] = f);
            if (offeringsRes.data) offeringsRes.data.forEach(o => offeringsMap[o.id] = o);
            
            // Enrich schedule data with related objects
            const enrichedData = updatedSchedules.map(schedule => ({
              ...schedule,
              subject: subjectsMap[schedule.subject_id] || null,
              location: locationsMap[schedule.location_id] || null,
              faculty: facultyMap[schedule.faculty_id] || null,
              course_subject_offering: offeringsMap[schedule.course_subject_offering_id] || null
            }));

            console.log('✅ Schedules updated in real-time:', enrichedData);
            setSchedules(enrichedData);
          }
        }
      )
      .subscribe();

    // Cleanup subscription on unmount
    return () => {
      subscription.unsubscribe();
    };
  }, [studentData]);

  const schedulesByDay = useMemo(() => {
    const grouped = {};
    daysOfWeek.forEach(day => {
      grouped[day] = schedules.filter(s => s.day_of_week === day);
    });
    return grouped;
  }, [schedules]);

  const gridSchedules = useMemo(() => {
    const grid = {};
    timeSlots.forEach(time => {
      grid[time] = {};
      daysOfWeek.forEach(day => {
        grid[time][day] = schedules.find(
          s => s.day_of_week === day && s.start_time === time
        );
      });
    });
    return grid;
  }, [schedules]);

  const formatTime = (time) => {
    if (!time) return '';
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours, 10);
    const isPM = hour >= 12;
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${isPM ? 'PM' : 'AM'}`;
  };

  if (isLoading) {
    return (
      <div className="text-center py-12 text-gray-500">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto mb-4"></div>
        Loading your schedule...
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-4 flex items-start gap-3">
        <AlertCircle size={20} className="mt-0.5" />
        <div>
          <p className="font-medium">Unable to load schedule</p>
          <p className="text-sm">{error}</p>
        </div>
      </div>
    );
  }

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
          {schedules.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <BookOpen size={32} className="mx-auto mb-2 text-gray-400" />
              <p className="text-sm">No classes scheduled</p>
            </div>
          ) : viewMode === 'timetable' ? (
            <ScheduleTimetableView schedules={schedules} schedulesByDay={schedulesByDay} daysOfWeek={daysOfWeek} timeSlots={timeSlots} formatTime={formatTime} />
          ) : (
            <ScheduleListView schedules={schedules} schedulesByDay={schedulesByDay} daysOfWeek={daysOfWeek} formatTime={formatTime} />
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
    </div>
  );
}

function ScheduleListView({ schedules, schedulesByDay, daysOfWeek, formatTime }) {
  return (
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
                  return (
                    <div
                      key={schedule.id}
                      className="rounded-xl border-2 border-slate-200 bg-white shadow-md hover:shadow-lg p-5 transition-all"
                    >
                      {/* Header with Time and Status */}
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <Clock size={18} className="text-blue-600" />
                          <div>
                            <p className="font-bold text-lg text-slate-900">
                              {formatTime(schedule.start_time)} - {formatTime(schedule.end_time)}
                            </p>
                            <p className="text-xs text-slate-500 mt-0.5">
                              {schedule.subject?.subject_code || 'N/A'}
                            </p>
                          </div>
                        </div>
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
                          <User size={16} className="mt-0.5 text-purple-600 flex-shrink-0" />
                          <div className="min-w-0">
                            <p className="text-xs text-slate-600 font-semibold uppercase">Faculty</p>
                            <p className="text-sm font-medium text-slate-900 truncate" title={schedule.faculty ? `${schedule.faculty.first_name} ${schedule.faculty.last_name}` : 'TBD'}>
                              {schedule.faculty ? `${schedule.faculty.first_name} ${schedule.faculty.last_name}` : 'TBD'}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-start gap-2">
                          <BookOpen size={16} className="mt-0.5 text-orange-600 flex-shrink-0" />
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
                          <BookOpen size={16} className="mt-0.5 text-indigo-600 flex-shrink-0" />
                          <div className="min-w-0">
                            <p className="text-xs text-slate-600 font-semibold uppercase">Units</p>
                            <p className="text-sm font-medium text-slate-900">
                              {schedule.course_subject_offering?.offering_type === 'LEC'
                                ? schedule.course_subject_offering?.lecture_units || '—'
                                : schedule.course_subject_offering?.offering_type === 'LAB'
                                  ? schedule.course_subject_offering?.lab_units || '—'
                                  : '—'}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-start gap-2">
                          <Clock size={16} className="mt-0.5 text-cyan-600 flex-shrink-0" />
                          <div className="min-w-0">
                            <p className="text-xs text-slate-600 font-semibold uppercase">Contact Hours</p>
                            <p className="text-sm font-medium text-slate-900">
                              {schedule.course_subject_offering?.contact_hours || '—'}
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
                    </div>
                  );
                })
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ScheduleTimetableView({ schedules, schedulesByDay, daysOfWeek, timeSlots, formatTime }) {
  return (
    <div 
      className="overflow-x-auto timetable-scroll" 
      style={{ transformOrigin: 'top left' }}
    >
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

                  return (
                    <div
                      key={schedule.id}
                      className="absolute border-l-4 border-l-blue-500 rounded-lg p-2 overflow-hidden shadow-md transition-all duration-200 bg-blue-50 hover:bg-blue-100"
                      style={{
                        top: `${topOffset}px`,
                        left: '4px',
                        right: '4px',
                        height: `${height}px`
                      }}
                    >
                      <div className="flex flex-col h-full justify-between">
                        {/* Subject Code */}
                        <div className="text-xs font-bold text-gray-900 leading-tight truncate">
                          {schedule.subject?.subject_code || 'N/A'}
                        </div>

                        {/* Faculty Name */}
                        <div className="text-[10px] font-medium text-gray-700 leading-tight truncate">
                          {schedule.faculty ? `${schedule.faculty.first_name} ${schedule.faculty.last_name}` : 'TBD'}
                        </div>

                        {/* Location */}
                        <div className="flex items-center gap-1 text-[10px] text-gray-600">
                          <MapPin size={10} className="text-gray-600 flex-shrink-0" />
                          <span className="truncate font-semibold">{schedule.location?.name || 'N/A'}</span>
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
  );
}

export default StudentSchedule;
