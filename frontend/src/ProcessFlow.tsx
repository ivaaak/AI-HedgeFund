import React from 'react';
import styles from './ProcessFlow.module.css';
import {
  NodeType,
  AnalystType,
  ActionType,
  SystemState,
  ProcessFlowConfig
} from './types';
import DataCollectionNode from './DataCollectionNode';
import AnalystNode from './AnalystNode';
import RiskManagerNode from './RiskManagerNode';
import PortfolioManagerNode from './PortfolioManagerNode';
import ActionNode from './ActionNode';

interface ProcessFlowProps {
  systemState: SystemState;
  tickers: string[];
  startDate: string;
  endDate: string;
  isLoading: boolean;
  config: ProcessFlowConfig;
  onNodeClick?: (nodeType: NodeType) => void;
}

const ProcessFlow: React.FC<ProcessFlowProps> = ({
  systemState,
  tickers,
  startDate,
  endDate,
  isLoading,
  config,
  onNodeClick
}) => {
  return (
    <div className={styles.processFlowContainer}>
      <div className={styles.processFlow}>
        {/* Data Collection section - always visible */}
        <div className={styles.processSection}>
          <div className={styles.sectionTitle}>
            <h2>Data Collection</h2>
          </div>
          <div className={styles.sectionContent}>
            <DataCollectionNode
              isActive={systemState.activeNodes.includes(NodeType.ANALYST)}
              tickers={tickers}
              startDate={startDate}
              endDate={endDate}
              isLoading={isLoading}
            />
          </div>
        </div>
        
        {/* Analysis section */}
        {config.showAnalyst && (
          <>
            <div className={styles.processSection}>
              <div className={styles.sectionTitle}>
                <h2>Analysis</h2>
              </div>
              <div className={styles.sectionContent}>
                <div className={styles.analystsGrid}>
                  {Object.values(AnalystType).map(type => (
                    <AnalystNode
                      key={type}
                      type={type as any}
                      signal={systemState.signals[type]}
                      isActive={systemState.activeNodes.includes(NodeType.ANALYST)}
                    />
                  ))}
                </div>
              </div>
            </div>
          </>
        )}
        
        {/* Risk Management section */}
        {config.showRiskManager && (
          <>
            <div className={styles.processSection}>
              <div className={styles.sectionTitle}>
                <h2>Risk Management</h2>
              </div>
              <div className={styles.sectionContent}>
                <RiskManagerNode
                  isActive={systemState.activeNodes.includes(NodeType.RISK_MANAGER)}
                  riskAssessment={systemState.riskAssessment}
                />
              </div>
            </div>
          </>
        )}
        
        {/* Portfolio Management section */}
        {config.showPortfolioManager && (
          <>
            <div className={styles.processSection}>
              <div className={styles.sectionTitle}>
                <h2>Portfolio Management</h2>
              </div>
              <div className={styles.sectionContent}>
                <PortfolioManagerNode
                  isActive={systemState.activeNodes.includes(NodeType.PORTFOLIO_MANAGER)}
                  decision={systemState.decision}
                />
              </div>
            </div>
          </>
        )}
        
        {/* Action section */}
        {config.showDecision && (
          <>
            <div className={styles.processSection}>
              <div className={styles.sectionTitle}>
                <h2>Action</h2>
              </div>
              <div className={styles.sectionContent}>
                <div className={styles.actionsGrid}>
                  {Object.values(ActionType).map(type => (
                    <ActionNode
                      key={type}
                      type={type}
                      isActive={systemState.decision?.action === type}
                      quantity={systemState?.decision?.quantity}
                    />
                  ))}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default ProcessFlow;