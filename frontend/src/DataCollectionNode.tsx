import React, { useState, useEffect, useRef } from 'react';
import styles from './ProcessFlow.module.css';
import { LineChart, Line, XAxis, ResponsiveContainer, Tooltip, CartesianGrid, YAxis } from 'recharts';
import ApiService from './api.service';

interface DataCollectionNodeProps {
  id: string;
  isActive: boolean;
  tickers: string[];
  startDate: string;
  endDate: string;
  isLoading: boolean;
  data?: { [ticker: string]: any[] }; // Sample price data for mini-charts, keyed by ticker
}

interface Price {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface TickerFinancialData {
  prices: Price[] | null;
  pricesLoaded: boolean;
  overview: any | null;
  overviewLoaded: boolean;
  metrics: any | null;
  metricsLoaded: boolean;
  error?: string | null;
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
  const [tickerData, setTickerData] = useState<{ [ticker: string]: TickerFinancialData }>({});
  const [loadingTickers, setLoadingTickers] = useState<string[]>([]);
  const [globalError, setGlobalError] = useState<string | null>(null);
  
  // Initialize ticker data state whenever tickers change
  useEffect(() => {
    const newTickerData = { ...tickerData };
    let stateChanged = false;
    
    tickers.forEach(ticker => {
      if (!newTickerData[ticker]) {
        newTickerData[ticker] = {
          prices: null,
          pricesLoaded: false,
          overview: null,
          overviewLoaded: false,
          metrics: null,
          metricsLoaded: false,
          error: null
        };
        stateChanged = true;
      }
    });
    
    if (stateChanged) {
      setTickerData(newTickerData);
    }
  }, [tickers]);
  
  // Update selected ticker if the tickers list changes and current selection is no longer valid
  useEffect(() => {
    if (selectedTicker === null || !tickers.includes(selectedTicker)) {
      setSelectedTicker(tickers.length > 0 ? tickers[0] : null);
    }
  }, [tickers, selectedTicker]);

  // Fetch data for selected ticker when expanded
  useEffect(() => {
    if (!isExpanded || !selectedTicker) return;
    
    const fetchTickerData = async () => {
      // Skip if already loaded or currently loading
      if (loadingTickers.includes(selectedTicker)) return;
      
      const currentTickerData = tickerData[selectedTicker];
      if (!currentTickerData) return;
      
      setGlobalError(null);
      
      // Create an array of data fetch tasks
      const fetchTasks = [];
      
      // Only fetch prices if not already loaded or if there was an error
      if (!currentTickerData.pricesLoaded) {
        fetchTasks.push(async () => {
          try {
            setLoadingTickers(prev => [...prev, selectedTicker]);
            const prices = await ApiService.getPrices(selectedTicker, startDate, endDate);
            setTickerData(prev => ({
              ...prev,
              [selectedTicker]: {
                ...prev[selectedTicker],
                prices,
                pricesLoaded: true,
                error: null
              }
            }));
          } catch (err) {
            console.error(`Error fetching prices for ${selectedTicker}:`, err);
            setTickerData(prev => ({
              ...prev,
              [selectedTicker]: {
                ...prev[selectedTicker],
                prices: null,
                pricesLoaded: true, // Mark as loaded to prevent continuous retries
                error: `Failed to load price data for ${selectedTicker}. ${err instanceof Error ? err.message : ''}`
              }
            }));
          }
        });
      }
      
      // Only fetch metrics if not already loaded
      if (!currentTickerData.metricsLoaded) {
        fetchTasks.push(async () => {
          try {
            const metrics = await ApiService.getFinancialMetrics(selectedTicker, endDate);
            setTickerData(prev => ({
              ...prev,
              [selectedTicker]: {
                ...prev[selectedTicker],
                metrics: metrics.length > 0 ? metrics[0] : null,
                metricsLoaded: true
              }
            }));
          } catch (err) {
            console.error(`Error fetching metrics for ${selectedTicker}:`, err);
            setTickerData(prev => ({
              ...prev,
              [selectedTicker]: {
                ...prev[selectedTicker],
                metrics: null,
                metricsLoaded: true
              }
            }));
          }
        });
      }
      
      // Only fetch overview if not already loaded
      if (!currentTickerData.overviewLoaded) {
        fetchTasks.push(async () => {
          try {
            const overview = await ApiService.getFinancialOverview(selectedTicker);
            setTickerData(prev => ({
              ...prev,
              [selectedTicker]: {
                ...prev[selectedTicker],
                overview,
                overviewLoaded: true
              }
            }));
          } catch (err) {
            console.error(`Error fetching overview for ${selectedTicker}:`, err);
            setTickerData(prev => ({
              ...prev,
              [selectedTicker]: {
                ...prev[selectedTicker],
                overview: null,
                overviewLoaded: true
              }
            }));
          }
        });
      }
      
      // Execute all fetch tasks
      if (fetchTasks.length > 0) {
        try {
          await Promise.all(fetchTasks.map(task => task()));
        } finally {
          setLoadingTickers(prev => prev.filter(t => t !== selectedTicker));
        }
      }
    };

    fetchTickerData();
  }, [selectedTicker, isExpanded, startDate, endDate, tickerData, loadingTickers]);

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
  
  // Handle refresh for a ticker
  const handleRefresh = (ticker: string) => {
    if (loadingTickers.includes(ticker)) return;
    
    setTickerData(prev => ({
      ...prev,
      [ticker]: {
        ...prev[ticker],
        pricesLoaded: false,
        metricsLoaded: false,
        overviewLoaded: false,
        error: null
      }
    }));
  };

  // Cleanup tooltip timeout on unmount
  useEffect(() => {
    return () => {
      if (tooltipTimeoutRef.current) {
        clearTimeout(tooltipTimeoutRef.current);
      }
    };
  }, []);

  // Get data for the selected ticker's chart
  const getChartData = () => {
    if (!selectedTicker) return [];
    
    // If we have real data from the API
    const currentTickerData = tickerData[selectedTicker];
    if (currentTickerData?.prices && Array.isArray(currentTickerData.prices) && currentTickerData.prices.length > 0) {
      // Create a properly formatted chart data array and sort by date
      return [...currentTickerData.prices] // Create a copy to avoid mutation
        .sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime()) // Sort by date ascending
        .map(price => ({
          date: price.time,
          value: price.close
        }));
    }
    
    // If we have data passed from props
    if (data && data[selectedTicker]) {
      return data[selectedTicker];
    }
    
    // Otherwise use placeholder data
    return generateSampleData(selectedTicker);
  };

  // Generate sample data for each ticker if real data not available
  const generateSampleData = (ticker: string) => {
    const seed = ticker.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0);
    return Array(20).fill(0).map((_, i) => ({
      date: new Date(new Date(startDate).getTime() + i * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      value: Math.random() * 20 + 140 - (i % 5 === 0 ? 10 : 0) + (seed % 50)
    }));
  };
  
  // Format currency for display
  const formatCurrency = (value: number | null | undefined) => {
    if (value === null || value === undefined) return 'N/A';
    
    if (value >= 1e12) return `$${(value / 1e12).toFixed(2)}T`;
    if (value >= 1e9) return `$${(value / 1e9).toFixed(2)}B`;
    if (value >= 1e6) return `$${(value / 1e6).toFixed(2)}M`;
    if (value >= 1e3) return `$${(value / 1e3).toFixed(2)}K`;
    return `$${value.toFixed(2)}`;
  };
  
  // Format percentage for display
  const formatPercentage = (value: number | null | undefined) => {
    if (value === null || value === undefined) return 'N/A';
    return `${value > 0 ? '+' : ''}${value.toFixed(2)}%`;
  };

  const chartData = getChartData();
  const isTickerLoading = Boolean(selectedTicker && loadingTickers.includes(selectedTicker));
  
  // Get the data for the selected ticker
  const selectedTickerData = selectedTicker ? tickerData[selectedTicker] : null;
  const hasError = selectedTickerData?.error;
  const overview = selectedTickerData?.overview;
  const metrics = selectedTickerData?.metrics;
  
  const recordCount = selectedTicker && selectedTickerData?.prices ? selectedTickerData.prices.length : 0;
  const lastUpdated = selectedTicker && selectedTickerData?.pricesLoaded && selectedTickerData.prices?.length ? 
    new Date().toLocaleTimeString() : '-';

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
                  <span>/api/financial-data/prices</span>
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
                  <span>Fetches market data from Alpha Vantage API</span>
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
                className={`${styles.tickerBadge} ${selectedTicker === ticker ? styles.selected : ''} ${loadingTickers.includes(ticker) ? styles.loading : ''}`}
                onClick={(e) => handleTickerClick(ticker, e)}
                style={{ 
                  cursor: 'pointer',
                  backgroundColor: selectedTicker === ticker ? '#1976d2' : '#455a64',
                  border: selectedTicker === ticker ? '1px solid #42a5f5' : '1px solid transparent'
                }}
              >
                {ticker}
                {loadingTickers.includes(ticker) && (
                  <span className={styles.badgeLoader}></span>
                )}
              </span>
            ))}
          </div>
          <div className={styles.dateRange}>
            {startDate} to {endDate}
          </div>
          
          {isExpanded && (
            <div className={styles.expandedContent}>
              {globalError && (
                <div className={styles.errorMessage}>
                  {globalError}
                  <button onClick={() => setGlobalError(null)} className={styles.dismissButton}>✕</button>
                </div>
              )}
              
              {selectedTicker && (
                <div className={styles.tickerOverview}>
                  <div className={styles.tickerHeader}>
                    <h4>{selectedTicker} Overview</h4>
                    <button 
                      className={styles.refreshButton}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (selectedTicker) {
                          handleRefresh(selectedTicker);
                        }
                      }}
                      disabled={isTickerLoading}
                    >
                      Refresh
                    </button>
                  </div>
                  
                  {hasError && (
                    <div className={styles.errorMessage}>
                      {hasError}
                      <button onClick={() => {
                        setTickerData(prev => ({
                          ...prev,
                          [selectedTicker]: {
                            ...prev[selectedTicker],
                            error: null
                          }
                        }));
                      }} className={styles.dismissButton}>✕</button>
                    </div>
                  )}
                  
                  {isTickerLoading ? (
                    <div className={styles.loadingIndicator}>
                      <div className={styles.spinner}></div>
                      <p>Loading financial data...</p>
                    </div>
                  ) : (
                    <>
                      <div className={styles.keyMetrics}>
                        <div className={styles.metricGroup}>
                          <div className={styles.metric}>
                            <span className={styles.metricLabel}>Last Price</span>
                            <span className={styles.metricValue}>
                              {overview?.latestPrice ? `$${overview.latestPrice.toFixed(2)}` : 'N/A'}
                            </span>
                          </div>
                          
                          <div className={styles.metric}>
                            <span className={styles.metricLabel}>Market Cap</span>
                            <span className={styles.metricValue}>
                              {formatCurrency(overview?.marketCap)}
                            </span>
                          </div>
                          
                          <div className={styles.metric}>
                            <span className={styles.metricLabel}>PE Ratio</span>
                            <span className={styles.metricValue}>
                              {metrics?.price_to_earnings_ratio ? 
                                metrics.price_to_earnings_ratio.toFixed(2) : 'N/A'}
                            </span>
                          </div>
                        </div>
                        
                        <div className={styles.metricGroup}>
                          <div className={styles.metric}>
                            <span className={styles.metricLabel}>Net Margin</span>
                            <span className={styles.metricValue}>
                              {metrics?.net_margin ? 
                                formatPercentage(metrics.net_margin) : 'N/A'}
                            </span>
                          </div>
                          
                          <div className={styles.metric}>
                            <span className={styles.metricLabel}>ROE</span>
                            <span className={styles.metricValue}>
                              {metrics?.return_on_equity ? 
                                formatPercentage(metrics.return_on_equity) : 'N/A'}
                            </span>
                          </div>
                          
                          <div className={styles.metric}>
                            <span className={styles.metricLabel}>Debt/Equity</span>
                            <span className={styles.metricValue}>
                              {metrics?.debt_to_equity ? 
                                metrics.debt_to_equity.toFixed(2) : 'N/A'}
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      <div className={styles.miniChartContainer}>
                        <h5>Price Chart</h5>
                        {chartData.length > 0 ? (
                          <ResponsiveContainer width="100%" height={150}>
                            <LineChart data={chartData}>
                              <XAxis 
                                dataKey="date" 
                                tick={{fontSize: 10}}
                                tickFormatter={(date) => {
                                  return new Date(date).toLocaleDateString(undefined, {
                                    month: 'short',
                                    day: 'numeric'
                                  });
                                }}
                              />
                              <YAxis 
                                domain={['auto', 'auto']}
                                tick={{fontSize: 10}}
                                width={40}
                              />
                              <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                              <Line 
                                type="monotone" 
                                dataKey="value" 
                                stroke="#42a5f5" 
                                dot={false}
                                isAnimationActive={false}
                              />
                              <Tooltip 
                                formatter={(value: number) => [`$${value.toFixed(2)}`, 'Price']}
                                labelFormatter={(date) => new Date(date).toLocaleDateString()}
                              />
                            </LineChart>
                          </ResponsiveContainer>
                        ) : (
                          <div className={styles.noData}>
                            {selectedTickerData?.pricesLoaded ? 
                              'No price data available' : 
                              'Loading price data...'}
                          </div>
                        )}
                      </div>
                      
                      <div className={styles.additionalInfo}>
                        <div className={styles.dataStats}>
                          <div className={styles.stat}>
                            <span>Records:</span> {recordCount}
                          </div>
                          <div className={styles.stat}>
                            <span>Last Updated:</span> {lastUpdated}
                          </div>
                        </div>
                        
                        <div className={styles.additionalMetrics}>
                          <h5>Additional Metrics</h5>
                          <table className={styles.metricsTable}>
                            <tbody>
                              <tr>
                                <td>P/B Ratio</td>
                                <td>{metrics?.price_to_book_ratio ? 
                                  metrics.price_to_book_ratio.toFixed(2) : 'N/A'}</td>
                              </tr>
                              <tr>
                                <td>P/S Ratio</td>
                                <td>{metrics?.price_to_sales_ratio ? 
                                  metrics.price_to_sales_ratio.toFixed(2) : 'N/A'}</td>
                              </tr>
                              <tr>
                                <td>EV/EBITDA</td>
                                <td>{metrics?.enterprise_value_to_ebitda_ratio ? 
                                  metrics.enterprise_value_to_ebitda_ratio.toFixed(2) : 'N/A'}</td>
                              </tr>
                              <tr>
                                <td>Current Ratio</td>
                                <td>{metrics?.current_ratio ? 
                                  metrics.current_ratio.toFixed(2) : 'N/A'}</td>
                              </tr>
                              <tr>
                                <td>EPS</td>
                                <td>{metrics?.earnings_per_share ? 
                                  formatCurrency(metrics.earnings_per_share) : 'N/A'}</td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}
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