import React from 'react';
import IconButton from '@mui/material/IconButton';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Tooltip from '@mui/material/Tooltip';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@mui/material/styles';
import TranslateIcon from '@mui/icons-material/Translate';

const LanguageSwitcherButton: React.FC = () => {
  const { i18n } = useTranslation();
  const theme = useTheme();

  const currentLanguage = i18n.language;

  const toggleLanguage = () => {
    const nextLanguage = currentLanguage === 'pt' ? 'en' : 'pt';
    i18n.changeLanguage(nextLanguage);
  };

  const iconColor = theme.palette.mode === 'dark'
    ? theme.palette.common.white
    : theme.palette.grey[900];

  return (
    <Tooltip title={currentLanguage === 'pt' ? "Mudar para Inglês" : "Switch to Portuguese"}>
      <Box sx={{ display: 'flex', alignItems: 'center' }}>
        <IconButton sx={{ ml: 1 }} onClick={toggleLanguage}>
          <TranslateIcon sx={{ color: iconColor, mr: 0.5 }} fontSize="small" />
          <Typography variant="caption" sx={{ color: iconColor, fontWeight: 'bold' }}>
            {currentLanguage.toUpperCase()}
          </Typography>
        </IconButton>
      </Box>
    </Tooltip>
  );
};

export default LanguageSwitcherButton;
