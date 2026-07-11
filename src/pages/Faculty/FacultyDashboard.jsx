import React, { Suspense, lazy, useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabaseClient';
import { saveRoleSession, getRoleSession, clearRoleSession } from '../../lib/multiSessionManager';
import FacultySidebar from '../../components/Faculty/FacultyDashboard/FacultySidebar';
import FacultyHeader from '../../components/Faculty/FacultyDashboard/FacultyHeader';
import { signOut, signOutByRole } from '../../api/auth';
import LoadingScreen from '../../components/LoadingScreen';

const FacultyDashboardContent = lazy(() => import('../../components/Faculty/FacultyDashboard/FacultyDashboardContent'));
const FacultySchedule = lazy(() => import('../../components/Faculty/FacultyDashboard/FacultySchedule'));
const FacultySettings = lazy(() => import('../../components/Faculty/FacultyDashboard/FacultySettings'));

function FacultyDashboard() {
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isHoveringSidebar, setIsHoveringSidebar] = useState(false);
  const [isSidebarLocked, setIsSidebarLocked] = useState(() => {
    const savedState = localStorage.getItem('facultySidebarLocked');
   
    return savedState !== null ? JSON.parse(savedState) : true;
  });
  const [activeSection, setActiveSection] = useState(() => {
    const savedSection = localStorage.getItem('facultyActiveSection');
    return savedSection || 'dashboard';
  });
  const [facultyData, setFacultyData] = useState(null);
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authModalMessage, setAuthModalMessage] = useState('');
  const [showAccessRestrictedModal, setShowAccessRestrictedModal] = useState(false);
  const [accessRestrictedMessage, setAccessRestrictedMessage] = useState('');
  const [scheduleIdToApprove, setScheduleIdToApprove] = useState(null);
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
      localStorage.setItem('facultyActiveSection', activeSection);
    }
  }, [activeSection]);

  useEffect(() => {
    localStorage.setItem('facultySidebarLocked', JSON.stringify(isSidebarLocked));
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
    let facultyChannel;
    let pollingInterval;

    const handleSecurityEvent = (message) => {
      sessionStorage.setItem(
        'authSecurityNotice',
        JSON.stringify({ message, target: 'faculty', timestamp: Date.now() })
      );
      setAuthModalMessage(message);
      setShowAuthModal(true);
      setFacultyData(null);
      setUser(null);
      sessionStorage.removeItem('facultyData');
      sessionStorage.removeItem('userType');
    };

    const checkAuth = async () => {
      try {
        
        const hasStoredAuth = 
          localStorage.getItem('isAuthenticated') === 'true' ||
          sessionStorage.getItem('isAuthenticated') === 'true';
        
        
        let { data: { user: currentUser }, error: userError } = await supabase.auth.getUser();
        
        
        if (!currentUser && hasStoredAuth) {
          console.log('⏳ Session not ready yet, waiting for restoration...');
          const { getCurrentUserWithRetry, restoreSessionFromStorage } = await import('../../lib/supabaseClient');
          
         
          const session = await restoreSessionFromStorage();
          
          
          const result = await getCurrentUserWithRetry();
          currentUser = result.user;
          userError = result.error;
        }
        
        
        if (currentUser && !userError) {
          localStorage.setItem('isAuthenticated', 'true');
          sessionStorage.setItem('isAuthenticated', 'true');
        } else {
          
          if (!hasStoredAuth) {
            setIsLoading(false);
            navigate('/faculty');
            return;
          }
          
          
          localStorage.removeItem('isAuthenticated');
          sessionStorage.removeItem('isAuthenticated');
          setIsLoading(false);
          navigate('/faculty');
          return;
        }
        try {
          console.log('🔍 Validating Faculty access for user:', currentUser.email);
          const { data: faculty, error: facultyError } = await supabase
            .from('faculty')
            .select('id, id_no')
            .eq('email', currentUser.email)
            .single();

          console.log('📊 Query result:', { data: faculty, error: facultyError });

          if (facultyError) {
            if (facultyError.code === 'PGRST116') {
              console.warn('❌ Faculty record not found (PGRST116)');
              localStorage.removeItem('isAuthenticated');
              sessionStorage.removeItem('isAuthenticated');
              setIsLoading(false);
              setUser(null);
              navigate('/faculty', { replace: true });
              return;
            } else {
              console.warn('⚠️ Error querying faculty record (but allowing access):', facultyError.message);
              console.log('ℹ️ Proceeding with session restoration...');
            }
          }

          if (faculty && !faculty.id_no) {
            console.warn('❌ Faculty record missing id_no. Redirecting to login.');
            localStorage.removeItem('isAuthenticated');
            sessionStorage.removeItem('isAuthenticated');
            setIsLoading(false);
            setUser(null);
            navigate('/faculty', { replace: true });
            return;
          }

          console.log('✅ Faculty access validated. Fetching full profile...');
        } catch (fetchError) {
          console.error('Error validating faculty access:', fetchError);
          localStorage.removeItem('isAuthenticated');
          sessionStorage.removeItem('isAuthenticated');
          setIsLoading(false);
          setUser(null);
          navigate('/faculty', { replace: true });
          return;
        }
          
        const { data: fullFacultyData, error: fullFacultyError } = await supabase
          .from('faculty')
          .select('*')
          .eq('email', currentUser.email)
          .single();

        if (fullFacultyData) {
          setFacultyData(fullFacultyData);
          
          
          if (fullFacultyData.is_active !== true) {
            console.warn('❌ Faculty account is inactive or pending approval');
            setAccessRestrictedMessage('Your account is inactive or pending approval. Please contact the administration for assistance.');
            setShowAccessRestrictedModal(true);
          }
        } else if (fullFacultyError) {
          const errorCode = fullFacultyError.code;
          console.warn(`Faculty record not found (code: ${errorCode}), continuing without it`);
          setFacultyData(null);
        } else {
          setFacultyData(null);
        }

        setUser(currentUser);
        
        saveRoleSession('faculty', {
          email: currentUser.email,
          id: currentUser.id,
          loginTime: Date.now()
        });
        
        setIsLoading(false);

        try {
          facultyChannel = supabase
            .channel(`faculty_changes_${currentUser.id}_${Date.now()}`)
            .on(
              'postgres_changes',
              {
                event: '*',
                schema: 'public',
                table: 'faculty',
                filter: `email=eq.${currentUser.email}`
              },
              async (payload) => {
                console.log('🔄 Faculty data changed via real-time:', payload);
                
                if (payload.eventType === 'DELETE') {
                  console.log('⚠️ Faculty record was deleted');
                  setFacultyData(null);
                  window.dispatchEvent(new CustomEvent('facultyDataUpdated', { 
                    detail: { data: null, eventType: 'DELETE' } 
                  }));
                  return;
                }
                
                try {
                  const { data: { user: refreshUser } } = await supabase.auth.getUser();
                  
                  const isAdmin = refreshUser?.email === 'dev-team@ctu.com';
                  
                  if (refreshUser) {
                    const { data: faculty, error } = await supabase
                      .from('faculty')
                      .select('*')
                      .eq('email', refreshUser.email)
                      .single();
                    
                    if (!error && faculty) {
                      console.log('✅ Faculty data refreshed:', faculty);
                      
                      if (faculty.is_active !== true) {
                        console.warn('❌ Faculty account is inactive or pending approval via real-time update');
                        setAccessRestrictedMessage('Your account is inactive or pending approval. Please contact the administration for assistance.');
                        setShowAccessRestrictedModal(true);
                        return;
                      }
                      
                      setFacultyData(faculty);
                      
                      window.dispatchEvent(new CustomEvent('facultyDataUpdated', { 
                        detail: { 
                          data: faculty, 
                          eventType: payload.eventType,
                          gender: faculty.gender 
                        } 
                      }));
                      
                      window.dispatchEvent(new CustomEvent('facultyProfileUpdated', { 
                        detail: { gender: faculty.gender } 
                      }));
                    } else if (error && error.code === 'PGRST116') {
                      console.log('⚠️ Faculty record not found after update');
                      setFacultyData(null);
                      window.dispatchEvent(new CustomEvent('facultyDataUpdated', { 
                        detail: { data: null, eventType: 'DELETE' } 
                      }));
                    }
                  }
                } catch (error) {
                  console.error('❌ Error refreshing faculty data:', error);
                }
              }
            )
            .subscribe((status) => {
              console.log('📡 Faculty subscription status:', status);
              if (status === 'SUBSCRIBED') {
                console.log('✅ Real-time subscription active for faculty changes');
              } else if (status === 'CHANNEL_ERROR') {
                console.error('❌ Real-time subscription error');
                console.log('🔄 Will use polling fallback...');
              }
            });

          console.log('🔄 Starting polling interval for Faculty');
          pollingInterval = setInterval(async () => {
            try {
              if (currentUser) {
                const { data: faculty, error } = await supabase
                  .from('faculty')
                  .select('*')
                  .eq('email', currentUser.email)
                  .single();
                
                if (!error && faculty) {
                 
                  if (faculty.is_active === false) {
                    console.warn('❌ Faculty account is disabled via polling');
                    setAccessRestrictedMessage('Your account has been disabled. Please contact the administration for assistance.');
                    setShowAccessRestrictedModal(true);
                    return;
                  }
                  
                  setFacultyData(prev => {
                    if (prev && JSON.stringify(prev) !== JSON.stringify(faculty)) {
                      console.log('📊 Faculty data changed via polling');
                      window.dispatchEvent(new CustomEvent('facultyDataUpdated', { 
                        detail: { 
                          data: faculty, 
                          eventType: 'UPDATE',
                          gender: faculty.gender 
                        } 
                      }));
                      return faculty;
                    }
                    return prev || faculty;
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
        setFacultyData(null);
        setIsLoading(false);
        navigate('/faculty');
      }
    };

    checkAuth();

    return () => {
      console.log('🧹 Cleaning up Faculty Dashboard - clearing polling interval:', pollingInterval);
      if (facultyChannel) {
        supabase.removeChannel(facultyChannel);
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
        JSON.stringify({ message, target: 'faculty', timestamp: Date.now() })
      );
      setAuthModalMessage(message);
      setShowAuthModal(true);
      setFacultyData(null);
      setUser(null);
      sessionStorage.removeItem('facultyData');
      sessionStorage.removeItem('userType');
    };

    
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
     
      if (session && user && session.user.id !== user.id) {
        console.log('🔒 Ignoring auth event for different user');
        return;
      }
      
     
      if (sessionStorage.getItem('_roleSignOut_programhead') || 
          sessionStorage.getItem('_roleSignOut_admin') || 
          sessionStorage.getItem('_roleSignOut_student')) {
        console.log('🔒 Ignoring logout event from different role');
        return;
      }
      
      if (event === 'SIGNED_OUT') {
       
        if (!session && user) {
          console.log('🚪 Faculty signed out');
          clearRoleSession('faculty');
          navigate('/faculty', { replace: true });
        }
      } else if (event === 'USER_DELETED') {
        
        if (user) {
          console.log('❌ Faculty account deleted');
          const securityMessage =
            'Security Notice: Your faculty account has been deleted. Please contact the administrator if this action was unexpected.';
          handleSecurityEvent(securityMessage);
        }
      }
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, [user, navigate]);

  useEffect(() => {
    document.title = 'CTU Portal | Faculty Dashboard';
  }, []);

  const handleSectionChange = (section) => {
    setActiveSection(section);
    setIsSidebarOpen(false);
  };

  const handleAccountSettings = () => {
    setActiveSection('settings');
    setIsSidebarOpen(false);
  };

  const handleFacultyDataSaved = (updatedFacultyData) => {
    setFacultyData(updatedFacultyData);
  };

  const handleLogout = async () => {
    await signOutByRole('faculty');
    
    localStorage.removeItem('facultyActiveSection');
    localStorage.removeItem('isAuthenticated');
    sessionStorage.removeItem('isAuthenticated');
    
    clearRoleSession('faculty');
    navigate('/faculty', { replace: true });
  };

  const handleNavigateToSchedule = (scheduleId) => {
    console.log('📍 Navigating to schedule from notification:', scheduleId);

   
    setScheduleIdToApprove(scheduleId);
    setActiveSection('schedule');
  };

  const handleScheduleApprovalModalClosed = () => {
    console.log('✅ Schedule Approval Modal closed - resetting scheduleIdToApprove');
    
    setScheduleIdToApprove(null);
  };

  const renderContent = () => {
    const content = (() => {
      switch (activeSection) {
        case "dashboard":
          return <FacultyDashboardContent facultyData={facultyData || null} onSectionChange={handleSectionChange} />;
        case "schedule":
          return <FacultySchedule facultyData={facultyData || null} scheduleIdToApprove={scheduleIdToApprove} onScheduleApprovalModalClosed={handleScheduleApprovalModalClosed} />;
        case "settings":
          return <FacultySettings user={user} facultyData={facultyData || null} onDataSaved={handleFacultyDataSaved} />;
        default:
          return <FacultyDashboardContent facultyData={facultyData || null} onSectionChange={handleSectionChange} />;
      }
    })();

    return (
      <Suspense fallback={<div className="p-6 text-slate-500">Loading section...</div>}>
        {content}
      </Suspense>
    );
  };

  if (isLoading) {
    return <LoadingScreen variant="faculty" />;
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
              onClick={() => { setShowAccessRestrictedModal(false); navigate('/faculty', { replace: true }); }}
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
            onClick={() => { setShowAuthModal(false); navigate('/faculty', { replace: true }); }}
            className="w-full px-6 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-xl font-semibold hover:shadow-lg transition-all"
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
        <FacultySidebar 
          isOpen={isSidebarOpen} 
          isCollapsed={isSidebarCollapsed}
          onClose={() => setIsSidebarOpen(false)} 
          activeSection={activeSection} 
          onSectionChange={handleSectionChange} 
          isMobile={false} 
          facultyData={facultyData || null}
          user={user}
        />
      </aside>

      <div className="flex-1 flex flex-col overflow-hidden transition-all duration-300">
        <header className="bg-white border-b border-slate-200 shadow-sm sticky top-0 z-30">
          <FacultyHeader
            onMenuClick={() => setIsSidebarOpen(!isSidebarOpen)}
            user={user}
            facultyData={facultyData || null}
            onAccountSettings={handleAccountSettings}
            onLogout={handleLogout}
            isSidebarCollapsed={isSidebarCollapsed}
            isSidebarLocked={isSidebarLocked}
            onToggleSidebar={handleToggleCollapse}
            onNavigateToSchedule={handleNavigateToSchedule}
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

export default FacultyDashboard;
