import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET: データ読み込み
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const year = parseInt(searchParams.get('year') || '2026');
    const month = parseInt(searchParams.get('month') || '1');

    const items = await prisma.weeklyKPI.findMany({
      where: {
        year,
        month,
      },
    });

    return NextResponse.json({ items });
  } catch (error) {
    console.error('Weekly KPI GET Error:', error);
    return NextResponse.json(
      { error: 'データの取得に失敗しました' },
      { status: 500 }
    );
  }
}

// POST: データ保存
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { year, month, items } = body;

    if (!year || !month || !items) {
      return NextResponse.json(
        { error: '必須パラメータが不足しています' },
        { status: 400 }
      );
    }

    // 既存データを削除
    await prisma.weeklyKPI.deleteMany({
      where: { year, month },
    });

    // 新しいデータを作成
    for (const item of items) {
      const { itemName, weeks } = item;

      const parseValue = (value: string | number | null | undefined): number | null => {
        if (value === null || value === undefined || value === '') return null;
        const num = typeof value === 'string' ? parseFloat(value) : value;
        return isNaN(num) ? null : num;
      };

      await prisma.weeklyKPI.create({
        data: {
          year,
          month,
          itemName,
          week1Target: parseValue(weeks.week1?.target),
          week1Actual: parseValue(weeks.week1?.actual),
          week1Rate: null,
          week2Target: parseValue(weeks.week2?.target),
          week2Actual: parseValue(weeks.week2?.actual),
          week2Rate: null,
          week3Target: parseValue(weeks.week3?.target),
          week3Actual: parseValue(weeks.week3?.actual),
          week3Rate: null,
          week4Target: parseValue(weeks.week4?.target),
          week4Actual: parseValue(weeks.week4?.actual),
          week4Rate: null,
          week5Target: parseValue(weeks.week5?.target),
          week5Actual: parseValue(weeks.week5?.actual),
          week5Rate: null,
        },
      });
    }

    return NextResponse.json({
      success: true,
      message: 'データを保存しました',
    });
  } catch (error) {
    console.error('Weekly KPI POST Error:', error);
    return NextResponse.json(
      { error: 'データの保存に失敗しました' },
      { status: 500 }
    );
  }
}
