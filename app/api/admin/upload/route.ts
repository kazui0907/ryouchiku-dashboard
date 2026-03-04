import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { parse } from 'csv-parse/sync';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'ファイルが選択されていません' }, { status: 400 });
    }

    // CSVファイルを読み込む
    const text = await file.text();
    const records = parse(text, {
      columns: false,
      skip_empty_lines: true,
      encoding: 'utf-8',
      bom: true,
    });

    if (records.length === 0) {
      return NextResponse.json({ error: 'CSVファイルが空です' }, { status: 400 });
    }

    // ヘッダー行を取得 (1月, 2月, ...)
    const headers = records[0];
    const months = headers.slice(3).filter((h: string) => h && h.match(/^\d+月$/));

    if (months.length === 0) {
      return NextResponse.json(
        { error: '月のデータが見つかりません' },
        { status: 400 }
      );
    }

    let importCount = 0;

    // データを月ごとに処理
    for (let monthIdx = 0; monthIdx < months.length; monthIdx++) {
      const month = monthIdx + 1;
      const colIdx = monthIdx + 3;

      let salesRevenue = 0;
      let salesDiscount = 0;
      let costOfSales = 0;
      let grossProfit = 0;

      for (const record of records) {
        const label = record[1]; // 勘定科目
        if (!label) continue;

        const value = record[colIdx];
        if (!value || value === '') continue;

        if (label.includes('売上高合計')) {
          salesRevenue = parseAmount(value);
        } else if (label === '売上値引・返品') {
          salesDiscount = parseAmount(value);
        } else if (label.includes('売上原価合計')) {
          costOfSales = parseAmount(value);
        } else if (label.includes('売上総利益')) {
          grossProfit = parseAmount(value);
        }
      }

      if (salesRevenue > 0) {
        const grossProfitRate = grossProfit / salesRevenue;

        await prisma.monthlyAccounting.upsert({
          where: { year_month: { year: 2026, month } },
          update: {
            salesRevenue,
            salesDiscount,
            costOfSales,
            grossProfit,
            grossProfitRate,
          },
          create: {
            year: 2026,
            month,
            salesRevenue,
            salesDiscount,
            costOfSales,
            grossProfit,
            grossProfitRate,
          },
        });

        importCount++;
      }
    }

    return NextResponse.json({
      success: true,
      message: `${importCount}ヶ月分のデータをインポートしました`,
    });
  } catch (error) {
    console.error('Upload API Error:', error);
    return NextResponse.json(
      { error: 'アップロード処理に失敗しました' },
      { status: 500 }
    );
  }
}

// 金額文字列をパース
function parseAmount(value: string): number {
  if (!value || value === '' || value === '#DIV/0!' || value === '#VALUE!') return 0;

  // 科学的記数法のチェック
  if (value.includes('E+') || value.includes('e+')) {
    return parseFloat(value);
  }

  const cleaned = value.replace(/[¥,\s円]/g, '');
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}
