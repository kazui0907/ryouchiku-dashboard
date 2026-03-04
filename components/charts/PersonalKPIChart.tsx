'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { formatCompactCurrency } from '@/lib/utils';

interface PersonalKPI {
  employeeName: string;
  actualProfit: number;
  targetProfit: number;
  achievementRate: number;
}

interface Props {
  data: PersonalKPI[];
}

export function PersonalKPIChart({ data }: Props) {
  const chartData = data.map((item) => ({
    name: item.employeeName,
    実績粗利: item.actualProfit,
    目標粗利: item.targetProfit,
    達成率: item.achievementRate * 100,
  }));

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={chartData}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="name" />
        <YAxis tickFormatter={(value) => formatCompactCurrency(value)} />
        <Tooltip
          formatter={(value: number, name: string) => {
            if (name === '達成率') {
              return `${value.toFixed(1)}%`;
            }
            return formatCompactCurrency(value);
          }}
        />
        <Legend />
        <Bar dataKey="目標粗利" fill="#94a3b8" />
        <Bar dataKey="実績粗利" fill="#3b82f6" />
      </BarChart>
    </ResponsiveContainer>
  );
}
