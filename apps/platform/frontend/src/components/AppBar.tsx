import React from 'react';
import MuiAppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button'; // Import Button
import ThemeToggleButton from './ThemeToggleButton';
import { styled } from '@mui/material/styles';
import LanguageSwitcherButton from './LanguageSwtichButton';
import { useNavigate } from 'react-router-dom'; // Import useNavigate
import { supabase } from '../supabaseClient'; // Import supabase client
import { useTranslation } from 'react-i18next'; // Import useTranslation

// TODO: Placeholder para a logo. Substituir com a logo de verdade no futuro.
const LogoPlaceholder = styled(Box)(({ theme }) => ({
  width: 40,
  height: 40,
  backgroundColor: theme.palette.primary.main,
  borderRadius: 8,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: theme.palette.common.white,
  fontWeight: 'bold',
  marginRight: theme.spacing(1),
  fontSize: '1.2rem',
}));

interface EasyPathAppBarProps {
  appBarHeight: 'small' | 'large';
}

const EasyPathAppBar: React.FC<EasyPathAppBarProps> = ({ appBarHeight }) => {
  const height = appBarHeight === 'small' ? 64 : 80;
  const navigate = useNavigate();
  const { t } = useTranslation(); // Use translation hook

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('Logout error:', error.message);
    } else {
      navigate('/'); // Redirect to login page after logout
    }
  };

  return (
    <MuiAppBar
      position="static"
      sx={{
        backgroundColor: 'background.paper',
        boxShadow: 1,
        transition: 'height 0.3s ease-in-out',
        height: height,
        justifyContent: 'center',
      }}
    >
      <Toolbar>
        <Box sx={{ display: 'flex', alignItems: 'center', flexGrow: 1 }}>
          <a href='/dashboard'>
            <LogoPlaceholder>
              EP
            </LogoPlaceholder>
          </a>
          <Typography
            variant="h6"
            component="div"
            sx={{
              color: 'text.primary',
              fontWeight: 600,
              fontSize: appBarHeight === 'small' ? '1.2rem' : '1.5rem',
              transition: 'font-size 0.3s ease-in-out',
            }}
          >
            EasyPath
          </Typography>
        </Box>
        <LanguageSwitcherButton />
        <ThemeToggleButton />
        <Button color="inherit" onClick={handleLogout} sx={{ ml: 2, color: 'text.primary' }}>
          {t('appBar.logoutButton')}
        </Button>
      </Toolbar>
    </MuiAppBar>
  );
};

export default EasyPathAppBar;
