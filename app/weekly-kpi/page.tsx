'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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

export default function WeeklyKPIPage() {
  const [data, setData] = useState<WeeklyKPIData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState(2026);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);

  useEffect(() => {
    fetchData();
  }, [selectedYear, selectedMonth]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/weekly-kpi?year=${selectedYear}&month=${selectedMonth}`);
      const result = await response.json();
      setData(result);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatNumber = (value: number | null): string => {
    if (value === null || value === undefined) return '—';
    return new Intl.NumberFormat('ja-JP', {
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatPercent = (value: number | null): string => {
    if (value === null || value === undefined) return '—';
    return `${(value * 100).toFixed(1)}%`;
  };

  const formatValue = (value: number | null, itemName: string): string => {
    if (value === null || value === undefined) return '—';

    // パーセンテージ項目
    if (itemName.includes('率')) {
      return formatPercent(value);
    }

    // 通常の数値
    return formatNumber(value);
  };

  const getAchievementColor = (rate: number | null): string => {
    if (rate === null || rate === undefined) return '';
    if (rate >= 1.0) return 'text-green-600';
    if (rate >= 0.8) return 'text-yellow-600';
    return 'text-red-600';
  };

  if (loading) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen bg-gray-50 p-8">
          <div className="max-w-[1800px] mx-auto">
            <div className="text-center py-12">読み込み中...</div>
          </div>
        </div>
      </>
    );
  }

  if (!data) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen bg-gray-50 p-8">
          <div className="max-w-[1800px] mx-auto">
            <div className="text-center py-12 text-red-600">データの取得に失敗しました</div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-[1800px] mx-auto">
          {/* ヘッダー */}
          <div className="mb-6">
            <div className="flex items-center justify-between">
              <h1 className="text-3xl font-bold text-gray-900">週次KPI（積極版）</h1>
              <div className="flex items-center gap-4">
                <label className="text-sm font-medium text-gray-700">年度:</label>
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value={2024}>2024年</option>
                  <option value={2025}>2025年</option>
                  <option value={2026}>2026年</option>
                </select>
                <label className="text-sm font-medium text-gray-700">月:</label>
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {Array.from({ length: 12 }, (_, i) => (
                    <option key={i + 1} value={i + 1}>{i + 1}月</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>{selectedMonth}月 週次KPI一覧</CardTitle>
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
                    {data.items.map((item, idx) => (
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
                                  {formatValue(weekData.actual, item.name)}
                                </div>
                                {/* 目標数 */}
                                {weekData.target !== null && (
                                  <div className="text-xs text-gray-500">
                                    {formatValue(weekData.target, item.name)}
                                  </div>
                                )}
                                {/* 達成率 */}
                                {weekData.achievementRate !== null && (
                                  <div className={`text-xs font-semibold ${getAchievementColor(weekData.achievementRate)}`}>
                                    {(weekData.achievementRate * 100).toFixed(1)}%
                                  </div>
                                )}
                              </div>
                            </td>
                          );
                        })}
                        {/* 累計 */}
                        <td className="px-2 py-3 text-center border-l-2 border-gray-300 bg-blue-50">
                          <div className="space-y-1">
                            {/* 実績数 */}
                            <div className="font-bold text-gray-900">
                              {formatValue(item.total.actual, item.name)}
                            </div>
                            {/* 目標数 */}
                            {item.total.target !== null && (
                              <div className="text-xs text-gray-600">
                                {formatValue(item.total.target, item.name)}
                              </div>
                            )}
                            {/* 達成率 */}
                            {item.total.achievementRate !== null && (
                              <div className={`text-xs font-bold ${getAchievementColor(item.total.achievementRate)}`}>
                                {(item.total.achievementRate * 100).toFixed(1)}%
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* 凡例 */}
          <div className="mt-6 p-4 bg-white rounded-lg border border-gray-200">
            <h3 className="text-sm font-semibold text-gray-700 mb-2">凡例</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div>
                <span className="font-semibold">達成率:</span>
                <span className="text-green-600 ml-2">■ 100%以上</span>
                <span className="text-yellow-600 ml-2">■ 80-100%</span>
                <span className="text-red-600 ml-2">■ 80%未満</span>
              </div>
              <div>
                <span className="font-semibold">集計期間:</span> 日曜日～土曜日
              </div>
              <div>
                <span className="font-semibold">—:</span> データなし
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
