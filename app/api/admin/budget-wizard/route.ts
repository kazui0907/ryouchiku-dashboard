import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET: 過去3カ年の実績データを返す（月次比率計算用）
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const targetYear = parseInt(searchParams.get('targetYear') || '2026');
    const historyYears = [targetYear - 3, targetYear - 2, targetYear - 1];

    // 過去3カ年の月次会計データ
    const historicalMonthly = await prisma.monthlyAccounting.findMany({
      where: { year: { in: historyYears } },
      select: {
        year: true,
        month: true,
        salesRevenue: true,
        grossProfit: true,
        marginProfit: true,
        operatingProfit: true,
      },
      orderBy: [{ year: 'asc' }, { month: 'asc' }],
    });

    // 過去3カ年の明細行データ
    const historicalLineItems = await prisma.accountingLineItem.findMany({
      where: { year: { in: historyYears } },
      select: {
        year: true,
        rowIndex: true,
        category: true,
        subcategory: true,
        monthsJson: true,
      },
      orderBy: [{ year: 'asc' }, { rowIndex: 'asc' }],
    });

    // 対象年度の明細行を取得。なければ最新の登録済み年度にフォールバック
    let currentLineItems = await prisma.accountingLineItem.findMany({
      where: { year: targetYear },
      select: { rowIndex: true, category: true, subcategory: true, monthsJson: true },
      orderBy: { rowIndex: 'asc' },
    });

    let lineItemsYear = targetYear;
    if (currentLineItems.length === 0) {
      // 直近の登録済み年度を探す
      const latestYear = await prisma.accountingLineItem.findFirst({
        orderBy: { year: 'desc' },
        select: { year: true },
      });
      if (latestYear) {
        lineItemsYear = latestYear.year;
        currentLineItems = await prisma.accountingLineItem.findMany({
          where: { year: lineItemsYear },
          select: { rowIndex: true, category: true, subcategory: true, monthsJson: true },
          orderBy: { rowIndex: 'asc' },
        });
      }
    }

    return NextResponse.json({
      historicalMonthly,
      historicalLineItems: historicalLineItems.map((item) => ({
        ...item,
        months: JSON.parse(item.monthsJson || '[]'),
      })),
      currentLineItems: currentLineItems.map((item) => ({
        ...item,
        months: JSON.parse(item.monthsJson || '[]'),
      })),
      lineItemsYear,
    });
  } catch (error) {
    console.error('Budget Wizard GET Error:', error);
    return NextResponse.json({ error: 'データの取得に失敗しました' }, { status: 500 });
  }
}

// POST: 予算データを保存
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { year, monthlyBudgets, lineItemBudgets } = body;

    if (!year || !monthlyBudgets) {
      return NextResponse.json({ error: '必須パラメータが不足しています' }, { status: 400 });
    }

    const txOps: any[] = [];

    // 月次予算をMonthlyAccountingに保存
    for (const m of monthlyBudgets) {
      const { month, budgetSales, budgetGrossProfit, budgetMarginProfit, budgetOperatingProfit } = m;
      const budgetData = {
        budgetSales: budgetSales ?? null,
        budgetGrossProfit: budgetGrossProfit ?? null,
        budgetMarginProfit: budgetMarginProfit ?? null,
        budgetOperatingProfit: budgetOperatingProfit ?? null,
      };
      txOps.push(
        prisma.monthlyAccounting.upsert({
          where: { year_month: { year, month } },
          update: budgetData,
          create: {
            year,
            month,
            salesRevenue: 0,
            costOfSales: 0,
            grossProfit: 0,
            grossProfitRate: 0,
            ...budgetData,
          },
        })
      );
    }

    // 明細行の予算をAccountingLineItemのmonthsJsonに保存
    if (lineItemBudgets && lineItemBudgets.length > 0) {
      // 現在のmonthsJsonを取得してbudgetだけ上書き
      const currentItems = await prisma.accountingLineItem.findMany({
        where: { year, rowIndex: { in: lineItemBudgets.map((li: any) => li.rowIndex) } },
      });

      for (const li of lineItemBudgets) {
        const current = currentItems.find((c) => c.rowIndex === li.rowIndex);
        const currentMonths: any[] = current ? JSON.parse(current.monthsJson || '[]') : [];

        const updatedMonths = Array.from({ length: 12 }, (_, i) => {
          const month = i + 1;
          const existing = currentMonths.find((m: any) => m.month === month) || { month, lastYear: null, actual: null };
          const newBudget = li.monthBudgets.find((mb: any) => mb.month === month);
          return {
            ...existing,
            budget: newBudget?.budget ?? existing.budget ?? null,
          };
        });

        if (current) {
          txOps.push(
            prisma.accountingLineItem.update({
              where: { year_rowIndex: { year, rowIndex: li.rowIndex } },
              data: { monthsJson: JSON.stringify(updatedMonths) },
            })
          );
        }
      }
    }

    await prisma.$transaction(txOps, { timeout: 60000 });

    return NextResponse.json({ success: true, message: '予算データを保存しました' });
  } catch (error) {
    console.error('Budget Wizard POST Error:', error);
    return NextResponse.json({ error: 'データの保存に失敗しました' }, { status: 500 });
  }
}
