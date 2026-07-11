import React from "react";
import { Users, Calendar, BarChart, LayoutDashboard, X, BookOpen, Book, MapPin, Briefcase } from "lucide-react";

function Sidebar({ isOpen, onClose, isCollapsed = false, activeSection, onSectionChange, isMobile = false, user }) {
  // Roles-based navigation items
  const allNavItems = [
    // Hide Dashboard for admin
    ...(user?.email !== 'dev-team@ctu.com' ? [
      { name: "Dashboard", icon: LayoutDashboard, section: "dashboard", roles: ["user"] },
    ] : []),
    { name: "Programs", icon: BookOpen, section: "courses", roles: ["admin"] },
    { name: "Class Management", icon: Calendar, section: "scheduling", roles: ["user"] },
    { name: "Subjects", icon: Book, section: "subjects", roles: ["user"] },
    { name: "Faculty Management", icon: Users, section: "faculty", roles: ["admin"] },
    { name: "Room Utilization", icon: MapPin, section: "locations", roles: ["user"] },
    { name: "Reports", icon: BarChart, section: "reports", roles: ["user"] },
  ];

  // Determine role based on email
  const role = user?.email === "dev-team@ctu.com" ? "admin" : "user";

  // Filter nav items by role
  const navItems = allNavItems.filter(item => item.roles.includes(role));

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
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-red-900 via-red-700 to-red-600 flex items-center justify-center shadow-lg shadow-red-600/30 flex-shrink-0">
              <Briefcase size={26} className="text-white" />
            </div>
            {(!isCollapsed || isOpen) && (
              <div className="overflow-hidden">
                <h1 className="text-base font-bold tracking-tight whitespace-nowrap">CTU Portal</h1>
              </div>
            )}
          </div>
          {isMobile && (
            <button
              onClick={onClose}
              className="inline-flex items-center justify-center p-2 rounded-xl text-slate-200 hover:text-white hover:bg-slate-800 transition-colors"
              aria-label="Close menu"
            >
              <X size={20} />
            </button>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className={`flex-1 overflow-y-auto space-y-1.5 transition-all duration-300 hide-scrollbar ${(isCollapsed && !isOpen) ? "px-2 py-6" : "px-3 py-6"}`}>
        {navItems.map((item) => {
          // Admin items (Programs, Subjects, Faculty, Locations) get background, user items (Dashboard, Scheduling, Reports) don't
          const isAdminItem = ["courses", "faculty"].includes(item.section);
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
              style={isAdminItem ? { backgroundColor: "#0f172a", outline: "none", border: "none" } : { backgroundColor: "transparent", outline: "none", border: "none" }}
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

export default Sidebar;


