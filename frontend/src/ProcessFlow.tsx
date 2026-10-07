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
import ConnectionLine from './ConnectionLine';

interface ProcessFlowProps {
  systemState: SystemState;
  tickers: string[];
  startDate: string;
  endDate: string;
  isLoading: boolean;
  config: ProcessFlowConfig;
}

// Node IDs for connections
const NODE_IDS = {
  DATA_COLLECTION: 'data-collection-node',
  RISK_MANAGER: 'risk-manager-node',
  PORTFOLIO_MANAGER: 'portfolio-manager-node'
};

const analystNodeId = (type: AnalystType) => `analyst-node-${type}`;
const actionNodeId = (type: ActionType) => `action-node-${type.toLowerCase()}`;

const ProcessFlow: React.FC<ProcessFlowProps> = ({
  systemState,
  tickers,
  startDate,
  endDate,
  isLoading,
  config
}) => {
  // Helper to determine if a node is active
  const isNodeActive = (nodeType: NodeType): boolean => {
    return systemState.activeNodes.includes(nodeType);
  };

  const analystTypes = Object.values(AnalystType);
  const actionTypes = Object.values(ActionType);

  const decisionsFor = (type: ActionType) =>
    Object.entries(systemState.decision?.decisions || {})
      .filter(([, decision]) => decision.action.toUpperCase() === type);

  return (
    <div className={styles.processFlowContainer}>
      <div className={`${styles.processFlow} ${config.animationsEnabled ? '' : styles.noAnimations}`}>
        {/* Data Collection section - always visible */}
        <div className={styles.processSection}>
          <div className={styles.sectionTitle}>
            <h2>Data Collection</h2>
          </div>
          <div className={styles.sectionContent}>
            <DataCollectionNode
              id={NODE_IDS.DATA_COLLECTION}
              isActive={isNodeActive(NodeType.DATA_COLLECTION)}
              tickers={tickers}
              startDate={startDate}
              endDate={endDate}
              isLoading={isLoading}
            />
          </div>
        </div>

        {/* Analysis section */}
        {config.showAnalyst && (
          <div className={styles.processSection}>
            <div className={styles.sectionTitle}>
              <h2>Analysis</h2>
            </div>
            <div className={styles.sectionContent}>
              <div className={styles.analystsGrid}>
                {analystTypes.map(type => (
                  <AnalystNode
                    key={type}
                    id={analystNodeId(type)}
                    type={type}
                    analysis={systemState.signals[type]}
                    isActive={isNodeActive(NodeType.ANALYST) && Boolean(systemState.signals[type])}
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Risk Management section */}
        {config.showRiskManager && (
          <div className={styles.processSection}>
            <div className={styles.sectionTitle}>
              <h2>Risk Management</h2>
            </div>
            <div className={styles.sectionContent}>
              <RiskManagerNode
                id={NODE_IDS.RISK_MANAGER}
                isActive={isNodeActive(NodeType.RISK_MANAGER)}
                riskAssessment={systemState.riskAssessment}
              />
            </div>
          </div>
        )}

        {/* Portfolio Management section */}
        {config.showPortfolioManager && (
          <div className={styles.processSection}>
            <div className={styles.sectionTitle}>
              <h2>Portfolio Management</h2>
            </div>
            <div className={styles.sectionContent}>
              <PortfolioManagerNode
                id={NODE_IDS.PORTFOLIO_MANAGER}
                isActive={isNodeActive(NodeType.PORTFOLIO_MANAGER)}
                decision={systemState.decision}
                portfolio={systemState.portfolio}
              />
            </div>
          </div>
        )}

        {/* Action section */}
        {config.showDecision && (
          <div className={styles.processSection}>
            <div className={styles.sectionTitle}>
              <h2>Action</h2>
            </div>
            <div className={styles.sectionContent}>
              <div className={styles.actionsGrid}>
                {actionTypes.map(type => (
                  <ActionNode
                    key={type}
                    id={actionNodeId(type)}
                    type={type}
                    decisions={isNodeActive(NodeType.ACTION) ? decisionsFor(type) : []}
                    history={systemState.portfolio.history.filter(trade => trade.action.toUpperCase() === type)}
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Connection Lines */}
        {/* Data Collection to Analysts */}
        {config.showAnalyst && analystTypes.map(type => (
          <ConnectionLine
            key={`data-${type}`}
            sourceId={NODE_IDS.DATA_COLLECTION}
            targetId={analystNodeId(type)}
            type="analyst"
            isActive={isNodeActive(NodeType.DATA_COLLECTION) && isNodeActive(NodeType.ANALYST) && Boolean(systemState.signals[type])}
          />
        ))}

        {/* Analysts to Risk Manager */}
        {config.showAnalyst && config.showRiskManager && analystTypes.map(type => (
          <ConnectionLine
            key={`risk-${type}`}
            sourceId={analystNodeId(type)}
            targetId={NODE_IDS.RISK_MANAGER}
            type="risk"
            isActive={isNodeActive(NodeType.ANALYST) && isNodeActive(NodeType.RISK_MANAGER) && Boolean(systemState.signals[type])}
          />
        ))}

        {/* Risk Manager to Portfolio Manager */}
        {config.showRiskManager && config.showPortfolioManager && (
          <ConnectionLine
            sourceId={NODE_IDS.RISK_MANAGER}
            targetId={NODE_IDS.PORTFOLIO_MANAGER}
            type="portfolio"
            isActive={isNodeActive(NodeType.RISK_MANAGER) && isNodeActive(NodeType.PORTFOLIO_MANAGER)}
          />
        )}

        {/* Portfolio Manager to Actions */}
        {config.showPortfolioManager && config.showDecision && actionTypes.map(type => (
          <ConnectionLine
            key={`action-${type}`}
            sourceId={NODE_IDS.PORTFOLIO_MANAGER}
            targetId={actionNodeId(type)}
            type="action"
            isActive={isNodeActive(NodeType.ACTION) && decisionsFor(type).length > 0}
          />
        ))}
      </div>
    </div>
  );
};

export default ProcessFlow;
