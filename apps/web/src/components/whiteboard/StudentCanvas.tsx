import { useRef, useState, useCallback } from 'react';
import { Pencil, Eraser, Trash2 } from 'lucide-react';

const COLORS = ['#000000', '#ef4444', '#3b82f6', '#10b981', '#f59e0b'];

export function StudentCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [drawing, setDrawing] = useState(false);
  const [tool, setTool] = useState<'pen' | 'eraser'>('pen');
  const [color, setColor] = useState(COLORS[0]);
  const lastPos = useRef<{ x: number; y: number } | null>(null);

  const getCtx = () => canvasRef.current?.getContext('2d');

  const getPos = (e: React.MouseEvent | React.TouchEvent) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    return { x: clientX - rect.left, y: clientY - rect.top };
  };

  const startDraw = (e: React.MouseEvent | React.TouchEvent) => {
    setDrawing(true);
    lastPos.current = getPos(e);
  };

  const draw = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      if (!drawing) return;
      const ctx = getCtx();
      if (!ctx || !lastPos.current) return;
      const pos = getPos(e);
      ctx.beginPath();
      ctx.moveTo(lastPos.current.x, lastPos.current.y);
      ctx.lineTo(pos.x, pos.y);
      ctx.strokeStyle = tool === 'eraser' ? '#ffffff' : color;
      ctx.lineWidth = tool === 'eraser' ? 20 : 2;
      ctx.lineCap = 'round';
      ctx.stroke();
      lastPos.current = pos;
    },
    [drawing, tool, color],
  );

  const stopDraw = () => {
    setDrawing(false);
    lastPos.current = null;
  };

  const clearCanvas = () => {
    const ctx = getCtx();
    if (ctx && canvasRef.current) {
      ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <button
          onClick={() => setTool('pen')}
          className={`p-1.5 rounded ${tool === 'pen' ? 'bg-blue-100 dark:bg-blue-900/30' : 'hover:bg-slate-100 dark:hover:bg-slate-700'}`}
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={() => setTool('eraser')}
          className={`p-1.5 rounded ${tool === 'eraser' ? 'bg-blue-100 dark:bg-blue-900/30' : 'hover:bg-slate-100 dark:hover:bg-slate-700'}`}
        >
          <Eraser className="h-3.5 w-3.5" />
        </button>
        <div className="flex gap-1 ml-2">
          {COLORS.map((c) => (
            <button
              key={c}
              onClick={() => setColor(c)}
              className={`w-5 h-5 rounded-full border-2 ${color === c ? 'border-blue-500' : 'border-transparent'}`}
              style={{ backgroundColor: c }}
            />
          ))}
        </div>
        <button onClick={clearCanvas} className="ml-auto p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded">
          <Trash2 className="h-3.5 w-3.5 text-slate-500" />
        </button>
      </div>
      <canvas
        ref={canvasRef}
        width={400}
        height={200}
        className="w-full border border-slate-200 dark:border-slate-700 rounded-lg bg-white cursor-crosshair touch-none"
        onMouseDown={startDraw}
        onMouseMove={draw}
        onMouseUp={stopDraw}
        onMouseLeave={stopDraw}
        onTouchStart={startDraw}
        onTouchMove={draw}
        onTouchEnd={stopDraw}
      />
    </div>
  );
}
