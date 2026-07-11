import React, { useCallback, useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { clearRoleSession, saveRoleSession } from "../../lib/multiSessionManager";
import { useNavigate, useLocation } from "react-router-dom";
import Sidebar from "../../components/Dean/DeanDashboard/Sidebar";
import Header from "../../components/Dean/DeanDashboard/Header";
import Dashboard from "../../components/Dean/DeanDashboard/Dashboard";
import Settings from "../../components/Dean/DeanDashboard/Settings";
import ScheduleReportsPage from './ScheduleReportsPage';
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
    const savedState = localStorage.getItem("deanSidebarLocked");
    return savedState !== null ? JSON.parse(savedState) : true;
  });
  const [activeSection, setActiveSection] = useState(() => {
    if (location.state?.activeTab) {
      return location.state.activeTab;
    }
    const savedSection = localStorage.getItem("deanActiveSection");
    return savedSection || "dashboard";
  });

  const [user, setUser] = useState(null);
  const [deanData, setDeanData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authModalMessage, setAuthModalMessage] = useState("");
  const [showAccessRestrictedModal, setShowAccessRestrictedModal] = useState(false);
  const [accessRestrictedMessage, setAccessRestrictedMessage] = useState("");

  const [showScrollbar, setShowScrollbar] = useState(false);
  const scrollbarTimeoutRef = React.useRef(null);

  useEffect(() => {
    document.title = "CTU Portal | Dean Dashboard";
  }, []);

  useEffect(() => {
    if (activeSection) {
      localStorage.setItem("deanActiveSection", activeSection);
    }
  }, [activeSection]);

  useEffect(() => {
    localStorage.setItem("deanSidebarLocked", JSON.stringify(isSidebarLocked));
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
    await signOutByRole("dean");
    localStorage.removeItem("deanActiveSection");
    localStorage.removeItem("isAuthenticated");
    localStorage.removeItem("deanCode");
    sessionStorage.removeItem("isAuthenticated");
    sessionStorage.removeItem("deanData");
    sessionStorage.removeItem("deanCode");
    clearRoleSession("dean");
    navigate("/dean/login", { replace: true });
  };

  const handleAccountSettings = () => {
    setActiveSection("settings");
    setIsSidebarOpen(false);
  };

  const handleDeanDataSaved = (updatedDeanData) => {
    setDeanData(updatedDeanData);
  };

  useEffect(() => {
    let deanChannel = null;
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
            navigate("/dean/login", { replace: true });
            return;
          }

          localStorage.removeItem("isAuthenticated");
          sessionStorage.removeItem("isAuthenticated");
          setIsLoading(false);
          setUser(null);
          navigate("/dean/login", { replace: true });
          return;
        }

        try {
          const { data: deanDataFetch, error: deanError } = await supabase
            .from("deans")
            .select("id, dean_code")
            .eq("auth_user_id", currentUser.id)
            .single();

          if (deanError) {
            if (deanError.code === "PGRST116") {
              localStorage.removeItem("isAuthenticated");
              sessionStorage.removeItem("isAuthenticated");
              sessionStorage.removeItem("deanData");
              sessionStorage.removeItem("deanCode");
              localStorage.removeItem("deanCode");
              setIsLoading(false);
              setUser(null);
              navigate("/dean/login", { replace: true });
              return;
            }
          }

          if (deanDataFetch && !deanDataFetch.dean_code) {
            localStorage.removeItem("isAuthenticated");
            sessionStorage.removeItem("isAuthenticated");
            sessionStorage.removeItem("deanData");
            sessionStorage.removeItem("deanCode");
            localStorage.removeItem("deanCode");
            setIsLoading(false);
            setUser(null);
            navigate("/dean/login", { replace: true });
            return;
          }
        } catch (fetchError) {
          localStorage.removeItem("isAuthenticated");
          sessionStorage.removeItem("isAuthenticated");
          setIsLoading(false);
          setUser(null);
          navigate("/dean/login", { replace: true });
          return;
        }

        const { data: fullDeanData, error: fullFetchError } = await supabase
          .from("deans")
          .select("*")
          .eq("auth_user_id", currentUser.id)
          .single();

        if (fullDeanData) {
          setDeanData(fullDeanData);

          sessionStorage.setItem("deanData", JSON.stringify(fullDeanData));
          sessionStorage.setItem("deanCode", fullDeanData.dean_code);
          localStorage.setItem("deanCode", fullDeanData.dean_code);

          if (fullDeanData.is_active !== true) {
            setAccessRestrictedMessage("Your account is inactive or pending approval. Please contact the administration for assistance.");
            setShowAccessRestrictedModal(true);
          }
        } else if (fullFetchError) {
          setDeanData(null);
        } else {
          setDeanData(null);
        }

        setUser(currentUser);

        saveRoleSession("dean", {
          email: currentUser.email,
          id: currentUser.id,
          loginTime: Date.now(),
        });

        try {
          deanChannel = supabase
            .channel(`dean_changes_${currentUser.id}`)
            .on(
              "postgres_changes",
              {
                event: "*",
                schema: "public",
                table: "deans",
                filter: `auth_user_id=eq.${currentUser.id}`,
              },
              async (payload) => {
                if (payload.eventType === "DELETE") {
                  setDeanData(null);
                  window.dispatchEvent(
                    new CustomEvent("deanDataUpdated", {
                      detail: { data: null, eventType: "DELETE" },
                    })
                  );
                  return;
                }

                try {
                  const { data: { user: refreshUser } } = await supabase.auth.getUser();
                  if (refreshUser) {
                    const { data: deanDataFetch, error } = await supabase
                      .from("deans")
                      .select("*")
                      .eq("auth_user_id", refreshUser.id)
                      .single();

                    if (!error && deanDataFetch) {
                      if (deanDataFetch.is_active === false) {
                        setAccessRestrictedMessage("Your account has been disabled. Please contact the administration for assistance.");
                        setShowAccessRestrictedModal(true);
                        return;
                      }

                      setDeanData(deanDataFetch);
                      sessionStorage.setItem("deanData", JSON.stringify(deanDataFetch));
                      window.dispatchEvent(
                        new CustomEvent("deanDataUpdated", {
                          detail: { data: deanDataFetch, eventType: payload.eventType, gender: deanDataFetch.gender },
                        })
                      );
                      window.dispatchEvent(new CustomEvent("deanProfileUpdated", { detail: { gender: deanDataFetch.gender } }));
                    } else if (error && error.code === "PGRST116") {
                      setDeanData(null);
                      window.dispatchEvent(
                        new CustomEvent("deanDataUpdated", { detail: { data: null, eventType: "DELETE" } })
                      );
                    }
                  }
                } catch (err) {
                  console.error("❌ Error refreshing dean data:", err);
                }
              }
            )
            .subscribe();

          pollingInterval = setInterval(async () => {
            try {
              if (currentUser) {
                const { data: deanDataFetch, error } = await supabase
                  .from("deans")
                  .select("*")
                  .eq("auth_user_id", currentUser.id)
                  .single();

                if (!error && deanDataFetch) {
                  if (deanDataFetch.is_active === false) {
                    setAccessRestrictedMessage("Your account has been disabled. Please contact the administration for assistance.");
                    setShowAccessRestrictedModal(true);
                    return;
                  }

                  setDeanData((prev) => {
                    if (prev && JSON.stringify(prev) !== JSON.stringify(deanDataFetch)) {
                      sessionStorage.setItem("deanData", JSON.stringify(deanDataFetch));
                      window.dispatchEvent(
                        new CustomEvent("deanDataUpdated", {
                          detail: { data: deanDataFetch, eventType: "UPDATE", gender: deanDataFetch.gender },
                        })
                      );
                      return deanDataFetch;
                    }
                    return prev || deanDataFetch;
                  });
                }
              }
            } catch (err) {
              console.error("Error in polling:", err);
            }
          }, 15000);
        } catch (err) {
          console.error("❌ Error setting up real-time subscription:", err);
        }
      } catch (err) {
        localStorage.removeItem("isAuthenticated");
        sessionStorage.removeItem("isAuthenticated");
        setUser(null);
        setIsLoading(false);
        navigate("/dean/login", { replace: true });
        return;
      } finally {
        setIsLoading(false);
      }
    };

    fetchUser();

    return () => {
      if (deanChannel) {
        supabase.removeChannel(deanChannel);
      }
      if (pollingInterval) {
        clearInterval(pollingInterval);
      }
    };
  }, [navigate]);

  useEffect(() => {
    if (!user) return;

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session && user && session.user.id !== user.id) {
        return;
      }

      if (
        sessionStorage.getItem("_roleSignOut_faculty") ||
        sessionStorage.getItem("_roleSignOut_admin") ||
        sessionStorage.getItem("_roleSignOut_student") ||
        sessionStorage.getItem("_roleSignOut_programhead")
      ) {
        return;
      }

      if (event === "SIGNED_OUT") {
        if (!session && user) {
          clearRoleSession("dean");
          navigate("/dean/login", { replace: true });
        }
      } else if (event === "USER_DELETED") {
        if (user) {
          const securityNotice = "Security Notice: Your dean account has been deleted. Please contact the administrator if this action was unexpected.";
          sessionStorage.setItem(
            "authSecurityNotice",
            JSON.stringify({ message: securityNotice, target: "dean", timestamp: Date.now() })
          );
          setUser(null);
          setAuthModalMessage(securityNotice);
          setShowAuthModal(true);
          localStorage.removeItem("isAuthenticated");
          sessionStorage.removeItem("isAuthenticated");
        }
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [user, navigate]);

  const renderContent = () => {
    switch (activeSection) {
      case "dashboard":
        return <Dashboard />;
      case "settings":
        return <Settings user={user} deanData={deanData} onDataSaved={handleDeanDataSaved} />;
      case "reports":
        return <ScheduleReportsPage deanData={deanData} />;
      default:
        return <Dashboard />;
    }
  };

  if (isLoading) {
    return <LoadingScreen variant="dean" />;
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
              onClick={() => {
                setShowAccessRestrictedModal(false);
                navigate("/dean/login", { replace: true });
              }}
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
            onClick={() => {
              setShowAuthModal(false);
              navigate("/dean/login", { replace: true });
            }}
            className="w-full px-6 py-3 bg-[rgb(66_133_244_/_1)] text-white rounded-xl font-semibold hover:shadow-lg transition-all"
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
        className={`fixed md:relative inset-y-0 left-0 z-40 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-white shadow-2xl transform transition-all duration-300 ease-in-out md:translate-x-0 ${
          isSidebarOpen ? "translate-x-0" : "-translate-x-full"
        } ${isSidebarCollapsed ? "md:w-20" : "md:w-64"} w-64`}
      >
        <Sidebar
          isOpen={isSidebarOpen}
          isCollapsed={isSidebarCollapsed}
          onClose={() => setIsSidebarOpen(false)}
          activeSection={activeSection}
          onSectionChange={handleSectionChange}
          isMobile={false}
        />
      </aside>

      <div className="flex-1 flex flex-col overflow-hidden transition-all duration-300">
        <header className="bg-white border-b border-slate-200 shadow-sm sticky top-0 z-30">
          <Header
            onMenuClick={() => setIsSidebarOpen(!isSidebarOpen)}
            user={user}
            deanData={deanData}
            onAccountSettings={handleAccountSettings}
            onLogout={handleLogout}
            isSidebarLocked={isSidebarLocked}
            onToggleSidebar={handleToggleCollapse}
          />
        </header>

        <main
          className="flex-1 overflow-x-hidden overflow-y-auto bg-slate-50"
          onScroll={handleScrollbarVisibility}
          style={{
            scrollbarWidth: showScrollbar ? "auto" : "none",
            msOverflowStyle: showScrollbar ? "auto" : "none",
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
              background: ${showScrollbar ? "#cbd5e1" : "transparent"};
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
        <div className="fixed inset-0 bg-black/50 z-30 md:hidden" onClick={() => setIsSidebarOpen(false)}></div>
      )}
    </div>
  );
}

export default DashboardPage;
