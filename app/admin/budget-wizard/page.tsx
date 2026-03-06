'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, ArrowRight, Calculator, Save, CheckCircle } from 'lucide-react';

// 派生行（費用変更で自動再計算される）
const DERIVED_LABELS = ['売上総利益', '限界利益', '営業利益', '限界利益率'];
// 売上行（ロック・編集不可）
const SALES_LABELS = ['売上高合計'];
// 小計行（ロック）
const SUBTOTAL_LABELS = ['売上原価'];

const isLocked = (category: string) =>
  DERIVED_LABELS.includes(category) || SALES_LABELS.includes(category) || SUBTOTAL_LABELS.includes(category);

const parseInput = (s: string): number | null => {
  const cleaned = s.replace(/,/g, '').replace(/[¥￥]/g, '');
  const n = parseFloat(cleaned);
  return isNaN(n) ? null : n;
};

const fmt = (v: number | null | undefined) =>
  v == null ? '—' : Math.round(v).toLocaleString('ja-JP');

const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1);

interface MonthlyBudget {
  month: number;
  sales: number;
  grossProfit: number;
  marginProfit: number;
  operatingProfit: number;
}

interface LineItemRow {
  rowIndex: number;
  category: string;
  subcategory: string;
  monthBudgets: (number | null)[];
}

// 費用項目の変更から利益を再計算する
function recalcDerived(items: LineItemRow[]): LineItemRow[] {
  const sorted = [...items].sort((a, b) => a.rowIndex - b.rowIndex);

  const findIdx = (label: string) => sorted.findIndex((li) => li.category === label);
  const salesIdx = findIdx('売上高合計');
  const cogsIdx = findIdx('売上原価');
  const gpIdx = findIdx('売上総利益');
  const mpIdx = findIdx('限界利益');
  const opIdx = findIdx('営業利益');
  const mrIdx = findIdx('限界利益率');

  if (salesIdx === -1) return items;

  const updated = sorted.map((li) => ({ ...li, monthBudgets: [...li.monthBudgets] }));

  for (let mi = 0; mi < 12; mi++) {
    const sales = updated[salesIdx]?.monthBudgets[mi] ?? 0;

    // 売上原価セクション（売上原価行 〜 売上総利益行の間）の費用合計
    const cogsItems =
      cogsIdx !== -1 && gpIdx !== -1
        ? updated.filter((li) => li.rowIndex > updated[cogsIdx].rowIndex && li.rowIndex < updated[gpIdx].rowIndex && !isLocked(li.category))
        : [];
    const totalCogs = cogsItems.reduce((s, li) => s + (li.monthBudgets[mi] ?? 0), 0);

    // 売上総利益 = 売上 - 売上原価合計
    const grossProfit = gpIdx !== -1 ? sales - totalCogs : null;
    if (gpIdx !== -1 && grossProfit !== null) updated[gpIdx].monthBudgets[mi] = grossProfit;

    // 変動費セクション（売上総利益行 〜 限界利益行の間）の費用合計
    const varItems =
      gpIdx !== -1 && mpIdx !== -1
        ? updated.filter((li) => li.rowIndex > updated[gpIdx].rowIndex && li.rowIndex < updated[mpIdx].rowIndex && !isLocked(li.category))
        : [];
    const totalVar = varItems.reduce((s, li) => s + (li.monthBudgets[mi] ?? 0), 0);

    // 限界利益 = 売上総利益 - 変動費
    const marginProfit = mpIdx !== -1 && grossProfit !== null ? grossProfit - totalVar : null;
    if (mpIdx !== -1 && marginProfit !== null) updated[mpIdx].monthBudgets[mi] = marginProfit;

    // 限界利益率
    if (mrIdx !== -1 && sales > 0 && marginProfit !== null) {
      updated[mrIdx].monthBudgets[mi] = (marginProfit / sales) * 100;
    }

    // 固定費セクション（限界利益行 〜 営業利益行の間）の費用合計
    const sgaItems =
      mpIdx !== -1 && opIdx !== -1
        ? updated.filter((li) => li.rowIndex > updated[mpIdx].rowIndex && li.rowIndex < updated[opIdx].rowIndex && !isLocked(li.category))
        : [];
    const totalSga = sgaItems.reduce((s, li) => s + (li.monthBudgets[mi] ?? 0), 0);

    // 営業利益 = 限界利益 - 固定費
    const operatingProfit = opIdx !== -1 && marginProfit !== null ? marginProfit - totalSga : null;
    if (opIdx !== -1 && operatingProfit !== null) updated[opIdx].monthBudgets[mi] = operatingProfit;
  }

  return updated;
}

export default function BudgetWizardPage() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear + 1);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [loading, setLoading] = useState(false);

  // Step 1
  const [annualTargets, setAnnualTargets] = useState({
    sales: '',
    grossProfit: '',
    marginProfit: '',
    operatingProfit: '',
  });

  // Step 2
  const [monthlyBudgets, setMonthlyBudgets] = useState<MonthlyBudget[]>([]);

  // Step 3
  const [lineItems, setLineItems] = useState<LineItemRow[]>([]);
  const [apiData, setApiData] = useState<any>(null);

  // ─── Step 1 → Step 2 ───
  const handleCalculate = async () => {
    const sales = parseInput(annualTargets.sales);
    if (!sales) {
      setMessage({ type: 'error', text: '売上目標を入力してください' });
      return;
    }
    setLoading(true);
    setMessage(null);

    try {
      const res = await fetch(`/api/admin/budget-wizard?targetYear=${selectedYear}`);
      const data = await res.json();

      const historicalMonthly: any[] = data.historicalMonthly || [];

      // 月ごとに過去データの平均売上を集計
      const monthSum: Record<number, { sales: number; count: number }> = {};
      for (let m = 1; m <= 12; m++) monthSum[m] = { sales: 0, count: 0 };

      for (const row of historicalMonthly) {
        const m = row.month;
        if (row.salesRevenue && row.salesRevenue > 0) {
          monthSum[m].sales += row.salesRevenue;
          monthSum[m].count++;
        }
      }

      // 12ヶ月すべてにデータがある場合のみ過去比率を使用、それ以外は均等割
      const hasAllMonths = MONTHS.every((m) => monthSum[m].count > 0);

      let salesRatios: number[];
      if (hasAllMonths) {
        const monthAvgSales = MONTHS.map((m) => monthSum[m].sales / monthSum[m].count);
        const total = monthAvgSales.reduce((s, v) => s + v, 0);
        salesRatios = monthAvgSales.map((v) => (total > 0 ? v / total : 1 / 12));
      } else {
        salesRatios = Array(12).fill(1 / 12);
      }

      const gp = parseInput(annualTargets.grossProfit);
      const mp = parseInput(annualTargets.marginProfit);
      const op = parseInput(annualTargets.operatingProfit);

      // 月次予算 = 年間目標 × 月比率（12ヶ月合計が年間目標と一致）
      const computed: MonthlyBudget[] = MONTHS.map((m, i) => ({
        month: m,
        sales: Math.round(sales * salesRatios[i]),
        grossProfit: Math.round((gp || 0) * salesRatios[i]),
        marginProfit: Math.round((mp || 0) * salesRatios[i]),
        operatingProfit: Math.round((op || 0) * salesRatios[i]),
      }));

      setMonthlyBudgets(computed);
      setApiData(data);

      // Step 3 のデータも計算
      prepareLineItems(data, computed);

      setStep(2);
    } catch {
      setMessage({ type: 'error', text: 'データの取得に失敗しました' });
    } finally {
      setLoading(false);
    }
  };

  const prepareLineItems = (data: any, budgets: MonthlyBudget[]) => {
    const currentLineItems: any[] = data.currentLineItems || [];
    const historicalLineItems: any[] = data.historicalLineItems || [];
    const historicalMonthly: any[] = data.historicalMonthly || [];

    const monthlySalesMap: Record<string, number> = {};
    for (const row of historicalMonthly) {
      monthlySalesMap[`${row.year}_${row.month}`] = row.salesRevenue || 0;
    }
    const years = [...new Set(historicalLineItems.map((li: any) => li.year as number))];

    const rows: LineItemRow[] = currentLineItems.map((item: any) => {
      const monthBudgets: (number | null)[] = MONTHS.map((month, mi) => {
        // 派生行は月次予算から初期値をセット（後でrecalcが上書き）
        if (item.category === '売上高合計') return budgets[mi].sales;
        if (item.category === '売上総利益') return budgets[mi].grossProfit;
        if (item.category === '限界利益') return budgets[mi].marginProfit;
        if (item.category === '営業利益') return budgets[mi].operatingProfit;
        if (item.category === '限界利益率') return null;

        const targetSales = budgets[mi].sales;
        if (!targetSales) return null;

        // 過去3カ年の比率平均
        const ratios: number[] = [];
        for (const yr of years) {
          const histItem = historicalLineItems.find(
            (li: any) => li.year === yr && li.rowIndex === item.rowIndex
          );
          const sales = monthlySalesMap[`${yr}_${month}`] || 0;
          if (histItem && sales > 0) {
            const md = histItem.months?.find((m: any) => m.month === month);
            if (md?.actual != null) ratios.push(md.actual / sales);
          }
        }
        const avgRatio = ratios.length > 0 ? ratios.reduce((a, b) => a + b, 0) / ratios.length : 0;
        return avgRatio !== 0 ? Math.round(targetSales * avgRatio) : null;
      });

      return { rowIndex: item.rowIndex, category: item.category, subcategory: item.subcategory, monthBudgets };
    });

    // 初期recalc
    setLineItems(recalcDerived(rows));
  };

  // Step 2 の月次予算を編集したとき → Step3のデータも更新
  const updateMonthlyBudget = (month: number, field: keyof Omit<MonthlyBudget, 'month'>, value: string) => {
    const num = parseInput(value) ?? 0;
    setMonthlyBudgets((prev) => prev.map((m) => (m.month === month ? { ...m, [field]: num } : m)));
  };

  // Step 3 の費用行を編集したとき → 派生行を再計算
  const updateLineItem = (rowIndex: number, monthIdx: number, value: string) => {
    const num = parseInput(value);
    setLineItems((prev) => {
      const updated = prev.map((li) => {
        if (li.rowIndex !== rowIndex) return li;
        const newBudgets = [...li.monthBudgets];
        newBudgets[monthIdx] = num;
        return { ...li, monthBudgets: newBudgets };
      });
      return recalcDerived(updated);
    });
  };

  // Step 2 → Step 3: 最新の月次予算で費用項目を再組み立て
  const handleGoToStep3 = () => {
    if (apiData) {
      prepareLineItems(apiData, monthlyBudgets);
    }
    setStep(3);
  };

  // Step 3 → Step 4 (確認画面)
  const handleGoToConfirm = () => setStep(4);

  // 保存
  const handleSave = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const payload = {
        year: selectedYear,
        monthlyBudgets: monthlyBudgets.map((m) => ({
          month: m.month,
          budgetSales: m.sales,
          budgetGrossProfit: m.grossProfit,
          budgetMarginProfit: m.marginProfit,
          budgetOperatingProfit: m.operatingProfit,
        })),
        lineItemBudgets: lineItems
          .filter((li) => !isLocked(li.category))
          .map((li) => ({
            rowIndex: li.rowIndex,
            monthBudgets: li.monthBudgets.map((budget, i) => ({ month: i + 1, budget })),
          })),
      };

      const res = await fetch('/api/admin/budget-wizard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const result = await res.json();
      if (res.ok) {
        setMessage({ type: 'success', text: `${selectedYear}年度の予算データを保存しました` });
      } else {
        setMessage({ type: 'error', text: result.error || '保存に失敗しました' });
      }
    } catch {
      setMessage({ type: 'error', text: 'エラーが発生しました' });
    } finally {
      setSaving(false);
    }
  };

  const totalMonthly = (field: keyof Omit<MonthlyBudget, 'month'>) =>
    monthlyBudgets.reduce((s, m) => s + (m[field] || 0), 0);

  const stepLabels = ['1. 年間目標', '2. 月次配分', '3. 詳細項目', '4. 確認・決定'];

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center">
              <button
                onClick={() => (step === 1 ? router.back() : setStep((s) => (s - 1) as any))}
                className="flex items-center text-gray-600 hover:text-gray-900 mr-4"
              >
                <ArrowLeft className="h-5 w-5 mr-2" />
                {step === 1 ? '戻る' : '前へ'}
              </button>
              <h1 className="text-xl font-bold text-gray-900">
                予算設定ウィザード — {selectedYear}年度
              </h1>
            </div>
            <div className="flex items-center gap-1 text-sm">
              {stepLabels.map((label, i) => (
                <span key={i} className="flex items-center gap-1">
                  <span
                    className={`px-2 py-1 rounded font-medium ${
                      step === i + 1
                        ? 'bg-blue-600 text-white'
                        : step > i + 1
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-100 text-gray-500'
                    }`}
                  >
                    {label}
                  </span>
                  {i < 3 && <span className="text-gray-300">→</span>}
                </span>
              ))}
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

        {/* ── Step 1: 年間目標入力 ── */}
        {step === 1 && (
          <Card>
            <CardHeader>
              <CardTitle>年間目標を入力</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-500 mb-6">
                年間の目標数字を入力して「計算」を押すと、過去3カ年の月次比率をもとに月別予算が自動計算されます。
              </p>
              <div className="flex items-center gap-3 mb-6">
                <label className="text-sm font-medium text-gray-700">対象年度</label>
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                  className="px-3 py-2 border border-gray-300 rounded-lg"
                >
                  {Array.from({ length: 8 }, (_, i) => currentYear - 2 + i).map((yr) => (
                    <option key={yr} value={yr}>{yr}年</option>
                  ))}
                </select>
              </div>
              <div className="max-w-md space-y-4">
                {[
                  { label: '売上目標', key: 'sales' as const },
                  { label: '売上総利益目標', key: 'grossProfit' as const },
                  { label: '限界利益目標', key: 'marginProfit' as const },
                  { label: '営業利益目標', key: 'operatingProfit' as const },
                ].map(({ label, key }) => (
                  <div key={key}>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={annualTargets[key]}
                        onChange={(e) => setAnnualTargets((prev) => ({ ...prev, [key]: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        placeholder="例: 100000000"
                      />
                      <span className="text-sm text-gray-500 whitespace-nowrap">円</span>
                    </div>
                    {annualTargets[key] && (
                      <p className="text-xs text-gray-400 mt-1">
                        = ¥{parseInput(annualTargets[key])?.toLocaleString('ja-JP') ?? '—'}
                      </p>
                    )}
                  </div>
                ))}
              </div>
              <div className="mt-8">
                <button
                  onClick={handleCalculate}
                  disabled={loading}
                  className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 font-medium text-base"
                >
                  <Calculator className="h-5 w-5 mr-2" />
                  {loading ? '計算中...' : '計算して月次配分へ'}
                </button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ── Step 2: 月次配分 ── */}
        {step === 2 && (
          <Card>
            <CardHeader>
              <CardTitle>月次予算配分を確認・調整</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-500 mb-4">
                過去3カ年の月次実績比率で自動計算しました。数値を調整してから「詳細項目へ」を押してください。
              </p>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="border-b-2 border-gray-300 bg-gray-50">
                      <th className="px-3 py-2 text-left font-semibold text-gray-700 w-16">月</th>
                      <th className="px-3 py-2 text-right font-semibold text-gray-700">売上</th>
                      <th className="px-3 py-2 text-right font-semibold text-gray-700">売上総利益</th>
                      <th className="px-3 py-2 text-right font-semibold text-gray-700">限界利益</th>
                      <th className="px-3 py-2 text-right font-semibold text-gray-700">営業利益</th>
                    </tr>
                  </thead>
                  <tbody>
                    {monthlyBudgets.map((m) => (
                      <tr key={m.month} className="border-b border-gray-200 hover:bg-gray-50">
                        <td className="px-3 py-2 font-medium text-gray-900">{m.month}月</td>
                        {(['sales', 'grossProfit', 'marginProfit', 'operatingProfit'] as const).map((field) => (
                          <td key={field} className="px-2 py-1">
                            <input
                              type="text"
                              value={m[field] !== 0 ? m[field].toLocaleString('ja-JP') : ''}
                              onChange={(e) => updateMonthlyBudget(m.month, field, e.target.value)}
                              className="w-full px-2 py-1 text-sm border border-gray-300 rounded text-right focus:ring-2 focus:ring-blue-500"
                              placeholder="0"
                            />
                          </td>
                        ))}
                      </tr>
                    ))}
                    <tr className="border-t-2 border-gray-400 bg-blue-50 font-semibold">
                      <td className="px-3 py-2 text-gray-900">合計</td>
                      {(['sales', 'grossProfit', 'marginProfit', 'operatingProfit'] as const).map((field) => (
                        <td key={field} className="px-3 py-2 text-right text-gray-900">
                          ¥{totalMonthly(field).toLocaleString('ja-JP')}
                        </td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </div>
              <div className="mt-4 p-3 bg-yellow-50 rounded-lg text-sm text-yellow-800">
                合計行が年間目標と一致しているか確認してください。ずれている場合は各月の数値を調整してください。
              </div>
              <div className="mt-6 flex justify-end">
                <button
                  onClick={handleGoToStep3}
                  className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
                >
                  詳細項目へ
                  <ArrowRight className="h-5 w-5 ml-2" />
                </button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ── Step 3: 詳細費用項目 ── */}
        {step === 3 && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>詳細費用項目を確認・調整</CardTitle>
                <span className="text-sm text-gray-500">費用を変更すると利益が自動で再計算されます</span>
              </div>
            </CardHeader>
            <CardContent>
              <div className="mb-3 flex gap-4 text-xs items-center">
                <span className="flex items-center gap-1"><span className="inline-block w-3 h-3 bg-blue-100 border border-blue-300 rounded"></span>集計・利益行（自動計算）</span>
                <span className="flex items-center gap-1"><span className="inline-block w-3 h-3 bg-white border border-gray-300 rounded"></span>費用明細（編集可）</span>
                <span className="ml-auto text-gray-400">{lineItems.length}行読み込み済み（参照年度: {apiData?.lineItemsYear ?? '—'}年）</span>
              </div>
              {lineItems.length === 0 && (
                <div className="p-6 text-center text-gray-500 bg-yellow-50 rounded-lg mb-4">
                  費用項目が見つかりません。先に「CSVアップロード」から月次予測CSVを登録してください。
                </div>
              )}
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-xs">
                  <thead>
                    <tr className="border-b-2 border-gray-300 bg-gray-50">
                      <th className="sticky left-0 bg-gray-50 z-10 px-3 py-2 text-left font-semibold text-gray-700 min-w-[220px] border-r border-gray-300">
                        項目
                      </th>
                      {MONTHS.map((m) => (
                        <th key={m} className="px-2 py-2 text-center font-semibold text-gray-700 min-w-[80px]">
                          {m}月
                        </th>
                      ))}
                      <th className="px-2 py-2 text-center font-semibold text-gray-700 min-w-[90px] bg-gray-100">年間合計</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lineItems.map((li) => {
                      const locked = isLocked(li.category);
                      const isDerived = DERIVED_LABELS.includes(li.category);
                      const isSales = SALES_LABELS.includes(li.category);
                      const rowTotal = li.monthBudgets.reduce((s, v) => s + (v ?? 0), 0);

                      return (
                        <tr
                          key={li.rowIndex}
                          className={`border-b border-gray-200 ${
                            isDerived || isSales
                              ? 'bg-blue-50'
                              : SUBTOTAL_LABELS.includes(li.category)
                              ? 'bg-gray-100'
                              : 'hover:bg-yellow-50'
                          }`}
                        >
                          <td
                            className={`sticky left-0 z-10 px-3 py-2 border-r border-gray-300 ${
                              isDerived || isSales
                                ? 'bg-blue-50 font-bold text-blue-900'
                                : SUBTOTAL_LABELS.includes(li.category)
                                ? 'bg-gray-100 font-semibold text-gray-700'
                                : 'bg-white text-gray-700'
                            }`}
                          >
                            <div>{li.category}</div>
                            {li.subcategory && <div className="text-gray-400 pl-2">{li.subcategory}</div>}
                          </td>
                          {li.monthBudgets.map((budget, mi) => (
                            <td key={mi} className="px-1 py-1">
                              {locked ? (
                                <div
                                  className={`text-right px-1 font-medium ${
                                    isDerived && budget != null && budget < 0
                                      ? 'text-red-600'
                                      : isDerived
                                      ? 'text-blue-800'
                                      : 'text-gray-600'
                                  }`}
                                >
                                  {li.category === '限界利益率'
                                    ? budget != null ? `${budget.toFixed(1)}%` : '—'
                                    : fmt(budget)}
                                </div>
                              ) : (
                                <input
                                  type="text"
                                  value={budget != null ? budget.toLocaleString('ja-JP') : ''}
                                  onChange={(e) => updateLineItem(li.rowIndex, mi, e.target.value)}
                                  className="w-full px-1 py-1 border border-gray-200 rounded text-right focus:ring-1 focus:ring-blue-500 text-xs"
                                  placeholder="—"
                                />
                              )}
                            </td>
                          ))}
                          <td
                            className={`px-2 py-2 text-right font-semibold ${
                              isDerived && rowTotal < 0 ? 'text-red-600' : isDerived ? 'text-blue-800' : 'text-gray-600'
                            } bg-gray-50`}
                          >
                            {li.category === '限界利益率'
                              ? '—'
                              : rowTotal !== 0
                              ? rowTotal.toLocaleString('ja-JP')
                              : '—'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div className="mt-6 flex justify-end">
                <button
                  onClick={handleGoToConfirm}
                  className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
                >
                  確認・目標決定へ
                  <ArrowRight className="h-5 w-5 ml-2" />
                </button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ── Step 4: 確認・目標決定 ── */}
        {step === 4 && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>月次予算サマリー（確認）</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-sm">
                    <thead>
                      <tr className="border-b-2 border-gray-300 bg-gray-50">
                        <th className="px-3 py-2 text-left font-semibold text-gray-700">月</th>
                        <th className="px-3 py-2 text-right font-semibold text-gray-700">売上</th>
                        <th className="px-3 py-2 text-right font-semibold text-gray-700">売上総利益</th>
                        <th className="px-3 py-2 text-right font-semibold text-gray-700">限界利益</th>
                        <th className="px-3 py-2 text-right font-semibold text-gray-700">営業利益</th>
                      </tr>
                    </thead>
                    <tbody>
                      {monthlyBudgets.map((m) => (
                        <tr key={m.month} className="border-b border-gray-200">
                          <td className="px-3 py-2 font-medium">{m.month}月</td>
                          <td className="px-3 py-2 text-right">{fmt(m.sales)}</td>
                          <td className="px-3 py-2 text-right">{fmt(m.grossProfit)}</td>
                          <td className="px-3 py-2 text-right">{fmt(m.marginProfit)}</td>
                          <td className={`px-3 py-2 text-right ${m.operatingProfit < 0 ? 'text-red-600' : ''}`}>
                            {fmt(m.operatingProfit)}
                          </td>
                        </tr>
                      ))}
                      <tr className="border-t-2 border-gray-400 bg-blue-50 font-bold">
                        <td className="px-3 py-2">年間合計</td>
                        {(['sales', 'grossProfit', 'marginProfit', 'operatingProfit'] as const).map((f) => (
                          <td key={f} className="px-3 py-2 text-right">
                            ¥{totalMonthly(f).toLocaleString('ja-JP')}
                          </td>
                        ))}
                      </tr>
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>詳細項目サマリー（確認）</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-sm">
                    <thead>
                      <tr className="border-b-2 border-gray-300 bg-gray-50">
                        <th className="px-3 py-2 text-left font-semibold text-gray-700 min-w-[200px]">項目</th>
                        <th className="px-3 py-2 text-right font-semibold text-gray-700">年間予算合計</th>
                      </tr>
                    </thead>
                    <tbody>
                      {lineItems.map((li) => {
                        const isDerived = DERIVED_LABELS.includes(li.category) || SALES_LABELS.includes(li.category);
                        const annual = li.monthBudgets.reduce((s, v) => s + (v ?? 0), 0);
                        return (
                          <tr key={li.rowIndex} className={`border-b border-gray-200 ${isDerived ? 'bg-blue-50 font-semibold' : ''}`}>
                            <td className="px-3 py-2">
                              <span>{li.category}</span>
                              {li.subcategory && <span className="text-gray-400 ml-2 text-xs">{li.subcategory}</span>}
                            </td>
                            <td className={`px-3 py-2 text-right ${isDerived && annual < 0 ? 'text-red-600' : ''}`}>
                              {li.category === '限界利益率' ? '—' : annual !== 0 ? `¥${annual.toLocaleString('ja-JP')}` : '—'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-end">
              <button
                onClick={handleSave}
                disabled={saving}
                className="inline-flex items-center px-8 py-4 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 font-bold text-lg shadow-lg"
              >
                <CheckCircle className="h-6 w-6 mr-2" />
                {saving ? '保存中...' : '目標決定・保存'}
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
