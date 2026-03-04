'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency, formatPercent, formatCompactCurrency } from '@/lib/utils';
import { ArrowLeft } from 'lucide-react';
import { MonthlyTrendChart } from '@/components/charts/MonthlyTrendChart';

interface AnnualData {
  year: number;
  totalSales: number;
  totalProfit: number;
  avgProfitRate: number;
  monthlyData: Array<{
    year: number;
    month: number;
    salesRevenue: number;
    grossProfit: number;
  }>;
}

export default function AnnualReportPage() {
  const router = useRouter();
  const [data, setData] = useState<AnnualData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const response = await fetch('/api/reports/annual?year=2026');
        const result = await response.json();
        setData(result);
      } catch (error) {
        console.error('データの取得に失敗:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

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
          <h1 className="text-3xl font-bold text-gray-900">年次サマリー</h1>
          <p className="mt-1 text-sm text-gray-500">{data.year}年度</p>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {/* サマリーカード */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-gray-600">年間売上高</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{formatCompactCurrency(data.totalSales)}</div>
              <p className="text-xs text-gray-500 mt-1">{formatCurrency(data.totalSales)}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-gray-600">年間売上総利益</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600">
                {formatCompactCurrency(data.totalProfit)}
              </div>
              <p className="text-xs text-gray-500 mt-1">{formatCurrency(data.totalProfit)}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-gray-600">平均利益率</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-600">
                {formatPercent(data.avgProfitRate)}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 月次推移グラフ */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>年間推移</CardTitle>
          </CardHeader>
          <CardContent>
            <MonthlyTrendChart data={data.monthlyData} />
          </CardContent>
        </Card>

        {/* 月別詳細テーブル */}
        <Card>
          <CardHeader>
            <CardTitle>月別詳細</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500">月</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500">
                      売上高
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500">
                      売上総利益
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500">
                      利益率
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {data.monthlyData.map((item) => {
                    const rate = item.salesRevenue > 0 ? item.grossProfit / item.salesRevenue : 0;
                    return (
                      <tr key={item.month}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          {item.month}月
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                          {formatCurrency(item.salesRevenue)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                          {formatCurrency(item.grossProfit)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium">
                          {formatPercent(rate)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
