import { supabase } from '../lib/supabaseClient';

const RATE_LIMIT_KEY = 'admin_login_attempts';
const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000;
const LOCKOUT_MS = 30 * 1000;

const getAttempts = () => {
  try {
    const data = sessionStorage.getItem(RATE_LIMIT_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
};

const cleanOldAttempts = (attempts) => {
  const now = Date.now();
  return attempts.filter(t => now - t < WINDOW_MS);
};

export const checkAdminLoginRateLimit = () => {
  const attempts = cleanOldAttempts(getAttempts());
  if (attempts.length >= MAX_ATTEMPTS) {
    const lastAttempt = attempts[attempts.length - 1];
    const elapsed = Date.now() - lastAttempt;
    if (elapsed < LOCKOUT_MS) {
      return { allowed: false, remaining: Math.ceil((LOCKOUT_MS - elapsed) / 1000) };
    }
  }
  return { allowed: true, remaining: 0 };
};

export const recordAdminLoginAttempt = () => {
  const attempts = getAttempts();
  attempts.push(Date.now());
  sessionStorage.setItem(RATE_LIMIT_KEY, JSON.stringify(attempts));
};

export const clearAdminLoginAttempts = () => {
  sessionStorage.removeItem(RATE_LIMIT_KEY);
};

const isDev = import.meta.env?.DEV;

export const loginAdmin = async ({ email, password }) => {
  const rateLimit = checkAdminLoginRateLimit();
  if (!rateLimit.allowed) {
    return { success: false, error: `Too many login attempts. Please wait ${rateLimit.remaining} seconds before trying again.`, rateLimited: true, remaining: rateLimit.remaining };
  }

  try {
    if (isDev) console.log('🔐 Authenticating admin with email:', email);
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (authError) {
      if (isDev) {
        console.error('❌ Auth error:', authError.message);
        console.error('   Error code:', authError.code);
        console.error('   Status:', authError.status);
      }
      
      recordAdminLoginAttempt();
      
      if (authError.message.includes('Invalid login credentials')) {
        return { success: false, error: 'Invalid email or password. Please check your credentials and try again.' };
      }
      if (authError.message.includes('Email not confirmed')) {
        return { success: false, error: 'Please confirm your email address before logging in.' };
      }
      
      return { success: false, error: authError.message };
    }

    if (!authData.user) {
      if (isDev) console.error('❌ No user returned from auth');
      return { success: false, error: 'Authentication failed. Please try again.' };
    }

    if (isDev) {
      console.log('✅ User authenticated:', authData.user.id);
      console.log('   User email:', authData.user.email);
    }

    if (isDev) console.log('🔍 Checking admin record for email:', email);
    const { data: adminData, error: adminError } = await supabase
      .from('admins')
      .select('id, admin_code, first_name, last_name, email, admin_level, is_active')
      .eq('email', email)
      .single();

    if (isDev) console.log('   Query result:', { adminData, adminError: adminError?.message });

    if (adminError) {
      if (isDev) console.warn('❌ Admin query error:', adminError.code, adminError.message);
      
      await supabase.auth.signOut();
      
      if (adminError.code === 'PGRST116') {
        return { success: false, error: 'No administrator account found with the provided email. Please contact the system administrator.' };
      }
      
      return { success: false, error: 'Unable to verify administrator status. Please try again.' };
    }

    if (!adminData) {
      if (isDev) console.warn('❌ No admin record found for email:', email);
      
      await supabase.auth.signOut();
      return { success: false, error: 'No administrator account found with the provided email. Please contact the system administrator.' };
    }

    if (isDev) console.log('✅ Admin record found:', adminData.admin_code);

    if (!adminData.admin_code) {
      if (isDev) console.warn('❌ Admin record missing admin_code');
      await supabase.auth.signOut();
      return { success: false, error: 'Your administrator account is incomplete. Please contact the system administrator.' };
    }

    if (isDev) console.log('✅ Admin code verified:', adminData.admin_code);

    if (isDev) console.log('🔍 Checking is_active status:', adminData.is_active);
    if (adminData.is_active === false) {
      if (isDev) console.warn('❌ Admin account is disabled');
      await supabase.auth.signOut();
      return { success: false, error: 'Your account has been disabled. Please contact the system administrator.' };
    }

    if (isDev) console.log('✅ Admin account is active');

    clearAdminLoginAttempts();

    sessionStorage.setItem('userType', 'admin');
    sessionStorage.setItem('isAuthenticated', 'true');
    sessionStorage.setItem('adminData', JSON.stringify(adminData));
    sessionStorage.setItem('adminCode', adminData.admin_code);
    localStorage.setItem('isAuthenticated', 'true');
    localStorage.setItem('adminCode', adminData.admin_code);

    if (isDev) console.log('✅ Admin session stored successfully');

    return {
      success: true,
      user: authData.user,
      admin: adminData
    };
  } catch (error) {
    if (isDev) {
      console.error('❌ Admin login error:', error);
      console.error('   Error message:', error.message);
      console.error('   Error stack:', error.stack);
    }
    return { success: false, error: error.message || 'An unexpected error occurred. Please try again.' };
  }
};


export const logoutAdmin = async () => {
  try {
    const { error } = await supabase.auth.signOut();
    
    if (error) {
      if (isDev) console.error('❌ Admin logout error:', error);
      return { success: false, error: error.message };
    }

    clearAdminLoginAttempts();
    
    sessionStorage.removeItem('userType');
    sessionStorage.removeItem('adminData');
    sessionStorage.removeItem('adminCode');

    return { success: true };
  } catch (error) {
    if (isDev) console.error('❌ Admin logout error:', error);
    return { success: false, error: error.message };
  }
};


export const getAdminSession = async () => {
  try {
    const { data: { session }, error } = await supabase.auth.getSession();

    if (error || !session) {
      return { success: false, session: null };
    }

    if (isDev) console.log('🔍 Verifying admin session for email:', session.user.email);
    const { data: adminData, error: adminError } = await supabase
      .from('admins')
      .select('*')
      .eq('email', session.user.email)
      .single();

    if (adminError || !adminData) {
      if (isDev) console.warn('❌ No admin record found for session');
      return { success: false, session: null };
    }

    return {
      success: true,
      session,
      admin: adminData
    };
  } catch (error) {
    if (isDev) console.error('❌ Get admin session error:', error);
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
      if (isDev) console.error('❌ Update admin profile error:', error);
      return { success: false, error: error.message };
    }

    
    sessionStorage.setItem('adminData', JSON.stringify(data));

    return { success: true, admin: data };
  } catch (error) {
    if (isDev) console.error('❌ Update admin profile error:', error);
    return { success: false, error: error.message };
  }
};
