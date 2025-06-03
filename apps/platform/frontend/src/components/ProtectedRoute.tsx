import React, { useEffect, useState, type FC } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import type { Session } from '@supabase/supabase-js'; // Import Session type
import { Box, CircularProgress, Typography } from '@mui/material'; // For loading indicator

interface ProtectedRouteProps {
  redirectPath?: string;
}

const ProtectedRoute: FC<ProtectedRouteProps> = ({ redirectPath = '/' }) => {
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error) {
        console.error('Error fetching session:', error);
        setSession(null);
      } else {
        setSession(session);
      }
      setLoading(false);
    };

    checkSession();

    // Listen for auth state changes (e.g., user signs in/out)
    const { data: authListener } = supabase.auth.onAuthStateChange(
      (_event, newSession) => {
        setSession(newSession);
        setLoading(false); // Ensure loading is false after state change
      }
    );

    return () => {
      authListener?.subscription?.unsubscribe(); // Clean up the listener
    };
  }, []);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', flexDirection: 'column' }}>
        <CircularProgress />
        <Typography variant="h6" sx={{ mt: 2 }}>Loading authentication...</Typography>
      </Box>
    );
  }

  if (!session) {
    return <Navigate to={redirectPath} replace />;
  }

  return <Outlet />; // Render child routes if authenticated
};

export default ProtectedRoute;
