import React, { useEffect, useMemo, useState } from "react";

import ProgramHeadManagement from "../../ProgramHead/ProgramHeadDashboard/ProgramHeadManagement";
import DeanManagement from "./DeanManagement";
import CampusDirectorManagement from "./CampusDirectorManagement";
import FacultyManagement from "../../ProgramHead/ProgramHeadDashboard/FacultyManagement";
import StudentManagement from "./StudentManagement";

const STORAGE_KEY = "adminAccountManagementUserType";

const USER_TYPE_OPTIONS = [
  { value: "programHeads", label: "Program Chair" },
  { value: "deans", label: "Dean" },
  { value: "campusDirectors", label: "Campus Director" },
  { value: "faculty", label: "Faculty" },
  { value: "students", label: "Student" },
];

function AccountManagement({ initialUserType }) {
  const defaultUserType = useMemo(() => {
    if (initialUserType && USER_TYPE_OPTIONS.some((o) => o.value === initialUserType)) {
      return initialUserType;
    }

    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && USER_TYPE_OPTIONS.some((o) => o.value === stored)) {
      return stored;
    }

    return "programHeads";
  }, [initialUserType]);

  const [userType, setUserType] = useState(defaultUserType);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, userType);
  }, [userType]);

  const managementView = useMemo(() => {
    switch (userType) {
      case "programHeads":
        return <ProgramHeadManagement />;
      case "deans":
        return <DeanManagement />;
      case "campusDirectors":
        return <CampusDirectorManagement />;
      case "faculty":
        return <FacultyManagement />;
      case "students":
        return <StudentManagement />;
      default:
        return <ProgramHeadManagement />;
    }
  }, [userType]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Account Management</h2>
          <p className="text-slate-600 mt-1">
            Manage all user accounts and control access across roles
          </p>
        </div>

        <div className="flex items-center gap-3">
          <label className="text-sm font-semibold text-slate-700" htmlFor="admin-account-user-type">
            User Type
          </label>
          <select
            id="admin-account-user-type"
            value={userType}
            onChange={(e) => setUserType(e.target.value)}
            className="min-w-[220px] rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {USER_TYPE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {managementView}
    </div>
  );
}

export default AccountManagement;
