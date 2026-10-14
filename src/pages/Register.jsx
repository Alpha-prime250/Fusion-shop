import React, { useState } from 'react';
import {
  Box,
  Container,
  TextField,
  Typography,
  Button,
  CircularProgress,
  Paper,
  IconButton,
  InputAdornment,
  Stack,
  ToggleButtonGroup,
  ToggleButton,
} from '@mui/material';
import { Visibility, VisibilityOff } from '@mui/icons-material';
import { apiClient } from '../services/apiClient';
import { useNotifier } from '../context/NotificationProvider';

function Register() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState('user');
  const [storeName, setStoreName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const { notify } = useNotifier();

  const handleRegister = async e => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      notify({ severity: 'error', message: 'Passwords do not match.' });
      setLoading(false);
      return;
    }

    try {
      const payload = { name, email, password, role };
      if (role === 'vendor') {
        payload.storeName = storeName || `${name}'s Store`;
      }
      const response = await apiClient.post('auth/register', payload);
      const token = response.data.token;
      localStorage.setItem('MERNEcommerceToken', token);

      if (role === 'vendor') {
        notify({
          severity: 'success',
          message: 'Vendor account created! An admin needs to approve it before you can list products.',
        });
      } else {
        notify({ severity: 'success', message: 'Account created! Redirecting you home…' });
      }
      window.location.href = '/';
    } catch (err) {
      if (err.response?.data?.errors) {
        // Format the error messages for display
        const errorMessages = err.response.data.errors.map(error => error.msg).join(', ');
        setError(errorMessages);
        notify({ severity: 'error', message: errorMessages });
      } else {
        const message = err.response?.data?.msg || 'Registration failed';
        setError(message);
        notify({ severity: 'error', message });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleTogglePasswordVisibility = () => {
    setShowPassword(prev => !prev);
  };

  const handleToggleConfirmPasswordVisibility = () => {
    setShowConfirmPassword(prev => !prev);
  };

  return (
    <Container maxWidth="sm" sx={{ mt: 6, mb: 8 }}>
      <Paper elevation={3} sx={{ p: { xs: 4, md: 5 }, borderRadius: 3 }}>
        <Stack spacing={1} sx={{ mb: 3 }}>
          <Typography variant="h4" align="center" fontWeight={700}>
            Create your account
          </Typography>
          <Typography variant="body2" align="center" color="text.secondary">
            Save wishlists, track orders, and unlock member-only drops.
          </Typography>
        </Stack>

        {error && (
          <Typography variant="body2" color="error" sx={{ display: 'none' }}>
            {error}
          </Typography>
        )}

        <form onSubmit={handleRegister}>
          <Typography variant="body2" fontWeight={600} sx={{ mt: 1, mb: 1 }}>
            I want to
          </Typography>
          <ToggleButtonGroup
            value={role}
            exclusive
            onChange={(_e, value) => value && setRole(value)}
            fullWidth
            sx={{ mb: 2 }}
          >
            <ToggleButton value="user">Shop as a customer</ToggleButton>
            <ToggleButton value="vendor">Sell as a vendor</ToggleButton>
          </ToggleButtonGroup>

          <TextField label="Name" variant="outlined" fullWidth margin="normal" value={name} onChange={e => setName(e.target.value)} required />
          <TextField label="Email" variant="outlined" fullWidth margin="normal" value={email} onChange={e => setEmail(e.target.value)} required />

          {role === 'vendor' && (
            <TextField
              label="Store Name"
              variant="outlined"
              fullWidth
              margin="normal"
              value={storeName}
              onChange={e => setStoreName(e.target.value)}
              helperText="This is how customers will see your storefront."
            />
          )}
          <TextField
            label="Password"
            type={showPassword ? 'text' : 'password'}
            variant="outlined"
            fullWidth
            margin="normal"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton aria-label="toggle password visibility" onClick={handleTogglePasswordVisibility} edge="end">
                    {showPassword ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />
          <TextField
            label="Confirm Password"
            type={showConfirmPassword ? 'text' : 'password'}
            variant="outlined"
            fullWidth
            margin="normal"
            value={confirmPassword}
            onChange={e => setConfirmPassword(e.target.value)}
            required
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton aria-label="toggle confirm password visibility" onClick={handleToggleConfirmPasswordVisibility} edge="end">
                    {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />

          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
            {loading ? (
              <CircularProgress />
            ) : (
              <Button type="submit" variant="contained" size="large" fullWidth>
                Register
              </Button>
            )}
          </Box>
        </form>

        <Box sx={{ mt: 2, textAlign: 'center' }}>
          <Typography variant="body2">
            Already have an account? <a href="/login">Login here</a>
          </Typography>
        </Box>
      </Paper>
    </Container>
  );
}

export default Register;
