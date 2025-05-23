import React from 'react';
import IconButton from '@mui/material/IconButton';
import Box from '@mui/material/Box';
import Brightness4Icon from '@mui/icons-material/Brightness4'; // Sol
import Brightness7Icon from '@mui/icons-material/Brightness7'; // Lua
import { useThemeContext } from '../context/ThemeContext';
import { useTheme } from '@mui/material/styles';

const ThemeToggleButton: React.FC = () => {
  const { toggleTheme } = useThemeContext();
  const theme = useTheme();

  const iconColor = theme.palette.mode === 'dark'
    ? theme.palette.common.white
    : theme.palette.grey[900]; // Or any other suitable dark color

  return (
    <Box sx={{ display: 'flex', alignItems: 'center' }}>
      <IconButton sx={{ ml: 1 }} onClick={toggleTheme}>
        {theme.palette.mode === 'dark' ? (
          <Brightness7Icon sx={{ color: iconColor }} />
        ) : (
          <Brightness4Icon sx={{ color: iconColor }} />
        )}
      </IconButton>
    </Box>
  );
};

export default ThemeToggleButton;
