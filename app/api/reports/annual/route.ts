import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const year = parseInt(searchParams.get('year') || '2026');

    const monthlyData = await prisma.monthlyAccounting.findMany({
      where: { year },
      orderBy: { month: 'asc' },
    });

    if (monthlyData.length === 0) {
      return NextResponse.json(
        { error: 'データが見つかりません' },
        { status: 404 }
      );
    }

    const totalSales = monthlyData.reduce((sum, item) => sum + item.salesRevenue, 0);
    const totalProfit = monthlyData.reduce((sum, item) => sum + item.grossProfit, 0);
    const avgProfitRate = totalSales > 0 ? totalProfit / totalSales : 0;

    return NextResponse.json({
      year,
      totalSales,
      totalProfit,
      avgProfitRate,
      monthlyData: monthlyData.map((item) => ({
        year: item.year,
        month: item.month,
        salesRevenue: item.salesRevenue,
        grossProfit: item.grossProfit,
      })),
    });
  } catch (error) {
    console.error('Annual Report API Error:', error);
    return NextResponse.json(
      { error: 'データの取得に失敗しました' },
      { status: 500 }
    );
  }
}
