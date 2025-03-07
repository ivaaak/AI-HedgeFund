import React from 'react';
import styles from './Dark.module.css';
import NodeTooltip from './NodeTooltip';
import { Decision } from './types';

interface PortfolioManagerNodeProps {
  isActive: boolean;
  decision?: Decision;
}

const PortfolioManagerNode: React.FC<PortfolioManagerNodeProps> = ({ isActive, decision }) => {
  const tooltipContent = `
    Function: Portfolio Decision Making
    Endpoint: /api/portfolio/manage
    Input: Analyst signals, risk assessment, current positions
    Output: Trading decisions (buy/sell/hold) with quantities
    Description: Determines optimal portfolio adjustments based on all inputs
  `;

  return (
    <NodeTooltip content={tooltipContent}>
      <div className={`${styles.node} ${styles.portfolioManager} ${isActive ? styles.active : ''}`}>
        <h3>Portfolio Manager</h3>
        {decision ? (
          <div className={styles.decision}>
            <div>Action: {decision.action}</div>
            <div>Ticker: {decision.ticker}</div>
            <div>Quantity: {decision.quantity}</div>
            <div>Confidence: {decision.confidence.toFixed(1)}%</div>
          </div>
        ) : (
          <div className={styles.placeholder}>No decision data</div>
        )}
      </div>
    </NodeTooltip>
  );
};

export default PortfolioManagerNode;