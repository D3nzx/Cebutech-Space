import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../../lib/supabaseClient';
import { Loader, AlertCircle } from 'lucide-react';

function EmailConfirmation() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState('loading'); 
  const [message, setMessage] = useState('');

  useEffect(() => {
    const handleEmailConfirmation = async () => {
      try {
        const token = searchParams.get('token');
        const type = searchParams.get('type');

        console.log('Email Confirmation - URL Params:', { token, type });

        if (type === 'signup') {
          console.log('Processing signup confirmation...');
          
          
          await new Promise(resolve => setTimeout(resolve, 1500));

          
          const { data: { user }, error: userError } = await supabase.auth.getUser();
          
          if (userError || !user) {
            console.log('Could not retrieve user email, proceeding with redirect');
          }

          
          console.log('Email confirmed! Database trigger will create profile.');
          
          setStatus('redirecting');
          setMessage('Email confirmed! Your profile is being set up and pending administrator approval. Redirecting...');
          
         
          if (user?.email) {
            sessionStorage.setItem('registrationSuccessEmail', user.email);
          }
          
          setTimeout(() => {
            const redirectUrl = user?.email 
              ? `/programhead/registration-success?email=${encodeURIComponent(user.email)}`
              : '/programhead/registration-success';
            navigate(redirectUrl, { replace: true });
          }, 2000);
        } 
        else if (type === 'recovery') {
          console.log('Processing password recovery...');
          setStatus('redirecting');
          setMessage('Redirecting to password reset page...');
          
          setTimeout(() => {
            navigate('/programhead/reset-password', { replace: true });
          }, 1000);
        } 
        else {
          console.log('Invalid confirmation type or missing parameters');
          setStatus('error');
          setMessage('Invalid confirmation link. Please check your email again or register a new account.');
        }
      } catch (error) {
        console.error('Email confirmation error:', error);
        setStatus('error');
        setMessage('An error occurred while processing your confirmation. Please try registering again.');
      }
    };

    handleEmailConfirmation();
  }, [searchParams, navigate]);

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-slate-900 via-slate-950 to-black flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {(status === 'loading' || status === 'redirecting') && (
          <div className="bg-white/95 border border-white/10 rounded-3xl shadow-2xl p-8 w-full backdrop-blur-xl text-center">
            <Loader className="w-12 h-12 text-blue-500 mx-auto mb-4 animate-spin" />
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Confirming Email</h2>
            <p className="text-slate-600">{message || 'Please wait while we confirm your email address...'}</p>
          </div>
        )}

        {status === 'error' && (
          <div className="bg-white/95 border border-white/10 rounded-3xl shadow-2xl p-8 w-full backdrop-blur-xl">
            <div className="flex items-center justify-center mb-4">
              <div className="w-16 h-16 rounded-full bg-red-50 border border-red-200 flex items-center justify-center">
                <AlertCircle size={32} className="text-red-600" />
              </div>
            </div>
            <h2 className="text-2xl font-bold text-slate-900 text-center mb-3">Confirmation Failed</h2>
            <p className="text-sm text-slate-600 text-center mb-6 leading-relaxed">{message}</p>
            <div className="space-y-2">
              <button
                onClick={() => navigate('/programhead/login', { replace: true })}
                className="w-full px-6 py-3 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-600 text-white rounded-2xl font-semibold shadow-lg shadow-blue-500/30 hover:shadow-2xl transition text-sm"
              >
                Go to Login
              </button>
              <button
                onClick={() => navigate('/programhead/register', { replace: true })}
                className="w-full px-6 py-3 bg-slate-200 text-slate-900 rounded-2xl font-semibold hover:bg-slate-300 transition text-sm"
              >
                Register Again
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default EmailConfirmation;
