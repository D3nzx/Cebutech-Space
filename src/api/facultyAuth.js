import { supabase } from '../lib/supabaseClient';
import { createPendingRegistration } from './auth';


export const loginFaculty = async ({ email, password }) => {
  try {
    
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (authError) {
      return { success: false, error: authError.message };
    }

    
    console.log('🔍 Checking Faculty record for email:', email);
    const { data: facultyData, error: facultyError } = await supabase
      .from('faculty')
      .select('*')
      .eq('email', email)
      .single();

    if (facultyError || !facultyData) {
      console.warn('❌ No Faculty record found:', facultyError?.message || 'Record not found');

      const { data: pending } = await supabase
        .from('pending_registrations')
        .select('id, status')
        .eq('user_type', 'faculty')
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

    console.log('✅ Faculty record found:', facultyData);

    
    if (!facultyData.id_no) {
      console.warn('❌ Faculty record missing id_no');
      
      await signOutSilently();
      return { success: false, error: 'No account found with the provided email. Please check your credentials.' };
    }

    console.log('✅ Faculty ID verified:', facultyData.id_no);

    
    console.log('🔍 Checking is_active status:', facultyData.is_active);
    if (facultyData.is_active !== true) {
      console.warn('❌ Faculty account is inactive or pending approval');
      
      await signOutSilently();
      return { success: false, error: 'Your account is inactive. It may be pending administrator approval or disabled. Please contact your administrator for assistance.' };
    }

    console.log('✅ Faculty account is active');

    
    sessionStorage.setItem('userType', 'faculty');
    sessionStorage.setItem('isAuthenticated', 'true');
    sessionStorage.setItem('facultyData', JSON.stringify(facultyData));
    sessionStorage.setItem('facultyIdNo', facultyData.id_no);
    localStorage.setItem('isAuthenticated', 'true');
    localStorage.setItem('facultyIdNo', facultyData.id_no);

    return {
      success: true,
      user: authData.user,
      faculty: facultyData
    };
  } catch (error) {
    console.error('Faculty login error:', error);
    return { success: false, error: error.message };
  }
};


const signOutSilently = async () => {
  try {
    
    sessionStorage.setItem('_silentSignOut', 'true');
    await supabase.auth.signOut();
    sessionStorage.removeItem('_silentSignOut');
  } catch (error) {
    console.error('Error during silent sign out:', error);
  }
};


export const registerFaculty = async ({ firstName, lastName, email, password, college, program }) => {
  try {
    
    const { data: existingEmail } = await supabase
      .from('faculty')
      .select('id')
      .eq('email', email)
      .single();

    if (existingEmail) {
      return { success: false, error: 'Email already registered' };
    }

    const { data: pendingFaculty, error: pendingFacultyError } = await supabase
      .from('pending_registrations')
      .select('id')
      .eq('user_type', 'faculty')
      .eq('status', 'pending')
      .eq('email', email)
      .single();

    if (pendingFacultyError && pendingFacultyError.code !== 'PGRST116') {
      return { success: false, error: pendingFacultyError.message };
    }

    if (pendingFaculty) {
      return { success: false, error: 'A Faculty registration is already pending approval.' };
    }

    // Create auth user
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
        data: {
          user_type: 'faculty',
          first_name: firstName,
          last_name: lastName,
          college,
          program,
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

    console.log('Auth user created:', authData.user.id);

    const { error: pendingError } = await createPendingRegistration({
      authUserId: authData.user.id,
      userType: 'faculty',
      email,
      firstName,
      lastName,
      college,
      program,
    });

    if (pendingError) {
      return { success: false, error: pendingError.message || 'Failed to create pending registration.' };
    }

    return {
      success: true,
      user: authData.user,
      message: 'Registration successful! Please check your email to verify your account.',
      faculty: null
    };
  } catch (error) {
    console.error('Faculty registration error:', error);
    return { success: false, error: error.message };
  }
};


export const logoutFaculty = async () => {
  try {
    const { error } = await supabase.auth.signOut();
    
    if (error) {
      return { success: false, error: error.message };
    }

    
    sessionStorage.removeItem('userType');
    sessionStorage.removeItem('facultyData');

    return { success: true };
  } catch (error) {
    console.error('Faculty logout error:', error);
    return { success: false, error: error.message };
  }
};


export const getFacultySession = async () => {
  try {
    const { data: { session }, error } = await supabase.auth.getSession();

    if (error || !session) {
      return { success: false, session: null };
    }

    
    const { data: facultyData, error: facultyError } = await supabase
      .from('faculty')
      .select('*')
      .eq('email', session.user.email)
      .single();

    if (facultyError || !facultyData) {
      return { success: false, session: null };
    }

    return {
      success: true,
      session,
      faculty: facultyData
    };
  } catch (error) {
    console.error('Get faculty session error:', error);
    return { success: false, session: null };
  }
};


export const updateFacultyProfile = async (facultyId, updates) => {
  try {
    const { data, error } = await supabase
      .from('faculty')
      .update(updates)
      .eq('id', facultyId)
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    
    sessionStorage.setItem('facultyData', JSON.stringify(data));

    return { success: true, faculty: data };
  } catch (error) {
    console.error('Update faculty profile error:', error);
    return { success: false, error: error.message };
  }
};
