import React from 'react';
import styles from './Dark.module.css';
import NodeTooltip from './NodeTooltip';
import {
  AnalystType,
  Signal,
} from './types';

interface AnalystNodeProps {
  type: AnalystType;
  signal?: Signal;
  isActive: boolean;
}

const AnalystNode: React.FC<AnalystNodeProps> = ({ type, signal, isActive }) => {
  // Create tooltip content based on analyst type
  const tooltipContent = `
    Function: ${type} Analysis
    Endpoint: /api/${type.toLowerCase()}/analyze
    Input: Financial data for tickers
    Output: ${type} signals with confidence scores
    Description: Analyzes ${type.toLowerCase()} data to generate trading signals
  `;

  return (
    <NodeTooltip content={tooltipContent}>
      <div className={`${styles.node} ${styles.analyst} ${isActive ? styles.active : ''}`}>
        <h3>{type.charAt(0).toUpperCase() + type.slice(1)} Analyst</h3>
        {signal && (
          <div className={styles.signal}>
            <div>Signal: {signal.value.toFixed(2)}</div>
            <div>Ticker: {signal.ticker}</div>
            <div>Confidence: {signal.confidence.toFixed(1)}%</div>
          </div>
        )}
      </div>
    </NodeTooltip>
  );
};

export default AnalystNode;