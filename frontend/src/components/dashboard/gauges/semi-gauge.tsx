'use client';

import { PieChart, Pie, Cell } from 'recharts';

const ZONES = [
  { name: 'low', value: 33, fill: '#ef4444' },
  { name: 'mid', value: 34, fill: '#f59e0b' },
  { name: 'high', value: 33, fill: '#10b981' },
];

/** Semi-circle performance index gauge (0-100 scale) with a needle-less pointer dot at the value's angle. */
export function SemiGauge({ value, label }: { value: number; label: string }) {
  const clamped = Math.max(0, Math.min(value, 100));
  const angle = 180 - (clamped / 100) * 180; // 180deg at value=0, 0deg at value=100
  const rad = (angle * Math.PI) / 180;
  const cx = 60;
  const cy = 58;
  const r = 40;
  const dotX = cx + r * Math.cos(rad);
  const dotY = cy - r * Math.sin(rad);

  return (
    <div className="flex flex-col items-center">
      <div className="relative h-16 w-32">
        <PieChart width={128} height={70}>
          <Pie data={ZONES} dataKey="value" cx={64} cy={58} innerRadius={30} outerRadius={40} startAngle={180} endAngle={0} stroke="none">
            {ZONES.map((z) => (
              <Cell key={z.name} fill={z.fill} />
            ))}
          </Pie>
        </PieChart>
        <svg width={128} height={70} className="absolute left-0 top-0">
          <circle cx={dotX + 4} cy={dotY} r={4} fill="currentColor" className="text-foreground" />
        </svg>
      </div>
      <p className="-mt-1 text-lg font-semibold">{clamped.toFixed(2)}</p>
      <p className="text-center text-xs text-muted-foreground">{label}</p>
    </div>
  );
}
