import React, { useEffect, useRef, useState } from "react";
import { Menu, ChevronDown, Settings as SettingsIcon, LogOut, AlignJustify } from "lucide-react";
import NotificationsPanel from './NotificationsPanel';

function FacultyHeader({ onMenuClick, user, facultyData, onAccountSettings = () => {}, onLogout = () => {}, isSidebarCollapsed = false, isSidebarLocked = false, onToggleSidebar = () => {}, onNavigateToSchedule = () => {} }) {
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [gender, setGender] = useState(facultyData?.gender || null);
  const dropdownRef = useRef(null);

  // Get user name from faculty data
  // Use useMemo to ensure reactive updates when facultyData changes
  const { firstName, lastName, fullName, initials } = React.useMemo(() => {
    const first = facultyData?.first_name || '';
    const last = facultyData?.last_name || '';
    const full = `${first} ${last}`.trim() || 'User';
    const init = `${first.charAt(0)}${last.charAt(0)}`.toUpperCase() || 'U';
    return { firstName: first, lastName: last, fullName: full, initials: init };
  }, [facultyData]);

  // Get profile color based on gender
  const getProfileColor = () => {
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


  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsUserMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Update gender when facultyData changes
  useEffect(() => {
    if (facultyData?.gender) {
      setGender(facultyData.gender);
    }
  }, [facultyData]);

  // Listen for gender updates from Settings component and real-time updates
  useEffect(() => {
    // Listen for profile updates (from Settings component)
    const handleFacultyProfileUpdated = (event) => {
      if (event.detail?.gender !== undefined) {
        setGender(event.detail.gender);
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
    
    window.addEventListener('facultyProfileUpdated', handleFacultyProfileUpdated);
    window.addEventListener('facultyDataUpdated', handleDataUpdate);
    return () => {
      window.removeEventListener('facultyProfileUpdated', handleFacultyProfileUpdated);
      window.removeEventListener('facultyDataUpdated', handleDataUpdate);
    };
  }, []);

  return (
    <div className="flex items-center justify-between px-6 py-4">
      <div className="flex items-center gap-4">
        {/* Mobile Menu Button */}
        <button
          onClick={onMenuClick}
          className="md:hidden p-2 hover:bg-transparent rounded-lg transition-colors focus:outline-none focus:ring-0 active:outline-none"
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
        {/* Notifications Panel */}
        <NotificationsPanel facultyId={facultyData?.id} onNavigateToSchedule={onNavigateToSchedule} onNotificationsClear={() => {}} />

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
              <p className="text-sm font-semibold text-slate-900">{fullName}</p>
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

export default FacultyHeader;
