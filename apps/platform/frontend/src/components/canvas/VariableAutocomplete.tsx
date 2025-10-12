import React, { useState, useEffect, useRef, useMemo, useCallback, useLayoutEffect } from 'react';
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
import { useTheme } from '@mui/material/styles';
import type { SxProps, Theme } from '@mui/material/styles';
import type { TextFieldProps } from '@mui/material';
import { useTranslation } from 'react-i18next';
import type { VariableInfo } from '../../types/canvasTypes';

interface VariableAutocompleteProps extends Omit<TextFieldProps, 'onChange'> {
  value: string;
  onChange: (value: string) => void;
  availableVariables: VariableInfo[];
}

const escapeHtml = (text: string) =>
  text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const getHighlightedMarkup = (text: string) => {
  if (!text) {
    return '&nbsp;';
  }

  const escaped = escapeHtml(text);
  return escaped.replace(/\{\{([\s\S]*?)\}\}/g, (_match, token) =>
    `<span class="variable-token">{{${token}}}</span>`,
  );
};

const mergeSx = (
  ...styles: Array<SxProps<Theme> | undefined>
): SxProps<Theme> => {
  const filtered = styles.filter(Boolean) as SxProps<Theme>[];
  if (filtered.length === 0) {
    return {};
  }
  if (filtered.length === 1) {
    return filtered[0];
  }
  return filtered as unknown as SxProps<Theme>;
};

const VariableAutocomplete: React.FC<VariableAutocompleteProps> = ({
  value,
  onChange,
  availableVariables,
  ...textFieldProps
}) => {
  const { t } = useTranslation();
  const theme = useTheme();
  const isBrowser = typeof window !== 'undefined';
  const [showDropdown, setShowDropdown] = useState(false);
  const [filteredVariables, setFilteredVariables] = useState<VariableInfo[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [triggerPosition, setTriggerPosition] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const textFieldRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null);
  const highlightRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const verticalPadding = textFieldProps.size === 'small' ? 8.5 : 16.5;
  const [overlayMetrics, setOverlayMetrics] = useState({
    top: verticalPadding,
    left: 14,
    width: 0,
    height: 0,
    paddingTop: 0,
    paddingRight: 0,
    paddingBottom: 0,
    paddingLeft: 0,
  });

  const highlightedMarkup = useMemo(() => getHighlightedMarkup(value), [value]);

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
        const search = textAfterTrigger.toLowerCase();
        setSearchTerm(search);
        setTriggerPosition(lastTriggerIndex);

        // Filter variables (show all if search is empty)
        const filtered = search.length === 0
          ? availableVariables
          : availableVariables.filter(v =>
              v.name.toLowerCase().includes(search) ||
              v.description.toLowerCase().includes(search)
            );

        setFilteredVariables(filtered);
        setShowDropdown(true); // Always show dropdown when {{ is detected
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

  const updateOverlayMetrics = useCallback(() => {
    if (!isBrowser) return;
    const textarea = inputRef.current;
    const highlightHost = highlightRef.current;
    const container = containerRef.current;
    if (!textarea || !highlightHost || !container) return;

    const containerRect = container.getBoundingClientRect();
    const textareaRect = textarea.getBoundingClientRect();

    const computed = window.getComputedStyle(textarea);
    const paddingTop = parseFloat(computed.paddingTop || '0');
    const paddingRight = parseFloat(computed.paddingRight || '0');
    const paddingBottom = parseFloat(computed.paddingBottom || '0');
    const paddingLeft = parseFloat(computed.paddingLeft || '0');

    setOverlayMetrics({
      top: textareaRect.top - containerRect.top,
      left: textareaRect.left - containerRect.left,
      width: textarea.clientWidth,
      height: textarea.clientHeight,
      paddingTop,
      paddingRight,
      paddingBottom,
      paddingLeft,
    });
  }, [isBrowser]);

  useLayoutEffect(() => {
    updateOverlayMetrics();
  }, [updateOverlayMetrics, value, textFieldProps.size]);

  useEffect(() => {
    if (!isBrowser) return;
    const textarea = inputRef.current;
    const container = containerRef.current;
    if (!textarea || !container || typeof ResizeObserver === 'undefined') return;

    const observer = new ResizeObserver(() => {
      updateOverlayMetrics();
    });

    observer.observe(textarea);
    observer.observe(container);

    return () => {
      observer.disconnect();
    };
  }, [updateOverlayMetrics, isBrowser]);

  useEffect(() => {
    if (!isBrowser) return;
    const handleResize = () => updateOverlayMetrics();
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [updateOverlayMetrics, isBrowser]);

  useEffect(() => {
    const textarea = inputRef.current;
    if (!textarea) return;

    const syncScroll = () => {
      if (!highlightRef.current) return;
      highlightRef.current.scrollTop = textarea.scrollTop;
      highlightRef.current.scrollLeft = textarea.scrollLeft;
    };

    textarea.addEventListener('scroll', syncScroll);

    return () => {
      textarea.removeEventListener('scroll', syncScroll);
    };
  }, []);

  useEffect(() => {
    if (!highlightRef.current || !inputRef.current) return;
    highlightRef.current.scrollTop = inputRef.current.scrollTop;
    highlightRef.current.scrollLeft = inputRef.current.scrollLeft;
  }, [value]);

  // Count variables in text
  const variableMatches = value.match(/\{\{[^}]+\}\}/g) || [];
  const variableCount = variableMatches.length;

  return (
    <Box position="relative" ref={containerRef}>
      <Box
        ref={highlightRef}
        aria-hidden
        sx={{
          position: 'absolute',
          top: overlayMetrics.width ? `${overlayMetrics.top}px` : 0,
          left: overlayMetrics.width ? `${overlayMetrics.left}px` : 0,
          width: overlayMetrics.width ? `${overlayMetrics.width}px` : undefined,
          height: overlayMetrics.height ? `${overlayMetrics.height}px` : undefined,
          paddingTop: overlayMetrics.width ? `${overlayMetrics.paddingTop}px` : `${verticalPadding}px`,
          paddingRight: overlayMetrics.width ? `${overlayMetrics.paddingRight}px` : '14px',
          paddingBottom: overlayMetrics.width ? `${overlayMetrics.paddingBottom}px` : `${verticalPadding}px`,
          paddingLeft: overlayMetrics.width ? `${overlayMetrics.paddingLeft}px` : '14px',
          pointerEvents: 'none',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
          overflow: 'hidden',
          color: 'transparent',
          fontFamily: '"Roboto Mono", "Courier New", monospace',
          fontSize: '0.9rem',
          lineHeight: 1.6,
          borderRadius: 8,
          zIndex: 0,
          '& .variable-token': {
            backgroundColor: theme.palette.mode === 'dark'
              ? 'rgba(102, 126, 234, 0.35)'
              : 'rgba(102, 126, 234, 0.18)',
            borderRadius: 4,
            boxShadow: theme.palette.mode === 'dark'
              ? '0 0 0 1px rgba(102, 126, 234, 0.5)'
              : '0 0 0 1px rgba(102, 126, 234, 0.35)',
          },
        }}
        dangerouslySetInnerHTML={{ __html: highlightedMarkup }}
      />
      <TextField
        {...textFieldProps}
        ref={textFieldRef}
        inputRef={inputRef}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        multiline
        minRows={(textFieldProps.minRows as number | undefined) ?? 3}
        maxRows={(textFieldProps.maxRows as number | undefined) ?? 6}
        helperText={
          textFieldProps.helperText || (
            availableVariables.length > 0 ? (
              <Box component="span">
                Type <Box component="span" sx={{
                  bgcolor: 'primary.main',
                  color: 'primary.contrastText',
                  px: 0.5,
                  py: 0.25,
                  borderRadius: 0.5,
                  fontFamily: 'monospace',
                  fontSize: '0.7rem',
                  fontWeight: 600,
                  mx: 0.5
                }}>
                  {'{{'}
                </Box> to insert variables
                {variableCount > 0 && (
                  <Box component="span" sx={{ ml: 1, color: 'success.main', fontWeight: 600 }}>
                    ({variableCount} variable{variableCount !== 1 ? 's' : ''} used)
                  </Box>
                )}
              </Box>
            ) : undefined
          )
        }
        sx={
          mergeSx(
            {
              '& .MuiOutlinedInput-root': {
                borderRadius: 2,
              },
              '& .MuiInputBase-root': {
                borderLeft: variableCount > 0 ? `3px solid ${theme.palette.primary.main}` : undefined,
                backgroundColor: theme.palette.mode === 'dark'
                  ? 'rgba(0, 0, 0, 0.2)'
                  : 'rgba(0, 0, 0, 0.02)',
                position: 'relative',
                zIndex: 1,
              },
              '& .MuiInputBase-input': {
                fontFamily: '"Roboto Mono", "Courier New", monospace',
                fontSize: '0.9rem',
                lineHeight: 1.6,
                color: theme.palette.text.primary,
              },
            },
            textFieldProps.sx,
          )
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
            {filteredVariables.length === 0 && searchTerm.length > 0 ? (
              <ListItem>
                <ListItemText
                  primary={t('variableAutocomplete.noVariablesFound')}
                  secondary={t('variableAutocomplete.searchedFor', { term: searchTerm })}
                />
              </ListItem>
            ) : filteredVariables.length === 0 ? (
              <ListItem>
                <ListItemText
                  primary="No variables available"
                  secondary="Define variables in previous nodes to use them here"
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
