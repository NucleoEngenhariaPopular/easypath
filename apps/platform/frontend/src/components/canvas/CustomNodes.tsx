import { Handle, Position, type NodeProps, type Node } from '@xyflow/react';
import Typography from '@mui/material/Typography';
import { type CSSProperties } from 'react';
import type { CustomNodeData } from '../../types/canvasTypes';


const nodeBaseStyle: CSSProperties = {
  color: 'white',
  borderRadius: '8px',
  padding: '10px 20px',
  borderWidth: '2px',
  borderStyle: 'solid',
  boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontWeight: 'bold',
  textAlign: 'center',
  minWidth: 120,
};

const circleNodeStyle: CSSProperties = {
  ...nodeBaseStyle,
  borderRadius: '50%',
  width: 80,
  height: 80,
  padding: '5px',
};

export const nodeTypes = {
  start: (props: NodeProps<Node<CustomNodeData>>) => (
    <div
      style={{
        ...circleNodeStyle,
        backgroundColor: '#4CAF50', // Green
        borderColor: '#388E3C',
      }}
    >
      <Typography variant="caption" sx={{ userSelect: 'none', wordBreak: 'break-word' }}>
        {props.data.name || 'Start'}
      </Typography>
      <Handle type="source" position={Position.Bottom} />
    </div>
  ),
  normal: (props: NodeProps<Node<CustomNodeData>>) => (
    <div
      style={{
        ...nodeBaseStyle,
        backgroundColor: '#2196F3', // Blue
        borderColor: '#1976D2',
      }}
    >
      <Typography variant="body2" sx={{ userSelect: 'none', wordBreak: 'break-all' }}>
        {props.data.name || 'Normal Node'}
      </Typography>
      <Handle type="target" position={Position.Top} />
      <Handle type="source" position={Position.Bottom} />
    </div>
  ),
  end: (props: NodeProps<Node<CustomNodeData>>) => (
    <div
      style={{
        ...circleNodeStyle,
        backgroundColor: '#F44336', // Red
        borderColor: '#D32F2F',
      }}
    >
      <Typography variant="caption" sx={{ userSelect: 'none', wordBreak: 'break-word' }}>
        {props.data.name || 'End'}
      </Typography>
      <Handle type="target" position={Position.Top} />
    </div>
  ),
  request: (props: NodeProps<Node<CustomNodeData>>) => (
    <div
      style={{
        ...nodeBaseStyle,
        backgroundColor: '#FF9800', // Orange
        borderColor: '#FB8C00',
      }}
    >
      <Typography variant="body2" sx={{ userSelect: 'none', wordBreak: 'break-all' }}>
        {props.data.name || 'Request Node'}
      </Typography>
      <Handle type="target" position={Position.Top} />
      <Handle type="source" position={Position.Bottom} />
    </div>
  ),
};
