import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { parse } from 'csv-parse/sync';

const SITE_KPI_STRUCTURE: { mainItem: string; subItems: string[] }[] = [
  { mainItem: '問合数', subItems: ['コンバージョン単価', 'ユーザー数', '指定物件ＳＮＳ投稿数', '指定物件ＳＮＸ投稿'] },
  { mainItem: '商談件数', subItems: ['追客架電（商談前）', 'メイン商材ない人にアクション'] },
  { mainItem: '受注件数', subItems: ['ロープレ回数', '新規商談平均粗利額', '景山', '京屋', '中谷', '熊田', '大島', '森谷', '星野', '安栗', 'SR'] },
  { mainItem: '平均限界利益額', subItems: ['新規商談平均粗利額', '景山', '京屋', '中谷', '熊田', '大島', '森谷', '星野', '安栗', 'SR', '京屋', '熊田', '星野', '安栗'] },
  { mainItem: '顧客満足向上', subItems: ['ありがとうカード配布数', '口コミ回収率'] },
  { mainItem: '不動産', subItems: ['交渉物件数'] },
  { mainItem: 'IT', subItems: ['商談件数', '成約率'] },
];

const ALL_MAIN_ITEMS = SITE_KPI_STRUCTURE.map(s => s.mainItem);

function isKnownSubItem(mainItem: string, subItem: string): boolean {
  const struct = SITE_KPI_STRUCTURE.find(s => s.mainItem === mainItem);
  if (!struct) return false;
  return struct.subItems.some(si => subItem.includes(si) || si.includes(subItem));
}

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
    let currentMainItem = '';
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const txOps: any[] = [];
    let totalCount = 0;

    for (const record of records) {
      const col0 = record[0]?.trim() || '';
      const col1Raw = record[1] || '';
      const col1 = col1Raw.replace(/^\s+|　/g, '').trim(); // 全角スペース含むトリム

      // 月ヘッダー検出
      const monthMatch = col0.match(/^(\d+)月$/);
      if (monthMatch) {
        currentMonth = parseInt(monthMatch[1]);
        currentMainItem = '';
        continue;
      }

      if (currentMonth === 0) continue;

      // メイン項目の検出
      if (col0 && ALL_MAIN_ITEMS.includes(col0)) {
        currentMainItem = col0;
      }

      // サブ項目の処理
      if (!currentMainItem || !col1 || !isKnownSubItem(currentMainItem, col1)) continue;

      const isPercent = col1.includes('率') || col1.includes('架電') || col1.includes('アクション') || col1.includes('成約');
      const parse1 = isPercent ? parsePercent : parseVal;

      txOps.push(prisma.weeklySiteKPI.upsert({
        where: { year_month_mainItem_subItem: { year, month: currentMonth, mainItem: currentMainItem, subItem: col1 } },
        update: {
          week1Target: parse1(record[2]), week1Actual: parse1(record[3]), week1Rate: null,
          week2Target: parse1(record[5]), week2Actual: parse1(record[6]), week2Rate: null,
          week3Target: parse1(record[8]), week3Actual: parse1(record[9]), week3Rate: null,
          week4Target: parse1(record[11]), week4Actual: parse1(record[12]), week4Rate: null,
          week5Target: parse1(record[14]), week5Actual: parse1(record[15]), week5Rate: null,
        },
        create: {
          year, month: currentMonth, mainItem: currentMainItem, subItem: col1,
          week1Target: parse1(record[2]), week1Actual: parse1(record[3]), week1Rate: null,
          week2Target: parse1(record[5]), week2Actual: parse1(record[6]), week2Rate: null,
          week3Target: parse1(record[8]), week3Actual: parse1(record[9]), week3Rate: null,
          week4Target: parse1(record[11]), week4Actual: parse1(record[12]), week4Rate: null,
          week5Target: parse1(record[14]), week5Actual: parse1(record[15]), week5Rate: null,
        },
      }));
      totalCount++;
    }

    await prisma.$transaction(txOps, { timeout: 60000 });

    return NextResponse.json({
      success: true,
      message: `週次現場KPIデータを${totalCount}件インポートしました`,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error('Upload Site KPI Error:', error);
    return NextResponse.json({ error: '処理に失敗しました', detail: msg }, { status: 500 });
  }
}
