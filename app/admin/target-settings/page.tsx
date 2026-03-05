'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Save, Target } from 'lucide-react';

// ％表記の項目かどうか
const isKpiPercent = (itemName: string) => itemName.includes('率');
const isSitePercent = (subItem: string) =>
  subItem.includes('率') ||
  subItem.includes('追客架電') ||
  subItem.includes('メイン商材ない人にアクション');

// 週次KPI項目
const KPI_ITEMS = [
  '問合件数', 'メインターゲット数', 'メインターゲット率',
  'meta広告問合せ', 'SR商談件数', 'MEET商談件数',
  '商談設定率', '受注件数', '受注率', '平均限界粗利単価',
  '施工部残業時間', '営業部残業時間',
];

// 週次現場KPI構造
const SITE_KPI_STRUCTURE = [
  { mainItem: '問合数', subItems: ['コンバージョン単価', 'ユーザー数', '指定物件ＳＮＳ投稿数'] },
  { mainItem: '商談件数', subItems: ['追客架電(商談前)', 'メイン商材ない人にアクション'] },
  { mainItem: '受注件数', subItems: ['ロープレ回数', '新規商談平均粗利額', '景山', '京屋', '中谷', '熊田', '大島', '森谷', '星野', '安栗', 'SR'] },
  { mainItem: '顧客満足向上', subItems: ['ありがとうカード配布数', 'ロコミ回収率'] },
  { mainItem: '不動産', subItems: ['交渉物件数'] },
  { mainItem: 'IT', subItems: ['商談件数', '成約率'] },
];

const MONTHS = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];
const BUDGET_LABELS: { key: string; label: string }[] = [
  { key: 'budgetSales', label: '売上目標' },
  { key: 'budgetGrossProfit', label: '売上総利益目標' },
  { key: 'budgetMarginProfit', label: '限界利益目標' },
  { key: 'budgetOperatingProfit', label: '営業利益目標' },
];

type TabKey = 'budget' | 'kpi' | 'site';

export default function TargetSettingsPage() {
  const router = useRouter();
  const [selectedYear, setSelectedYear] = useState(2026);
  const [activeTab, setActiveTab] = useState<TabKey>('budget');
  const [selectedMonth, setSelectedMonth] = useState(1);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // 月次予算データ
  const [budgetData, setBudgetData] = useState<Record<number, Record<string, string>>>({});

  // 週次KPI目標データ
  const [kpiTargets, setKpiTargets] = useState<Record<string, Record<string, string>>>({});

  // 週次現場KPI目標データ
  const [siteTargets, setSiteTargets] = useState<Record<string, Record<string, string>>>({});

  // --- 月次予算 ---
  const loadBudget = useCallback(async () => {
    const res = await fetch(`/api/admin/monthly-budget?year=${selectedYear}`);
    const data = await res.json();
    const formatted: Record<number, Record<string, string>> = {};
    (data.months || []).forEach((m: any) => {
      formatted[m.month] = {
        budgetSales: m.budgetSales?.toString() || '',
        budgetGrossProfit: m.budgetGrossProfit?.toString() || '',
        budgetMarginProfit: m.budgetMarginProfit?.toString() || '',
        budgetOperatingProfit: m.budgetOperatingProfit?.toString() || '',
      };
    });
    setBudgetData(formatted);
  }, [selectedYear]);

  // --- 週次KPI目標 ---
  const loadKpiTargets = useCallback(async () => {
    const res = await fetch(`/api/admin/weekly-kpi?year=${selectedYear}&month=${selectedMonth}`);
    const data = await res.json();
    const formatted: Record<string, Record<string, string>> = {};
    KPI_ITEMS.forEach((item) => {
      formatted[item] = { week1: '', week2: '', week3: '', week4: '', week5: '' };
    });
    (data.items || []).forEach((item: any) => {
      if (formatted[item.itemName]) {
        const pct = isKpiPercent(item.itemName);
        for (let w = 1; w <= 5; w++) {
          const raw = item[`week${w}Target`];
          formatted[item.itemName][`week${w}`] = raw != null ? (pct ? (raw * 100).toFixed(1) : raw.toString()) : '';
        }
      }
    });
    setKpiTargets(formatted);
  }, [selectedYear, selectedMonth]);

  // --- 週次現場KPI目標 ---
  const loadSiteTargets = useCallback(async () => {
    const res = await fetch(`/api/admin/weekly-site-kpi?year=${selectedYear}&month=${selectedMonth}`);
    const data = await res.json();
    const formatted: Record<string, Record<string, string>> = {};
    SITE_KPI_STRUCTURE.forEach(({ mainItem, subItems }) => {
      subItems.forEach((sub) => {
        formatted[`${mainItem}::${sub}`] = { week1: '', week2: '', week3: '', week4: '', week5: '' };
      });
    });
    (data.items || []).forEach((item: any) => {
      const key = `${item.mainItem}::${item.subItem}`;
      if (formatted[key]) {
        const pct = isSitePercent(item.subItem);
        for (let w = 1; w <= 5; w++) {
          const raw = item[`week${w}Target`];
          formatted[key][`week${w}`] = raw != null ? (pct ? (raw * 100).toFixed(1) : raw.toString()) : '';
        }
      }
    });
    setSiteTargets(formatted);
  }, [selectedYear, selectedMonth]);

  useEffect(() => {
    loadBudget();
  }, [loadBudget]);

  useEffect(() => {
    if (activeTab === 'kpi') loadKpiTargets();
    if (activeTab === 'site') loadSiteTargets();
  }, [activeTab, selectedMonth, loadKpiTargets, loadSiteTargets]);

  // 週の日付範囲
  const getWeekRange = (weekNum: number): string => {
    const firstDayOfWeek = new Date(selectedYear, selectedMonth - 1, 1).getDay();
    const lastDay = new Date(selectedYear, selectedMonth, 0).getDate();
    const daysToSaturday = (6 - firstDayOfWeek + 7) % 7;
    const week1End = 1 + daysToSaturday;
    if (weekNum === 1) return `1～${Math.min(week1End, lastDay)}`;
    const weekStart = week1End + 1 + (weekNum - 2) * 7;
    if (weekStart > lastDay) return '';
    return `${weekStart}～${Math.min(weekStart + 6, lastDay)}`;
  };

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3000);
  };

  // --- 保存: 月次予算 ---
  const saveBudget = async () => {
    setSaving(true);
    try {
      const months = Array.from({ length: 12 }, (_, i) => {
        const m = i + 1;
        const d = budgetData[m] || {};
        return { month: m, ...d };
      });
      const res = await fetch('/api/admin/monthly-budget', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ year: selectedYear, months }),
      });
      const result = await res.json();
      if (res.ok) showMessage('success', '月次予算を保存しました');
      else showMessage('error', result.error || '保存に失敗しました');
    } catch {
      showMessage('error', 'エラーが発生しました');
    } finally {
      setSaving(false);
    }
  };

  // --- 保存: 週次KPI目標 ---
  const saveKpiTargets = async () => {
    setSaving(true);
    try {
      const items = KPI_ITEMS.map((itemName) => {
        const pct = isKpiPercent(itemName);
        const toDb = (v: string) => pct && v !== '' ? (parseFloat(v) / 100).toString() : v;
        return {
          itemName,
          weeks: {
            week1: { target: toDb(kpiTargets[itemName]?.week1 || '') },
            week2: { target: toDb(kpiTargets[itemName]?.week2 || '') },
            week3: { target: toDb(kpiTargets[itemName]?.week3 || '') },
            week4: { target: toDb(kpiTargets[itemName]?.week4 || '') },
            week5: { target: toDb(kpiTargets[itemName]?.week5 || '') },
          },
        };
      });
      const res = await fetch('/api/admin/weekly-kpi', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ year: selectedYear, month: selectedMonth, items, mode: 'target' }),
      });
      const result = await res.json();
      if (res.ok) showMessage('success', `${selectedMonth}月の週次KPI目標を保存しました`);
      else showMessage('error', result.error || '保存に失敗しました');
    } catch {
      showMessage('error', 'エラーが発生しました');
    } finally {
      setSaving(false);
    }
  };

  // --- 保存: 週次現場KPI目標 ---
  const saveSiteTargets = async () => {
    setSaving(true);
    try {
      const items = SITE_KPI_STRUCTURE.flatMap(({ mainItem, subItems }) =>
        subItems.map((subItem) => {
          const key = `${mainItem}::${subItem}`;
          const pct = isSitePercent(subItem);
          const toDb = (v: string) => pct && v !== '' ? (parseFloat(v) / 100).toString() : v;
          return {
            mainItem, subItem,
            weeks: {
              week1: { target: toDb(siteTargets[key]?.week1 || '') },
              week2: { target: toDb(siteTargets[key]?.week2 || '') },
              week3: { target: toDb(siteTargets[key]?.week3 || '') },
              week4: { target: toDb(siteTargets[key]?.week4 || '') },
              week5: { target: toDb(siteTargets[key]?.week5 || '') },
            },
          };
        })
      );
      const res = await fetch('/api/admin/weekly-site-kpi', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ year: selectedYear, month: selectedMonth, items, mode: 'target' }),
      });
      const result = await res.json();
      if (res.ok) showMessage('success', `${selectedMonth}月の週次現場KPI目標を保存しました`);
      else showMessage('error', result.error || '保存に失敗しました');
    } catch {
      showMessage('error', 'エラーが発生しました');
    } finally {
      setSaving(false);
    }
  };

  const handleSave = () => {
    if (activeTab === 'budget') saveBudget();
    else if (activeTab === 'kpi') saveKpiTargets();
    else saveSiteTargets();
  };

  // --- 週次KPIコピー（前月から） ---
  const copyFromPrevMonth = async () => {
    if (selectedMonth === 1) return;
    const prevMonth = selectedMonth - 1;
    const res = await fetch(`/api/admin/weekly-kpi?year=${selectedYear}&month=${prevMonth}`);
    const data = await res.json();
    const formatted: Record<string, Record<string, string>> = {};
    KPI_ITEMS.forEach((item) => {
      formatted[item] = { week1: '', week2: '', week3: '', week4: '', week5: '' };
    });
    (data.items || []).forEach((item: any) => {
      if (formatted[item.itemName]) {
        const pct = isKpiPercent(item.itemName);
        for (let w = 1; w <= 5; w++) {
          const raw = item[`week${w}Target`];
          formatted[item.itemName][`week${w}`] = raw != null ? (pct ? (raw * 100).toFixed(1) : raw.toString()) : '';
        }
      }
    });
    setKpiTargets(formatted);
    showMessage('success', `${prevMonth}月の目標をコピーしました`);
  };

  const copyFromPrevMonthSite = async () => {
    if (selectedMonth === 1) return;
    const prevMonth = selectedMonth - 1;
    const res = await fetch(`/api/admin/weekly-site-kpi?year=${selectedYear}&month=${prevMonth}`);
    const data = await res.json();
    const formatted: Record<string, Record<string, string>> = {};
    SITE_KPI_STRUCTURE.forEach(({ mainItem, subItems }) => {
      subItems.forEach((sub) => {
        formatted[`${mainItem}::${sub}`] = { week1: '', week2: '', week3: '', week4: '', week5: '' };
      });
    });
    (data.items || []).forEach((item: any) => {
      const key = `${item.mainItem}::${item.subItem}`;
      if (formatted[key]) {
        const pct = isSitePercent(item.subItem);
        for (let w = 1; w <= 5; w++) {
          const raw = item[`week${w}Target`];
          formatted[key][`week${w}`] = raw != null ? (pct ? (raw * 100).toFixed(1) : raw.toString()) : '';
        }
      }
    });
    setSiteTargets(formatted);
    showMessage('success', `${prevMonth}月の目標をコピーしました`);
  };

  const tabClass = (tab: TabKey) =>
    `px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
      activeTab === tab
        ? 'border-blue-500 text-blue-600'
        : 'border-transparent text-gray-500 hover:text-gray-700'
    }`;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ヘッダー */}
      <header className="bg-white border-b sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <button onClick={() => router.back()} className="flex items-center text-gray-600 hover:text-gray-900 mr-4">
                <ArrowLeft className="h-5 w-5 mr-2" />
                戻る
              </button>
              <Target className="h-6 w-6 text-blue-600 mr-2" />
              <h1 className="text-2xl font-bold text-gray-900">目標設定モード</h1>
            </div>
            <div className="flex items-center gap-4">
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                className="px-3 py-2 border border-gray-300 rounded-lg"
              >
                {[2024, 2025, 2026, 2027].map((y) => (
                  <option key={y} value={y}>{y}年</option>
                ))}
              </select>
              <button
                onClick={handleSave}
                disabled={saving}
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
              >
                <Save className="h-4 w-4 mr-2" />
                {saving ? '保存中...' : '保存'}
              </button>
            </div>
          </div>
          {message && (
            <div className={`mt-3 p-3 rounded-lg ${message.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
              {message.text}
            </div>
          )}
        </div>
        {/* タブ */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex border-b border-gray-200">
            <button className={tabClass('budget')} onClick={() => setActiveTab('budget')}>月次予算</button>
            <button className={tabClass('kpi')} onClick={() => setActiveTab('kpi')}>週次KPI目標</button>
            <button className={tabClass('site')} onClick={() => setActiveTab('site')}>週次現場KPI目標</button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">

        {/* ===== 月次予算タブ ===== */}
        {activeTab === 'budget' && (
          <Card>
            <CardHeader>
              <CardTitle>{selectedYear}年 月次予算設定</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="border-b-2 border-gray-300 bg-gray-50">
                      <th className="px-4 py-3 text-left font-semibold text-gray-700 min-w-[60px]">月</th>
                      {BUDGET_LABELS.map((b) => (
                        <th key={b.key} className="px-4 py-3 text-center font-semibold text-gray-700 min-w-[160px]">{b.label}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => (
                      <tr key={month} className="border-b border-gray-200 hover:bg-gray-50">
                        <td className="px-4 py-3 font-semibold text-gray-900">{month}月</td>
                        {BUDGET_LABELS.map((b) => (
                          <td key={b.key} className="px-3 py-2">
                            <input
                              type="number"
                              value={budgetData[month]?.[b.key] || ''}
                              onChange={(e) =>
                                setBudgetData((prev) => ({
                                  ...prev,
                                  [month]: { ...prev[month], [b.key]: e.target.value },
                                }))
                              }
                              className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded text-right focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              placeholder="0"
                            />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ===== 週次KPI目標タブ ===== */}
        {activeTab === 'kpi' && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between flex-wrap gap-3">
                <CardTitle>{selectedYear}年 週次KPI目標設定</CardTitle>
                <div className="flex items-center gap-3">
                  <select
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  >
                    {MONTHS.map((label, i) => (
                      <option key={i + 1} value={i + 1}>{label}</option>
                    ))}
                  </select>
                  {selectedMonth > 1 && (
                    <button
                      onClick={copyFromPrevMonth}
                      className="px-3 py-2 text-sm border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                    >
                      前月からコピー
                    </button>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="border-b-2 border-gray-300 bg-gray-50">
                      <th className="sticky left-0 bg-gray-50 z-10 px-4 py-3 text-left font-semibold text-gray-700 border-r-2 border-gray-300 min-w-[180px]">項目</th>
                      {[1, 2, 3, 4, 5].map((w) => {
                        const range = getWeekRange(w);
                        return (
                          <th key={w} className="px-4 py-3 text-center font-semibold text-gray-700 border-r border-gray-200 min-w-[120px]">
                            <div>第{w}週</div>
                            {range && <div className="text-xs font-normal text-gray-500">{range}</div>}
                          </th>
                        );
                      })}
                    </tr>
                  </thead>
                  <tbody>
                    {KPI_ITEMS.map((itemName) => (
                      <tr key={itemName} className="border-b border-gray-200 hover:bg-gray-50">
                        <td className="sticky left-0 bg-white z-10 px-4 py-3 font-semibold text-gray-900 border-r-2 border-gray-300">{itemName}</td>
                        {[1, 2, 3, 4, 5].map((w) => {
                          const range = getWeekRange(w);
                          return (
                            <td key={w} className={`px-2 py-2 border-r border-gray-200 ${!range ? 'bg-gray-50' : ''}`}>
                              {range ? (
                                <div className="relative flex items-center">
                                  <input
                                    type="number"
                                    step="0.01"
                                    value={kpiTargets[itemName]?.[`week${w}`] || ''}
                                    onChange={(e) =>
                                      setKpiTargets((prev) => ({
                                        ...prev,
                                        [itemName]: { ...prev[itemName], [`week${w}`]: e.target.value },
                                      }))
                                    }
                                    className="w-full px-2 py-1 text-sm border border-gray-300 rounded text-center focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    placeholder="-"
                                  />
                                  {isKpiPercent(itemName) && (
                                    <span className="absolute right-1 text-xs text-gray-400 pointer-events-none">%</span>
                                  )}
                                </div>
                              ) : (
                                <div className="text-center text-gray-400 text-xs">—</div>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ===== 週次現場KPI目標タブ ===== */}
        {activeTab === 'site' && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between flex-wrap gap-3">
                <CardTitle>{selectedYear}年 週次現場KPI目標設定</CardTitle>
                <div className="flex items-center gap-3">
                  <select
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  >
                    {MONTHS.map((label, i) => (
                      <option key={i + 1} value={i + 1}>{label}</option>
                    ))}
                  </select>
                  {selectedMonth > 1 && (
                    <button
                      onClick={copyFromPrevMonthSite}
                      className="px-3 py-2 text-sm border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                    >
                      前月からコピー
                    </button>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="border-b-2 border-gray-300 bg-gray-50">
                      <th className="sticky left-0 bg-gray-50 z-10 px-4 py-3 text-left font-semibold text-gray-700 border-r-2 border-gray-300 min-w-[220px]">項目</th>
                      {[1, 2, 3, 4, 5].map((w) => {
                        const range = getWeekRange(w);
                        return (
                          <th key={w} className="px-4 py-3 text-center font-semibold text-gray-700 border-r border-gray-200 min-w-[120px]">
                            <div>第{w}週</div>
                            {range && <div className="text-xs font-normal text-gray-500">{range}</div>}
                          </th>
                        );
                      })}
                    </tr>
                  </thead>
                  <tbody>
                    {SITE_KPI_STRUCTURE.map(({ mainItem, subItems }) => (
                      <>
                        <tr key={`header-${mainItem}`} className="bg-gray-100 border-b border-gray-300">
                          <td colSpan={6} className="sticky left-0 bg-gray-100 z-10 px-4 py-2 font-bold text-gray-800 border-r-2 border-gray-300">
                            {mainItem}
                          </td>
                        </tr>
                        {subItems.map((subItem) => {
                          const key = `${mainItem}::${subItem}`;
                          return (
                            <tr key={key} className="border-b border-gray-200 hover:bg-gray-50">
                              <td className="sticky left-0 bg-white z-10 px-4 py-3 text-gray-700 border-r-2 border-gray-300 pl-8">{subItem}</td>
                              {[1, 2, 3, 4, 5].map((w) => {
                                const range = getWeekRange(w);
                                return (
                                  <td key={w} className={`px-2 py-2 border-r border-gray-200 ${!range ? 'bg-gray-50' : ''}`}>
                                    {range ? (
                                      <div className="relative flex items-center">
                                        <input
                                          type="number"
                                          step="0.01"
                                          value={siteTargets[key]?.[`week${w}`] || ''}
                                          onChange={(e) =>
                                            setSiteTargets((prev) => ({
                                              ...prev,
                                              [key]: { ...prev[key], [`week${w}`]: e.target.value },
                                            }))
                                          }
                                          className="w-full px-2 py-1 text-sm border border-gray-300 rounded text-center focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                          placeholder="-"
                                        />
                                        {isSitePercent(subItem) && (
                                          <span className="absolute right-1 text-xs text-gray-400 pointer-events-none">%</span>
                                        )}
                                      </div>
                                    ) : (
                                      <div className="text-center text-gray-400 text-xs">—</div>
                                    )}
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
        )}

        <div className="mt-6 p-4 bg-blue-50 rounded-lg">
          <h3 className="text-sm font-semibold text-blue-900 mb-1">目標設定モードについて</h3>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• 年に1回、各項目の目標数字を設定します</li>
            <li>• 目標を設定しても実績データには影響しません</li>
            <li>• 週次KPI・現場KPI目標は月ごとに設定します。「前月からコピー」で効率よく入力できます</li>
            <li>• パーセンテージ項目は小数で入力してください（例: 0.8 = 80%）</li>
            <li>• 金額項目は円単位で入力してください</li>
          </ul>
        </div>
      </main>
    </div>
  );
}
