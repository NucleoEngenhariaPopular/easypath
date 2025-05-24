import HttpIcon from '@mui/icons-material/Http';
import TextFieldsIcon from '@mui/icons-material/TextFields';
import {
  Box,
  IconButton,
  Paper,
  Tooltip,
} from '@mui/material';
import React from 'react';

interface CanvasToolbarProps {
  onAddNode: (nodeType: string) => void;
}

const CanvasToolbar: React.FC<CanvasToolbarProps> = ({ onAddNode }) => {

  const handleToolClick = (tool: string) => {
    onAddNode(tool);
  };

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

        <Tooltip title="Add Normal Node">
          <IconButton
            color={'default'}
            sx={{
              borderRadius: 2,
              '&:hover': {
                color: 'primary.main'
              },
            }}
            onClick={() => handleToolClick('normal')}
          >
            <TextFieldsIcon />
          </IconButton>
        </Tooltip>

        <Tooltip title="Add Request Node">
          <IconButton
            color={'default'}
            sx={{
              borderRadius: 2,
              '&:hover': {
                color: 'primary.main'
              },
            }}
            onClick={() => handleToolClick('request')}
          >
            <HttpIcon />
          </IconButton>
        </Tooltip>
      </Box>
    </Paper>
  );
};

export default CanvasToolbar;
