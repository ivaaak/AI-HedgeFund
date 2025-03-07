import React from 'react';
import styles from './Dark.module.css';
import NodeTooltip from './NodeTooltip';

interface RiskManagerNodeProps {
  isActive: boolean;
  riskAssessment?: {
    riskScore: number;
    factors: string[];
  };
}

const RiskManagerNode: React.FC<RiskManagerNodeProps> = ({ isActive, riskAssessment }) => {
  const tooltipContent = `
    Function: Risk Analysis and Management
    Endpoint: /api/risk/assess
    Input: Analyst signals, market conditions, portfolio state
    Output: Risk score and risk factors
    Description: Evaluates potential downside risk and sets position size limits
  `;

  return (
    <NodeTooltip content={tooltipContent}>
      <div className={`${styles.node} ${styles.riskManager} ${isActive ? styles.active : ''}`}>
        <h3>Risk Manager</h3>
        {riskAssessment ? (
          <div className={styles.signal}>
            <div>Risk Score: {riskAssessment.riskScore.toFixed(1)}</div>
            <div className={styles.factors}>
              <div>Risk Factors:</div>
              <ul>
                {riskAssessment.factors.map((factor, index) => (
                  <li key={index}>{factor}</li>
                ))}
              </ul>
            </div>
          </div>
        ) : (
          <div className={styles.placeholder}>No risk assessment data</div>
        )}
      </div>
    </NodeTooltip>
  );
};

export default RiskManagerNode;