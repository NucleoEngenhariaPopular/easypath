import React, { useState, useEffect, useRef } from 'react';
import {
  TextField,
  Popper,
  Paper,
  List,
  ListItem,
  ListItemText,
  ListItemButton,
  Box,
  Typography,
  Chip,
} from '@mui/material';
import type { TextFieldProps } from '@mui/material';
import { useTranslation } from 'react-i18next';
import type { VariableInfo } from '../../types/canvasTypes';

interface VariableAutocompleteProps extends Omit<TextFieldProps, 'onChange'> {
  value: string;
  onChange: (value: string) => void;
  availableVariables: VariableInfo[];
}

const VariableAutocomplete: React.FC<VariableAutocompleteProps> = ({
  value,
  onChange,
  availableVariables,
  ...textFieldProps
}) => {
  const { t } = useTranslation();
  const [showDropdown, setShowDropdown] = useState(false);
  const [filteredVariables, setFilteredVariables] = useState<VariableInfo[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [triggerPosition, setTriggerPosition] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const textFieldRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null);

  // Detect {{ trigger and show autocomplete
  useEffect(() => {
    if (!inputRef.current) return;

    const cursorPosition = inputRef.current.selectionStart || 0;
    const textBeforeCursor = value.substring(0, cursorPosition);
    
    // Check for {{ trigger
    const lastTriggerIndex = textBeforeCursor.lastIndexOf('{{');
    
    if (lastTriggerIndex !== -1) {
      // Check if we have a closing }} after the trigger
      const textAfterTrigger = textBeforeCursor.substring(lastTriggerIndex + 2);
      const hasClosing = textAfterTrigger.includes('}}');
      
      if (!hasClosing) {
        // We're in an open {{ without closing
        const search = textAfterTrigger.trim().toLowerCase();
        setSearchTerm(search);
        setTriggerPosition(lastTriggerIndex);
        
        // Filter variables
        const filtered = availableVariables.filter(v =>
          v.name.toLowerCase().includes(search) ||
          v.description.toLowerCase().includes(search)
        );
        
        setFilteredVariables(filtered);
        setShowDropdown(filtered.length > 0);
        setSelectedIndex(0);
      } else {
        setShowDropdown(false);
      }
    } else {
      setShowDropdown(false);
    }
  }, [value, availableVariables]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showDropdown) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => Math.min(prev + 1, filteredVariables.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => Math.max(prev - 1, 0));
        break;
      case 'Enter':
        if (filteredVariables.length > 0) {
          e.preventDefault();
          insertVariable(filteredVariables[selectedIndex]);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setShowDropdown(false);
        break;
    }
  };

  const insertVariable = (variable: VariableInfo) => {
    if (triggerPosition === null || !inputRef.current) return;

    const cursorPosition = inputRef.current.selectionStart || 0;
    const textBeforeTrigger = value.substring(0, triggerPosition);
    const textAfterCursor = value.substring(cursorPosition);
    
    const newValue = `${textBeforeTrigger}{{${variable.name}}}${textAfterCursor}`;
    onChange(newValue);
    
    setShowDropdown(false);
    setTriggerPosition(null);
    
    // Set cursor position after the inserted variable
    setTimeout(() => {
      if (inputRef.current) {
        const newCursorPos = triggerPosition + variable.name.length + 4; // 4 for {{}}
        inputRef.current.setSelectionRange(newCursorPos, newCursorPos);
        inputRef.current.focus();
      }
    }, 0);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    onChange(e.target.value);
  };

  return (
    <Box position="relative">
      <TextField
        {...textFieldProps}
        ref={textFieldRef}
        inputRef={inputRef}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        helperText={
          availableVariables.length > 0
            ? t('variableAutocomplete.helperText', { count: availableVariables.length })
            : textFieldProps.helperText
        }
      />
      
      <Popper
        open={showDropdown}
        anchorEl={textFieldRef.current}
        placement="bottom-start"
        style={{ zIndex: 1300, width: textFieldRef.current?.offsetWidth || 300 }}
      >
        <Paper elevation={8} sx={{ maxHeight: 300, overflow: 'auto', mt: 0.5 }}>
          <List dense>
            {filteredVariables.length === 0 ? (
              <ListItem>
                <ListItemText
                  primary={t('variableAutocomplete.noVariablesFound')}
                  secondary={t('variableAutocomplete.searchedFor', { term: searchTerm })}
                />
              </ListItem>
            ) : (
              filteredVariables.map((variable, index) => (
                <ListItemButton
                  key={variable.name}
                  selected={index === selectedIndex}
                  onClick={() => insertVariable(variable)}
                  sx={{
                    '&.Mui-selected': {
                      backgroundColor: 'primary.light',
                      '&:hover': {
                        backgroundColor: 'primary.light',
                      },
                    },
                  }}
                >
                  <ListItemText
                    primary={
                      <Box display="flex" alignItems="center" gap={1}>
                        <Typography variant="body2" fontWeight="bold">
                          {`{{${variable.name}}}`}
                        </Typography>
                        <Chip
                          label={variable.type}
                          size="small"
                          sx={{ height: 18, fontSize: '0.7rem' }}
                        />
                        {variable.required && (
                          <Chip
                            label={t('variableInspector.requiredChip')}
                            size="small"
                            color="warning"
                            sx={{ height: 18, fontSize: '0.7rem' }}
                          />
                                )}
                              </Box>
                            }
                            secondary={
                              <Box>
                                <Typography variant="caption" display="block">
                                  {variable.description}
                                </Typography>
                                <Typography variant="caption" color="text.disabled" display="block">
                                  {t('variableAutocomplete.fromLabel')} {variable.sourceNodeName}
                                </Typography>
                              </Box>
                            }
                  />
                </ListItemButton>
              ))
            )}
          </List>
        </Paper>
      </Popper>
    </Box>
  );
};

export default VariableAutocomplete;

