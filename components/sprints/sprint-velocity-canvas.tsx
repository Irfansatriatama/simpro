'use client';

import { useEffect, useRef } from 'react';

export type VelocityBar = {
  name: string;
  committed: number;
  completed: number;
};

type Props = {
  bars: VelocityBar[];
};

export function SprintVelocityCanvas(props: Props) {
  const { bars } = props;
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap || bars.length === 0) return;

    const H = 260;
    const PAD = { top: 30, right: 20, bottom: 55, left: 45 };

    function paint() {
      const c = canvasRef.current;
      const w = wrapRef.current;
      if (!c || !w) return;
      const ctx = c.getContext('2d');
      if (!ctx) return;
      const W = Math.max(320, w.clientWidth);
      c.width = W;
      c.height = H;
      const chartW = W - PAD.left - PAD.right;
      const chartH = H - PAD.top - PAD.bottom;
      const maxVal = Math.max(
        ...bars.flatMap((d) => [d.committed, d.completed]),
        1,
      );
      const yMax = Math.ceil(maxVal * 1.2) || 10;
      const barGroupW = chartW / bars.length;
      const barW = Math.min(barGroupW * 0.32, 32);

      ctx.clearRect(0, 0, W, H);

      ctx.strokeStyle = '#e2e8f0';
      ctx.lineWidth = 1;
      for (let i = 0; i <= 5; i++) {
        const y = PAD.top + chartH - (i / 5) * chartH;
        ctx.beginPath();
        ctx.moveTo(PAD.left, y);
        ctx.lineTo(PAD.left + chartW, y);
        ctx.stroke();
        ctx.fillStyle = '#94a3b8';
        ctx.font = '11px system-ui,sans-serif';
        ctx.textAlign = 'right';
        ctx.fillText(String(Math.round((i / 5) * yMax)), PAD.left - 6, y + 4);
      }

      bars.forEach((d, i) => {
        const cx = PAD.left + i * barGroupW + barGroupW / 2;
        const committedH = (d.committed / yMax) * chartH;
        const completedH = (d.completed / yMax) * chartH;
        ctx.fillStyle = '#cbd5e1';
        ctx.fillRect(
          cx - barW - 2,
          PAD.top + chartH - committedH,
          barW,
          committedH,
        );
        ctx.fillStyle = '#2563eb';
        ctx.fillRect(
          cx + 2,
          PAD.top + chartH - completedH,
          barW,
          completedH,
        );
        ctx.fillStyle = '#64748b';
        ctx.font = '10px system-ui,sans-serif';
        ctx.textAlign = 'center';
        const short =
          d.name.length > 12 ? `${d.name.slice(0, 10)}…` : d.name;
        ctx.fillText(short, cx, PAD.top + chartH + 16);
      });
    }

    paint();
    const ro = new ResizeObserver(paint);
    ro.observe(wrap);
    return () => ro.disconnect();
  }, [bars]);

  return (
    <div ref={wrapRef} className="w-full">
      <canvas ref={canvasRef} className="h-[260px] w-full max-w-full" />
    </div>
  );
}
