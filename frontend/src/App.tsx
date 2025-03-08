import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import styles from './Dark.module.css';
import ApiService from './api.service';
import {
  AnalystType,
  ActionType,
  NodeType,
  SystemState,
  Signal,
  Decision,
  AccountInfo,
  ProcessFlowConfig,
} from './types';
import ProcessFlow from './ProcessFlow';

const App: React.FC = () => {
  const [systemState, setSystemState] = useState<SystemState>({
    activeNodes: [],
    signals: {} as Record<AnalystType, Signal>,
    performance: []
  });
  const [tickers, setTickers] = useState<string[]>(['AAPL', 'MSFT', 'AMZN']);
  const [newTicker, setNewTicker] = useState<string>('');
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState<boolean>(false);
  const [selectedService, setSelectedService] = useState<string>('all');
  const [startDate, setStartDate] = useState<string>(
    new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [endDate, setEndDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );

  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const [accountInfo, setAccountInfo] = useState<AccountInfo>({
    username: '',
    accountBalance: 0,
    portfolioValue: 0,
    lastLogin: '',
    subscriptionTier: 'Free'
  });

  // New state for process flow configuration
  const [processFlowConfig, setProcessFlowConfig] = useState<ProcessFlowConfig>({
    showAnalyst: true,
    showRiskManager: true,
    showPortfolioManager: true,
    showDecision: true,
    animationsEnabled: true
  });

  // Check API connection
  useEffect(() => {
    const checkConnection = async () => {
      try {
        const isHealthy = await ApiService.checkHealth();
        setIsConnected(isHealthy);
        setIsLoading(false);
      } catch (err) {
        setIsConnected(false);
        setIsLoading(false);
        setError('Failed to connect to API server');
      }
    };

    checkConnection();
  }, []);

  // Fetch data and update system state
  useEffect(() => {
    if (!isConnected || !autoRefresh) return;

    let isMounted = true;
    const fetchData = async () => {
      try {
        await updateSystemState();
      } catch (err) {
        if (isMounted) {
          const errorMessage = err instanceof Error ? err.message : 'Unknown error';
          setError(`Error fetching data: ${errorMessage}`);
        }
      }
    };

    // Set up polling interval if auto-refresh is enabled
    const interval = setInterval(fetchData, 60000); // Poll every minute

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [isConnected, autoRefresh, tickers, selectedService]); // eslint-disable-line react-hooks/exhaustive-deps

  const updateSystemState = async () => {
    // Set active nodes based on process flow configuration
    let activeNodes: NodeType[] = [];

    if (processFlowConfig.showAnalyst) {
      activeNodes.push(NodeType.ANALYST);
    }

    // Run fundamental analysis if "all" or "fundamentals" is selected
    if (selectedService === 'all' || selectedService === 'fundamentals') {
      const signals = await ApiService.analyzeFundamentals(tickers, startDate, endDate);

      // Format signals for system state
      const formattedSignals: Record<AnalystType, Signal> = {} as Record<AnalystType, Signal>;
      signals.forEach(signal => {
        formattedSignals[signal.analyst] = signal;
      });

      // Update system state with signals
      setSystemState(prevState => ({
        ...prevState,
        signals: formattedSignals,
      }));

      // Add risk manager to active nodes if enabled
      if (processFlowConfig.showRiskManager) {
        activeNodes.push(NodeType.RISK_MANAGER);
      }
    }

    // Generate risk assessment if "all" or "risk" is selected
    if (selectedService === 'all' || selectedService === 'risk') {
      const riskAssessment = {
        riskScore: Math.random() * 10,
        factors: ['Market volatility', 'Sector concentration', 'Liquidity']
      };

      // Update with risk assessment
      setSystemState(prevState => ({
        ...prevState,
        riskAssessment,
      }));

      // Add portfolio manager to active nodes if enabled
      if (processFlowConfig.showPortfolioManager) {
        activeNodes.push(NodeType.PORTFOLIO_MANAGER);
      }
    }

    // Manage portfolio if "all" or "portfolio" is selected
    if (selectedService === 'all' || selectedService === 'portfolio') {
      const portfolioResult = await ApiService.managePortfolio({
        ...systemState,
        signals: systemState.signals,
      });

      // Format decision from portfolio management
      // Take the first decision from the response as an example
      const decisionsObj = portfolioResult.decision;
      const firstTicker = Object.keys(decisionsObj)[0];
      const firstDecision = decisionsObj[firstTicker];

      if (firstDecision && processFlowConfig.showDecision) {
        const decision: Decision = {
          ticker: firstTicker,
          action: firstDecision.action.toUpperCase() as ActionType,
          quantity: firstDecision.quantity,
          confidence: firstDecision.confidence,
        };

        // Add to performance history
        const newPerformancePoint = {
          timestamp: Date.now(),
          value: Math.random() * 10 + 95, // Example performance value
        };

        // Update system state with decision and performance
        setSystemState(prevState => ({
          ...prevState,
          decision,
          performance: [...prevState.performance, newPerformancePoint].slice(-20),
        }));
      }
    }

    // Update the active nodes
    setSystemState(prevState => ({
      ...prevState,
      activeNodes,
    }));
  };

  const handleAddTicker = (e: React.FormEvent) => {
    e.preventDefault();
    if (newTicker && !tickers.includes(newTicker)) {
      setTickers([...tickers, newTicker]);
      setNewTicker('');
    }
  };

  const handleRemoveTicker = (ticker: string) => {
    setTickers(tickers.filter(t => t !== ticker));
  };

  const handleRunAnalysis = async () => {
    try {
      setError(null);
      setIsLoading(true);
      await updateSystemState();
      setIsLoading(false);
    } catch (err) {
      setIsLoading(false);
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(`Error running analysis: ${errorMessage}`);
    }
  };

  // Toggle process flow configuration
  const toggleProcessFlowConfig = (key: keyof ProcessFlowConfig) => {
    setProcessFlowConfig(prevConfig => ({
      ...prevConfig,
      [key]: !prevConfig[key]
    }));
  };

  // New login handler
  const handleLogin = () => {
    // Mock login functionality
    if (isLoggedIn) {
      setIsLoggedIn(false);
      setAccountInfo({
        username: '',
        accountBalance: 0,
        portfolioValue: 0,
        lastLogin: '',
        subscriptionTier: 'Free'
      });
    } else {
      setIsLoggedIn(true);
      setAccountInfo({
        username: 'ivaaak',
        accountBalance: 125000.55,
        portfolioValue: 234567.89,
        lastLogin: new Date().toLocaleString(),
        subscriptionTier: 'Premium'
      });
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.controlPanel}>
        <div className={styles.tickerControls}>
          <h3>Ticker Management</h3>
          <form onSubmit={handleAddTicker} className={styles.tickerForm}>
            <input
              type="text"
              value={newTicker}
              onChange={(e) => setNewTicker(e.target.value.toUpperCase())}
              placeholder="Add ticker (e.g., AAPL)"
              className={styles.tickerInput}
            />
            <button type="submit" className={styles.addButton}>Add</button>
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
              <label>Start Date:</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className={styles.dateInput}
              />
            </div>
            <div>
              <label>End Date:</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className={styles.dateInput}
              />
            </div>
          </div>

          <div className={styles.serviceSelector}>
            <label>Service to Run:</label>
            <select
              value={selectedService}
              onChange={(e) => setSelectedService(e.target.value)}
              className={styles.serviceSelect}
            >
              <option value="all">All Services</option>
              <option value="fundamentals">Fundamentals Only</option>
              <option value="risk">Risk Management Only</option>
              <option value="portfolio">Portfolio Management Only</option>
            </select>
          </div>

          <div className={styles.runControls}>
            <button
              onClick={handleRunAnalysis}
              className={styles.runButton}
            >
              Run Analysis
            </button>

            <div className={styles.autoRefresh}>
              <input
                type="checkbox"
                id="autoRefresh"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
              />
              <label htmlFor="autoRefresh">Auto-refresh (1 min)</label>
            </div>
          </div>
        </div>

        {/* Process Flow Configuration Column */}
        <div className={styles.processFlowControls}>
          <h3>Process Flow Configuration</h3>
          <div className={styles.processFlowConfig}>
            <div className={styles.configOption}>
              <input
                type="checkbox"
                id="showAnalyst"
                checked={processFlowConfig.showAnalyst}
                onChange={() => toggleProcessFlowConfig('showAnalyst')}
                className={styles.configCheckbox}
              />
              <label htmlFor="showAnalyst">Show Analyst Node</label>
            </div>

            <div className={styles.configOption}>
              <input
                type="checkbox"
                id="showRiskManager"
                checked={processFlowConfig.showRiskManager}
                onChange={() => toggleProcessFlowConfig('showRiskManager')}
                className={styles.configCheckbox}
              />
              <label htmlFor="showRiskManager">Show Risk Manager Node</label>
            </div>

            <div className={styles.configOption}>
              <input
                type="checkbox"
                id="showPortfolioManager"
                checked={processFlowConfig.showPortfolioManager}
                onChange={() => toggleProcessFlowConfig('showPortfolioManager')}
                className={styles.configCheckbox}
              />
              <label htmlFor="showPortfolioManager">Show Portfolio Manager Node</label>
            </div>

            <div className={styles.configOption}>
              <input
                type="checkbox"
                id="showDecision"
                checked={processFlowConfig.showDecision}
                onChange={() => toggleProcessFlowConfig('showDecision')}
                className={styles.configCheckbox}
              />
              <label htmlFor="showDecision">Show Decision Node</label>
            </div>

            <div className={styles.configOption}>
              <input
                type="checkbox"
                id="animationsEnabled"
                checked={processFlowConfig.animationsEnabled}
                onChange={() => toggleProcessFlowConfig('animationsEnabled')}
                className={styles.configCheckbox}
              />
              <label htmlFor="animationsEnabled">Enable Flow Animations</label>
            </div>

            <div className={styles.configFooter}>
              <button
                onClick={() => setProcessFlowConfig({
                  showAnalyst: true,
                  showRiskManager: true,
                  showPortfolioManager: true,
                  showDecision: true,
                  animationsEnabled: true
                })}
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
                    <li>Select only relevant parts of the process flow</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Account Info Column */}
        <div className={styles.accountControls}>
          <div className={styles.accountHeader}>
            <h3>Account Information</h3>
            <button
              onClick={handleLogin}
              className={isLoggedIn ? styles.logoutButton : styles.loginButton}
            >
              {isLoggedIn ? 'Logout' : 'Login'}
            </button>
          </div>

          {isLoggedIn ? (
            <div className={styles.accountDetails}>
              <div className={styles.accountStat}>
                <span className={styles.statLabel}>Username:</span>
                <span className={styles.statValue}>{accountInfo.username}</span>
              </div>

              <div className={styles.accountStat}>
                <span className={styles.statLabel}>Balance:</span>
                <span className={styles.statValue}>${accountInfo.accountBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>

              <div className={styles.accountStat}>
                <span className={styles.statLabel}>Portfolio Value:</span>
                <span className={styles.statValue}>${accountInfo.portfolioValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>

              <div className={styles.accountStat}>
                <span className={styles.statLabel}>Last Login:</span>
                <span className={styles.statValue}>{accountInfo.lastLogin}</span>
              </div>

              <div className={styles.accountStat}>
                <span className={styles.statLabel}>Subscription:</span>
                <span className={`${styles.statValue} ${styles.subscriptionBadge} ${styles[accountInfo.subscriptionTier.toLowerCase()]}`}>
                  {accountInfo.subscriptionTier}
                </span>
              </div>
            </div>
          ) : (
            <div className={styles.loginPrompt}>
              <p>Login to access your account details and premium features</p>
              <ul className={styles.featuresList}>
                <li>Real-time portfolio tracking</li>
                <li>Advanced analytics</li>
                <li>AI-powered recommendations</li>
                <li>Transaction history</li>
              </ul>
            </div>
          )}
        </div>
      </div>

      {error && (
        <div className={styles.errorBanner}>
          {error} <button onClick={() => setError(null)}>Dismiss</button>
        </div>
      )}

      <ProcessFlow
        systemState={systemState}
        tickers={tickers}
        startDate={startDate}
        endDate={endDate}
        isLoading={isLoading}
        config={processFlowConfig}>
      </ProcessFlow>

      <div className={styles.performanceChart}>
        <h2>Portfolio Performance</h2>
        {systemState.performance.length > 0 ? (
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={systemState.performance}>
              <XAxis
                dataKey="timestamp"
                tickFormatter={(timestamp) => new Date(timestamp).toLocaleTimeString()}
              />
              <YAxis domain={['dataMin - 5', 'dataMax + 5']} />
              <Tooltip
                labelFormatter={(label) => new Date(label).toLocaleString()}
                formatter={(value: number) => value.toFixed(2)}
              />
              <Line
                type="monotone"
                dataKey="value"
                stroke="#8884d8"
                dot={false}
                isAnimationActive={processFlowConfig.animationsEnabled}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className={styles.noData}>No performance data available yet</div>
        )}
      </div>
    </div>
  );
};

export default App;