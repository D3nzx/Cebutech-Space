import React from 'react';

export default function LoadingScreen({ variant = 'admin' }) {
  const uniformDotColor = '#60a5fa'; // Soft, eye-friendly blue

  const variants = {
    admin: {
      spinnerColor: 'border-amber-500/30',
      spinnerBorder: 'border-t-amber-500',
      accentColor: 'from-amber-500 to-orange-500',
    },
    programhead: {
      spinnerColor: 'border-indigo-500/30',
      spinnerBorder: 'border-t-indigo-500',
      accentColor: 'from-indigo-500 to-purple-500',
    },
    faculty: {
      spinnerColor: 'border-indigo-500/30',
      spinnerBorder: 'border-t-indigo-500',
      accentColor: 'from-indigo-500 to-purple-500',
    },
    student: {
      spinnerColor: 'border-red-500/30',
      spinnerBorder: 'border-t-red-500',
      accentColor: 'from-red-500 to-orange-500',
    },
    dean: {
      spinnerColor: 'border-red-500/30',
      spinnerBorder: 'border-t-red-500',
      accentColor: 'from-red-500 to-orange-500',
    },
  };

  const config = variants[variant] || variants.admin;

  return (
    <div className="flex h-screen items-center justify-center bg-gradient-to-br from-slate-900 via-slate-950 to-black">
      <div className="flex flex-col items-center gap-6">
        {/* Animated Dots */}
        <div className="flex items-center gap-2">
          <div
            className="w-3 h-3 rounded-full animate-bounce"
            style={{
              backgroundColor: uniformDotColor,
              animationDelay: '0s',
            }}
          ></div>
          <div
            className="w-3 h-3 rounded-full animate-bounce"
            style={{
              backgroundColor: uniformDotColor,
              animationDelay: '0.2s',
            }}
          ></div>
          <div
            className="w-3 h-3 rounded-full animate-bounce"
            style={{
              backgroundColor: uniformDotColor,
              animationDelay: '0.4s',
            }}
          ></div>
        </div>

        {/* Subtle Text */}
        <div className="text-center">
          <p className="text-sm text-slate-400 font-medium tracking-wide">Preparing your dashboard</p>
        </div>
      </div>
    </div>
  );
}
