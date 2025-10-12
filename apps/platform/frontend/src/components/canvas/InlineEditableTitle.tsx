import React, { useState, useRef, useEffect } from 'react';
import { Box, TextField, Typography, IconButton } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';

interface InlineEditableTitleProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

const InlineEditableTitle: React.FC<InlineEditableTitleProps> = ({
  value,
  onChange,
  placeholder = 'Untitled Flow',
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setEditValue(value);
  }, [value]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleStartEdit = () => {
    setIsEditing(true);
    setEditValue(value);
  };

  const handleSave = () => {
    const trimmedValue = editValue.trim();
    if (trimmedValue && trimmedValue !== value) {
      onChange(trimmedValue);
    } else if (!trimmedValue) {
      setEditValue(value); // Revert to original if empty
    }
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditValue(value);
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleCancel();
    }
  };

  const handleBlur = () => {
    handleSave();
  };

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 0.25, // reduced gap for closer icon and text
        padding: '4px 16px',
        minWidth: 300,
        maxWidth: 600,
      }}
    >
      {isEditing ? (
        <TextField
          inputRef={inputRef}
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
          variant="standard"
          fullWidth
          placeholder={placeholder}
          InputProps={{
            disableUnderline: false,
            sx: {
              fontSize: '1.25rem',
              fontWeight: 600,
            },
          }}
        />
      ) : (
        // Combine Typography and IconButton in a flex Box for tighter layout
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.25, flexGrow: 1 }}>
          <Typography
            variant="h6"
            sx={{
              cursor: 'pointer',
              fontWeight: 600,
              color: value ? 'text.primary' : 'text.secondary',
              userSelect: 'none',
              transition: 'opacity 0.2s',
              '&:hover': {
                opacity: 0.7,
              },
              // Reduce margin for right space
              marginRight: 0,
            }}
            onClick={handleStartEdit}
          >
            {value || placeholder}
          </Typography>
          <IconButton
            size="small"
            onClick={handleStartEdit}
            sx={{
              opacity: 0.5,
              transition: 'opacity 0.2s',
              ml: 0, // Remove default margin left if any
              p: '8px', // smaller padding for proximity
              '&:hover': {
                opacity: 1,
              },
            }}
          >
            <EditIcon fontSize="small" />
          </IconButton>
        </Box>
      )}
    </Box>
  );
};

export default InlineEditableTitle;
