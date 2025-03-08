import React, { useState } from 'react';
import styles from './ProcessFlow.module.css';
import NodeTooltip from './NodeTooltip';
import { Decision } from './types';

interface PortfolioManagerNodeProps {
  isActive: boolean;
  decision?: Decision;
  portfolioMetrics?: {
    allocation: Array<{ticker: string, percentage: number}>;
    performance: number;
    drawdown: number;
  };
}

const PortfolioManagerNode: React.FC<PortfolioManagerNodeProps> = ({ 
  isActive, 
  decision,
  portfolioMetrics
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  
  const toggleExpand = () => {
    setIsExpanded(!isExpanded);
  };

  const tooltipContent = `
    Function: Portfolio Decision Making
    Endpoint: /api/portfolio/manage
    Input: Analyst signals, risk assessment, current positions
    Output: Trading decisions (buy/sell/hold) with quantities
    Description: Determines optimal portfolio adjustments based on all inputs
  `;

  // Sample portfolio allocation data if none provided
  const portfolioAllocation = portfolioMetrics?.allocation || [
    { ticker: 'AAPL', percentage: 25 },
    { ticker: 'MSFT', percentage: 30 },
    { ticker: 'AMZN', percentage: 20 },
    { ticker: 'Cash', percentage: 25 }
  ];

  return (
    <div className={styles.nodeWrapper}>
      <div 
        className={`${styles.node} ${styles.portfolioManager} ${isActive ? styles.active : ''} ${isExpanded ? styles.expanded : ''}`}
        onClick={toggleExpand}
      >
        <div className={styles.nodeHeader}>
          <h3>Portfolio Manager</h3>
          {isActive && <span className={styles.statusIndicator}></span>}
          <button className={styles.expandButton}>
            {isExpanded ? '−' : '+'}
          </button>
        </div>
        
        {decision ? (
          <div className={styles.decision}>
            <div className={`${styles.actionBadge} ${styles[decision.action.toLowerCase()]}`}>
              {decision.action}
            </div>
            <div className={styles.decisionDetails}>
              <div>Ticker: <strong>{decision.ticker}</strong></div>
              <div>Quantity: <strong>{decision.quantity}</strong></div>
              <div>Confidence: <strong>{decision.confidence.toFixed(1)}%</strong></div>
            </div>
            
            {isExpanded && (
              <div className={styles.expandedContent}>
                <div className={styles.portfolioAllocation}>
                  <h4>Current Allocation</h4>
                  <div className={styles.allocationBars}>
                    {portfolioAllocation.map(item => (
                      <div key={item.ticker} className={styles.allocationItem}>
                        <div className={styles.allocationLabel}>
                          <span>{item.ticker}</span>
                          <span>{item.percentage}%</span>
                        </div>
                        <div className={styles.allocationBarContainer}>
                          <div 
                            className={styles.allocationBar}
                            style={{ width: `${item.percentage}%` }}
                          ></div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className={styles.portfolioStats}>
                    <div className={styles.stat}>
                      <span>Performance:</span> {portfolioMetrics?.performance?.toFixed(2) || '+2.3'}%
                    </div>
                    <div className={styles.stat}>
                      <span>Max Drawdown:</span> {portfolioMetrics?.drawdown?.toFixed(2) || '4.7'}%
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className={styles.placeholder}>
            No decision data
            {isExpanded && portfolioAllocation && (
              <div className={styles.expandedContent}>
                <div className={styles.portfolioAllocation}>
                  <h4>Current Allocation</h4>
                  <div className={styles.allocationBars}>
                    {portfolioAllocation.map(item => (
                      <div key={item.ticker} className={styles.allocationItem}>
                        <div className={styles.allocationLabel}>
                          <span>{item.ticker}</span>
                          <span>{item.percentage}%</span>
                        </div>
                        <div className={styles.allocationBarContainer}>
                          <div 
                            className={styles.allocationBar}
                            style={{ width: `${item.percentage}%` }}
                          ></div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
      
      <NodeTooltip content={tooltipContent} />
      
      {isActive && <div className={styles.flowIndicator}></div>}
    </div>
  );
};

export default PortfolioManagerNode;