import React from 'react';
import { Building, User, Clock } from 'lucide-react';

const TimetableView = ({ schedules }) => {
  if (!schedules || schedules.length === 0) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-12 text-center print:hidden">
        <h3 className="text-lg font-semibold text-slate-700">No Active Schedules Found</h3>
        <p className="text-slate-500 mt-2">There are no active schedules for the selected faculty member.</p>
      </div>
    );
  }

  const timeToMinutes = (timeStr) => {
    if (!timeStr) return 0;
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
  };

  const formatTime = (time) => {
    if (!time) return '';
    const [h, m] = time.split(':');
    const hour = parseInt(h, 10);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const formattedHour = hour % 12 === 0 ? 12 : hour % 12;
    return `${formattedHour}:${m} ${ampm}`;
  };

  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const timeSlots = [];
  for (let i = 7; i <= 21; i++) { // 7 AM to 9 PM
    timeSlots.push(`${i.toString().padStart(2, '0')}:00`);
  }

  const scheduleGrid = days.map(day => {
    const daySchedules = schedules
      .filter(s => s.day_of_week.toLowerCase() === day.toLowerCase())
      .sort((a, b) => timeToMinutes(a.start_time) - timeToMinutes(b.start_time));
    return { day, schedules: daySchedules };
  });

  return (
    <div className="overflow-x-auto print:overflow-visible">
      <table className="min-w-full border-collapse border border-slate-300 print:border-black table-fixed">
        <thead>
          <tr>
            <th className="w-32 border border-slate-300 print:border-black px-2 py-2 bg-slate-100 text-sm font-semibold text-slate-700 print:text-xs print:py-1">Time</th>
            {days.map(day => (
              <th key={day} className="border border-slate-300 print:border-black px-2 py-2 bg-slate-100 text-sm font-semibold text-slate-700 print:text-xs print:py-1">{day}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {timeSlots.map((slot, index) => {
            const slotStartMinutes = timeToMinutes(slot);

            return (
              <tr key={slot}>
                <td className="border border-slate-300 print:border-black px-2 py-2 text-center text-xs text-slate-600 align-top h-24 print:h-auto print:py-1">
                  {formatTime(slot)} - {formatTime(timeSlots[index + 1] || '22:00')}
                </td>
                {scheduleGrid.map(({ day, schedules }) => {
                  const scheduleForSlot = schedules.find(s => {
                    const startMinutes = timeToMinutes(s.start_time);
                    return startMinutes >= slotStartMinutes && startMinutes < (slotStartMinutes + 60);
                  });

                  if (scheduleForSlot) {
                    return (
                      <td key={day} className="border border-slate-200 print:border-black p-1 align-top">
                        <div className="bg-blue-50 border-l-4 border-blue-500 text-slate-800 rounded-md p-2 h-full text-xs leading-tight flex flex-col print:p-1 print:bg-white print:border-l-2">
                          <div>
                            <p className="font-bold text-sm text-blue-900 print:text-xs">{scheduleForSlot.subjects ? scheduleForSlot.subjects.subject_code : 'N/A'}</p>
                            <p className="font-medium text-slate-700 print:text-[10px]">{scheduleForSlot.subjects ? scheduleForSlot.subjects.subject_name : 'N/A'}</p>
                          </div>
                          <div className="mt-2 space-y-1 text-slate-600 print:mt-1 print:text-[9px]">
                            <div className="flex items-center gap-1.5">
                               <Clock size={10} className="flex-shrink-0" />
                               <span>{formatTime(scheduleForSlot.start_time)} - {formatTime(scheduleForSlot.end_time)}</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <Building size={10} className="flex-shrink-0" />
                              <span>{scheduleForSlot.locations ? scheduleForSlot.locations.name : 'N/A'}</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <User size={10} className="flex-shrink-0" />
                              <span>{scheduleForSlot.year_level ? `${scheduleForSlot.year_level}` : ''}{(scheduleForSlot.year_level && (scheduleForSlot.section || (scheduleForSlot.sections && scheduleForSlot.sections.section_name))) ? ' • ' : ''}{(scheduleForSlot.section || (scheduleForSlot.sections && scheduleForSlot.sections.section_name)) ? `Section ${scheduleForSlot.section || (scheduleForSlot.sections && scheduleForSlot.sections.section_name)}` : 'N/A'}</span>
                            </div>
                          </div>
                        </div>
                      </td>
                    );
                  }

                  return <td key={day} className="border border-slate-300 print:border-black"></td>;
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default TimetableView;
