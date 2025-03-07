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
import AnalystNode from './AnalystNode';
import ActionNode from './ActionNode';
import DataCollectionNode from './DataCollectionNode';
import RiskManagerNode from './RiskManagerNode';
import PortfolioManagerNode from './PortfolioManagerNode';

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
        <div className={styles.processSection}>
          <div className={styles.sectionTitle}>Data Collection</div>
          <div className={styles.sectionContainer}>
            <DataCollectionNode
              isActive={systemState.activeNodes.includes(NodeType.ANALYST)}
              tickers={tickers}
              startDate={startDate}
              endDate={endDate}
              isLoading={isLoading}
            />
          </div>
        </div>
        
        <div className={styles.processConnection}>
          <div className={styles.dataFlow}></div>
        </div>
        
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
        
        <div className={styles.processConnection}>
          <div className={styles.dataFlow}></div>
        </div>
        
        <div className={styles.processSection}>
          <div className={styles.sectionTitle}>Risk Management</div>
          <div className={styles.sectionContainer}>
            <RiskManagerNode
              isActive={systemState.activeNodes.includes(NodeType.RISK_MANAGER)}
              riskAssessment={systemState.riskAssessment}
            />
          </div>
        </div>
        
        <div className={styles.processConnection}>
          <div className={styles.dataFlow}></div>
        </div>
        
        <div className={styles.processSection}>
          <div className={styles.sectionTitle}>Portfolio Management</div>
          <div className={styles.sectionContainer}>
            <PortfolioManagerNode
              isActive={systemState.activeNodes.includes(NodeType.PORTFOLIO_MANAGER)}
              decision={systemState.decision}
            />
          </div>
        </div>
        
        <div className={styles.processConnection}>
          <div className={styles.dataFlow}></div>
        </div>
        
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