import React, { useCallback, useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { clearRoleSession, saveRoleSession } from "../../lib/multiSessionManager";
import { useNavigate, useLocation } from "react-router-dom";
import Sidebar from "../../components/CampusDirector/CampusDirectorDashboard/Sidebar";
import Header from "../../components/CampusDirector/CampusDirectorDashboard/Header";
import Dashboard from "../../components/CampusDirector/CampusDirectorDashboard/Dashboard";
import Settings from "../../components/CampusDirector/CampusDirectorDashboard/Settings";
import CampusDirectorReports from "../../components/CampusDirector/CampusDirectorDashboard/CampusDirectorReports";
import Login from "./Login";
import { signOutByRole } from "../../api/auth";
import LoadingScreen from "../../components/LoadingScreen";

function DashboardPage() {
  const navigate = useNavigate();
  const location = useLocation();

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isHoveringSidebar, setIsHoveringSidebar] = useState(false);
  const [isSidebarLocked, setIsSidebarLocked] = useState(() => {
    const savedState = localStorage.getItem("campusDirectorSidebarLocked");
    return savedState !== null ? JSON.parse(savedState) : true;
  });
  const [activeSection, setActiveSection] = useState(() => {
    if (location.state?.activeTab) {
      return location.state.activeTab;
    }
    const savedSection = localStorage.getItem("campusDirectorActiveSection");
    return savedSection || "dashboard";
  });

  const [user, setUser] = useState(null);
  const [campusDirectorData, setCampusDirectorData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authModalMessage, setAuthModalMessage] = useState("");
  const [showAccessRestrictedModal, setShowAccessRestrictedModal] = useState(false);
  const [accessRestrictedMessage, setAccessRestrictedMessage] = useState("");

  const [showScrollbar, setShowScrollbar] = useState(false);
  const scrollbarTimeoutRef = React.useRef(null);

  useEffect(() => {
    document.title = "CTU Portal | Campus Director Dashboard";
  }, []);

  useEffect(() => {
    if (activeSection) {
      localStorage.setItem("campusDirectorActiveSection", activeSection);
    }
  }, [activeSection]);

  useEffect(() => {
    localStorage.setItem("campusDirectorSidebarLocked", JSON.stringify(isSidebarLocked));
  }, [isSidebarLocked]);

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

  const handleToggleCollapse = () => {
    setIsSidebarCollapsed(!isSidebarCollapsed);
    setIsSidebarLocked(!isSidebarLocked);
  };

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

  const handleLogout = async () => {
    await signOutByRole("campus_director");
    localStorage.removeItem("campusDirectorActiveSection");
    localStorage.removeItem("isAuthenticated");
    localStorage.removeItem("campusDirectorCode");
    sessionStorage.removeItem("isAuthenticated");
    sessionStorage.removeItem("campusDirectorData");
    sessionStorage.removeItem("campusDirectorCode");
    clearRoleSession("campus_director");
    navigate("/campusdirector/login", { replace: true });
  };

  const handleAccountSettings = () => {
    setActiveSection("settings");
    setIsSidebarOpen(false);
  };

  const handleCampusDirectorDataSaved = (updatedCampusDirectorData) => {
    setCampusDirectorData(updatedCampusDirectorData);
  };

  useEffect(() => {
    let campusDirectorChannel = null;
    let pollingInterval = null;

    const fetchUser = async () => {
      try {
        const hasStoredAuth =
          localStorage.getItem("isAuthenticated") === "true" ||
          sessionStorage.getItem("isAuthenticated") === "true";

        let { data: { user: currentUser }, error: userError } = await supabase.auth.getUser();

        if (!currentUser && hasStoredAuth) {
          const { getCurrentUserWithRetry, restoreSessionFromStorage } = await import("../../lib/supabaseClient");
          await restoreSessionFromStorage();
          const result = await getCurrentUserWithRetry();
          currentUser = result.user;
          userError = result.error;
        }

        if (currentUser && !userError) {
          localStorage.setItem("isAuthenticated", "true");
          sessionStorage.setItem("isAuthenticated", "true");
        } else {
          if (!hasStoredAuth) {
            setIsLoading(false);
            setUser(null);
            navigate("/campusdirector/login", { replace: true });
            return;
          }

          localStorage.removeItem("isAuthenticated");
          sessionStorage.removeItem("isAuthenticated");
          setIsLoading(false);
          setUser(null);
          navigate("/campusdirector/login", { replace: true });
          return;
        }

        try {
          const { data: campusDirectorDataFetch, error: campusDirectorError } = await supabase
            .from("campus_directors")
            .select("id, campus_director_code")
            .eq("auth_user_id", currentUser.id)
            .single();

          if (campusDirectorError) {
            if (campusDirectorError.code === "PGRST116") {
              localStorage.removeItem("isAuthenticated");
              sessionStorage.removeItem("isAuthenticated");
              sessionStorage.removeItem("campusDirectorData");
              sessionStorage.removeItem("campusDirectorCode");
              localStorage.removeItem("campusDirectorCode");
              setIsLoading(false);
              setUser(null);
              navigate("/campusdirector/login", { replace: true });
              return;
            }
          }

          if (campusDirectorDataFetch && !campusDirectorDataFetch.campus_director_code) {
            localStorage.removeItem("isAuthenticated");
            sessionStorage.removeItem("isAuthenticated");
            sessionStorage.removeItem("campusDirectorData");
            sessionStorage.removeItem("campusDirectorCode");
            localStorage.removeItem("campusDirectorCode");
            setIsLoading(false);
            setUser(null);
            navigate("/campusdirector/login", { replace: true });
            return;
          }
        } catch (fetchError) {
          localStorage.removeItem("isAuthenticated");
          sessionStorage.removeItem("isAuthenticated");
          setIsLoading(false);
          setUser(null);
          navigate("/campusdirector/login", { replace: true });
          return;
        }

        const { data: fullCampusDirectorData, error: fullFetchError } = await supabase
          .from("campus_directors")
          .select("*")
          .eq("auth_user_id", currentUser.id)
          .single();

        if (fullCampusDirectorData) {
          setCampusDirectorData(fullCampusDirectorData);

          sessionStorage.setItem("campusDirectorData", JSON.stringify(fullCampusDirectorData));
          sessionStorage.setItem("campusDirectorCode", fullCampusDirectorData.campus_director_code);
          localStorage.setItem("campusDirectorCode", fullCampusDirectorData.campus_director_code);

          if (fullCampusDirectorData.is_active !== true) {
            setAccessRestrictedMessage("Your account is inactive or pending approval. Please contact the administration for assistance.");
            setShowAccessRestrictedModal(true);
          }
        } else if (fullFetchError) {
          setCampusDirectorData(null);
        } else {
          setCampusDirectorData(null);
        }

        setUser(currentUser);

        saveRoleSession("campus_director", {
          email: currentUser.email,
          id: currentUser.id,
          loginTime: Date.now(),
        });

        try {
          campusDirectorChannel = supabase
            .channel(`campus_director_changes_${currentUser.id}`)
            .on(
              "postgres_changes",
              {
                event: "*",
                schema: "public",
                table: "campus_directors",
                filter: `auth_user_id=eq.${currentUser.id}`,
              },
              (payload) => {
                if (payload.eventType === "UPDATE") {
                  setCampusDirectorData(payload.new);
                  window.dispatchEvent(
                    new CustomEvent("campusDirectorDataUpdated", {
                      detail: { data: payload.new },
                    })
                  );
                }
              }
            )
            .subscribe();
        } catch (err) {
          console.error("Error setting up real-time listener:", err);
        }

        setIsLoading(false);
      } catch (err) {
        console.error("Error checking authentication:", err);
        localStorage.removeItem("isAuthenticated");
        sessionStorage.removeItem("isAuthenticated");
        setIsLoading(false);
        setUser(null);
        navigate("/campusdirector/login", { replace: true });
      }
    };

    fetchUser();

    return () => {
      if (campusDirectorChannel) {
        supabase.removeChannel(campusDirectorChannel);
      }
      if (pollingInterval) {
        clearInterval(pollingInterval);
      }
    };
  }, [navigate]);

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (!user) {
    return <Login />;
  }

  return (
    <div className="flex h-screen bg-slate-100 overflow-hidden" onWheel={handleScrollbarVisibility}>
      {/* Sidebar */}
      <div
        className={`fixed md:relative z-40 bg-slate-950 h-full border-r border-slate-800/50 transition-all duration-300 ${
          isSidebarOpen || !isSidebarCollapsed ? "w-64" : "w-20"
        }`}
        style={{ scrollbarWidth: showScrollbar ? "auto" : "none" }}
        onMouseEnter={() => setIsHoveringSidebar(true)}
        onMouseLeave={() => setIsHoveringSidebar(false)}
      >
        <Sidebar
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
          isCollapsed={isSidebarCollapsed}
          activeSection={activeSection}
          onSectionChange={handleSectionChange}
          isMobile={window.innerWidth < 768}
        />
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <Header
          onMenuClick={() => setIsSidebarOpen(true)}
          user={user}
          campusDirectorData={campusDirectorData}
          onAccountSettings={handleAccountSettings}
          onLogout={handleLogout}
          isSidebarLocked={isSidebarLocked}
          onToggleSidebar={handleToggleCollapse}
        />

        {/* Content area */}
        <div className="flex-1 overflow-auto">
          <div className="p-6 max-w-full">
            {activeSection === "dashboard" && <Dashboard />}
            {activeSection === "settings" && (
              <Settings user={user} campusDirectorData={campusDirectorData} onDataSaved={handleCampusDirectorDataSaved} />
            )}
            {activeSection === "reports" && (
              <CampusDirectorReports campusDirectorData={campusDirectorData} />
            )}
          </div>
        </div>
      </div>

      {/* Overlay for mobile */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 md:hidden z-30"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Access Restricted Modal */}
      {showAccessRestrictedModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-sm">
            <h2 className="text-2xl font-bold text-slate-900 mb-4">Access Restricted</h2>
            <p className="text-slate-600 mb-6">{accessRestrictedMessage}</p>
            <button
              onClick={handleLogout}
              className="w-full px-6 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-colors"
            >
              Return to Login
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default DashboardPage;
