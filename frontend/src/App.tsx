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
} from './types';

interface AnalystNodeProps {
  type: AnalystType;
  signal?: Signal;
  isActive: boolean;
}

const AnalystNode: React.FC<AnalystNodeProps> = ({ type, signal, isActive }) => (
  <div className={`${styles.node} ${styles.analyst} ${isActive ? styles.active : ''}`}>
    <h3>{type.charAt(0).toUpperCase() + type.slice(1)} Analyst</h3>
    {signal && (
      <div className={styles.signal}>
        <div>Signal: {signal.value.toFixed(2)}</div>
        <div>Ticker: {signal.ticker}</div>
        <div>Confidence: {signal.confidence.toFixed(1)}%</div>
      </div>
    )}
  </div>
);

interface ActionNodeProps {
  type: ActionType;
  isActive: boolean;
}

const ActionNode: React.FC<ActionNodeProps> = ({ type, isActive }) => (
  <div className={`${styles.node} ${styles.action} ${styles[type.toLowerCase()]} ${isActive ? styles.active : ''}`}>
    {type}
  </div>
);

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
    // Set active nodes
    setSystemState(prevState => ({
      ...prevState,
      activeNodes: [NodeType.ANALYST],
    }));

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
        activeNodes: [...prevState.activeNodes, NodeType.RISK_MANAGER],
      }));
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
        activeNodes: [...prevState.activeNodes, NodeType.PORTFOLIO_MANAGER],
      }));
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

      if (firstDecision) {
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

  if (isLoading && !systemState.activeNodes.length) {
    return <div className={styles.loading}>Loading...</div>;
  }

  if (error && !systemState.activeNodes.length) {
    return <div className={styles.error}>Error: {error}</div>;
  }

  if (!isConnected) {
    return <div className={styles.error}>Cannot connect to API server. Please check if it's running.</div>;
  }

  return (
    <div className={styles.container}>
      {/* <h1 className={styles.title}>AI Hedge Fund System</h1> */}
      
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
      </div>
      
      {error && (
        <div className={styles.errorBanner}>
          {error} <button onClick={() => setError(null)}>Dismiss</button>
        </div>
      )}
      
      <div className={styles.processFlowHorizontal}>
        {/* <div className={styles.processSection}>
          <div className={`${styles.node} ${styles.start}`}>
            <span>Start</span>
          </div>
        </div> */}
        
        <div className={styles.processSection}>
          <div className={styles.sectionTitle}>Data Collection</div>
          <div className={styles.sectionContainer}>
            <div className={`${styles.node} ${styles.dataCollection} ${systemState.activeNodes.includes(NodeType.ANALYST) ? styles.active : ''}`}>
              <h3>Financial Data Service</h3>
              <div className={styles.serviceContent}>
                <div>Tickers: {tickers.join(', ')}</div>
                <div>Period: {startDate} to {endDate}</div>
                {isLoading && <div className={styles.miniLoading}>Loading data...</div>}
              </div>
            </div>
          </div>
        </div>
        
        <div className={styles.processArrow}>→</div>
        
        <div className={styles.processSection}>
          <div className={styles.sectionTitle}>Analysis</div>
          <div className={styles.sectionContainer}>
            <div className={styles.analystsGrid}>
              {Object.values(AnalystType).map(type => (
                <AnalystNode
                  key={type}
                  type={type}
                  signal={systemState.signals[type]}
                  isActive={systemState.activeNodes.includes(NodeType.ANALYST)}
                />
              ))}
            </div>
          </div>
        </div>
        
        <div className={styles.processArrow}>→</div>
        
        <div className={styles.processSection}>
          <div className={styles.sectionTitle}>Risk Management</div>
          <div className={styles.sectionContainer}>
            <div className={`${styles.node} ${styles.riskManager} ${
              systemState.activeNodes.includes(NodeType.RISK_MANAGER) ? styles.active : ''
            }`}>
              <h3>Risk Manager</h3>
              {systemState.riskAssessment ? (
                <div className={styles.signal}>
                  <div>Risk Score: {systemState.riskAssessment.riskScore.toFixed(1)}</div>
                  <div className={styles.factors}>
                    <div>Risk Factors:</div>
                    <ul>
                      {systemState.riskAssessment.factors.map((factor, index) => (
                        <li key={index}>{factor}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              ) : (
                <div className={styles.placeholder}>No risk assessment data</div>
              )}
            </div>
          </div>
        </div>
        
        <div className={styles.processArrow}>→</div>
        
        <div className={styles.processSection}>
          <div className={styles.sectionTitle}>Portfolio Management</div>
          <div className={styles.sectionContainer}>
            <div className={`${styles.node} ${styles.portfolioManager} ${
              systemState.activeNodes.includes(NodeType.PORTFOLIO_MANAGER) ? styles.active : ''
            }`}>
              <h3>Portfolio Manager</h3>
              {systemState.decision ? (
                <div className={styles.decision}>
                  <div>Action: {systemState.decision.action}</div>
                  <div>Ticker: {systemState.decision.ticker}</div>
                  <div>Quantity: {systemState.decision.quantity}</div>
                  <div>Confidence: {systemState.decision.confidence.toFixed(1)}%</div>
                </div>
              ) : (
                <div className={styles.placeholder}>No decision data</div>
              )}
            </div>
          </div>
        </div>
        
        <div className={styles.processArrow}>→</div>
        
        <div className={styles.processSection}>
          <div className={styles.sectionTitle}>Action</div>
          <div className={styles.sectionContainer}>
            <div className={styles.actionsGrid}>
              {Object.values(ActionType).map(type => (
                <ActionNode
                  key={type}
                  type={type}
                  isActive={systemState.decision?.action === type}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
      
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
                isAnimationActive={false}
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