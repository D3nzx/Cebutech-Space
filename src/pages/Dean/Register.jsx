import React, { useState, useRef, useEffect } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import CTULogo from '../../assets/svg/CTU_logo.svg';
import { useNavigate, Link } from 'react-router-dom';

import { signUpDean, checkDeanExists } from '../../api/auth';
import { useFormPersistence, getSavedFormData, useClearFormOnUnmount } from '../../hooks/useFormPersistence';

function Register() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');

  const [errors, setErrors] = useState({ firstName: '', lastName: '', email: '', password: '', confirmPassword: '', general: '' });
  const [isLoading, setIsLoading] = useState(false);

  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorModalTitle, setErrorModalTitle] = useState('');
  const [errorModalMessage, setErrorModalMessage] = useState('');

  const [showEmailVerificationModal, setShowEmailVerificationModal] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState('');

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState('');

  const [deanExists, setDeanExists] = useState(false);
  const [checkingDean, setCheckingDean] = useState(true);

  const emailRef = useRef(null);
  const passwordRef = useRef(null);
  const confirmPasswordRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    const savedData = getSavedFormData('deanRegisterForm');
    if (savedData) {
      setEmail(savedData.email || '');
      setPassword(savedData.password || '');
      setFirstName(savedData.firstName || '');
      setLastName(savedData.lastName || '');
    }
  }, []);

  const formDataState = { email, password, firstName, lastName };
  useFormPersistence('deanRegisterForm', formDataState);
  useClearFormOnUnmount('deanRegisterForm');

  const handleNameInput = (setter) => (e) => {
    const value = e.target.value;
    const filtered = value.replace(/[^a-zA-Z ]/g, '');
    setter(filtered);
  };

  useEffect(() => {
    document.title = 'CTU Portal | Dean Registration';
  }, []);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
      document.documentElement.style.overflow = '';
    };
  }, []);

  useEffect(() => {
    const run = async () => {
      setCheckingDean(true);
      const { exists } = await checkDeanExists();
      setDeanExists(Boolean(exists));
      setCheckingDean(false);
    };

    run();
  }, []);

  const focusFirstInvalid = (newErrors) => {
    if (newErrors.email) {
      emailRef.current && emailRef.current.focus();
    } else if (newErrors.password) {
      passwordRef.current && passwordRef.current.focus();
    } else if (newErrors.confirmPassword) {
      confirmPasswordRef.current && confirmPasswordRef.current.focus();
    }
  };

  const validate = () => {
    let valid = true;
    const newErrors = { firstName: '', lastName: '', email: '', password: '', confirmPassword: '', general: '' };
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!firstName) {
      newErrors.firstName = 'First name is required.';
      valid = false;
    } else if (!/^[a-zA-Z ]+$/.test(firstName)) {
      newErrors.firstName = 'First name can only contain letters and spaces.';
      valid = false;
    }

    if (!lastName) {
      newErrors.lastName = 'Last name is required.';
      valid = false;
    } else if (!/^[a-zA-Z ]+$/.test(lastName)) {
      newErrors.lastName = 'Last name can only contain letters and spaces.';
      valid = false;
    }

    if (!email) {
      newErrors.email = 'Email is required.';
      valid = false;
    } else if (!emailPattern.test(email)) {
      newErrors.email = 'Please enter a valid email address.';
      valid = false;
    }

    if (!password) {
      newErrors.password = 'Password is required.';
      valid = false;
    } else if (password.length < 6 || !/(?=.*[a-zA-Z])(?=.*\d)/.test(password)) {
      newErrors.password = 'Password must be at least 6 characters with letters and numbers.';
      valid = false;
    }

    if (!confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password.';
      valid = false;
    } else if (password !== confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match.';
      valid = false;
    }

    setErrors(newErrors);
    return { valid, newErrors };
  };

  const getErrorModalContent = (newErrors) => {
    let title = 'Validation Error';
    let message = '';

    if (newErrors.firstName) {
      title = 'First Name Error';
      message = newErrors.firstName;
    } else if (newErrors.lastName) {
      title = 'Last Name Error';
      message = newErrors.lastName;
    } else if (newErrors.email) {
      title = 'Email Error';
      message = newErrors.email;
    } else if (newErrors.password) {
      title = 'Password Error';
      message = newErrors.password;
    } else if (newErrors.confirmPassword) {
      title = 'Password Confirmation Error';
      message = newErrors.confirmPassword;
    } else if (newErrors.general) {
      message = newErrors.general;
    } else {
      const firstError = Object.values(newErrors).find((err) => err);
      message = firstError || 'Please fill in all required fields.';
    }

    return { title, message };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    if (checkingDean || deanExists) {
      setErrorModalTitle('Dean Account Already Exists');
      setErrorModalMessage(
        'A Dean account has already been created. Only one Dean can be registered in the system. If you believe this is an error, please contact the administrator.'
      );
      setShowErrorModal(true);
      setIsLoading(false);
      return;
    }

    const { valid, newErrors } = validate();

    if (!valid) {
      setIsLoading(false);
      focusFirstInvalid(newErrors);

      const { title, message } = getErrorModalContent(newErrors);
      setErrorModalTitle(title);
      setErrorModalMessage(message);
      setShowErrorModal(true);
      return;
    }

    const { user, error: signUpError } = await signUpDean({ email, password, firstName, lastName });

    if (signUpError) {
      let errorTitle = 'Registration Error';
      let errorMessage = 'Registration failed. Please try again or contact support if the problem persists.';

      if (signUpError.message) {
        errorMessage = signUpError.message;
      }

      setErrorModalTitle(errorTitle);
      setErrorModalMessage(errorMessage);
      setShowErrorModal(true);
      setIsLoading(false);
      return;
    }

    setRegisteredEmail(email);
    sessionStorage.setItem('registrationUserType', 'dean');
    setShowEmailVerificationModal(true);
    setIsLoading(false);
    return user;
  };

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-slate-900 via-slate-950 to-black flex items-center justify-center px-3 sm:px-4 py-4 sm:py-2 overflow-hidden">
      <div className="w-full max-w-2xl lg:max-w-3xl bg-white/5 border border-white/10 rounded-2xl sm:rounded-3xl shadow-2xl backdrop-blur-xl overflow-hidden">
        <div className="grid lg:grid-cols-2 auto-rows-max">
          <div className="p-5 sm:p-6 lg:p-7 text-white bg-gradient-to-br from-orange-600 via-red-500 to-red-700"></div>

          <div className="p-4 sm:p-5 md:p-5 lg:p-6 bg-white/95 flex items-stretch">
            <div className="w-full max-w-full sm:max-w-md mx-auto">
              <div className="flex flex-col items-center text-center mb-3 sm:mb-4">
                <img src={CTULogo} alt="CTU Logo" className="w-10 h-10 sm:w-12 sm:h-12 mb-1.5 sm:mb-2" />
                <h2 className="text-base sm:text-lg font-semibold text-slate-900">Dean Registration</h2>
                <p className="text-xs text-slate-500">Set up your account</p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-2 sm:space-y-2.5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-2.5">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">First Name</label>
                    <input
                      type="text"
                      value={firstName}
                      onChange={handleNameInput(setFirstName)}
                      disabled={isLoading}
                      className="w-full rounded-xl sm:rounded-2xl border border-slate-200 bg-white px-3 sm:px-4 py-2.5 sm:py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                      placeholder="First name"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Last Name</label>
                    <input
                      type="text"
                      value={lastName}
                      onChange={handleNameInput(setLastName)}
                      disabled={isLoading}
                      className="w-full rounded-xl sm:rounded-2xl border border-slate-200 bg-white px-3 sm:px-4 py-2.5 sm:py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                      placeholder="Last name"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Email</label>
                  <input
                    ref={emailRef}
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={isLoading}
                    className="w-full rounded-xl sm:rounded-2xl border border-slate-200 bg-white px-3 sm:px-4 py-2.5 sm:py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                    placeholder="Enter your email address"
                    autoComplete="username"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Password</label>
                  <div className="relative rounded-xl sm:rounded-2xl border border-slate-200 bg-white">
                    <input
                      ref={passwordRef}
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      disabled={isLoading}
                      className="w-full rounded-xl sm:rounded-2xl px-3 sm:px-4 py-2.5 sm:py-3 text-sm focus:outline-none"
                      placeholder="Enter secure password"
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      className="absolute inset-y-0 right-2 sm:right-3 flex items-center text-slate-500 bg-transparent hover:text-slate-700 transition-colors p-0 border-none shadow-none password-toggle-btn"
                      tabIndex={-1}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff size={16} className="sm:w-[18px] sm:h-[18px]" /> : <Eye size={16} className="sm:w-[18px] sm:h-[18px]" />}
                    </button>
                  </div>
                  <p className="mt-1 text-[10px] sm:text-[11px] text-slate-500">At least 6 characters with letters and numbers.</p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Confirm Password</label>
                  <div className="relative rounded-xl sm:rounded-2xl border border-slate-200 bg-white">
                    <input
                      ref={confirmPasswordRef}
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      disabled={isLoading}
                      className="w-full rounded-xl sm:rounded-2xl px-3 sm:px-4 py-2.5 sm:py-3 text-sm focus:outline-none"
                      placeholder="Confirm password"
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword((prev) => !prev)}
                      className="absolute inset-y-0 right-2 sm:right-3 flex items-center text-slate-500 bg-transparent hover:text-slate-700 transition-colors p-0 border-none shadow-none password-toggle-btn"
                      tabIndex={-1}
                      aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                    >
                      {showConfirmPassword ? <EyeOff size={16} className="sm:w-[18px] sm:h-[18px]" /> : <Eye size={16} className="sm:w-[18px] sm:h-[18px]" />}
                    </button>
                  </div>
                </div>

                <div className="flex justify-center pt-1.5">
                  <button
                    type="submit"
                    disabled={isLoading || deanExists || checkingDean}
                    className="w-full sm:max-w-xs px-5 sm:px-6 rounded-lg sm:rounded-xl bg-[#4285F4] py-2 sm:py-2.5 text-xs font-semibold text-white shadow-lg shadow-[#4285F4]/30 transition hover:shadow-2xl hover:bg-[#357AE8] disabled:opacity-60 flex items-center justify-center gap-1.5"
                  >
                    {isLoading ? 'Creating…' : 'Create Account'}
                  </button>
                </div>

                <div className="text-center pt-0.5">
                  <p className="text-xs text-slate-600">
                    Already have an account?
                    <Link
                      to="/dean/login"
                      className="text-xs text-blue-600 hover:underline focus:outline-none focus:ring-2 focus:ring-blue-400 active:text-blue-800 transition ml-1"
                    >
                      Log in Here
                    </Link>
                  </p>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>

      {showErrorModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white/95 border border-white/10 rounded-3xl shadow-2xl p-8 w-full max-w-sm backdrop-blur-xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-[#4285F4]/10 border border-[#4285F4]/30 flex items-center justify-center">
                <span className="text-xl">⚠️</span>
              </div>
              <h2 className="text-xl font-bold text-slate-900">{errorModalTitle}</h2>
            </div>
            <p className="text-sm text-slate-600 mb-6 leading-relaxed">{errorModalMessage}</p>
            <button
              onClick={() => setShowErrorModal(false)}
              className="max-w-xs mx-auto block px-6 py-3 bg-[#4285F4] text-white rounded-2xl font-semibold shadow-lg shadow-[#4285F4]/30 hover:shadow-2xl hover:bg-[#357AE8] transition text-sm"
            >
              Try Again
            </button>
          </div>
        </div>
      )}

      {showEmailVerificationModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white/95 border border-white/10 rounded-3xl shadow-2xl p-8 w-full max-w-sm backdrop-blur-xl">
            <div className="flex items-center justify-center mb-4">
              <div className="w-16 h-16 rounded-full bg-[#4285F4]/10 border border-[#4285F4]/30 flex items-center justify-center">
                <span className="text-3xl">✉️</span>
              </div>
            </div>
            <h2 className="text-2xl font-bold text-slate-900 text-center mb-3">Verify Your Email</h2>
            <p className="text-sm text-slate-600 text-center mb-4 leading-relaxed">We've sent a confirmation link to:</p>
            <div className="bg-slate-100 rounded-2xl p-4 mb-6 text-center">
              <p className="text-sm font-semibold text-slate-900 break-all">{registeredEmail}</p>
            </div>
            <div className="bg-[#4285F4]/10 border border-[#4285F4]/30 rounded-2xl p-4 mb-6">
              <p className="text-sm text-slate-700 leading-relaxed">
                <span className="font-semibold">Please check your email</span> (including spam/junk folders) and click the confirmation link to verify your account.
              </p>
            </div>
            <div className="space-y-3">
              <button
                onClick={() => navigate('/dean/login', { replace: true })}
                className="w-full px-6 py-3 bg-[#4285F4] text-white rounded-2xl font-semibold shadow-lg shadow-[#4285F4]/30 hover:shadow-2xl hover:bg-[#357AE8] transition text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Go to Login
              </button>
              <p className="text-center text-xs text-slate-500">
                You can log in after an administrator approves your account.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Register;
