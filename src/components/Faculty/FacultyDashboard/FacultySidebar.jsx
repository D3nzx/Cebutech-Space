import React from 'react';
import { LayoutDashboard, Calendar, BookOpen } from 'lucide-react';

function FacultySidebar({ isOpen, onClose, isCollapsed = false, activeSection, onSectionChange, isMobile = false, facultyData, user }) {
  const navItems = [
    { name: "Dashboard", icon: LayoutDashboard, section: "dashboard" },
    { name: "My Schedule", icon: Calendar, section: "schedule" },
  ];

  const handleNavClick = (section) => {
    onSectionChange(section);
    if (isMobile) {
      onClose();
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Logo Section */}
      <div className={`border-b border-slate-800/50 transition-all duration-300 ${(isCollapsed && !isOpen) ? "p-4" : "p-6"}`}>
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-red-600 via-red-500 to-orange-500 flex items-center justify-center shadow-lg shadow-red-600/30 flex-shrink-0">
            <BookOpen size={26} className="text-white" />
          </div>
          {(!isCollapsed || isOpen) && (
            <div className="overflow-hidden">
              <h1 className="text-base font-bold tracking-tight whitespace-nowrap">CTU Portal</h1>
            </div>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className={`flex-1 overflow-y-auto space-y-1.5 transition-all duration-300 hide-scrollbar ${(isCollapsed && !isOpen) ? "px-2 py-6" : "px-3 py-6"}`}>
        {navItems.map((item) => {
          return (
            <button
              key={item.section}
              onClick={() => handleNavClick(item.section)}
              className={`w-full flex items-center rounded-xl transition-all duration-200 text-sm font-medium group relative focus:outline-none focus:ring-0 active:outline-none ${
                (isCollapsed && !isOpen) ? "justify-center px-3 py-3" : "gap-3 px-4 py-3"
              } ${
                activeSection === item.section
                  ? "text-white"
                  : "text-slate-300 hover:text-white"
              }`}
              style={{ backgroundColor: "transparent", outline: "none", border: "none" }}
              onMouseDown={(e) => e.preventDefault()}
              title={isCollapsed ? item.name : ""}
            >
            <item.icon size={18} className="flex-shrink-0" />
            {(!isCollapsed || isOpen) && (
              <span className="whitespace-nowrap">{item.name}</span>
            )}
            {/* Tooltip for collapsed state */}
            {isCollapsed && (
              <div className="absolute left-full ml-2 px-3 py-2 bg-slate-900 text-white text-sm rounded-lg shadow-xl opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-200 whitespace-nowrap z-[100]">
                {item.name}
                <div className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-slate-900"></div>
              </div>
            )}
          </button>
          );
        })}
      </nav>
    </div>
  );
}

export default FacultySidebar;
