import React, { useState, useEffect } from 'react';
import styles from './ProcessFlow.module.css';
import { LineChart, Line, XAxis, ResponsiveContainer, Tooltip, CartesianGrid, YAxis } from 'recharts';
import ApiService from './api.service';
import NodeInfo from './NodeInfo';
import { FinancialMetric, PriceData } from './types';

interface DataCollectionNodeProps {
  id: string;
  isActive: boolean;
  tickers: string[];
  startDate: string;
  endDate: string;
  isLoading: boolean;
}

interface TickerFinancialData {
  prices: PriceData[] | null;
  metrics: FinancialMetric | null;
  fetchedAt: number;
  error: string | null;
}

// Format currency for display
const formatCurrency = (value: number | null | undefined) => {
  if (value === null || value === undefined) return 'N/A';

  if (value >= 1e12) return `$${(value / 1e12).toFixed(2)}T`;
  if (value >= 1e9) return `$${(value / 1e9).toFixed(2)}B`;
  if (value >= 1e6) return `$${(value / 1e6).toFixed(2)}M`;
  if (value >= 1e3) return `$${(value / 1e3).toFixed(2)}K`;
  return `$${value.toFixed(2)}`;
};

// Format a fraction (0.15 = 15%) as a percentage for display
const formatPercentage = (value: number | null | undefined) => {
  if (value === null || value === undefined) return 'N/A';
  return `${(value * 100).toFixed(2)}%`;
};

const formatRatio = (value: number | null | undefined) => {
  if (value === null || value === undefined) return 'N/A';
  return value.toFixed(2);
};

const DataCollectionNode: React.FC<DataCollectionNodeProps> = ({
  id,
  isActive,
  tickers,
  startDate,
  endDate,
  isLoading
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedTicker, setSelectedTicker] = useState<string | null>(tickers.length > 0 ? tickers[0] : null);
  // Loaded data, keyed by ticker and date range so a changed range is fetched again
  const [tickerData, setTickerData] = useState<{ [key: string]: TickerFinancialData }>({});
  const [loadingKeys, setLoadingKeys] = useState<string[]>([]);

  const dataKey = (ticker: string) => `${ticker}|${startDate}|${endDate}`;

  // Update selected ticker if the tickers list changes and current selection is no longer valid
  useEffect(() => {
    if (selectedTicker === null || !tickers.includes(selectedTicker)) {
      setSelectedTicker(tickers.length > 0 ? tickers[0] : null);
    }
  }, [tickers, selectedTicker]);

  const selectedKey = selectedTicker ? dataKey(selectedTicker) : null;
  const selectedTickerData = selectedKey ? tickerData[selectedKey] : undefined;
  const isTickerLoading = Boolean(selectedKey && loadingKeys.includes(selectedKey));

  // Fetch data for selected ticker when expanded
  useEffect(() => {
    if (!isExpanded || !selectedTicker || !selectedKey || selectedTickerData || isTickerLoading) return;

    const key = selectedKey;
    const ticker = selectedTicker;

    const fetchTickerData = async () => {
      setLoadingKeys(prev => [...prev, key]);

      // Prices and metrics are independent: show whichever is available
      const [prices, metrics] = await Promise.allSettled([
        ApiService.getPrices(ticker, startDate, endDate),
        ApiService.getFinancialMetrics(ticker, endDate, 'ttm', 1)
      ]);

      const errors = [prices, metrics]
        .filter((result): result is PromiseRejectedResult => result.status === 'rejected')
        .map(result => ApiService.errorMessage(result.reason));

      setTickerData(prev => ({
        ...prev,
        [key]: {
          prices: prices.status === 'fulfilled' ? prices.value : null,
          metrics: metrics.status === 'fulfilled' ? metrics.value[0] || null : null,
          fetchedAt: Date.now(),
          // Recorded even on failure, which prevents continuous retries
          error: errors.length > 0 ? `Failed to load data for ${ticker}: ${[...new Set(errors)].join('; ')}` : null
        }
      }));
      setLoadingKeys(prev => prev.filter(k => k !== key));
    };

    fetchTickerData();
  }, [isExpanded, selectedTicker, selectedKey, selectedTickerData, isTickerLoading, startDate, endDate]);

  const toggleExpand = (e: React.MouseEvent) => {
    // Prevent triggering when clicking on ticker badges or the info button
    if (!(e.target as HTMLElement).closest(`.${styles.tickerBadge}, .${styles.infoButton}`)) {
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

  // Dropping the loaded data makes the fetch effect run again
  const handleRefresh = (key: string) => {
    setTickerData(prev => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const dismissError = (key: string) => {
    setTickerData(prev => ({ ...prev, [key]: { ...prev[key], error: null } }));
  };

  const prices = selectedTickerData?.prices || [];
  const metrics = selectedTickerData?.metrics;
  const chartData = prices.map(price => ({ date: price.time, value: price.close }));
  const latestPrice = prices.length > 0 ? prices[prices.length - 1].close : null;

  return (
    <div className={styles.nodeWrapper} id={id}>
      <div
        className={`${styles.node} ${styles.dataCollection} ${isActive ? styles.active : ''} ${isExpanded ? styles.expanded : ''}`}
        onClick={toggleExpand}
      >
        <div className={styles.nodeHeader}>
          <div className={styles.headerLeft}>
            <h3>Overview: Price, Metrics, Chart</h3>
            {isActive && <span className={styles.statusIndicator}></span>}
            <NodeInfo
              title="Financial Overview"
              rows={[
                ['Function', 'Financial Data Collection'],
                ['Endpoint', '/api/financial-data/prices, /metrics'],
                ['Input', 'Tickers, Date Range'],
                ['Output', 'Daily prices and financial metrics'],
                ['Description', 'Fetches market data from the Alpha Vantage API (cached by the backend)']
              ]}
            />
          </div>
          <button className={styles.expandButton} onClick={(e) => { e.stopPropagation(); setIsExpanded(!isExpanded); }}>
            {isExpanded ? '−' : '+'}
          </button>
        </div>

        <div className={styles.serviceContent}>
          <div className={styles.tickerBadges}>
            {tickers.map(ticker => (
              <span
                key={ticker}
                className={`${styles.tickerBadge} ${selectedTicker === ticker ? styles.selected : ''} ${loadingKeys.includes(dataKey(ticker)) ? styles.loading : ''}`}
                onClick={(e) => handleTickerClick(ticker, e)}
                style={{
                  cursor: 'pointer',
                  backgroundColor: selectedTicker === ticker ? '#1976d2' : '#455a64',
                  border: selectedTicker === ticker ? '1px solid #42a5f5' : '1px solid transparent'
                }}
              >
                {ticker}
                {loadingKeys.includes(dataKey(ticker)) && (
                  <span className={styles.badgeLoader}></span>
                )}
              </span>
            ))}
          </div>
          <div className={styles.dateRange}>
            {startDate} to {endDate}
          </div>

          {isExpanded && selectedTicker && selectedKey && (
            <div className={styles.expandedContent}>
              <div className={styles.tickerOverview}>
                <div className={styles.tickerHeader}>
                  <h4>{selectedTicker} Overview</h4>
                  <button
                    className={styles.refreshButton}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRefresh(selectedKey);
                    }}
                    disabled={isTickerLoading}
                  >
                    Refresh
                  </button>
                </div>

                {selectedTickerData?.error && (
                  <div className={styles.errorMessage}>
                    {selectedTickerData.error}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        dismissError(selectedKey);
                      }}
                      className={styles.dismissButton}
                    >
                      ✕
                    </button>
                  </div>
                )}

                {isTickerLoading || !selectedTickerData ? (
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
                            {latestPrice !== null ? `$${latestPrice.toFixed(2)}` : 'N/A'}
                          </span>
                        </div>

                        <div className={styles.metric}>
                          <span className={styles.metricLabel}>Market Cap</span>
                          <span className={styles.metricValue}>
                            {formatCurrency(metrics?.market_cap)}
                          </span>
                        </div>

                        <div className={styles.metric}>
                          <span className={styles.metricLabel}>PE Ratio</span>
                          <span className={styles.metricValue}>
                            {formatRatio(metrics?.price_to_earnings_ratio)}
                          </span>
                        </div>
                      </div>

                      <div className={styles.metricGroup}>
                        <div className={styles.metric}>
                          <span className={styles.metricLabel}>Net Margin</span>
                          <span className={styles.metricValue}>
                            {formatPercentage(metrics?.net_margin)}
                          </span>
                        </div>

                        <div className={styles.metric}>
                          <span className={styles.metricLabel}>ROE</span>
                          <span className={styles.metricValue}>
                            {formatPercentage(metrics?.return_on_equity)}
                          </span>
                        </div>

                        <div className={styles.metric}>
                          <span className={styles.metricLabel}>Debt/Equity</span>
                          <span className={styles.metricValue}>
                            {formatRatio(metrics?.debt_to_equity)}
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
                        <div className={styles.noData}>No price data available</div>
                      )}
                    </div>

                    <div className={styles.additionalInfo}>
                      <div className={styles.dataStats}>
                        <div className={styles.stat}>
                          <span>Records:</span> {prices.length}
                        </div>
                        <div className={styles.stat}>
                          <span>Last Updated:</span> {new Date(selectedTickerData.fetchedAt).toLocaleTimeString()}
                        </div>
                      </div>

                      <div className={styles.additionalMetrics}>
                        <h5>Additional Metrics</h5>
                        <table className={styles.metricsTable}>
                          <tbody>
                            <tr>
                              <td>P/B Ratio</td>
                              <td>{formatRatio(metrics?.price_to_book_ratio)}</td>
                            </tr>
                            <tr>
                              <td>P/S Ratio</td>
                              <td>{formatRatio(metrics?.price_to_sales_ratio)}</td>
                            </tr>
                            <tr>
                              <td>EV/EBITDA</td>
                              <td>{formatRatio(metrics?.enterprise_value_to_ebitda_ratio)}</td>
                            </tr>
                            <tr>
                              <td>Current Ratio</td>
                              <td>{formatRatio(metrics?.current_ratio)}</td>
                            </tr>
                            <tr>
                              <td>EPS</td>
                              <td>{formatCurrency(metrics?.earnings_per_share)}</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {isLoading && (
            <div className={styles.loadingOverlay}>
              <div className={styles.loadingSpinner}></div>
              <div>Running analysis...</div>
            </div>
          )}
        </div>
      </div>

      {isActive && <div className={styles.flowIndicator}></div>}
    </div>
  );
};

export default DataCollectionNode;
