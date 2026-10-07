import React, { useState, useRef, useEffect } from 'react';
import styles from './ProcessFlow.module.css';

interface NodeInfoProps {
  title: string;
  rows: Array<[label: string, value: string]>;
  // Open the tooltip below the button instead of above it
  bottom?: boolean;
}

// The "?" button of a node with its explanatory tooltip
const NodeInfo: React.FC<NodeInfoProps> = ({ title, rows, bottom = false }) => {
  const [showTooltip, setShowTooltip] = useState(false);
  const tooltipTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Cleanup tooltip timeout on unmount
  useEffect(() => {
    return () => {
      if (tooltipTimeoutRef.current) {
        clearTimeout(tooltipTimeoutRef.current);
      }
    };
  }, []);

  return (
    <button
      className={styles.infoButton}
      aria-label={`${title} information`}
      onClick={(e) => {
        e.stopPropagation();
        setShowTooltip(!showTooltip);
      }}
      onMouseEnter={() => {
        if (tooltipTimeoutRef.current) {
          clearTimeout(tooltipTimeoutRef.current);
        }
        setShowTooltip(true);
      }}
      onMouseLeave={() => {
        tooltipTimeoutRef.current = setTimeout(() => {
          setShowTooltip(false);
        }, 300);
      }}
    >
      ?
      <div className={`${styles.nodeTooltip} ${bottom ? styles.tooltipBottom : ''} ${showTooltip ? styles.visible : ''}`}>
        <div className={styles.tooltipTitle}>{title}</div>
        {rows.map(([label, value]) => (
          <div key={label} className={styles.tooltipRow}>
            <span className={styles.tooltipLabel}>{label}:</span>
            <span>{value}</span>
          </div>
        ))}
      </div>
    </button>
  );
};

export default NodeInfo;
