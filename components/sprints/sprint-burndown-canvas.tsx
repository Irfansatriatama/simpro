'use client';

import { useEffect, useRef } from 'react';

type Props = {
  startDate: string;
  endDate: string;
  totalSP: number;
  doneSP: number;
};

export function SprintBurndownCanvas(props: Props) {
  const { startDate, endDate, totalSP, doneSP } = props;
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap || totalSP <= 0) return;

    const remainSP = Math.max(0, totalSP - doneSP);
    const start = new Date(startDate + 'T12:00:00');
    const end = new Date(endDate + 'T23:59:59');
    const msDay = 86_400_000;
    const daysTotal = Math.max(
      1,
      Math.ceil((end.getTime() - start.getTime()) / msDay) + 1,
    );
    const today = new Date();
    const daysElapsed = Math.min(
      daysTotal,
      Math.max(0, Math.ceil((today.getTime() - start.getTime()) / msDay) + 1),
    );

    const idealPoints = Array.from(
      { length: daysTotal + 1 },
      (_, i) => totalSP - (totalSP * i) / daysTotal,
    );

    const actualPoints: number[] = [];
    const denom = Math.max(1, daysElapsed - 1);
    for (let i = 0; i <= daysElapsed - 1; i++) {
      actualPoints.push(totalSP - (doneSP * i) / denom);
    }
    actualPoints.push(remainSP);

    const H = 280;
    const PAD = { top: 30, right: 20, bottom: 55, left: 50 };

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
      const yMax = totalSP;
      const xSteps = daysTotal;

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

      const labelStep = Math.max(1, Math.floor(xSteps / 8));
      for (let i = 0; i <= xSteps; i += labelStep) {
        const x = PAD.left + (i / xSteps) * chartW;
        const d = new Date(start.getTime() + i * msDay);
        ctx.fillStyle = '#94a3b8';
        ctx.font = '10px system-ui,sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(
          d.toLocaleDateString('id-ID', { month: 'short', day: 'numeric' }),
          x,
          PAD.top + chartH + 18,
        );
      }

      ctx.beginPath();
      ctx.strokeStyle = '#cbd5e1';
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 4]);
      idealPoints.forEach((sp, i) => {
        const x = PAD.left + (i / xSteps) * chartW;
        const y = PAD.top + chartH - (sp / yMax) * chartH;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.beginPath();
      ctx.strokeStyle = '#2563eb';
      ctx.lineWidth = 2.5;
      actualPoints.forEach((sp, i) => {
        const x = PAD.left + (i / xSteps) * chartW;
        const y = PAD.top + chartH - (Math.max(0, sp) / yMax) * chartH;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();

      if (daysElapsed > 0 && daysElapsed <= daysTotal) {
        const todayX = PAD.left + ((daysElapsed - 1) / xSteps) * chartW;
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([4, 3]);
        ctx.beginPath();
        ctx.moveTo(todayX, PAD.top);
        ctx.lineTo(todayX, PAD.top + chartH);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = '#ef4444';
        ctx.font = '600 9px system-ui,sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('HARI INI', todayX, PAD.top - 6);
      }

      const lastI = actualPoints.length - 1;
      const lastX = PAD.left + (lastI / xSteps) * chartW;
      const lastY =
        PAD.top + chartH - (Math.max(0, remainSP) / yMax) * chartH;
      ctx.beginPath();
      ctx.arc(lastX, lastY, 5, 0, Math.PI * 2);
      ctx.fillStyle = '#2563eb';
      ctx.fill();
      ctx.fillStyle = '#1d4ed8';
      ctx.font = 'bold 11px system-ui,sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(`${remainSP} SP`, lastX + 8, lastY + 4);
    }

    paint();
    const ro = new ResizeObserver(paint);
    ro.observe(wrap);
    return () => ro.disconnect();
  }, [startDate, endDate, totalSP, doneSP]);

  return (
    <div ref={wrapRef} className="w-full">
      <canvas ref={canvasRef} className="h-[280px] w-full max-w-full" />
    </div>
  );
}
