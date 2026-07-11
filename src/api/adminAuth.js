import { supabase } from '../lib/supabaseClient';


export const loginAdmin = async ({ email, password }) => {
  try {
    
    console.log('🔐 Authenticating admin with email:', email);
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (authError) {
      console.error('❌ Auth error:', authError.message);
      console.error('   Error code:', authError.code);
      console.error('   Status:', authError.status);
      
      
      if (authError.message.includes('Invalid login credentials')) {
        return { success: false, error: 'Invalid email or password. Please check your credentials and try again.' };
      }
      if (authError.message.includes('Email not confirmed')) {
        return { success: false, error: 'Please confirm your email address before logging in.' };
      }
      
      return { success: false, error: authError.message };
    }

    if (!authData.user) {
      console.error('❌ No user returned from auth');
      return { success: false, error: 'Authentication failed. Please try again.' };
    }

    console.log('✅ User authenticated:', authData.user.id);
    console.log('   User email:', authData.user.email);

    
    console.log('🔍 Checking admin record for email:', email);
    const { data: adminData, error: adminError } = await supabase
      .from('admins')
      .select('id, admin_code, first_name, last_name, email, admin_level, is_active')
      .eq('email', email)
      .single();

    console.log('   Query result:', { adminData, adminError: adminError?.message });

    if (adminError) {
      console.warn('❌ Admin query error:', adminError.code, adminError.message);
      
      await supabase.auth.signOut();
      
      if (adminError.code === 'PGRST116') {
        return { success: false, error: 'No administrator account found with the provided email. Please contact the system administrator.' };
      }
      
      return { success: false, error: 'Unable to verify administrator status. Please try again.' };
    }

    if (!adminData) {
      console.warn('❌ No admin record found for email:', email);
      
      await supabase.auth.signOut();
      return { success: false, error: 'No administrator account found with the provided email. Please contact the system administrator.' };
    }

    console.log('✅ Admin record found:', adminData.admin_code);

    
    if (!adminData.admin_code) {
      console.warn('❌ Admin record missing admin_code');
      await supabase.auth.signOut();
      return { success: false, error: 'Your administrator account is incomplete. Please contact the system administrator.' };
    }

    console.log('✅ Admin code verified:', adminData.admin_code);

    
    console.log('🔍 Checking is_active status:', adminData.is_active);
    if (adminData.is_active === false) {
      console.warn('❌ Admin account is disabled');
      await supabase.auth.signOut();
      return { success: false, error: 'Your account has been disabled. Please contact the system administrator.' };
    }

    console.log('✅ Admin account is active');

    
    sessionStorage.setItem('userType', 'admin');
    sessionStorage.setItem('isAuthenticated', 'true');
    sessionStorage.setItem('adminData', JSON.stringify(adminData));
    sessionStorage.setItem('adminCode', adminData.admin_code);
    localStorage.setItem('isAuthenticated', 'true');
    localStorage.setItem('adminCode', adminData.admin_code);

    console.log('✅ Admin session stored successfully');

    return {
      success: true,
      user: authData.user,
      admin: adminData
    };
  } catch (error) {
    console.error('❌ Admin login error:', error);
    console.error('   Error message:', error.message);
    console.error('   Error stack:', error.stack);
    return { success: false, error: error.message || 'An unexpected error occurred. Please try again.' };
  }
};


export const logoutAdmin = async () => {
  try {
    const { error } = await supabase.auth.signOut();
    
    if (error) {
      return { success: false, error: error.message };
    }

    
    sessionStorage.removeItem('userType');
    sessionStorage.removeItem('adminData');
    sessionStorage.removeItem('adminCode');

    return { success: true };
  } catch (error) {
    console.error('❌ Admin logout error:', error);
    return { success: false, error: error.message };
  }
};


export const getAdminSession = async () => {
  try {
    const { data: { session }, error } = await supabase.auth.getSession();

    if (error || !session) {
      return { success: false, session: null };
    }

    
    const { data: adminData, error: adminError } = await supabase
      .from('admins')
      .select('*')
      .eq('email', session.user.email)
      .single();

    if (adminError || !adminData) {
      return { success: false, session: null };
    }

    return {
      success: true,
      session,
      admin: adminData
    };
  } catch (error) {
    console.error('❌ Get admin session error:', error);
    return { success: false, session: null };
  }
};


export const updateAdminProfile = async (adminId, updates) => {
  try {
    const { data, error } = await supabase
      .from('admins')
      .update(updates)
      .eq('id', adminId)
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    
    sessionStorage.setItem('adminData', JSON.stringify(data));

    return { success: true, admin: data };
  } catch (error) {
    console.error('❌ Update admin profile error:', error);
    return { success: false, error: error.message };
  }
};
