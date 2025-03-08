import React, { useState, useRef, useEffect } from 'react';
import styles from './ProcessFlow.module.css';
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
          <div className={styles.headerLeft}>
            <h3>Portfolio Manager</h3>
            {isActive && <span className={styles.statusIndicator}></span>}
            <button 
              className={styles.infoButton} 
              aria-label="Node Information"
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
              <div className={`${styles.nodeTooltip} ${showTooltip ? styles.visible : ''}`}>
                <div className={styles.tooltipTitle}>Portfolio Manager</div>
                <div className={styles.tooltipRow}>
                  <span className={styles.tooltipLabel}>Function:</span>
                  <span>Portfolio Decision Making</span>
                </div>
                <div className={styles.tooltipRow}>
                  <span className={styles.tooltipLabel}>Endpoint:</span>
                  <span>/api/portfolio/manage</span>
                </div>
                <div className={styles.tooltipRow}>
                  <span className={styles.tooltipLabel}>Input:</span>
                  <span>Analyst signals, risk assessment</span>
                </div>
                <div className={styles.tooltipRow}>
                  <span className={styles.tooltipLabel}>Output:</span>
                  <span>Trading decisions with quantities</span>
                </div>
                <div className={styles.tooltipRow}>
                  <span className={styles.tooltipLabel}>Description:</span>
                  <span>Determines optimal portfolio adjustments</span>
                </div>
              </div>
            </button>
          </div>
          <button 
            className={styles.expandButton}
            onClick={(e) => { 
              e.stopPropagation(); 
              setIsExpanded(!isExpanded); 
            }}
          >
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
      
      {isActive && <div className={styles.flowIndicator}></div>}
    </div>
  );
};

export default PortfolioManagerNode;