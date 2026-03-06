import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const year = parseInt(searchParams.get('year') || '2026');

    // 全12ヶ月分のデータを取得
    const monthlyData = await prisma.monthlyAccounting.findMany({
      where: { year },
      orderBy: { month: 'asc' },
    });

    // 月ごとのデータをマップに変換
    const dataByMonth = new Map();
    monthlyData.forEach((data) => {
      dataByMonth.set(data.month, data);
    });

    // 1月〜12月のデータを配列として返す（データがない月はnull）
    const allMonths = Array.from({ length: 12 }, (_, i) => {
      const month = i + 1;
      return dataByMonth.get(month) || null;
    });

    return NextResponse.json({
      year,
      months: allMonths,
    });
  } catch (error) {
    console.error('Accounting API Error:', error);
    return NextResponse.json(
      { error: 'データの取得に失敗しました' },
      { status: 500 }
    );
  }
}
