import CTULogo from '../../assets/svg/CTU_logo.svg';
import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { loginProgramHead } from '../../api/auth';
import { Eye, EyeOff, Shield } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import { useFormPersistence, getSavedFormData, useClearFormOnUnmount } from '../../hooks/useFormPersistence';

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({ email: '', password: '', general: '' });
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const emailRef = useRef(null);
  const passwordRef = useRef(null);
  const [securityNotice, setSecurityNotice] = useState('');

  
  useEffect(() => {
    const savedData = getSavedFormData('programHeadLoginForm');
    if (savedData) {
      console.log('♻️ Restoring Program Head Login form data on mount');
      setEmail(savedData.email || '');
      setPassword(savedData.password || '');
    }
  }, []);


  const formDataState = { email, password };
  useFormPersistence('programHeadLoginForm', formDataState);
  useClearFormOnUnmount('programHeadLoginForm');

  useEffect(() => {
    document.title = 'CTU Portal | Program Head Login';
  }, []);

  useEffect(() => {
    const storedNotice = sessionStorage.getItem('authSecurityNotice');
    if (!storedNotice) return;
    try {
      const parsed = JSON.parse(storedNotice);
      if (parsed?.target === 'programHead' && parsed?.message) {
        setSecurityNotice(parsed.message);
      }
    } catch (error) {
      console.error('Failed to parse security notice:', error);
    } finally {
      sessionStorage.removeItem('authSecurityNotice');
    }
  }, []);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
      document.documentElement.style.overflow = '';
    };
  }, []);

  const focusFirstInvalid = (newErrors) => {
    if (newErrors.email) {
      emailRef.current && emailRef.current.focus();
    } else if (newErrors.password) {
      passwordRef.current && passwordRef.current.focus();
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setErrors({ email: '', password: '', general: '' });

    let newErrors = { email: '', password: '', general: '' };
    let valid = true;

    if (!email && !password) {
      newErrors.general = 'Please fill in all required fields.';
      valid = false;
    } else {
      if (!email) {
        newErrors.email = 'Email is required.';
        valid = false;
      } else if (!/\S+@\S+\.\S+/.test(email)) {
        newErrors.email = 'Please enter a valid email address.';
        valid = false;
      }
      if (!password) {
        newErrors.password = 'Password is required.';
        valid = false;
      } else if (password.length < 6) {
        newErrors.password = 'Password must be at least 6 characters.';
        valid = false;
      }
    }

    if (!valid) {
      setErrors(newErrors);
      setIsLoading(false);
      
      let title = 'Validation Error';
      let message = '';
      
      if (newErrors.general) {
        message = newErrors.general;
      } else if (newErrors.email) {
        title = 'Email Error';
        message = newErrors.email;
      } else if (newErrors.password) {
        title = 'Password Error';
        message = newErrors.password;
      }
      
      setErrorModalTitle(title);
      setErrorModalMessage(message);
      setShowErrorModal(true);
      focusFirstInvalid(newErrors);
      return;
    }

    const result = await loginProgramHead({ email, password });

    if (result.success) {
      setSuccessMsg('Login successful! Accessing your dashboard...');
      setShowSuccessModal(true);
      setTimeout(() => {
        navigate('/programhead/dashboard', { replace: true });
      }, 2000);
    } else {
      let errorTitle = 'Login Error';
      let errorMessage = result.error || 'Unable to log in. Please check your credentials or try again later.';

      if (result.error && result.error.toLowerCase().includes('disabled')) {
        errorTitle = 'Account Restricted';
        errorMessage = result.error;
      } else if (result.error && result.error.toLowerCase().includes('invalid login credentials')) {
        errorTitle = 'Login Failed';
        errorMessage = 'No account found with the provided email. Please check your credentials.';
      } else if (result.error && result.error.toLowerCase().includes('network')) {
        errorTitle = 'Network Error';
        errorMessage = 'Network error. Please check your connection and try again.';
      }

      setErrorModalTitle(errorTitle);
      setErrorModalMessage(errorMessage);
      setShowErrorModal(true);
      setErrors({ ...newErrors, general: errorMessage });
    }
    setIsLoading(false);
  };

  const [successMsg, setSuccessMsg] = useState('');
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorModalTitle, setErrorModalTitle] = useState('');
  const [errorModalMessage, setErrorModalMessage] = useState('');
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetMsg, setResetMsg] = useState('');

  const signOutSilently = async () => {
    try {
      
      sessionStorage.setItem('_silentSignOut', 'true');
      await supabase.auth.signOut();
      sessionStorage.removeItem('_silentSignOut');
    } catch (error) {
      console.error('Error during silent sign out:', error);
    }
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setShowResetModal(true);
    setResetEmail('');
    setResetMsg('');
  };

  const handleSendReset = async () => {
    if (!resetEmail) {
      setResetMsg('Please enter your email address.');
      return;
    }
    const redirectTo = `${window.location.origin}/programhead/login`;
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(resetEmail, {
      redirectTo,
    });
    if (resetError) {
      setResetMsg('Failed to send reset email.');
    } else {
      setResetMsg('If an account exists for this email, a password reset link has been sent.');
    }
  };

  const [showRecoveryModal, setShowRecoveryModal] = useState(false);
  const [recoveryPassword, setRecoveryPassword] = useState('');
  const [recoveryConfirm, setRecoveryConfirm] = useState('');
  const [recoveryMsg, setRecoveryMsg] = useState('');
  const [recoveryLoading, setRecoveryLoading] = useState(false);

  useEffect(() => {
    const hash = window.location.hash;
    const searchParams = new URLSearchParams(window.location.search);
    
    console.log('🔍 Password Reset Debug:');
    console.log('   URL:', window.location.href);
    console.log('   Hash:', hash);
    console.log('   Has access_token:', hash.includes('access_token'));
    console.log('   Has type=recovery:', hash.includes('type=recovery'));
    
    const isRecovery = hash.includes('type=recovery') || 
                       hash.includes('access_token') || 
                       searchParams.get('type') === 'recovery';
    
    console.log('   Is Recovery Mode:', isRecovery);
    
    if (isRecovery) {
      console.log('✅ Showing recovery modal');
      setShowRecoveryModal(true);
    } else {
      console.log('❌ Not showing recovery modal');
    }
  }, []);

  const handleRecoverySubmit = async (e) => {
    e.preventDefault();
    setRecoveryMsg('');
    if (!recoveryPassword || !recoveryConfirm) {
      setRecoveryMsg('Please fill in all fields.');
      return;
    }
    if (recoveryPassword.length < 6) {
      setRecoveryMsg('Password must be at least 6 characters.');
      return;
    }
    if (recoveryPassword !== recoveryConfirm) {
      setRecoveryMsg('Passwords do not match.');
      return;
    }
    setRecoveryLoading(true);
    
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session) {
        console.error('Session error:', sessionError);
        setRecoveryMsg('Your password reset link has expired or is invalid. Please request a new password reset link.');
        setRecoveryLoading(false);
        return;
      }
      
      const { data, error } = await supabase.auth.updateUser({ 
        password: recoveryPassword 
      });
      
      setRecoveryLoading(false);
      
      if (error) {
        console.error('Password update error:', error);
        
        if (error.message.includes('same')) {
          setRecoveryMsg('Please choose a different password from your previous one.');
        } else if (error.message.includes('weak')) {
          setRecoveryMsg('Password is too weak. Please use a stronger password with at least 6 characters.');
        } else if (error.message.includes('token') || error.message.includes('expired')) {
          setRecoveryMsg('Your password reset link has expired. Please request a new one.');
        } else {
          setRecoveryMsg(`Failed to update password: ${error.message}`);
        }
      } else {
        console.log('Password updated successfully');
        
        setRecoveryMsg('Password updated successfully! Redirecting to login...');
        
        setTimeout(async () => {
          setShowRecoveryModal(false);
          
          await supabase.auth.signOut();
          
          localStorage.removeItem('isAuthenticated');
          localStorage.removeItem('isAdmin');
          sessionStorage.removeItem('isAuthenticated');
          sessionStorage.removeItem('isAdmin');
          
          window.history.replaceState(null, '', '/programhead/login');
          
          window.location.href = '/programhead/login';
        }, 1500);
      }
    } catch (err) {
      console.error('Unexpected error:', err);
      setRecoveryMsg('An unexpected error occurred. Please try again or contact support.');
      setRecoveryLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-slate-900 via-slate-950 to-black flex items-center justify-center px-4 py-6">
      <div className="w-full max-w-2xl bg-white/5 border border-white/10 rounded-3xl shadow-2xl backdrop-blur-xl overflow-hidden">
        <div className="grid md:grid-cols-2">
          <div className="p-8 md:p-8 text-white bg-gradient-to-br from-red-900/60 via-red-700/70 to-red-600/70">
          </div>

          <div className="p-8 md:p-8 bg-white/95">
            <div className="flex flex-col items-center text-center mb-6">
              <img src={CTULogo} alt="CTU Logo" className="w-14 h-14 mb-3" />
              <h2 className="text-xl font-semibold text-slate-900">Department Chair Login</h2>
              <p className="text-sm text-slate-500">
                Sign in to continue
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {securityNotice && (
                <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-900 flex items-start gap-3">
                  <div className="mt-0.5">
                    <Shield size={16} className="text-red-600" />
                  </div>
                  <div className="flex-1 leading-relaxed">{securityNotice}</div>
                  <button
                    type="button"
                    onClick={() => setSecurityNotice('')}
                    className="text-[10px] font-semibold text-red-700 hover:text-red-900"
                  >
                    DISMISS
                  </button>
                </div>
              )}
              {successMsg && (
                <div className="rounded-xl border border-green-200 bg-green-50 px-3 py-2 text-xs text-green-600">{successMsg}</div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Email</label>
                <input
                  ref={emailRef}
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isLoading}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                  placeholder="Enter your email"
                  autoComplete="username"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Password</label>
                <div className="relative rounded-2xl border border-slate-200 bg-white">
                  <input
                    ref={passwordRef}
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={isLoading}
                    className="w-full rounded-2xl px-4 py-3 text-sm focus:outline-none"
                    placeholder="Enter your password"
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute inset-y-0 right-3 flex items-center text-slate-500 bg-transparent hover:text-slate-700 transition-colors p-0 border-none shadow-none password-toggle-btn"
                    tabIndex={-1}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <a
                  href="#"  
                  className="text-xs md:text-sm text-blue-600 hover:underline focus:outline-none focus:ring-2 focus:ring-blue-400 active:text-blue-800 transition"
                  tabIndex={0}
                  onClick={handleForgotPassword}
                >Forgot Password?</a>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full rounded-2xl bg-[#4285F4] py-3 px-6 text-sm font-semibold text-white shadow-lg shadow-[#4285F4]/30 transition hover:shadow-2xl hover:bg-[#357AE8] disabled:opacity-60"
              >
                {isLoading ? 'Verifying credentials…' : 'Sign In'}
              </button>

              <div className="text-center pt-2">
                <p className="text-xs md:text-sm text-slate-600">Don't have an account? 
                  <button
                    type="button"
                    className="text-xs md:text-sm text-blue-600 hover:underline focus:outline-none focus:ring-2 focus:ring-blue-400 active:text-blue-800 transition ml-1"
                    tabIndex={0}
                    onClick={() => navigate('/register')}
                    style={{ background: 'none', border: 'none', padding: 0 }}
                  >Sign up Here</button>
                </p>
              </div>
            </form>
          </div>
        </div>
      </div>
      {showResetModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white/95 border border-white/10 rounded-3xl shadow-2xl p-8 w-full max-w-sm backdrop-blur-xl">
            <h2 className="text-xl font-bold text-slate-900 mb-3">Reset Password</h2>
            <p className="text-sm text-slate-600 mb-6 leading-relaxed">Please enter your registered email address. We will send you a secure link to reset your password. If you do not receive the email within a few minutes, please check your spam folder or contact support.</p>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-2">Email Address</label>
              <input
                type="email"
                className="w-full px-4 py-3 border border-slate-200 rounded-2xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent text-sm"
                placeholder="Enter your email address"
                value={resetEmail}
                onChange={e => setResetEmail(e.target.value)}
              />
            </div>
            {resetMsg && (
              <div className={`text-xs mt-4 p-3 rounded-xl ${resetMsg.includes('link has been sent') ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                {resetMsg.includes('link has been sent')
                  ? 'A password reset link has been sent.\nPlease check your inbox.'
                  : resetMsg === 'Failed to send reset email.'
                  ? 'We were unable to send a reset email at this time. Please wait a moment and try again, or contact support if the issue persists.'
                  : resetMsg}
              </div>
            )}
            <div className="flex gap-3 mt-6">
              <button 
                className="flex-1 px-4 py-3 bg-[#4285F4] text-white rounded-2xl font-semibold shadow-lg shadow-blue-500/30 hover:shadow-2xl hover:bg-[#357AE8] transition disabled:opacity-60" 
                onClick={handleSendReset} 
                disabled={!resetEmail}
              >
                Send Link
              </button>
              <button 
                className="flex-1 px-4 py-3 border border-slate-200 bg-white text-slate-600 rounded-2xl font-semibold hover:bg-slate-50 transition" 
                onClick={() => setShowResetModal(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
      {showRecoveryModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white/95 border border-white/10 rounded-3xl shadow-2xl p-8 w-full max-w-sm backdrop-blur-xl">
            <h2 className="text-xl font-bold text-slate-900 mb-3">Reset Your Password</h2>
            <p className="text-sm text-slate-600 mb-6">Please enter and confirm your new password to complete your password reset.</p>
            <form onSubmit={handleRecoverySubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-2">New Password</label>
                <input
                  type="password"
                  className="w-full px-4 py-3 border border-slate-200 rounded-2xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent text-sm"
                  placeholder="Enter new password"
                  value={recoveryPassword}
                  onChange={e => setRecoveryPassword(e.target.value)}
                  required
                  minLength={6}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-2">Confirm Password</label>
                <input
                  type="password"
                  className="w-full px-4 py-3 border border-slate-200 rounded-2xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent text-sm"
                  placeholder="Confirm new password"
                  value={recoveryConfirm}
                  onChange={e => setRecoveryConfirm(e.target.value)}
                  required
                  minLength={6}
                />
              </div>
              {recoveryMsg && (
                <div className={`text-xs p-3 rounded-xl ${recoveryMsg.includes('successfully') || recoveryMsg.includes('Redirecting') ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                  {recoveryMsg}
                </div>
              )}
              <button
                type="submit"
                className="w-full py-3 px-4 bg-[#4285F4] text-white rounded-2xl font-semibold shadow-lg shadow-blue-500/30 hover:shadow-2xl hover:bg-[#357AE8] focus:outline-none focus:ring-2 focus:ring-blue-400 transition disabled:opacity-60 text-sm"
                disabled={recoveryLoading || recoveryMsg.includes('Redirecting')}
              >
                {recoveryLoading ? 'Updating Password…' : 'Update Password'}
              </button>
            </form>
          </div>
        </div>
      )}
      {showErrorModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 px-4">
          <div className="bg-white/95 border border-white/10 rounded-3xl shadow-2xl p-8 w-full max-w-sm backdrop-blur-xl">
            <div className="flex items-center justify-center mb-6">
              <div className="w-16 h-16 rounded-full bg-amber-50 border-2 border-amber-200 flex items-center justify-center">
                <svg className="w-8 h-8 text-amber-600" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M19 10h-1V7c0-3.314-2.686-6-6-6s-6 2.686-6 6v3H5c-1.103 0-2 .897-2 2v10c0 1.103.897 2 2 2h14c1.103 0 2-.897 2-2V12c0-1.103-.897-2-2-2zM9 7c0-1.654 1.346-3 3-3s3 1.346 3 3v3H9V7zm10 15H5V12h14v10zm-6-3c1.103 0 2-.897 2-2s-.897-2-2-2-2 .897-2 2 .897 2 2 2z"/>
                </svg>
              </div>
            </div>
            <h2 className="text-2xl font-bold text-slate-900 text-center mb-3">{errorModalTitle}</h2>
            <p className="text-sm text-slate-600 text-center mb-8 leading-relaxed">{errorModalMessage}</p>
            <div className="space-y-3">
              <button
                onClick={() => setShowErrorModal(false)}
                className="w-full px-6 py-3 bg-[#4285F4] text-white rounded-2xl font-semibold shadow-lg shadow-blue-500/30 hover:shadow-2xl hover:bg-[#357AE8] transition text-sm"
              >
                Return to Login
              </button>
            </div>
          </div>
        </div>
      )}
      {showSuccessModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white/95 border border-white/10 rounded-3xl shadow-2xl p-8 w-full max-w-sm backdrop-blur-xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-green-50 border border-green-200 flex items-center justify-center">
                <span className="text-xl">✓</span>
              </div>
              <h2 className="text-xl font-bold text-slate-900">Success</h2>
            </div>
            <p className="text-sm text-slate-600 mb-6 leading-relaxed">{successMsg}</p>
            <div className="flex items-center justify-center">
              <div className="w-2 h-2 rounded-full animate-bounce" style={{ backgroundColor: '#4285f4', animationDelay: '0s' }}></div>
              <div className="w-2 h-2 rounded-full animate-bounce mx-1" style={{ backgroundColor: '#4285f4', animationDelay: '0.2s' }}></div>
              <div className="w-2 h-2 rounded-full animate-bounce" style={{ backgroundColor: '#4285f4', animationDelay: '0.4s' }}></div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Login;
