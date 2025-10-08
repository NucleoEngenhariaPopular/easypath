import { ClearAllOutlined, FileUploadOutlined, FileDownloadOutlined, AccountTreeOutlined, PlayArrow, Stop } from '@mui/icons-material';
import HttpIcon from '@mui/icons-material/Http';
import TextFieldsIcon from '@mui/icons-material/TextFields';
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutline';
import FilterAltIcon from '@mui/icons-material/FilterAlt';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import { Box, Button, Divider, IconButton, Paper, Tooltip } from '@mui/material';
import React from 'react';
import { useTranslation } from 'react-i18next';

interface CanvasToolbarProps {
  onAddNode: (nodeType: string) => void;
  onClearIntermediateNodes: () => void;
  onImport: () => void;
  onExport: () => void;
  onAutoArrange: () => void;
  onTestModeToggle: () => void;
  isTestMode: boolean;
}

const CanvasToolbar: React.FC<CanvasToolbarProps> = ({
  onAddNode,
  onClearIntermediateNodes,
  onImport,
  onExport,
  onAutoArrange,
  onTestModeToggle,
  isTestMode
}) => {
  const { t } = useTranslation();

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

        <Tooltip title={t('canvasToolbar.addMessageNode')}>
          <IconButton
            color={'default'}
            sx={{
              borderRadius: 2,
              '&:hover': {
                color: 'primary.main'
              },
            }}
            onClick={() => onAddNode('message')}
          >
            <ChatBubbleOutlineIcon />
          </IconButton>
        </Tooltip>

        <Tooltip title={t('canvasToolbar.addExtractionNode')}>
          <IconButton
            color={'default'}
            sx={{
              borderRadius: 2,
              '&:hover': {
                color: 'primary.main'
              },
            }}
            onClick={() => onAddNode('extraction')}
          >
            <FilterAltIcon />
          </IconButton>
        </Tooltip>

        <Tooltip title={t('canvasToolbar.addValidationNode')}>
          <IconButton
            color={'default'}
            sx={{
              borderRadius: 2,
              '&:hover': {
                color: 'primary.main'
              },
            }}
            onClick={() => onAddNode('validation')}
          >
            <CheckCircleOutlineIcon />
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

        <Tooltip title={t('canvasToolbar.importFlow')}>
          <IconButton
            color={'default'}
            sx={{
              borderRadius: 2,
              '&:hover': {
                color: 'primary.main'
              },
            }}
            onClick={onImport}
          >
            <FileUploadOutlined />
          </IconButton>
        </Tooltip>

        <Tooltip title={t('canvasToolbar.exportFlow')}>
          <IconButton
            color={'default'}
            sx={{
              borderRadius: 2,
              '&:hover': {
                color: 'primary.main'
              },
            }}
            onClick={onExport}
          >
            <FileDownloadOutlined />
          </IconButton>
        </Tooltip>

        <Divider orientation='vertical' flexItem sx={{ mx: 0.5 }} />

        <Tooltip title={t('canvasToolbar.autoArrange')}>
          <IconButton
            color={'default'}
            sx={{
              borderRadius: 2,
              '&:hover': {
                color: 'primary.main'
              },
            }}
            onClick={onAutoArrange}
          >
            <AccountTreeOutlined />
          </IconButton>
        </Tooltip>

        <Divider orientation='vertical' flexItem sx={{ mx: 0.5 }} />

        <Tooltip title={isTestMode ? t('canvasToolbar.stopTest') : t('canvasToolbar.startTest')}>
          <Button
            variant={isTestMode ? 'contained' : 'outlined'}
            color={isTestMode ? 'success' : 'primary'}
            startIcon={isTestMode ? <Stop /> : <PlayArrow />}
            size='small'
            onClick={onTestModeToggle}
          >
            {isTestMode ? t('canvasToolbar.stopButton') : t('canvasToolbar.testButton')}
          </Button>
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
