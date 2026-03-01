import { useEffect, useMemo, useRef, useState } from 'react';
import { renderToString } from 'katex';
import * as autoRenderModule from 'katex/contrib/auto-render';
import 'katex/contrib/mhchem';

type Delimiter = {
  left: string;
  right: string;
  display: boolean;
};

type AutoRenderOptions = {
  delimiters: Delimiter[];
  macros?: Record<string, string>;
  throwOnError?: boolean;
  errorColor?: string;
  errorCallback?: (msg: string, err?: unknown) => void;
};

type RenderMathInElement = (element: HTMLElement, options?: AutoRenderOptions) => void;

const renderMath = (
  (autoRenderModule as unknown as { default?: RenderMathInElement }).default ??
  (autoRenderModule as unknown as { renderMathInElement?: RenderMathInElement }).renderMathInElement ??
  autoRenderModule
) as unknown as RenderMathInElement;

const MATH_MACROS: Record<string, string> = {
  '\\vec': '\\overrightarrow{#1}',
  '\\unit': '\\text{#1}',
  '\\degree': '^\\circ'
};

const MATH_DELIMITERS: Delimiter[] = [
  { left: '$$', right: '$$', display: true },
  { left: '$', right: '$', display: false },
  { left: '\\[', right: '\\]', display: true },
  { left: '\\(', right: '\\)', display: false }
];

const DEFAULT_ERROR_MESSAGE = 'Failed to render math.';

export interface MathRendererProps {
  content: string;
  className?: string;
}

export interface MathEquationProps {
  math: string;
  className?: string;
}

export function MathRenderer({ content, className }: MathRendererProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let cancelled = false;
    setError(null);
    container.textContent = content;

    const options: AutoRenderOptions = {
      delimiters: MATH_DELIMITERS,
      macros: MATH_MACROS,
      throwOnError: true,
      errorColor: '#dc2626',
      errorCallback: (msg, err) => {
        if (cancelled) return;
        const message = err instanceof Error ? err.message : msg;
        setError(message || DEFAULT_ERROR_MESSAGE);
      }
    };

    try {
      if (typeof renderMath === 'function') {
        renderMath(container, options);
      } else {
        container.innerHTML = renderMathFallback(content);
      }
      const katexErrorCount = container.querySelectorAll('.katex-error').length;
      const katexColorErrorCount = container.querySelectorAll(
        '.katex-mathml mstyle[mathcolor="#dc2626"]'
      ).length;
      if (katexErrorCount > 0 || katexColorErrorCount > 0) {
        setError((current) => current ?? DEFAULT_ERROR_MESSAGE);
      }
    } catch (err) {
      if (!cancelled) {
        const message = err instanceof Error ? err.message : DEFAULT_ERROR_MESSAGE;
        setError(message);
      }
    }

    return () => {
      cancelled = true;
    };
  }, [content]);

  return (
    <div className={className}>
      {error && <div className="text-red-600 text-sm mb-2">{error}</div>}
      <div ref={containerRef} />
    </div>
  );
}

export function InlineMath({ math, className }: MathEquationProps) {
  const result = useMemo(() => {
    try {
      return {
        html: renderToString(math, {
          displayMode: false,
          throwOnError: true,
          errorColor: '#dc2626',
          macros: MATH_MACROS
        }),
        error: null
      };
    } catch (err) {
      return {
        html: '',
        error: err instanceof Error ? err.message : DEFAULT_ERROR_MESSAGE
      };
    }
  }, [math]);

  if (result.error) {
    return <span className={`text-red-600 ${className || ''}`}>{result.error}</span>;
  }

  return <span className={className} dangerouslySetInnerHTML={{ __html: result.html }} />;
}

export function BlockMath({ math, className }: MathEquationProps) {
  const result = useMemo(() => {
    try {
      return {
        html: renderToString(math, {
          displayMode: true,
          throwOnError: true,
          errorColor: '#dc2626',
          macros: MATH_MACROS
        }),
        error: null
      };
    } catch (err) {
      return {
        html: '',
        error: err instanceof Error ? err.message : DEFAULT_ERROR_MESSAGE
      };
    }
  }, [math]);

  if (result.error) {
    return <div className={`text-red-600 ${className || ''}`}>{result.error}</div>;
  }

  return <div className={className} dangerouslySetInnerHTML={{ __html: result.html }} />;
}

type MathSegment = {
  type: 'text' | 'math';
  value: string;
  display: boolean;
};

function renderMathFallback(content: string): string {
  const segments = splitByDelimiters(content);
  return segments
    .map((segment) => {
      if (segment.type === 'text') {
        return escapeHtml(segment.value);
      }

      try {
        return renderToString(segment.value, {
          displayMode: segment.display,
          throwOnError: true,
          errorColor: '#dc2626',
          macros: MATH_MACROS
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : DEFAULT_ERROR_MESSAGE;
        return `<span class="text-red-600">${escapeHtml(message)}</span>`;
      }
    })
    .join('');
}

function splitByDelimiters(content: string): MathSegment[] {
  const delimiters = [
    { left: '$$', right: '$$', display: true },
    { left: '\\[', right: '\\]', display: true },
    { left: '$', right: '$', display: false },
    { left: '\\(', right: '\\)', display: false }
  ];

  const segments: MathSegment[] = [];
  let cursor = 0;

  while (cursor < content.length) {
    let nextMatchIndex = -1;
    let nextDelimiter: typeof delimiters[number] | null = null;

    for (const delimiter of delimiters) {
      const index = content.indexOf(delimiter.left, cursor);
      if (index !== -1 && (nextMatchIndex === -1 || index < nextMatchIndex)) {
        nextMatchIndex = index;
        nextDelimiter = delimiter;
      }
    }

    if (!nextDelimiter || nextMatchIndex === -1) {
      segments.push({ type: 'text', value: content.slice(cursor), display: false });
      break;
    }

    if (nextMatchIndex > cursor) {
      segments.push({
        type: 'text',
        value: content.slice(cursor, nextMatchIndex),
        display: false
      });
    }

    const mathStart = nextMatchIndex + nextDelimiter.left.length;
    const mathEnd = content.indexOf(nextDelimiter.right, mathStart);

    if (mathEnd === -1) {
      segments.push({
        type: 'text',
        value: content.slice(nextMatchIndex),
        display: false
      });
      break;
    }

    segments.push({
      type: 'math',
      value: content.slice(mathStart, mathEnd),
      display: nextDelimiter.display
    });

    cursor = mathEnd + nextDelimiter.right.length;
  }

  return segments;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
