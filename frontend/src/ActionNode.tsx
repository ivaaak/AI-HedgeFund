import React, { useState } from 'react';
import styles from './ProcessFlow.module.css';
import NodeTooltip from './NodeTooltip';
import { ActionType } from './types';

interface ActionNodeProps {
  type: ActionType;
  isActive: boolean;
  quantity?: number;
  history?: Array<{timestamp: number, action: ActionType, ticker: string, quantity: number}>;
}

const ActionNode: React.FC<ActionNodeProps> = ({ 
  type, 
  isActive,
  quantity,
  history = []
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  
  const toggleExpand = () => {
    setIsExpanded(!isExpanded);
  };

  // Create tooltip content based on action type
  const tooltipContent = `
    Action: ${type}
    Execution: Trade execution system
    Impact: ${type === 'BUY' ? 'Increases' : type === 'SELL' ? 'Decreases' : 'Maintains'} portfolio exposure
    Triggers: Order placement in trading system
    Constraints: Subject to risk limits and portfolio rules
  `;

  // Sample action history if not provided
  const actionHistory = history.length > 0 ? history : [
    { timestamp: Date.now() - 3600000 * 24 * 5, action: ActionType.BUY, ticker: 'AAPL', quantity: 50 },
    { timestamp: Date.now() - 3600000 * 24 * 3, action: ActionType.SELL, ticker: 'MSFT', quantity: 25 },
    { timestamp: Date.now() - 3600000 * 24 * 1, action: ActionType.HOLD, ticker: 'AMZN', quantity: 0 }
  ];

  return (
    <div className={styles.nodeWrapper}>
      <div 
        className={`${styles.node} ${styles.action} ${styles[type.toLowerCase()]} ${isActive ? styles.active : ''} ${isExpanded ? styles.expanded : ''}`}
        onClick={toggleExpand}
      >
        <div className={styles.actionContent}>
          <div className={styles.actionType}>{type}</div>
          {isActive && quantity && <div className={styles.quantity}>Qty: {quantity}</div>}
        </div>
        
        {isExpanded && (
          <div className={styles.expandedContent}>
            <h4>Recent Actions</h4>
            <div className={styles.actionHistory}>
              {actionHistory.map((item, index) => (
                <div key={index} className={styles.historyItem}>
                  <div className={`${styles.historyBadge} ${styles[item.action.toLowerCase()]}`}>
                    {item.action}
                  </div>
                  <div className={styles.historyDetails}>
                    <div>{item.ticker}</div>
                    <div>{item.quantity > 0 ? `Qty: ${item.quantity}` : '-'}</div>
                    <div>{new Date(item.timestamp).toLocaleDateString()}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
      
      <NodeTooltip content={tooltipContent} />
    </div>
  );
};

export default ActionNode;