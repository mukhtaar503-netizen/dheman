'use client';

import { PieChart, Pie, Cell } from 'recharts';

/** Circular progress ring with a centered value label — e.g. Completion Rate, Satisfaction. */
export function ProgressRing({ value, max = 100, label, sublabel, color }: { value: number; max?: number; label: string; sublabel: string; color: string }) {
  const clamped = Math.max(0, Math.min(value, max));
  const data = [
    { name: 'value', value: clamped },
    { name: 'rest', value: Math.max(max - clamped, 0) },
  ];

  return (
    <div className="flex flex-col items-center">
      <div className="relative h-24 w-24">
        <PieChart width={96} height={96}>
          <Pie data={data} dataKey="value" innerRadius={34} outerRadius={44} startAngle={90} endAngle={-270} stroke="none">
            <Cell fill={color} />
            <Cell fill="hsl(var(--muted))" />
          </Pie>
        </PieChart>
        <div className="absolute inset-0 flex items-center justify-center text-sm font-semibold">{label}</div>
      </div>
      <p className="mt-1 text-center text-xs text-muted-foreground">{sublabel}</p>
    </div>
  );
}
