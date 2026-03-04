'use client';

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { formatCompactCurrency } from '@/lib/utils';

interface MonthlyData {
  year: number;
  month: number;
  salesRevenue: number;
  grossProfit: number;
}

interface Props {
  data: MonthlyData[];
}

export function MonthlyTrendChart({ data }: Props) {
  const chartData = data.map((item) => ({
    name: `${item.month}月`,
    売上高: item.salesRevenue,
    売上総利益: item.grossProfit,
  }));

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={chartData}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="name" />
        <YAxis tickFormatter={(value) => formatCompactCurrency(value)} />
        <Tooltip
          formatter={(value) => formatCompactCurrency(value as number)}
          labelStyle={{ color: '#000' }}
        />
        <Legend />
        <Line type="monotone" dataKey="売上高" stroke="#3b82f6" strokeWidth={2} />
        <Line type="monotone" dataKey="売上総利益" stroke="#10b981" strokeWidth={2} />
      </LineChart>
    </ResponsiveContainer>
  );
}
