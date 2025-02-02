// AIHedgeFund.tsx
import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip } from 'recharts';
import styles from './AIHedgeFund.module.css';
import { MockDataGenerator } from './mockDataGenerator';
import {
  AnalystType,
  ActionType,
  NodeType,
  SystemState,
  Signal,
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

const AIHedgeFund: React.FC = () => {
  const [systemState, setSystemState] = useState<SystemState>({
    activeNodes: [],
    signals: {},
    performance: []
  });

  useEffect(() => {
    // Initialize mock data generator
    const mockGenerator = new MockDataGenerator();

    // Set initial state
    setSystemState(prevState => ({
      ...prevState,
      ...mockGenerator.generateSystemState()
    }));

    // Update state periodically
    const interval = setInterval(() => {
      setSystemState(prevState => {
        const update = mockGenerator.generateStateUpdate();
        
        // Update performance history
        const newPerformance = update.performance 
          ? [...prevState.performance, ...update.performance].slice(-20)
          : prevState.performance;

        return {
          ...prevState,
          ...update,
          performance: newPerformance
        };
      });
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>AI Hedge Fund Process Flow</h1>
      
      <div className={styles.processFlow}>
        <div className={`${styles.node} ${styles.start}`}>
          <span>Start</span>
        </div>

        <div className={styles.analystsRow}>
          {Object.values(AnalystType).map(type => (
            <AnalystNode
              key={type}
              type={type}
              signal={systemState.signals[type]}
              isActive={systemState.activeNodes.includes(NodeType.ANALYST)}
            />
          ))}
        </div>

        <div className={`${styles.node} ${styles.riskManager} ${
          systemState.activeNodes.includes(NodeType.RISK_MANAGER) ? styles.active : ''
        }`}>
          <h3>Risk Manager</h3>
          {systemState.riskAssessment && (
            <div className={styles.signal}>
              <div>Risk Score: {systemState.riskAssessment.riskScore.toFixed(1)}</div>
              <div className={styles.factors}>
                Top Factor: {systemState.riskAssessment.factors[0]}
              </div>
            </div>
          )}
        </div>

        <div className={`${styles.node} ${styles.portfolioManager} ${
          systemState.activeNodes.includes(NodeType.PORTFOLIO_MANAGER) ? styles.active : ''
        }`}>
          <h3>Portfolio Manager</h3>
          {systemState.decision && (
            <div className={styles.decision}>
              <div>Action: {systemState.decision.action}</div>
              <div>Confidence: {systemState.decision.confidence.toFixed(1)}%</div>
            </div>
          )}
        </div>

        <div className={styles.actionsRow}>
          {Object.values(ActionType).map(type => (
            <ActionNode
              key={type}
              type={type}
              isActive={systemState.decision?.action === type}
            />
          ))}
        </div>
      </div>

      <div className={styles.performanceChart}>
        <h2>Portfolio Performance</h2>
        <LineChart width={800} height={200} data={systemState.performance}>
          <XAxis 
            dataKey="timestamp" 
            tickFormatter={(timestamp) => new Date(timestamp).toLocaleTimeString()}
          />
          <YAxis />
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
      </div>
    </div>
  );
};

export default AIHedgeFund;