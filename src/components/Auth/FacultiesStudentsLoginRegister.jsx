import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  User, Mail, Lock, Eye, EyeOff, GraduationCap, BookOpen, Users,
  CheckCircle, AlertCircle, Loader, Shield
} from 'lucide-react';

function FacultiesStudentsLoginRegister({ userType, onLogin, onRegister, initialMode = 'login' }) {
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(initialMode === 'login');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState(null);
  const [securityNotice, setSecurityNotice] = useState('');

  useEffect(() => {
    setIsLogin(initialMode === 'login');
  }, [initialMode]);

  useEffect(() => {
    const storedNotice = sessionStorage.getItem('authSecurityNotice');
    if (!storedNotice) return;
    try {
      const parsed = JSON.parse(storedNotice);
      if (parsed?.target === userType && parsed?.message) {
        setSecurityNotice(parsed.message);
      }
    } catch (error) {
      console.error('Failed to parse security notice:', error);
    } finally {
      sessionStorage.removeItem('authSecurityNotice');
    }
  }, [userType]);

  const [loginData, setLoginData] = useState({ email: '', password: '' });
  const [registerData, setRegisterData] = useState({
    firstName: '', lastName: '', email: '', password: '', confirmPassword: '',
    ...(userType === 'student' && { idNumber: '', course: '', yearLevel: '', section: '' })
  });
  const [errors, setErrors] = useState({});

  const config = {
    faculty: {
      title: 'Faculty Portal', subtitle: 'Access your teaching dashboard',
      icon: Users, color: 'blue', gradient: 'from-blue-400 to-indigo-500',
      lightGradient: 'from-blue-50 to-indigo-50'
    },
    student: {
      title: 'Student Portal', subtitle: 'View your schedules and grades',
      icon: GraduationCap, color: 'green', gradient: 'from-emerald-400 to-teal-500',
      lightGradient: 'from-emerald-50 to-teal-50'
    }
  };

  const currentConfig = config[userType];
  const IconComponent = currentConfig.icon;

  const getToggleClasses = (isActive) => {
    const baseClasses = `
      relative z-10 flex-1 py-2 px-4 
      rounded-md text-sm font-medium 
      transition-colors duration-300 ease-in-out
      focus:outline-none
      bg-transparent
    `;
    
    if (isActive) {
      return `${baseClasses} 
        text-white
      `;
    }
    
    return `${baseClasses} 
      text-${currentConfig.color}-600
      hover:text-${currentConfig.color}-700
    `;
  };

  const validateLogin = () => {
    const newErrors = {};
    if (!loginData.email) newErrors.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(loginData.email)) newErrors.email = 'Email is invalid';
    if (!loginData.password) newErrors.password = 'Password is required';
    else if (loginData.password.length < 6) newErrors.password = 'Password must be at least 6 characters';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateRegister = () => {
    const newErrors = {};
    if (!registerData.firstName?.trim()) newErrors.firstName = 'First name is required';
    if (!registerData.lastName?.trim()) newErrors.lastName = 'Last name is required';
    if (!registerData.email) newErrors.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(registerData.email)) newErrors.email = 'Email is invalid';
    
    // Only require ID for students, not faculty
    if (userType === 'student' && !registerData.idNumber?.trim()) {
      newErrors.idNumber = 'Student ID is required';
    }
    
    if (!registerData.password) newErrors.password = 'Password is required';
    else if (registerData.password.length < 6) newErrors.password = 'Password must be at least 6 characters';
    if (!registerData.confirmPassword) newErrors.confirmPassword = 'Please confirm your password';
    else if (registerData.password !== registerData.confirmPassword) newErrors.confirmPassword = 'Passwords do not match';
    
    if (userType === 'student') {
      if (!registerData.course) newErrors.course = 'Course is required';
      if (!registerData.yearLevel) newErrors.yearLevel = 'Year level is required';
      if (!registerData.section?.trim()) newErrors.section = 'Section is required';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    if (!validateLogin()) return;
    setLoading(true);
    try {
      const result = await onLogin(loginData);
      if (result.success) {
        showNotification('Login successful!', 'success');
        setTimeout(() => navigate(userType === 'faculty' ? '/faculty/dashboard' : '/student/dashboard'), 1500);
      } else {
        showNotification(result.error || 'Login failed', 'error');
      }
    } catch (error) {
      showNotification('An error occurred', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    if (!validateRegister()) return;
    setLoading(true);
    try {
      const result = await onRegister(registerData);
      if (result.success) {
        showNotification(result.message, 'success');
        setTimeout(() => {
          setIsLogin(true);
          setRegisterData({
            firstName: '', lastName: '', email: '', password: '', confirmPassword: '',
            ...(userType === 'student' && { idNumber: '', course: '', yearLevel: '', section: '' })
          });
        }, 1500);
      } else {
        showNotification(result.error || 'Registration failed', 'error');
      }
    } catch (error) {
      showNotification('An error occurred', 'error');
    } finally {
      setLoading(false);
    }
  };

  const showNotification = (message, type) => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 5000);
  };

  const handleLoginChange = (e) => {
    const { name, value } = e.target;
    setLoginData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
  };

  const handleRegisterChange = (e) => {
    const { name, value } = e.target;
    setRegisterData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Side - Branding */}
      <div className={`hidden lg:flex lg:w-1/2 bg-gradient-to-br ${currentConfig.gradient} p-12 flex-col justify-between relative overflow-hidden`}>
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
          }}></div>
        </div>

        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-8">
            <div className="bg-white/20 backdrop-blur-sm p-3 rounded-xl">
              <BookOpen className="text-white" size={32} />
            </div>
            <div>
              <h1 className="text-white text-2xl font-bold">Academic Portal</h1>
              <p className="text-white/80 text-sm">University Management System</p>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6">
              <IconComponent className="text-white mb-4" size={48} />
              <h2 className="text-white text-3xl font-bold mb-2">{currentConfig.title}</h2>
              <p className="text-white/90 text-lg">{currentConfig.subtitle}</p>
            </div>

            <div className="space-y-4">
              {['Secure Access', '24/7 Availability', 'Real-time Updates'].map((feature, idx) => (
                <div key={idx} className="flex items-start gap-3">
                  <div className="bg-white/20 p-2 rounded-lg mt-1">
                    <CheckCircle className="text-white" size={20} />
                  </div>
                  <div>
                    <h3 className="text-white font-semibold">{feature}</h3>
                    <p className="text-white/80 text-sm">
                      {idx === 0 && 'Your data is protected with encryption'}
                      {idx === 1 && 'Access your portal anytime, anywhere'}
                      {idx === 2 && 'Stay informed with instant notifications'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="relative z-10">
          <p className="text-white/60 text-sm">© 2025 Academic Portal. All rights reserved.</p>
        </div>
      </div>

      {/* Right Side - Form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-gradient-to-br from-gray-50 to-white">
        <div className="w-full max-w-md">
          {/* Mobile Logo */}
          <div className="lg:hidden flex items-center gap-3 mb-8 justify-center">
            <div className={`bg-gradient-to-br ${currentConfig.gradient} p-3 rounded-xl shadow-lg hover:shadow-xl transition-shadow duration-300`}>
              <BookOpen className="text-white" size={28} />
            </div>
            <div>
              <h1 className={`text-${currentConfig.color}-700 text-xl font-bold`}>Academic Portal</h1>
              <p className={`text-${currentConfig.color}-600 text-sm`}>{currentConfig.title}</p>
            </div>
          </div>

          {/* Notification */}
          {notification && (
            <div className={`mb-6 p-4 rounded-lg flex items-center gap-3 ${
              notification.type === 'success' 
                ? 'bg-green-50 border border-green-200 text-green-800' 
                : 'bg-red-50 border border-red-200 text-red-800'
            }`}>
              {notification.type === 'success' ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
              <span className="text-sm">{notification.message}</span>
            </div>
          )}

          {securityNotice && (
            <div className="mb-6 p-4 rounded-lg border border-blue-200 bg-blue-50 text-blue-900 text-sm flex items-start gap-3">
              <Shield size={18} className="mt-0.5 text-blue-600" />
              <div className="flex-1 leading-relaxed">{securityNotice}</div>
              <button
                type="button"
                onClick={() => setSecurityNotice('')}
                className="text-[10px] font-semibold text-blue-700 hover:text-blue-900"
              >
                DISMISS
              </button>
            </div>
          )}

          {/* Form Card */}
          <div className={`bg-white/95 backdrop-blur-sm rounded-2xl shadow-xl p-8 transition-all duration-300 border border-gray-100 hover:shadow-2xl ${isLogin ? 'scale-100' : 'scale-[1.02]'}`}>
            {/* Toggle Buttons */}
            <div className={`
              flex rounded-lg p-1 mb-6 relative 
              bg-${currentConfig.color}-50/10
              shadow-sm
            `}>
              {/* Sliding background indicator */}
              <div 
                className={`
                  absolute top-1 bottom-1 w-[calc(50%-4px)] 
                  rounded-md transition-all duration-300 ease-in-out
                  bg-gradient-to-r ${currentConfig.gradient}
                  shadow-sm
                `} 
                style={{ 
                  left: isLogin ? '4px' : 'calc(50% + 4px)',
                }}
              />
              <button
                onClick={() => { setIsLogin(true); setErrors({}); }}
                className={getToggleClasses(isLogin)}
              >
                Login
              </button>
              <button
                onClick={() => { setIsLogin(false); setErrors({}); }}
                className={getToggleClasses(!isLogin)}
              >
                Register
              </button>
            </div>

            {/* Forms */}
            <div className="relative">
              {/* Login Form */}
              <div className={`transition-all duration-300 ${isLogin ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-8 absolute inset-0 pointer-events-none'}`}>
                <LoginForm 
                  loginData={loginData}
                  errors={errors}
                  loading={loading}
                  showPassword={showPassword}
                  setShowPassword={setShowPassword}
                  handleChange={handleLoginChange}
                  handleSubmit={handleLoginSubmit}
                  config={currentConfig}
                />
              </div>
              
              {/* Register Form */}
              <div className={`transition-all duration-300 ${!isLogin ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-8 absolute inset-0 pointer-events-none'}`}>
                <RegisterForm
                  registerData={registerData}
                  errors={errors}
                  loading={loading}
                  showPassword={showPassword}
                  showConfirmPassword={showConfirmPassword}
                  setShowPassword={setShowPassword}
                  setShowConfirmPassword={setShowConfirmPassword}
                  handleChange={handleRegisterChange}
                  handleSubmit={handleRegisterSubmit}
                  config={currentConfig}
                  userType={userType}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Login Form Component
function LoginForm({ loginData, errors, loading, showPassword, setShowPassword, handleChange, handleSubmit, config }) {
  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-700 mb-2">Welcome Back!</h2>
        <p className="text-gray-500 text-sm">Enter your credentials to access your account</p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Email Address</label>
        <div className="relative">
          <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="email"
            name="email"
            value={loginData.email}
            onChange={handleChange}
            placeholder="your.email@example.com"
            className={`w-full pl-11 pr-4 py-3 border rounded-lg focus:outline-none focus:ring-2 transition-all duration-200 ${
              errors.email 
                ? 'border-red-400 focus:ring-red-400 bg-red-50' 
                : `border-gray-200 hover:border-${config.color}-400 focus:border-${config.color}-400 focus:ring-${config.color}-400 focus:bg-${config.color}-50/30`
            }`}
          />
        </div>
        {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
          <input
            type={showPassword ? 'text' : 'password'}
            name="password"
            value={loginData.password}
            onChange={handleChange}
            placeholder="Enter your password"
            className={`w-full pl-11 pr-11 py-3 border rounded-lg focus:outline-none focus:ring-2 ${
              errors.password ? 'border-red-500 focus:ring-red-500' : `border-gray-300 focus:ring-${config.color}-500`
            }`}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 bg-transparent hover:text-blue-500 focus:outline-none"
          >
            {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
          </button>
        </div>
        {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password}</p>}
      </div>

      <div className="flex items-center justify-between">
        <label className="flex items-center">
          <input type="checkbox" className="rounded border-gray-300" />
          <span className={`ml-2 text-sm text-${config.color}-600`}>Remember me</span>
        </label>
        <button 
          type="button" 
          className={`text-sm bg-${config.color}-50 px-3 py-1 rounded-md text-${config.color}-600 hover:bg-${config.color}-100 transition-colors`}
        >
          Forgot password?
        </button>
      </div>

      <button
        type="submit"
        disabled={loading}
        className={`w-full bg-gradient-to-r ${config.gradient} text-white py-3 rounded-lg font-medium 
          hover:shadow-lg hover:scale-[1.02] active:scale-[0.98]
          transition-all duration-200 disabled:opacity-50 disabled:hover:scale-100
          flex items-center justify-center gap-2 shadow-md`}
      >
        {loading ? <><Loader className="animate-spin" size={20} />Logging in...</> : 'Login'}
      </button>
    </form>
  );
}

// Register Form Component
function RegisterForm({ registerData, errors, loading, showPassword, showConfirmPassword, setShowPassword, setShowConfirmPassword, handleChange, handleSubmit, config, userType }) {
  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-700 mb-2">Create Account</h2>
        <p className="text-gray-500 text-sm">Fill in your details to get started</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">First Name</label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              name="firstName"
              value={registerData.firstName}
              onChange={handleChange}
              placeholder="John"
              className={`w-full pl-10 pr-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 text-sm ${
                errors.firstName ? 'border-red-500' : 'border-gray-300'
              }`}
            />
          </div>
          {errors.firstName && <p className="text-red-500 text-xs mt-1">{errors.firstName}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Last Name</label>
          <input
            type="text"
            name="lastName"
            value={registerData.lastName}
            onChange={handleChange}
            placeholder="Doe"
            className={`w-full px-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 text-sm ${
              errors.lastName ? 'border-red-500' : 'border-gray-300'
            }`}
          />
          {errors.lastName && <p className="text-red-500 text-xs mt-1">{errors.lastName}</p>}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Email Address</label>
        <div className="relative">
          <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="email"
            name="email"
            value={registerData.email}
            onChange={handleChange}
            placeholder="your.email@example.com"
            className={`w-full pl-10 pr-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 text-sm ${
              errors.email ? 'border-red-500' : 'border-gray-300'
            }`}
          />
        </div>
        {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
      </div>

      {/* Only show ID field for students */}
      {userType === 'student' && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Student ID</label>
          <input
            type="text"
            name="idNumber"
            value={registerData.idNumber}
            onChange={handleChange}
            placeholder="STU-12345"
            className={`w-full px-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 text-sm ${
              errors.idNumber ? 'border-red-500' : 'border-gray-300'
            }`}
          />
          {errors.idNumber && <p className="text-red-500 text-xs mt-1">{errors.idNumber}</p>}
        </div>
      )}

      {userType === 'student' && (
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Course</label>
            <input
              type="text"
              name="course"
              value={registerData.course}
              onChange={handleChange}
              placeholder="BSCS"
              className={`w-full px-4 py-2.5 border rounded-lg text-sm ${errors.course ? 'border-red-500' : 'border-gray-300'}`}
            />
            {errors.course && <p className="text-red-500 text-xs mt-1">{errors.course}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Year</label>
            <select
              name="yearLevel"
              value={registerData.yearLevel}
              onChange={handleChange}
              className={`w-full px-4 py-2.5 border rounded-lg text-sm ${errors.yearLevel ? 'border-red-500' : 'border-gray-300'}`}
            >
              <option value="">Select</option>
              <option value="1st Year">1st</option>
              <option value="2nd Year">2nd</option>
              <option value="3rd Year">3rd</option>
              <option value="4th Year">4th</option>
            </select>
            {errors.yearLevel && <p className="text-red-500 text-xs mt-1">{errors.yearLevel}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Section</label>
            <input
              type="text"
              name="section"
              value={registerData.section}
              onChange={handleChange}
              placeholder="A"
              className={`w-full px-4 py-2.5 border rounded-lg text-sm ${errors.section ? 'border-red-500' : 'border-gray-300'}`}
            />
            {errors.section && <p className="text-red-500 text-xs mt-1">{errors.section}</p>}
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
            <input
              type={showPassword ? 'text' : 'password'}
              name="password"
              value={registerData.password}
              onChange={handleChange}
              placeholder="••••••"
              className={`w-full pl-10 pr-10 py-2.5 border rounded-lg text-sm ${errors.password ? 'border-red-500' : 'border-gray-300'}`}
            />
            <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 bg-transparent hover:text-blue-500 focus:outline-none">
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Confirm</label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
            <input
              type={showConfirmPassword ? 'text' : 'password'}
              name="confirmPassword"
              value={registerData.confirmPassword}
              onChange={handleChange}
              placeholder="••••••"
              className={`w-full pl-10 pr-10 py-2.5 border rounded-lg text-sm ${errors.confirmPassword ? 'border-red-500' : 'border-gray-300'}`}
            />
            <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 bg-transparent hover:text-blue-500 focus:outline-none">
              {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          {errors.confirmPassword && <p className="text-red-500 text-xs mt-1">{errors.confirmPassword}</p>}
        </div>
      </div>

      <div className="flex items-start">
        <input type="checkbox" className="mt-1 rounded border-gray-300" required />
        <span className="ml-2 text-xs text-gray-600">
              <button 
                type="button" 
                className={`bg-${config.color}-50 px-2 py-0.5 rounded text-${config.color}-600 
                  hover:bg-${config.color}-100 transition-colors focus:outline-none 
                  focus:ring-2 focus:ring-${config.color}-200`}
              >
                Terms
              </button>
              {" "} and {" "}
              <button 
                type="button" 
                className={`bg-${config.color}-50 px-2 py-0.5 rounded text-${config.color}-600 
                  hover:bg-${config.color}-100 transition-colors focus:outline-none 
                  focus:ring-2 focus:ring-${config.color}-200`}
              >
                Privacy Policy
              </button>
        </span>
      </div>

      <button
        type="submit"
        disabled={loading}
        className={`w-full bg-gradient-to-r ${config.gradient} text-white py-3 rounded-lg font-medium 
          hover:shadow-lg hover:scale-[1.02] active:scale-[0.98]
          transition-all duration-200 disabled:opacity-50 disabled:hover:scale-100
          flex items-center justify-center gap-2 shadow-md`}
      >
        {loading ? <><Loader className="animate-spin" size={20} />Creating account...</> : 'Create Account'}
      </button>
    </form>
  );
}

export default FacultiesStudentsLoginRegister;
