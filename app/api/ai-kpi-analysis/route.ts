/* ************************************************************************** */
/*                                                                            */
/*    route.ts                                          :::      ::::::::    */
/*                                                      :+:      :+:    :+:  */
/*    By: Claude (LTS)                                  #+#  +:+       +#+    */
/*                                                    +#+#+#+#+#+   +#+       */
/*    Created: 2026/03/26 10:44 by Claude (LTS)       #+#    #+#         */
/*    Updated: 2026/03/26 10:44 by Claude (LTS)       ###   ########      */
/*                                                                            */
/*    © Life Time Support Inc.                                           */
/*                                                                            */
/* ************************************************************************** */
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { DEFAULT_PROMPT_INSTRUCTIONS } from '@/lib/ai-prompt';

function getPastMonths(year: number, month: number, count: number) {
  const months = [];
  for (let i = count - 1; i >= 0; i--) {
    let m = month - i;
    let y = year;
    while (m <= 0) { m += 12; y -= 1; }
    months.push({ year: y, month: m });
  }
  return months;
}

function formatRate(rate: number | null) {
  if (rate === null) return '—';
  return `${(rate * 100).toFixed(1)}%`;
}

function formatNum(val: number | null) {
  if (val === null) return '—';
  return val.toLocaleString('ja-JP');
}

async function buildDataSection(year: number, month: number) {
  const targetMonths = getPastMonths(year, month, 3);

  // 接続プール上限を回避するため順次実行
  const weeklyKpiRows = await prisma.weeklyKPI.findMany({
    where: { OR: targetMonths.map(m => ({ year: m.year, month: m.month })) },
    orderBy: [{ year: 'asc' }, { month: 'asc' }],
  });
  const siteKpiRows = await prisma.weeklySiteKPI.findMany({
    where: { OR: targetMonths.map(m => ({ year: m.year, month: m.month })) },
    orderBy: [{ year: 'asc' }, { month: 'asc' }],
  });
  const accountingRows = await prisma.monthlyAccounting.findMany({
    where: { OR: targetMonths.map(m => ({ year: m.year, month: m.month })) },
    orderBy: [{ year: 'asc' }, { month: 'asc' }],
  });

  let kpiSection = '=== 週次KPI（積極版）推移 ===\n';
  for (const { year: y, month: m } of targetMonths) {
    const items = weeklyKpiRows.filter(r => r.year === y && r.month === m);
    if (items.length === 0) { kpiSection += `\n【${y}年${m}月】データなし\n`; continue; }
    kpiSection += `\n【${y}年${m}月】\n`;
    kpiSection += '項目 | W1実/目(率) | W2実/目(率) | W3実/目(率) | W4実/目(率) | 月累計実/目(率)\n';
    for (const row of items) {
      const weeks = [1, 2, 3, 4, 5].map(w => {
        const t = row[`week${w}Target` as keyof typeof row] as number | null;
        const a = row[`week${w}Actual` as keyof typeof row] as number | null;
        const rate = t && t !== 0 && a !== null ? a / t : null;
        if (t === null && a === null) return '—';
        return `${formatNum(a)}/${formatNum(t)}(${formatRate(rate)})`;
      });
      const actuals = [1,2,3,4,5].map(w => row[`week${w}Actual` as keyof typeof row] as number | null).filter(v => v !== null) as number[];
      const targets = [1,2,3,4,5].map(w => row[`week${w}Target` as keyof typeof row] as number | null).filter(v => v !== null) as number[];
      const totalA = actuals.length ? actuals.reduce((s, v) => s + v, 0) : null;
      const totalT = targets.length ? targets.reduce((s, v) => s + v, 0) : null;
      const totalRate = totalT && totalT !== 0 && totalA !== null ? totalA / totalT : null;
      kpiSection += `${row.itemName} | ${weeks.slice(0, 4).join(' | ')} | ${formatNum(totalA)}/${formatNum(totalT)}(${formatRate(totalRate)})\n`;
    }
  }

  let siteSection = '\n=== 週次現場KPI推移 ===\n';
  for (const { year: y, month: m } of targetMonths) {
    const items = siteKpiRows.filter(r => r.year === y && r.month === m);
    if (items.length === 0) { siteSection += `\n【${y}年${m}月】データなし\n`; continue; }
    siteSection += `\n【${y}年${m}月】\n`;
    siteSection += 'カテゴリ::項目 | W1実/目(率) | W2実/目(率) | W3実/目(率) | W4実/目(率) | 累計実/目(率)\n';
    for (const row of items) {
      const label = row.subItem ? `${row.mainItem}::${row.subItem}` : row.mainItem;
      const weeks = [1, 2, 3, 4, 5].map(w => {
        const t = row[`week${w}Target` as keyof typeof row] as number | null;
        const a = row[`week${w}Actual` as keyof typeof row] as number | null;
        const rate = t && t !== 0 && a !== null ? a / t : null;
        if (t === null && a === null) return '—';
        return `${formatNum(a)}/${formatNum(t)}(${formatRate(rate)})`;
      });
      const actuals = [1,2,3,4,5].map(w => row[`week${w}Actual` as keyof typeof row] as number | null).filter(v => v !== null) as number[];
      const targets = [1,2,3,4,5].map(w => row[`week${w}Target` as keyof typeof row] as number | null).filter(v => v !== null) as number[];
      const totalA = actuals.length ? actuals.reduce((s, v) => s + v, 0) : null;
      const totalT = targets.length ? targets.reduce((s, v) => s + v, 0) : null;
      const totalRate = totalT && totalT !== 0 && totalA !== null ? totalA / totalT : null;
      siteSection += `${label} | ${weeks.slice(0, 4).join(' | ')} | ${formatNum(totalA)}/${formatNum(totalT)}(${formatRate(totalRate)})\n`;
    }
  }

  let accountingSection = '\n=== 月次売上・限界利益推移（KPI相関参照用）===\n';
  accountingSection += '月 | 売上高 | 限界利益 | 限界利益率 | 営業利益\n';
  for (const row of accountingRows) {
    accountingSection += `${row.year}年${row.month}月 | ${formatNum(row.salesRevenue)} | ${formatNum(row.marginProfit)} | ${row.marginProfitRate ?? '—'}% | ${formatNum(row.operatingProfit)}\n`;
  }

  return `${kpiSection}${siteSection}${accountingSection}`;
}

// GET: デフォルトプロンプトで分析
export async function GET(request: Request) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return NextResponse.json({ error: 'GEMINI_API_KEY が設定されていません' }, { status: 500 });

  const { searchParams } = new URL(request.url);
  const year = parseInt(searchParams.get('year') || '2026');
  const month = parseInt(searchParams.get('month') || String(new Date().getMonth() + 1));

  return runAnalysis(apiKey, year, month, DEFAULT_PROMPT_INSTRUCTIONS);
}

// POST: カスタムプロンプトで分析
export async function POST(request: Request) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return NextResponse.json({ error: 'GEMINI_API_KEY が設定されていません' }, { status: 500 });

  const body = await request.json();
  const { year = 2026, month = new Date().getMonth() + 1, promptInstructions } = body;

  return runAnalysis(apiKey, year, month, promptInstructions || DEFAULT_PROMPT_INSTRUCTIONS);
}

async function runAnalysis(apiKey: string, year: number, month: number, instructions: string) {
  try {
    const dataSection = await buildDataSection(year, month);
    const prompt = `${instructions}\n\n---\n\n${dataSection}`;

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
    const result = await model.generateContent(prompt);
    const text = result.response.text();
    return NextResponse.json({ analysis: text, generatedAt: new Date().toISOString() });
  } catch (err) {
    console.error('Gemini API Error:', err);
    return NextResponse.json({ error: 'AI分析に失敗しました', details: String(err) }, { status: 500 });
  }
}
