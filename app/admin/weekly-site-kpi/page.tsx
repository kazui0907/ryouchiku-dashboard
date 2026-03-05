'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Save } from 'lucide-react';

// 現場KPI項目リスト (階層構造)
const SITE_KPI_STRUCTURE = [
  {
    mainItem: '問合数',
    subItems: ['コンバージョン単価', 'ユーザー数', '指定物件ＳＮＳ投稿数'],
  },
  {
    mainItem: '商談件数',
    subItems: ['追客架電（商談前）', 'メイン商材ない人にアクション'],
  },
  {
    mainItem: '受注件数',
    subItems: ['ロープレ回数'],
  },
  {
    mainItem: '平均限界利益額',
    subItems: [
      'MEET商談平均粗利額',
      '景山',
      '京屋',
      '中谷',
      '熊田',
      '大島',
      '森谷',
      '星野',
      '安栗',
      'SR商談平均粗利額',
      'SR_京屋',
      'SR_熊田',
      'SR_星野',
      'SR_安栗',
    ],
  },
  {
    mainItem: '顧客満足向上',
    subItems: ['ありがとうカード配布数', '口コミ回収率'],
  },
  {
    mainItem: '不動産',
    subItems: ['交渉物件数'],
  },
  {
    mainItem: 'IT',
    subItems: ['商談件数', '成約率'],
  },
];

// ％表記の項目かどうか（subItem名で判定）
const isPercentItem = (subItem: string) =>
  subItem.includes('率') ||
  subItem.includes('追客架電（商談前）') ||
  subItem.includes('メイン商材ない人にアクション');

interface WeekData {
  target: string;
  actual: string;
}

interface SiteKPIData {
  [key: string]: {
    week1: WeekData;
    week2: WeekData;
    week3: WeekData;
    week4: WeekData;
    week5: WeekData;
  };
}

export default function WeeklySiteKPIInputPage() {
  const router = useRouter();
  const [selectedYear, setSelectedYear] = useState(2026);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [kpiData, setKpiData] = useState<SiteKPIData>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    loadData();
  }, [selectedYear, selectedMonth]);

  const loadData = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/admin/weekly-site-kpi?year=${selectedYear}&month=${selectedMonth}`);
      const data = await response.json();

      const formattedData: SiteKPIData = {};
      SITE_KPI_STRUCTURE.forEach(({ mainItem, subItems }) => {
        subItems.forEach((subItem) => {
          const key = `${mainItem}::${subItem}`;
          formattedData[key] = {
            week1: { target: '', actual: '' },
            week2: { target: '', actual: '' },
            week3: { target: '', actual: '' },
            week4: { target: '', actual: '' },
            week5: { target: '', actual: '' },
          };
        });
      });

      if (data.items) {
        data.items.forEach((item: any) => {
          const key = `${item.mainItem}::${item.subItem}`;
          if (formattedData[key]) {
            const pct = isPercentItem(item.subItem);
            for (let w = 1; w <= 5; w++) {
              const rawTarget = item[`week${w}Target`];
              const rawActual = item[`week${w}Actual`];
              formattedData[key][`week${w}` as keyof typeof formattedData[typeof key]] = {
                target: rawTarget != null ? (pct ? (rawTarget * 100).toFixed(1) : rawTarget.toString()) : '',
                actual: rawActual != null ? (pct ? (rawActual * 100).toFixed(1) : rawActual.toString()) : '',
              };
            }
          }
        });
      }

      setKpiData(formattedData);
    } catch (error) {
      console.error('データ読み込みエラー:', error);
      const initialData: SiteKPIData = {};
      SITE_KPI_STRUCTURE.forEach(({ mainItem, subItems }) => {
        subItems.forEach((subItem) => {
          const key = `${mainItem}::${subItem}`;
          initialData[key] = {
            week1: { target: '', actual: '' },
            week2: { target: '', actual: '' },
            week3: { target: '', actual: '' },
            week4: { target: '', actual: '' },
            week5: { target: '', actual: '' },
          };
        });
      });
      setKpiData(initialData);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (key: string, week: string, field: 'target' | 'actual', value: string) => {
    setKpiData((prev) => ({
      ...prev,
      [key]: {
        ...prev[key],
        [week]: {
          ...prev[key][week as keyof typeof prev[typeof key]],
          [field]: value,
        },
      },
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);

    try {
      const items = Object.entries(kpiData).map(([key, weeks]) => {
        const [mainItem, subItem] = key.split('::');
        const pct = isPercentItem(subItem);
        const convertedWeeks: typeof weeks = {} as typeof weeks;
        for (let w = 1; w <= 5; w++) {
          const wk = `week${w}` as keyof typeof weeks;
          const wd = weeks[wk];
          convertedWeeks[wk] = {
            target: pct && wd.target !== '' ? (parseFloat(wd.target) / 100).toString() : wd.target,
            actual: pct && wd.actual !== '' ? (parseFloat(wd.actual) / 100).toString() : wd.actual,
          };
        }
        return { mainItem, subItem, weeks: convertedWeeks };
      });

      const response = await fetch('/api/admin/weekly-site-kpi', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          year: selectedYear,
          month: selectedMonth,
          items,
        }),
      });

      const result = await response.json();

      if (response.ok) {
        setMessage({ type: 'success', text: '保存しました' });
        await loadData();
      } else {
        setMessage({ type: 'error', text: result.error || '保存に失敗しました' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'エラーが発生しました' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">読み込み中...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center">
              <button
                onClick={() => router.back()}
                className="flex items-center text-gray-600 hover:text-gray-900 mr-4"
              >
                <ArrowLeft className="h-5 w-5 mr-2" />
                戻る
              </button>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900">週次現場KPI入力</h1>
            </div>
            <div className="flex flex-wrap items-center gap-2 sm:gap-4">
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
              >
                <option value={2024}>2024年</option>
                <option value={2025}>2025年</option>
                <option value={2026}>2026年</option>
              </select>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
              >
                {Array.from({ length: 12 }, (_, i) => (
                  <option key={i + 1} value={i + 1}>
                    {i + 1}月
                  </option>
                ))}
              </select>
              <button
                onClick={handleSave}
                disabled={saving}
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 text-sm"
              >
                <Save className="h-4 w-4 mr-2" />
                {saving ? '保存中...' : '保存'}
              </button>
            </div>
          </div>
          {message && (
            <div
              className={`mt-3 p-3 rounded-lg ${
                message.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
              }`}
            >
              {message.text}
            </div>
          )}
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
        <Card>
          <CardHeader>
            <CardTitle>{selectedMonth}月 週次現場KPI</CardTitle>
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
                        <th
                          key={week}
                          className="px-4 py-3 text-center font-semibold text-gray-700 border-r border-gray-200 min-w-[140px]"
                        >
                          <div>第{week}週</div>
                          {dateRange && <div className="text-xs font-normal text-gray-500">{dateRange}</div>}
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  {SITE_KPI_STRUCTURE.map(({ mainItem, subItems }, groupIdx) => (
                    <>
                      {subItems.map((subItem, subIdx) => {
                        const key = `${mainItem}::${subItem}`;
                        const isFirstInGroup = subIdx === 0;
                        const displayName = isFirstInGroup ? mainItem : '';

                        return (
                          <tr key={key} className="border-b border-gray-200 hover:bg-gray-50">
                            <td className="sticky left-0 bg-white z-10 px-4 py-3 border-r-2 border-gray-300">
                              {isFirstInGroup && (
                                <div className="font-semibold text-gray-900">{displayName}</div>
                              )}
                              <div className="text-gray-700 pl-4">　{subItem}</div>
                            </td>
                            {[1, 2, 3, 4, 5].map((week) => {
                              const weekKey = `week${week}` as keyof typeof kpiData[typeof key];
                              const weekData = kpiData[key]?.[weekKey];
                              return (
                                <td key={week} className="px-2 py-2 border-r border-gray-200">
                                  <div className="text-xs text-gray-400 text-center mb-1">
                                    目標: {weekData?.target !== '' && weekData?.target !== undefined
                                      ? `${weekData.target}${isPercentItem(subItem) ? '%' : ''}`
                                      : '—'}
                                  </div>
                                  <div className="relative flex items-center">
                                    <input
                                      type="number"
                                      step="0.01"
                                      value={weekData?.actual || ''}
                                      onChange={(e) =>
                                        handleInputChange(key, `week${week}`, 'actual', e.target.value)
                                      }
                                      className="w-full px-2 py-1 text-sm border border-gray-300 rounded text-center focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                      placeholder="-"
                                    />
                                    {isPercentItem(subItem) && (
                                      <span className="absolute right-1 text-xs text-gray-400 pointer-events-none">%</span>
                                    )}
                                  </div>
                                </td>
                              );
                            })}
                          </tr>
                        );
                      })}
                    </>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <div className="mt-6 p-4 bg-blue-50 rounded-lg">
          <h3 className="text-sm font-semibold text-blue-900 mb-2">入力方法</h3>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• 各週の目標と実績を入力してください</li>
            <li>• 入力後、「保存」ボタンをクリックしてデータを保存します</li>
            <li>• パーセンテージ項目は小数で入力してください (例: 0.8 = 80%)</li>
            <li>• 追客架電、メイン商材ない人にアクションはパーセンテージ項目です</li>
          </ul>
        </div>
      </main>
    </div>
  );
}
