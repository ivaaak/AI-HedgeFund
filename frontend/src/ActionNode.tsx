import React from 'react';
import styles from './Dark.module.css';
import NodeTooltip from './NodeTooltip';
import {
  ActionType,
} from './types';

interface ActionNodeProps {
  type: ActionType;
  isActive: boolean;
}

const ActionNode: React.FC<ActionNodeProps> = ({ type, isActive }) => {
  // Create tooltip content based on action type
  const tooltipContent = `
    Action: ${type}
    Execution: Trade execution system
    Impact: ${type === 'BUY' ? 'Increases' : type === 'SELL' ? 'Decreases' : 'Maintains'} portfolio exposure
    Triggers: Order placement in trading system
    Constraints: Subject to risk limits and portfolio rules
  `;

  return (
    <NodeTooltip content={tooltipContent}>
      <div className={`${styles.node} ${styles.action} ${styles[type.toLowerCase()]} ${isActive ? styles.active : ''}`}>
        {type}
      </div>
    </NodeTooltip>
  );
};

export default ActionNode;