import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { loginAdmin } from '../../api/adminAuth';
import { saveRoleSession } from '../../lib/multiSessionManager';
import CTULogo from '../../assets/svg/CTU_logo.svg';
import { Eye, EyeOff, Shield } from 'lucide-react';
import { useFormPersistence, getSavedFormData, useClearFormOnUnmount } from '../../hooks/useFormPersistence';
import AdminErrorModal from '../../components/Administrator/AdminErrorModal';
import AdminSuccessModal from '../../components/Administrator/AdminSuccessModal';

function LoginUIAdmin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({ email: '', password: '', general: '' });
  const [successMsg, setSuccessMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorModalTitle, setErrorModalTitle] = useState('');
  const [errorModalMessage, setErrorModalMessage] = useState('');
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [securityNotice, setSecurityNotice] = useState('');
  const emailRef = useRef(null);
  const passwordRef = useRef(null);
  const navigate = useNavigate();


  useEffect(() => {
    const savedData = getSavedFormData('adminLoginForm');
    if (savedData) {
      console.log('♻️ Restoring Admin Login form data on mount');
      setEmail(savedData.email || '');
      setPassword(savedData.password || '');
    }
  }, []);

 
  const formDataState = { email, password };
  useFormPersistence('adminLoginForm', formDataState);
  useClearFormOnUnmount('adminLoginForm');

  useEffect(() => {
    document.title = 'CTU Portal | Administrator Login';
  }, []);

  useEffect(() => {
    const storedNotice = sessionStorage.getItem('authSecurityNotice');
    if (!storedNotice) return;
    try {
      const parsed = JSON.parse(storedNotice);
      if (parsed?.target === 'admin' && parsed?.message) {
        setSecurityNotice(parsed.message);
      }
    } catch (error) {
      console.error('Failed to parse security notice:', error);
    } finally {
      sessionStorage.removeItem('authSecurityNotice');
    }
  }, []);

  const focusFirstInvalid = (newErrors) => {
    if (newErrors.email && emailRef.current) {
      emailRef.current.focus();
    } else if (newErrors.password && passwordRef.current) {
      passwordRef.current.focus();
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors({ email: '', password: '', general: '' });
    setSuccessMsg('');

    const newErrors = { email: '', password: '', general: '' };
    let valid = true;

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

    if (!valid) {
      setErrors(newErrors);
      
      
      let title = 'Validation Error';
      let message = '';
      
      if (newErrors.email) {
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

    setIsLoading(true);
    const { success, user, admin, error } = await loginAdmin({ email, password });
    setIsLoading(false);

    if (!success || !user || !admin) {
      let errorTitle = 'Login Error';
      let errorMessage = error || 'Unable to log in. Please verify your credentials and try again.';
      
      if (error?.toLowerCase().includes('invalid') || error?.toLowerCase().includes('no administrator')) {
        errorTitle = 'Authentication Failed';
        errorMessage = 'No administrator account matched the provided credentials.';
      } else if (error?.toLowerCase().includes('disabled')) {
        errorTitle = 'Account Disabled';
        errorMessage = error;
      }
      
      setErrorModalTitle(errorTitle);
      setErrorModalMessage(errorMessage);
      setShowErrorModal(true);
      setErrors({ ...newErrors, general: errorMessage });
      focusFirstInvalid(newErrors);
      return;
    }

   
    saveRoleSession('admin', {
      email: user.email,
      id: user.id,
      adminCode: admin.admin_code,
      adminLevel: admin.admin_level,
      loginTime: Date.now(),
      isAdmin: true
    });

    sessionStorage.setItem('isAuthenticated', 'true');
    sessionStorage.setItem('isAdmin', 'true');
    localStorage.setItem('isAuthenticated', 'true');
    localStorage.setItem('isAdmin', 'true');
  
    localStorage.removeItem('adminActiveSection');

    setSuccessMsg('Login successful! Accessing your administrative dashboard...');
    setShowSuccessModal(true);
    setTimeout(() => {
      navigate('/admin/dashboard', { replace: true });
    }, 2000);
  };

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-slate-900 via-slate-950 to-black flex items-center justify-center px-4 py-6">
      <div className="w-full max-w-2xl bg-white/5 border border-white/10 rounded-3xl shadow-2xl backdrop-blur-xl overflow-hidden">
        <div className="grid md:grid-cols-2">
          <div className="p-8 md:p-10 text-white bg-gradient-to-br from-amber-500/60 via-orange-500/70 to-rose-600/70">
          </div>

          <div className="p-8 md:p-10 bg-white/95">
            <div className="flex flex-col items-center text-center mb-6">
              <img src={CTULogo} alt="CTU Logo" className="w-14 h-14 mb-3" />
              <h2 className="text-xl font-semibold text-slate-900">Administrator Login</h2>
              <p className="text-sm text-slate-500">Please use your elevated campus credentials</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {securityNotice && (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-900 flex items-start gap-3">
                  <div className="mt-0.5">
                    <Shield size={16} className="text-amber-600" />
                  </div>
                  <div className="flex-1 leading-relaxed">{securityNotice}</div>
                  <button
                    type="button"
                    onClick={() => setSecurityNotice('')}
                    className="text-[10px] font-semibold text-amber-700 hover:text-amber-900"
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
                  placeholder="admin.name@ctu.edu"
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
                    placeholder="Enter secure password"
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

              <button
                type="submit"
                disabled={isLoading}
                className="w-full mt-3 rounded-2xl bg-[#4285F4] py-3 px-6 text-sm font-semibold text-white shadow-lg shadow-[#4285F4]/30 transition hover:shadow-2xl hover:bg-[#357AE8] disabled:opacity-60"
              >
                {isLoading ? 'Verifying credentials…' : 'Sign In'}
              </button>
            </form>
          </div>
        </div>
      </div>
      <AdminErrorModal
        open={showErrorModal}
        title={errorModalTitle}
        message={errorModalMessage}
        onClose={() => setShowErrorModal(false)}
      />
      <AdminSuccessModal open={showSuccessModal} message={successMsg} />
    </div>
  );
}

export default LoginUIAdmin;
