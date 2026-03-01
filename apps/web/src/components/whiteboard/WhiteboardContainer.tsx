import { EquationSteps } from './EquationSteps';
import { CodeTracer } from './CodeTracer';
import { DiagramRenderer } from './DiagramRenderer';
import { ScatterPlot } from './ScatterPlot';

interface VisualContent {
  type: 'equation_steps' | 'code_trace' | 'diagram' | 'graph' | 'scatter_plot';
  data: any;
}

export function WhiteboardContainer({ content }: { content: VisualContent }) {
  switch (content.type) {
    case 'equation_steps':
      return <EquationSteps steps={content.data.steps || []} />;

    case 'code_trace':
      return <CodeTracer code={content.data.code || ''} steps={content.data.steps || []} />;

    case 'diagram':
      return (
        <DiagramRenderer
          elements={content.data.elements || []}
          width={content.data.width}
          height={content.data.height}
        />
      );

    case 'scatter_plot':
    case 'graph':
      return (
        <ScatterPlot
          points={content.data.points || []}
          xLabel={content.data.xLabel}
          yLabel={content.data.yLabel}
        />
      );

    default:
      return null;
  }
}
