import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const year = parseInt(searchParams.get('year') || '2026');
    const month = parseInt(searchParams.get('month') || '1');

    const items = await prisma.weeklySiteKPI.findMany({ where: { year, month } });
    return NextResponse.json({ items });
  } catch (error) {
    return NextResponse.json({ error: 'データの取得に失敗しました' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { year, month, items, mode = 'actual' } = body;

    if (!year || !month || !items) {
      return NextResponse.json({ error: '必須パラメータが不足しています' }, { status: 400 });
    }

    const parseValue = (value: string | number | null | undefined): number | null => {
      if (value === null || value === undefined || value === '') return null;
      const num = typeof value === 'string' ? parseFloat(value) : value;
      return isNaN(num) ? null : num;
    };

    for (const item of items) {
      const { mainItem, subItem, weeks } = item;

      const saveTarget = mode === 'target' || mode === 'import';
      const saveActual = mode === 'actual' || mode === 'import';

      const targetFields = saveTarget ? {
        week1Target: parseValue(weeks.week1?.target),
        week2Target: parseValue(weeks.week2?.target),
        week3Target: parseValue(weeks.week3?.target),
        week4Target: parseValue(weeks.week4?.target),
        week5Target: parseValue(weeks.week5?.target),
      } : {};

      const actualFields = saveActual ? {
        week1Actual: parseValue(weeks.week1?.actual),
        week2Actual: parseValue(weeks.week2?.actual),
        week3Actual: parseValue(weeks.week3?.actual),
        week4Actual: parseValue(weeks.week4?.actual),
        week5Actual: parseValue(weeks.week5?.actual),
      } : {};

      await prisma.weeklySiteKPI.upsert({
        where: { year_month_mainItem_subItem: { year, month, mainItem, subItem } },
        update: { ...targetFields, ...actualFields },
        create: {
          year, month, mainItem, subItem,
          week1Target: null, week1Actual: null, week1Rate: null,
          week2Target: null, week2Actual: null, week2Rate: null,
          week3Target: null, week3Actual: null, week3Rate: null,
          week4Target: null, week4Actual: null, week4Rate: null,
          week5Target: null, week5Actual: null, week5Rate: null,
          ...targetFields, ...actualFields,
        },
      });
    }

    return NextResponse.json({ success: true, message: 'データを保存しました' });
  } catch (error) {
    console.error('Weekly Site KPI POST Error:', error);
    return NextResponse.json({ error: 'データの保存に失敗しました' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const body = await request.json();
    const { year, month, mainItem, subItem } = body;
    await prisma.weeklySiteKPI.deleteMany({ where: { year, month, mainItem, subItem } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: '削除に失敗しました' }, { status: 500 });
  }
}
