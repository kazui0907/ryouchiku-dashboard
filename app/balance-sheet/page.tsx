'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  AreaChart, Area,
  BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { ArrowLeft } from 'lucide-react';
import { formatCurrency, formatCompactCurrency } from '@/lib/utils';

// ---- 型 ----------------------------------------------------------------

interface MonthRow {
  month: string;
  cash:               number | null;
  receivables:        number | null;
  inventory:          number | null;
  currentAssets:      number | null;
  tangibleAssets:     number | null;
  fixedAssets:        number | null;
  totalAssets:        number | null;
  payables:           number | null;
  currentLiabilities: number | null;
  fixedLiabilities:   number | null;
  totalLiabilities:   number | null;
  netAssets:          number | null;
}

interface LatestSnapshot {
  month: number;
  cash:               number | null;
  receivables:        number | null;
  inventory:          number | null;
  currentAssets:      number | null;
  fixedAssets:        number | null;
  totalAssets:        number | null;
  currentLiabilities: number | null;
  fixedLiabilities:   number | null;
  totalLiabilities:   number | null;
  netAssets:          number | null;
}

interface ApiData {
  year: number;
  monthlyChart: MonthRow[];
  latest: LatestSnapshot | null;
}

// ---- ユーティリティ ----------------------------------------------------

const fmt = (v: number | null) => (v == null ? '—' : formatCurrency(v));
const fmtC = (v: number | null) => (v == null ? '—' : formatCompactCurrency(v));

function SummaryCard({ label, value, sub, color = 'text-gray-900' }: {
  label: string; value: string; sub?: string; color?: string;
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
      <p className="text-xs font-medium text-gray-500 mb-1">{label}</p>
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  );
}

// ---- ツールチップカスタマイズ ------------------------------------------

function CustomTooltip({ active, payload, label }: {
  active?: boolean; payload?: { name: string; value: number; fill: string }[]; label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-lg p-3 text-sm min-w-36">
      <p className="font-semibold text-gray-700 mb-2">{label}</p>
      {payload.map((p) => (
        <div key={p.name} className="flex justify-between gap-4">
          <span style={{ color: p.fill }} className="font-medium">{p.name}</span>
          <span className="tabular-nums text-gray-800">{formatCompactCurrency(p.value)}</span>
        </div>
      ))}
    </div>
  );
}

// ---- メインページ ------------------------------------------------------

const CURRENT_YEAR = new Date().getFullYear();

export default function BalanceSheetPage() {
  const router = useRouter();
  const [year, setYear] = useState(2026);
  const [data, setData] = useState<ApiData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/balance-sheet?year=${year}`)
      .then((r) => r.json())
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [year]);

  const yearOptions = Array.from({ length: 4 }, (_, i) => CURRENT_YEAR + 1 - i);

  // データのある月だけグラフに使う
  const chartData = data?.monthlyChart.filter((r) => r.totalAssets != null) ?? [];

  // 自己資本比率（最新月）
  const l = data?.latest;
  const equityRatio = l && l.totalAssets && l.totalAssets > 0
    ? (l.netAssets ?? 0) / l.totalAssets
    : null;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ヘッダー */}
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center gap-4">
          <button onClick={() => router.back()} className="flex items-center text-gray-500 hover:text-gray-900">
            <ArrowLeft className="h-5 w-5 mr-1" />
            戻る
          </button>
          <h1 className="text-2xl font-bold text-gray-900 flex-1">貸借対照表</h1>
          <select
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {yearOptions.map((y) => <option key={y} value={y}>{y}年度</option>)}
          </select>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {loading ? (
          <div className="flex items-center justify-center h-64 text-gray-400">読み込み中...</div>
        ) : !data || chartData.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 gap-3 text-gray-400">
            <p className="text-lg">データがありません</p>
            <p className="text-sm">CSVをインポートしてください</p>
          </div>
        ) : (
          <>
            {/* ---- 最新月サマリー ---- */}
            {l && (
              <section>
                <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
                  最新月スナップショット（{l.month}月末）
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                  <SummaryCard label="総資産"       value={fmtC(l.totalAssets)}        sub={fmt(l.totalAssets)} color="text-blue-700" />
                  <SummaryCard label="流動資産"     value={fmtC(l.currentAssets)}      sub={fmt(l.currentAssets)} />
                  <SummaryCard label="固定資産"     value={fmtC(l.fixedAssets)}        sub={fmt(l.fixedAssets)} />
                  <SummaryCard label="負債合計"     value={fmtC(l.totalLiabilities)}   sub={fmt(l.totalLiabilities)} color="text-orange-600" />
                  <SummaryCard
                    label="純資産 / 自己資本比率"
                    value={fmtC(l.netAssets)}
                    sub={equityRatio != null ? `自己資本比率 ${(equityRatio * 100).toFixed(1)}%` : undefined}
                    color="text-emerald-600"
                  />
                </div>
              </section>
            )}

            {/* ---- 資産構成グラフ（積み上げ面グラフ） ---- */}
            <section>
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                <h3 className="text-base font-semibold text-gray-800 mb-1">資産構成の推移</h3>
                <p className="text-xs text-gray-400 mb-4">流動資産・固定資産の積み上げ（= 総資産）</p>
                <ResponsiveContainer width="100%" height={280}>
                  <AreaChart data={chartData} margin={{ top: 4, right: 16, left: 8, bottom: 0 }}>
                    <defs>
                      <linearGradient id="gradCurrent" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor="#3b82f6" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.05} />
                      </linearGradient>
                      <linearGradient id="gradFixed" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor="#8b5cf6" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.05} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                    <YAxis tickFormatter={formatCompactCurrency} tick={{ fontSize: 11 }} width={68} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Area type="monotone" dataKey="currentAssets" name="流動資産" stackId="1"
                      stroke="#3b82f6" fill="url(#gradCurrent)" strokeWidth={2} />
                    <Area type="monotone" dataKey="fixedAssets"   name="固定資産" stackId="1"
                      stroke="#8b5cf6" fill="url(#gradFixed)"   strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </section>

            {/* ---- 負債・純資産グラフ（積み上げ棒グラフ） ---- */}
            <section>
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                <h3 className="text-base font-semibold text-gray-800 mb-1">負債・純資産の構成推移</h3>
                <p className="text-xs text-gray-400 mb-4">流動負債 + 固定負債 + 純資産 = 総資産</p>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={chartData} margin={{ top: 4, right: 16, left: 8, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                    <YAxis tickFormatter={formatCompactCurrency} tick={{ fontSize: 11 }} width={68} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Bar dataKey="currentLiabilities" name="流動負債" stackId="a" fill="#f97316" radius={[0,0,0,0]} />
                    <Bar dataKey="fixedLiabilities"   name="固定負債" stackId="a" fill="#fbbf24" radius={[0,0,0,0]} />
                    <Bar dataKey="netAssets"          name="純資産"   stackId="a" fill="#10b981" radius={[4,4,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </section>

            {/* ---- 現金・売上債権・棚卸 折れ線 ---- */}
            <section>
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                <h3 className="text-base font-semibold text-gray-800 mb-1">流動資産の内訳推移</h3>
                <p className="text-xs text-gray-400 mb-4">現金預金・売上債権・棚卸資産の月次変化</p>
                <ResponsiveContainer width="100%" height={260}>
                  <AreaChart data={chartData} margin={{ top: 4, right: 16, left: 8, bottom: 0 }}>
                    <defs>
                      <linearGradient id="gradCash" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor="#2563eb" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#2563eb" stopOpacity={0.02} />
                      </linearGradient>
                      <linearGradient id="gradInv" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor="#f59e0b" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                    <YAxis tickFormatter={formatCompactCurrency} tick={{ fontSize: 11 }} width={68} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Area type="monotone" dataKey="cash"        name="現金及び預金" stroke="#2563eb" fill="url(#gradCash)" strokeWidth={2} dot={false} />
                    <Area type="monotone" dataKey="inventory"   name="棚卸資産"     stroke="#f59e0b" fill="url(#gradInv)"  strokeWidth={2} dot={false} />
                    <Area type="monotone" dataKey="receivables" name="売上債権"     stroke="#6366f1" fill="none"           strokeWidth={1.5} strokeDasharray="4 3" dot={false} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </section>

            {/* ---- 月別詳細テーブル ---- */}
            <section>
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
                月別詳細
              </h2>
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">月</th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-blue-600">流動資産</th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-purple-600">固定資産</th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700">総資産</th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-orange-500">流動負債</th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-yellow-600">固定負債</th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">負債合計</th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-emerald-600">純資産</th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500">自己資本比率</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {data.monthlyChart.map((r) => {
                        const empty = r.totalAssets == null;
                        const er = r.totalAssets && r.totalAssets > 0
                          ? ((r.netAssets ?? 0) / r.totalAssets * 100).toFixed(1) + '%'
                          : '—';
                        return (
                          <tr key={r.month} className={empty ? 'text-gray-300' : 'hover:bg-gray-50'}>
                            <td className="px-4 py-3 font-medium">{r.month}</td>
                            <td className="px-4 py-3 text-right tabular-nums">{empty ? '—' : formatCurrency(r.currentAssets!)}</td>
                            <td className="px-4 py-3 text-right tabular-nums">{empty ? '—' : formatCurrency(r.fixedAssets!)}</td>
                            <td className="px-4 py-3 text-right tabular-nums font-semibold">{empty ? '—' : formatCurrency(r.totalAssets!)}</td>
                            <td className="px-4 py-3 text-right tabular-nums">{empty ? '—' : formatCurrency(r.currentLiabilities!)}</td>
                            <td className="px-4 py-3 text-right tabular-nums">{empty ? '—' : formatCurrency(r.fixedLiabilities!)}</td>
                            <td className="px-4 py-3 text-right tabular-nums">{empty ? '—' : formatCurrency(r.totalLiabilities!)}</td>
                            <td className="px-4 py-3 text-right tabular-nums font-medium text-emerald-700">{empty ? '—' : formatCurrency(r.netAssets!)}</td>
                            <td className="px-4 py-3 text-right tabular-nums text-gray-500">{empty ? '—' : er}</td>
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
