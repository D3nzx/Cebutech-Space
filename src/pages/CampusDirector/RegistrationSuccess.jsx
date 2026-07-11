import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { CheckCircle } from 'lucide-react';

function RegistrationSuccess() {
  const [searchParams] = useSearchParams();
  const [email, setEmail] = useState('');

  useEffect(() => {
    const emailParam = searchParams.get('email');

    if (emailParam) {
      setEmail(decodeURIComponent(emailParam));
      sessionStorage.setItem('registrationSuccessEmail', emailParam);
    } else {
      const storedEmail = sessionStorage.getItem('registrationSuccessEmail');
      if (storedEmail) {
        setEmail(storedEmail);
      }
    }

  }, [searchParams]);

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-slate-900 via-slate-950 to-black flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-sm">
        <div className="bg-white/95 backdrop-blur-xl border border-white/20 rounded-3xl shadow-2xl overflow-hidden">
          <div className="relative bg-gradient-to-r from-green-500 via-emerald-500 to-teal-600 px-5 py-7 text-center">
            <div className="absolute inset-0 opacity-10">
              <div className="absolute top-2 right-2 w-24 h-24 bg-white rounded-full blur-3xl"></div>
              <div className="absolute bottom-2 left-2 w-24 h-24 bg-white rounded-full blur-3xl"></div>
            </div>
            <div className="relative z-10 flex justify-center mb-2">
              <div className="bg-white/20 rounded-full p-2 backdrop-blur-sm">
                <CheckCircle size={36} className="text-white" strokeWidth={1.5} />
              </div>
            </div>
            <h1 className="text-xl md:text-2xl font-bold text-white mb-0.5">Email Verified</h1>
            <p className="text-green-50 text-xs md:text-sm">Your email has been confirmed</p>
          </div>

          <div className="px-5 py-6 md:px-6 md:py-7">
            <div className="mb-4 text-center">
              <h2 className="text-base md:text-lg font-semibold text-slate-900 mb-2">Welcome to CTU Portal!</h2>
              <p className="text-slate-600 text-xs md:text-sm leading-relaxed mb-4">
                Your email <span className="font-semibold text-slate-900 break-all">{email}</span> has been verified. Your account will be available after an administrator approves it.
              </p>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 md:p-4 text-center">
              <p className="text-slate-700 text-xs md:text-sm leading-relaxed font-medium">Awaiting approval</p>
              <p className="text-slate-500 text-xs mt-1">An administrator is currently reviewing the information you submitted. Please wait for approval, or contact the administrator for updates.</p>
            </div>
          </div>

          <div className="bg-slate-50 px-5 py-3 md:px-6 border-t border-slate-200">
            <p className="text-center text-slate-600 text-xs">
              Having trouble?{' '}
              <a href="mailto:support@ctu.edu.ph" className="text-indigo-600 hover:text-indigo-700 font-semibold transition">
                Contact Support
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default RegistrationSuccess;
