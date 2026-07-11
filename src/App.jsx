import { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute/ProtectedRoute';
import ErrorBoundary from './components/ErrorBoundary/ErrorBoundary';

const LoginUIAdmin = lazy(() => import('./pages/Administrator/LoginUIAdmin'));
const DashboardUIAdmin = lazy(() => import('./pages/Administrator/DashboardUIAdmin'));
const Login = lazy(() => import('./pages/ProgramHead/Login'));
const DashboardPage = lazy(() => import('./pages/ProgramHead/DashboardPage'));
const AuthCallback = lazy(() => import('./pages/ProgramHead/AuthCallback'));
const RegistrationSuccess = lazy(() => import('./pages/ProgramHead/RegistrationSuccess'));
const Register = lazy(() => import('./pages/ProgramHead/Register'));
const ResetPassword = lazy(() => import('./components/ProgramHead/ProgramHeadLogin/ResetPassword'));
const DeanLogin = lazy(() => import('./pages/Dean/Login'));
const DeanRegister = lazy(() => import('./pages/Dean/Register'));
const DeanDashboardPage = lazy(() => import('./pages/Dean/DashboardPage'));
const DeanRegistrationSuccess = lazy(() => import('./pages/Dean/RegistrationSuccess'));
const CampusDirectorLogin = lazy(() => import('./pages/CampusDirector/Login'));
const CampusDirectorRegister = lazy(() => import('./pages/CampusDirector/Register'));
const CampusDirectorDashboardPage = lazy(() => import('./pages/CampusDirector/DashboardPage'));
const CampusDirectorRegistrationSuccess = lazy(() => import('./pages/CampusDirector/RegistrationSuccess'));
const FacultyDashboard = lazy(() => import('./pages/Faculty/FacultyDashboard'));
const FacultyLogin = lazy(() => import('./pages/Faculty/FacultyLogin'));
const FacultyRegister = lazy(() => import('./pages/Faculty/FacultyRegister'));
const StudentLogin = lazy(() => import('./pages/Student/StudentLogin'));
const StudentRegister = lazy(() => import('./pages/Student/StudentRegister'));
const StudentDashboard = lazy(() => import('./pages/Student/StudentDashboard'));
const CampusDirectorAuthCallback = lazy(() => import('./pages/CampusDirector/AuthCallback'));

const LoadingFallback = () => (
  <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-600">
    Loading...
  </div>
);

function App() {
  return (
    <BrowserRouter>
      <ErrorBoundary>
        <Suspense fallback={<LoadingFallback />}>
          <Routes>
          {/* Default route - redirect to Program Head login */}
          <Route path="/" element={<Navigate to="/programhead/login" replace />} />

          {/* Email Confirmation routes - MUST be BEFORE other routes */}
          {/* This is the redirect URL that Supabase will use after email confirmation */}
          <Route path="/auth/callback" element={<AuthCallback />} />

          {/* Also catch the programhead confirm-email route if needed */}
          <Route path="/programhead/confirm-email" element={<AuthCallback />} />

          {/* Registration Success route - shown after email confirmation */}
          <Route path="/programhead/registration-success" element={<RegistrationSuccess />} />
          <Route path="/dean/registration-success" element={<DeanRegistrationSuccess />} />

          {/* Admin Routes */}
          <Route path="/admin/login" element={<LoginUIAdmin />} />
          <Route path="/admin/dashboard" element={<DashboardUIAdmin />} />
          <Route path="/admin/selection" element={<Navigate to="/programhead/login" replace />} />
          <Route path="/admin" element={<Navigate to="/admin/login" replace />} />

          {/* Program Head Routes */}
          <Route path="/programhead/login" element={<Login />} />
          <Route path="/programhead/register" element={<Register />} />
          <Route path="/programhead/reset-password" element={<ResetPassword />} />
          <Route
            path="/programhead/dashboard"
            element={
              <ProtectedRoute>
                <DashboardPage />
              </ProtectedRoute>
            }
          />
          <Route path="/programhead" element={<Navigate to="/programhead/login" replace />} />
          <Route path="/Program_Head/Login" element={<Navigate to="/programhead/login" replace />} />
          <Route path="/register" element={<Navigate to="/programhead/register" replace />} />
          <Route path="/reset-password" element={<Navigate to="/programhead/reset-password" replace />} />
          <Route path="/dashboard" element={<Navigate to="/programhead/dashboard" replace />} />

          {/* Dean Routes */}
          <Route path="/dean/login" element={<DeanLogin />} />
          <Route path="/dean/register" element={<DeanRegister />} />
          <Route
            path="/dean/dashboard"
            element={
              <ProtectedRoute redirectTo="/dean/login">
                <DeanDashboardPage />
              </ProtectedRoute>
            }
          />
          <Route path="/dean" element={<Navigate to="/dean/login" replace />} />

          {/* Campus Director Routes */}
          <Route path="/campusdirector/login" element={<CampusDirectorLogin />} />
          <Route path="/campusdirector/register" element={<CampusDirectorRegister />} />
          <Route path="/campusdirector/registration-success" element={<CampusDirectorRegistrationSuccess />} />
          <Route
            path="/campusdirector/dashboard"
            element={
              <ProtectedRoute redirectTo="/campusdirector/login">
                <CampusDirectorDashboardPage />
              </ProtectedRoute>
            }
          />
          <Route path="/campusdirector" element={<Navigate to="/campusdirector/login" replace />} />

          {/* Faculty Routes */}
          <Route path="/faculty/login" element={<FacultyLogin />} />
          <Route path="/faculty/register" element={<FacultyRegister />} />
          <Route path="/faculty" element={<Navigate to="/faculty/login" replace />} />
          <Route path="/faculty/dashboard" element={<FacultyDashboard />} />

          {/* Student Routes */}
          <Route path="/student/login" element={<StudentLogin />} />
          <Route path="/student/register" element={<StudentRegister />} />
          <Route path="/student" element={<Navigate to="/student/login" replace />} />
          <Route path="/student/dashboard" element={<StudentDashboard />} />

          {/* Campus Director Auth Callback */}
          <Route path="/campusdirector/auth/callback" element={<CampusDirectorAuthCallback />} />
        </Routes>
        </Suspense>
      </ErrorBoundary>
    </BrowserRouter>
  );
}

export default App;