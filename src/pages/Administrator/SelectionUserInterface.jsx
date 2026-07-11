import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, UserCheck } from 'lucide-react';
import CTULogo from '../../assets/svg/CTU_logo.svg';

function SelectionUserInterface() {
  const navigate = useNavigate();

  useEffect(() => {
    document.title = 'CTU Portal | Admin UI';
  }, []);

  const entryPoints = [
    {
      label: 'Login as Administrator',
      description: 'Access administrative controls, master data, and elevated scheduling privileges.',
      accent: 'from-amber-500 via-orange-500 to-red-500',
      icon: ShieldCheck,
      route: '/admin/login',
    },
    {
      label: 'Login as Program Head',
      description: 'Manage program schedules, coordinate faculty, and monitor academic activities.',
      accent: 'from-cyan-500 via-blue-500 to-indigo-500',
      icon: UserCheck,
      route: '/programhead/login',
    },
  ];

  const handleNavigate = (route) => {
    navigate(route);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center px-4 py-10">
      <div className="flex flex-col items-center text-center max-w-3xl mb-10">
        <img src={CTULogo} alt="CTU Logo" className="w-16 h-16 mb-3" />
        <p className="text-xs uppercase tracking-[0.25em] text-slate-400">Cebu Technological University</p>
        <h1 className="mt-3 text-3xl font-bold text-white">Institutional Console Access</h1>
        <p className="mt-2 text-slate-300 text-sm md:text-base">
          Choose how you would like to sign in. Both options lead to the secure CTU login experience, but highlight the
          responsibilities of each role for clarity when accessing the portal.
        </p>
      </div>

      <div className="grid gap-6 w-full max-w-4xl md:grid-cols-2">
        {entryPoints.map(({ label, description, accent, icon: Icon, route }) => (
          <button
            key={label}
            type="button"
            onClick={() => handleNavigate(route)}
            className="relative rounded-2xl border border-white/10 bg-white/5 backdrop-blur-lg p-6 text-left transition duration-200 hover:-translate-y-1 hover:border-white/30 hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
          >
            <div className={`inline-flex items-center justify-center rounded-xl bg-gradient-to-r ${accent} p-3 text-white shadow-lg shadow-black/30`}>
              <Icon size={26} />
            </div>
            <div className="mt-5">
              <h2 className="text-xl font-semibold text-white">{label}</h2>
              <p className="mt-2 text-sm text-slate-300 leading-relaxed">{description}</p>
            </div>
            <div className="mt-5 text-sm font-medium text-blue-300">Continue to secure login →</div>
          </button>
        ))}
      </div>
    </div>
  );
}

export default SelectionUserInterface;
