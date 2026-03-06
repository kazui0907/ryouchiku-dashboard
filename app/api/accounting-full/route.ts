import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const year = parseInt(searchParams.get('year') || '2026');

    const lineItems = await prisma.accountingLineItem.findMany({
      where: { year },
      orderBy: { rowIndex: 'asc' },
    });

    const items = lineItems.map((item) => ({
      category: item.category,
      subcategory: item.subcategory,
      rowIndex: item.rowIndex,
      months: JSON.parse(item.monthsJson),
    }));

    return NextResponse.json({ year, items });
  } catch (error) {
    console.error('Accounting Full API Error:', error);
    return NextResponse.json(
      { error: 'データの取得に失敗しました', details: String(error) },
      { status: 500 }
    );
  }
}
