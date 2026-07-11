import React, { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { supabase } from '../../lib/supabaseClient';

function ProtectedRoute({ children, redirectTo = '/programhead/login' }) {
  // null = still checking, true = authenticated, false = not authenticated
  const [authState, setAuthState] = useState(null);

  useEffect(() => {
    let isMounted = true;

    const checkSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();

        if (!isMounted) return;

        if (error || !session) {
          setAuthState(false);
          return;
        }

        setAuthState(true);
      } catch {
        if (isMounted) setAuthState(false);
      }
    };

    checkSession();

    // Keep auth state in sync if the session changes while on a protected page
    // (e.g. token expiry, sign-out from another tab)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!isMounted) return;
      setAuthState(!!session);
    });

    return () => {
      isMounted = false;
      subscription?.unsubscribe();
    };
  }, []);

  // Still verifying — render nothing to avoid a flash redirect
  if (authState === null) return null;

  return authState ? children : <Navigate to={redirectTo} replace />;
}

export default ProtectedRoute;
