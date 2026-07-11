import React, { useState, useRef, useEffect } from 'react';
import { Eye, EyeOff, AlertCircle, CheckCircle, X } from 'lucide-react';
import CTULogo from '../../assets/svg/CTU_logo.svg';
import { useNavigate, Link } from 'react-router-dom';
import { registerStudent } from '../../api/studentAuth';
import { getColleges, getCourses } from '../../api/courses';
import SimpleSelector from '../../components/SimpleSelector';
import ProgramSelector from '../../components/ProgramSelector';
import { useFormPersistence, getSavedFormData, useClearFormOnUnmount } from '../../hooks/useFormPersistence';

function StudentRegister() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [collegeId, setCollegeId] = useState('');
  const [college, setCollege] = useState('');
  const [programId, setProgramId] = useState('');
  const [program, setProgram] = useState('');
  const [yearLevel, setYearLevel] = useState('');
  const [section, setSection] = useState('');

  
  const [colleges, setColleges] = useState([]);
  const [programs, setPrograms] = useState([]);
  const [loadingData, setLoadingData] = useState(true);

  
  const allowedProgramsByCollege = {
    'College of Education, Arts, and Sciences': [
      'Bachelor of Elementary Education',
      'Bachelor of Secondary Education major in English',
      'Bachelor of Secondary Education major in Filipino',
      'Bachelor of Secondary Education major in Mathematics',
      'Bachelor of Arts in Political Science',
    ],
    'College of Technology, Management, and Entrepreneurship': [
      'Bachelor of Science in Information Technology',
      'Bachelor of Science in Business Administration - Financial Management',
      'Bachelor of Science in Hospitality Management',
    ],
  };

  
  const yearLevelOptions = [
    { value: '1st Year', label: '1st Year' },
    { value: '2nd Year', label: '2nd Year' },
    { value: '3rd Year', label: '3rd Year' },
    { value: '4th Year', label: '4th Year' },
  ];

  const sectionOptions = [
    { value: 'A', label: 'A' },
    { value: 'B', label: 'B' },
    { value: 'C', label: 'C' },
    { value: 'D', label: 'D' },
    { value: '1', label: '1' },
    { value: '2', label: '2' },
    { value: '3', label: '3' },
    { value: '4', label: '4' },
  ];

  const [errors, setErrors] = useState({ firstName: '', lastName: '', email: '', password: '', confirmPassword: '', college: '', program: '', yearLevel: '', section: '', general: '' });
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorModalTitle, setErrorModalTitle] = useState('');
  const [errorModalMessage, setErrorModalMessage] = useState('');
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showRegistrationSuccessModal, setShowRegistrationSuccessModal] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const emailRef = useRef(null);
  const passwordRef = useRef(null);
  const confirmPasswordRef = useRef(null);
  const navigate = useNavigate();

 
  useEffect(() => {
    const savedData = getSavedFormData('studentRegisterForm');
    if (savedData) {
      console.log('♻️ Restoring Student Register form data on mount');
      setEmail(savedData.email || '');
      setFirstName(savedData.firstName || '');
      setLastName(savedData.lastName || '');
      setPassword(savedData.password || '');
      setConfirmPassword(savedData.confirmPassword || '');
      setCollegeId(savedData.collegeId || '');
      setCollege(savedData.college || '');
      setProgramId(savedData.programId || '');
      setProgram(savedData.program || '');
      setYearLevel(savedData.yearLevel || '');
      setSection(savedData.section || '');
      setCurrentStep(savedData.currentStep || 1);
    }
  }, []);

  
  const formDataState = {
    email, firstName, lastName, password, confirmPassword,
    collegeId, college, programId, program, yearLevel, section, currentStep
  };
  useFormPersistence('studentRegisterForm', formDataState);
  useClearFormOnUnmount('studentRegisterForm');

 
  useEffect(() => {
    document.title = 'CTU Portal | Student Registration';
  }, []);

  
  const handleNameInput = (setter) => (e) => {
    const value = e.target.value;
    const filtered = value.replace(/[^a-zA-Z ]/g, '');
    setter(filtered);
  };

  
  useEffect(() => {
    const loadData = async () => {
      try {
        const result = await getColleges();
        console.log('Colleges result:', result);
        if (result.error) {
          console.error('Error loading colleges:', result.error);
          setColleges([]);
        } else {
          console.log('Colleges loaded successfully:', result.data);
          setColleges(result.data || []);
        }
      } catch (err) {
        console.error('Exception loading colleges:', err);
        setColleges([]);
      } finally {
        setLoadingData(false);
      }
    };
    loadData();
  }, []);

  useEffect(() => {
    document.title = 'CTU Portal | Student Registration';
  }, []);

  
  const handleCollegeChange = async (selectedCollegeId) => {
    console.log('College selected:', selectedCollegeId);
    setCollegeId(selectedCollegeId);
   
    const selectedCollege = colleges.find(c => c.id === selectedCollegeId);
    setCollege(selectedCollege?.college_name || '');
    setProgram(''); 
    setProgramId(''); 

    if (selectedCollegeId) {
      try {
        
        const result = await getCourses();
        console.log('Courses result:', result);
        if (result.error) {
          console.error('Error loading courses:', result.error);
          setPrograms([]);
        } else {
          const allowedList = allowedProgramsByCollege[selectedCollege?.college_name];
          let filteredPrograms = result.data?.filter(c => c.college_id === selectedCollegeId) || [];
          if (allowedList) {
            filteredPrograms = filteredPrograms.filter(p => allowedList.includes(p.course_name));
          }
          console.log('Filtered programs:', filteredPrograms);
          setPrograms(filteredPrograms);
        }
      } catch (err) {
        console.error('Exception loading programs:', err);
        setPrograms([]);
      }
    } else {
      setPrograms([]);
    }
  };

  
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
      document.documentElement.style.overflow = '';
    };
  }, []);

  const focusFirstInvalid = (newErrors) => {
    if (newErrors.firstName) {
      
    } else if (newErrors.lastName) {
      
    } else if (newErrors.email) {
      emailRef.current && emailRef.current.focus();
    } else if (newErrors.password) {
      passwordRef.current && passwordRef.current.focus();
    } else if (newErrors.confirmPassword) {
      confirmPasswordRef.current && confirmPasswordRef.current.focus();
    }
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
      title = 'Confirm Password Error';
      message = newErrors.confirmPassword;
    } else if (newErrors.college) {
      title = 'College Error';
      message = newErrors.college;
    } else if (newErrors.program) {
      title = 'Program Error';
      message = newErrors.program;
    } else if (newErrors.yearLevel) {
      title = 'Year Level Error';
      message = newErrors.yearLevel;
    } else if (newErrors.section) {
      title = 'Section Error';
      message = newErrors.section;
    } else {
      title = 'Validation Error';
      message = 'Please check your input and try again.';
    }

    return { title, message };
  };

  const validateStep1 = () => {
    let valid = true;
    const newErrors = { firstName: '', lastName: '', email: '', password: '', confirmPassword: '', college: '', program: '', yearLevel: '', section: '', general: '' };
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

  const validateStep2 = () => {
    let valid = true;
    const newErrors = { firstName: '', lastName: '', email: '', password: '', confirmPassword: '', college: '', program: '', yearLevel: '', section: '', general: '' };

    if (!college) {
      newErrors.college = 'College is required.';
      valid = false;
    }

    if (!program) {
      newErrors.program = 'Program is required.';
      valid = false;
    }

    if (!yearLevel) {
      newErrors.yearLevel = 'Year level is required.';
      valid = false;
    }

    if (!section) {
      newErrors.section = 'Section is required.';
      valid = false;
    }

    setErrors(newErrors);
    return { valid, newErrors };
  };

  const handleNextStep = () => {
    const { valid, newErrors } = validateStep1();
    if (!valid) {
      focusFirstInvalid(newErrors);

      const { title, message } = getErrorModalContent(newErrors);
      setErrorModalTitle(title);
      setErrorModalMessage(message);
      setShowErrorModal(true);
      return;
    }
    setCurrentStep(2);
  };

  const validate = () => {
    let valid = true;
    const newErrors = { firstName: '', lastName: '', email: '', password: '', confirmPassword: '', college: '', program: '', yearLevel: '', section: '', general: '' };
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

    if (!college) {
      newErrors.college = 'College is required.';
      valid = false;
    }

    if (!program) {
      newErrors.program = 'Program is required.';
      valid = false;
    }

    if (!yearLevel) {
      newErrors.yearLevel = 'Year level is required.';
      valid = false;
    }

    if (!section) {
      newErrors.section = 'Section is required.';
      valid = false;
    }

    setErrors(newErrors);
    return { valid, newErrors };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setSuccess('');
    setError('');
    const { valid, newErrors } = validateStep2();

    if (!valid) {
      setIsLoading(false);
      focusFirstInvalid(newErrors);

      const { title, message } = getErrorModalContent(newErrors);
      setErrorModalTitle(title);
      setErrorModalMessage(message);
      setShowErrorModal(true);
      return;
    }

    try {
      const result = await registerStudent({ 
        email, 
        password, 
        firstName, 
        lastName,
        college,
        program,
        yearLevel,
        section
      });

      if (!result.success) {
        let errorTitle = 'Registration Error';
        let errorMessage = result.error || 'Registration failed. Please try again or contact support if the problem persists.';
        if (result.error && result.error.toLowerCase().includes('already registered')) {
          errorTitle = 'Account Already Exists';
          errorMessage = 'An account with this email address already exists. Please use a different email.';
        }
        setErrorModalTitle(errorTitle);
        setErrorModalMessage(errorMessage);
        setShowErrorModal(true);
        setIsLoading(false);
        return;
      }

      setRegisteredEmail(email);
      
      sessionStorage.setItem('registrationUserType', 'student');
      setShowRegistrationSuccessModal(true);
      setIsLoading(false);
    } catch (err) {
      setErrorModalTitle('Registration Error');
      setErrorModalMessage('An unexpected error occurred. Please try again later.');
      setShowErrorModal(true);
      console.error('Registration error:', err);
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-slate-900 via-slate-950 to-black flex items-center justify-center px-3 sm:px-4 py-4 sm:py-2 overflow-hidden">
      <div className="w-full max-w-2xl lg:max-w-3xl bg-white/5 border border-white/10 rounded-2xl sm:rounded-3xl shadow-2xl backdrop-blur-xl overflow-hidden outline-none focus:outline-none">
        <div className="grid lg:grid-cols-2 auto-rows-max outline-none focus:outline-none">
          <div className="p-5 sm:p-6 lg:p-7 text-white bg-gradient-to-br from-red-800 via-red-600 to-orange-400 pointer-events-none select-none" aria-hidden="true">
          </div>

          <div className="p-4 sm:p-5 md:p-5 lg:p-6 bg-white/95 flex items-stretch select-none">
            <div className="w-full max-w-full sm:max-w-md mx-auto">
              <div className="flex flex-col items-center text-center mb-3 sm:mb-4 pointer-events-none">
                <img src={CTULogo} alt="CTU Logo" className="w-10 h-10 sm:w-12 sm:h-12 mb-1.5 sm:mb-2" />
                <h2 className="text-base sm:text-lg font-semibold text-slate-900">Student Registration</h2>
                <p className="text-xs text-slate-500">Set up your account</p>
              </div>

              <div className="flex items-center justify-center gap-2.5 mb-3">
                {[1, 2].map((step) => (
                  <div key={step} className="flex items-center gap-1.5">
                    <div
                      className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold ${
                        currentStep === step ? 'bg-[#4285F4] text-white' : 'bg-slate-200 text-slate-600'
                      }`}
                    >
                      {step}
                    </div>
                    <span className={`text-xs font-semibold ${currentStep === step ? 'text-[#4285F4]' : 'text-slate-500'}`}>
                      {step === 1 ? 'Account' : 'Academic'}
                    </span>
                    {step === 1 && <span className="w-4 h-px bg-slate-300" aria-hidden />}
                  </div>
                ))}
              </div>

              <form onSubmit={handleSubmit} className="space-y-2 sm:space-y-2.5">
                {currentStep === 1 && (
                  <>
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
                          className="w-full rounded-xl sm:rounded-2xl px-3 sm:px-4 py-2.5 sm:py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
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
                          className="w-full rounded-xl sm:rounded-2xl px-3 sm:px-4 py-2.5 sm:py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
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
                        type="button"
                        disabled={isLoading}
                        onClick={handleNextStep}
                        className="w-full sm:max-w-xs px-5 sm:px-6 rounded-lg sm:rounded-xl bg-[#4285F4] py-2 sm:py-2.5 text-xs font-semibold text-white shadow-lg shadow-[#4285F4]/30 transition hover:shadow-2xl hover:bg-[#357AE8] disabled:opacity-60"
                      >
                        Continue
                      </button>
                    </div>
                  </>
                )}

                {currentStep === 2 && (
                  <>
                    <div className="pt-0">
                      <p className="text-[9px] sm:text-[10px] font-semibold uppercase tracking-[0.1em] sm:tracking-[0.12em] text-[#4285F4] mb-1">
                        Academic Details
                      </p>
                    </div>

                <div className="space-y-1 sm:space-y-1">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-0.25">
                      College
                    </label>
                    <SimpleSelector
                      options={colleges?.map(collegeOption => ({ value: collegeOption.id, label: collegeOption.college_name })) || []}
                      value={collegeId}
                      onChange={(selectedCollegeId) => handleCollegeChange(selectedCollegeId)}
                      placeholder={loadingData ? 'Loading colleges...' : 'Select College'}
                      disabled={isLoading || loadingData}
                      searchable={true}
                    />
                    <p className="mt-0 text-[7px] sm:text-[8px] text-slate-400">
                      Choose your college.
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-0.25">
                      Program
                    </label>
                    <ProgramSelector
                      programs={programs || []}
                      colleges={colleges || []}
                      value={programId}
                      onChange={(selectedProgramId) => {
                        
                        setProgramId(selectedProgramId);
                        const selectedProgram = programs.find(p => p.id === selectedProgramId);
                        setProgram(selectedProgram?.course_name || '');
                      }}
                      placeholder={!college ? 'Select College first' : programs.length === 0 ? 'No programs available' : 'Select Program'}
                      disabled={isLoading || !college || programs.length === 0}
                    />
                    <p className="mt-0 text-[7px] sm:text-[8px] text-slate-400">
                      Filtered by your college.
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-0.25">
                      Year Level <span className="text-red-500">*</span>
                    </label>
                    <SimpleSelector
                      options={yearLevelOptions}
                      value={yearLevel}
                      onChange={(selectedYearLevel) => setYearLevel(selectedYearLevel)}
                      placeholder="Select Year Level"
                      disabled={isLoading}
                      searchable={true}
                    />
                    <p className="mt-0 text-[7px] sm:text-[8px] text-slate-400">
                      Choose your current year level.
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-0.25">
                      Section <span className="text-red-500">*</span>
                    </label>
                    <SimpleSelector
                      options={sectionOptions}
                      value={section}
                      onChange={(selectedSection) => setSection(selectedSection)}
                      placeholder="Select Section"
                      disabled={isLoading}
                      searchable={true}
                    />
                    <p className="mt-0 text-[7px] sm:text-[8px] text-slate-400">
                      Choose your section.
                    </p>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-1.5 justify-between pt-1">
                  <button
                    type="button"
                    disabled={isLoading}
                    onClick={() => setCurrentStep(1)}
                    className="w-full sm:max-w-[140px] px-5 sm:px-6 rounded-lg sm:rounded-xl border border-slate-200 bg-white py-2 sm:py-2.5 text-xs font-semibold text-slate-700 shadow-sm hover:shadow transition disabled:opacity-60"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full sm:max-w-[160px] px-5 sm:px-6 rounded-lg sm:rounded-xl bg-[#4285F4] py-2 sm:py-2.5 text-xs font-semibold text-white shadow-lg shadow-[#4285F4]/30 transition hover:shadow-2xl hover:bg-[#357AE8] disabled:opacity-60 flex items-center justify-center gap-1.5"
                  >
                    {isLoading && <span className="inline-block h-3 w-3 border-2 border-white/70 border-t-transparent rounded-full animate-spin" aria-hidden />}
                    {isLoading ? 'Creating…' : 'Create Account'}
                  </button>
                </div>
                  </>
                )}

                <div className="text-center pt-0.5">
                  <p className="text-xs text-slate-600">Already have an account?
                    <Link
                      to="/student/login"
                      className="text-xs text-blue-600 hover:underline focus:outline-none active:text-blue-800 transition ml-1"
                    >Log in Here</Link>
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

      {showRegistrationSuccessModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white/95 border border-white/10 rounded-3xl shadow-2xl p-8 w-full max-w-sm backdrop-blur-xl">
            <div className="flex items-center justify-center mb-4">
              <div className="w-16 h-16 rounded-full bg-[#4285F4]/10 border border-[#4285F4]/30 flex items-center justify-center">
                <span className="text-3xl">✉️</span>
              </div>
            </div>
            <h2 className="text-2xl font-bold text-slate-900 text-center mb-3">Verify Your Email</h2>
            <p className="text-sm text-slate-600 text-center mb-4 leading-relaxed">
              We've sent a confirmation link to:
            </p>
            <div className="bg-slate-100 rounded-2xl p-4 mb-6 text-center">
              <p className="text-sm font-semibold text-slate-900 break-all">{registeredEmail}</p>
            </div>
            <div className="bg-[#4285F4]/10 border border-[#4285F4]/30 rounded-2xl p-4 mb-6">
              <p className="text-sm text-slate-700 leading-relaxed">
                <span className="font-semibold">Please check your email</span> (including spam/junk folders) and click the confirmation link to verify your account. This step is essential to activate your Student account and gain full access to the system.
              </p>
              <p className="text-xs text-slate-600 mt-3 pt-3 border-t border-[#4285F4]/20">
                <span className="font-semibold">Note:</span> Confirmation emails may take 5-15 minutes to arrive. Please be patient and check back later if you don't see it immediately.
              </p>
            </div>
            <button
              onClick={() => navigate('/student/login', { replace: true })}
              className="w-full px-6 py-3 bg-[#4285F4] text-white rounded-2xl font-semibold shadow-lg shadow-[#4285F4]/30 hover:shadow-2xl hover:bg-[#357AE8] transition text-sm"
            >
              Go to Login
            </button>
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
            <p className="text-sm text-slate-600 mb-6 leading-relaxed">{success}</p>
            <button
              onClick={() => navigate('/student/login', { replace: true })}
              className="max-w-xs mx-auto block px-6 py-3 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-600 text-white rounded-2xl font-semibold shadow-lg shadow-blue-500/30 hover:shadow-2xl transition text-sm"
            >
              Proceed to Login
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default StudentRegister;
