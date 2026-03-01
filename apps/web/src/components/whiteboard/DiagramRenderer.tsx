interface DiagramElement {
  type: 'arrow' | 'circle' | 'rect' | 'text';
  from?: [number, number];
  to?: [number, number];
  center?: [number, number];
  radius?: number;
  width?: number;
  height?: number;
  label?: string;
  color?: string;
}

interface DiagramRendererProps {
  elements: DiagramElement[];
  width?: number;
  height?: number;
}

export function DiagramRenderer({ elements, width = 400, height = 300 }: DiagramRendererProps) {
  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="w-full max-h-64 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700"
    >
      {elements.map((el, i) => {
        const color = el.color || '#3b82f6';
        switch (el.type) {
          case 'arrow': {
            const [x1, y1] = el.from || [0, 0];
            const [x2, y2] = el.to || [0, 0];
            return (
              <g key={i}>
                <defs>
                  <marker id={`arrow-${i}`} markerWidth="10" markerHeight="7" refX="10" refY="3.5" orient="auto">
                    <polygon points="0 0, 10 3.5, 0 7" fill={color} />
                  </marker>
                </defs>
                <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={color} strokeWidth="2" markerEnd={`url(#arrow-${i})`} />
                {el.label && (
                  <text x={(x1 + x2) / 2} y={(y1 + y2) / 2 - 8} textAnchor="middle" fontSize="12" fill={color}>
                    {el.label}
                  </text>
                )}
              </g>
            );
          }
          case 'circle':
            return (
              <g key={i}>
                <circle cx={el.center?.[0]} cy={el.center?.[1]} r={el.radius || 20} fill="none" stroke={color} strokeWidth="2" />
                {el.label && (
                  <text x={el.center?.[0]} y={el.center?.[1]} textAnchor="middle" dominantBaseline="middle" fontSize="11" fill={color}>
                    {el.label}
                  </text>
                )}
              </g>
            );
          case 'rect':
            return (
              <g key={i}>
                <rect
                  x={(el.center?.[0] || 0) - (el.width || 40) / 2}
                  y={(el.center?.[1] || 0) - (el.height || 30) / 2}
                  width={el.width || 40}
                  height={el.height || 30}
                  fill="none" stroke={color} strokeWidth="2" rx="4"
                />
                {el.label && (
                  <text x={el.center?.[0]} y={el.center?.[1]} textAnchor="middle" dominantBaseline="middle" fontSize="11" fill={color}>
                    {el.label}
                  </text>
                )}
              </g>
            );
          case 'text':
            return (
              <text key={i} x={el.center?.[0]} y={el.center?.[1]} textAnchor="middle" fontSize="12" fill={color}>
                {el.label}
              </text>
            );
          default:
            return null;
        }
      })}
    </svg>
  );
}
