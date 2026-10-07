import React, { useState } from 'react';
import styles from './ProcessFlow.module.css';
import NodeInfo from './NodeInfo';
import { AnalysisResponse, AnalystSignal, AnalystType } from './types';

interface AnalystNodeProps {
  id?: string;
  type: AnalystType;
  analysis?: AnalysisResponse<AnalystSignal>;
  isActive: boolean;
}

const ANALYSTS: Record<AnalystType, { label: string; className: string; endpoint: string; input: string; description: string }> = {
  [AnalystType.FUNDAMENTAL]: {
    label: 'Fundamental',
    className: 'fundamental',
    endpoint: '/api/fundamentals/analyze',
    input: 'Financial metrics and statements',
    description: 'Scores profitability, growth, financial health and price ratios'
  },
  [AnalystType.TECHNICAL]: {
    label: 'Technical',
    className: 'technical',
    endpoint: '/api/technical/analyze',
    input: 'Daily prices and volume',
    description: 'Combines trend, mean reversion, momentum, volatility and statistical signals'
  },
  [AnalystType.SENTIMENT]: {
    label: 'Sentiment',
    className: 'sentiment',
    endpoint: '/api/sentiment/analyze',
    input: 'News sentiment and insider transactions',
    description: 'Weighs recent news against insider buying and selling'
  },
  [AnalystType.VALUATION]: {
    label: 'Valuation',
    className: 'valuation',
    endpoint: '/api/valuation/analyze',
    input: 'Cash flows and market capitalization',
    description: 'Compares DCF and owner earnings value with the market cap'
  }
};

// "profitability_signal" -> "Profitability"
const formatReasoningKey = (key: string): string => {
  const words = key.replace(/_signal$/, '').replace(/_/g, ' ');
  return words.charAt(0).toUpperCase() + words.slice(1);
};

const AnalystNode: React.FC<AnalystNodeProps> = ({ id, type, analysis, isActive }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedTicker, setSelectedTicker] = useState<string | null>(null);

  const analyst = ANALYSTS[type];
  const results = Object.entries(analysis?.results || {});
  const errors = Object.entries(analysis?.errors || {});

  // Show the reasoning of the selected ticker, or of the first one
  const reasoningTicker = selectedTicker && analysis?.results[selectedTicker] ? selectedTicker : results[0]?.[0];
  const reasoning = reasoningTicker ? analysis?.results[reasoningTicker].reasoning : undefined;

  const toggleExpand = (e: React.MouseEvent) => {
    if (!(e.target as HTMLElement).closest(`.${styles.infoButton}`)) {
      setIsExpanded(!isExpanded);
    }
  };

  const handleTickerClick = (ticker: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedTicker(ticker);
    setIsExpanded(true);
  };

  return (
    <div className={styles.nodeWrapper} id={id}>
      <div
        className={`${styles.node} ${styles.analyst} ${styles[analyst.className]} ${isActive ? styles.active : ''} ${isExpanded ? styles.expanded : ''}`}
        onClick={toggleExpand}
      >
        <div className={styles.nodeHeader}>
          <div className={styles.headerLeft}>
            <h3>{analyst.label} Analyst</h3>
            {isActive && <span className={styles.statusIndicator}></span>}
            <NodeInfo
              title={`${analyst.label} Analyst`}
              rows={[
                ['Function', `${analyst.label} Analysis`],
                ['Endpoint', analyst.endpoint],
                ['Input', analyst.input],
                ['Output', 'Signal with confidence per ticker'],
                ['Description', analyst.description]
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

        {results.length > 0 || errors.length > 0 ? (
          <div className={styles.signal}>
            <div className={styles.tickerRows}>
              {results.map(([ticker, result]) => (
                <div
                  key={ticker}
                  className={`${styles.tickerRow} ${isExpanded && ticker === reasoningTicker ? styles.selectedRow : ''}`}
                  onClick={(e) => handleTickerClick(ticker, e)}
                >
                  <strong>{ticker}</strong>
                  <span className={`${styles.signalBadge} ${styles[result.signal]}`}>{result.signal}</span>
                  <span className={styles.rowValue}>{result.confidence}%</span>
                </div>
              ))}
              {errors.map(([ticker, message]) => (
                <div key={ticker} className={`${styles.tickerRow} ${styles.errorRow}`} title={message}>
                  <strong>{ticker}</strong>
                  <span className={styles.rowError}>{isExpanded ? message : 'No data'}</span>
                </div>
              ))}
            </div>

            {isExpanded && reasoning && (
              <div className={styles.expandedContent}>
                <h4>{reasoningTicker} reasoning</h4>
                {Object.entries(reasoning).map(([key, entry]) => (
                  <div key={key} className={styles.reasoningSection}>
                    <div className={styles.reasoningHeader}>
                      <span>{formatReasoningKey(key)}</span>
                      <span className={`${styles.signalBadge} ${styles[entry.signal]}`}>{entry.signal}</span>
                    </div>
                    <div className={styles.reasoningDetailText}>{entry.details}</div>
                  </div>
                ))}
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

export default AnalystNode;
