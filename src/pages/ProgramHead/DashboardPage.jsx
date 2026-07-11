import React, { Suspense, lazy, useState, useEffect, useCallback } from "react";
import { supabase } from "../../lib/supabaseClient";
import { saveRoleSession, getRoleSession, clearRoleSession } from "../../lib/multiSessionManager";
import { useNavigate, useLocation } from "react-router-dom";
import Sidebar from "../../components/ProgramHead/ProgramHeadDashboard/Sidebar";
import Header from "../../components/ProgramHead/ProgramHeadDashboard/Header";
import Dashboard from "../../components/ProgramHead/ProgramHeadDashboard/Dashboard";
import Login from "./Login";
import { signOut, signOutByRole } from '../../api/auth';
import LoadingScreen from "../../components/LoadingScreen";

const FacultyManagement = lazy(() => import('../../components/ProgramHead/ProgramHeadDashboard/FacultyManagement'));
const LocationManagement = lazy(() => import('../../components/ProgramHead/ProgramHeadDashboard/LocationManagement'));
const Scheduling = lazy(() => import('../../components/ProgramHead/ProgramHeadDashboard/Scheduling'));
const Reports = lazy(() => import('../../components/ProgramHead/ProgramHeadDashboard/Reports'));
const Settings = lazy(() => import('../../components/ProgramHead/ProgramHeadDashboard/Settings'));
const CourseList = lazy(() => import('../../components/ProgramHead/ProgramHeadDashboard/CourseList'));
const SubjectList = lazy(() => import('../../components/ProgramHead/ProgramHeadDashboard/SubjectList'));

function DashboardPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isHoveringSidebar, setIsHoveringSidebar] = useState(false);
  const [isSidebarLocked, setIsSidebarLocked] = useState(() => {
    const savedState = localStorage.getItem('phSidebarLocked');
    
    return savedState !== null ? JSON.parse(savedState) : true;
  });
  const [activeSection, setActiveSection] = useState(() => {
    
    if (location.state?.activeTab) {
      return location.state.activeTab;
    }
    const savedSection = localStorage.getItem('phActiveSection');
    return savedSection || 'dashboard';
  });
  const [activeSchedulingTab, setActiveSchedulingTab] = useState("create");
  const [scheduleIdToEdit, setScheduleIdToEdit] = useState(location.state?.scheduleIdToEdit || null);
  
  
  useEffect(() => {
    console.log('📍 Location changed:', location);
    console.log('   State:', location.state);
    
    if (location.state?.scheduleIdToEdit) {
      console.log('📝 Setting scheduleIdToEdit from location:', location.state.scheduleIdToEdit);
      setScheduleIdToEdit(location.state.scheduleIdToEdit);
     
      window.history.replaceState({}, document.title, window.location.pathname);
    }
    
    if (location.state?.activeTab) {
      console.log('🔄 Setting activeSection from location:', location.state.activeTab);
      setActiveSection(location.state.activeTab);
    }
  }, [location]);
  
  useEffect(() => {
    document.title = 'CTU Portal | Home Page';
  }, []);
  const [user, setUser] = useState(null);
  const [programHeadData, setProgramHeadData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authModalMessage, setAuthModalMessage] = useState("");
  const [showAccessRestrictedModal, setShowAccessRestrictedModal] = useState(false);
  const [accessRestrictedMessage, setAccessRestrictedMessage] = useState("");
  const [showScrollbar, setShowScrollbar] = useState(false);
  const [isMobileView, setIsMobileView] = useState(false);
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

  const handleSectionChange = (section) => {
    setActiveSection(section);
  };

  useEffect(() => {
    if (activeSection) {
      localStorage.setItem('phActiveSection', activeSection);
    }
  }, [activeSection]);

  useEffect(() => {
    localStorage.setItem('phSidebarLocked', JSON.stringify(isSidebarLocked));
  }, [isSidebarLocked]);

  const handleLogout = async () => {
    await signOutByRole('programhead');
    
    localStorage.removeItem('phActiveSection');
    localStorage.removeItem('isAuthenticated');
    localStorage.removeItem('isAdmin');
    sessionStorage.removeItem('isAuthenticated');
    sessionStorage.removeItem('isAdmin');
    clearRoleSession('programhead');
    navigate('/programhead/login', { replace: true });
  };

  const handleAccountSettings = () => {
    setActiveSection('settings');
    setIsSidebarOpen(false);
  };

  const handleProgramHeadDataSaved = (updatedProgramHeadData) => {
    setProgramHeadData(updatedProgramHeadData);
  };

  const handleSchedulingTabChange = (tab) => {
    setActiveSchedulingTab(tab);
  };

  useEffect(() => {
    const handleResize = () => {
      setIsMobileView(window.innerWidth < 768);
      if (window.innerWidth >= 768 && !isSidebarOpen) {
        setIsSidebarOpen(false);
      }
    };

    window.addEventListener('resize', handleResize);
    handleResize();

    return () => window.removeEventListener('resize', handleResize);
  }, [isSidebarOpen]);

  useEffect(() => {
    if (isMobileView) return;
    if (isSidebarLocked) return;
    
    if (isHoveringSidebar && isSidebarCollapsed) {
      setIsSidebarCollapsed(false);
    } else if (!isHoveringSidebar && !isSidebarCollapsed) {
      const timer = setTimeout(() => {
        setIsSidebarCollapsed(true);
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [isHoveringSidebar, isSidebarCollapsed, isSidebarLocked, isMobileView]);

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
    let programHeadChannel = null;
    let pollingInterval = null;

    const fetchUser = async () => {
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
            setUser(null);
            navigate('/programhead/login', { replace: true });
            return;
          }
          
          
          localStorage.removeItem('isAuthenticated');
          sessionStorage.removeItem('isAuthenticated');
          setIsLoading(false);
          setUser(null);
          navigate('/programhead/login', { replace: true });
          return;
        }
        try {
          console.log('🔍 Validating Program Head access for user:', currentUser.id);
          const { data: programHeadDataFetch, error: programHeadError } = await supabase
            .from('program_heads')
            .select('id, program_head_code')
            .eq('auth_user_id', currentUser.id)
            .single();

          console.log('📊 Query result:', { data: programHeadDataFetch, error: programHeadError });

          if (programHeadError) {
            if (programHeadError.code === 'PGRST116') {
              console.warn('❌ Program Head record not found (PGRST116)');
              localStorage.removeItem('isAuthenticated');
              localStorage.removeItem('isAdmin');
              sessionStorage.removeItem('isAuthenticated');
              sessionStorage.removeItem('isAdmin');
              setIsLoading(false);
              setUser(null);
              navigate('/programhead/login', { replace: true });
              return;
            } else {
              console.warn('⚠️ Error querying program head record (but allowing access):', programHeadError.message);
              console.log('ℹ️ Proceeding with session restoration...');
            }
          }

          if (programHeadDataFetch && !programHeadDataFetch.program_head_code) {
            console.warn('❌ Program Head record missing program_head_code. Redirecting to login.');
            localStorage.removeItem('isAuthenticated');
            localStorage.removeItem('isAdmin');
            sessionStorage.removeItem('isAuthenticated');
            sessionStorage.removeItem('isAdmin');
            setIsLoading(false);
            setUser(null);
            navigate('/programhead/login', { replace: true });
            return;
          }

          console.log('✅ Program Head access validated. Fetching full profile...');
        } catch (fetchError) {
          console.error('Error validating program head access:', fetchError);
          localStorage.removeItem('isAuthenticated');
          localStorage.removeItem('isAdmin');
          sessionStorage.removeItem('isAuthenticated');
          sessionStorage.removeItem('isAdmin');
          setIsLoading(false);
          setUser(null);
          navigate('/programhead/login', { replace: true });
          return;
        }
        
        const { data: fullProgramHeadData, error: fullFetchError } = await supabase
          .from('program_heads')
          .select('*')
          .eq('auth_user_id', currentUser.id)
          .single();

        if (fullProgramHeadData) {
          setProgramHeadData(fullProgramHeadData);
          
        
          if (fullProgramHeadData.is_active !== true) {
            console.warn('❌ Program Head account is inactive or pending approval');
            setAccessRestrictedMessage('Your account is inactive or pending approval. Please contact the administration for assistance.');
            setShowAccessRestrictedModal(true);
          }
        } else if (fullFetchError) {
          const errorCode = fullFetchError.code;
          console.warn(`Program head record not found (code: ${errorCode}), continuing without it`);
          setProgramHeadData(null);
        } else {
          setProgramHeadData(null);
        }

        setUser(currentUser);
        
        saveRoleSession('programhead', {
          email: currentUser.email,
          id: currentUser.id,
          loginTime: Date.now(),
          isAdmin: false
        });
        
        try {
          programHeadChannel = supabase
              .channel(`program_head_changes_${currentUser.id}`)
              .on(
                'postgres_changes',
                {
                  event: '*',
                  schema: 'public',
                  table: 'program_heads',
                  filter: `auth_user_id=eq.${currentUser.id}`
                },
                async (payload) => {
                  console.log('🔄 Program head data changed via real-time:', payload);
                  
                  if (payload.eventType === 'DELETE') {
                    console.log('⚠️ Program head record was deleted');
                    setProgramHeadData(null);
                    window.dispatchEvent(new CustomEvent('programHeadDataUpdated', { 
                      detail: { data: null, eventType: 'DELETE' } 
                    }));
                    return;
                  }
                  
                  try {
                    const { data: { user: refreshUser } } = await supabase.auth.getUser();
                    
                    const isAdmin = refreshUser?.email === 'dev-team@ctu.com';
                    
                    if (refreshUser && refreshUser.email !== 'dev-team@ctu.com') {
                      const { data: programHeadDataFetch, error } = await supabase
                        .from('program_heads')
                        .select('*')
                        .eq('auth_user_id', refreshUser.id)
                        .single();
                      
                      if (!error && programHeadDataFetch) {
                        console.log('✅ Program head data refreshed:', programHeadDataFetch);
                        
                        // Check if account was disabled
                        if (programHeadDataFetch.is_active === false) {
                          console.warn('❌ Program Head account is disabled via real-time update');
                          setAccessRestrictedMessage('Your account has been disabled. Please contact the administration for assistance.');
                          setShowAccessRestrictedModal(true);
                          return;
                        }
                        
                        setProgramHeadData(programHeadDataFetch);
                        
                        window.dispatchEvent(new CustomEvent('programHeadDataUpdated', { 
                          detail: { 
                            data: programHeadDataFetch, 
                            eventType: payload.eventType,
                            gender: programHeadDataFetch.gender 
                          } 
                        }));
                        
                        window.dispatchEvent(new CustomEvent('programHeadProfileUpdated', { 
                          detail: { gender: programHeadDataFetch.gender } 
                        }));
                      } else if (error && error.code === 'PGRST116') {
                        console.log('⚠️ Program head record not found after update');
                        setProgramHeadData(null);
                        window.dispatchEvent(new CustomEvent('programHeadDataUpdated', { 
                          detail: { data: null, eventType: 'DELETE' } 
                        }));
                      }
                    }
                  } catch (error) {
                    console.error('❌ Error refreshing program head data:', error);
                  }
                }
              )
              .subscribe((status) => {
                console.log('📡 Program head subscription status:', status);
                if (status === 'SUBSCRIBED') {
                  console.log('✅ Real-time subscription active for program head changes');
                } else if (status === 'CHANNEL_ERROR') {
                  console.error('❌ Real-time subscription error');
                  console.log('🔄 Will use polling fallback...');
                }
              });

            console.log('🔄 Starting polling interval for Program Head');
            pollingInterval = setInterval(async () => {
              try {
                if (currentUser && currentUser.email !== 'dev-team@ctu.com') {
                  const { data: programHeadDataFetch, error } = await supabase
                    .from('program_heads')
                    .select('*')
                    .eq('auth_user_id', currentUser.id)
                    .single();
                  
                  if (!error && programHeadDataFetch) {
                    
                    if (programHeadDataFetch.is_active === false) {
                      console.warn('❌ Program Head account is disabled via polling');
                      setAccessRestrictedMessage('Your account has been disabled. Please contact the administration for assistance.');
                      setShowAccessRestrictedModal(true);
                      return;
                    }
                    
                    setProgramHeadData(prev => {
                      if (prev && JSON.stringify(prev) !== JSON.stringify(programHeadDataFetch)) {
                        console.log('📊 Program head data changed via polling');
                        window.dispatchEvent(new CustomEvent('programHeadDataUpdated', { 
                          detail: { 
                            data: programHeadDataFetch, 
                            eventType: 'UPDATE',
                            gender: programHeadDataFetch.gender 
                          } 
                        }));
                        return programHeadDataFetch;
                      }
                      return prev || programHeadDataFetch;
                    });
                  }
                }
              } catch (error) {
                console.error('Error in polling:', error);
              }
            }, 15000); // Poll every 15 seconds
          } catch (error) {
            console.error('❌ Error setting up real-time subscription:', error);
          }
      } catch (error) {
        console.error('Error fetching user data:', error);
        
        localStorage.removeItem('isAuthenticated');
        sessionStorage.removeItem('isAuthenticated');
        setUser(null);
        setIsLoading(false);
        navigate('/programhead/login', { replace: true });
        return;
      } finally {
        setIsLoading(false);
      }
    };

    fetchUser();

    return () => {
      console.log('🧹 Cleaning up Program Head Dashboard - clearing polling interval:', pollingInterval);
      if (programHeadChannel) {
        supabase.removeChannel(programHeadChannel);
      }
      if (pollingInterval) {
        clearInterval(pollingInterval);
        console.log('✅ Polling interval cleared');
      }
    };
  }, [navigate]);

  
  useEffect(() => {
    if (!user) return; 

  
   
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      
      if (session && user && session.user.id !== user.id) {
        console.log('🔒 Ignoring auth event for different user');
        return;
      }
      
      
      if (sessionStorage.getItem('_roleSignOut_faculty') || 
          sessionStorage.getItem('_roleSignOut_admin') || 
          sessionStorage.getItem('_roleSignOut_student') ||
          sessionStorage.getItem('_roleSignOut_dean')) {
        console.log('🔒 Ignoring logout event from different role');
        return;
      }
      
      if (event === 'SIGNED_OUT') {
        
        if (!session && user) {
          console.log('🚪 Program Head signed out');
          clearRoleSession('programhead');
          navigate('/programhead/login', { replace: true });
        }
      } else if (event === 'USER_DELETED') {
        
        if (user) {
          console.log('❌ Program Head account deleted');
          const securityNotice = "Security Notice: Your program head account has been deleted. Please contact the administrator if this action was unexpected.";
          sessionStorage.setItem(
            'authSecurityNotice',
            JSON.stringify({ message: securityNotice, target: 'programHead', timestamp: Date.now() })
          );
          setUser(null);
          setAuthModalMessage(securityNotice);
          setShowAuthModal(true);
          localStorage.removeItem('isAuthenticated');
          localStorage.removeItem('isAdmin');
          sessionStorage.removeItem('isAuthenticated');
          sessionStorage.removeItem('isAdmin');
        }
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [user, navigate]);

  useEffect(() => {
    if (!showAuthModal && !showAccessRestrictedModal) return;
  }, [showAuthModal, showAccessRestrictedModal, navigate]);

  const renderContent = () => {
    console.log('DashboardPage: Rendering content for activeSection:', activeSection, 'with programHeadData:', programHeadData);
    const sectionContent = (() => {
      switch (activeSection) {
        case "dashboard":
          if (user?.email === 'dev-team@ctu.com') {
            return null;
          }
          return (
            <Dashboard onSectionChange={handleSectionChange} onSchedulingTabChange={handleSchedulingTabChange} programHeadData={programHeadData} />
          );
        case "courses":
          if (user?.email === 'dev-team@ctu.com') {
            return <CourseList />;
          }
          return null;
        case "subjects":
          return <SubjectList />;
        case "faculty":
          if (user?.email === 'dev-team@ctu.com') {
            return <FacultyManagement />;
          }
          return null;
        case "locations":
          return <LocationManagement />;
        case "scheduling":
          return <Scheduling activeTab={activeSchedulingTab} onTabChange={handleSchedulingTabChange} programHeadData={programHeadData} scheduleIdToEdit={scheduleIdToEdit} onScheduleEdited={() => setScheduleIdToEdit(null)} />;
        case "reports":
          return <Reports programHeadData={programHeadData} />;
        case "settings":
          console.log('📋 Rendering Settings component with programHeadData:', programHeadData);
          return <Settings user={user} programHeadData={programHeadData} onDataSaved={handleProgramHeadDataSaved} />;
        default:
          if (user?.email === 'dev-team@ctu.com') {
            return null;
          }
          return <Dashboard onSectionChange={handleSectionChange} />;
      }
    })();

    return (
      <Suspense fallback={<div className="p-6 text-slate-500">Loading section...</div>}>
        {sectionContent}
      </Suspense>
    );
  };

  if (isLoading) {
    return <LoadingScreen variant="programhead" />;
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
              onClick={() => { setShowAccessRestrictedModal(false); navigate('/programhead/login', { replace: true }); }}
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
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full text-center">
          <div className="flex flex-col items-center mb-4">
            <div className="w-14 h-14 rounded-full bg-red-50 border-2 border-red-200 flex items-center justify-center mb-3">
              <span className="text-2xl">⚠️</span>
            </div>
            <h2 className="text-2xl font-bold text-red-700">Session Expired</h2>
          </div>
          <p className="text-slate-600 mb-6 text-sm leading-relaxed">{authModalMessage}</p>
          <button
            onClick={() => { setShowAuthModal(false); navigate('/programhead/login', { replace: true }); }}
            className="w-full px-6 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-xl font-semibold hover:shadow-lg transition-all"
          >
            Return to Login
          </button>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  return (
    <div className="flex h-screen bg-slate-50 font-sans">
      <aside
        onMouseEnter={() => setIsHoveringSidebar(true)}
        onMouseLeave={() => setIsHoveringSidebar(false)}
        className={`fixed md:relative inset-y-0 left-0 z-40 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-white shadow-2xl transform transition-all duration-300 ease-in-out ${
          isMobileView ? (isSidebarOpen ? "translate-x-0" : "-translate-x-full") : "translate-x-0"
        } ${
          isSidebarCollapsed ? "md:w-20" : "md:w-64"
        } w-64`}
      >
        <Sidebar 
          isOpen={isSidebarOpen} 
          isCollapsed={isSidebarCollapsed}
          onClose={() => setIsSidebarOpen(false)} 
          activeSection={activeSection} 
          onSectionChange={handleSectionChange} 
          isMobile={isMobileView} 
          user={user} 
        />
      </aside>

      <div className="flex-1 flex flex-col overflow-hidden transition-all duration-300">
        <header className="bg-white border-b border-slate-200 shadow-sm sticky top-0 z-30">
          <Header
            onMenuClick={() => setIsSidebarOpen(!isSidebarOpen)}
            user={user}
            programHeadData={programHeadData}
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
          <div className="p-4 sm:p-6 md:p-8">{renderContent()}</div>
        </main>
      </div>

      {isSidebarOpen && isMobileView && (
        <div
          className="fixed inset-0 bg-black/50 z-30 md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        ></div>
      )}
    </div>
  );
}

export default DashboardPage;



