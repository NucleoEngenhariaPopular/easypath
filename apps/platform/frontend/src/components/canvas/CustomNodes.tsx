import { Handle, Position, type NodeProps, type Node } from '@xyflow/react';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import Tooltip from '@mui/material/Tooltip';
import { alpha } from '@mui/material/styles';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import StopIcon from '@mui/icons-material/Stop';
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutline';
import HttpIcon from '@mui/icons-material/Http';
import FilterAltIcon from '@mui/icons-material/FilterAlt';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import RecommendIcon from '@mui/icons-material/Recommend';
import SummarizeIcon from '@mui/icons-material/Summarize';
import PublicIcon from '@mui/icons-material/Public';
import DataObjectIcon from '@mui/icons-material/DataObject';
import { type CSSProperties, type ElementType } from 'react';
import { useTranslation } from 'react-i18next';
import type { CustomNodeData } from '../../types/canvasTypes';

// Variable Badge Component
const VariableBadge = ({ data, accent }: { data: CustomNodeData; accent: string }) => {
  const { t } = useTranslation();
  const varCount = data.extractVars?.length || 0;
  if (varCount === 0) return null;

  const varNames = data.extractVars?.map((v) => v.name).join(', ') || '';
  const badgeBackground = alpha(accent, 0.12);
  const badgeBorder = alpha(accent, 0.35);

  return (
    <Tooltip title={`${t('variableInspector.extractsLabel')} ${varNames}`} placement="top">
      <Box
        sx={{
          position: 'absolute',
          top: 12,
          right: 12,
          display: 'inline-flex',
          alignItems: 'center',
          gap: 0.5,
          px: 0.75,
          py: 0.3,
          borderRadius: 999,
          fontSize: '0.675rem',
          fontWeight: 600,
          letterSpacing: 0.2,
          backgroundColor: badgeBackground,
          color: accent,
          border: `1px solid ${badgeBorder}`,
          boxShadow: '0 6px 16px rgba(15, 23, 42, 0.12)',
        }}
      >
        <DataObjectIcon sx={{ fontSize: 14 }} />
        {varCount}
      </Box>
    </Tooltip>
  );
};

const baseHandleStyle: CSSProperties = {
  width: 10,
  height: 10,
  borderRadius: '50%',
  border: '2px solid #ffffff',
  background: '#64748b',
  boxShadow: '0 2px 6px rgba(15, 23, 42, 0.15)',
};

type NodeComponent = (props: NodeProps<Node<CustomNodeData>>) => JSX.Element;

type CardConfig = {
  accent: string;
  icon: ElementType;
  fallback: string;
};

const createCardNode = ({ accent, icon: Icon, fallback }: CardConfig): NodeComponent => (props) => {
  const title = props.data.name || fallback;
  const accentSoft = alpha(accent, 0.16);
  const accentBorder = alpha(accent, 0.28);

  return (
    <Box
      sx={(theme) => ({
        position: 'relative',
        minWidth: 190,
        maxWidth: 280,
        borderRadius: 2,
        padding: '16px 18px',
        backgroundColor:
          theme.palette.mode === 'dark'
            ? alpha('#0f172a', 0.7)
            : '#ffffff',
        border: `1px solid ${
          theme.palette.mode === 'dark'
            ? alpha('#e2e8f0', 0.18)
            : alpha('#0f172a', 0.08)
        }`,
        boxShadow:
          theme.palette.mode === 'dark'
            ? '0 12px 24px rgba(15, 23, 42, 0.55)'
            : '0 16px 32px rgba(15, 23, 42, 0.08)',
        display: 'flex',
        flexDirection: 'column',
        gap: 1.25,
        cursor: 'pointer',
        transition: 'transform 140ms ease, box-shadow 140ms ease',
        alignItems: 'stretch',
        textAlign: 'left',
        userSelect: 'none',
        '&:hover': {
          transform: 'translateY(-3px)',
          boxShadow:
            theme.palette.mode === 'dark'
              ? '0 18px 32px rgba(15, 23, 42, 0.6)'
              : '0 20px 36px rgba(15, 23, 42, 0.12)',
        },
      })}
    >
      <VariableBadge data={props.data} accent={accent} />
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
        <Box
          sx={{
            width: 32,
            height: 32,
            borderRadius: 1.25,
            backgroundColor: accentSoft,
            border: `1px solid ${accentBorder}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: accent,
          }}
        >
          <Icon sx={{ fontSize: 18 }} />
        </Box>
        <Typography
          variant="body2"
          sx={{
            fontWeight: 600,
            fontSize: '0.9rem',
            lineHeight: 1.35,
            color: 'text.primary',
            wordBreak: 'break-word',
          }}
        >
          {title}
        </Typography>
      </Box>
      {props.data.nodeDescription && (
        <Typography
          variant="caption"
          sx={{
            color: 'text.secondary',
            lineHeight: 1.4,
            wordBreak: 'break-word',
          }}
        >
          {props.data.nodeDescription}
        </Typography>
      )}
      <Handle type="target" position={Position.Top} style={{ ...baseHandleStyle, background: accent }} />
      <Handle type="source" position={Position.Bottom} style={{ ...baseHandleStyle, background: accent }} />
    </Box>
  );
};

const cardNodeConfigs: Record<string, CardConfig> = {
  normal: { accent: '#475569', icon: ChatBubbleOutlineIcon, fallback: 'Normal Node' },
  message: { accent: '#2563eb', icon: ChatBubbleOutlineIcon, fallback: 'Message Node' },
  request: { accent: '#f97316', icon: HttpIcon, fallback: 'Request Node' },
  extraction: { accent: '#0ea5e9', icon: FilterAltIcon, fallback: 'Extraction Node' },
  validation: { accent: '#6366f1', icon: CheckCircleOutlineIcon, fallback: 'Validation Node' },
  recommendation: { accent: '#f59e0b', icon: RecommendIcon, fallback: 'Recommendation Node' },
  summary: { accent: '#818cf8', icon: SummarizeIcon, fallback: 'Summary Node' },
  global: { accent: '#14b8a6', icon: PublicIcon, fallback: 'Global Node' },
};

const startNode: NodeComponent = (props) => {
  const accent = '#0f766e';
  return (
    <Box
      sx={(theme) => ({
        position: 'relative',
        width: 92,
        height: 92,
        borderRadius: '50%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 0.5,
        backgroundColor: alpha(accent, theme.palette.mode === 'dark' ? 0.28 : 0.12),
        border: `2px solid ${alpha(accent, 0.45)}`,
        color: accent,
        boxShadow:
          theme.palette.mode === 'dark'
            ? '0 12px 24px rgba(15, 23, 42, 0.5)'
            : '0 16px 28px rgba(15, 23, 42, 0.12)',
        userSelect: 'none',
        textAlign: 'center',
      })}
    >
      <PlayArrowIcon sx={{ fontSize: 26 }} />
      <Typography
        variant="caption"
        sx={{
          fontWeight: 600,
          fontSize: '0.7rem',
          textTransform: 'uppercase',
          letterSpacing: 0.8,
          color: 'inherit',
        }}
      >
        {props.data.name || 'Start'}
      </Typography>
      <Handle type="source" position={Position.Bottom} style={{ ...baseHandleStyle, background: accent }} />
    </Box>
  );
};

const endNode: NodeComponent = (props) => {
  const accent = '#b91c1c';
  return (
    <Box
      sx={(theme) => ({
        position: 'relative',
        width: 92,
        height: 92,
        borderRadius: '50%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 0.5,
        backgroundColor: alpha(accent, theme.palette.mode === 'dark' ? 0.24 : 0.12),
        border: `2px solid ${alpha(accent, 0.4)}`,
        color: accent,
        boxShadow:
          theme.palette.mode === 'dark'
            ? '0 12px 24px rgba(15, 23, 42, 0.5)'
            : '0 16px 28px rgba(15, 23, 42, 0.12)',
        userSelect: 'none',
        textAlign: 'center',
      })}
    >
      <StopIcon sx={{ fontSize: 26 }} />
      <Typography
        variant="caption"
        sx={{
          fontWeight: 600,
          fontSize: '0.7rem',
          textTransform: 'uppercase',
          letterSpacing: 0.8,
          color: 'inherit',
        }}
      >
        {props.data.name || 'End'}
      </Typography>
      <Handle type="target" position={Position.Top} style={{ ...baseHandleStyle, background: accent }} />
    </Box>
  );
};

export const nodeTypes: Record<string, NodeComponent> = {
  start: startNode,
  end: endNode,
  normal: createCardNode(cardNodeConfigs.normal),
  message: createCardNode(cardNodeConfigs.message),
  request: createCardNode(cardNodeConfigs.request),
  extraction: createCardNode(cardNodeConfigs.extraction),
  validation: createCardNode(cardNodeConfigs.validation),
  recommendation: createCardNode(cardNodeConfigs.recommendation),
  summary: createCardNode(cardNodeConfigs.summary),
  global: createCardNode(cardNodeConfigs.global),
};
