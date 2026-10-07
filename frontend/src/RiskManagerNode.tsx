import React, { useState } from 'react';
import styles from './ProcessFlow.module.css';
import NodeInfo from './NodeInfo';
import { RiskAssessment } from './types';

interface RiskManagerNodeProps {
  id: string;
  isActive: boolean;
  riskAssessment?: RiskAssessment;
}

const formatMoney = (value: number): string =>
  `$${value.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;

const formatPercent = (value: number | null): string =>
  value === null ? 'N/A' : `${(value * 100).toFixed(1)}%`;

// Risk level for the visual indicator
const getRiskLevel = (riskScore: number): string => {
  if (riskScore > 7.5) return 'high';
  if (riskScore > 5) return 'medium';
  return 'low';
};

const RiskManagerNode: React.FC<RiskManagerNodeProps> = ({ id, isActive, riskAssessment }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const results = Object.entries(riskAssessment?.results || {});
  const errors = Object.entries(riskAssessment?.errors || {});

  // Overall score: the average over the analysed tickers
  const averageScore = results.length > 0
    ? results.reduce((sum, [, analysis]) => sum + analysis.risk_score, 0) / results.length
    : null;

  const positionLimit = results[0]?.[1].reasoning.position_limit;
  const portfolioValue = results[0]?.[1].reasoning.portfolio_value;

  const toggleExpand = (e: React.MouseEvent) => {
    if (!(e.target as HTMLElement).closest(`.${styles.infoButton}`)) {
      setIsExpanded(!isExpanded);
    }
  };

  return (
    <div className={styles.nodeWrapper} id={id}>
      <div
        className={`${styles.node} ${styles.riskManager} ${isActive ? styles.active : ''} ${isExpanded ? styles.expanded : ''}`}
        onClick={toggleExpand}
      >
        <div className={styles.nodeHeader}>
          <div className={styles.headerLeft}>
            <h3>Risk Manager</h3>
            {isActive && <span className={styles.statusIndicator}></span>}
            <NodeInfo
              title="Risk Manager"
              rows={[
                ['Function', 'Risk Analysis and Management'],
                ['Endpoint', '/api/risk/analyze'],
                ['Input', 'Portfolio, ticker list, daily prices'],
                ['Output', 'Risk scores and position limits'],
                ['Description', 'Measures volatility and drawdown and caps the size of each position']
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

        {averageScore !== null || errors.length > 0 ? (
          <div className={styles.riskContent}>
            {averageScore !== null && (
              <div className={styles.riskGauge}> Average Risk :
                <div className={`${styles.riskIndicator} ${styles[getRiskLevel(averageScore)]}`}>
                  {averageScore.toFixed(1)}
                </div>
              </div>
            )}

            <div className={styles.tickerRows}>
              {results.map(([ticker, analysis]) => (
                <div key={ticker} className={styles.tickerRow}>
                  <strong>{ticker}</strong>
                  <span className={`${styles.signalBadge} ${styles[getRiskLevel(analysis.risk_score)]}`}>
                    {analysis.risk_score.toFixed(1)}
                  </span>
                  <span className={styles.rowValue} title="Remaining position limit">
                    {formatMoney(analysis.remaining_position_limit)}
                  </span>
                </div>
              ))}
              {errors.map(([ticker, message]) => (
                <div key={ticker} className={`${styles.tickerRow} ${styles.errorRow}`} title={message}>
                  <strong>{ticker}</strong>
                  <span className={styles.rowError}>{isExpanded ? message : 'No data'}</span>
                </div>
              ))}
            </div>

            {isExpanded && results.length > 0 && (
              <div className={styles.expandedContent}>
                {results.map(([ticker, analysis]) => (
                  <div key={ticker} className={styles.reasoningSection}>
                    <div className={styles.reasoningHeader}>
                      <span>{ticker}</span>
                      <span>${analysis.current_price.toFixed(2)}</span>
                    </div>
                    <div className={styles.reasoningDetailText}>
                      Volatility: {formatPercent(analysis.reasoning.annualized_volatility)},
                      Max drawdown: {formatPercent(analysis.reasoning.max_drawdown)},
                      Position: {formatMoney(analysis.reasoning.current_position)}
                    </div>
                  </div>
                ))}
                <div className={styles.riskStats}>
                  <div className={styles.stat}>
                    <span>Position limit:</span> {formatMoney(positionLimit)}
                  </div>
                  <div className={styles.stat}>
                    <span>Max Exposure:</span> {Math.round((positionLimit / portfolioValue) * 100)}%
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className={styles.placeholder}>Awaiting data...</div>
        )}
      </div>

      {isActive && <div className={styles.flowIndicator}></div>}
    </div>
  );
};

export default RiskManagerNode;
