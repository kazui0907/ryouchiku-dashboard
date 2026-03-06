import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const year = parseInt(searchParams.get('year') || '2026');

    const rows = await prisma.balanceSheet.findMany({
      where: { year },
      orderBy: { month: 'asc' },
    });

    // 月次チャート用（1〜12月ぶん、データなし月は null）
    const monthlyChart = Array.from({ length: 12 }, (_, i) => {
      const month = i + 1;
      const r = rows.find((d) => d.month === month);
      return {
        month: `${month}月`,
        cash:               r?.cash               ?? null,
        receivables:        r?.receivables         ?? null,
        inventory:          r?.inventory           ?? null,
        currentAssets:      r?.currentAssets       ?? null,
        tangibleAssets:     r?.tangibleAssets      ?? null,
        fixedAssets:        r?.fixedAssets         ?? null,
        totalAssets:        r?.totalAssets         ?? null,
        payables:           r?.payables            ?? null,
        currentLiabilities: r?.currentLiabilities  ?? null,
        fixedLiabilities:   r?.fixedLiabilities    ?? null,
        totalLiabilities:   r?.totalLiabilities    ?? null,
        netAssets:          r?.netAssets           ?? null,
      };
    });

    // 最新月のスナップショット（最後にデータがある月）
    const latest = rows.length > 0 ? rows[rows.length - 1] : null;

    return NextResponse.json({ year, monthlyChart, latest });
  } catch (error) {
    console.error('BalanceSheet API Error:', error);
    return NextResponse.json({ error: 'データの取得に失敗しました' }, { status: 500 });
  }
}
