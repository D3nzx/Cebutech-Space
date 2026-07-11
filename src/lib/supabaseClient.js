import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Adaptive storage: uses sessionStorage in incognito mode, localStorage otherwise
class AdaptiveStorage {
  constructor() {
    // Detect incognito mode synchronously
    this.isIncognito = this.detectIncognitoModeSync();
    console.log(`🔍 Storage mode: ${this.isIncognito ? 'Incognito (sessionStorage)' : 'Normal (localStorage)'}`);
  }

  detectIncognitoModeSync() {
    try {
      const test = '__incognito_test__';
      localStorage.setItem(test, test);
      localStorage.removeItem(test);
      return false; // Not incognito
    } catch (e) {
      return true; // Incognito mode detected
    }
  }

  getStorage() {
    return this.isIncognito ? window.sessionStorage : window.localStorage;
  }

  getItem(key) {
    return this.getStorage().getItem(key);
  }

  setItem(key, value) {
    this.getStorage().setItem(key, value);
  }

  removeItem(key) {
    this.getStorage().removeItem(key);
  }
}

const adaptiveStorage = new AdaptiveStorage();

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storage: adaptiveStorage,
    storageKey: 'sb-auth-token'
  }
});

// Session restoration helper - waits for Supabase to restore session from localStorage
export const restoreSessionFromStorage = async () => {
  try {
    // Use onAuthStateChange to wait for session restoration
    return new Promise((resolve) => {
      let resolved = false;
      const timeout = setTimeout(() => {
        if (!resolved) {
          resolved = true;
          console.warn('⚠️ Session restoration timeout');
          resolve(null);
        }
      }, 2000); // 2 second timeout
      
      const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
        if (!resolved && (event === 'INITIAL_SESSION' || event === 'SIGNED_IN')) {
          resolved = true;
          clearTimeout(timeout);
          subscription?.unsubscribe();
          
          if (session) {
            console.log('✅ Session restored from storage via auth state change');
            resolve(session);
          } else {
            console.warn('⚠️ No session found in storage');
            resolve(null);
          }
        }
      });
      
      // Also try getSession as fallback
      setTimeout(async () => {
        if (!resolved) {
          const { data: { session } } = await supabase.auth.getSession();
          if (session && !resolved) {
            resolved = true;
            clearTimeout(timeout);
            subscription?.unsubscribe();
            console.log('✅ Session restored via getSession fallback');
            resolve(session);
          }
        }
      }, 50);
    });
  } catch (error) {
    console.error('❌ Error restoring session:', error);
    return null;
  }
};

// Get current user with retry logic
export const getCurrentUserWithRetry = async (maxRetries = 3) => {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const { data: { user }, error } = await supabase.auth.getUser();
      
      if (!error && user) {
        console.log('✅ User retrieved successfully');
        return { user, error: null };
      }
      
      if (i < maxRetries - 1) {
        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, 100 * (i + 1)));
      }
    } catch (err) {
      console.error(`Attempt ${i + 1} failed:`, err);
    }
  }
  
  return { user: null, error: 'Failed to get user after retries' };
};