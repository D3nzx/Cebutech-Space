import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../../lib/supabaseClient';
import { AlertCircle, CheckCircle } from 'lucide-react';

function AuthCallback() {
  const navigate = useNavigate();
  const location = useLocation();
  const [status, setStatus] = useState('processing'); 
  const [errorMessage, setErrorMessage] = useState('');
  const [userEmail, setUserEmail] = useState('');

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        console.group('🔍 AuthCallback Debug');
        console.log('📍 URL:', window.location.href);
        console.log('📍 Hash:', location.hash);
        console.log('📍 Search:', location.search);
        console.log('📍 Pathname:', location.pathname);

        // Parse URL hash for error parameters
        const hashParams = new URLSearchParams(location.hash.substring(1));
        const error = hashParams.get('error');
        const errorCode = hashParams.get('error_code');
        const errorDescription = hashParams.get('error_description');

        if (error || errorCode) {
          console.error('❌ Error in URL hash:', { error, errorCode, errorDescription });
          setStatus('error');
          
          if (errorCode === 'otp_expired' || errorDescription?.includes('expired')) {
            setErrorMessage('This confirmation link has expired.');
          } else if (errorCode === 'access_denied') {
            setErrorMessage('Access denied. The confirmation link may be invalid or expired.');
          } else {
            setErrorMessage(errorDescription || 'An error occurred during email confirmation.');
          }
          console.groupEnd();
          return;
        }

        // Wait for Supabase to process the hash
        console.log('⏳ Waiting 2 seconds for Supabase to process...');
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Get the actual user
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        console.log('User:', user?.email);
        console.log('User ID:', user?.id);
        console.log('Email Confirmed At:', user?.email_confirmed_at);
        console.log('User metadata:', user?.user_metadata);
        if (userError) console.error('User error:', userError);

        // If no user, show error
        if (!user) {
          console.warn('❌ No user found');
          setStatus('error');
          setErrorMessage('Unable to verify your email. The confirmation link may be invalid or expired. Please try registering again.');
          console.groupEnd();
          return;
        }

        // Set user email for success display
        setUserEmail(user.email);

        // Determine user type from metadata
        const userType = user?.user_metadata?.user_type || sessionStorage.getItem('registrationUserType') || 'program_head';
        sessionStorage.setItem('registrationUserType', userType);

        console.log(`✅ User type detected: ${userType}`);

        // Check if email is confirmed
        if (user.email_confirmed_at) {
          console.log('✅ Email confirmed! Database trigger has created the profile automatically.');
          sessionStorage.setItem('registrationSuccessEmail', user.email);
          setStatus('success');
          
          console.groupEnd();
          
          // Redirect to appropriate success page after 3 seconds
          setTimeout(() => {
            const successPath = {
              'campus_director': '/campusdirector/registration-success',
              'dean': '/dean/registration-success',
              'program_head': '/programhead/registration-success',
            }[userType] || '/programhead/registration-success';
            
            navigate(
              `${successPath}?email=${encodeURIComponent(user.email)}`,
              { replace: true }
            );
          }, 3000);
        } else {
          console.warn('⚠️ Email NOT confirmed - treating as failed');
          setStatus('error');
          setErrorMessage('Email confirmation failed. Please check the confirmation link and try again.');
          console.groupEnd();
        }
      } catch (error) {
        console.error('💥 Error in AuthCallback:', error);
        console.groupEnd();
        setStatus('error');
        setErrorMessage('An unexpected error occurred. Please try registering again or contact support.');
      }
    };

    handleAuthCallback();
  }, [navigate, location]);

  // Render based on status
  if (status === 'error') {
    return (
      <div className="min-h-screen w-full bg-gradient-to-br from-slate-900 via-slate-950 to-black flex items-center justify-center px-4">
        <div className="w-full max-w-md">
          <div className="bg-white/95 border border-white/10 rounded-3xl shadow-2xl p-8 w-full backdrop-blur-xl">
            <div className="flex items-center justify-center mb-4">
              <div className="w-16 h-16 rounded-full bg-red-50 border border-red-200 flex items-center justify-center">
                <AlertCircle size={32} className="text-red-500" />
              </div>
            </div>
            <h2 className="text-2xl font-bold text-slate-900 text-center mb-3">Confirmation Failed</h2>
            <p className="text-slate-600 text-center mb-6 leading-relaxed">
              {errorMessage}
            </p>
            <button
              onClick={() => navigate('/')}
              className="w-full bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-4 rounded-lg transition"
            >
              Return to Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (status === 'success') {
    return (
      <div className="min-h-screen w-full bg-gradient-to-br from-slate-900 via-slate-950 to-black flex items-center justify-center px-4">
        <div className="w-full max-w-md">
          <div className="bg-white/95 border border-white/10 rounded-3xl shadow-2xl p-8 w-full backdrop-blur-xl">
            <div className="flex items-center justify-center mb-4">
              <div className="w-16 h-16 rounded-full bg-green-50 border border-green-200 flex items-center justify-center">
                <CheckCircle size={32} className="text-green-500" />
              </div>
            </div>
            <h2 className="text-2xl font-bold text-slate-900 text-center mb-3">Email Verified</h2>
            <p className="text-slate-600 text-center mb-4 leading-relaxed">
              Your email address has been verified. Your account will be available after an administrator approves it.
            </p>
            {userEmail && (
              <div className="bg-slate-100 rounded-2xl p-4 mb-6 text-center">
                <p className="text-sm font-semibold text-slate-900 break-all">{userEmail}</p>
              </div>
            )}
            <p className="text-slate-500 text-center text-sm mb-6">
              Redirecting you to the success page...
            </p>
            <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
              <div className="bg-[#4285F4] h-full rounded-full animate-pulse" style={{ width: '100%' }}></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Default: processing state
  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-slate-900 via-slate-950 to-black flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="bg-white/95 border border-white/10 rounded-3xl shadow-2xl p-8 w-full backdrop-blur-xl text-center">
          <div className="w-12 h-12 text-blue-500 mx-auto mb-4 animate-spin">
            <svg className="w-full h-full" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Processing</h2>
          <p className="text-slate-600">Please wait while we process your email confirmation...</p>
        </div>
      </div>
    </div>
  );
}

export default AuthCallback;
