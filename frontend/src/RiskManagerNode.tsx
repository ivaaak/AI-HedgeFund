import React, { useState, useRef, useEffect } from 'react';
import styles from './ProcessFlow.module.css';
import { LineChart, Line, ResponsiveContainer, Tooltip } from 'recharts';
import { Recommendation, RiskAnalysisResult } from './types';


// Mock data for fallback
const MOCK_RISK_DATA = {
  "AAPL": {
    remaining_position_limit: 5000,
    current_price: 190.5,
    reasoning: {
      portfolio_value: 100000,
      current_position: 15000,
      position_limit: 20000,
      remaining_limit: 5000,
      available_cash: 25000
    }
  },
  "MSFT": {
    remaining_position_limit: 10000,
    current_price: 350.2,
    reasoning: {
      portfolio_value: 100000,
      current_position: 10000,
      position_limit: 20000,
      remaining_limit: 10000,
      available_cash: 25000
    }
  },
  "GOOGL": {
    remaining_position_limit: 15000,
    current_price: 142.8,
    reasoning: {
      portfolio_value: 100000,
      current_position: 5000,
      position_limit: 20000,
      remaining_limit: 15000,
      available_cash: 25000
    }
  }
};

const MOCK_RECOMMENDATIONS = {
  "AAPL": {
    technical_signal: "bullish",
    fundamental_signal: "neutral",
    combined_signal: "bullish",
    confidence: 75,
    action: "buy",
    shares: 20,
    estimated_value: 3810,
    current_position_shares: 78,
    current_price: 190.5
  },
  "MSFT": {
    technical_signal: "neutral",
    fundamental_signal: "bullish",
    combined_signal: "bullish",
    confidence: 60,
    action: "buy",
    shares: 10,
    estimated_value: 3502,
    current_position_shares: 28,
    current_price: 350.2
  },
  "GOOGL": {
    technical_signal: "bearish",
    fundamental_signal: "neutral",
    combined_signal: "bearish",
    confidence: 65,
    action: "sell",
    shares: 35,
    estimated_value: 4998,
    current_position_shares: 35,
    current_price: 142.8
  }
};

interface RiskManagerNodeProps {
  id: string;
  isActive: boolean;
  riskAssessment?: {
    riskScore?: number;
    factors?: string[];
    analysis?: Record<string, RiskAnalysisResult>;
    recommendations?: Record<string, Recommendation>;
  };
  selectedTicker?: string;
}

const RiskManagerNode: React.FC<RiskManagerNodeProps> = ({
  id,
  isActive, 
  riskAssessment,
  selectedTicker = 'AAPL' // Default ticker if none selected
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);
  const tooltipTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Cleanup tooltip timeout on unmount
  useEffect(() => {
    return () => {
      if (tooltipTimeoutRef.current) {
        clearTimeout(tooltipTimeoutRef.current);
      }
    };
  }, []);
  
  const toggleExpand = (e: React.MouseEvent) => {
    if (!(e.target as HTMLElement).closest(`.${styles.infoButton}`)) {
      setIsExpanded(!isExpanded);
    }
  };

  // Get the analysis for the selected ticker with fallback to mock data
  const getTickerAnalysis = () => {
    if (riskAssessment?.analysis?.[selectedTicker]) {
      return riskAssessment.analysis[selectedTicker];
    }
    return MOCK_RISK_DATA[selectedTicker as keyof typeof MOCK_RISK_DATA] || MOCK_RISK_DATA.AAPL;
  };

  // Get the recommendation for the selected ticker with fallback to mock data
  const getTickerRecommendation = () => {
    if (riskAssessment?.recommendations?.[selectedTicker]) {
      return riskAssessment.recommendations[selectedTicker];
    }
    return MOCK_RECOMMENDATIONS[selectedTicker as keyof typeof MOCK_RECOMMENDATIONS] || MOCK_RECOMMENDATIONS.AAPL;
  };

  // Calculate risk score from analysis data or use provided score
  const getRiskScore = (): number => {
    if (riskAssessment?.riskScore) {
      return riskAssessment.riskScore;
    }

    const analysis = getTickerAnalysis();
    
    // Calculate risk score based on position limits
    // Lower remaining limits = higher risk
    const maxPositionPercentage = analysis.reasoning.position_limit / analysis.reasoning.portfolio_value;
    const currentPositionPercentage = analysis.reasoning.current_position / analysis.reasoning.portfolio_value;
    const usedPercentage = currentPositionPercentage / maxPositionPercentage;
    
    // Scale to 1-10 range with higher values indicating higher risk
    return Math.min(10, Math.max(1, usedPercentage * 10));
  };

  // Calculate risk level for visual indicator
  const getRiskLevel = () => {
    const riskScore = getRiskScore();
    if (riskScore > 7.5) return 'high';
    if (riskScore > 5) return 'medium';
    return 'low';
  };

  // Get risk factors (use provided ones or generate from analysis)
  const getRiskFactors = (): string[] => {
    if (riskAssessment?.factors && riskAssessment.factors.length > 0) {
      return riskAssessment.factors;
    }
    
    // Generate default factors based on analysis
    const analysis = getTickerAnalysis();
    const recommendation = getTickerRecommendation();
    const factors: string[] = [];
    
    // Generate based on position utilization
    const positionUtilization = (analysis.reasoning.current_position / analysis.reasoning.position_limit) * 100;
    
    if (positionUtilization > 80) {
      factors.push(`Position limit near maximum (${Math.round(positionUtilization)}%)`);
    }
    
    // Add recommendation-based factor
    if (recommendation) {
      if (recommendation.action === 'buy') {
        factors.push(`${recommendation.combined_signal.toUpperCase()} signal (${recommendation.confidence}% confidence)`);
      } else if (recommendation.action === 'sell') {
        factors.push(`Recommend reducing exposure by ${recommendation.shares} shares`);
      }
    }
    
    // Add default factor if none generated
    if (factors.length === 0) {
      factors.push('Position within acceptable limits');
      factors.push('Market conditions stable');
    }
    
    return factors;
  };

  // Generate risk history data for the chart
  const getRiskHistory = () => {
    const riskScore = getRiskScore();
    // Generate synthetic history for demonstration
    return Array(10).fill(0).map((_, i) => ({
      timestamp: Date.now() - (9-i) * 86400000,
      value: i < 8 ? 
        (riskScore * 0.8 + Math.random() * 2) : 
        riskScore
    }));
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
                <div className={styles.tooltipTitle}>Risk Manager</div>
                <div className={styles.tooltipRow}>
                  <span className={styles.tooltipLabel}>Function:</span>
                  <span>Risk Analysis and Management</span>
                </div>
                <div className={styles.tooltipRow}>
                  <span className={styles.tooltipLabel}>Endpoint:</span>
                  <span>/api/risk/analyze</span>
                </div>
                <div className={styles.tooltipRow}>
                  <span className={styles.tooltipLabel}>Input:</span>
                  <span>Portfolio data, ticker list</span>
                </div>
                <div className={styles.tooltipRow}>
                  <span className={styles.tooltipLabel}>Output:</span>
                  <span>Risk scores and position limits</span>
                </div>
                <div className={styles.tooltipRow}>
                  <span className={styles.tooltipLabel}>Description:</span>
                  <span>Evaluates downside risk and sets position limits</span>
                </div>
              </div>
            </button>
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
        
        <div className={styles.riskContent}>
          <div className={styles.riskGauge}> Calculated Risk : 
            <div className={`${styles.riskIndicator} ${styles[getRiskLevel()]}`}>
              {getRiskScore().toFixed(1)}
            </div>
          </div>
          
          <div className={styles.riskFactors}> Found risk factors:
            {getRiskFactors().map((factor, index) => (
              <div key={index} className={styles.factor}>• {factor}</div>
            ))}
          </div>
          
          {isExpanded && (
            <div className={styles.expandedContent}>
              <div className={styles.miniChartContainer}>
                <h4>Risk Trend</h4>
                <ResponsiveContainer width="100%" height={60}>
                  <LineChart data={getRiskHistory()}>
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
                    <span>Max Exposure:</span> {(() => {
                      const analysis = getTickerAnalysis();
                      const limitPercent = Math.round((analysis.reasoning.position_limit / 
                        analysis.reasoning.portfolio_value) * 100);
                      return `${limitPercent}%`;
                    })()}
                  </div>
                  <div className={styles.stat}>
                    <span>Risk Trend:</span> {(() => {
                      const history = getRiskHistory();
                      return history[9].value > history[0].value ? 'Increasing' : 
                        history[9].value < history[0].value ? 'Decreasing' : 'Stable';
                    })()}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      
      {isActive && <div className={styles.flowIndicator}></div>}
    </div>
  );
};

export default RiskManagerNode;