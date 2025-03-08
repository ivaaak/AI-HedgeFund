import React from 'react';
import styles from './ProcessFlow.module.css';

interface TooltipProps {
  content: string;
}

const NodeTooltip: React.FC<TooltipProps> = ({ content }) => {
  return (
    <div className={styles.tooltipContainer}>
      <div className={styles.tooltip}>
        <div className={styles.tooltipContent}>
          {content}
        </div>
        <div className={styles.tooltipArrow}></div>
      </div>
    </div>
  );
};

export default NodeTooltip;