import React, { useState } from 'react';
import styles from './NodeTooltip.module.css';

interface TooltipProps {
  content: string;
  children: React.ReactNode;
}

const NodeTooltip: React.FC<TooltipProps> = ({ content, children }) => {
  const [isVisible, setIsVisible] = useState(false);
  
  return (
    <div 
      className={styles.tooltipContainer}
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
      onClick={() => setIsVisible(!isVisible)}
    >
      {children}
      {isVisible && (
        <div className={styles.tooltip}>
          <div className={styles.tooltipContent}>
            {content}
          </div>
          <div className={styles.tooltipArrow}></div>
        </div>
      )}
    </div>
  );
};

export default NodeTooltip;