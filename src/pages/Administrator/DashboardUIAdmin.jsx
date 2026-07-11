import React, { useState, useEffect } from "react";
import { supabase } from "../../lib/supabaseClient";
import { saveRoleSession, getRoleSession, clearRoleSession } from "../../lib/multiSessionManager";
import { useNavigate } from "react-router-dom";
import {
  LogOut,
  Menu,
  X,
  LayoutDashboard,
  Building2,
  BookOpen,
  Users,
  User,
  UserCheck,
  Landmark,
  Settings as SettingsIcon,
  Bell,
  Shield,
  BarChart3,
  ChevronDown,
  AlignJustify,
} from "lucide-react";
import { signOutByRole } from '../../api/auth';
import CourseList from "../../components/ProgramHead/ProgramHeadDashboard/CourseList";
import CollegeManagement from "../../components/Administrator/AdminDashboard/CollegeManagement";
import AccountManagement from "../../components/Administrator/AdminDashboard/AccountManagement";
import SettingsComponent from "../../components/ProgramHead/ProgramHeadDashboard/Settings";
import LoadingScreen from "../../components/LoadingScreen";
import AdminSessionExpiredModal from "../../components/Administrator/AdminSessionExpiredModal";
import AdminNotificationsPanel from "../../components/Administrator/AdminDashboard/AdminNotificationsPanel";

function DashboardUIAdmin() {
  const isAuthenticated =
    localStorage.getItem("isAuthenticated") === "true" ||
    sessionStorage.getItem("isAuthenticated") === "true";
  const isAdmin = localStorage.getItem("isAdmin") === "true";

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isHoveringSidebar, setIsHoveringSidebar] = useState(false);
  const [isSidebarLocked, setIsSidebarLocked] = useState(() => {
    const savedState = localStorage.getItem('adminSidebarLocked');
    return savedState !== null ? JSON.parse(savedState) : true;
  });
  const [activeSection, setActiveSection] = useState(() => {
    return localStorage.getItem("adminActiveSection") || "dashboard";
  });
  const [accountsInitialUserType, setAccountsInitialUserType] = useState(null);
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authModalMessage, setAuthModalMessage] = useState("");
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [facultyCount, setFacultyCount] = useState(0);
  const [adminData, setAdminData] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    document.title = "CTU Portal | Administrator Dashboard";
  }, []);

  useEffect(() => {
    localStorage.setItem("adminActiveSection", activeSection);
  }, [activeSection]);

  useEffect(() => {
    const legacyRoleSections = new Set([
      "programHeads",
      "deans",
      "campusDirectors",
      "faculty",
      "students",
    ]);

    if (legacyRoleSections.has(activeSection)) {
      setAccountsInitialUserType(activeSection);
      setActiveSection("accounts");
    }

    if (activeSection === "reports") {
      setActiveSection("dashboard");
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('adminSidebarLocked', JSON.stringify(isSidebarLocked));
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
    let isMounted = true;
    let hasInitialized = false;

    const fetchUser = async () => {
      
      if (hasInitialized) return;
      hasInitialized = true;

      try {

        const hasStoredAuth = 
          localStorage.getItem('isAuthenticated') === 'true' ||
          sessionStorage.getItem('isAuthenticated') === 'true';
        
        let { data: { user: currentUser }, error } = await supabase.auth.getUser();
        
        if (!isMounted) return;

        if (!currentUser && hasStoredAuth) {
          console.log('⏳ Session not ready yet, waiting for restoration...');
          const { getCurrentUserWithRetry, restoreSessionFromStorage } = await import('../../lib/supabaseClient');
          
          const session = await restoreSessionFromStorage();
          
          const result = await getCurrentUserWithRetry();
          currentUser = result.user;
          error = result.error;
        }

        if (!error && currentUser) {
          localStorage.setItem('isAuthenticated', 'true');
          sessionStorage.setItem('isAuthenticated', 'true');
        } else {
          // No user found
          if (!hasStoredAuth) {
            console.warn('❌ No Supabase session found and no stored auth');
            setUser(null);
            setIsLoading(false);
            navigate("/admin/login", { replace: true });
            return;
          }
          
          console.warn('❌ Stored auth found but no current user - clearing session');
          localStorage.removeItem('isAuthenticated');
          sessionStorage.removeItem('isAuthenticated');
          setUser(null);
          setIsLoading(false);
          navigate("/admin/login", { replace: true });
          return;
        }

        console.log('🔍 Verifying admin record for email:', currentUser.email);
        const { data: adminData, error: adminError } = await supabase
          .from('admins')
          .select('id, admin_code, email, is_active')
          .eq('email', currentUser.email)
          .single();

        if (!isMounted) return;

        if (adminError || !adminData) {
          console.warn('❌ User is not an admin');
          setUser(null);
          setIsLoading(false);
          navigate("/admin/login", { replace: true });
          return;
        }

        if (adminData.is_active === false) {
          console.warn('❌ Admin account is disabled');
          setUser(null);
          setIsLoading(false);
          navigate("/admin/login", { replace: true });
          return;
        }

        console.log('✅ Admin verified:', adminData.admin_code);
        setAdminData(adminData);

        const adminSession = getRoleSession('admin');
        
        if (!adminSession) {
          console.log('📝 Creating new admin session');
          saveRoleSession('admin', {
            email: currentUser.email,
            id: currentUser.id,
            adminCode: adminData.admin_code,
            loginTime: Date.now(),
            isAdmin: true
          });
        }

        if (isMounted) {
          setUser(currentUser);
          setIsLoading(false);
        }
      } catch (error) {
        console.error('❌ Error fetching user:', error);
        if (isMounted) {
          setUser(null);
          setIsLoading(false);
          navigate("/admin/login", { replace: true });
        }
      }
    };

    fetchUser();

    return () => {
      isMounted = false;
    };
  }, [navigate]);

  
  useEffect(() => {
    if (!user) return; 

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      
      if (session && user && session.user.id !== user.id) {
        console.log('🔒 Ignoring auth event for different user');
        return;
      }
      
      // Ignore role-specific logout events from other dashboards
      if (sessionStorage.getItem('_roleSignOut_faculty') || 
          sessionStorage.getItem('_roleSignOut_programhead') || 
          sessionStorage.getItem('_roleSignOut_student')) {
        console.log('🔒 Ignoring logout event from different role');
        return;
      }
      
      if (event === "SIGNED_OUT") {
        // Only logout if the current user signed out
        if (!session && user) {
          console.log('🚪 Admin signed out');
          clearRoleSession('admin');
          localStorage.removeItem("isAuthenticated");
          localStorage.removeItem("isAdmin");
          sessionStorage.removeItem("isAuthenticated");
          sessionStorage.removeItem("isAdmin");
          navigate("/admin/login", { replace: true });
        }
      } else if (event === "USER_DELETED") {
        // Admin account was deleted by system
        if (user) {
          console.log('❌ Admin account deleted');
          const securityNotice = "Security Notice: Your administrator account has been deleted. Please contact another administrator if this was unexpected.";
          sessionStorage.setItem(
            "authSecurityNotice",
            JSON.stringify({ message: securityNotice, target: "admin", timestamp: Date.now() })
          );
          setUser(null);
          setAuthModalMessage(securityNotice);
          setShowAuthModal(true);
          clearRoleSession('admin');
          localStorage.removeItem("isAuthenticated");
          localStorage.removeItem("isAdmin");
          sessionStorage.removeItem("isAuthenticated");
          sessionStorage.removeItem("isAdmin");
        }
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [user, navigate]);

  useEffect(() => {
    if (!showAuthModal) return;
    const timer = setTimeout(() => {
      navigate("/admin/login", { replace: true });
    }, 2500);
    return () => clearTimeout(timer);
  }, [showAuthModal, navigate]);

  useEffect(() => {
    const fetchFacultyCount = async () => {
      try {
        const { count, error } = await supabase
          .from('faculty')
          .select('*', { count: 'exact', head: true });
        
        if (error) {
          console.error('Error fetching faculty count:', error);
          setFacultyCount(0);
        } else {
          setFacultyCount(count || 0);
        }
      } catch (err) {
        console.error('Exception fetching faculty count:', err);
        setFacultyCount(0);
      }
    };

    if (user) {
      fetchFacultyCount();
    }
  }, [user]);

  const handleLogout = async () => {
    await signOutByRole('admin');
    clearRoleSession('admin', user?.email);
    localStorage.removeItem("isAuthenticated");
    localStorage.removeItem("isAdmin");
    localStorage.removeItem("adminActiveSection");
    sessionStorage.removeItem("isAuthenticated");
    sessionStorage.removeItem("isAdmin");
    navigate("/admin/login", { replace: true });
  };

  const adminNavItems = [
    { name: "Dashboard", icon: LayoutDashboard, section: "dashboard" },
    { name: "College Management", icon: Building2, section: "colleges" },
    { name: "Program Management", icon: BookOpen, section: "courses" },
    { name: "Account Management", icon: Users, section: "accounts" },
  ];

  const renderContent = () => {
    switch (activeSection) {
      case "dashboard":
        return <AdminDashboardOverview facultyCount={facultyCount} />;
      case "colleges":
        return <CollegeManagement />;
      case "courses":
        return <CourseList />;
      case "accounts":
        return <AccountManagement initialUserType={accountsInitialUserType} />;
      case "settings":
        return <SettingsComponent user={user} />;
      default:
        return <AdminDashboardOverview />;
    }
  };

  if (isLoading) {
    return <LoadingScreen variant="admin" />;
  }

  if (showAuthModal) {
    return (
      <AdminSessionExpiredModal
        open={showAuthModal}
        message={authModalMessage}
        onReturnToLogin={() => {
          setShowAuthModal(false);
          navigate("/admin/login", { replace: true });
        }}
      />
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="flex h-screen bg-slate-50 font-sans">
      {/* Sidebar */}
      <aside
        onMouseEnter={() => setIsHoveringSidebar(true)}
        onMouseLeave={() => setIsHoveringSidebar(false)}
        className={`fixed md:relative inset-y-0 left-0 z-40 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-white shadow-2xl transform transition-all duration-300 ease-in-out md:translate-x-0 border-r border-slate-800 ${
          isSidebarOpen ? "translate-x-0" : "-translate-x-full"
        } ${
          isSidebarCollapsed ? "md:w-20" : "md:w-64"
        } w-64`}
      >
        <div className="flex flex-col h-full">
          {/* Logo Section */}
          <div className={`border-b border-slate-800/50 transition-all duration-300 ${isSidebarCollapsed ? "p-4" : "p-6"}`}>
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-amber-400 via-orange-500 to-rose-500 flex items-center justify-center shadow-lg shadow-orange-500/30 flex-shrink-0">
                <Shield size={26} className="text-white" />
              </div>
              {!isSidebarCollapsed && (
                <div className="overflow-hidden">
                  <h1 className="text-base font-bold tracking-tight whitespace-nowrap">CTU Administrator</h1>
                  <p className="text-xs text-slate-400 font-medium whitespace-nowrap">Portal</p>
                </div>
              )}
            </div>
          </div>

          {/* Navigation */}
          <nav className={`flex-1 overflow-y-auto space-y-1.5 transition-all duration-300 hide-scrollbar ${isSidebarCollapsed ? "px-2 py-6" : "px-3 py-6"}`}>
            {adminNavItems.map((item) => (
              <button
                key={item.section}
                onClick={() => {
                  setActiveSection(item.section);
                  setIsSidebarOpen(false);
                }}
                className={`w-full flex items-center rounded-xl transition-all duration-200 text-sm font-medium group relative focus:outline-none focus:ring-0 active:outline-none ${
                  isSidebarCollapsed ? "justify-center px-3 py-3" : "gap-3 px-4 py-3"
                } ${
                  activeSection === item.section
                    ? "text-white"
                    : "text-slate-300 hover:text-white"
                }`}
                style={{ backgroundColor: "transparent", outline: "none", border: "none" }}
                onMouseDown={(e) => e.preventDefault()}
                title={isSidebarCollapsed ? item.name : ""}
              >
                <item.icon size={18} className="flex-shrink-0" />
                {!isSidebarCollapsed && (
                  <span className="whitespace-nowrap">{item.name}</span>
                )}
                {/* Tooltip for collapsed state */}
                {isSidebarCollapsed && (
                  <div className="absolute left-full ml-2 px-3 py-2 bg-slate-900 text-white text-sm rounded-lg shadow-xl opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-200 whitespace-nowrap z-[100]">
                    {item.name}
                    <div className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-slate-900"></div>
                  </div>
                )}
              </button>
            ))}
          </nav>

        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden transition-all duration-300">
        {/* Header */}
        <header className="bg-white border-b border-slate-200 shadow-sm sticky top-0 z-30">
          <div className="flex items-center justify-between px-6 py-4">
            <div className="flex items-center gap-4">
              {/* Mobile Menu Button */}
              <button
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                className="md:hidden p-2 hover:bg-transparent rounded-lg transition-colors focus:outline-none focus:ring-0 active:outline-none"
                style={{ outline: 'none', border: 'none', backgroundColor: 'transparent' }}
                onMouseDown={(e) => e.preventDefault()}
              >
                <Menu size={24} />
              </button>
              
              {/* Sidebar Lock/Unlock Toggle - Desktop Only */}
              <button
                onClick={handleToggleCollapse}
                className={`hidden md:flex items-center justify-center p-2 rounded-lg transition-all duration-200 relative group bg-transparent focus:outline-none focus:ring-0 active:outline-none ${
                  isSidebarLocked 
                    ? "text-slate-600 hover:text-slate-700" 
                    : "text-slate-600 hover:text-slate-700"
                }`}
                style={{ outline: 'none', border: 'none' }}
                onMouseDown={(e) => e.preventDefault()}
                title={
                  isSidebarLocked 
                    ? "Unlock sidebar (enable auto-collapse)"
                    : "Lock sidebar (keep expanded, disable auto-collapse)"
                }
              >
                <AlignJustify size={20} />
                <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-xs rounded px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                  {isSidebarLocked ? "Unlock Sidebar" : "Lock Sidebar"}
                </div>
              </button>
            </div>

            <div className="flex items-center gap-3">
              {/* Admin Notifications Panel */}
              {adminData && (
                <AdminNotificationsPanel adminId={adminData.id} />
              )}
              
              <div className="relative">
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center gap-3 px-3 py-2 hover:bg-slate-100 rounded-lg transition-colors"
                  style={{ backgroundColor: 'rgb(255 255 255 / 0.05)' }}
                >
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-amber-400 via-orange-500 to-rose-500 flex items-center justify-center text-white font-bold text-sm shadow-md">
                    A
                  </div>
                  <div className="text-left hidden sm:block">
                    <p className="text-sm font-semibold text-slate-900">Administrator</p>
                  </div>
                  <ChevronDown size={16} className={`text-slate-600 transition-transform ${showUserMenu ? "rotate-180" : ""}`} />
                </button>

                {showUserMenu && (
                  <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-slate-200 z-50 overflow-hidden">
                    <div className="px-4 py-3 bg-slate-50 border-b border-slate-200">
                      <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Account</p>
                    </div>
                    <button
                      onClick={() => {
                        setActiveSection("settings");
                        setShowUserMenu(false);
                      }}
                      className="w-full text-left px-4 py-3 hover:bg-slate-50 text-sm text-slate-700 font-medium flex items-center gap-2 transition-colors"
                      style={{ backgroundColor: 'rgb(255 255 255 / 0.05)' }}
                    >
                      <SettingsIcon size={16} />
                      Account Settings
                    </button>
                    <div className="border-t border-slate-200"></div>
                    <button
                      onClick={handleLogout}
                      className="w-full text-left px-4 py-3 hover:bg-red-50 text-sm text-red-600 font-medium flex items-center gap-2 transition-colors"
                      style={{ backgroundColor: 'rgb(255 255 255 / 0.05)' }}
                    >
                      <LogOut size={16} />
                      Sign Out
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Content Area */}
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-slate-50">
          <div className="p-6 md:p-8">{renderContent()}</div>
        </main>
      </div>

      {/* Mobile Overlay */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        ></div>
      )}
    </div>
  );
}

function AdminDashboardOverview({ facultyCount = 0 }) {
  const [totalPrograms, setTotalPrograms] = useState(0);
  const [totalProgramChairs, setTotalProgramChairs] = useState(0);
  const [totalStudents, setTotalStudents] = useState(0);
  const [totalDeans, setTotalDeans] = useState(0);
  const [totalCampusDirectors, setTotalCampusDirectors] = useState(0);
  const [isLoadingMetrics, setIsLoadingMetrics] = useState(true);

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        setIsLoadingMetrics(true);
        
        const { count: programsCount, error: programsError } = await supabase
          .from('courses')
          .select('id', { count: 'exact', head: true });
        
        if (programsError) throw programsError;

        const { count: programChairsCount, error: programChairsError } = await supabase
          .from('program_heads')
          .select('id', { count: 'exact', head: true });

        if (programChairsError) throw programChairsError;

        const { count: studentsCount, error: studentsError } = await supabase
          .from('students')
          .select('id', { count: 'exact', head: true });

        if (studentsError) throw studentsError;

        const { count: deansCount, error: deansError } = await supabase
          .from('deans')
          .select('id', { count: 'exact', head: true });

        if (deansError) throw deansError;

        const { count: campusDirectorsCount, error: campusDirectorsError } = await supabase
          .from('campus_directors')
          .select('id', { count: 'exact', head: true });

        if (campusDirectorsError) throw campusDirectorsError;

        setTotalPrograms(programsCount || 0);
        setTotalProgramChairs(programChairsCount || 0);
        setTotalStudents(studentsCount || 0);
        setTotalDeans(deansCount || 0);
        setTotalCampusDirectors(campusDirectorsCount || 0);
      } catch (error) {
        console.error('❌ Error fetching metrics:', error);
        setTotalPrograms(0);
        setTotalProgramChairs(0);
        setTotalStudents(0);
        setTotalDeans(0);
        setTotalCampusDirectors(0);
      } finally {
        setIsLoadingMetrics(false);
      }
    };

    fetchMetrics();
  }, []);

  return (
    <div className="space-y-8">
      {/* Key Metrics */}
      <div>
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-slate-900">Key Metrics</h2>
          <p className="text-slate-600 mt-1">Overview of your institution's current status</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <StatCard
            title="Total Programs"
            value={isLoadingMetrics ? "..." : totalPrograms.toString()}
            icon={BookOpen}
            color="from-blue-500 to-cyan-500"
            trend=""
            description="Active program offerings"
          />
          <StatCard
            title="Total Faculty"
            value={isLoadingMetrics ? "..." : facultyCount.toString()}
            icon={Users}
            color="from-emerald-500 to-teal-500"
            trend=""
            description="Teaching staff members"
          />
          <StatCard
            title="Program Chairs"
            value={isLoadingMetrics ? "..." : totalProgramChairs.toString()}
            icon={Shield}
            color="from-amber-500 to-orange-500"
            trend=""
            description="Program chair accounts"
          />
          <StatCard
            title="Students"
            value={isLoadingMetrics ? "..." : totalStudents.toString()}
            icon={User}
            color="from-rose-500 to-pink-500"
            trend=""
            description="Enrolled students"
          />
          <StatCard
            title="Deans"
            value={isLoadingMetrics ? "..." : totalDeans.toString()}
            icon={UserCheck}
            color="from-indigo-500 to-sky-500"
            trend=""
            description="Dean accounts"
          />
          <StatCard
            title="Campus Directors"
            value={isLoadingMetrics ? "..." : totalCampusDirectors.toString()}
            icon={Landmark}
            color="from-amber-600 to-yellow-500"
            trend=""
            description="Campus director accounts"
          />
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon: Icon, color, trend, description }) {
  return (
    <div className="group bg-white rounded-2xl shadow-sm border border-slate-200 p-6 hover:shadow-lg hover:border-slate-300 transition-all duration-300">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">{title}</p>
          <p className="text-4xl font-bold text-slate-900 mb-1">{value}</p>
          <p className="text-xs text-slate-500">{description}</p>
        </div>
        <div className={`bg-gradient-to-br ${color} p-4 rounded-xl shadow-md group-hover:shadow-lg transition-all`}>
          <Icon size={28} className="text-white" />
        </div>
      </div>
      <div className="pt-4 border-t border-slate-100">
        <p className="text-xs font-semibold text-slate-600">{trend}</p>
      </div>
    </div>
  );
}

function ManagementCard({ title, description, icon: Icon, color, items }) {
  const colorClasses = {
    blue: "from-blue-50 to-cyan-50 border-blue-200",
    emerald: "from-emerald-50 to-teal-50 border-emerald-200",
    violet: "from-violet-50 to-purple-50 border-violet-200",
    orange: "from-orange-50 to-amber-50 border-orange-200",
  };

  const iconColorClasses = {
    blue: "from-blue-500 to-cyan-500",
    emerald: "from-emerald-500 to-teal-500",
    violet: "from-violet-500 to-purple-500",
    orange: "from-orange-500 to-amber-500",
  };

  return (
    <div className={`bg-gradient-to-br ${colorClasses[color]} rounded-2xl border p-6 hover:shadow-lg transition-all duration-300`}>
      <div className="flex items-start gap-4 mb-4">
        <div className={`bg-gradient-to-br ${iconColorClasses[color]} p-3 rounded-xl shadow-md`}>
          <Icon size={24} className="text-white" />
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-bold text-slate-900">{title}</h3>
          <p className="text-sm text-slate-600 mt-1">{description}</p>
        </div>
      </div>
      <div className="space-y-2 pt-4 border-t border-white/50">
        {items.map((item, idx) => (
          <div key={idx} className="flex items-center gap-2 text-sm text-slate-700">
            <div className={`w-1.5 h-1.5 rounded-full bg-gradient-to-r ${iconColorClasses[color]}`}></div>
            {item}
          </div>
        ))}
      </div>
    </div>
  );
}

function QuickActionButton({ label, icon: Icon, color }) {
  const colorClasses = {
    blue: "from-blue-500 to-blue-600 hover:shadow-blue-500/20",
    green: "from-green-500 to-green-600 hover:shadow-green-500/20",
    purple: "from-purple-500 to-purple-600 hover:shadow-purple-500/20",
    orange: "from-orange-500 to-orange-600 hover:shadow-orange-500/20",
  };

  return (
    <button
      className={`bg-gradient-to-br ${colorClasses[color]} text-white rounded-lg p-6 flex flex-col items-center justify-center gap-3 hover:shadow-lg transition-all duration-200 font-semibold text-sm`}
    >
      <Icon size={28} />
      {label}
    </button>
  );
}

function StatusItem({ label, status }) {
  const isOperational = status === "operational";

  return (
    <div className="flex items-center justify-between p-5 bg-white rounded-xl border border-slate-200 hover:border-slate-300 hover:shadow-sm transition-all">
      <div className="flex items-center gap-3">
        <div className={`w-3 h-3 rounded-full ${
          isOperational ? "bg-emerald-500 animate-pulse shadow-lg shadow-emerald-500/50" : "bg-red-500"
        }`}></div>
        <span className="text-sm font-semibold text-slate-700">{label}</span>
      </div>
      <span
        className={`text-xs font-bold px-3 py-1.5 rounded-full ${
          isOperational 
            ? "bg-emerald-50 text-emerald-700 border border-emerald-200" 
            : "bg-red-50 text-red-700 border border-red-200"
        }`}
      >
        {isOperational ? "Operational" : "Down"}
      </span>
    </div>
  );
}

export default DashboardUIAdmin;
