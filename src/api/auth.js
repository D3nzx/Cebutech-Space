import { supabase } from '../lib/supabaseClient';
import { notifyAdminForRegistration } from './notifications';


const generateUuid = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};


async function signOutSilently() {
  try {
    sessionStorage.setItem('_silentSignOut', 'true');
    await supabase.auth.signOut();
    sessionStorage.removeItem('_silentSignOut');
  } catch (error) {
    console.error('Error during silent sign out:', error);
  }
}

export const createPendingRegistration = async ({
  authUserId,
  userType,
  email,
  firstName,
  middleName,
  lastName,
  college,
  program,
  yearLevel,
  section,
  extraData,
}) => {
  const pendingId = generateUuid();

  const { error } = await supabase
    .from('pending_registrations')
    .insert({
      id: pendingId,
      auth_user_id: authUserId,
      user_type: userType,
      email,
      first_name: firstName,
      middle_name: middleName || null,
      last_name: lastName,
      college: college || null,
      program: program || null,
      year_level: yearLevel || null,
      section: section || null,
      extra_data: extraData || null,
      status: 'pending',
    });

  if (error) {
    console.error('Error creating pending registration:', error);
    return { data: null, error };
  }

  const { error: notifyError } = await notifyAdminForRegistration({
    userId: pendingId,
    userType,
    userEmail: email,
    userName: `${firstName} ${lastName}`,
  });

  if (notifyError) {
    console.error('Error notifying admins about pending registration:', notifyError);
  }

  return { data: { id: pendingId }, error: null };
};


export async function checkProgramHeadExists(college, program) {
  try {
    const { data, error } = await supabase
      .from('program_heads')
      .select('id, email, first_name, last_name')
      .eq('college', college)
      .eq('program', program)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error checking for existing program head:', error);
      return { exists: false, error };
    }

    if (data) {
      return { exists: true, programHead: data, error: null };
    }

    return { exists: false, error: null };
  } catch (err) {
    console.error('Unexpected error checking program head existence:', err);
    return { exists: false, error: err };
  }
}


export async function signUp({ email, password, firstName, lastName, college, program }) {
  try {
    
    let collegeName = college;
    let programName = program;

    
    if (college && college.length === 36 && college.includes('-')) {
      collegeName = await getCollegeNameById(college);
      if (!collegeName) {
        console.error('Failed to fetch college name for ID:', college);
        return { user: null, error: { message: 'Invalid college selection. Please try again.' } };
      }
    }

    
    if (program && program.length === 36 && program.includes('-')) {
      programName = await getProgramNameById(program);
      if (!programName) {
        console.error('Failed to fetch program name for ID:', program);
        return { user: null, error: { message: 'Invalid program selection. Please try again.' } };
      }
    }

    
    const { exists, programHead } = await checkProgramHeadExists(collegeName, programName);
    if (exists) {
      console.warn(`❌ Program Head already assigned to ${collegeName} - ${programName}`);
      return { 
        user: null, 
        error: { 
          message: `A Program Head has already been assigned to ${programName}. Only one Program Head can be registered per program. If you believe this is an error, please contact the administrator.`
        } 
      };
    }

    const { data: pendingProgramHead, error: pendingProgramHeadError } = await supabase
      .from('pending_registrations')
      .select('id')
      .eq('user_type', 'program_head')
      .eq('status', 'pending')
      .eq('college', collegeName)
      .eq('program', programName)
      .single();

    if (pendingProgramHeadError && pendingProgramHeadError.code !== 'PGRST116') {
      console.error('Error checking pending program head registrations:', pendingProgramHeadError);
      return { user: null, error: pendingProgramHeadError };
    }

    if (pendingProgramHead) {
      return {
        user: null,
        error: {
          message: `A Program Head registration for ${programName} is already pending approval.`,
        },
      };
    }
    
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        
        
        emailRedirectTo: `${window.location.origin}/auth/callback`,
        data: {
          user_type: 'program_head',
          first_name: firstName,
          last_name: lastName,
          college: collegeName,
          program: programName,
        },
      },
    });

    const user = data?.user || null;

    
    if (error || !user) {
      return { user, error };
    }

    console.log('Auth user created:', user.id);

    const { error: pendingError } = await createPendingRegistration({
      authUserId: user.id,
      userType: 'program_head',
      email,
      firstName,
      lastName,
      college: collegeName,
      program: programName,
    });

    if (pendingError) {
      return { user: null, error: pendingError };
    }

    return { user, error: null };
  } catch (err) {
    console.error('Unexpected error during sign up:', err);
    return { user: null, error: err };
  }
}


export async function checkDeanExists() {
  try {
    const { data, error } = await supabase.rpc('dean_exists');

    if (error) {
      console.error('Error checking for existing dean:', error);
      return { exists: false, error };
    }

    return { exists: Boolean(data), error: null };
  } catch (err) {
    console.error('Unexpected error checking dean existence:', err);
    return { exists: false, error: err };
  }
}


export async function signUpDean({ email, password, firstName, lastName }) {
  try {
    const { exists } = await checkDeanExists();
    if (exists) {
      return {
        user: null,
        error: {
          message:
            'A Dean account already exists. Only one Dean can be registered in the system. If you believe this is an error, please contact the administrator.',
        },
      };
    }

    const { data: pendingDean, error: pendingDeanError } = await supabase
      .from('pending_registrations')
      .select('id')
      .eq('user_type', 'dean')
      .eq('status', 'pending')
      .single();

    if (pendingDeanError && pendingDeanError.code !== 'PGRST116') {
      console.error('Error checking pending dean registrations:', pendingDeanError);
      return { user: null, error: pendingDeanError };
    }

    if (pendingDean) {
      return {
        user: null,
        error: {
          message: 'A Dean registration is already pending approval. Please wait for administrator review.',
        },
      };
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
        data: {
          user_type: 'dean',
          first_name: firstName,
          last_name: lastName,
        },
      },
    });

    const user = data?.user || null;

    if (error || !user) {
      return { user, error };
    }
    
    const { error: pendingError } = await createPendingRegistration({
      authUserId: user.id,
      userType: 'dean',
      email,
      firstName,
      lastName,
    });

    if (pendingError) {
      return { user: null, error: pendingError };
    }

    return { user, error: null };
  } catch (err) {
    console.error('Unexpected error during dean sign up:', err);
    return { user: null, error: err };
  }
}


export async function getCollegeNameById(collegeId) {
  try {
    const { data, error } = await supabase
      .from('colleges')
      .select('college_name')
      .eq('id', collegeId)
      .single();
    
    if (error) throw error;
    return data?.college_name || null;
  } catch (err) {
    console.error('Error fetching college name:', err);
    return null;
  }
}


export async function getProgramNameById(programId) {
  try {
    const { data, error } = await supabase
      .from('courses')
      .select('course_name')
      .eq('id', programId)
      .single();
    
    if (error) throw error;
    return data?.course_name || null;
  } catch (err) {
    console.error('Error fetching program name:', err);
    return null;
  }
}


export async function createProgramHeadProfile({ userId, email, firstName, lastName, college, program }) {
  try {
    
    let collegeName = college;
    let programName = program;

    
    if (college && college.length === 36 && college.includes('-')) {
      collegeName = await getCollegeNameById(college);
    }

    
    if (program && program.length === 36 && program.includes('-')) {
      programName = await getProgramNameById(program);
    }

    const { error: profileError } = await supabase
      .from('program_heads')
      .insert({
        auth_user_id: userId,
        first_name: firstName,
        last_name: lastName,
        email,
        college: collegeName,
        program: programName,
      });

    if (profileError) {
      console.error('Profile creation error:', profileError);
      return { error: profileError };
    }

    return { error: null };
  } catch (err) {
    console.error('Unexpected error during profile creation:', err);
    return { error: err };
  }
}


export async function signIn({ email, password }) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  
  const user = data?.user || null;
  return { user, error };
}


export const loginProgramHead = async ({ email, password }) => {
  try {
    
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (authError) {
      return { success: false, error: authError.message };
    }

    
    console.log('🔍 Checking Program Head record for email:', email);
    const { data: programHeadData, error: programHeadError } = await supabase
      .from('program_heads')
      .select('*')
      .eq('email', email)
      .single();

    if (programHeadError || !programHeadData) {
      console.warn('❌ No Program Head record found:', programHeadError?.message || 'Record not found');
      
      const { data: pending } = await supabase
        .from('pending_registrations')
        .select('id, status')
        .eq('user_type', 'program_head')
        .eq('email', email)
        .maybeSingle();

      await signOutSilently();

      if (pending) {
        if (pending.status === 'disapproved') {
          return { success: false, error: 'Your registration was disapproved. Please contact the administrator for details and register again if needed.' };
        }

        if (pending.status === 'pending') {
          return { success: false, error: 'Your registration is pending administrator approval. Please wait for approval before logging in.' };
        }
      }

      return { success: false, error: 'No account found with the provided email. Please check your credentials.' };
    }

    console.log('✅ Program Head record found:', programHeadData);

    
    console.log('🔍 Checking is_active status:', programHeadData.is_active);
    if (programHeadData.is_active !== true) {
      console.warn('❌ Program Head account is inactive or pending approval');
      
      await signOutSilently();
      return { success: false, error: 'Your account is inactive. It may be pending administrator approval or disabled. Please contact the administrator for assistance.' };
    }

    console.log('✅ Program Head account is active');

    
    sessionStorage.setItem('userType', 'program_head');
    sessionStorage.setItem('isAuthenticated', 'true');
    sessionStorage.setItem('programHeadData', JSON.stringify(programHeadData));
    sessionStorage.setItem('programHeadCode', programHeadData.program_head_code);
    localStorage.setItem('isAuthenticated', 'true');
    localStorage.setItem('programHeadCode', programHeadData.program_head_code);

    return {
      success: true,
      user: authData.user,
      programHead: programHeadData
    };
  } catch (error) {
    console.error('Program Head login error:', error);
    return { success: false, error: error.message };
  }
};


export const loginDean = async ({ email, password }) => {
  try {
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      return { success: false, error: authError.message };
    }

    const { data: deanData, error: deanError } = await supabase
      .from('deans')
      .select('*')
      .eq('email', email)
      .single();

    if (deanError || !deanData) {
      const { data: pending } = await supabase
        .from('pending_registrations')
        .select('id, status')
        .eq('user_type', 'dean')
        .eq('email', email)
        .maybeSingle();

      await signOutSilently();

      if (pending) {
        if (pending.status === 'disapproved') {
          return { success: false, error: 'Your registration was disapproved. Please contact the administrator for details and register again if needed.' };
        }

        if (pending.status === 'pending') {
          return { success: false, error: 'Your registration is pending administrator approval. Please wait for approval before logging in.' };
        }
      }

      return { success: false, error: 'No account found with the provided email. Please check your credentials.' };
    }

    if (deanData.is_active !== true) {
      await signOutSilently();
      return { success: false, error: 'Your account is inactive. It may be pending administrator approval or disabled. Please contact the administrator for assistance.' };
    }

    sessionStorage.setItem('userType', 'dean');
    sessionStorage.setItem('isAuthenticated', 'true');
    sessionStorage.setItem('deanData', JSON.stringify(deanData));
    sessionStorage.setItem('deanCode', deanData.dean_code);
    localStorage.setItem('isAuthenticated', 'true');
    localStorage.setItem('deanCode', deanData.dean_code);

    return {
      success: true,
      user: authData.user,
      dean: deanData,
    };
  } catch (error) {
    console.error('Dean login error:', error);
    return { success: false, error: error.message };
  }
};


export async function signOut() {
	const { error } = await supabase.auth.signOut();
	return { error };
}


export async function signOutByRole(role) {
	try {
		
		sessionStorage.setItem(`_roleSignOut_${role}`, 'true');
		
		
		const facultySession = localStorage.getItem('faculty_sessions');
		const programheadSession = localStorage.getItem('programhead_sessions');
		const adminSession = localStorage.getItem('admin_sessions');
		const studentSession = localStorage.getItem('student_sessions');
		const deanSession = localStorage.getItem('dean_sessions');
		
		const activeSessions = {
			faculty: facultySession ? JSON.parse(facultySession).length : 0,
			programhead: programheadSession ? JSON.parse(programheadSession).length : 0,
			admin: adminSession ? JSON.parse(adminSession).length : 0,
			student: studentSession ? JSON.parse(studentSession).length : 0,
			dean: deanSession ? JSON.parse(deanSession).length : 0
		};
		
		
		const otherActiveSessions = Object.entries(activeSessions)
			.filter(([key]) => key !== role)
			.reduce((sum, [, count]) => sum + count, 0);
		
		console.log(`🔐 Role-specific logout for ${role}. Other active sessions: ${otherActiveSessions}`);
		console.log(`   Faculty: ${activeSessions.faculty}, ProgramHead: ${activeSessions.programhead}, Admin: ${activeSessions.admin}, Student: ${activeSessions.student}, Dean: ${activeSessions.dean}`);
		
		
		if (otherActiveSessions === 0) {
			console.log(`🔐 No other active sessions, signing out globally from Supabase`);
			await supabase.auth.signOut();
		} else {
			console.log(`🔐 Other sessions exist (${otherActiveSessions}), keeping global Supabase session active`);
		}
		
		sessionStorage.removeItem(`_roleSignOut_${role}`);
		return { error: null };
	} catch (error) {
		console.error(`Error during role-specific sign out for ${role}:`, error);
		sessionStorage.removeItem(`_roleSignOut_${role}`);
		return { error };
	}
}

// ============================================
// CAMPUS DIRECTOR FUNCTIONS
// ============================================

export async function checkCampusDirectorExists() {
  try {
    const { data, error } = await supabase.rpc('campus_director_exists');

    if (error) {
      console.error('Error checking for existing campus director:', error);
      return { exists: false, error };
    }

    return { exists: Boolean(data), error: null };
  } catch (err) {
    console.error('Unexpected error checking campus director existence:', err);
    return { exists: false, error: err };
  }
}

export async function signUpCampusDirector({ email, password, firstName, lastName }) {
  try {
    const { exists } = await checkCampusDirectorExists();
    if (exists) {
      return {
        user: null,
        error: {
          message:
            'A Campus Director account already exists. Only one Campus Director can be registered in the system. If you believe this is an error, please contact the administrator.',
        },
      };
    }

    const { data: pendingCampusDirector, error: pendingCampusDirectorError } = await supabase
      .from('pending_registrations')
      .select('id')
      .eq('user_type', 'campus_director')
      .eq('status', 'pending')
      .single();

    if (pendingCampusDirectorError && pendingCampusDirectorError.code !== 'PGRST116') {
      console.error('Error checking pending campus director registrations:', pendingCampusDirectorError);
      return { user: null, error: pendingCampusDirectorError };
    }

    if (pendingCampusDirector) {
      return {
        user: null,
        error: {
          message: 'A Campus Director registration is already pending approval. Please wait for administrator review.',
        },
      };
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
        data: {
          user_type: 'campus_director',
          first_name: firstName,
          last_name: lastName,
        },
      },
    });

    const user = data?.user || null;

    if (error || !user) {
      return { user, error };
    }
    
    const { error: pendingError } = await createPendingRegistration({
      authUserId: user.id,
      userType: 'campus_director',
      email,
      firstName,
      lastName,
    });

    if (pendingError) {
      return { user: null, error: pendingError };
    }

    return { user, error: null };
  } catch (err) {
    console.error('Unexpected error during campus director sign up:', err);
    return { user: null, error: err };
  }
}

export const loginCampusDirector = async ({ email, password }) => {
  try {
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      return { success: false, error: authError.message };
    }

    const { data: campusDirectorData, error: campusDirectorError } = await supabase
      .from('campus_directors')
      .select('*')
      .eq('email', email)
      .single();

    if (campusDirectorError || !campusDirectorData) {
      const { data: pending } = await supabase
        .from('pending_registrations')
        .select('id, status')
        .eq('user_type', 'campus_director')
        .eq('email', email)
        .maybeSingle();

      await signOutSilently();

      if (pending) {
        if (pending.status === 'disapproved') {
          return { success: false, error: 'Your registration was disapproved. Please contact the administrator for details and register again if needed.' };
        }

        if (pending.status === 'pending') {
          return { success: false, error: 'Your registration is pending administrator approval. Please wait for approval before logging in.' };
        }
      }

      return { success: false, error: 'No account found with the provided email. Please check your credentials.' };
    }

    if (campusDirectorData.is_active !== true) {
      await signOutSilently();
      return { success: false, error: 'Your account is inactive. It may be pending administrator approval or disabled. Please contact the administrator for assistance.' };
    }

    sessionStorage.setItem('userType', 'campus_director');
    sessionStorage.setItem('isAuthenticated', 'true');
    sessionStorage.setItem('campusDirectorData', JSON.stringify(campusDirectorData));
    sessionStorage.setItem('campusDirectorCode', campusDirectorData.campus_director_code);
    localStorage.setItem('isAuthenticated', 'true');
    localStorage.setItem('campusDirectorCode', campusDirectorData.campus_director_code);

    return {
      success: true,
      user: authData.user,
      campusDirector: campusDirectorData,
    };
  } catch (error) {
    console.error('Campus Director login error:', error);
    return { success: false, error: error.message };
  }
};
