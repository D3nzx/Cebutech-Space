import { supabase } from '../lib/supabaseClient';
import { createPendingRegistration } from './auth';


export const loginStudent = async ({ email, password }) => {
  try {
    
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (authError) {
      return { success: false, error: authError.message };
    }

    
    console.log('🔍 Checking Student record for email:', email);
    const { data: studentData, error: studentError } = await supabase
      .from('students')
      .select('*')
      .eq('email', email)
      .single();

    if (studentError || !studentData) {
      console.warn('❌ No Student record found:', studentError?.message || 'Record not found');

      const { data: pending } = await supabase
        .from('pending_registrations')
        .select('id, status')
        .eq('user_type', 'student')
        .eq('email', email)
        .maybeSingle();

      await supabase.auth.signOut();

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

    console.log('✅ Student record found:', studentData);

    
    if (!studentData.student_id) {
      console.warn('❌ Student record missing student_id');
      
      await supabase.auth.signOut();
      return { success: false, error: 'No account found with the provided email. Please check your credentials.' };
    }

    console.log('✅ Student ID verified:', studentData.student_id);

    
    console.log('🔍 Checking is_active status:', studentData.is_active);
    if (studentData.is_active !== true) {
      console.warn('❌ Student account is inactive or pending approval');
      
      await supabase.auth.signOut();
      return { success: false, error: 'Your account is inactive. It may be pending administrator approval or disabled. Please contact your administrator for assistance.' };
    }

    console.log('✅ Student account is active');

    
    sessionStorage.setItem('userType', 'student');
    sessionStorage.setItem('isAuthenticated', 'true');
    sessionStorage.setItem('studentData', JSON.stringify(studentData));
    sessionStorage.setItem('studentId', studentData.student_id);
    localStorage.setItem('isAuthenticated', 'true');
    localStorage.setItem('studentId', studentData.student_id);

    return {
      success: true,
      user: authData.user,
      student: studentData
    };
  } catch (error) {
    console.error('Student login error:', error);
    return { success: false, error: error.message };
  }
};


export const registerStudent = async ({ firstName, lastName, email, password, college, program, yearLevel, section }) => {
  try {
    
    const { data: existingEmail } = await supabase
      .from('students')
      .select('id')
      .eq('email', email)
      .single();

    if (existingEmail) {
      return { success: false, error: 'Email already registered' };
    }

    const { data: pendingStudent, error: pendingStudentError } = await supabase
      .from('pending_registrations')
      .select('id')
      .eq('user_type', 'student')
      .eq('status', 'pending')
      .eq('email', email)
      .single();

    if (pendingStudentError && pendingStudentError.code !== 'PGRST116') {
      return { success: false, error: pendingStudentError.message };
    }

    if (pendingStudent) {
      return { success: false, error: 'A Student registration is already pending approval.' };
    }

    
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
        data: {
          user_type: 'student',
          first_name: firstName,
          last_name: lastName,
          college,
          program,
          year_level: yearLevel,
          section,
        }
      }
    });

    if (authError) {
      console.error('Auth sign up error:', authError);
      return { success: false, error: authError.message };
    }

    if (!authData.user) {
      return { success: false, error: 'Failed to create auth user' };
    }

    console.log('✅ Auth user created:', authData.user.id);

    const { error: pendingError } = await createPendingRegistration({
      authUserId: authData.user.id,
      userType: 'student',
      email,
      firstName,
      lastName,
      college,
      program,
      yearLevel,
      section,
    });

    if (pendingError) {
      return { success: false, error: pendingError.message || 'Failed to create pending registration.' };
    }

    return {
      success: true,
      user: authData.user,
      message: 'Registration successful! Please check your email to verify your account.',
      student: null
    };
  } catch (error) {
    console.error('Student registration error:', error);
    return { success: false, error: error.message };
  }
};


export const logoutStudent = async () => {
  try {
    const { error } = await supabase.auth.signOut();
    
    if (error) {
      return { success: false, error: error.message };
    }

    
    sessionStorage.removeItem('userType');
    sessionStorage.removeItem('studentData');

    return { success: true };
  } catch (error) {
    console.error('Student logout error:', error);
    return { success: false, error: error.message };
  }
};


export const getStudentSession = async () => {
  try {
    const { data: { session }, error } = await supabase.auth.getSession();

    if (error || !session) {
      return { success: false, session: null };
    }

    
    const { data: studentData, error: studentError } = await supabase
      .from('students')
      .select('*')
      .eq('email', session.user.email)
      .single();

    if (studentError || !studentData) {
      return { success: false, session: null };
    }

    return {
      success: true,
      session,
      student: studentData
    };
  } catch (error) {
    console.error('Get student session error:', error);
    return { success: false, session: null };
  }
};


export const updateStudentProfile = async (studentId, updates) => {
  try {
    const { data, error } = await supabase
      .from('students')
      .update(updates)
      .eq('id', studentId)
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    
    sessionStorage.setItem('studentData', JSON.stringify(data));

    return { success: true, student: data };
  } catch (error) {
    console.error('Update student profile error:', error);
    return { success: false, error: error.message };
  }
};

