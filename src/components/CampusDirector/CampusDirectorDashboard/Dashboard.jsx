import React, { useEffect, useState } from "react";
import { BookOpen, Users, Calendar, MapPin } from "lucide-react";
import { supabase } from "../../../lib/supabaseClient";

function Dashboard() {
  const [programMetrics, setProgramMetrics] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchProgramMetrics = async () => {
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from('schedules')
          .select('id, program_heads:created_by_program_head_id ( program )')
          .eq('is_active', true);

        if (error) {
          console.error('❌ Error fetching program metrics:', error);
          setProgramMetrics([]);
          return;
        }

        const counts = data.reduce((acc, schedule) => {
          const programName = schedule.program_heads?.program || 'Unassigned';
          acc[programName] = (acc[programName] || 0) + 1;
          return acc;
        }, {});

        const metrics = Object.entries(counts).map(([programName, count]) => ({
          programName,
          count
        }));

        setProgramMetrics(metrics);
      } catch (err) {
        console.error('❌ Exception fetching program metrics:', err);
        setProgramMetrics([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProgramMetrics();
  }, []);

  const cardStyles = [
    { icon: BookOpen, color: "bg-blue-500" },
    { icon: Users, color: "bg-emerald-500" },
    { icon: Calendar, color: "bg-violet-500" },
    { icon: MapPin, color: "bg-orange-500" },
  ];

  return (
    <>
      <div className="mb-8">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-slate-900">Program Metrics</h2>
          <p className="text-slate-600 mt-1">Active schedules per program</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-6">
          {isLoading ? (
            Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                <div className="animate-pulse flex space-x-4">
                  <div className="flex-1 space-y-4 py-1">
                    <div className="h-4 bg-slate-200 rounded w-3/4"></div>
                    <div className="h-10 bg-slate-200 rounded w-1/2"></div>
                    <div className="h-4 bg-slate-200 rounded w-full"></div>
                  </div>
                  <div className="rounded-xl bg-slate-200 h-16 w-16"></div>
                </div>
              </div>
            ))
          ) : (
            programMetrics.map((metric, index) => {
              const style = cardStyles[index % cardStyles.length];
              return (
                <div key={index} className="group bg-white rounded-2xl shadow-sm border border-slate-200 p-6 hover:shadow-lg hover:border-slate-300 transition-all duration-300">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">{metric.programName}</p>
                      <p className="text-4xl font-bold text-slate-900 mb-1">{metric.count}</p>
                      <p className="text-xs text-slate-500">Active Schedules</p>
                    </div>
                    <div className={`${style.color} p-4 rounded-xl shadow-md group-hover:shadow-lg transition-all`}>
                      <style.icon size={28} className="text-white" />
                    </div>
                  </div>
                  <div className="pt-4 border-t border-slate-100">
                    <p className="text-xs font-semibold text-slate-600">Currently Active</p>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </>
  );
}

export default Dashboard;
