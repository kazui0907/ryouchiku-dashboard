'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency, formatPercent } from '@/lib/utils';
import { ArrowLeft } from 'lucide-react';

interface MonthlyReport {
  year: number;
  month: number;
  salesRevenue: number;
  salesDiscount: number | null;
  costOfSales: number;
  grossProfit: number;
  grossProfitRate: number;
  marginProfit: number | null;
  marginProfitRate: number | null;
  sgaExpenses: number | null;
  operatingProfit: number | null;
  budgetSales: number | null;
  budgetMarginProfit: number | null;
  lastYearSalesRevenue: number | null;
  lastYearCostOfSales: number | null;
  lastYearGrossProfit: number | null;
  lastYearMarginProfit: number | null;
  lastYearOperatingProfit: number | null;
}

export default function MonthlyReportPage() {
  const params = useParams();
  const router = useRouter();
  const [data, setData] = useState<MonthlyReport | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const response = await fetch(`/api/reports/monthly?year=${params.year}&month=${params.month}`);
        const result = await response.json();
        setData(result);
      } catch (error) {
        console.error('データの取得に失敗:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [params.year, params.month]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-xl">読み込み中...</div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-xl">データがありません</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
          <button
            onClick={() => router.back()}
            className="flex items-center text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="h-5 w-5 mr-2" />
            戻る
          </button>
          <h1 className="text-3xl font-bold text-gray-900">
            月次レポート詳細
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            {data.year}年{data.month}月
          </p>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {/* 月次管理会計 - 比較表 */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>月次管理会計 - 実績・予算・昨年比較</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      項目
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      今月実績
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      予定数字
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      昨年実績
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      予算達成率
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      昨年対比
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {/* 売上高 */}
                  <tr className="bg-blue-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">
                      売上高
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-semibold">
                      {formatCurrency(data.salesRevenue)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-600">
                      {data.budgetSales ? formatCurrency(data.budgetSales) : '—'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-600">
                      {data.lastYearSalesRevenue ? formatCurrency(data.lastYearSalesRevenue) : '—'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                      {data.budgetSales ? (
                        <span className={data.salesRevenue >= data.budgetSales ? 'text-green-600 font-semibold' : 'text-red-600 font-semibold'}>
                          {formatPercent(data.salesRevenue / data.budgetSales)}
                        </span>
                      ) : '—'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                      {data.lastYearSalesRevenue ? (
                        <span className={data.salesRevenue >= data.lastYearSalesRevenue ? 'text-green-600 font-semibold' : 'text-red-600 font-semibold'}>
                          {formatPercent(data.salesRevenue / data.lastYearSalesRevenue)}
                        </span>
                      ) : '—'}
                    </td>
                  </tr>

                  {/* 売上原価 */}
                  <tr>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      売上原価
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-red-600">
                      {formatCurrency(data.costOfSales)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-600">
                      —
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-600">
                      {data.lastYearCostOfSales ? formatCurrency(data.lastYearCostOfSales) : '—'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-600">
                      —
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                      {data.lastYearCostOfSales ? (
                        <span className="text-gray-600">
                          {formatPercent(data.costOfSales / data.lastYearCostOfSales)}
                        </span>
                      ) : '—'}
                    </td>
                  </tr>

                  {/* 限界利益 */}
                  <tr className="bg-yellow-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">
                      限界利益
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-semibold text-orange-600">
                      {data.marginProfit ? formatCurrency(data.marginProfit) : '—'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-600">
                      {data.budgetMarginProfit ? formatCurrency(data.budgetMarginProfit) : '—'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-600">
                      {data.lastYearMarginProfit ? formatCurrency(data.lastYearMarginProfit) : '—'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                      {data.budgetMarginProfit && data.marginProfit ? (
                        <span className={data.marginProfit >= data.budgetMarginProfit ? 'text-green-600 font-semibold' : 'text-red-600 font-semibold'}>
                          {formatPercent(data.marginProfit / data.budgetMarginProfit)}
                        </span>
                      ) : '—'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                      {data.lastYearMarginProfit && data.marginProfit ? (
                        <span className={data.marginProfit >= data.lastYearMarginProfit ? 'text-green-600 font-semibold' : 'text-red-600 font-semibold'}>
                          {formatPercent(data.marginProfit / data.lastYearMarginProfit)}
                        </span>
                      ) : '—'}
                    </td>
                  </tr>

                  {/* 限界利益率 */}
                  <tr>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 pl-12">
                      限界利益率
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium">
                      {data.marginProfitRate ? formatPercent(data.marginProfitRate) : '—'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-600">
                      —
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-600">
                      —
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-600">
                      —
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-600">
                      —
                    </td>
                  </tr>

                  {/* 売上総利益 */}
                  <tr className="bg-green-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">
                      売上総利益
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-semibold text-green-600">
                      {formatCurrency(data.grossProfit)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-600">
                      —
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-600">
                      {data.lastYearGrossProfit ? formatCurrency(data.lastYearGrossProfit) : '—'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-600">
                      —
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                      {data.lastYearGrossProfit ? (
                        <span className={data.grossProfit >= data.lastYearGrossProfit ? 'text-green-600 font-semibold' : 'text-red-600 font-semibold'}>
                          {formatPercent(data.grossProfit / data.lastYearGrossProfit)}
                        </span>
                      ) : '—'}
                    </td>
                  </tr>

                  {/* 売上総利益率 */}
                  <tr>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 pl-12">
                      売上総利益率
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium">
                      {formatPercent(data.grossProfitRate)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-600">
                      —
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-600">
                      —
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-600">
                      —
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-600">
                      —
                    </td>
                  </tr>

                  {/* 営業利益 */}
                  {data.operatingProfit !== null && (
                    <>
                      <tr className="bg-purple-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">
                          営業利益
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-semibold text-purple-600">
                          {formatCurrency(data.operatingProfit)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-600">
                          —
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-600">
                          {data.lastYearOperatingProfit ? formatCurrency(data.lastYearOperatingProfit) : '—'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-600">
                          —
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                          {data.lastYearOperatingProfit ? (
                            <span className={data.operatingProfit >= data.lastYearOperatingProfit ? 'text-green-600 font-semibold' : 'text-red-600 font-semibold'}>
                              {formatPercent(data.operatingProfit / data.lastYearOperatingProfit)}
                            </span>
                          ) : '—'}
                        </td>
                      </tr>

                      {/* 営業利益率 */}
                      <tr>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 pl-12">
                          営業利益率
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium">
                          {formatPercent(data.operatingProfit / data.salesRevenue)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-600">
                          —
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-600">
                          —
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-600">
                          —
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-600">
                          —
                        </td>
                      </tr>
                    </>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* サマリーカード */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">売上達成率</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {data.budgetSales ? formatPercent(data.salesRevenue / data.budgetSales) : '—'}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                予算 vs 実績
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">限界利益達成率</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {data.budgetMarginProfit && data.marginProfit
                  ? formatPercent(data.marginProfit / data.budgetMarginProfit)
                  : '—'}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                予算 vs 実績
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">売上昨年対比</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {data.lastYearSalesRevenue
                  ? formatPercent(data.salesRevenue / data.lastYearSalesRevenue)
                  : '—'}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                前年同月比
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">限界利益率</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">
                {data.marginProfitRate ? formatPercent(data.marginProfitRate) : '—'}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                今月実績
              </p>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
