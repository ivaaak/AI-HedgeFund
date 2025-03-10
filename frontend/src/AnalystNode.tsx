import React, { useState, useRef, useEffect } from 'react';
import styles from './ProcessFlow.module.css';
import { LineChart, Line, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis } from 'recharts';

// Extended interfaces to handle the detailed analyst data
enum AnalystType {
  FUNDAMENTAL = 'FUNDAMENTAL',
  TECHNICAL = 'TECHNICAL',
  SENTIMENT = 'SENTIMENT',
  MACRO = 'MACRO'
}

interface ReasoningSignal {
  signal: 'bullish' | 'bearish' | 'neutral';
  details: string;
}

interface FundamentalReasoning {
  profitability_signal: ReasoningSignal;
  growth_signal: ReasoningSignal;
  financial_health_signal: ReasoningSignal;
  price_ratios_signal: ReasoningSignal;
}

interface Signal {
  ticker: string;
  value: number;
}

interface ExtendedSignal extends Signal {
  confidence?: number;
  reasoning?: FundamentalReasoning;
}

interface AnalystNodeProps {
  id?: string;
  type: AnalystType;
  signal?: ExtendedSignal;
  isActive: boolean;
  historicalSignals?: Array<{ timestamp: number, value: number }>;
}

const AnalystNode: React.FC<AnalystNodeProps> = ({
  id,
  type,
  signal,
  isActive,
  historicalSignals = []
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

  // Generate sample historical data if none provided
  const signalHistory = historicalSignals.length > 0 ? historicalSignals :
    Array(10).fill(0).map((_, i) => ({
      timestamp: Date.now() - (9 - i) * 86400000,
      value: (Math.random() * 2 - 1) * (type === AnalystType.FUNDAMENTAL ? 0.3 :
        type === AnalystType.TECHNICAL ? 0.7 :
          type === AnalystType.SENTIMENT ? 0.5 : 0.2)
    }));

  // Create mock signal if none provided
  const mockSignal: ExtendedSignal = {
    ticker: "MOCK",
    value: (Math.random() * 2 - 1) * (
      type === AnalystType.FUNDAMENTAL ? 0.4 :
        type === AnalystType.TECHNICAL ? 0.8 :
          type === AnalystType.SENTIMENT ? 0.6 : 0.3
    ),
    confidence: Math.round(Math.random() * 100),
    reasoning: {
      profitability_signal: {
        signal: Math.random() > 0.6 ? 'bullish' : Math.random() > 0.3 ? 'neutral' : 'bearish',
        details: 'ROE 12.5%, Net margin 8.2%, positive trend'
      },
      growth_signal: {
        signal: Math.random() > 0.6 ? 'bullish' : Math.random() > 0.3 ? 'neutral' : 'bearish',
        details: 'Revenue growth 15.3%, EPS growth 9.8%'
      },
      financial_health_signal: {
        signal: Math.random() > 0.6 ? 'bullish' : Math.random() > 0.3 ? 'neutral' : 'bearish',
        details: 'D/E ratio 0.6, Current ratio 2.1, healthy cash flow'
      },
      price_ratios_signal: {
        signal: Math.random() > 0.6 ? 'bullish' : Math.random() > 0.3 ? 'neutral' : 'bearish',
        details: 'P/E 18.4 vs industry 22.1, P/S 1.8 vs industry 2.4'
      }
    }
  };

  // Use provided signal or mock signal
  const displaySignal = signal || mockSignal;

  // Determine signal strength for visual indicator
  const getSignalStrength = () => {
    if (!displaySignal) return 'neutral';
    if (displaySignal.value > 0.5) return 'strong-positive';
    if (displaySignal.value > 0.1) return 'positive';
    if (displaySignal.value < -0.5) return 'strong-negative';
    if (displaySignal.value < -0.1) return 'negative';
    return 'neutral';
  };

  // Create a chart from reasoning data if available
  const prepareReasoningChart = () => {
    if (!displaySignal?.reasoning) return [];

    const reasoningData = [
      { name: 'Profit', value: getSignalValue(displaySignal.reasoning.profitability_signal.signal) },
      { name: 'Growth', value: getSignalValue(displaySignal.reasoning.growth_signal.signal) },
      { name: 'Health', value: getSignalValue(displaySignal.reasoning.financial_health_signal.signal) },
      { name: 'Ratios', value: getSignalValue(displaySignal.reasoning.price_ratios_signal.signal) }
    ];

    return reasoningData;
  };

  // Convert signal string to numeric value for charts
  const getSignalValue = (signal: string): number => {
    switch (signal) {
      case 'bullish': return 1;
      case 'bearish': return -1;
      case 'neutral': return 0;
      default: return 0;
    }
  };

  return (
    <div className={styles.nodeWrapper} id={id}>
      <div
        className={`${styles.node} ${styles.analyst} ${styles[type.toLowerCase()]} ${isActive ? styles.active : ''} ${isExpanded ? styles.expanded : ''}`}
        onClick={toggleExpand}
      >
        <div className={styles.nodeHeader}>
          <div className={styles.headerLeft}>
            <h3>{type.charAt(0).toUpperCase() + type.slice(1).toLowerCase()} Analyst</h3>
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
                <div className={styles.tooltipTitle}>{type.charAt(0).toUpperCase() + type.slice(1).toLowerCase()} Analyst</div>
                <div className={styles.tooltipRow}>
                  <span className={styles.tooltipLabel}>Function:</span>
                  <span>{type} Analysis</span>
                </div>
                <div className={styles.tooltipRow}>
                  <span className={styles.tooltipLabel}>Endpoint:</span>
                  <span>/api/{type.toLowerCase()}/analyze</span>
                </div>
                <div className={styles.tooltipRow}>
                  <span className={styles.tooltipLabel}>Input:</span>
                  <span>Financial data for tickers</span>
                </div>
                <div className={styles.tooltipRow}>
                  <span className={styles.tooltipLabel}>Output:</span>
                  <span>{type} signals with confidence</span>
                </div>
                <div className={styles.tooltipRow}>
                  <span className={styles.tooltipLabel}>Description:</span>
                  <span>Analyzes {type.toLowerCase()} data for trading signals</span>
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

        {displaySignal ? (
          <div className={styles.signal}>
            <div className={styles.signalDetails}>
              <div>Ticker: <strong>{displaySignal.ticker}</strong></div>
              <div className={`${styles.signalIndicator} ${styles[getSignalStrength()]}`}>
                {displaySignal.value > 0 ? '+' : ''}{displaySignal.value.toFixed(2)}
              </div>
              <div>Confidence: <strong>{displaySignal.confidence || 0}%</strong></div>
            </div>

            {isExpanded && (
              <div className={styles.expandedContent}>
                {displaySignal.reasoning && (
                  <div className={styles.reasoningContainer}>
                    <div className={styles.reasoningDetails}>
                      {displaySignal.reasoning && (
                        <>
                          <div className={styles.reasoningSection}>
                            <div className={`${styles.reasoningHeader} ${styles[displaySignal.reasoning.profitability_signal.signal]}`}>
                              Profitability: {displaySignal.reasoning.profitability_signal.signal}
                            </div>
                            <div className={styles.reasoningDetailText}>
                              {displaySignal.reasoning.profitability_signal.details}
                            </div>
                          </div>

                          <div className={styles.reasoningSection}>
                            <div className={`${styles.reasoningHeader} ${styles[displaySignal.reasoning.growth_signal.signal]}`}>
                              Growth: {displaySignal.reasoning.growth_signal.signal}
                            </div>
                            <div className={styles.reasoningDetailText}>
                              {displaySignal.reasoning.growth_signal.details}
                            </div>
                          </div>

                          <div className={styles.reasoningSection}>
                            <div className={`${styles.reasoningHeader} ${styles[displaySignal.reasoning.financial_health_signal.signal]}`}>
                              Financial Health: {displaySignal.reasoning.financial_health_signal.signal}
                            </div>
                            <div className={styles.reasoningDetailText}>
                              {displaySignal.reasoning.financial_health_signal.details}
                            </div>
                          </div>

                          <div className={styles.reasoningSection}>
                            <div className={`${styles.reasoningHeader} ${styles[displaySignal.reasoning.price_ratios_signal.signal]}`}>
                              Price Ratios: {displaySignal.reasoning.price_ratios_signal.signal}
                            </div>
                            <div className={styles.reasoningDetailText}>
                              {displaySignal.reasoning.price_ratios_signal.details}
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                )}

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
                      <span>Sentiment:</span> {displaySignal.value > 0.3 ? 'Bullish' : displaySignal.value < -0.3 ? 'Bearish' : 'Neutral'}
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

      {isActive && <div className={styles.flowIndicator}></div>}
    </div>
  );
};

export default AnalystNode;