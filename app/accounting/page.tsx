'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Navbar } from '@/components/Navbar';

interface MonthData {
  month: number;
  lastYear: number | null;
  budget: number | null;
  actual: number | null;
}

interface AccountingItem {
  category: string;
  subcategory: string;
  rowIndex: number;
  months: MonthData[];
}

interface AccountingData {
  year: number;
  items: AccountingItem[];
}

export default function AccountingPage() {
  const [data, setData] = useState<AccountingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState(2026);

  useEffect(() => {
    fetchData();
  }, [selectedYear]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/accounting-full?year=${selectedYear}`);
      const result = await response.json();
      setData(result);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number | null): string => {
    if (value === null || value === undefined) return '—';
    return new Intl.NumberFormat('ja-JP', {
      style: 'currency',
      currency: 'JPY',
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatPercent = (value: number | null): string => {
    if (value === null || value === undefined) return '—';
    return `${(value * 100).toFixed(1)}%`;
  };

  const calculateAchievementRate = (actual: number | null, budget: number | null): string => {
    if (actual === null || budget === null || budget === 0) return '—';
    const rate = actual / budget;
    return formatPercent(rate);
  };

  const calculateYoYRate = (current: number | null, lastYear: number | null): string => {
    if (current === null || lastYear === null || lastYear === 0) return '—';
    const rate = (current - lastYear) / lastYear;
    return `${rate >= 0 ? '+' : ''}${formatPercent(rate)}`;
  };

  const isRevenueItem = (category: string, subcategory: string): boolean => {
    // 収益・利益項目（多い方が良い）
    const label = category || subcategory;

    // 売上高関連
    if (label === '売上高' || subcategory === '売上高') return true;
    if (label === '売上高合計') return true;
    if (subcategory === '法人') return true;
    if (subcategory === '一般顧客') return true;

    // 利益項目（金額と率）
    if (label === '限界利益') return true;
    if (label === '限界利益率') return true;
    if (label === '売上総利益') return true;
    if (label === '売上総利益率') return true;
    if (label === '営業利益') return true;
    if (label === '営業利益率') return true;

    // それ以外はすべてコスト項目扱い（少ない方が良い）
    // 販売費及び一般管理費合計、販管費率などは少ない方が良い
    return false;
  };

  const getAchievementColor = (actual: number | null, budget: number | null, category: string, subcategory: string): string => {
    if (actual === null || budget === null || budget === 0) return '';
    const rate = actual / budget;
    const isRevenue = isRevenueItem(category, subcategory);

    // 収益項目（売上高、法人、一般顧客）: 多い方が良い（緑）、少ない方が悪い（赤）
    if (isRevenue) {
      if (rate >= 1.0) return 'text-green-600';   // 予算達成=良い
      if (rate >= 0.8) return 'text-yellow-600';  // 80-100%=注意
      return 'text-red-600';                       // 80%未満=悪い
    }

    // コスト項目（それ以外すべて）: 少ない方が良い（緑）、多い方が悪い（赤）
    if (rate <= 0.8) return 'text-green-600';   // 予算の80%以下=良い
    if (rate <= 1.0) return 'text-yellow-600';  // 予算の80-100%=注意
    return 'text-red-600';                       // 予算超過=悪い
  };

  const isPercentageRow = (category: string, subcategory: string): boolean => {
    const label = category || subcategory;
    return label.includes('率') || label.includes('%');
  };

  const getDisplayLabel = (item: AccountingItem): string => {
    if (item.subcategory) {
      return `　${item.subcategory}`;
    }
    return item.category;
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
      <div className="min-h-screen bg-gray-50 p-4 sm:p-8">
        <div className="max-w-[1800px] mx-auto">
          {/* ヘッダー */}
          <div className="mb-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <h1 className="text-xl sm:text-3xl font-bold text-gray-900">月次会計一覧（全項目）</h1>
              <div className="flex items-center gap-4">
                <label className="text-sm font-medium text-gray-700">年度:</label>
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                >
                  <option value={2024}>2024年</option>
                  <option value={2025}>2025年</option>
                  <option value={2026}>2026年</option>
                </select>
              </div>
            </div>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>全月比較表</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="border-b-2 border-gray-300">
                      <th className="sticky left-0 bg-white z-10 px-4 py-3 text-left font-semibold text-gray-700 border-r-2 border-gray-300 min-w-[200px]">
                        項目
                      </th>
                      {Array.from({ length: 12 }, (_, i) => (
                        <th
                          key={i + 1}
                          className="px-2 py-3 text-center font-semibold text-gray-700 border-r border-gray-200 min-w-[140px]"
                        >
                          {i + 1}月
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {data.items.map((item, idx) => {
                      const isPercent = isPercentageRow(item.category, item.subcategory);
                      const label = getDisplayLabel(item);
                      const isCategoryRow = !item.subcategory;

                      return (
                        <tr
                          key={`${item.category}-${item.subcategory}-${idx}`}
                          className={`border-b border-gray-200 hover:bg-gray-50 ${
                            isCategoryRow ? 'bg-gray-50 font-semibold' : ''
                          }`}
                        >
                          <td className="sticky left-0 bg-white z-10 px-4 py-2 text-gray-900 border-r-2 border-gray-300">
                            {label}
                          </td>
                          {item.months.map((monthData) => {
                            const value = monthData.actual;
                            const budget = monthData.budget;
                            const lastYear = monthData.lastYear;

                            return (
                              <td
                                key={monthData.month}
                                className="px-2 py-2 text-right border-r border-gray-200"
                              >
                                <div className="space-y-1">
                                  {/* 実績 */}
                                  <div className="font-semibold text-gray-900">
                                    {isPercent ? formatPercent(value) : formatCurrency(value)}
                                  </div>

                                  {!isPercent && (
                                    <>
                                      {/* 目標 */}
                                      {budget !== null && (
                                        <div className="text-xs text-gray-500">
                                          目標: {formatCurrency(budget)}
                                        </div>
                                      )}

                                      {/* 昨年 */}
                                      {lastYear !== null && (
                                        <div className="text-xs text-gray-500">
                                          昨年: {formatCurrency(lastYear)}
                                        </div>
                                      )}

                                      {/* 達成率 */}
                                      {budget !== null && budget !== 0 && value !== null && (
                                        <div className={`text-xs font-semibold ${getAchievementColor(value, budget, item.category, item.subcategory)}`}>
                                          達成: {calculateAchievementRate(value, budget)}
                                        </div>
                                      )}

                                      {/* 昨年対比 */}
                                      {lastYear !== null && lastYear !== 0 && value !== null && (
                                        <div className="text-xs text-gray-600">
                                          YoY: {calculateYoYRate(value, lastYear)}
                                        </div>
                                      )}
                                    </>
                                  )}
                                </div>
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* 凡例 */}
          <div className="mt-6 p-4 bg-white rounded-lg border border-gray-200">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">凡例</h3>
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <div className="font-semibold mb-1">達成率（収益・利益項目）:</div>
                  <div className="text-xs text-gray-600 mb-1">対象: 売上高、売上高合計、法人、一般顧客、限界利益、限界利益率、売上総利益、売上総利益率、営業利益、営業利益率</div>
                  <div className="text-xs text-gray-600 mb-1">→ 実績が多いほど良い</div>
                  <div className="ml-2">
                    <div><span className="text-green-600 font-bold">■ 緑:</span> 予算達成（100%以上）</div>
                    <div><span className="text-yellow-600 font-bold">■ 黄:</span> 80-100%未満</div>
                    <div><span className="text-red-600 font-bold">■ 赤:</span> 80%未満</div>
                  </div>
                </div>
                <div>
                  <div className="font-semibold mb-1">達成率（コスト項目）:</div>
                  <div className="text-xs text-gray-600 mb-1">対象: 売上原価、販売費及び一般管理費、販売費及び一般管理費合計、販管費率など（上記以外）</div>
                  <div className="text-xs text-gray-600 mb-1">→ 実績が少ないほど良い</div>
                  <div className="ml-2">
                    <div><span className="text-green-600 font-bold">■ 緑:</span> 予算の80%以下</div>
                    <div><span className="text-yellow-600 font-bold">■ 黄:</span> 80-100%</div>
                    <div><span className="text-red-600 font-bold">■ 赤:</span> 予算超過（100%超）</div>
                  </div>
                </div>
              </div>
              <div className="border-t pt-2 grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-gray-600">
                <div>
                  <span className="font-semibold">YoY:</span> 昨年対比（前年同月比）
                </div>
                <div>
                  <span className="font-semibold">—:</span> データなし
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
