import React, { useState } from 'react';
import styles from './ProcessFlow.module.css';
import NodeTooltip from './NodeTooltip';
import { LineChart, Line, ResponsiveContainer, Tooltip } from 'recharts';

interface RiskManagerNodeProps {
  isActive: boolean;
  riskAssessment?: {
    riskScore: number;
    factors: string[];
  };
}

const RiskManagerNode: React.FC<RiskManagerNodeProps> = ({ 
  isActive, 
  riskAssessment 
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  
  const toggleExpand = () => {
    setIsExpanded(!isExpanded);
  };

  const tooltipContent = `
    Function: Risk Analysis and Management
    Endpoint: /api/risk/assess
    Input: Analyst signals, market conditions, portfolio state
    Output: Risk score and risk factors
    Description: Evaluates potential downside risk and sets position size limits
  `;

  // Calculate risk level for visual indicator
  const getRiskLevel = () => {
    if (!riskAssessment) return 'unknown';
    if (riskAssessment.riskScore > 7.5) return 'high';
    if (riskAssessment.riskScore > 5) return 'medium';
    return 'low';
  };

  // Sample historical risk data
  const riskHistory = Array(10).fill(0).map((_, i) => ({
    timestamp: Date.now() - (9-i) * 86400000,
    value: riskAssessment ? 
      (riskAssessment.riskScore * 0.8 + Math.random() * 2) : 
      (5 + Math.random() * 2)
  }));

  return (
    <div className={styles.nodeWrapper}>
      <div 
        className={`${styles.node} ${styles.riskManager} ${isActive ? styles.active : ''} ${isExpanded ? styles.expanded : ''}`}
        onClick={toggleExpand}
      >
        <div className={styles.nodeHeader}>
          <h3>Risk Manager</h3>
          {isActive && <span className={styles.statusIndicator}></span>}
          <button className={styles.expandButton}>
            {isExpanded ? '−' : '+'}
          </button>
        </div>
        
        {riskAssessment ? (
          <div className={styles.riskContent}>
            <div className={styles.riskGauge}>
              <div className={`${styles.riskIndicator} ${styles[getRiskLevel()]}`}>
                {riskAssessment.riskScore.toFixed(1)}
              </div>
            </div>
            
            <div className={styles.riskFactors}>
              {riskAssessment.factors.map((factor, index) => (
                <div key={index} className={styles.factor}>• {factor}</div>
              ))}
            </div>
            
            {isExpanded && (
              <div className={styles.expandedContent}>
                <div className={styles.miniChartContainer}>
                  <h4>Risk Trend</h4>
                  <ResponsiveContainer width="100%" height={60}>
                    <LineChart data={riskHistory}>
                      <Line 
                        type="monotone" 
                        dataKey="value" 
                        stroke="#d32f2f" 
                        dot={false}
                        isAnimationActive={false}
                      />
                      <Tooltip 
                        labelFormatter={(label) => new Date(label).toLocaleDateString()}
                        formatter={(value: number) => [value.toFixed(1), 'Risk Score']}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                  <div className={styles.riskStats}>
                    <div className={styles.stat}>
                      <span>Max Exposure:</span> {(100 - riskAssessment.riskScore * 5).toFixed(0)}%
                    </div>
                    <div className={styles.stat}>
                      <span>Risk Trend:</span> {
                        riskHistory[9].value > riskHistory[0].value ? 'Increasing' : 
                        riskHistory[9].value < riskHistory[0].value ? 'Decreasing' : 'Stable'
                      }
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className={styles.placeholder}>No risk assessment data</div>
        )}
      </div>
      
      <NodeTooltip content={tooltipContent} />
      
      {isActive && <div className={styles.flowIndicator}></div>}
    </div>
  );
};

export default RiskManagerNode;