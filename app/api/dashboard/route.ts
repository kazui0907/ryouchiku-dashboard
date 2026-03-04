import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const year = parseInt(searchParams.get('year') || '2026');
    const month = parseInt(searchParams.get('month') || new Date().getMonth().toString());

    // 当月の会計データ
    const currentMonthData = await prisma.monthlyAccounting.findUnique({
      where: { year_month: { year, month } },
    });

    // 前月のデータ
    const prevMonth = month === 1 ? 12 : month - 1;
    const prevYear = month === 1 ? year - 1 : year;
    const prevMonthData = await prisma.monthlyAccounting.findUnique({
      where: { year_month: { year: prevYear, month: prevMonth } },
    });

    // 年初来の累計
    const ytdData = await prisma.monthlyAccounting.findMany({
      where: {
        year,
        month: { lte: month },
      },
    });

    const ytdTotals = ytdData.reduce(
      (acc, item) => ({
        salesRevenue: acc.salesRevenue + item.salesRevenue,
        grossProfit: acc.grossProfit + item.grossProfit,
        costOfSales: acc.costOfSales + item.costOfSales,
        marginProfit: acc.marginProfit + (item.marginProfit || 0),
        operatingProfit: acc.operatingProfit + (item.operatingProfit || 0),
        // 予算累計
        budgetSales: acc.budgetSales + (item.budgetSales || 0),
        budgetGrossProfit: acc.budgetGrossProfit + (item.budgetGrossProfit || 0),
        budgetMarginProfit: acc.budgetMarginProfit + (item.budgetMarginProfit || 0),
        budgetOperatingProfit: acc.budgetOperatingProfit + (item.budgetOperatingProfit || 0),
        // 昨年実績累計
        lastYearSalesRevenue: acc.lastYearSalesRevenue + (item.lastYearSalesRevenue || 0),
        lastYearGrossProfit: acc.lastYearGrossProfit + (item.lastYearGrossProfit || 0),
        lastYearMarginProfit: acc.lastYearMarginProfit + (item.lastYearMarginProfit || 0),
        lastYearOperatingProfit: acc.lastYearOperatingProfit + (item.lastYearOperatingProfit || 0),
      }),
      {
        salesRevenue: 0,
        grossProfit: 0,
        costOfSales: 0,
        marginProfit: 0,
        operatingProfit: 0,
        budgetSales: 0,
        budgetGrossProfit: 0,
        budgetMarginProfit: 0,
        budgetOperatingProfit: 0,
        lastYearSalesRevenue: 0,
        lastYearGrossProfit: 0,
        lastYearMarginProfit: 0,
        lastYearOperatingProfit: 0,
      }
    );

    // 当月の週次KPI
    const weeklyKPIs = await prisma.weeklyKPI.findMany({
      where: { year, month },
      orderBy: { weekNumber: 'asc' },
    });

    // 週次KPIの累計
    const weeklyTotals = weeklyKPIs.reduce(
      (acc, kpi) => ({
        inquiryCount: acc.inquiryCount + kpi.inquiryCount,
        inquiryTarget: acc.inquiryTarget + kpi.inquiryTarget,
        orderCount: acc.orderCount + (kpi.orderCount || 0),
        orderTarget: acc.orderTarget + (kpi.orderTarget || 0),
      }),
      { inquiryCount: 0, inquiryTarget: 0, orderCount: 0, orderTarget: 0 }
    );

    // 月次推移データ (過去12ヶ月)
    const monthlyTrend = await prisma.monthlyAccounting.findMany({
      where: {
        OR: [
          { year: year - 1, month: { gt: month } },
          { year, month: { lte: month } },
        ],
      },
      orderBy: [{ year: 'asc' }, { month: 'asc' }],
      take: 12,
    });

    return NextResponse.json({
      currentMonth: currentMonthData,
      prevMonth: prevMonthData,
      ytd: ytdTotals,
      weeklyKPIs,
      weeklyTotals,
      monthlyTrend,
    });
  } catch (error) {
    console.error('Dashboard API Error:', error);
    return NextResponse.json(
      { error: 'データの取得に失敗しました' },
      { status: 500 }
    );
  }
}
