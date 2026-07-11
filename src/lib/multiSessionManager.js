const SESSION_KEYS = {
  FACULTY: 'faculty_sessions',
  PROGRAM_HEAD: 'programhead_sessions',
  ADMIN: 'admin_sessions',
  STUDENT: 'student_sessions',
  DEAN: 'dean_sessions'
};

const LEGACY_SESSION_DATA_KEYS = {
  FACULTY: 'faculty_session_data',
  PROGRAM_HEAD: 'programhead_session_data',
  ADMIN: 'admin_session_data',
  STUDENT: 'student_session_data',
  DEAN: 'dean_session_data'
};

export const saveRoleSession = (role, sessionData) => {
  const key = SESSION_KEYS[role.toUpperCase()];
  if (!key) {
    console.error(`Invalid role: ${role}`);
    return;
  }
  
  if (!sessionData.email || !sessionData.id) {
    console.error(`Session data must include email and id`);
    return;
  }
  
  try {
    const existingSessions = getRoleSessionsArray(role) || [];
    
    const existingIndex = existingSessions.findIndex(s => s.email === sessionData.email);
    
    const newSession = {
      ...sessionData,
      timestamp: Date.now(),
      role: role.toLowerCase(),
      sessionId: `${role}_${sessionData.email}_${Date.now()}`
    };
    
    if (existingIndex >= 0) {
      existingSessions[existingIndex] = newSession;
      console.log(`✅ Updated ${role} session for ${sessionData.email}`);
    } else {
      existingSessions.push(newSession);
      console.log(`✅ Added new ${role} session for ${sessionData.email}`);
    }
    
    localStorage.setItem(key, JSON.stringify(existingSessions));
    console.log(`📊 Total ${role} sessions: ${existingSessions.length}`);
  } catch (error) {
    console.error(`Error saving ${role} session:`, error);
  }
};

export const getRoleSessionsArray = (role) => {
  const key = SESSION_KEYS[role.toUpperCase()];
  if (!key) {
    console.error(`Invalid role: ${role}`);
    return [];
  }
  
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error(`Error retrieving ${role} sessions:`, error);
    return [];
  }
};

export const getRoleSession = (role, email = null) => {
  const sessions = getRoleSessionsArray(role);
  
  if (email) {
    return sessions.find(s => s.email === email) || null;
  }
  
  return sessions.length > 0 ? sessions[sessions.length - 1] : null;
};

export const clearRoleSession = (role, email = null) => {
  const key = SESSION_KEYS[role.toUpperCase()];
  if (!key) {
    console.error(`Invalid role: ${role}`);
    return;
  }
  
  try {
    if (email) {
      const sessions = getRoleSessionsArray(role);
      const filtered = sessions.filter(s => s.email !== email);
      
      if (filtered.length === 0) {
        localStorage.removeItem(key);
        console.log(`✅ Cleared ${role} session for ${email}`);
      } else {
        localStorage.setItem(key, JSON.stringify(filtered));
        console.log(`✅ Removed ${email} from ${role} sessions. Remaining: ${filtered.length}`);
      }
    } else {
      localStorage.removeItem(key);
      console.log(`✅ Cleared all ${role} sessions`);
    }
  } catch (error) {
    console.error(`Error clearing ${role} session:`, error);
  }
};

export const getAllActiveSessions = () => {
  const sessions = {};
  
  Object.entries(SESSION_KEYS).forEach(([roleKey, storageKey]) => {
    const role = roleKey.toLowerCase();
    const data = localStorage.getItem(storageKey);
    if (data) {
      try {
        const parsed = JSON.parse(data);
        sessions[role] = Array.isArray(parsed) ? parsed : [parsed];
      } catch (error) {
        console.error(`Error parsing ${role} sessions:`, error);
      }
    }
  });
  
  return sessions;
};

export const getRoleSessionCount = (role) => {
  return getRoleSessionsArray(role).length;
};

export const getRoleUsers = (role) => {
  const sessions = getRoleSessionsArray(role);
  return sessions.map(s => s.email);
};

export const hasRoleSession = (role) => {
  const session = getRoleSession(role);
  return session !== null;
};

export const clearAllSessions = () => {
  Object.values(SESSION_KEYS).forEach((key) => {
    localStorage.removeItem(key);
  });

  Object.values(LEGACY_SESSION_DATA_KEYS).forEach((key) => {
    localStorage.removeItem(key);
  });

  console.log('✅ Cleared all sessions');
};

export const getCurrentRole = (supabaseUser) => {
  if (!supabaseUser) return null;
  
  if (supabaseUser.email === 'dev-team@ctu.com') {
    return 'admin';
  }
  
  const isAdmin = localStorage.getItem('isAdmin') === 'true';
  if (isAdmin) return 'admin';
  
  const facultySession = getRoleSession('faculty');
  const programHeadSession = getRoleSession('programhead');
  const studentSession = getRoleSession('student');
  const deanSession = getRoleSession('dean');
  
  if (facultySession && facultySession.email === supabaseUser.email) {
    return 'faculty';
  }
  if (programHeadSession && programHeadSession.email === supabaseUser.email) {
    return 'programhead';
  }

  if (studentSession && studentSession.email === supabaseUser.email) {
    return 'student';
  }

  if (deanSession && deanSession.email === supabaseUser.email) {
    return 'dean';
  }
  
  return null;
};
