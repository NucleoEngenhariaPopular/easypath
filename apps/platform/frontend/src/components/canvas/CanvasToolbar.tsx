import { ClearAllOutlined } from '@mui/icons-material';
import HttpIcon from '@mui/icons-material/Http';
import TextFieldsIcon from '@mui/icons-material/TextFields';
import {
  Box,
  Button,
  Divider,
  IconButton,
  Paper,
  Tooltip,
} from '@mui/material';
import React from 'react';
import { useTranslation } from 'react-i18next'; // <<<< IMPORT

interface CanvasToolbarProps {
  onAddNode: (nodeType: string) => void;
  onClearIntermediateNodes: () => void;
}

const CanvasToolbar: React.FC<CanvasToolbarProps> = ({ onAddNode, onClearIntermediateNodes }) => {
  const { t } = useTranslation(); // <<<< USE HOOK

  return (
    <Paper
      sx={{
        position: 'absolute',
        top: 5,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 10,
        display: 'flex',
        gap: 1,
        p: 1,
        borderRadius: 3,
        boxShadow: 3,
        backgroundColor: 'background.paper',
      }}
    >
      <Box display="flex" alignItems="center" gap={0.5}>

        <Tooltip title={t('canvasToolbar.addNormalNode')}>
          <IconButton
            color={'default'}
            sx={{
              borderRadius: 2,
              '&:hover': {
                color: 'primary.main'
              },
            }}
            onClick={() => onAddNode('normal')}
          >
            <TextFieldsIcon />
          </IconButton>
        </Tooltip>

        <Tooltip title={t('canvasToolbar.addRequestNode')}>
          <IconButton
            color={'default'}
            sx={{
              borderRadius: 2,
              '&:hover': {
                color: 'primary.main'
              },
            }}
            onClick={() => onAddNode('request')}
          >
            <HttpIcon />
          </IconButton>
        </Tooltip>

        <Divider orientation='vertical' flexItem sx={{ mx: 0.5 }} />

        <Tooltip title={t('canvasToolbar.clearAddedIcons')}>
          <Button
            variant='outlined'
            color={'warning'}
            startIcon={<ClearAllOutlined />}
            size='small'
            onClick={onClearIntermediateNodes}
          >
            {t('canvasToolbar.clearButton')}
          </Button>
        </Tooltip>
      </Box>
    </Paper>
  );
};

export default CanvasToolbar;
