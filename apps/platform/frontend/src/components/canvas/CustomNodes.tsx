import { Handle, Position, type NodeProps, type Node } from '@xyflow/react';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import StopIcon from '@mui/icons-material/Stop';
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutline';
import HttpIcon from '@mui/icons-material/Http';
import FilterAltIcon from '@mui/icons-material/FilterAlt';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import RecommendIcon from '@mui/icons-material/Recommend';
import SummarizeIcon from '@mui/icons-material/Summarize';
import PublicIcon from '@mui/icons-material/Public';
import { type CSSProperties } from 'react';
import type { CustomNodeData } from '../../types/canvasTypes';

const nodeBaseStyle: CSSProperties = {
  color: 'white',
  borderRadius: '12px',
  padding: '16px 20px',
  borderWidth: '0px',
  borderStyle: 'solid',
  boxShadow: '0 4px 12px rgba(0,0,0,0.15), 0 1px 3px rgba(0,0,0,0.08)',
  cursor: 'pointer',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  fontWeight: 'bold',
  textAlign: 'center',
  minWidth: 120,
  transition: 'all 0.2s ease-in-out',
};

const circleNodeStyle: CSSProperties = {
  borderRadius: '50%',
  width: 100,
  height: 100,
  padding: '10px',
  boxShadow: '0 6px 16px rgba(0,0,0,0.2), 0 2px 4px rgba(0,0,0,0.1)',
  cursor: 'pointer',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  fontWeight: 'bold',
  textAlign: 'center',
  transition: 'all 0.2s ease-in-out',
};

const handleStyle: CSSProperties = {
  width: '12px',
  height: '12px',
  border: '3px solid white',
  backgroundColor: '#555',
  boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
};

export const nodeTypes = {
  start: (props: NodeProps<Node<CustomNodeData>>) => (
    <Box
      sx={{
        ...circleNodeStyle,
        background: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
        '&:hover': {
          transform: 'scale(1.05)',
          boxShadow: '0 8px 20px rgba(67, 233, 123, 0.4), 0 3px 6px rgba(0,0,0,0.15)',
        },
      }}
    >
      <PlayArrowIcon sx={{ fontSize: 32, mb: 0.5, color: 'white' }} />
      <Typography
        variant="caption"
        sx={{
          userSelect: 'none',
          wordBreak: 'break-word',
          textAlign: 'center',
          fontSize: '0.7rem',
          lineHeight: 1.2,
          fontWeight: 600,
          color: 'white',
        }}
      >
        {props.data.name || 'Start'}
      </Typography>
      <Handle type="source" position={Position.Bottom} style={handleStyle} />
    </Box>
  ),
  normal: (props: NodeProps<Node<CustomNodeData>>) => (
    <Box
      sx={{
        ...nodeBaseStyle,
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        minWidth: 170,
        maxWidth: 280,
        '&:hover': {
          transform: 'translateY(-2px)',
          boxShadow: '0 6px 16px rgba(102, 126, 234, 0.4), 0 2px 6px rgba(0,0,0,0.15)',
        },
      }}
    >
      <ChatBubbleOutlineIcon sx={{ fontSize: 24, mb: 1, color: 'rgba(255,255,255,0.9)' }} />
      <Typography
        variant="body2"
        sx={{
          userSelect: 'none',
          wordBreak: 'break-word',
          textAlign: 'center',
          fontSize: '0.875rem',
          lineHeight: 1.4,
          fontWeight: 500,
          color: 'white',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          display: '-webkit-box',
          WebkitLineClamp: 3,
          WebkitBoxOrient: 'vertical',
        }}
      >
        {props.data.name || 'Normal Node'}
      </Typography>
      <Handle type="target" position={Position.Top} style={handleStyle} />
      <Handle type="source" position={Position.Bottom} style={handleStyle} />
    </Box>
  ),
  end: (props: NodeProps<Node<CustomNodeData>>) => (
    <Box
      sx={{
        ...circleNodeStyle,
        background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
        '&:hover': {
          transform: 'scale(1.05)',
          boxShadow: '0 8px 20px rgba(245, 87, 108, 0.4), 0 3px 6px rgba(0,0,0,0.15)',
        },
      }}
    >
      <StopIcon sx={{ fontSize: 32, mb: 0.5, color: 'white' }} />
      <Typography
        variant="caption"
        sx={{
          userSelect: 'none',
          wordBreak: 'break-word',
          textAlign: 'center',
          fontSize: '0.7rem',
          lineHeight: 1.2,
          fontWeight: 600,
          color: 'white',
        }}
      >
        {props.data.name || 'End'}
      </Typography>
      <Handle type="target" position={Position.Top} style={handleStyle} />
    </Box>
  ),
  request: (props: NodeProps<Node<CustomNodeData>>) => (
    <Box
      sx={{
        ...nodeBaseStyle,
        background: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
        minWidth: 170,
        maxWidth: 280,
        '&:hover': {
          transform: 'translateY(-2px)',
          boxShadow: '0 6px 16px rgba(250, 112, 154, 0.4), 0 2px 6px rgba(0,0,0,0.15)',
        },
      }}
    >
      <HttpIcon sx={{ fontSize: 24, mb: 1, color: 'rgba(255,255,255,0.9)' }} />
      <Typography
        variant="body2"
        sx={{
          userSelect: 'none',
          wordBreak: 'break-word',
          textAlign: 'center',
          fontSize: '0.875rem',
          lineHeight: 1.4,
          fontWeight: 500,
          color: 'white',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          display: '-webkit-box',
          WebkitLineClamp: 3,
          WebkitBoxOrient: 'vertical',
        }}
      >
        {props.data.name || 'Request Node'}
      </Typography>
      <Handle type="target" position={Position.Top} style={handleStyle} />
      <Handle type="source" position={Position.Bottom} style={handleStyle} />
    </Box>
  ),
  extraction: (props: NodeProps<Node<CustomNodeData>>) => (
    <Box
      sx={{
        ...nodeBaseStyle,
        background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
        minWidth: 170,
        maxWidth: 280,
        '&:hover': {
          transform: 'translateY(-2px)',
          boxShadow: '0 6px 16px rgba(240, 147, 251, 0.4), 0 2px 6px rgba(0,0,0,0.15)',
        },
      }}
    >
      <FilterAltIcon sx={{ fontSize: 24, mb: 1, color: 'rgba(255,255,255,0.9)' }} />
      <Typography
        variant="body2"
        sx={{
          userSelect: 'none',
          wordBreak: 'break-word',
          textAlign: 'center',
          fontSize: '0.875rem',
          lineHeight: 1.4,
          fontWeight: 500,
          color: 'white',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          display: '-webkit-box',
          WebkitLineClamp: 3,
          WebkitBoxOrient: 'vertical',
        }}
      >
        {props.data.name || 'Extraction Node'}
      </Typography>
      <Handle type="target" position={Position.Top} style={handleStyle} />
      <Handle type="source" position={Position.Bottom} style={handleStyle} />
    </Box>
  ),
  validation: (props: NodeProps<Node<CustomNodeData>>) => (
    <Box
      sx={{
        ...nodeBaseStyle,
        background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
        minWidth: 170,
        maxWidth: 280,
        '&:hover': {
          transform: 'translateY(-2px)',
          boxShadow: '0 6px 16px rgba(79, 172, 254, 0.4), 0 2px 6px rgba(0,0,0,0.15)',
        },
      }}
    >
      <CheckCircleOutlineIcon sx={{ fontSize: 24, mb: 1, color: 'rgba(255,255,255,0.9)' }} />
      <Typography
        variant="body2"
        sx={{
          userSelect: 'none',
          wordBreak: 'break-word',
          textAlign: 'center',
          fontSize: '0.875rem',
          lineHeight: 1.4,
          fontWeight: 500,
          color: 'white',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          display: '-webkit-box',
          WebkitLineClamp: 3,
          WebkitBoxOrient: 'vertical',
        }}
      >
        {props.data.name || 'Validation Node'}
      </Typography>
      <Handle type="target" position={Position.Top} style={handleStyle} />
      <Handle type="source" position={Position.Bottom} style={handleStyle} />
    </Box>
  ),
  recommendation: (props: NodeProps<Node<CustomNodeData>>) => (
    <Box
      sx={{
        ...nodeBaseStyle,
        background: 'linear-gradient(135deg, #fccb90 0%, #d57eeb 100%)',
        minWidth: 170,
        maxWidth: 280,
        '&:hover': {
          transform: 'translateY(-2px)',
          boxShadow: '0 6px 16px rgba(252, 203, 144, 0.4), 0 2px 6px rgba(0,0,0,0.15)',
        },
      }}
    >
      <RecommendIcon sx={{ fontSize: 24, mb: 1, color: 'rgba(255,255,255,0.9)' }} />
      <Typography
        variant="body2"
        sx={{
          userSelect: 'none',
          wordBreak: 'break-word',
          textAlign: 'center',
          fontSize: '0.875rem',
          lineHeight: 1.4,
          fontWeight: 500,
          color: 'white',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          display: '-webkit-box',
          WebkitLineClamp: 3,
          WebkitBoxOrient: 'vertical',
        }}
      >
        {props.data.name || 'Recommendation Node'}
      </Typography>
      <Handle type="target" position={Position.Top} style={handleStyle} />
      <Handle type="source" position={Position.Bottom} style={handleStyle} />
    </Box>
  ),
  summary: (props: NodeProps<Node<CustomNodeData>>) => (
    <Box
      sx={{
        ...nodeBaseStyle,
        background: 'linear-gradient(135deg, #e0c3fc 0%, #8ec5fc 100%)',
        minWidth: 170,
        maxWidth: 280,
        '&:hover': {
          transform: 'translateY(-2px)',
          boxShadow: '0 6px 16px rgba(224, 195, 252, 0.4), 0 2px 6px rgba(0,0,0,0.15)',
        },
      }}
    >
      <SummarizeIcon sx={{ fontSize: 24, mb: 1, color: 'rgba(255,255,255,0.9)' }} />
      <Typography
        variant="body2"
        sx={{
          userSelect: 'none',
          wordBreak: 'break-word',
          textAlign: 'center',
          fontSize: '0.875rem',
          lineHeight: 1.4,
          fontWeight: 500,
          color: 'white',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          display: '-webkit-box',
          WebkitLineClamp: 3,
          WebkitBoxOrient: 'vertical',
        }}
      >
        {props.data.name || 'Summary Node'}
      </Typography>
      <Handle type="target" position={Position.Top} style={handleStyle} />
      <Handle type="source" position={Position.Bottom} style={handleStyle} />
    </Box>
  ),
  message: (props: NodeProps<Node<CustomNodeData>>) => (
    <Box
      sx={{
        ...nodeBaseStyle,
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        minWidth: 170,
        maxWidth: 280,
        '&:hover': {
          transform: 'translateY(-2px)',
          boxShadow: '0 6px 16px rgba(102, 126, 234, 0.4), 0 2px 6px rgba(0,0,0,0.15)',
        },
      }}
    >
      <ChatBubbleOutlineIcon sx={{ fontSize: 24, mb: 1, color: 'rgba(255,255,255,0.9)' }} />
      <Typography
        variant="body2"
        sx={{
          userSelect: 'none',
          wordBreak: 'break-word',
          textAlign: 'center',
          fontSize: '0.875rem',
          lineHeight: 1.4,
          fontWeight: 500,
          color: 'white',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          display: '-webkit-box',
          WebkitLineClamp: 3,
          WebkitBoxOrient: 'vertical',
        }}
      >
        {props.data.name || 'Message Node'}
      </Typography>
      <Handle type="target" position={Position.Top} style={handleStyle} />
      <Handle type="source" position={Position.Bottom} style={handleStyle} />
    </Box>
  ),
  global: (props: NodeProps<Node<CustomNodeData>>) => (
    <Box
      sx={{
        ...nodeBaseStyle,
        background: 'linear-gradient(135deg, #ff9a56 0%, #ff6a00 100%)',
        minWidth: 170,
        maxWidth: 280,
        borderRadius: '8px',
        clipPath: 'polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)',
        '&:hover': {
          transform: 'translateY(-2px) scale(1.02)',
          boxShadow: '0 8px 20px rgba(255, 154, 86, 0.5), 0 3px 8px rgba(0,0,0,0.2)',
        },
      }}
    >
      <PublicIcon sx={{ fontSize: 26, mb: 1, color: 'rgba(255,255,255,0.95)' }} />
      <Typography
        variant="body2"
        sx={{
          userSelect: 'none',
          wordBreak: 'break-word',
          textAlign: 'center',
          fontSize: '0.875rem',
          lineHeight: 1.4,
          fontWeight: 600,
          color: 'white',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          display: '-webkit-box',
          WebkitLineClamp: 3,
          WebkitBoxOrient: 'vertical',
        }}
      >
        {props.data.name || 'Global Node'}
      </Typography>
      <Handle type="target" position={Position.Top} style={handleStyle} />
      <Handle type="source" position={Position.Bottom} style={handleStyle} />
    </Box>
  ),
};
