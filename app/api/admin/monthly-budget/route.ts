import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET: 年間予算データ取得
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const year = parseInt(searchParams.get('year') || '2026');

    const records = await prisma.monthlyAccounting.findMany({
      where: { year },
      select: {
        month: true,
        budgetSales: true,
        budgetGrossProfit: true,
        budgetMarginProfit: true,
        budgetOperatingProfit: true,
      },
      orderBy: { month: 'asc' },
    });

    // 1〜12月分を返す（レコードがない月はnull）
    const result = Array.from({ length: 12 }, (_, i) => {
      const month = i + 1;
      const record = records.find((r) => r.month === month);
      return {
        month,
        budgetSales: record?.budgetSales ?? null,
        budgetGrossProfit: record?.budgetGrossProfit ?? null,
        budgetMarginProfit: record?.budgetMarginProfit ?? null,
        budgetOperatingProfit: record?.budgetOperatingProfit ?? null,
      };
    });

    return NextResponse.json({ year, months: result });
  } catch (error) {
    return NextResponse.json({ error: 'データの取得に失敗しました' }, { status: 500 });
  }
}

// POST: 年間予算データ保存
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { year, months } = body;

    if (!year || !months) {
      return NextResponse.json({ error: '必須パラメータが不足しています' }, { status: 400 });
    }

    const parseValue = (value: string | number | null | undefined): number | null => {
      if (value === null || value === undefined || value === '') return null;
      const num = typeof value === 'string' ? parseFloat(value.replace(/,/g, '')) : value;
      return isNaN(num) ? null : num;
    };

    for (const m of months) {
      const { month, budgetSales, budgetGrossProfit, budgetMarginProfit, budgetOperatingProfit } = m;

      const budgetData = {
        budgetSales: parseValue(budgetSales),
        budgetGrossProfit: parseValue(budgetGrossProfit),
        budgetMarginProfit: parseValue(budgetMarginProfit),
        budgetOperatingProfit: parseValue(budgetOperatingProfit),
      };

      const existing = await prisma.monthlyAccounting.findUnique({
        where: { year_month: { year, month } },
      });

      if (existing) {
        await prisma.monthlyAccounting.update({
          where: { year_month: { year, month } },
          data: budgetData,
        });
      } else {
        // 会計データがない月はレコードを作成（実績0で）
        await prisma.monthlyAccounting.create({
          data: {
            year,
            month,
            salesRevenue: 0,
            costOfSales: 0,
            grossProfit: 0,
            grossProfitRate: 0,
            ...budgetData,
          },
        });
      }
    }

    return NextResponse.json({ success: true, message: '予算データを保存しました' });
  } catch (error) {
    console.error('Monthly Budget POST Error:', error);
    return NextResponse.json({ error: 'データの保存に失敗しました' }, { status: 500 });
  }
}
