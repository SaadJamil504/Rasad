import React, { useEffect, useState, useMemo } from 'react';
import './MapAnimation.css';

const MapAnimation = ({ deliveries }) => {
  const [visiblePoints, setVisiblePoints] = useState(0);
  const [animating, setAnimating] = useState(false);

  // Filter deliveries with names and unique IDs
  const validDeliveries = useMemo(() => {
    return deliveries.map((d, index) => ({
      ...d,
      displayName: d.customer_name || d.customer_username || `Customer ${index + 1}`
    }));
  }, [deliveries]);

  // Layout points from Left to Right
  const points = useMemo(() => {
    if (validDeliveries.length === 0) return [];

    const totalPoints = validDeliveries.length;
    const padding = 60;
    const width = 450;
    const height = 200;

    return validDeliveries.map((d, i) => {
      const x = padding + (i / (totalPoints - 1 || 1)) * (width - 2 * padding);
      const jitter = (Math.sin(i * 1.5) * 50); 
      const y = (height / 2) + jitter;

      return {
        x,
        y,
        name: d.displayName,
        id: d.id,
        isDelivered: d.is_delivered,
        status: d.status
      };
    });
  }, [validDeliveries]);

  // Generate very "funky" (wavy/squiggly) paths between points
  const paths = useMemo(() => {
    const p = [];
    for (let i = 0; i < points.length - 1; i++) {
      const start = points[i];
      const end = points[i + 1];
      
      const dx = end.x - start.x;
      const dy = end.y - start.y;
      
      // Use 3 segments for a squiggly line
      const mid1X = start.x + dx * 0.33;
      const mid1Y = start.y + dy * 0.33 + (Math.sin(i * 10) * 40);
      
      const mid2X = start.x + dx * 0.66;
      const mid2Y = start.y + dy * 0.66 - (Math.cos(i * 10) * 40);

      p.push(`M ${start.x} ${start.y} Q ${mid1X} ${mid1Y}, ${(mid1X+mid2X)/2} ${(mid1Y+mid2Y)/2} T ${end.x} ${end.y}`);
    }
    return p;
  }, [points]);

  useEffect(() => {
    if (points.length > 0) {
      setAnimating(true);
      setVisiblePoints(0);
      let count = 0;
      const step = () => {
        count++;
        setVisiblePoints(count);
        if (count < points.length) {
          setTimeout(step, 800);
        } else {
          setAnimating(false);
        }
      };
      const timer = setTimeout(step, 500);
      return () => clearTimeout(timer);
    }
  }, [points]);

  if (points.length === 0) return null;

  return (
    <div className="map-animation-container funky-theme">
      <div className="map-header">
        <h4>🐮 Fresh Delivery Trail {animating && <span className="milky-loader"></span>}</h4>
      </div>
      <div className="svg-wrapper">
        <svg viewBox="0 0 450 250" className="map-svg-funky">
          <defs>
            <filter id="milk-glow">
              <feGaussianBlur in="SourceGraphic" stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            
            <linearGradient id="milk-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#ffffff" />
                <stop offset="50%" stopColor="#f0f9ff" />
                <stop offset="100%" stopColor="#ffffff" />
            </linearGradient>

            <marker id="milk-drop" markerWidth="10" markerHeight="10" refX="5" refY="5">
              <circle cx="5" cy="5" r="3" fill="white" />
            </marker>
          </defs>

          {/* Squiggly paths with Milky Glow */}
          {paths.map((path, i) => (
            <path
              key={i}
              d={path}
              className={`funky-trail ${i < visiblePoints - 1 ? 'visible' : ''}`}
              stroke="url(#milk-gradient)"
              strokeWidth="8"
              fill="none"
              strokeLinecap="round"
              filter="url(#milk-glow)"
              strokeDasharray="15, 20"
            />
          ))}

          {/* Points as Milk Splats / Bottles */}
          {points.map((p, i) => (
            <g key={i} className={`point-group ${i < visiblePoints ? 'visible' : ''}`}>
              {/* Milk Splat Shadow */}
              <ellipse cx={p.x} cy={p.y + 10} rx="15" ry="5" fill="rgba(0,0,0,0.05)" />
              
              {/* Milk Bottle Icon */}
              <g transform={`translate(${p.x - 15}, ${p.y - 15}) scale(0.6)`}>
                 {/* Better Milk Bottle */}
                 <rect x="10" y="5" width="30" height="40" rx="5" fill="white" stroke="#3b82f6" strokeWidth="2" />
                 <path d="M 10 15 L 40 15" stroke="#3b82f6" strokeWidth="2" fill="none" />
                 <rect x="15" y="0" width="20" height="10" rx="2" fill="#fff" stroke="#3b82f6" strokeWidth="2" />
                 {/* Milk Level */}
                 <rect x="12" y="17" width="26" height="26" rx="3" fill="#f0f9ff" />
                 {p.isDelivered && (
                   <path d="M 15 25 L 22 32 L 35 20" stroke="#22c55e" strokeWidth="4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                 )}
              </g>

              {/* Label */}
              <g className="label-container">
                <rect x={p.x - 40} y={p.y - 45} width="80" height="20" rx="10" fill="white" className="label-bg" />
                <text x={p.x} y={p.y - 31} textAnchor="middle" className="label-text">
                  {p.name.split(' ')[0]}
                </text>
              </g>

              {/* Status Indicator */}
              {i === 0 && <text x={p.x} y={p.y + 35} className="p-tag start">START</text>}
              {i === points.length - 1 && i < visiblePoints && <text x={p.x} y={p.y + 35} className="p-tag end">FINISH</text>}
            </g>
          ))}
        </svg>
      </div>
    </div>
  );
};

export default MapAnimation;
