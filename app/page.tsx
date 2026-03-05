'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  formatCurrency,
  formatPercent,
  formatCompactCurrency,
  getAchievementColor,
} from '@/lib/utils';
import { TrendingDown, DollarSign, Target, Users, AlertCircle } from 'lucide-react';
import { Navbar } from '@/components/Navbar';

interface WeekData {
  week: number;
  target: number | null;
  actual: number | null;
  achievementRate: number | null;
}

interface KPIItem {
  name: string;
  weeks: WeekData[];
  total: {
    target: number | null;
    actual: number | null;
    achievementRate: number | null;
  };
}

interface WeeklyKPIData {
  year: number;
  month: number;
  items: KPIItem[];
}

interface DashboardData {
  currentMonth: {
    salesRevenue: number;
    grossProfit: number;
    grossProfitRate: number;
    costOfSales: number;
    marginProfit: number | null;
    marginProfitRate: number | null;
    operatingProfit: number | null;
    budgetSales: number | null;
    budgetGrossProfit: number | null;
    budgetMarginProfit: number | null;
    budgetOperatingProfit: number | null;
    lastYearSalesRevenue: number | null;
    lastYearGrossProfit: number | null;
    lastYearMarginProfit: number | null;
    lastYearOperatingProfit: number | null;
  } | null;
  prevMonth: {
    salesRevenue: number;
    grossProfit: number;
    marginProfit: number | null;
  } | null;
  ytd: {
    salesRevenue: number;
    grossProfit: number;
    marginProfit: number;
    operatingProfit: number;
    budgetSales: number;
    budgetGrossProfit: number;
    budgetMarginProfit: number;
    budgetOperatingProfit: number;
    lastYearSalesRevenue: number;
    lastYearGrossProfit: number;
    lastYearMarginProfit: number;
    lastYearOperatingProfit: number;
  };
  weeklyKPIs: Array<{
    weekNumber: number;
    inquiryCount: number;
    inquiryTarget: number;
    orderCount: number | null;
    orderTarget: number | null;
  }>;
  weeklyTotals: {
    totalActual: number;
    totalTarget: number;
  };
  monthlyTrend: Array<{
    year: number;
    month: number;
    salesRevenue: number;
    grossProfit: number;
  }>;
}

export default function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [weeklyKPIData, setWeeklyKPIData] = useState<WeeklyKPIData | null>(null);
  const [weeklySiteKPIData, setWeeklySiteKPIData] = useState<WeeklyKPIData | null>(null);
  const [loading, setLoading] = useState(true);
  const currentDate = new Date();
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth() + 1);
  const [fromMonth, setFromMonth] = useState(1);
  const [toMonth, setToMonth] = useState(currentDate.getMonth() + 1);

  useEffect(() => {
    async function fetchData() {
      try {
        const [dashboardResponse, weeklyKPIResponse, weeklySiteKPIResponse] = await Promise.all([
          fetch(`/api/dashboard?year=${selectedYear}&month=${selectedMonth}&fromMonth=${fromMonth}&toMonth=${toMonth}`),
          fetch(`/api/weekly-kpi?year=${selectedYear}&month=${selectedMonth}`),
          fetch(`/api/weekly-site-kpi?year=${selectedYear}&month=${selectedMonth}`)
        ]);
        const dashboardResult = await dashboardResponse.json();
        const weeklyKPIResult = await weeklyKPIResponse.json();
        const weeklySiteKPIResult = await weeklySiteKPIResponse.json();
        setData(dashboardResult);
        setWeeklyKPIData(weeklyKPIResult);
        setWeeklySiteKPIData(weeklySiteKPIResult);
      } catch (error) {
        console.error('データの取得に失敗:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [selectedYear, selectedMonth, fromMonth, toMonth]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-xl">読み込み中...</div>
      </div>
    );
  }

  // 管理会計データがない場合でも、週次KPIデータがあれば表示
  if (!data && (!weeklyKPIData?.items?.length) && (!weeklySiteKPIData?.items?.length)) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-xl">データがありません</div>
      </div>
    );
  }

  const hasAccountingData = data && data.currentMonth;
  const { prevMonth, weeklyKPIs, weeklyTotals } = data || {
    prevMonth: null,
    weeklyKPIs: [],
    weeklyTotals: { totalActual: 0, totalTarget: 0 }
  };

  // ytdのデフォルト値
  const ytd = data?.ytd ?? {
    salesRevenue: 0,
    grossProfit: 0,
    marginProfit: 0,
    operatingProfit: 0,
    budgetSales: 0,
    budgetGrossProfit: 0,
    budgetMarginProfit: 0,
    budgetOperatingProfit: 0,
    lastYearSalesRevenue: 0,
    lastYearGrossProfit: 0,
    lastYearMarginProfit: 0,
    lastYearOperatingProfit: 0,
  };

  // currentMonthがnullの場合のデフォルト値
  const currentMonth = data?.currentMonth ?? {
    salesRevenue: 0,
    grossProfit: 0,
    grossProfitRate: 0,
    costOfSales: 0,
    marginProfit: null,
    marginProfitRate: null,
    operatingProfit: null,
    budgetSales: null,
    budgetGrossProfit: null,
    budgetMarginProfit: null,
    budgetOperatingProfit: null,
    lastYearSalesRevenue: null,
    lastYearGrossProfit: null,
    lastYearMarginProfit: null,
    lastYearOperatingProfit: null,
  };

  // 前月比の計算（管理会計データがある場合のみ）
  const salesGrowth = hasAccountingData && prevMonth && currentMonth
    ? ((currentMonth.salesRevenue - prevMonth.salesRevenue) / prevMonth.salesRevenue) * 100
    : 0;

  const profitGrowth = hasAccountingData && prevMonth && currentMonth
    ? ((currentMonth.grossProfit - prevMonth.grossProfit) / prevMonth.grossProfit) * 100
    : 0;

  const marginGrowth = hasAccountingData && prevMonth && prevMonth.marginProfit && currentMonth && currentMonth.marginProfit
    ? ((currentMonth.marginProfit - prevMonth.marginProfit) / prevMonth.marginProfit) * 100
    : 0;

  // 週次KPIの達成率
  const kpiAchievementRate =
    weeklyTotals?.totalTarget && weeklyTotals.totalTarget > 0
      ? weeklyTotals.totalActual / weeklyTotals.totalTarget
      : 0;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ナビゲーション */}
      <Navbar />
      {/* ヘッダー */}
      <header className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">ライフタイムサポート経営ダッシュボード</h1>
              <p className="mt-1 text-sm text-gray-500">
                選択中: {selectedYear}年{selectedMonth}月
              </p>
            </div>
            {/* 月選択 */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <label htmlFor="year-select" className="text-sm font-medium text-gray-700">
                  年:
                </label>
                <select
                  id="year-select"
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                  className="block rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-3 py-2 border"
                >
                  {[2022, 2023, 2024, 2025, 2026, 2027].map((year) => (
                    <option key={year} value={year}>
                      {year}年
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-2">
                <label htmlFor="month-select" className="text-sm font-medium text-gray-700">
                  月:
                </label>
                <select
                  id="month-select"
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                  className="block rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-3 py-2 border"
                >
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => (
                    <option key={month} value={month}>
                      {month}月
                    </option>
                  ))}
                </select>
              </div>
              <button
                onClick={() => {
                  setSelectedYear(currentDate.getFullYear());
                  setSelectedMonth(currentDate.getMonth() + 1);
                }}
                className="px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-800 border border-blue-600 rounded-md hover:bg-blue-50"
              >
                今月に戻る
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {/* 管理会計データがない場合のメッセージ */}
        {!hasAccountingData && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-8">
            <div className="flex items-center">
              <AlertCircle className="h-5 w-5 text-yellow-600 mr-2" />
              <p className="text-sm text-yellow-800">
                管理会計データがありません。Panel4のCSVデータをアップロードすると、売上・粗利などの経営指標が表示されます。
              </p>
            </div>
          </div>
        )}

        {/* 期間選択 */}
        {hasAccountingData && (
          <div className="flex items-center gap-3 mb-4 bg-white border border-gray-200 rounded-lg px-4 py-3">
            <span className="text-sm font-medium text-gray-700">累計期間:</span>
            <select
              value={fromMonth}
              onChange={(e) => {
                const val = parseInt(e.target.value);
                setFromMonth(val);
                if (val > toMonth) setToMonth(val);
              }}
              className="block rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm px-3 py-1.5 border"
            >
              {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                <option key={m} value={m}>{m}月</option>
              ))}
            </select>
            <span className="text-sm text-gray-500">〜</span>
            <select
              value={toMonth}
              onChange={(e) => {
                const val = parseInt(e.target.value);
                setToMonth(val);
                if (val < fromMonth) setFromMonth(val);
              }}
              className="block rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm px-3 py-1.5 border"
            >
              {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                <option key={m} value={m}>{m}月</option>
              ))}
            </select>
            {(fromMonth !== 1 || toMonth !== selectedMonth) && (
              <button
                onClick={() => { setFromMonth(1); setToMonth(selectedMonth); }}
                className="text-xs text-blue-600 hover:text-blue-800 underline ml-1"
              >
                リセット
              </button>
            )}
          </div>
        )}

        {/* 主要指標サマリー */}
        {hasAccountingData && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* 売上高 */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">売上高</CardTitle>
              <DollarSign className="h-4 w-4 text-gray-400" />
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div>
                  <div className="text-xs text-gray-500 mb-1">今月実績</div>
                  <div className="text-lg font-bold">
                    {formatCurrency(currentMonth.salesRevenue)}
                  </div>
                  {currentMonth.budgetSales && (
                    <div className="text-sm mt-1">
                      <span className="text-gray-500">達成率: </span>
                      <span className={`text-base font-bold ${
                        currentMonth.salesRevenue / currentMonth.budgetSales >= 1.0
                          ? 'text-green-600'
                          : currentMonth.salesRevenue / currentMonth.budgetSales >= 0.8
                          ? 'text-yellow-600'
                          : 'text-red-600'
                      }`}>
                        {formatPercent(currentMonth.salesRevenue / currentMonth.budgetSales)}
                      </span>
                    </div>
                  )}
                </div>
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span className="text-gray-500">目標:</span>
                    <span className="font-semibold">
                      {currentMonth.budgetSales ? formatCurrency(currentMonth.budgetSales) : '—'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">昨年:</span>
                    <span className="font-semibold">
                      {currentMonth.lastYearSalesRevenue ? formatCurrency(currentMonth.lastYearSalesRevenue) : '—'}
                    </span>
                  </div>
                </div>
                <div className="pt-2 border-t border-gray-200">
                  <div className="text-xs text-gray-500 mb-1">期間累計（{fromMonth}月〜{toMonth}月）</div>
                  <div className="text-base font-semibold text-blue-600">
                    {formatCurrency(ytd.salesRevenue)}
                  </div>
                  {ytd.budgetSales > 0 && (
                    <div className="text-sm mt-1">
                      <span className="text-gray-500">達成率: </span>
                      <span className={`text-base font-bold ${
                        ytd.salesRevenue / ytd.budgetSales >= 1.0
                          ? 'text-green-600'
                          : ytd.salesRevenue / ytd.budgetSales >= 0.8
                          ? 'text-yellow-600'
                          : 'text-red-600'
                      }`}>
                        {formatPercent(ytd.salesRevenue / ytd.budgetSales)}
                      </span>
                    </div>
                  )}
                  <div className="space-y-1 text-xs mt-2">
                    <div className="flex justify-between">
                      <span className="text-gray-500">目標:</span>
                      <span className="font-semibold">
                        {formatCurrency(ytd.budgetSales)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">昨年:</span>
                      <span className="font-semibold">
                        {formatCurrency(ytd.lastYearSalesRevenue)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 限界利益 */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">限界利益</CardTitle>
              <Target className="h-4 w-4 text-gray-400" />
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div>
                  <div className="text-xs text-gray-500 mb-1">今月実績</div>
                  <div className="text-lg font-bold">
                    {formatCurrency(currentMonth.marginProfit || 0)}
                  </div>
                  <div className="text-xs text-gray-600 mt-1">
                    率: {formatPercent(currentMonth.marginProfitRate || 0)}
                  </div>
                  {currentMonth.budgetMarginProfit && currentMonth.marginProfit !== null && (
                    <div className="text-sm mt-1">
                      <span className="text-gray-500">達成率: </span>
                      <span className={`text-base font-bold ${
                        currentMonth.marginProfit / currentMonth.budgetMarginProfit >= 1.0
                          ? 'text-green-600'
                          : currentMonth.marginProfit / currentMonth.budgetMarginProfit >= 0.8
                          ? 'text-yellow-600'
                          : 'text-red-600'
                      }`}>
                        {formatPercent(currentMonth.marginProfit / currentMonth.budgetMarginProfit)}
                      </span>
                    </div>
                  )}
                </div>
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span className="text-gray-500">目標:</span>
                    <span className="font-semibold">
                      {currentMonth.budgetMarginProfit ? formatCurrency(currentMonth.budgetMarginProfit) : '—'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">昨年:</span>
                    <span className="font-semibold">
                      {currentMonth.lastYearMarginProfit ? formatCurrency(currentMonth.lastYearMarginProfit) : '—'}
                    </span>
                  </div>
                </div>
                <div className="pt-2 border-t border-gray-200">
                  <div className="text-xs text-gray-500 mb-1">期間累計（{fromMonth}月〜{toMonth}月）</div>
                  <div className="text-base font-semibold text-blue-600">
                    {formatCurrency(ytd.marginProfit)}
                  </div>
                  {ytd.budgetMarginProfit > 0 && (
                    <div className="text-sm mt-1">
                      <span className="text-gray-500">達成率: </span>
                      <span className={`text-base font-bold ${
                        ytd.marginProfit / ytd.budgetMarginProfit >= 1.0
                          ? 'text-green-600'
                          : ytd.marginProfit / ytd.budgetMarginProfit >= 0.8
                          ? 'text-yellow-600'
                          : 'text-red-600'
                      }`}>
                        {formatPercent(ytd.marginProfit / ytd.budgetMarginProfit)}
                      </span>
                    </div>
                  )}
                  <div className="space-y-1 text-xs mt-2">
                    <div className="flex justify-between">
                      <span className="text-gray-500">目標:</span>
                      <span className="font-semibold">
                        {formatCurrency(ytd.budgetMarginProfit)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">昨年:</span>
                      <span className="font-semibold">
                        {formatCurrency(ytd.lastYearMarginProfit)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 売上総利益 */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">売上総利益</CardTitle>
              <Target className="h-4 w-4 text-gray-400" />
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div>
                  <div className="text-xs text-gray-500 mb-1">今月実績</div>
                  <div className="text-lg font-bold">
                    {formatCurrency(currentMonth.grossProfit)}
                  </div>
                  <div className="text-xs text-gray-600 mt-1">
                    率: {formatPercent(currentMonth.grossProfitRate)}
                  </div>
                  {currentMonth.budgetGrossProfit && (
                    <div className="text-sm mt-1">
                      <span className="text-gray-500">達成率: </span>
                      <span className={`text-base font-bold ${
                        currentMonth.grossProfit / currentMonth.budgetGrossProfit >= 1.0
                          ? 'text-green-600'
                          : currentMonth.grossProfit / currentMonth.budgetGrossProfit >= 0.8
                          ? 'text-yellow-600'
                          : 'text-red-600'
                      }`}>
                        {formatPercent(currentMonth.grossProfit / currentMonth.budgetGrossProfit)}
                      </span>
                    </div>
                  )}
                </div>
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span className="text-gray-500">目標:</span>
                    <span className="font-semibold">
                      {currentMonth.budgetGrossProfit ? formatCurrency(currentMonth.budgetGrossProfit) : '—'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">昨年:</span>
                    <span className="font-semibold">
                      {currentMonth.lastYearGrossProfit ? formatCurrency(currentMonth.lastYearGrossProfit) : '—'}
                    </span>
                  </div>
                </div>
                <div className="pt-2 border-t border-gray-200">
                  <div className="text-xs text-gray-500 mb-1">期間累計（{fromMonth}月〜{toMonth}月）</div>
                  <div className="text-base font-semibold text-blue-600">
                    {formatCurrency(ytd.grossProfit)}
                  </div>
                  {ytd.budgetGrossProfit > 0 && (
                    <div className="text-sm mt-1">
                      <span className="text-gray-500">達成率: </span>
                      <span className={`text-base font-bold ${
                        ytd.grossProfit / ytd.budgetGrossProfit >= 1.0
                          ? 'text-green-600'
                          : ytd.grossProfit / ytd.budgetGrossProfit >= 0.8
                          ? 'text-yellow-600'
                          : 'text-red-600'
                      }`}>
                        {formatPercent(ytd.grossProfit / ytd.budgetGrossProfit)}
                      </span>
                    </div>
                  )}
                  <div className="space-y-1 text-xs mt-2">
                    <div className="flex justify-between">
                      <span className="text-gray-500">目標:</span>
                      <span className="font-semibold">
                        {formatCurrency(ytd.budgetGrossProfit)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">昨年:</span>
                      <span className="font-semibold">
                        {formatCurrency(ytd.lastYearGrossProfit)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 営業利益 */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">営業利益</CardTitle>
              <Users className="h-4 w-4 text-gray-400" />
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div>
                  <div className="text-xs text-gray-500 mb-1">今月実績</div>
                  <div className="text-lg font-bold">
                    {currentMonth.operatingProfit !== null
                      ? formatCurrency(currentMonth.operatingProfit)
                      : '—'}
                  </div>
                  {currentMonth.operatingProfit !== null && currentMonth.salesRevenue > 0 && (
                    <div className="text-xs text-gray-600 mt-1">
                      率: {formatPercent(currentMonth.operatingProfit / currentMonth.salesRevenue)}
                    </div>
                  )}
                  {currentMonth.budgetOperatingProfit !== null && currentMonth.budgetOperatingProfit !== 0 && currentMonth.operatingProfit !== null && (
                    <div className="text-sm mt-1">
                      <span className="text-gray-500">達成率: </span>
                      <span className={`text-base font-bold ${
                        currentMonth.operatingProfit / currentMonth.budgetOperatingProfit >= 1.0
                          ? 'text-green-600'
                          : currentMonth.operatingProfit / currentMonth.budgetOperatingProfit >= 0.8
                          ? 'text-yellow-600'
                          : 'text-red-600'
                      }`}>
                        {formatPercent(currentMonth.operatingProfit / currentMonth.budgetOperatingProfit)}
                      </span>
                    </div>
                  )}
                </div>
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span className="text-gray-500">目標:</span>
                    <span className="font-semibold">
                      {currentMonth.budgetOperatingProfit !== null ? formatCurrency(currentMonth.budgetOperatingProfit) : '—'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">昨年:</span>
                    <span className="font-semibold">
                      {currentMonth.lastYearOperatingProfit !== null ? formatCurrency(currentMonth.lastYearOperatingProfit) : '—'}
                    </span>
                  </div>
                </div>
                <div className="pt-2 border-t border-gray-200">
                  <div className="text-xs text-gray-500 mb-1">期間累計（{fromMonth}月〜{toMonth}月）</div>
                  <div className="text-base font-semibold text-blue-600">
                    {ytd.operatingProfit !== null && ytd.operatingProfit !== undefined
                      ? formatCurrency(ytd.operatingProfit)
                      : '—'}
                  </div>
                  {ytd.budgetOperatingProfit !== null && ytd.budgetOperatingProfit !== 0 && ytd.operatingProfit !== null && (
                    <div className="text-sm mt-1">
                      <span className="text-gray-500">達成率: </span>
                      <span className={`text-base font-bold ${
                        ytd.operatingProfit / ytd.budgetOperatingProfit >= 1.0
                          ? 'text-green-600'
                          : ytd.operatingProfit / ytd.budgetOperatingProfit >= 0.8
                          ? 'text-yellow-600'
                          : 'text-red-600'
                      }`}>
                        {formatPercent(ytd.operatingProfit / ytd.budgetOperatingProfit)}
                      </span>
                    </div>
                  )}
                  <div className="space-y-1 text-xs mt-2">
                    <div className="flex justify-between">
                      <span className="text-gray-500">目標:</span>
                      <span className="font-semibold">
                        {ytd.budgetOperatingProfit !== null && ytd.budgetOperatingProfit !== undefined ? formatCurrency(ytd.budgetOperatingProfit) : '—'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">昨年:</span>
                      <span className="font-semibold">
                        {ytd.lastYearOperatingProfit !== null && ytd.lastYearOperatingProfit !== undefined ? formatCurrency(ytd.lastYearOperatingProfit) : '—'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
        )}

        {/* 週次KPI進捗（積極版） */}
        {weeklyKPIData?.items && (
          <Card className="mb-8">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>週次KPI進捗（積極版）</CardTitle>
                <div className="text-sm text-gray-500">
                  全{weeklyKPIData.items.length}項目
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="border-b-2 border-gray-300">
                      <th className="sticky left-0 bg-white z-10 px-4 py-3 text-left font-semibold text-gray-700 border-r-2 border-gray-300 min-w-[180px]">
                        項目
                      </th>
                      {[1, 2, 3, 4, 5].map((week) => {
                        // 週の日付範囲を計算（第1週は1日から最初の金曜日まで、以降は土曜日～金曜日）
                        const getWeekRange = (year: number, month: number, weekNum: number): string => {
                          const firstDay = new Date(year, month - 1, 1);
                          const firstDayOfWeek = firstDay.getDay(); // 0=日曜, 1=月, ..., 6=土
                          const lastDay = new Date(year, month, 0).getDate();

                          if (weekNum === 1) {
                            // 第1週: 1日から最初の金曜日まで
                            if (firstDayOfWeek === 6) {
                              // 1日が土曜日の場合は1～7（土～金）
                              return `1～${Math.min(7, lastDay)}`;
                            } else {
                              // 1日から最初の金曜日まで
                              const daysToFriday = (5 - firstDayOfWeek + 7) % 7 + 1;
                              const firstWeekEnd = daysToFriday;
                              return `1～${Math.min(firstWeekEnd, lastDay)}`;
                            }
                          } else {
                            // 第2週以降: 土曜日から金曜日
                            let weekStart: number;
                            if (firstDayOfWeek === 6) {
                              // 1日が土曜日の場合
                              weekStart = 1 + (weekNum - 1) * 7;
                            } else {
                              // 1日が土曜日以外の場合
                              const daysToFriday = (5 - firstDayOfWeek + 7) % 7 + 1;
                              weekStart = daysToFriday + 1 + (weekNum - 2) * 7;
                            }

                            const weekEnd = weekStart + 6;

                            // 範囲が月内に収まるか確認
                            if (weekStart > lastDay) {
                              return '';
                            }

                            const endDay = Math.min(weekEnd, lastDay);
                            return `${weekStart}～${endDay}`;
                          }
                        };

                        const dateRange = getWeekRange(selectedYear, selectedMonth, week);

                        return (
                          <th
                            key={week}
                            className="px-4 py-3 text-center font-semibold text-gray-700 border-r border-gray-200 min-w-[120px]"
                          >
                            <div>第{week}週</div>
                            {dateRange && <div className="text-xs font-normal text-gray-500">{dateRange}</div>}
                          </th>
                        );
                      })}
                      <th className="px-4 py-3 text-center font-semibold text-gray-700 border-l-2 border-gray-300 min-w-[120px]">
                        累計
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {weeklyKPIData.items.map((item, idx) => {
                      const formatValue = (value: number | null): string => {
                        if (value === null || value === undefined) return '—';
                        if (item.name.includes('率')) {
                          return `${(value * 100).toFixed(1)}%`;
                        }
                        return new Intl.NumberFormat('ja-JP', {
                          maximumFractionDigits: 0,
                        }).format(value);
                      };

                      const getColor = (rate: number | null): string => {
                        if (rate === null || rate === undefined) return '';
                        if (rate >= 1.0) return 'text-green-600';
                        if (rate >= 0.8) return 'text-yellow-600';
                        return 'text-red-600';
                      };

                      return (
                        <tr
                          key={idx}
                          className="border-b border-gray-200 hover:bg-gray-50"
                        >
                          <td className="sticky left-0 bg-white z-10 px-4 py-3 font-semibold text-gray-900 border-r-2 border-gray-300">
                            {item.name}
                          </td>
                          {[1, 2, 3, 4, 5].map((weekNum) => {
                            const weekData = item.weeks.find(w => w.week === weekNum);
                            if (!weekData) {
                              return (
                                <td key={weekNum} className="px-2 py-3 text-center border-r border-gray-200">
                                  <div className="text-gray-400">—</div>
                                </td>
                              );
                            }

                            return (
                              <td key={weekNum} className="px-2 py-3 text-center border-r border-gray-200">
                                <div className="space-y-1">
                                  {/* 実績数 */}
                                  <div className="font-semibold text-gray-900">
                                    {formatValue(weekData.actual)}
                                  </div>
                                  {/* 目標数 */}
                                  {weekData.target !== null && (
                                    <div className="text-xs text-gray-500">
                                      {formatValue(weekData.target)}
                                    </div>
                                  )}
                                  {/* 達成率 */}
                                  {weekData.achievementRate !== null && (
                                    <div className={`text-xs font-semibold ${getColor(weekData.achievementRate)}`}>
                                      {(weekData.achievementRate * 100).toFixed(1)}%
                                    </div>
                                  )}
                                </div>
                              </td>
                            );
                          })}
                          <td className="px-2 py-3 text-center border-l-2 border-gray-300 bg-blue-50">
                            <div className="space-y-1">
                              {/* 実績数 */}
                              <div className="font-bold text-gray-900">
                                {formatValue(item.total.actual)}
                              </div>
                              {/* 目標数 */}
                              {item.total.target !== null && (
                                <div className="text-xs text-gray-600">
                                  {formatValue(item.total.target)}
                                </div>
                              )}
                              {/* 達成率 */}
                              {item.total.achievementRate !== null && (
                                <div className={`text-xs font-bold ${getColor(item.total.achievementRate)}`}>
                                  {(item.total.achievementRate * 100).toFixed(1)}%
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* 週次現場KPI進捗 */}
        {weeklySiteKPIData && weeklySiteKPIData.items && weeklySiteKPIData.items.length > 0 && (() => {
          // mainItemごとにグループ化
          const siteGroups: { mainItem: string; items: any[] }[] = [];
          weeklySiteKPIData.items.forEach((item: any) => {
            const last = siteGroups[siteGroups.length - 1];
            if (last && last.mainItem === item.name) {
              last.items.push(item);
            } else {
              siteGroups.push({ mainItem: item.name, items: [item] });
            }
          });

          const formatSiteValue = (value: number | null, subName?: string, name?: string): string => {
            if (value === null || value === undefined) return '—';
            if ((name || '').includes('率') || (subName || '').includes('率') ||
                (subName || '').includes('追客架電') ||
                (subName || '').includes('メイン商材ない人にアクション')) {
              return `${(value * 100).toFixed(1)}%`;
            }
            return new Intl.NumberFormat('ja-JP', { maximumFractionDigits: 0 }).format(value);
          };

          const getSiteColor = (rate: number | null): string => {
            if (rate === null || rate === undefined) return '';
            if (rate >= 1.0) return 'text-green-600';
            if (rate >= 0.8) return 'text-yellow-600';
            return 'text-red-600';
          };

          return (
            <Card className="mb-8">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>週次現場KPI進捗</CardTitle>
                  <div className="text-sm text-gray-500">
                    全{weeklySiteKPIData.items.length}項目
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-sm">
                    <thead>
                      <tr className="border-b-2 border-gray-300">
                        <th className="sticky left-0 bg-white z-10 px-4 py-3 text-left font-semibold text-gray-700 border-r-2 border-gray-300 min-w-[220px]">
                          項目
                        </th>
                        {[1, 2, 3, 4, 5].map((week) => {
                          const getWeekRange = (year: number, month: number, weekNum: number): string => {
                            const firstDayOfWeek = new Date(year, month - 1, 1).getDay(); // 0=日, 6=土
                            const lastDay = new Date(year, month, 0).getDate();
                            const daysToSaturday = (6 - firstDayOfWeek + 7) % 7;
                            const week1End = 1 + daysToSaturday;
                            if (weekNum === 1) {
                              return `1～${Math.min(week1End, lastDay)}`;
                            } else {
                              const weekStart = week1End + 1 + (weekNum - 2) * 7;
                              if (weekStart > lastDay) return '';
                              return `${weekStart}～${Math.min(weekStart + 6, lastDay)}`;
                            }
                          };
                          const dateRange = getWeekRange(selectedYear, selectedMonth, week);
                          return (
                            <th key={week} className="px-4 py-3 text-center font-semibold text-gray-700 border-r border-gray-200 min-w-[120px]">
                              <div>第{week}週</div>
                              {dateRange && <div className="text-xs font-normal text-gray-500">{dateRange}</div>}
                            </th>
                          );
                        })}
                        <th className="px-4 py-3 text-center font-semibold text-gray-700 border-l-2 border-gray-300 min-w-[120px]">
                          累計
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {siteGroups.map((group) => (
                        <>
                          {/* カテゴリヘッダー行 */}
                          <tr key={`header-${group.mainItem}`} className="bg-gray-100 border-b border-gray-300">
                            <td colSpan={7} className="sticky left-0 bg-gray-100 z-10 px-4 py-2 font-bold text-gray-800 border-r-2 border-gray-300 text-base">
                              {group.mainItem}
                            </td>
                          </tr>
                          {/* サブ項目行 */}
                          {group.items.map((item: any, idx: number) => (
                            <tr key={`${group.mainItem}-${idx}`} className="border-b border-gray-200 hover:bg-gray-50">
                              <td className="sticky left-0 bg-white z-10 px-4 py-3 text-gray-700 border-r-2 border-gray-300 pl-8">
                                {item.subName || item.name}
                              </td>
                              {[1, 2, 3, 4, 5].map((weekNum) => {
                                const weekData = item.weeks.find((w: any) => w.week === weekNum);
                                if (!weekData) {
                                  return (
                                    <td key={weekNum} className="px-2 py-3 text-center border-r border-gray-200">
                                      <div className="text-gray-400">—</div>
                                    </td>
                                  );
                                }
                                return (
                                  <td key={weekNum} className="px-2 py-3 text-center border-r border-gray-200">
                                    <div className="space-y-1">
                                      <div className="font-semibold text-gray-900">
                                        {formatSiteValue(weekData.actual, item.subName, item.name)}
                                      </div>
                                      {weekData.target !== null && (
                                        <div className="text-xs text-gray-500">
                                          {formatSiteValue(weekData.target, item.subName, item.name)}
                                        </div>
                                      )}
                                      {weekData.achievementRate !== null && (
                                        <div className={`text-xs font-semibold ${getSiteColor(weekData.achievementRate)}`}>
                                          {(weekData.achievementRate * 100).toFixed(1)}%
                                        </div>
                                      )}
                                    </div>
                                  </td>
                                );
                              })}
                              <td className="px-2 py-3 text-center border-l-2 border-gray-300 bg-blue-50">
                                <div className="space-y-1">
                                  <div className="font-bold text-gray-900">
                                    {formatSiteValue(item.total.actual, item.subName, item.name)}
                                  </div>
                                  {item.total.target !== null && (
                                    <div className="text-xs text-gray-600">
                                      {formatSiteValue(item.total.target, item.subName, item.name)}
                                    </div>
                                  )}
                                  {item.total.achievementRate !== null && (
                                    <div className={`text-xs font-bold ${getSiteColor(item.total.achievementRate)}`}>
                                      {(item.total.achievementRate * 100).toFixed(1)}%
                                    </div>
                                  )}
                                </div>
                              </td>
                            </tr>
                          ))}
                        </>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          );
        })()}
      </main>
    </div>
  );
}
