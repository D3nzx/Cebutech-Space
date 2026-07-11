import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabaseClient';
import { saveRoleSession, getRoleSession, clearRoleSession } from '../../lib/multiSessionManager';
import StudentSidebar from '../../components/Student/StudentDashboard/StudentSidebar';
import StudentHeader from '../../components/Student/StudentDashboard/StudentHeader';
import StudentDashboardContent from '../../components/Student/StudentDashboard/StudentDashboardContent';
import StudentSchedule from '../../components/Student/StudentDashboard/StudentSchedule';
import StudentSettings from '../../components/Student/StudentDashboard/StudentSettings';
import { signOut, signOutByRole } from '../../api/auth';
import LoadingScreen from '../../components/LoadingScreen';

function StudentDashboard() {
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isHoveringSidebar, setIsHoveringSidebar] = useState(false);
  const [isSidebarLocked, setIsSidebarLocked] = useState(() => {
    const savedState = localStorage.getItem('studentSidebarLocked');
    return savedState !== null ? JSON.parse(savedState) : true;
  });
  const [activeSection, setActiveSection] = useState(() => {
    const savedSection = localStorage.getItem('studentActiveSection');
    return savedSection || 'dashboard';
  });
  const [studentData, setStudentData] = useState(null);
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authModalMessage, setAuthModalMessage] = useState('');
  const [showAccessRestrictedModal, setShowAccessRestrictedModal] = useState(false);
  const [accessRestrictedMessage, setAccessRestrictedMessage] = useState('');
  const [showScrollbar, setShowScrollbar] = useState(false);
  const scrollbarTimeoutRef = React.useRef(null);

  
  const handleScrollbarVisibility = useCallback(() => {
    setShowScrollbar(true);
    
    if (scrollbarTimeoutRef.current) {
      clearTimeout(scrollbarTimeoutRef.current);
    }
    
    scrollbarTimeoutRef.current = setTimeout(() => {
      setShowScrollbar(false);
    }, 5000);
  }, []);

  
  useEffect(() => {
    return () => {
      if (scrollbarTimeoutRef.current) {
        clearTimeout(scrollbarTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (activeSection) {
      localStorage.setItem('studentActiveSection', activeSection);
    }
  }, [activeSection]);

  useEffect(() => {
    localStorage.setItem('studentSidebarLocked', JSON.stringify(isSidebarLocked));
  }, [isSidebarLocked]);

  useEffect(() => {
    if (window.innerWidth < 768) return;
    if (isSidebarLocked) return;
    
    if (isHoveringSidebar && isSidebarCollapsed) {
      setIsSidebarCollapsed(false);
    } else if (!isHoveringSidebar && !isSidebarCollapsed) {
      const timer = setTimeout(() => {
        setIsSidebarCollapsed(true);
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [isHoveringSidebar, isSidebarCollapsed, isSidebarLocked]);

  useEffect(() => {
    if (isSidebarLocked && isSidebarCollapsed) {
      setIsSidebarCollapsed(false);
    }
  }, [isSidebarLocked]);

  const handleToggleCollapse = () => {
    setIsSidebarCollapsed(!isSidebarCollapsed);
    setIsSidebarLocked(!isSidebarLocked);
  };

  useEffect(() => {
    let subscription;
    let studentChannel;
    let pollingInterval;

    const handleSecurityEvent = (message) => {
      sessionStorage.setItem(
        'authSecurityNotice',
        JSON.stringify({ message, target: 'student', timestamp: Date.now() })
      );
      setAuthModalMessage(message);
      setShowAuthModal(true);
      setStudentData(null);
      setUser(null);
      sessionStorage.removeItem('studentData');
      sessionStorage.removeItem('userType');
    };

    const checkAuth = async () => {
      try {
        const hasStoredAuth = 
          localStorage.getItem('isAuthenticated') === 'true' ||
          sessionStorage.getItem('isAuthenticated') === 'true';
        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession();

        if (sessionError || !session) {
          if (!hasStoredAuth) {
            setIsLoading(false);
            navigate('/student');
            return;
          }
        } else {
          localStorage.setItem('isAuthenticated', 'true');
          sessionStorage.setItem('isAuthenticated', 'true');
        }

        const { data: { user: currentUser }, error: userError } = await supabase.auth.getUser();
        if (userError || !currentUser) {
          localStorage.removeItem('isAuthenticated');
          sessionStorage.removeItem('isAuthenticated');
          setIsLoading(false);
          navigate('/student');
          return;
        }

        try {
          console.log('🔍 Validating Student access for user:', currentUser.email);
          const { data: student, error: studentError } = await supabase
            .from('students')
            .select('id, student_id')
            .eq('email', currentUser.email)
            .single();

          console.log('📊 Query result:', { data: student, error: studentError });

          if (studentError) {
            if (studentError.code === 'PGRST116') {
              console.warn('❌ Student record not found (PGRST116)');
              localStorage.removeItem('isAuthenticated');
              sessionStorage.removeItem('isAuthenticated');
              setIsLoading(false);
              setUser(null);
              navigate('/student', { replace: true });
              return;
            } else {
              console.warn('⚠️ Error querying student record (but allowing access):', studentError.message);
              console.log('ℹ️ Proceeding with session restoration...');
            }
          }

          if (student && !student.student_id) {
            console.warn('❌ Student record missing student_id. Redirecting to login.');
            localStorage.removeItem('isAuthenticated');
            sessionStorage.removeItem('isAuthenticated');
            setIsLoading(false);
            setUser(null);
            navigate('/student', { replace: true });
            return;
          }

          console.log('✅ Student access validated. Fetching full profile...');
        } catch (fetchError) {
          console.error('Error validating student access:', fetchError);
          localStorage.removeItem('isAuthenticated');
          sessionStorage.removeItem('isAuthenticated');
          setIsLoading(false);
          setUser(null);
          navigate('/student', { replace: true });
          return;
        }
          
        const { data: fullStudentData, error: fullStudentError } = await supabase
          .from('students')
          .select('*')
          .eq('email', currentUser.email)
          .single();

        if (fullStudentData) {
          setStudentData(fullStudentData);
          
          // Check if student account is active - show modal but keep them logged in
          if (fullStudentData.is_active !== true) {
            console.warn('❌ Student account is inactive or pending approval');
            setAccessRestrictedMessage('Your account is inactive or pending approval. Please contact the administration for assistance.');
            setShowAccessRestrictedModal(true);
          }
        } else if (fullStudentError) {
          const errorCode = fullStudentError.code;
          console.warn(`Student record not found (code: ${errorCode}), continuing without it`);
          setStudentData(null);
        } else {
          setStudentData(null);
        }

        setUser(currentUser);
        
        saveRoleSession('student', {
          email: currentUser.email,
          id: currentUser.id,
          loginTime: Date.now()
        });
        
        setIsLoading(false);

        try {
          studentChannel = supabase
            .channel(`student_changes_${currentUser.id}_${Date.now()}`)
            .on(
              'postgres_changes',
              {
                event: '*',
                schema: 'public',
                table: 'students',
                filter: `email=eq.${currentUser.email}`
              },
              async (payload) => {
                console.log('🔄 Student data changed via real-time:', payload);
                
                if (payload.eventType === 'DELETE') {
                  console.log('⚠️ Student record was deleted');
                  setStudentData(null);
                  window.dispatchEvent(new CustomEvent('studentDataUpdated', { 
                    detail: { data: null, eventType: 'DELETE' } 
                  }));
                  return;
                }
                
                try {
                  const { data: { user: refreshUser } } = await supabase.auth.getUser();
                  
                  if (refreshUser) {
                    const { data: student, error } = await supabase
                      .from('students')
                      .select('*')
                      .eq('email', refreshUser.email)
                      .single();
                    
                    if (!error && student) {
                      console.log('✅ Student data refreshed:', student);
                      
                      // Check if account was disabled
                      if (student.is_active !== true) {
                        console.warn('❌ Student account is inactive or pending approval via real-time update');
                        setAccessRestrictedMessage('Your account is inactive or pending approval. Please contact the administration for assistance.');
                        setShowAccessRestrictedModal(true);
                        return;
                      }
                      
                      setStudentData(student);
                      
                      window.dispatchEvent(new CustomEvent('studentDataUpdated', { 
                        detail: { 
                          data: student, 
                          eventType: payload.eventType,
                          gender: student.gender 
                        } 
                      }));
                      
                      window.dispatchEvent(new CustomEvent('studentProfileUpdated', { 
                        detail: { gender: student.gender } 
                      }));
                    } else if (error && error.code === 'PGRST116') {
                      console.log('⚠️ Student record not found after update');
                      setStudentData(null);
                      window.dispatchEvent(new CustomEvent('studentDataUpdated', { 
                        detail: { data: null, eventType: 'DELETE' } 
                      }));
                    }
                  }
                } catch (error) {
                  console.error('❌ Error refreshing student data:', error);
                }
              }
            )
            .subscribe((status) => {
              console.log('📡 Student subscription status:', status);
              if (status === 'SUBSCRIBED') {
                console.log('✅ Real-time subscription active for student changes');
              } else if (status === 'CHANNEL_ERROR') {
                console.error('❌ Real-time subscription error');
                console.log('🔄 Will use polling fallback...');
              }
            });

          console.log('🔄 Starting polling interval for Student');
          pollingInterval = setInterval(async () => {
            try {
              if (currentUser) {
                const { data: student, error } = await supabase
                  .from('students')
                  .select('*')
                  .eq('email', currentUser.email)
                  .single();
                
                if (!error && student) {
                  
                  if (student.is_active === false) {
                    console.warn('❌ Student account is disabled via polling');
                    setAccessRestrictedMessage('Your account has been disabled. Please contact the administration for assistance.');
                    setShowAccessRestrictedModal(true);
                    return;
                  }
                  
                  setStudentData(prev => {
                    if (prev && JSON.stringify(prev) !== JSON.stringify(student)) {
                      console.log('📊 Student data changed via polling');
                      window.dispatchEvent(new CustomEvent('studentDataUpdated', { 
                        detail: { 
                          data: student, 
                          eventType: 'UPDATE',
                          gender: student.gender 
                        } 
                      }));
                      return student;
                    }
                    return prev || student;
                  });
                }
              }
            } catch (error) {
              console.error('Error in polling:', error);
            }
          }, 15000);
        } catch (error) {
          console.error('❌ Error setting up real-time subscription:', error);
        }
      } catch (error) {
        console.error('Auth check error:', error);
        localStorage.removeItem('isAuthenticated');
        sessionStorage.removeItem('isAuthenticated');
        setUser(null);
        setStudentData(null);
        setIsLoading(false);
        navigate('/student');
      }
    };

    checkAuth();

    return () => {
      console.log('🧹 Cleaning up Student Dashboard - clearing polling interval:', pollingInterval);
      if (studentChannel) {
        supabase.removeChannel(studentChannel);
      }
      if (pollingInterval) {
        clearInterval(pollingInterval);
        console.log('✅ Polling interval cleared');
      }
    };
  }, [navigate]);

  
  useEffect(() => {
    if (!user) return; 

    const handleSecurityEvent = (message) => {
      sessionStorage.setItem(
        'authSecurityNotice',
        JSON.stringify({ message, target: 'student', timestamp: Date.now() })
      );
      setAuthModalMessage(message);
      setShowAuthModal(true);
      setStudentData(null);
      setUser(null);
      sessionStorage.removeItem('studentData');
      sessionStorage.removeItem('userType');
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      
      if (session && user && session.user.id !== user.id) {
        console.log('🔒 Ignoring auth event for different user');
        return;
      }
      
      
      if (sessionStorage.getItem('_roleSignOut_faculty') || 
          sessionStorage.getItem('_roleSignOut_programhead') || 
          sessionStorage.getItem('_roleSignOut_admin')) {
        console.log('🔒 Ignoring logout event from different role');
        return;
      }
      
      if (event === 'SIGNED_OUT') {
        
        if (!session && user) {
          console.log('🚪 Student signed out');
          clearRoleSession('student');
          navigate('/student', { replace: true });
        }
      } else if (event === 'USER_DELETED') {
     
        if (user) {
          console.log('❌ Student account deleted');
          const securityMessage =
            'Security Notice: Your student account has been deleted. Please contact the administrator if this action was unexpected.';
          handleSecurityEvent(securityMessage);
        }
      }
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, [user, navigate]);

  useEffect(() => {
    document.title = 'CTU Portal | Student Dashboard';
  }, []);

  const handleSectionChange = (section) => {
    setActiveSection(section);
    setIsSidebarOpen(false);
  };

  const handleAccountSettings = () => {
    setActiveSection('settings');
    setIsSidebarOpen(false);
  };

  const handleStudentDataSaved = (updatedStudentData) => {
    setStudentData(updatedStudentData);
  };

  const handleLogout = async () => {
    await signOutByRole('student');
    localStorage.removeItem('studentActiveSection');
    sessionStorage.removeItem('isAuthenticated');
    clearRoleSession('student');
    navigate('/student', { replace: true });
  };

  const renderContent = () => {
    switch (activeSection) {
      case "dashboard":
        return <StudentDashboardContent studentData={studentData || null} onSectionChange={handleSectionChange} />;
      case "schedule":
        return <StudentSchedule studentData={studentData || null} />;
      case "settings":
        return <StudentSettings user={user} studentData={studentData || null} onDataSaved={handleStudentDataSaved} />;
      default:
        return <StudentDashboardContent studentData={studentData || null} onSectionChange={handleSectionChange} />;
    }
  };

  if (isLoading) {
    return <LoadingScreen variant="student" />;
  }

  if (showAccessRestrictedModal) {
    return (
      <div className="flex h-screen bg-slate-50 font-sans">
        <div className="fixed inset-0 flex items-center justify-center bg-black/70 z-50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full text-center transform transition-all">
            <div className="flex flex-col items-center mb-6">
              <div className="w-16 h-16 rounded-full bg-red-50 border-2 border-red-200 flex items-center justify-center mb-4 animate-pulse">
                <span className="text-3xl">⚠️</span>
              </div>
              <h2 className="text-3xl font-bold text-red-600">Access Restricted</h2>
            </div>
            <p className="text-slate-600 mb-8 text-sm leading-relaxed">{accessRestrictedMessage}</p>
            <button
              onClick={() => { setShowAccessRestrictedModal(false); navigate('/student', { replace: true }); }}
              className="w-full px-6 py-3 bg-[rgb(66_133_244_/_1)] text-white rounded-xl font-semibold hover:shadow-lg hover:scale-105 transition-all duration-200"
            >
              Return to Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (showAuthModal) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-black/70 z-50">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full text-center border-t-4 border-red-500">
          <div className="flex flex-col items-center mb-4">
            <div className="w-14 h-14 rounded-full bg-red-50 border-2 border-red-200 flex items-center justify-center mb-3">
              <span className="text-2xl">⚠️</span>
            </div>
            <h2 className="text-2xl font-bold text-red-700">Session Expired</h2>
          </div>
          <p className="text-slate-600 mb-6 text-sm leading-relaxed">{authModalMessage}</p>
          <button
            onClick={() => { setShowAuthModal(false); navigate('/student', { replace: true }); }}
            className="w-full px-6 py-3 bg-gradient-to-r from-red-500 to-orange-500 text-white rounded-xl font-semibold hover:shadow-lg transition-all"
          >
            Return to Login
          </button>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="flex h-screen bg-slate-50 font-sans">
      <aside
        onMouseEnter={() => setIsHoveringSidebar(true)}
        onMouseLeave={() => setIsHoveringSidebar(false)}
        className={`fixed md:relative inset-y-0 left-0 z-40 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-white shadow-2xl transform transition-all duration-300 ease-in-out md:translate-x-0 ${
          isSidebarOpen ? "translate-x-0" : "-translate-x-full"
        } ${
          isSidebarCollapsed ? "md:w-20" : "md:w-64"
        } w-64`}
      >
        <StudentSidebar 
          isOpen={isSidebarOpen} 
          isCollapsed={isSidebarCollapsed}
          onClose={() => setIsSidebarOpen(false)} 
          activeSection={activeSection} 
          onSectionChange={handleSectionChange} 
          isMobile={false} 
          studentData={studentData || null}
          user={user}
        />
      </aside>

      <div className="flex-1 flex flex-col overflow-hidden transition-all duration-300">
        <header className="bg-white border-b border-slate-200 shadow-sm sticky top-0 z-30">
          <StudentHeader
            onMenuClick={() => setIsSidebarOpen(!isSidebarOpen)}
            user={user}
            studentData={studentData || null}
            onAccountSettings={handleAccountSettings}
            onLogout={handleLogout}
            isSidebarCollapsed={isSidebarCollapsed}
            isSidebarLocked={isSidebarLocked}
            onToggleSidebar={handleToggleCollapse}
          />
        </header>

        <main 
          className="flex-1 overflow-x-hidden overflow-y-auto bg-slate-50"
          onScroll={handleScrollbarVisibility}
          style={{
            scrollbarWidth: showScrollbar ? 'auto' : 'none',
            msOverflowStyle: showScrollbar ? 'auto' : 'none',
          }}
        >
          <style>{`
            main::-webkit-scrollbar {
              width: 8px;
            }
            main::-webkit-scrollbar-track {
              background: transparent;
            }
            main::-webkit-scrollbar-thumb {
              background: ${showScrollbar ? '#cbd5e1' : 'transparent'};
              border-radius: 4px;
              transition: background 0.3s ease;
            }
            main::-webkit-scrollbar-thumb:hover {
              background: #94a3b8;
            }
          `}</style>
          <div className="p-6 md:p-8">{renderContent()}</div>
        </main>
      </div>

      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        ></div>
      )}
    </div>
  );
}

export default StudentDashboard;
