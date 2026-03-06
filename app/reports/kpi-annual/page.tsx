'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';

// ---- 型 ---------------------------------------------------------------

interface MonthCell {
  month: number;
  target: number | null;
  actual: number | null;
  rate:   number | null;
}

interface WeeklyKPIData {
  items: string[];
  monthly: Record<string, MonthCell[]>;
}

interface SiteItem { mainItem: string; subItem: string; key: string }
interface SiteKPIData {
  items: SiteItem[];
  monthly: Record<string, MonthCell[]>;
}

interface ApiData {
  year: number;
  weeklyKPI: WeeklyKPIData;
  siteKPI:   SiteKPIData;
}

// ---- 定数 -------------------------------------------------------------

const MONTHS = [1,2,3,4,5,6,7,8,9,10,11,12];

// パーセント表示する項目
const PERCENT_ITEMS = new Set([
  'メインターゲット率','商談設定率','受注率',
  'コンバージョン単価','追客架電（商談前）','メイン商材ない人にアクション',
  '口コミ回収率','成約率',
]);

// 通貨表示する項目
const CURRENCY_ITEMS = new Set([
  '平均限界粗利単価',
  'MEET商談平均粗利額','SR商談平均粗利額',
  '景山','京屋','中谷','熊田','大島','森谷','星野','安栗',
  'SR_京屋','SR_熊田','SR_星野','SR_安栗',
]);

// ---- ユーティリティ ---------------------------------------------------

function fmtVal(v: number | null, itemName: string): string {
  if (v === null) return '—';
  if (PERCENT_ITEMS.has(itemName)) return `${(v * 100).toFixed(1)}%`;
  if (CURRENCY_ITEMS.has(itemName)) return `¥${Math.round(v).toLocaleString()}`;
  return Math.round(v).toLocaleString();
}

function rateColor(rate: number | null): string {
  if (rate === null) return 'text-gray-300';
  if (rate >= 1.0) return 'text-emerald-600';
  if (rate >= 0.8) return 'text-yellow-600';
  return 'text-red-500';
}

function rateBg(rate: number | null): string {
  if (rate === null) return '';
  if (rate >= 1.0) return 'bg-emerald-50';
  if (rate >= 0.8) return 'bg-yellow-50';
  return 'bg-red-50';
}

// 年間の達成率（実績合計 / 目標合計）
function annualRate(cells: MonthCell[]): { actual: number | null; target: number | null; rate: number | null } {
  const withActual = cells.filter(c => c.actual !== null);
  if (withActual.length === 0) return { actual: null, target: null, rate: null };
  const actual = withActual.reduce((s, c) => s + (c.actual ?? 0), 0);
  const withTarget = cells.filter(c => c.target !== null);
  const target = withTarget.length > 0 ? withTarget.reduce((s, c) => s + (c.target ?? 0), 0) : null;
  const rate = target != null && target !== 0 ? actual / target : null;
  return { actual, target, rate };
}

// ---- セル -------------------------------------------------------------

function KpiCell({ cell, itemName }: { cell: MonthCell; itemName: string }) {
  const hasData = cell.actual !== null || cell.target !== null;
  if (!hasData) return <td className="px-2 py-2 text-center text-gray-200 text-xs border-r border-gray-100">—</td>;

  return (
    <td className={`px-2 py-2 text-center border-r border-gray-100 ${rateBg(cell.rate)}`}>
      <div className="text-sm font-semibold text-gray-900 leading-tight">
        {fmtVal(cell.actual, itemName)}
      </div>
      {cell.target !== null && (
        <div className="text-xs text-gray-400 leading-tight">
          {fmtVal(cell.target, itemName)}
        </div>
      )}
      {cell.rate !== null && (
        <div className={`text-xs font-bold leading-tight ${rateColor(cell.rate)}`}>
          {(cell.rate * 100).toFixed(0)}%
        </div>
      )}
    </td>
  );
}

// 年間合計セル
function AnnualCell({ cells, itemName }: { cells: MonthCell[]; itemName: string }) {
  const { actual, target, rate } = annualRate(cells);
  if (actual === null) return <td className="px-2 py-2 text-center text-gray-200 text-xs">—</td>;
  return (
    <td className={`px-2 py-2 text-center font-bold ${rateBg(rate)}`}>
      <div className="text-sm text-gray-900">{fmtVal(actual, itemName)}</div>
      {target !== null && <div className="text-xs text-gray-400">{fmtVal(target, itemName)}</div>}
      {rate !== null && <div className={`text-xs font-bold ${rateColor(rate)}`}>{(rate * 100).toFixed(0)}%</div>}
    </td>
  );
}

// ---- メインページ -----------------------------------------------------

const YEAR_OPTIONS = Array.from({ length: 6 }, (_, i) => 2027 - i);

export default function KpiAnnualPage() {
  const router = useRouter();
  const [year, setYear]   = useState(new Date().getFullYear());
  const [data, setData]   = useState<ApiData | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab]     = useState<'weekly' | 'site'>('weekly');

  useEffect(() => {
    setLoading(true);
    fetch(`/api/reports/kpi-annual?year=${year}`)
      .then(r => r.json())
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [year]);

  // 現場KPIのカテゴリグループ
  const siteGroups = data
    ? (() => {
        const groups: { mainItem: string; items: SiteItem[] }[] = [];
        for (const item of data.siteKPI.items) {
          const last = groups[groups.length - 1];
          if (last && last.mainItem === item.mainItem) last.items.push(item);
          else groups.push({ mainItem: item.mainItem, items: [item] });
        }
        return groups;
      })()
    : [];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ヘッダー */}
      <header className="bg-white border-b sticky top-0 z-20">
        <div className="max-w-full px-4 sm:px-6 py-4 flex items-center gap-4">
          <button onClick={() => router.back()} className="flex items-center text-gray-500 hover:text-gray-900 flex-shrink-0">
            <ArrowLeft className="h-5 w-5 mr-1" />
            戻る
          </button>
          <h1 className="text-2xl font-bold text-gray-900 flex-1">年次KPIレポート</h1>

          {/* 年度セレクター */}
          <select
            value={year}
            onChange={e => setYear(Number(e.target.value))}
            className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {YEAR_OPTIONS.map(y => <option key={y} value={y}>{y}年</option>)}
          </select>
        </div>

        {/* タブ */}
        <div className="flex border-t border-gray-100 px-4">
          {([['weekly','数字KPI'],['site','現場KPI']] as const).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`px-6 py-2.5 text-sm font-semibold border-b-2 transition-colors ${
                tab === key
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </header>

      <main className="px-2 sm:px-4 py-6">
        {loading ? (
          <div className="flex items-center justify-center h-64 text-gray-400">読み込み中...</div>
        ) : !data ? (
          <div className="flex items-center justify-center h-64 text-gray-400">データがありません</div>
        ) : tab === 'weekly' ? (

          /* ======= 数字KPI テーブル ======= */
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="text-sm w-full border-collapse">
                <thead className="bg-gray-50 border-b-2 border-gray-200">
                  <tr>
                    <th className="sticky left-0 z-10 bg-gray-50 px-4 py-3 text-left font-semibold text-gray-600 border-r-2 border-gray-200 min-w-[160px]">
                      項目
                    </th>
                    {MONTHS.map(m => (
                      <th key={m} className="px-2 py-3 text-center font-semibold text-gray-600 border-r border-gray-200 min-w-[80px]">
                        {m}月
                      </th>
                    ))}
                    <th className="px-2 py-3 text-center font-semibold text-blue-700 min-w-[80px] bg-blue-50">
                      年間
                    </th>
                  </tr>
                  <tr className="text-xs text-gray-400 bg-gray-50 border-b border-gray-200">
                    <td className="sticky left-0 z-10 bg-gray-50 px-4 py-1 border-r-2 border-gray-200">実績 / 目標 / 達成率</td>
                    {MONTHS.map(m => <td key={m} className="border-r border-gray-100" />)}
                    <td />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {data.weeklyKPI.items.map(itemName => {
                    const cells = data.weeklyKPI.monthly[itemName] ?? [];
                    return (
                      <tr key={itemName} className="hover:bg-gray-50">
                        <td className="sticky left-0 z-10 bg-white hover:bg-gray-50 px-4 py-2 font-medium text-gray-800 border-r-2 border-gray-200 whitespace-nowrap">
                          {itemName}
                        </td>
                        {MONTHS.map(m => {
                          const cell = cells.find(c => c.month === m) ?? { month: m, target: null, actual: null, rate: null };
                          return <KpiCell key={m} cell={cell} itemName={itemName} />;
                        })}
                        <AnnualCell cells={cells} itemName={itemName} />
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

        ) : (

          /* ======= 現場KPI テーブル ======= */
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="text-sm w-full border-collapse">
                <thead className="bg-gray-50 border-b-2 border-gray-200">
                  <tr>
                    <th className="sticky left-0 z-10 bg-gray-50 px-4 py-3 text-left font-semibold text-gray-600 border-r-2 border-gray-200 min-w-[200px]">
                      項目
                    </th>
                    {MONTHS.map(m => (
                      <th key={m} className="px-2 py-3 text-center font-semibold text-gray-600 border-r border-gray-200 min-w-[80px]">
                        {m}月
                      </th>
                    ))}
                    <th className="px-2 py-3 text-center font-semibold text-blue-700 min-w-[80px] bg-blue-50">
                      年間
                    </th>
                  </tr>
                  <tr className="text-xs text-gray-400 bg-gray-50 border-b border-gray-200">
                    <td className="sticky left-0 z-10 bg-gray-50 px-4 py-1 border-r-2 border-gray-200">実績 / 目標 / 達成率</td>
                    {MONTHS.map(m => <td key={m} className="border-r border-gray-100" />)}
                    <td />
                  </tr>
                </thead>
                <tbody>
                  {siteGroups.map(group => (
                    <>
                      {/* カテゴリ見出し */}
                      <tr key={`hd-${group.mainItem}`} className="bg-gray-100 border-y border-gray-300">
                        <td
                          colSpan={14}
                          className="sticky left-0 z-10 bg-gray-100 px-4 py-2 font-bold text-gray-700 border-r-2 border-gray-200"
                        >
                          {group.mainItem}
                        </td>
                      </tr>
                      {/* サブ項目 */}
                      {group.items.map(({ subItem, key }) => {
                        const cells = data.siteKPI.monthly[key] ?? [];
                        return (
                          <tr key={key} className="hover:bg-gray-50 border-b border-gray-100">
                            <td className="sticky left-0 z-10 bg-white hover:bg-gray-50 px-4 py-2 pl-8 text-gray-700 border-r-2 border-gray-200 whitespace-nowrap">
                              {subItem}
                            </td>
                            {MONTHS.map(m => {
                              const cell = cells.find(c => c.month === m) ?? { month: m, target: null, actual: null, rate: null };
                              return <KpiCell key={m} cell={cell} itemName={subItem} />;
                            })}
                            <AnnualCell cells={cells} itemName={subItem} />
                          </tr>
                        );
                      })}
                    </>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
