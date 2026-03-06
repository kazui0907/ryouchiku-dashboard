import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const year = parseInt(searchParams.get('year') || '2026');

    const years = [year, year - 1, year - 2];

    const allData = await prisma.monthlyAccounting.findMany({
      where: { year: { in: years } },
      orderBy: [{ year: 'asc' }, { month: 'asc' }],
      select: {
        year: true,
        month: true,
        salesRevenue: true,
        marginProfit: true,
        operatingProfit: true,
      },
    });

    // 年ごとにグループ化
    const byYear: Record<number, typeof allData> = {};
    for (const y of years) byYear[y] = [];
    for (const row of allData) byYear[row.year].push(row);

    // 年次合計
    const annualTotals = years.map((y) => {
      const rows = byYear[y];
      return {
        year: y,
        salesRevenue: rows.reduce((s, r) => s + r.salesRevenue, 0),
        marginProfit: rows.reduce((s, r) => s + (r.marginProfit ?? 0), 0),
        operatingProfit: rows.reduce((s, r) => s + (r.operatingProfit ?? 0), 0),
        monthCount: rows.length,
      };
    });

    // 月次データを月番号でマージ（1〜12）
    const monthlyChart = Array.from({ length: 12 }, (_, i) => {
      const month = i + 1;
      const entry: Record<string, number | string> = { month: `${month}月` };
      for (const y of years) {
        const row = byYear[y].find((r) => r.month === month);
        entry[`${y}年_売上`] = row?.salesRevenue ?? 0;
        entry[`${y}年_限界利益`] = row?.marginProfit ?? 0;
        entry[`${y}年_営業利益`] = row?.operatingProfit ?? 0;
      }
      return entry;
    });

    return NextResponse.json({ year, years, annualTotals, monthlyChart });
  } catch (error) {
    console.error('Annual Report API Error:', error);
    return NextResponse.json({ error: 'データの取得に失敗しました' }, { status: 500 });
  }
}
