import React, { useState } from 'react';
import styles from './ProcessFlow.module.css';
import NodeTooltip from './NodeTooltip';
import { LineChart, Line, ResponsiveContainer, Tooltip } from 'recharts';
import { AnalystType, Signal } from './types';

interface AnalystNodeProps {
  type: AnalystType;
  signal?: Signal;
  isActive: boolean;
  historicalSignals?: Array<{timestamp: number, value: number}>;
}

const AnalystNode: React.FC<AnalystNodeProps> = ({ 
  type, 
  signal, 
  isActive,
  historicalSignals = [] 
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  
  const toggleExpand = () => {
    setIsExpanded(!isExpanded);
  };

  // Generate sample historical data if none provided
  const signalHistory = historicalSignals.length > 0 ? historicalSignals : 
    Array(10).fill(0).map((_, i) => ({
      timestamp: Date.now() - (9-i) * 86400000,
      value: (Math.random() * 2 - 1) * (type === AnalystType.FUNDAMENTAL ? 0.3 : 
             type === AnalystType.TECHNICAL ? 0.7 : 
             type === AnalystType.SENTIMENT ? 0.5 : 0.2)
    }));

  const tooltipContent = `
    Function: ${type} Analysis
    Endpoint: /api/${type.toLowerCase()}/analyze
    Input: Financial data for tickers
    Output: ${type} signals with confidence scores
    Description: Analyzes ${type.toLowerCase()} data to generate trading signals
  `;

  // Determine signal strength for visual indicator
  const getSignalStrength = () => {
    if (!signal) return 'neutral';
    if (signal.value > 0.5) return 'strong-positive';
    if (signal.value > 0.1) return 'positive';
    if (signal.value < -0.5) return 'strong-negative';
    if (signal.value < -0.1) return 'negative';
    return 'neutral';
  };

  return (
    <div className={styles.nodeWrapper}>
      <div 
        className={`${styles.node} ${styles.analyst} ${styles[type.toLowerCase()]} ${isActive ? styles.active : ''} ${isExpanded ? styles.expanded : ''}`}
        onClick={toggleExpand}
      >
        <div className={styles.nodeHeader}>
          <h3>{type.charAt(0).toUpperCase() + type.slice(1)} Analyst</h3>
          {isActive && <span className={styles.statusIndicator}></span>}
          <button className={styles.expandButton}>
            {isExpanded ? '−' : '+'}
          </button>
        </div>
        
        {signal ? (
          <div className={styles.signal}>
            <div className={`${styles.signalIndicator} ${styles[getSignalStrength()]}`}>
              {signal.value > 0 ? '+' : ''}{signal.value.toFixed(2)}
            </div>
            <div className={styles.signalDetails}>
              <div>Ticker: <strong>{signal.ticker}</strong></div>
              <div>Confidence: <strong>{signal.confidence.toFixed(1)}%</strong></div>
            </div>
            
            {isExpanded && (
              <div className={styles.expandedContent}>
                <div className={styles.miniChartContainer}>
                  <h4>Signal History</h4>
                  <ResponsiveContainer width="100%" height={60}>
                    <LineChart data={signalHistory}>
                      <Line 
                        type="monotone" 
                        dataKey="value" 
                        stroke={type === AnalystType.FUNDAMENTAL ? "#43a047" : 
                               type === AnalystType.TECHNICAL ? "#1e88e5" : 
                               type === AnalystType.SENTIMENT ? "#8e24aa" : "#ff9800"} 
                        dot={false}
                        isAnimationActive={false}
                      />
                      <Tooltip 
                        labelFormatter={(label) => new Date(label).toLocaleDateString()}
                        formatter={(value: number) => [value.toFixed(2), 'Signal']}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                  <div className={styles.analysisStats}>
                    <div className={styles.stat}>
                      <span>Sentiment:</span> {signal.value > 0.3 ? 'Bullish' : signal.value < -0.3 ? 'Bearish' : 'Neutral'}
                    </div>
                    <div className={styles.stat}>
                      <span>Updated:</span> {new Date().toLocaleTimeString()}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className={styles.placeholder}>Awaiting data...</div>
        )}
      </div>
      
      <NodeTooltip content={tooltipContent} />
      
      {isActive && <div className={styles.flowIndicator}></div>}
    </div>
  );
};

export default AnalystNode;