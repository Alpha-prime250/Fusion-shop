import React from 'react';
import { Navigate } from 'react-router-dom';
import { Box, CircularProgress, Container, Alert } from '@mui/material';
import { useAuth } from '../context/AuthContext';

/**
 * Wraps a page and only renders it if the logged-in user has one of the
 * allowed roles. Redirects to /login if not authenticated, or shows an
 * access-denied message if authenticated but wrong role.
 */
function ProtectedRoute({ roles, children }) {
  const { user, loading, isAuthenticated } = useAuth();

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (roles && roles.length && !roles.includes(user.role)) {
    return (
      <Container maxWidth="sm" sx={{ mt: 6 }}>
        <Alert severity="error">You don't have permission to view this page.</Alert>
      </Container>
    );
  }

  return children;
}

export default ProtectedRoute;
