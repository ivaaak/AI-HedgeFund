import React, { useState } from 'react';
import styles from './ProcessFlow.module.css';
import NodeTooltip from './NodeTooltip';
import { LineChart, Line, ResponsiveContainer, Tooltip } from 'recharts';

interface DataCollectionNodeProps {
  isActive: boolean;
  tickers: string[];
  startDate: string;
  endDate: string;
  isLoading: boolean;
  data?: any; // Sample price data for mini-charts
}

const DataCollectionNode: React.FC<DataCollectionNodeProps> = ({ 
  isActive, 
  tickers, 
  startDate, 
  endDate, 
  isLoading,
  data
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  
  const toggleExpand = () => {
    setIsExpanded(!isExpanded);
  };

  const tooltipContent = `
    Function: Financial Data Collection
    Endpoint: /api/data/fetch
    Input: Tickers (${tickers.join(', ')}), Date Range (${startDate} to ${endDate})
    Output: Raw financial data for analysis
    Description: Fetches historical and real-time market data from financial data providers
  `;

  // Sample data for mini chart if real data not available
  const sampleData = data || Array(20).fill(0).map((_, i) => ({
    time: i,
    value: Math.random() * 20 + 140 - (i % 5 === 0 ? 10 : 0)
  }));

  return (
    <div className={styles.nodeWrapper}>
      <div 
        className={`${styles.node} ${styles.dataCollection} ${isActive ? styles.active : ''} ${isExpanded ? styles.expanded : ''}`}
        onClick={toggleExpand}
      >
        <div className={styles.nodeHeader}>
          <h3>Financial Data Service</h3>
          {isActive && <span className={styles.statusIndicator}></span>}
          <button className={styles.expandButton}>
            {isExpanded ? '−' : '+'}
          </button>
        </div>
        
        <div className={styles.serviceContent}>
          <div className={styles.tickerBadges}>
            {tickers.map(ticker => (
              <span key={ticker} className={styles.tickerBadge}>{ticker}</span>
            ))}
          </div>
          <div className={styles.dateRange}>
            {startDate} to {endDate}
          </div>
          
          {isExpanded && (
            <div className={styles.expandedContent}>
              <div className={styles.miniChartContainer}>
                <h4>Price Overview</h4>
                <ResponsiveContainer width="100%" height={60}>
                  <LineChart data={sampleData}>
                    <Line 
                      type="monotone" 
                      dataKey="value" 
                      stroke="#42a5f5" 
                      dot={false}
                      isAnimationActive={false}
                    />
                    <Tooltip />
                  </LineChart>
                </ResponsiveContainer>
                <div className={styles.dataStats}>
                  <div className={styles.stat}>
                    <span>Records:</span> {tickers.length * 90}
                  </div>
                  <div className={styles.stat}>
                    <span>Last Updated:</span> {new Date().toLocaleTimeString()}
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {isLoading && (
            <div className={styles.loadingOverlay}>
              <div className={styles.loadingSpinner}></div>
              <div>Loading data...</div>
            </div>
          )}
        </div>
      </div>
      
      <NodeTooltip content={tooltipContent} />
      
      {isActive && <div className={styles.flowIndicator}></div>}
    </div>
  );
};

export default DataCollectionNode;