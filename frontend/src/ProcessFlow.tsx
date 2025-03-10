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
  onNodeClick?: (nodeType: NodeType) => void;
}

// Node IDs for connections
const NODE_IDS = {
  DATA_COLLECTION: 'data-collection-node',
  ANALYST_FUNDAMENTAL: 'analyst-node-fundamental',
  ANALYST_TECHNICAL: 'analyst-node-technical',
  ANALYST_SENTIMENT: 'analyst-node-sentiment',
  ANALYST_MACRO: 'analyst-node-macro',
  RISK_MANAGER: 'risk-manager-node',
  PORTFOLIO_MANAGER: 'portfolio-manager-node',
  ACTION_BUY: 'action-node-buy',
  ACTION_SELL: 'action-node-sell',
  ACTION_HOLD: 'action-node-hold'
};

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
          <>
            <div className={styles.processSection}>
              <div className={styles.sectionTitle}>
                <h2>Analysis</h2>
              </div>
              <div className={styles.sectionContent}>
                <div className={styles.analystsGrid}>
                  {Object.values(AnalystType).map((type) => (
                    <AnalystNode
                      key={type}
                      id={`analyst-node-${type.toLowerCase()}`}
                      type={type as any}
                      signal={systemState.signals[type]}
                      isActive={isNodeActive(NodeType.ANALYST)}
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
                  id={NODE_IDS.RISK_MANAGER}
                  isActive={isNodeActive(NodeType.RISK_MANAGER)}
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
                  id={NODE_IDS.PORTFOLIO_MANAGER}
                  isActive={isNodeActive(NodeType.PORTFOLIO_MANAGER)}
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
                      id={`action-node-${type.toLowerCase()}`}
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

        {/* Connection Lines */}
        {/* Data Collection to Analysts */}
        {config.showAnalyst && (
          <>
            <ConnectionLine 
              sourceId={NODE_IDS.DATA_COLLECTION} 
              targetId={NODE_IDS.ANALYST_FUNDAMENTAL}
              type="analyst"
              isActive={isNodeActive(NodeType.DATA_COLLECTION) && isNodeActive(NodeType.ANALYST)}
            />
            <ConnectionLine 
              sourceId={NODE_IDS.DATA_COLLECTION} 
              targetId={NODE_IDS.ANALYST_TECHNICAL}
              type="analyst"
              isActive={isNodeActive(NodeType.DATA_COLLECTION) && isNodeActive(NodeType.ANALYST)}
            />
            {/* Adding connections to other analyst types too */}
            <ConnectionLine 
              sourceId={NODE_IDS.DATA_COLLECTION} 
              targetId={NODE_IDS.ANALYST_SENTIMENT}
              type="analyst"
              isActive={isNodeActive(NodeType.DATA_COLLECTION) && isNodeActive(NodeType.ANALYST)}
            />
            <ConnectionLine 
              sourceId={NODE_IDS.DATA_COLLECTION} 
              targetId={NODE_IDS.ANALYST_MACRO}
              type="analyst"
              isActive={isNodeActive(NodeType.DATA_COLLECTION) && isNodeActive(NodeType.ANALYST)}
            />
          </>
        )}

        {/* Analysts to Risk Manager */}
        {config.showAnalyst && config.showRiskManager && (
          <>
            <ConnectionLine 
              sourceId={NODE_IDS.ANALYST_FUNDAMENTAL} 
              targetId={NODE_IDS.RISK_MANAGER}
              type="risk"
              isActive={isNodeActive(NodeType.ANALYST) && isNodeActive(NodeType.RISK_MANAGER)}
            />
            <ConnectionLine 
              sourceId={NODE_IDS.ANALYST_TECHNICAL} 
              targetId={NODE_IDS.RISK_MANAGER}
              type="risk"
              isActive={isNodeActive(NodeType.ANALYST) && isNodeActive(NodeType.RISK_MANAGER)}
            />
            <ConnectionLine 
              sourceId={NODE_IDS.ANALYST_SENTIMENT} 
              targetId={NODE_IDS.RISK_MANAGER}
              type="risk"
              isActive={isNodeActive(NodeType.ANALYST) && isNodeActive(NodeType.RISK_MANAGER)}
            />
            <ConnectionLine 
              sourceId={NODE_IDS.ANALYST_MACRO} 
              targetId={NODE_IDS.RISK_MANAGER}
              type="risk"
              isActive={isNodeActive(NodeType.ANALYST) && isNodeActive(NodeType.RISK_MANAGER)}
            />
          </>
        )}

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
        {config.showPortfolioManager && config.showDecision && (
          <>
            <ConnectionLine 
              sourceId={NODE_IDS.PORTFOLIO_MANAGER} 
              targetId={NODE_IDS.ACTION_BUY}
              type="action"
              isActive={isNodeActive(NodeType.PORTFOLIO_MANAGER) && systemState.decision?.action === ActionType.BUY}
            />
            <ConnectionLine 
              sourceId={NODE_IDS.PORTFOLIO_MANAGER} 
              targetId={NODE_IDS.ACTION_SELL}
              type="action"
              isActive={isNodeActive(NodeType.PORTFOLIO_MANAGER) && systemState.decision?.action === ActionType.SELL}
            />
            <ConnectionLine 
              sourceId={NODE_IDS.PORTFOLIO_MANAGER} 
              targetId={NODE_IDS.ACTION_HOLD}
              type="action"
              isActive={isNodeActive(NodeType.PORTFOLIO_MANAGER) && systemState.decision?.action === ActionType.HOLD}
            />
          </>
        )}
      </div>
    </div>
  );
};

export default ProcessFlow;