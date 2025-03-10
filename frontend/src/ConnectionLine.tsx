import React from 'react';
import styles from './ProcessFlow.module.css';

interface ConnectionLineProps {
  sourceId: string;
  targetId: string;
  type: 'analyst' | 'risk' | 'portfolio' | 'action';
  isActive: boolean;
}

const ConnectionLine: React.FC<ConnectionLineProps> = ({ 
  sourceId, 
  targetId, 
  type,
  isActive 
}) => {
  const [lineStyle, setLineStyle] = React.useState({
    width: '0px',
    left: '0px',
    top: '0px',
    transform: 'rotate(0deg)',
    opacity: 0
  });

  React.useEffect(() => {
    const calculatePosition = () => {
      const sourceElement = document.getElementById(sourceId);
      const targetElement = document.getElementById(targetId);

      if (!sourceElement || !targetElement) return;

      const sourceRect = sourceElement.getBoundingClientRect();
      const targetRect = targetElement.getBoundingClientRect();
      
      // Calculate the parent container's position for correct offsets
      const parentContainer = sourceElement.closest(`.${styles.processFlow}`);
      const parentRect = parentContainer ? parentContainer.getBoundingClientRect() : { left: 0, top: 0 };

      // Calculate start and end points (relative to process flow container)
      const startX = sourceRect.right - parentRect.left;
      const startY = sourceRect.top - parentRect.top + sourceRect.height / 2;
      const endX = targetRect.left - parentRect.left;
      const endY = targetRect.top - parentRect.top + targetRect.height / 2;

      // Calculate line dimensions and angle
      const dx = endX - startX;
      const dy = endY - startY;
      const length = Math.sqrt(dx * dx + dy * dy);
      const angle = Math.atan2(dy, dx) * (180 / Math.PI);

      setLineStyle({
        width: `${length}px`,
        left: `${startX}px`,
        top: `${startY}px`,
        transform: `rotate(${angle}deg)`,
        opacity: isActive ? 1 : 0.3
      });
    };

    // Calculate position initially and on window resize
    calculatePosition();
    window.addEventListener('resize', calculatePosition);

    // Set up a periodic recalculation for any DOM changes
    const interval = setInterval(calculatePosition, 1000);

    return () => {
      window.removeEventListener('resize', calculatePosition);
      clearInterval(interval);
    };
  }, [sourceId, targetId, isActive]);

  return (
    <div 
      className={`${styles.connection} ${styles[`connection-${type}`]}`}
      style={lineStyle}
    >
      {isActive && <div className={styles.connectionAnimation} />}
    </div>
  );
};

export default ConnectionLine;