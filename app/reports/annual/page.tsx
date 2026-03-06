'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { ArrowLeft, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { formatCurrency, formatCompactCurrency, formatPercent } from '@/lib/utils';

// ---- 型 ----------------------------------------------------------------

interface AnnualTotal {
  year: number;
  salesRevenue: number;
  marginProfit: number;
  operatingProfit: number;
  monthCount: number;
}

interface AnnualData {
  year: number;
  years: number[];
  annualTotals: AnnualTotal[];
  monthlyChart: Record<string, number | string>[];
}

// ---- 定数 --------------------------------------------------------------

const YEAR_COLORS: Record<0 | 1 | 2, { line: string; label: string }> = {
  0: { line: '#2563eb', label: 'text-blue-600' },   // 当年 (濃い青)
  1: { line: '#f97316', label: 'text-orange-500' }, // -1年 (オレンジ)
  2: { line: '#9ca3af', label: 'text-gray-400' },   // -2年 (グレー)
};

// ---- ユーティリティ ----------------------------------------------------

function yoy(current: number, prev: number) {
  if (prev === 0) return null;
  return (current - prev) / Math.abs(prev);
}

function YoyBadge({ rate }: { rate: number | null }) {
  if (rate === null) return <span className="text-gray-400 text-xs">—</span>;
  const positive = rate >= 0;
  const Icon = rate === 0 ? Minus : positive ? TrendingUp : TrendingDown;
  const color = positive ? 'text-emerald-600' : 'text-red-500';
  return (
    <span className={`inline-flex items-center gap-0.5 text-xs font-medium ${color}`}>
      <Icon className="w-3 h-3" />
      {positive ? '+' : ''}{(rate * 100).toFixed(1)}%
    </span>
  );
}

// ---- 3カ年比較グラフ --------------------------------------------------

interface MetricChartProps {
  data: Record<string, number | string>[];
  years: number[];
  metricKey: string; // 例: '売上' | '限界利益' | '営業利益'
  title: string;
}

function MetricChart({ data, years, metricKey, title }: MetricChartProps) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
      <h3 className="text-base font-semibold text-gray-800 mb-4">{title}</h3>
      <ResponsiveContainer width="100%" height={260}>
        <LineChart data={data} margin={{ top: 4, right: 16, left: 8, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="month" tick={{ fontSize: 12 }} />
          <YAxis
            tickFormatter={(v) => formatCompactCurrency(v)}
            tick={{ fontSize: 11 }}
            width={64}
          />
          <Tooltip
            formatter={(value, name) => [formatCurrency(value as number), name]}
            contentStyle={{ fontSize: 12, borderRadius: 8 }}
          />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          {years.map((y, i) => (
            <Line
              key={y}
              type="monotone"
              dataKey={`${y}年_${metricKey}`}
              name={`${y}年`}
              stroke={YEAR_COLORS[i as 0 | 1 | 2].line}
              strokeWidth={i === 0 ? 2.5 : 1.5}
              strokeDasharray={i === 2 ? '4 3' : undefined}
              dot={false}
              activeDot={{ r: 4 }}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

// ---- メインページ ------------------------------------------------------

const CURRENT_YEAR = new Date().getFullYear();

export default function AnnualReportPage() {
  const router = useRouter();
  const [year, setYear] = useState(2026);
  const [data, setData] = useState<AnnualData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/reports/annual?year=${year}`)
      .then((r) => r.json())
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [year]);

  const yearOptions = Array.from({ length: 6 }, (_, i) => CURRENT_YEAR + 1 - i);
  const current = data?.annualTotals[0];
  const prev    = data?.annualTotals[1];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ヘッダー */}
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="flex items-center text-gray-500 hover:text-gray-900"
          >
            <ArrowLeft className="h-5 w-5 mr-1" />
            戻る
          </button>
          <h1 className="text-2xl font-bold text-gray-900 flex-1">年次サマリー</h1>
          <select
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {yearOptions.map((y) => (
              <option key={y} value={y}>{y}年度</option>
            ))}
          </select>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {loading ? (
          <div className="flex items-center justify-center h-64 text-gray-400">読み込み中...</div>
        ) : !data ? (
          <div className="flex items-center justify-center h-64 text-gray-400">データがありません</div>
        ) : (
          <>
            {/* ---- 3カ年 年次サマリーカード ---- */}
            <section>
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
                3カ年 年次比較
              </h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b-2 border-gray-200">
                      <th className="text-left py-2 px-3 text-gray-500 font-medium w-36">指標</th>
                      {data.years.map((y, i) => (
                        <th
                          key={y}
                          className="text-right py-2 px-4 font-semibold"
                          style={{ color: YEAR_COLORS[i as 0 | 1 | 2].line }}
                        >
                          {y}年度{i === 0 && <span className="ml-1 text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full">当年</span>}
                        </th>
                      ))}
                      <th className="text-right py-2 px-4 text-gray-500 font-medium">前年比</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {[
                      { label: '売上高',   key: 'salesRevenue'   as const },
                      { label: '限界利益', key: 'marginProfit'   as const },
                      { label: '営業利益', key: 'operatingProfit' as const },
                    ].map(({ label, key }) => (
                      <tr key={key} className="hover:bg-gray-50">
                        <td className="py-3 px-3 font-medium text-gray-700">{label}</td>
                        {data.annualTotals.map((t, i) => (
                          <td key={t.year} className="py-3 px-4 text-right font-mono tabular-nums">
                            <span className={i === 0 ? 'font-bold text-gray-900' : 'text-gray-500'}>
                              {t.monthCount > 0 ? formatCurrency(t[key]) : '—'}
                            </span>
                          </td>
                        ))}
                        <td className="py-3 px-4 text-right">
                          {current && prev ? (
                            <YoyBadge rate={yoy(current[key], prev[key])} />
                          ) : '—'}
                        </td>
                      </tr>
                    ))}
                    {/* 限界利益率 */}
                    <tr className="hover:bg-gray-50">
                      <td className="py-3 px-3 font-medium text-gray-700">限界利益率</td>
                      {data.annualTotals.map((t, i) => (
                        <td key={t.year} className="py-3 px-4 text-right font-mono tabular-nums">
                          <span className={i === 0 ? 'font-bold text-gray-900' : 'text-gray-500'}>
                            {t.monthCount > 0 && t.salesRevenue > 0
                              ? formatPercent(t.marginProfit / t.salesRevenue)
                              : '—'}
                          </span>
                        </td>
                      ))}
                      <td className="py-3 px-4 text-right">
                        {current && prev && current.salesRevenue > 0 && prev.salesRevenue > 0 ? (
                          <YoyBadge
                            rate={yoy(
                              current.marginProfit / current.salesRevenue,
                              prev.marginProfit / prev.salesRevenue,
                            )}
                          />
                        ) : '—'}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>

            {/* ---- 3カ年グラフ 3枚 ---- */}
            <section>
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
                月次推移 — 3カ年比較
              </h2>
              <div className="grid grid-cols-1 gap-6">
                <MetricChart
                  data={data.monthlyChart}
                  years={data.years}
                  metricKey="売上"
                  title="売上高"
                />
                <MetricChart
                  data={data.monthlyChart}
                  years={data.years}
                  metricKey="限界利益"
                  title="限界利益"
                />
                <MetricChart
                  data={data.monthlyChart}
                  years={data.years}
                  metricKey="営業利益"
                  title="営業利益"
                />
              </div>
            </section>

            {/* ---- 月別詳細テーブル（当年） ---- */}
            <section>
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
                月別詳細 — {year}年度
              </h2>
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500">月</th>
                        <th className="px-5 py-3 text-right text-xs font-semibold text-gray-500">売上高</th>
                        <th className="px-5 py-3 text-right text-xs font-semibold text-gray-500">限界利益</th>
                        <th className="px-5 py-3 text-right text-xs font-semibold text-gray-500">限界利益率</th>
                        <th className="px-5 py-3 text-right text-xs font-semibold text-gray-500">営業利益</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {data.monthlyChart.map((row) => {
                        const sales  = row[`${year}年_売上`] as number;
                        const margin = row[`${year}年_限界利益`] as number;
                        const op     = row[`${year}年_営業利益`] as number;
                        const rate   = sales > 0 ? margin / sales : 0;
                        const isEmpty = sales === 0 && margin === 0 && op === 0;
                        return (
                          <tr key={row.month as string} className={isEmpty ? 'text-gray-300' : 'hover:bg-gray-50'}>
                            <td className="px-5 py-3 font-medium">{row.month}</td>
                            <td className="px-5 py-3 text-right tabular-nums">{isEmpty ? '—' : formatCurrency(sales)}</td>
                            <td className="px-5 py-3 text-right tabular-nums">{isEmpty ? '—' : formatCurrency(margin)}</td>
                            <td className="px-5 py-3 text-right tabular-nums">{isEmpty ? '—' : formatPercent(rate)}</td>
                            <td className={`px-5 py-3 text-right tabular-nums font-medium ${op < 0 ? 'text-red-500' : ''}`}>
                              {isEmpty ? '—' : formatCurrency(op)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>
          </>
        )}
      </main>
    </div>
  );
}
