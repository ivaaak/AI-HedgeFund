import React, { useState, useEffect, useRef } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import styles from './Dark.module.css';
import ApiService from './api.service';
import {
  AnalystType,
  NodeType,
  SystemState,
  ProcessFlowConfig,
} from './types';
import ProcessFlow from './ProcessFlow';
import {
  createPortfolio,
  equityValue,
  loadPerformance,
  loadPortfolio,
  portfolioReturn,
  portfolioValue,
  savePortfolio,
} from './portfolio';

const TICKER_PATTERN = /^[A-Z][A-Z0-9.-]{0,9}$/;
const MAX_TICKERS = 10;
const AUTO_REFRESH_MS = 5 * 60 * 1000;

const DEFAULT_FLOW_CONFIG: ProcessFlowConfig = {
  showAnalyst: true,
  showRiskManager: true,
  showPortfolioManager: true,
  showDecision: true,
  animationsEnabled: true
};

const SERVICES: Array<{ value: string; label: string }> = [
  { value: 'all', label: 'All Services (with paper trades)' },
  { value: AnalystType.FUNDAMENTAL, label: 'Fundamentals Only' },
  { value: AnalystType.TECHNICAL, label: 'Technicals Only' },
  { value: AnalystType.SENTIMENT, label: 'Sentiment Only' },
  { value: AnalystType.VALUATION, label: 'Valuation Only' },
  { value: 'risk', label: 'Risk Management Only' },
  { value: 'portfolio', label: 'Portfolio Management Only' },
];

const formatMoney = (value: number): string =>
  `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const isoDate = (date: Date): string => date.toISOString().split('T')[0];

const App: React.FC = () => {
  const [systemState, setSystemState] = useState<SystemState>(() => ({
    activeNodes: [],
    signals: {},
    portfolio: loadPortfolio(),
    performance: loadPerformance()
  }));
  const [isControlPanelCollapsed, setIsControlPanelCollapsed] = useState<boolean>(false);
  const [tickers, setTickers] = useState<string[]>(['AAPL', 'MSFT', 'AMZN']);
  const [newTicker, setNewTicker] = useState<string>('');
  const [isConnected, setIsConnected] = useState<boolean | null>(null);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState<boolean>(false);
  const [selectedService, setSelectedService] = useState<string>('all');
  const [startDate, setStartDate] = useState<string>(
    isoDate(new Date(Date.now() - 90 * 24 * 60 * 60 * 1000))
  );
  const [endDate, setEndDate] = useState<string>(isoDate(new Date()));
  const [processFlowConfig, setProcessFlowConfig] = useState<ProcessFlowConfig>(DEFAULT_FLOW_CONFIG);

  const { portfolio, performance } = systemState;

  // Check API connection
  const checkConnection = async () => {
    setIsConnected(null);
    setIsConnected(await ApiService.checkHealth());
  };

  useEffect(() => {
    checkConnection();
  }, []);

  // The paper portfolio lives in the browser
  useEffect(() => {
    savePortfolio(portfolio, performance);
  }, [portfolio, performance]);

  const activate = (state: SystemState, ...nodes: NodeType[]): NodeType[] =>
    [...new Set([...state.activeNodes, ...nodes])];

  const runSelectedService = async () => {
    if (selectedService === 'all') {
      // Full pipeline: analysts -> risk -> decisions -> paper trades
      const result = await ApiService.runHedgeFund(tickers, startDate, endDate, portfolio);

      setSystemState(prevState => ({
        activeNodes: Object.values(NodeType),
        signals: result.analyst_signals,
        riskAssessment: result.risk,
        decision: { decisions: result.decisions, source: result.decision_source, note: result.decision_note },
        portfolio: result.portfolio,
        performance: [
          ...prevState.performance,
          { timestamp: Date.now(), value: portfolioValue(result.portfolio) }
        ].slice(-100),
        lastRun: Date.now()
      }));

      const executed = result.trades.map(trade => `${trade.action} ${trade.quantity} ${trade.ticker}`);
      const skipped = result.skipped_trades.map(trade => `${trade.ticker}: ${trade.reason}`);
      setNotice([
        executed.length > 0 ? `Executed: ${executed.join(', ')}.` : 'No trades executed.',
        skipped.length > 0 ? `Skipped: ${skipped.join('; ')}.` : ''
      ].join(' ').trim());
      return;
    }

    if (selectedService === 'risk') {
      const riskAssessment = await ApiService.analyzeRisk(tickers, startDate, endDate, portfolio);
      setSystemState(prevState => ({
        ...prevState,
        riskAssessment,
        activeNodes: activate(prevState, NodeType.DATA_COLLECTION, NodeType.RISK_MANAGER),
        lastRun: Date.now()
      }));
      return;
    }

    if (selectedService === 'portfolio') {
      // Decides on the signals and risk limits of earlier runs; no trades are executed
      const { signals, riskAssessment } = systemState;
      if (Object.keys(signals).length === 0 || !riskAssessment) {
        throw new Error('Run at least one analyst and risk management first');
      }

      const decision = await ApiService.managePortfolio(
        tickers.filter(ticker => riskAssessment.results[ticker]),
        signals,
        riskAssessment.results,
        portfolio
      );
      setSystemState(prevState => ({
        ...prevState,
        decision,
        activeNodes: activate(prevState, NodeType.PORTFOLIO_MANAGER, NodeType.ACTION),
        lastRun: Date.now()
      }));
      return;
    }

    // A single analyst
    const analyst = selectedService as AnalystType;
    const analysis = await ApiService.analyze(analyst, tickers, startDate, endDate);
    setSystemState(prevState => ({
      ...prevState,
      signals: { ...prevState.signals, [analyst]: analysis },
      activeNodes: activate(prevState, NodeType.DATA_COLLECTION, NodeType.ANALYST),
      lastRun: Date.now()
    }));
  };

  const handleRunAnalysis = async () => {
    if (isRunning) return;

    if (tickers.length === 0) {
      setError('Add at least one ticker');
      return;
    }
    if (startDate > endDate) {
      setError('Start date must not be after end date');
      return;
    }

    try {
      setError(null);
      setNotice(null);
      setIsRunning(true);
      await runSelectedService();
      setIsConnected(true);
    } catch (err) {
      setError(`Error running analysis: ${ApiService.errorMessage(err)}`);
    } finally {
      setIsRunning(false);
    }
  };

  // Auto-refresh always calls the latest version of the run handler
  const runRef = useRef(handleRunAnalysis);
  useEffect(() => {
    runRef.current = handleRunAnalysis;
  });

  useEffect(() => {
    if (!isConnected || !autoRefresh) return;

    const interval = setInterval(() => runRef.current(), AUTO_REFRESH_MS);
    return () => clearInterval(interval);
  }, [isConnected, autoRefresh]);

  const handleAddTicker = (e: React.FormEvent) => {
    e.preventDefault();
    const ticker = newTicker.trim().toUpperCase();

    if (!TICKER_PATTERN.test(ticker)) {
      setError(`"${newTicker}" is not a valid ticker symbol`);
      return;
    }
    if (tickers.includes(ticker)) {
      setNewTicker('');
      return;
    }
    if (tickers.length >= MAX_TICKERS) {
      setError(`At most ${MAX_TICKERS} tickers can be analysed at once`);
      return;
    }

    setError(null);
    setTickers([...tickers, ticker]);
    setNewTicker('');
  };

  const handleRemoveTicker = (ticker: string) => {
    setTickers(tickers.filter(t => t !== ticker));
  };

  // Toggle process flow configuration
  const toggleProcessFlowConfig = (key: keyof ProcessFlowConfig) => {
    setProcessFlowConfig(prevConfig => ({
      ...prevConfig,
      [key]: !prevConfig[key]
    }));
  };

  const handleResetPortfolio = () => {
    if (!window.confirm('Reset the paper portfolio to its starting cash and clear the trade history?')) {
      return;
    }
    setSystemState(prevState => ({
      ...prevState,
      decision: undefined,
      riskAssessment: undefined,
      portfolio: createPortfolio(),
      performance: []
    }));
    setNotice(null);
  };

  const totalReturn = portfolioReturn(portfolio);

  return (
    <div className={styles.container}>
      <div
        className={styles.controlPanel}
        style={isControlPanelCollapsed ? { maxHeight: '60px', overflow: 'hidden' } : undefined}
      >
        <div className={styles.tickerControls}>
          <h3>Ticker Management</h3>
          <form onSubmit={handleAddTicker} className={styles.tickerForm}>
            <input
              type="text"
              value={newTicker}
              onChange={(e) => setNewTicker(e.target.value.toUpperCase())}
              placeholder="Add ticker (e.g., AAPL)"
              className={styles.tickerInput}
              maxLength={10}
            />
            <button type="submit" className={styles.addButton} disabled={!newTicker.trim()}>Add</button>
          </form>

          <div className={styles.tickerList}>
            <h4>Active Tickers:</h4>
            <ul>
              {tickers.map(ticker => (
                <li key={ticker} className={styles.tickerItem}>
                  {ticker}
                  <button
                    onClick={() => handleRemoveTicker(ticker)}
                    className={styles.removeButton}
                    aria-label={`Remove ${ticker}`}
                  >
                    X
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className={styles.analysisControls}>
          <h3>Analysis Controls</h3>
          <div className={styles.dateControls}>
            <div>
              <label htmlFor="startDate">Start Date:</label>
              <input
                id="startDate"
                type="date"
                value={startDate}
                max={endDate}
                onChange={(e) => setStartDate(e.target.value)}
                className={styles.dateInput}
              />
            </div>
            <div>
              <label htmlFor="endDate">End Date:</label>
              <input
                id="endDate"
                type="date"
                value={endDate}
                min={startDate}
                onChange={(e) => setEndDate(e.target.value)}
                className={styles.dateInput}
              />
            </div>
          </div>

          <div className={styles.serviceSelector}>
            <label htmlFor="service">Service to Run:</label>
            <select
              id="service"
              value={selectedService}
              onChange={(e) => setSelectedService(e.target.value)}
              className={styles.serviceSelect}
            >
              {SERVICES.map(service => (
                <option key={service.value} value={service.value}>{service.label}</option>
              ))}
            </select>
          </div>

          <div className={styles.runControls}>
            <button
              onClick={handleRunAnalysis}
              className={styles.runButton}
              disabled={isRunning || tickers.length === 0}
            >
              {isRunning ? 'Running...' : 'Run Analysis'}
            </button>

            <div className={styles.autoRefresh}>
              <input
                type="checkbox"
                id="autoRefresh"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
              />
              <label htmlFor="autoRefresh">Auto-refresh (5 min)</label>
            </div>
          </div>

          <div className={`${styles.statusLine} ${isConnected === null ? '' : isConnected ? styles.connected : styles.disconnected}`}>
            {isConnected === null ? 'Connecting to API...' : isConnected ? 'API connected' : 'API not reachable'}
            {systemState.lastRun && ` · Last run ${new Date(systemState.lastRun).toLocaleTimeString()}`}
          </div>
        </div>

        {/* Process Flow Configuration Column */}
        <div className={styles.processFlowControls}>
          <h3>Process Flow Configuration</h3>
          <div className={styles.processFlowConfig}>
            {([
              ['showAnalyst', 'Show Analyst Nodes'],
              ['showRiskManager', 'Show Risk Manager Node'],
              ['showPortfolioManager', 'Show Portfolio Manager Node'],
              ['showDecision', 'Show Action Nodes'],
              ['animationsEnabled', 'Enable Flow Animations'],
            ] as Array<[keyof ProcessFlowConfig, string]>).map(([key, label]) => (
              <div key={key} className={styles.configOption}>
                <input
                  type="checkbox"
                  id={key}
                  checked={processFlowConfig[key]}
                  onChange={() => toggleProcessFlowConfig(key)}
                  className={styles.configCheckbox}
                />
                <label htmlFor={key}>{label}</label>
              </div>
            ))}

            <div className={styles.configFooter}>
              <button
                onClick={() => setProcessFlowConfig(DEFAULT_FLOW_CONFIG)}
                className={styles.resetButton}
              >
                Reset to Default
              </button>

              <div className={styles.tipsIconContainer}>
                <div className={styles.tipsIcon}>?</div>
                <div className={styles.tipsTooltip}>
                  <h4>Usage Tips:</h4>
                  <ul className={styles.helpList}>
                    <li>Toggle nodes to simplify the visualization</li>
                    <li>Disable animations to improve performance</li>
                    <li>Click a node to see the reasoning behind its result</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Paper Portfolio Column */}
        <div className={styles.accountControls}>
          <div className={styles.accountHeader}>
            <h3>Paper Portfolio</h3>
            <button onClick={handleResetPortfolio} className={styles.logoutButton}>
              Reset
            </button>
            <button onClick={() => setIsControlPanelCollapsed(!isControlPanelCollapsed)} className={styles.collapseButton}>
              {isControlPanelCollapsed ? 'Expand' : 'Collapse'}
            </button>
          </div>

          <div className={styles.accountDetails}>
            <div className={styles.accountStat}>
              <span className={styles.statLabel}>Total Value:</span>
              <span className={styles.statValue}>{formatMoney(portfolioValue(portfolio))}</span>
            </div>

            <div className={styles.accountStat}>
              <span className={styles.statLabel}>Cash:</span>
              <span className={styles.statValue}>{formatMoney(portfolio.cash)}</span>
            </div>

            <div className={styles.accountStat}>
              <span className={styles.statLabel}>Invested:</span>
              <span className={styles.statValue}>
                {formatMoney(equityValue(portfolio))} in {Object.keys(portfolio.positions).length} position(s)
              </span>
            </div>

            <div className={styles.accountStat}>
              <span className={styles.statLabel}>Return:</span>
              <span className={`${styles.statValue} ${totalReturn > 0 ? styles.positive : totalReturn < 0 ? styles.negative : ''}`}>
                {totalReturn > 0 ? '+' : ''}{totalReturn.toFixed(2)}%
              </span>
            </div>

            <div className={styles.accountStat}>
              <span className={styles.statLabel}>Trades:</span>
              <span className={styles.statValue}>{portfolio.history.length}</span>
            </div>
          </div>
        </div>
      </div>

      {isConnected === false && (
        <div className={styles.errorBanner}>
          Failed to connect to the API server. Is the backend running?
          <button onClick={checkConnection}>Retry</button>
        </div>
      )}

      {error && (
        <div className={styles.errorBanner}>
          {error} <button onClick={() => setError(null)}>Dismiss</button>
        </div>
      )}

      {notice && <div className={styles.warningBanner}>{notice}</div>}

      <ProcessFlow
        systemState={systemState}
        tickers={tickers}
        startDate={startDate}
        endDate={endDate}
        isLoading={isRunning}
        config={processFlowConfig}>
      </ProcessFlow>

      <div className={styles.performanceChart}>
        <h2>Portfolio Value</h2>
        {performance.length > 0 ? (
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={performance}>
              <XAxis
                dataKey="timestamp"
                tickFormatter={(timestamp) => new Date(timestamp).toLocaleTimeString()}
              />
              <YAxis
                domain={['auto', 'auto']}
                width={80}
                tickFormatter={(value: number) => `$${Math.round(value).toLocaleString()}`}
              />
              <Tooltip
                labelFormatter={(label) => new Date(label).toLocaleString()}
                formatter={(value: number) => [formatMoney(value), 'Value']}
              />
              <Line
                type="monotone"
                dataKey="value"
                stroke="#8884d8"
                dot={performance.length < 20}
                isAnimationActive={processFlowConfig.animationsEnabled}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className={styles.noData}>Run all services to start tracking the paper portfolio</div>
        )}
      </div>
    </div>
  );
};

export default App;
