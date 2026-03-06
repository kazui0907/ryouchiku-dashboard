'use client';

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface WeeklyKPI {
  weekNumber: number;
  inquiryCount: number;
  inquiryTarget: number;
  orderCount: number | null;
}

interface Props {
  data: WeeklyKPI[];
}

export function WeeklyKPIChart({ data }: Props) {
  const chartData = data.map((item) => ({
    name: `第${item.weekNumber}週`,
    問合件数: item.inquiryCount,
    問合目標: item.inquiryTarget,
    受注件数: item.orderCount || 0,
  }));

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={chartData}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="name" />
        <YAxis />
        <Tooltip />
        <Legend />
        <Line type="monotone" dataKey="問合件数" stroke="#3b82f6" strokeWidth={2} />
        <Line type="monotone" dataKey="問合目標" stroke="#94a3b8" strokeWidth={2} strokeDasharray="5 5" />
        <Line type="monotone" dataKey="受注件数" stroke="#10b981" strokeWidth={2} />
      </LineChart>
    </ResponsiveContainer>
  );
}
