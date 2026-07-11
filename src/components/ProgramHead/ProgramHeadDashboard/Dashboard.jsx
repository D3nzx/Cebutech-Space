import React, { useEffect, useState } from "react";
import { Users, Calendar, Plus, ArrowRight, User, Gauge, AlertTriangle, BookOpen, MapPin, BarChart3, Book } from "lucide-react";
import { supabase } from "../../../lib/supabaseClient";

function Dashboard({ onSectionChange, onSchedulingTabChange, programHeadData }) {
  const [programFacultyCount, setProgramFacultyCount] = useState(0);
  const [isLoadingFacultyCount, setIsLoadingFacultyCount] = useState(true);
  const [scheduledClassesCount, setScheduledClassesCount] = useState(0);
  const [isLoadingScheduledClasses, setIsLoadingScheduledClasses] = useState(true);
  const [locationsCount, setLocationsCount] = useState(0);
  const [isLoadingLocations, setIsLoadingLocations] = useState(true);
  const [subjectsCount, setSubjectsCount] = useState(0);
  const [isLoadingSubjects, setIsLoadingSubjects] = useState(true);

  useEffect(() => {
    const fetchProgramFacultyCount = async () => {
      try {
        setIsLoadingFacultyCount(true);

        const program = programHeadData?.program;
        if (!program) {
          setProgramFacultyCount(0);
          return;
        }

        const { count, error } = await supabase
          .from('faculty')
          .select('id', { count: 'exact', head: true })
          .eq('program', program)
          .neq('is_active', false);

        if (error) {
          console.error('❌ Error fetching faculty count for program:', program, error);
          setProgramFacultyCount(0);
          return;
        }

        setProgramFacultyCount(count || 0);
      } catch (err) {
        console.error('❌ Exception fetching program faculty count:', err);
        setProgramFacultyCount(0);
      } finally {
        setIsLoadingFacultyCount(false);
      }
    };

    fetchProgramFacultyCount();
  }, [programHeadData?.program]);

  useEffect(() => {
    const fetchScheduledClassesCount = async () => {
      try {
        setIsLoadingScheduledClasses(true);

        const programHeadId = programHeadData?.id;
        if (!programHeadId) {
          setScheduledClassesCount(0);
          return;
        }

        // Use current academic period heuristic
        const now = new Date();
        const currentYear = now.getFullYear();
        const nextYear = currentYear + 1;
        const schoolYear = `${currentYear}-${nextYear}`;
        const semester = now.getMonth() < 6 ? 2 : 1; // Jan-Jun => 2nd sem, Jul-Dec => 1st sem

        const { count, error } = await supabase
          .from('schedules')
          .select('id', { count: 'exact', head: true })
          .eq('created_by_program_head_id', programHeadId)
          .eq('school_year', schoolYear)
          .eq('semester', semester);

        if (error) {
          console.error('❌ Error fetching scheduled classes count:', error);
          setScheduledClassesCount(0);
          return;
        }

        setScheduledClassesCount(count || 0);
      } catch (err) {
        console.error('❌ Exception fetching scheduled classes count:', err);
        setScheduledClassesCount(0);
      } finally {
        setIsLoadingScheduledClasses(false);
      }
    };

    fetchScheduledClassesCount();
  }, [programHeadData?.id]);

  useEffect(() => {
    const fetchLocationsCount = async () => {
      try {
        setIsLoadingLocations(true);

        // Some schemas may not have is_active for locations; count all rows.
        const { count, error } = await supabase
          .from('locations')
          .select('id', { count: 'exact', head: true });

        if (error) {
          console.error('❌ Error fetching locations count:', error);
          setLocationsCount(0);
          return;
        }

        setLocationsCount(count || 0);
      } catch (err) {
        console.error('❌ Exception fetching locations count:', err);
        setLocationsCount(0);
      } finally {
        setIsLoadingLocations(false);
      }
    };

    fetchLocationsCount();
  }, []);

  useEffect(() => {
    const fetchSubjectsCount = async () => {
      try {
        setIsLoadingSubjects(true);

        const { count, error } = await supabase
          .from('subjects')
          .select('id', { count: 'exact', head: true });

        if (error) {
          console.error('❌ Error fetching subjects count:', error);
          setSubjectsCount(0);
          return;
        }

        setSubjectsCount(count || 0);
      } catch (err) {
        console.error('❌ Exception fetching subjects count:', err);
        setSubjectsCount(0);
      } finally {
        setIsLoadingSubjects(false);
      }
    };

    fetchSubjectsCount();
  }, []);

  const stats = [
    { title: "Total Faculty", value: isLoadingFacultyCount ? "..." : programFacultyCount, icon: Users, color: "bg-emerald-500", trend: "Active in your program", description: "Teaching staff members" },
    { title: "Scheduled Classes", value: isLoadingScheduledClasses ? "..." : scheduledClassesCount, icon: Calendar, color: "bg-violet-500", trend: "This semester", description: "Total class sessions" },
    { title: "Subjects", value: isLoadingSubjects ? "..." : subjectsCount, icon: Book, color: "bg-indigo-500", trend: "All", description: "Total subjects" },
    { title: "Locations", value: isLoadingLocations ? "..." : locationsCount, icon: MapPin, color: "bg-orange-500", trend: "All", description: "Classrooms & facilities" },
  ];

  const pendingRequestsCount = 2;

  const handlePendingRequestsClick = () => {
    onSectionChange("scheduling");
    if (onSchedulingTabChange) {
      onSchedulingTabChange("requests");
    }
  };

  return (
    <>
      {/* Key Metrics */}
      <div className="mb-8">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-slate-900">Key Metrics</h2>
          <p className="text-slate-600 mt-1">Overview of your program's current status</p>
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

    </>
  );
}

function ManagementCard({ title, description, icon: Icon, color, items, action }) {
  const colorClasses = {
    blue: "from-blue-50 to-cyan-50 border-blue-200",
    indigo: "from-indigo-50 to-blue-50 border-indigo-200",
    violet: "from-violet-50 to-purple-50 border-violet-200",
    orange: "from-orange-50 to-amber-50 border-orange-200",
  };

  const iconColorClasses = {
    blue: "from-blue-500 to-cyan-500",
    indigo: "from-indigo-500 to-blue-500",
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

export default Dashboard;


