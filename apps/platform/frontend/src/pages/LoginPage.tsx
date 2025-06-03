import React, { useState } from 'react';
import { TextField, Button, Typography, Box, Paper } from '@mui/material';
import EasyPathAppBar from '../components/AppBar';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

const LoginPage: React.FC = () => {
  const { t } = useTranslation();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();

  const handleLogin = (event: React.FormEvent) => {
    event.preventDefault();
    console.log('Attempting login with:', { username, password });
    navigate('/dashboard');
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
              label={t('loginPage.usernameLabel')}
              variant="outlined"
              fullWidth
              margin="normal"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
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
            <Button
              type="submit"
              variant="contained"
              color="primary"
              fullWidth
              sx={{ mt: 3, py: 1.5 }}
            >
              {t('loginPage.loginButton')}
            </Button>
          </Box>
        </Paper>
      </Box>
    </Box>
  );
};

export default LoginPage;
