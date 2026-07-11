import React, { useEffect, useMemo, useState } from "react";
import { Calendar, BookOpen, Clock, ArrowRight } from "lucide-react";
import { supabase } from "../../../lib/supabaseClient";

function StudentDashboardContent({ studentData, onSectionChange }) {
  const [todaysClasses, setTodaysClasses] = useState(0);
  const [hoursThisWeek, setHoursThisWeek] = useState(0);
  const [isLoadingMetrics, setIsLoadingMetrics] = useState(true);

  useEffect(() => {
    const loadMetrics = async () => {
      if (!studentData?.year_level || !studentData?.section) {
        setTodaysClasses(0);
        setHoursThisWeek(0);
        setIsLoadingMetrics(false);
        return;
      }

      setIsLoadingMetrics(true);
      try {
        // Student schedules are based on section + year level (and active)
        const { data: schedules, error: schedulesErr } = await supabase
          .from('schedules')
          .select('id, day_of_week, start_time, end_time, is_active')
          .eq('year_level', studentData.year_level)
          .eq('section', studentData.section)
          .eq('is_active', true);

        if (schedulesErr) {
          console.warn('⚠️ Error loading student schedules for metrics:', schedulesErr);
          setTodaysClasses(0);
          setHoursThisWeek(0);
          return;
        }

        const activeSchedules = Array.isArray(schedules) ? schedules : [];

        // Today's Classes
        const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const todayName = dayNames[new Date().getDay()];
        setTodaysClasses(activeSchedules.filter(s => s.day_of_week === todayName).length);

        // Hours This Week = weekly recurring load (sum durations)
        const toMinutes = (t) => {
          if (!t) return 0;
          const parts = String(t).split(':');
          const h = Number(parts[0] || 0);
          const m = Number(parts[1] || 0);
          return h * 60 + m;
        };
        const totalMinutes = activeSchedules.reduce((sum, s) => {
          const start = toMinutes(s.start_time);
          const end = toMinutes(s.end_time);
          const diff = Math.max(0, end - start);
          return sum + diff;
        }, 0);
        setHoursThisWeek(Math.round((totalMinutes / 60) * 10) / 10);
      } catch (e) {
        console.warn('⚠️ Exception computing student metrics:', e);
        setTodaysClasses(0);
        setHoursThisWeek(0);
      } finally {
        setIsLoadingMetrics(false);
      }
    };

    loadMetrics();
  }, [studentData?.year_level, studentData?.section]);

  const stats = useMemo(() => {
    const displayToday = isLoadingMetrics ? '...' : todaysClasses;
    const displayHours = isLoadingMetrics ? '...' : hoursThisWeek;
    return [
      { title: "Today's Classes", value: displayToday, icon: Calendar, color: "bg-red-500", trend: "Scheduled today", description: "Classes for today" },
      { title: "Hours This Week", value: displayHours, icon: Clock, color: "bg-orange-500", trend: "Class hours", description: "Weekly class load" },
    ];
  }, [isLoadingMetrics, todaysClasses, hoursThisWeek]);

  const handleScheduleClick = () => {
    if (onSectionChange) {
      onSectionChange("schedule");
    }
  };

  return (
    <>
      {/* Key Metrics */}
      <div className="mb-8">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-slate-900">Key Metrics</h2>
          <p className="text-slate-600 mt-1">Overview of your academic activities</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
          {stats.map((stat, index) => (
            <div key={index} className="group bg-white rounded-2xl shadow-sm border border-slate-200 p-6 hover:shadow-lg hover:border-slate-300 transition-all duration-300">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">{stat.title}</p>
                  <p className="text-4xl font-bold text-slate-900 mb-1">{stat.value}</p>
                  <p className="text-xs text-slate-500">{stat.description}</p>
                </div>
                <div className={`${stat.color} p-4 rounded-xl shadow-md group-hover:shadow-lg transition-all`}>
                  <stat.icon size={28} className="text-white" />
                </div>
              </div>
              <div className="pt-4 border-t border-slate-100">
                <p className="text-xs font-semibold text-slate-600">{stat.trend}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Management Sections */}
      <div className="mb-8">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-slate-900">Quick Access</h2>
          <p className="text-slate-600 mt-1">Access key features of your dashboard</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <ManagementCard
            title="My Schedule"
            description="View and manage your class schedule"
            icon={Calendar}
            color="red"
            items={["View schedule", "Check upcoming classes"]}
            action={handleScheduleClick}
          />
        </div>
      </div>
    </>
  );
}

function ManagementCard({ title, description, icon: Icon, color, items, action }) {
  const colorClasses = {
    blue: "from-blue-50 to-cyan-50 border-blue-200",
    red: "from-red-50 to-orange-50 border-red-200",
    violet: "from-violet-50 to-purple-50 border-violet-200",
    orange: "from-orange-50 to-amber-50 border-orange-200",
  };

  const iconColorClasses = {
    blue: "from-blue-500 to-cyan-500",
    red: "from-red-500 to-orange-500",
    violet: "from-violet-500 to-purple-500",
    orange: "from-orange-500 to-amber-500",
  };

  return (
    <button 
      onClick={action}
      className={`bg-gradient-to-br ${colorClasses[color]} rounded-2xl border p-6 hover:shadow-lg transition-all duration-300 text-left w-full`}
    >
      <div className="flex items-start gap-4 mb-4">
        <div className={`bg-gradient-to-br ${iconColorClasses[color]} p-3 rounded-xl shadow-md`}>
          <Icon size={24} className="text-white" />
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-bold text-slate-900">{title}</h3>
          <p className="text-sm text-slate-600 mt-1">{description}</p>
        </div>
      </div>
      <div className="space-y-2 pt-4 border-t border-white/50">
        {items.map((item, idx) => (
          <div key={idx} className="flex items-center gap-2 text-sm text-slate-700">
            <div className={`w-1.5 h-1.5 rounded-full bg-gradient-to-r ${iconColorClasses[color]}`}></div>
            {item}
          </div>
        ))}
      </div>
    </button>
  );
}

export default StudentDashboardContent;
