import React, { useState } from 'react';
import styles from './ProcessFlow.module.css';
import NodeInfo from './NodeInfo';
import { ActionType, PortfolioDecision, TradeRecord } from './types';

interface ActionNodeProps {
  id: string;
  type: ActionType;
  // Current decisions of this node's type, as [ticker, decision]
  decisions: Array<[string, PortfolioDecision]>;
  // Executed trades of this node's type, oldest first
  history: TradeRecord[];
}

const ActionNode: React.FC<ActionNodeProps> = ({
  id,
  type,
  decisions,
  history
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const isActive = decisions.length > 0;
  const recentTrades = history.slice(-5).reverse();

  const toggleExpand = (e: React.MouseEvent) => {
    if (!(e.target as HTMLElement).closest(`.${styles.infoButton}`)) {
      setIsExpanded(!isExpanded);
    }
  };

  return (
    <div className={styles.nodeWrapper} id={id}>
      <div
        className={`${styles.node} ${styles.action} ${styles[type.toLowerCase()]} ${isActive ? styles.active : ''} ${isExpanded ? styles.expanded : ''}`}
        onClick={toggleExpand}
      >
        <div className={styles.actionHeader}>
          <div className={styles.actionType}>{type}</div>
          <NodeInfo
            title={`${type} Action`}
            bottom
            rows={[
              ['Execution', 'Paper trade against the latest close'],
              ['Impact', `${type === 'BUY' ? 'Increases' : type === 'SELL' ? 'Decreases' : 'Maintains'} portfolio exposure`],
              ['Constraints', 'Subject to position limits, cash and shares held']
            ]}
          />
          {isActive && <span className={styles.statusIndicator}></span>}
        </div>

        <div className={styles.actionContent}>
          {decisions.map(([ticker, decision]) => (
            <div key={ticker} className={styles.quantity}>
              {ticker}{decision.quantity > 0 ? ` × ${decision.quantity}` : ''}
            </div>
          ))}
        </div>

        {isExpanded && type !== ActionType.HOLD && (
          <div className={styles.expandedContent}>
            Recent {type} trades:
            <div className={styles.actionHistory}>
              {recentTrades.map((trade, index) => (
                <div key={index} className={styles.historyItem}>
                  <div className={`${styles.historyBadge} ${styles[trade.action]}`}>
                    {trade.action.toUpperCase()}
                  </div>
                  <div className={styles.historyDetails}>
                    <div>{trade.ticker}</div>
                    <div>{trade.quantity} @ ${trade.price.toFixed(2)}</div>
                    <div>{new Date(trade.date).toLocaleDateString()}</div>
                  </div>
                </div>
              ))}
              {recentTrades.length === 0 && (
                <div className={styles.placeholder}>No {type} trades yet</div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ActionNode;
