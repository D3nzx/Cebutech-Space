import React, { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { supabase } from '../../lib/supabaseClient';

function ProtectedRoute({ children, redirectTo = '/programhead/login', requireAdmin = false }) {
  const [authState, setAuthState] = useState(null);
  const [isAdmin, setIsAdmin] = useState(null);

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

        if (requireAdmin) {
          const { data: adminData, error: adminError } = await supabase
            .from('admins')
            .select('id')
            .eq('auth_user_id', session.user.id)
            .maybeSingle();

          if (!isMounted) return;

          if (adminError || !adminData) {
            setIsAdmin(false);
          } else {
            setIsAdmin(true);
          }
        } else {
          setIsAdmin(true);
        }
      } catch {
        if (isMounted) {
          setAuthState(false);
          setIsAdmin(false);
        }
      }
    };

    checkSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!isMounted) return;
      
      if (!session) {
        setAuthState(false);
        setIsAdmin(false);
        return;
      }

      setAuthState(true);

      if (requireAdmin) {
        supabase
          .from('admins')
          .select('id')
          .eq('auth_user_id', session.user.id)
          .maybeSingle()
          .then(({ data: adminData, error: adminError }) => {
            if (!isMounted) return;
            if (adminError || !adminData) {
              setIsAdmin(false);
            } else {
              setIsAdmin(true);
            }
          });
      } else {
        setIsAdmin(true);
      }
    });

    return () => {
      isMounted = false;
      subscription?.unsubscribe();
    };
  }, [requireAdmin]);

  if (authState === null || (requireAdmin && isAdmin === null)) return null;

  if (!authState || (requireAdmin && !isAdmin)) {
    return <Navigate to={redirectTo} replace />;
  }

  return children;
}

export default ProtectedRoute;
