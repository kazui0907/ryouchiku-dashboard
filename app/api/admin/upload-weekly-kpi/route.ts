import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { parse } from 'csv-parse/sync';

const KPI_ITEMS = [
  '問合件数', 'メインターゲット数', 'メインターゲット率', 'meta広告問合せ',
  'SR商談件数', 'MEET商談件数', '商談設定率', '受注件数', '受注率',
  '平均限界粗利単価', '施工部残業時間', '営業部残業時間',
];

function parseVal(value: string): number | null {
  if (!value || value.trim() === '' || value === '#DIV/0!' || value === '#VALUE!') return null;
  const cleaned = value.replace(/%/g, '').replace(/,/g, '').trim();
  if (cleaned === '' || cleaned === '-') return null;
  const num = parseFloat(cleaned);
  return isNaN(num) ? null : num;
}

function parsePercent(value: string): number | null {
  const v = parseVal(value);
  return v !== null ? v / 100 : null;
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    if (!file) {
      return NextResponse.json({ error: 'ファイルが選択されていません' }, { status: 400 });
    }

    const text = await file.text();
    const records = parse(text, { columns: false, skip_empty_lines: false, bom: true });

    const year = 2026;
    let currentMonth = 0;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const txOps: any[] = [];
    let totalCount = 0;

    for (const record of records) {
      const col0 = record[0]?.trim() || '';

      // 月ヘッダー検出
      const monthMatch = col0.match(/^(\d+)月$/);
      if (monthMatch) {
        currentMonth = parseInt(monthMatch[1]);
        continue;
      }

      if (currentMonth === 0 || !col0 || !KPI_ITEMS.includes(col0)) continue;

      const isPercent = col0.includes('率');
      const parse1 = isPercent ? parsePercent : parseVal;

      txOps.push(prisma.weeklyKPI.upsert({
        where: { year_month_itemName: { year, month: currentMonth, itemName: col0 } },
        update: {
          week1Target: parse1(record[1]), week1Actual: parse1(record[2]), week1Rate: null,
          week2Target: parse1(record[4]), week2Actual: parse1(record[5]), week2Rate: null,
          week3Target: parse1(record[7]), week3Actual: parse1(record[8]), week3Rate: null,
          week4Target: parse1(record[10]), week4Actual: parse1(record[11]), week4Rate: null,
          week5Target: parse1(record[13]), week5Actual: parse1(record[14]), week5Rate: null,
        },
        create: {
          year, month: currentMonth, itemName: col0,
          week1Target: parse1(record[1]), week1Actual: parse1(record[2]), week1Rate: null,
          week2Target: parse1(record[4]), week2Actual: parse1(record[5]), week2Rate: null,
          week3Target: parse1(record[7]), week3Actual: parse1(record[8]), week3Rate: null,
          week4Target: parse1(record[10]), week4Actual: parse1(record[11]), week4Rate: null,
          week5Target: parse1(record[13]), week5Actual: parse1(record[14]), week5Rate: null,
        },
      }));
      totalCount++;
    }

    await prisma.$transaction(txOps, { timeout: 30000 });

    return NextResponse.json({
      success: true,
      message: `週次KPIデータを${totalCount}件インポートしました（${Math.ceil(totalCount / KPI_ITEMS.length)}ヶ月分）`,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error('Upload Weekly KPI Error:', error);
    return NextResponse.json({ error: '処理に失敗しました', detail: msg }, { status: 500 });
  }
}
