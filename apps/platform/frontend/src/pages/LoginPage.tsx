import React, { useState } from 'react';
import { TextField, Button, Typography, Box, Paper, Alert } from '@mui/material';
import EasyPathAppBar from '../components/AppBar';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { supabase } from '../supabaseClient';

const LoginPage: React.FC = () => {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      setMessage(t('loginPage.loginSuccess'));
      navigate('/dashboard');
    } catch (error: any) {
      setMessage(error.message);
      console.error('Login error:', error.message);
    } finally {
      setLoading(false);
    }
  };

  // Optional: Add a sign-up function if you want users to register directly
  const handleSignUp = async () => {
    setLoading(true);
    setMessage(null);

    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) throw error;

      setMessage(t('loginPage.signUpSuccess')); // Localization for sign up success
      // You might want to redirect to a verification page or dashboard
    } catch (error: any) {
      setMessage(error.message);
      console.error('Sign up error:', error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', backgroundColor: 'background.default' }}>
      <EasyPathAppBar appBarHeight="small" />
      <Box sx={{ flexGrow: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Paper elevation={3} sx={{ padding: 4, maxWidth: 400, width: '100%', borderRadius: 3 }}>
          <Typography variant="h4" component="h1" gutterBottom align="center" color="text.primary">
            {t('loginPage.title')}
          </Typography>
          <Typography variant="h6" component="h2" gutterBottom align="center" color="text.secondary">
            {t('loginPage.subtitle')}
          </Typography>
          <Box component="form" onSubmit={handleLogin} sx={{ mt: 3 }}>
            <TextField
              label={t('loginPage.emailLabel')}
              variant="outlined"
              fullWidth
              margin="normal"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <TextField
              label={t('loginPage.passwordLabel')}
              type="password"
              variant="outlined"
              fullWidth
              margin="normal"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            {message && ( // Display messages
              <Alert severity={message.includes('Success') ? 'success' : 'error'} sx={{ mt: 2 }}>
                {message}
              </Alert>
            )}
            <Button
              type="submit"
              variant="contained"
              color="primary"
              fullWidth
              sx={{ mt: 3, py: 1.5 }}
              disabled={loading}
            >
              {loading ? t('loginPage.loadingButton') : t('loginPage.loginButton')}
            </Button>
            {/* Optional: Sign Up Button */}
            <Button
              variant="outlined"
              color="secondary"
              fullWidth
              sx={{ mt: 2, py: 1.5 }}
              onClick={handleSignUp}
              disabled={loading}
            >
              {t('loginPage.signUpButton')}
            </Button>
          </Box>
        </Paper>
      </Box>
    </Box>
  );
};

export default LoginPage;
