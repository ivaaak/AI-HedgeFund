import React, { useState, useRef, useEffect } from 'react';
import styles from './ProcessFlow.module.css';
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
  const [showTooltip, setShowTooltip] = useState(false);
  const tooltipTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Cleanup tooltip timeout on unmount
  useEffect(() => {
    return () => {
      if (tooltipTimeoutRef.current) {
        clearTimeout(tooltipTimeoutRef.current);
      }
    };
  }, []);
  
  const toggleExpand = (e: React.MouseEvent) => {
    if (!(e.target as HTMLElement).closest(`.${styles.infoButton}`)) {
      setIsExpanded(!isExpanded);
    }
  };

  // Filter history to show only actions matching this node's type
  const filteredHistory = history.length > 0 
    ? history.filter(item => item.action === type)
    : [
        { timestamp: Date.now() - 3600000 * 24 * 5, action: ActionType.BUY, ticker: 'AAPL', quantity: 50 },
        { timestamp: Date.now() - 3600000 * 24 * 3, action: ActionType.SELL, ticker: 'MSFT', quantity: 25 },
        { timestamp: Date.now() - 3600000 * 24 * 1, action: ActionType.HOLD, ticker: 'AMZN', quantity: 0 }
      ].filter(item => item.action === type);

  return (
    <div className={styles.nodeWrapper}>
      <div 
        className={`${styles.node} ${styles.action} ${styles[type.toLowerCase()]} ${isActive ? styles.active : ''} ${isExpanded ? styles.expanded : ''}`}
        onClick={toggleExpand}
      >
        <div className={styles.actionHeader}>
          <div className={styles.actionType}>{type}</div>
          <button 
            className={styles.infoButton} 
            aria-label="Action Information"
            onClick={(e) => { 
              e.stopPropagation();
              setShowTooltip(!showTooltip);
            }}
            onMouseEnter={() => {
              if (tooltipTimeoutRef.current) {
                clearTimeout(tooltipTimeoutRef.current);
              }
              setShowTooltip(true);
            }}
            onMouseLeave={() => {
              tooltipTimeoutRef.current = setTimeout(() => {
                setShowTooltip(false);
              }, 300);
            }}
          >
            ?
            <div className={`${styles.nodeTooltip} ${styles.tooltipBottom} ${showTooltip ? styles.visible : ''}`}>
              <div className={styles.tooltipTitle}>{type} Action</div>
              <div className={styles.tooltipRow}>
                <span className={styles.tooltipLabel}>Execution:</span>
                <span>Trade execution system</span>
              </div>
              <div className={styles.tooltipRow}>
                <span className={styles.tooltipLabel}>Impact:</span>
                <span>
                  {type === 'BUY' ? 'Increases' : type === 'SELL' ? 'Decreases' : 'Maintains'} portfolio exposure
                </span>
              </div>
              <div className={styles.tooltipRow}>
                <span className={styles.tooltipLabel}>Triggers:</span>
                <span>Order placement in trading system</span>
              </div>
              <div className={styles.tooltipRow}>
                <span className={styles.tooltipLabel}>Constraints:</span>
                <span>Subject to risk limits and rules</span>
              </div>
            </div>
          </button>
          {isActive && <span className={styles.statusIndicator}></span>}
        </div>
        
        <div className={styles.actionContent}>
          {isActive && quantity && <div className={styles.quantity}>Qty: {quantity}</div>}
        </div>
        
        {isExpanded && (
          <div className={styles.expandedContent}>
            Recent {type} Actions:
            <div className={styles.actionHistory}>
              {filteredHistory.map((item, index) => (
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
              {filteredHistory.length === 0 && (
                <div className={styles.emptyHistory}>No {type} actions found</div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ActionNode;