type Point = [number, number] | { x: number; y: number };

function toTuple(p: Point | undefined): [number, number] {
  if (!p) return [0, 0];
  if (Array.isArray(p)) return p;
  return [p.x ?? 0, p.y ?? 0];
}

const GIBBERISH_RE = /@\w+@\w+/;
const REPEATED_FRAG_RE = /(.{3,})\1{2,}/;

function sanitizeLabel(raw: string | undefined): string | null {
  if (!raw) return null;
  let label = raw.replace(/@\w+/g, '').trim();
  label = label.replace(/\s{2,}/g, ' ');
  if (GIBBERISH_RE.test(raw) || REPEATED_FRAG_RE.test(raw)) return null;
  if (label.length === 0) return null;
  if (label.length > 80) label = label.slice(0, 77) + '…';
  return label;
}

interface DiagramElement {
  type: 'arrow' | 'circle' | 'rect' | 'text';
  from?: Point;
  to?: Point;
  center?: Point;
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
        const label = sanitizeLabel(el.label);
        switch (el.type) {
          case 'arrow': {
            const [x1, y1] = toTuple(el.from);
            const [x2, y2] = toTuple(el.to);
            return (
              <g key={i}>
                <defs>
                  <marker id={`arrow-${i}`} markerWidth="10" markerHeight="7" refX="10" refY="3.5" orient="auto">
                    <polygon points="0 0, 10 3.5, 0 7" fill={color} />
                  </marker>
                </defs>
                <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={color} strokeWidth="2" markerEnd={`url(#arrow-${i})`} />
                {label && (
                  <text x={(x1 + x2) / 2} y={(y1 + y2) / 2 - 8} textAnchor="middle" fontSize="12" fill={color}>
                    {label}
                  </text>
                )}
              </g>
            );
          }
          case 'circle': {
            const [cx, cy] = toTuple(el.center);
            return (
              <g key={i}>
                <circle cx={cx} cy={cy} r={el.radius || 20} fill="none" stroke={color} strokeWidth="2" />
                {label && (
                  <text x={cx} y={cy} textAnchor="middle" dominantBaseline="middle" fontSize="11" fill={color}>
                    {label}
                  </text>
                )}
              </g>
            );
          }
          case 'rect': {
            const [rx, ry] = toTuple(el.center);
            return (
              <g key={i}>
                <rect
                  x={rx - (el.width || 40) / 2}
                  y={ry - (el.height || 30) / 2}
                  width={el.width || 40}
                  height={el.height || 30}
                  fill="none" stroke={color} strokeWidth="2" rx="4"
                />
                {label && (
                  <text x={rx} y={ry} textAnchor="middle" dominantBaseline="middle" fontSize="11" fill={color}>
                    {label}
                  </text>
                )}
              </g>
            );
          }
          case 'text': {
            const [tx, ty] = toTuple(el.center);
            return label ? (
              <text key={i} x={tx} y={ty} textAnchor="middle" fontSize="12" fill={color}>
                {label}
              </text>
            ) : null;
          }
          default:
            return null;
        }
      })}
    </svg>
  );
}
