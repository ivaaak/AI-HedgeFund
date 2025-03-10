import React, { useState, useEffect, useRef } from 'react';
import styles from './ProcessFlow.module.css';
import { LineChart, Line, ResponsiveContainer, Tooltip } from 'recharts';

interface DataCollectionNodeProps {
  id: string;
  isActive: boolean;
  tickers: string[];
  startDate: string;
  endDate: string;
  isLoading: boolean;
  data?: { [ticker: string]: any[] }; // Sample price data for mini-charts, keyed by ticker
}

const DataCollectionNode: React.FC<DataCollectionNodeProps> = ({ 
  id,
  isActive, 
  tickers, 
  startDate, 
  endDate, 
  isLoading,
  data
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedTicker, setSelectedTicker] = useState<string | null>(tickers.length > 0 ? tickers[0] : null);
  const [showTooltip, setShowTooltip] = useState(false);
  const tooltipTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Update selected ticker if the tickers list changes and current selection is no longer valid
  useEffect(() => {
    if (selectedTicker === null || !tickers.includes(selectedTicker)) {
      setSelectedTicker(tickers.length > 0 ? tickers[0] : null);
    }
  }, [tickers, selectedTicker]);

  const toggleExpand = (e: React.MouseEvent) => {
    // Prevent triggering when clicking on ticker badges
    if (!(e.target as HTMLElement).closest(`.${styles.tickerBadge}`)) {
      setIsExpanded(!isExpanded);
    }
  };

  const handleTickerClick = (ticker: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent triggering node expansion
    setSelectedTicker(ticker);
    if (!isExpanded) {
      setIsExpanded(true); // Expand the node when a ticker is selected
    }
  };

  // Cleanup tooltip timeout on unmount
  useEffect(() => {
    return () => {
      if (tooltipTimeoutRef.current) {
        clearTimeout(tooltipTimeoutRef.current);
      }
    };
  }, []);

  // Generate sample data for each ticker if real data not available
  const generateSampleData = (ticker: string) => {
    const seed = ticker.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0);
    return Array(20).fill(0).map((_, i) => ({
      time: i,
      value: Math.random() * 20 + 140 - (i % 5 === 0 ? 10 : 0) + (seed % 50)
    }));
  };

  // Get data for the selected ticker
  const getTickerData = () => {
    if (!selectedTicker) return [];
    
    if (data && data[selectedTicker]) {
      return data[selectedTicker];
    }
    
    return generateSampleData(selectedTicker);
  };

  const chartData = getTickerData();

  return (
    <div className={styles.nodeWrapper} id={id}>
      <div 
        className={`${styles.node} ${styles.dataCollection} ${isActive ? styles.active : ''} ${isExpanded ? styles.expanded : ''}`}
        onClick={toggleExpand}
      >
        <div className={styles.nodeHeader}>
          <div className={styles.headerLeft}>
            <h3>Overview: Price, News, Chart</h3>
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
                <div className={styles.tooltipTitle}>Financial Overview</div>
                <div className={styles.tooltipRow}>
                  <span className={styles.tooltipLabel}>Function:</span>
                  <span>Financial Data Collection</span>
                </div>
                <div className={styles.tooltipRow}>
                  <span className={styles.tooltipLabel}>Endpoint:</span>
                  <span>/api/data/fetch</span>
                </div>
                <div className={styles.tooltipRow}>
                  <span className={styles.tooltipLabel}>Input:</span>
                  <span>Tickers, Date Range</span>
                </div>
                <div className={styles.tooltipRow}>
                  <span className={styles.tooltipLabel}>Output:</span>
                  <span>Raw financial data</span>
                </div>
                <div className={styles.tooltipRow}>
                  <span className={styles.tooltipLabel}>Description:</span>
                  <span>Fetches market data from financial providers</span>
                </div>
              </div>
            </button>
          </div>
          <button className={styles.expandButton} onClick={(e) => { e.stopPropagation(); toggleExpand(e); }}>
            {isExpanded ? '−' : '+'}
          </button>
        </div>
        
        <div className={styles.serviceContent}>
          <div className={styles.tickerBadges}>
            {tickers.map(ticker => (
              <span 
                key={ticker} 
                className={`${styles.tickerBadge} ${selectedTicker === ticker ? styles.selected : ''}`}
                onClick={(e) => handleTickerClick(ticker, e)}
                style={{ 
                  cursor: 'pointer',
                  backgroundColor: selectedTicker === ticker ? '#1976d2' : '#455a64',
                  border: selectedTicker === ticker ? '1px solid #42a5f5' : '1px solid transparent'
                }}
              >
                {ticker}
              </span>
            ))}
          </div>
          <div className={styles.dateRange}>
            {startDate} to {endDate}
          </div>
          
          {isExpanded && (
            <div className={styles.expandedContent}>
              <div className={styles.miniChartContainer}>
                <h4>{selectedTicker ? `${selectedTicker} Price Overview` : 'Select a ticker'}</h4>
                {selectedTicker ? (
                  <ResponsiveContainer width="100%" height={60}>
                    <LineChart data={chartData}>
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
                ) : (
                  <div className={styles.placeholder}>No ticker selected</div>
                )}
                <div className={styles.dataStats}>
                  <div className={styles.stat}>
                    <span>Records:</span> {selectedTicker ? 90 : 0}
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
      
      {isActive && <div className={styles.flowIndicator}></div>}
    </div>
  );
};

export default DataCollectionNode;