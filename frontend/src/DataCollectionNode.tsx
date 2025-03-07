import React from 'react';
import styles from './Dark.module.css';
import NodeTooltip from './NodeTooltip';

interface DataCollectionNodeProps {
  isActive: boolean;
  tickers: string[];
  startDate: string;
  endDate: string;
  isLoading: boolean;
}

const DataCollectionNode: React.FC<DataCollectionNodeProps> = ({ isActive, tickers, startDate, endDate, isLoading }) => {
  const tooltipContent = `
    Function: Financial Data Collection
    Endpoint: /api/data/fetch
    Input: Tickers (${tickers.join(', ')}), Date Range (${startDate} to ${endDate})
    Output: Raw financial data for analysis
    Description: Fetches historical and real-time market data from financial data providers
  `;

  return (
    <NodeTooltip content={tooltipContent}>
      <div className={`${styles.node} ${styles.dataCollection} ${isActive ? styles.active : ''}`}>
        <h3>Financial Data Service</h3>
        <div className={styles.serviceContent}>
          <div>Tickers: {tickers.join(', ')}</div>
          <div>Period: {startDate} to {endDate}</div>
          {isLoading && <div className={styles.miniLoading}>Loading data...</div>}
        </div>
      </div>
    </NodeTooltip>
  );
};

export default DataCollectionNode;