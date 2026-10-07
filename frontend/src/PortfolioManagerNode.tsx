import React, { useState } from 'react';
import styles from './ProcessFlow.module.css';
import NodeInfo from './NodeInfo';
import { DecisionResult, Portfolio } from './types';
import { portfolioAllocation } from './portfolio';

interface PortfolioManagerNodeProps {
  id: string;
  isActive: boolean;
  decision?: DecisionResult;
  portfolio: Portfolio;
}

const PortfolioManagerNode: React.FC<PortfolioManagerNodeProps> = ({
  id,
  isActive,
  decision,
  portfolio
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const decisions = Object.entries(decision?.decisions || {});
  const allocation = portfolioAllocation(portfolio);

  const toggleExpand = (e: React.MouseEvent) => {
    if (!(e.target as HTMLElement).closest(`.${styles.infoButton}`)) {
      setIsExpanded(!isExpanded);
    }
  };

  return (
    <div className={styles.nodeWrapper} id={id}>
      <div
        className={`${styles.node} ${styles.portfolioManager} ${isActive ? styles.active : ''} ${isExpanded ? styles.expanded : ''}`}
        onClick={toggleExpand}
      >
        <div className={styles.nodeHeader}>
          <div className={styles.headerLeft}>
            <h3>Portfolio Manager</h3>
            {isActive && <span className={styles.statusIndicator}></span>}
            <NodeInfo
              title="Portfolio Manager"
              rows={[
                ['Function', 'Portfolio Decision Making'],
                ['Endpoint', '/api/portfolio/manage'],
                ['Input', 'Analyst signals, risk assessment'],
                ['Output', 'Trading decisions with quantities'],
                ['Description', 'Decides with the configured AI model, or with weighted rules when none is available']
              ]}
            />
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
            <div className={styles.tickerRows}>
              {decisions.map(([ticker, tickerDecision]) => (
                <div key={ticker} className={styles.tickerRow}>
                  <strong>{ticker}</strong>
                  <span className={`${styles.signalBadge} ${styles[tickerDecision.action]}`}>
                    {tickerDecision.action}
                    {tickerDecision.quantity > 0 ? ` ${tickerDecision.quantity}` : ''}
                  </span>
                  <span className={styles.rowValue}>{tickerDecision.confidence}%</span>
                </div>
              ))}
            </div>
            <div className={styles.decisionSource} title={decision.note}>
              {decision.source === 'llm' ? 'Decided by AI model' : 'Rule-based decision'}
            </div>
          </div>
        ) : (
          <div className={styles.placeholder}>No decision data</div>
        )}

        {isExpanded && (
          <div className={styles.expandedContent}>
            {decision?.note && <div className={styles.reasoningDetailText}>{decision.note}</div>}
            {decisions.map(([ticker, tickerDecision]) => (
              <div key={ticker} className={styles.reasoningSection}>
                <div className={styles.reasoningHeader}>
                  <span>{ticker}</span>
                </div>
                <div className={styles.reasoningDetailText}>{tickerDecision.reasoning}</div>
              </div>
            ))}

            <div className={styles.portfolioAllocation}>
              <h4>Current Allocation</h4>
              <div className={styles.allocationBars}>
                {allocation.map(item => (
                  <div key={item.ticker} className={styles.allocationItem}>
                    <div className={styles.allocationLabel}>
                      <span>{item.ticker}</span>
                      <span>{item.percentage.toFixed(1)}%</span>
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

      {isActive && <div className={styles.flowIndicator}></div>}
    </div>
  );
};

export default PortfolioManagerNode;
