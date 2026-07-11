import React, { useEffect, useRef, useState } from "react";
import { Menu, ChevronDown, Settings as SettingsIcon, LogOut, AlignJustify, X } from "lucide-react";
import { supabase } from "../../../lib/supabaseClient";
import ProgramHeadNotificationsPanel from "./ProgramHeadNotificationsPanel";

function Header({ onMenuClick, user, programHeadData, onAccountSettings = () => {}, onLogout = () => {}, isSidebarCollapsed = false, isSidebarLocked = false, onToggleSidebar = () => {} }) {
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [gender, setGender] = useState(null);
  const dropdownRef = useRef(null);
  const notificationRef = useRef(null);

  // Get user name and initials from programHeadData or user metadata
  // Show custom name and role for admin
  // Use useMemo to ensure reactive updates when programHeadData changes
  const isAdmin = user?.email === 'dev-team@ctu.com';
  
  const { firstName, lastName, fullName, initials } = React.useMemo(() => {
    if (isAdmin) {
      return {
        firstName: 'Dev',
        lastName: '7',
        fullName: 'Dev 7',
        initials: 'D7'
      };
    }
    
    const first = programHeadData?.first_name || user?.user_metadata?.firstName || user?.user_metadata?.first_name || '';
    const last = programHeadData?.last_name || user?.user_metadata?.lastName || user?.user_metadata?.last_name || '';
    const full = `${first} ${last}`.trim() || 'User';
    const init = `${first.charAt(0)}${last.charAt(0)}`.toUpperCase() || 'U';
    
    return { firstName: first, lastName: last, fullName: full, initials: init };
  }, [programHeadData, user, isAdmin]);

  // Update name and gender when programHeadData changes
  useEffect(() => {
    if (programHeadData) {
      // Update gender if available
      if (programHeadData.gender) {
        setGender(programHeadData.gender);
      }
    }
  }, [programHeadData]);

  // Fetch gender from program_heads table (fallback if programHeadData not available)
  useEffect(() => {
    const fetchGender = async () => {
      if (!user || isAdmin) return;
      
      // If programHeadData is available, use it directly
      if (programHeadData && programHeadData.gender) {
        setGender(programHeadData.gender);
        return;
      }
      
      try {
        const { data: { user: currentUser } } = await supabase.auth.getUser();
        if (!currentUser) return;

        const { data, error } = await supabase
          .from('program_heads')
          .select('gender')
          .eq('auth_user_id', currentUser.id)
          .single();

        if (!error && data) {
          setGender(data.gender);
        }
      } catch (error) {
        console.error('Error fetching gender:', error);
      }
    };

    fetchGender();

    // Listen for profile updates (from Settings component)
    const handleProfileUpdate = (event) => {
      if (event.detail?.gender !== undefined) {
        setGender(event.detail.gender);
      } else {
        // If no gender in event, refetch
        fetchGender();
      }
    };

    // Listen for data updates (from real-time subscription)
    const handleDataUpdate = (event) => {
      if (event.detail?.data) {
        // Update gender if available in the updated data
        if (event.detail.data.gender !== undefined) {
          setGender(event.detail.data.gender);
        }
      } else if (event.detail?.gender !== undefined) {
        setGender(event.detail.gender);
      }
    };

    window.addEventListener('programHeadProfileUpdated', handleProfileUpdate);
    window.addEventListener('programHeadDataUpdated', handleDataUpdate);
    return () => {
      window.removeEventListener('programHeadProfileUpdated', handleProfileUpdate);
      window.removeEventListener('programHeadDataUpdated', handleDataUpdate);
    };
  }, [user, isAdmin, programHeadData]);

  // Get profile color based on gender
  const getProfileColor = () => {
    if (isAdmin) {
      return 'bg-gradient-to-br from-amber-400 via-orange-500 to-rose-500';
    }

    if (!gender || gender.trim() === '') {
      // Not Specified - Amber/Gold
      return 'bg-gradient-to-br from-amber-400 via-amber-500 to-amber-600';
    }

    switch (gender) {
      case 'Male':
        // Blue (#3B82F6)
        return 'bg-gradient-to-br from-blue-400 via-blue-500 to-blue-600';
      case 'Female':
        // Pink (#EC4899)
        return 'bg-gradient-to-br from-pink-400 via-pink-500 to-pink-600';
      case 'Another gender identity':
        // Purple (#A855F7)
        return 'bg-gradient-to-br from-purple-400 via-purple-500 to-purple-600';
      case 'Prefer not to say':
        // Gray (#6B7280)
        return 'bg-gradient-to-br from-gray-400 via-gray-500 to-gray-600';
      default:
        // Not Specified or custom - Amber/Gold
        return 'bg-gradient-to-br from-amber-400 via-amber-500 to-amber-600';
    }
  };

  // Fetch notifications (sample data for now - can be replaced with real API call)
  useEffect(() => {
    // Sample notifications - replace with actual API call
    const sampleNotifications = [
      {
        id: 1,
        type: 'warning',
        title: 'Pending Scheduling Requests',
        message: 'You have 2 requests awaiting your attention',
        time: '5 minutes ago',
        read: false
      },
      {
        id: 2,
        type: 'info',
        title: 'Schedule Updated',
        message: 'A schedule has been modified by another Program Head',
        time: '1 hour ago',
        read: false
      },
      {
        id: 3,
        type: 'success',
        title: 'Schedule Approved',
        message: 'Your schedule request has been approved',
        time: '2 hours ago',
        read: true
      }
    ];
    setNotifications(sampleNotifications);
  }, []);

  const unreadCount = notifications.filter(n => !n.read).length;

  const markAsRead = (id) => {
    setNotifications(notifications.map(n => 
      n.id === id ? { ...n, read: true } : n
    ));
  };

  const markAllAsRead = () => {
    setNotifications(notifications.map(n => ({ ...n, read: true })));
  };

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target) &&
          notificationRef.current && !notificationRef.current.contains(event.target)) {
        setIsNotificationOpen(false);
        setIsUserMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="flex items-center justify-between px-4 py-3 md:px-6 md:py-4">
      <div className="flex items-center gap-3">
        {/* Mobile Menu Button */}
        <button
          onClick={onMenuClick}
          className="md:hidden p-2 hover:bg-slate-100 rounded-lg transition-colors focus:outline-none focus:ring-0 active:outline-none"
          style={{ outline: 'none', border: 'none', backgroundColor: 'transparent' }}
          onMouseDown={(e) => e.preventDefault()}
        >
          <Menu size={24} />
        </button>
        
        {/* Sidebar Lock/Unlock Toggle - Desktop Only */}
        <button
          onClick={onToggleSidebar}
          className={`hidden md:flex items-center justify-center p-2 rounded-lg transition-all duration-200 relative group bg-transparent focus:outline-none focus:ring-0 active:outline-none text-slate-600 hover:text-slate-700`}
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

      <div className="flex items-center gap-3" ref={dropdownRef}>

        {/* Program Head Notifications Panel */}
        <ProgramHeadNotificationsPanel programHeadId={programHeadData?.id} />

        <div className="w-px h-6 bg-slate-200"></div>

        <div className="relative">
          <button
            onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
            className="flex items-center gap-3 px-3 py-2 hover:bg-slate-100 rounded-lg transition-colors focus:outline-none focus:ring-0"
            style={{ outline: 'none', border: 'none', backgroundColor: 'rgb(255 255 255 / 0.05)' }}
            onMouseDown={(e) => e.preventDefault()}
          >
            <div className={`w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-md ${getProfileColor()}`}>
              {initials}
            </div>
            <div className="text-left hidden sm:block">
              <p className="text-sm font-semibold text-slate-900">{isAdmin ? 'Administrator' : fullName}</p>
            </div>
            <ChevronDown size={16} className={`text-slate-600 transition-transform ${isUserMenuOpen ? "rotate-180" : ""}`} />
          </button>

          {isUserMenuOpen && (
            <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-slate-200 z-50 overflow-hidden">
              <div className="px-4 py-3 bg-slate-50 border-b border-slate-200">
                <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Account</p>
              </div>
              <button
                onClick={() => {
                  onAccountSettings();
                  setIsUserMenuOpen(false);
                }}
                className="w-full text-left px-4 py-3 hover:bg-slate-50 text-sm text-slate-700 font-medium flex items-center gap-2 transition-colors"
                style={{ backgroundColor: 'rgb(255 255 255 / 0.05)' }}
              >
                <SettingsIcon size={16} />
                Account Settings
              </button>
              <div className="border-t border-slate-200"></div>
              <button
                onClick={() => {
                  setIsUserMenuOpen(false);
                  onLogout();
                }}
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
  );
}

export default Header;