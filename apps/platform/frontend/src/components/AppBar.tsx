import React from 'react';
import MuiAppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import ChatIcon from '@mui/icons-material/Chat';
import ThemeToggleButton from './ThemeToggleButton';
import { styled } from '@mui/material/styles';
import { useNavigate, useLocation } from 'react-router-dom';
import LanguageSwitcherButton from './LanguageSwtichButton';
import InlineEditableTitle from './canvas/InlineEditableTitle';

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
  title?: string;
  onTitleChange?: (title: string) => void;
  titlePlaceholder?: string;
}

const EasyPathAppBar: React.FC<EasyPathAppBarProps> = ({
  appBarHeight,
  title,
  onTitleChange,
  titlePlaceholder = 'Untitled Flow'
}) => {
  const height = appBarHeight === 'small' ? 64 : 80;
  const showTitle = title !== undefined && onTitleChange !== undefined;
  const navigate = useNavigate();
  const location = useLocation();

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
          {!showTitle && (
            <>
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
              <Box sx={{ ml: 4, display: 'flex', gap: 1 }}>
                <Button
                  color={location.pathname === '/dashboard' || location.pathname === '/' ? 'primary' : 'inherit'}
                  onClick={() => navigate('/dashboard')}
                  sx={{ color: 'text.primary' }}
                >
                  Flows
                </Button>
                <Button
                  color={location.pathname === '/bots' ? 'primary' : 'inherit'}
                  startIcon={<SmartToyIcon />}
                  onClick={() => navigate('/bots')}
                  sx={{ color: 'text.primary' }}
                >
                  Bots
                </Button>
                <Button
                  color={location.pathname === '/sessions' ? 'primary' : 'inherit'}
                  startIcon={<ChatIcon />}
                  onClick={() => navigate('/sessions')}
                  sx={{ color: 'text.primary' }}
                >
                  Sessions
                </Button>
              </Box>
            </>
          )}
        </Box>
        {showTitle && (
          <Box sx={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)' }}>
            <InlineEditableTitle
              value={title}
              onChange={onTitleChange}
              placeholder={titlePlaceholder}
            />
          </Box>
        )}
        <LanguageSwitcherButton />
        <ThemeToggleButton />
      </Toolbar>
    </MuiAppBar>
  );
};

export default EasyPathAppBar;
