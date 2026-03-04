import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { parse } from 'csv-parse/sync';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'ファイルが選択されていません' }, { status: 400 });
    }

    const text = await file.text();
    const records = parse(text, {
      columns: false,
      skip_empty_lines: true,
      encoding: 'utf-8',
      bom: true,
    });

    if (records.length === 0) {
      return NextResponse.json({ error: 'CSVファイルが空です' }, { status: 400 });
    }

    const year = 2026;

    // 月ごとのカラム位置（各月5列: 昨年実績, 予定数字, 実数, 昨年対比, 達成率）
    const monthColumns: { [month: number]: { lastYear: number; budget: number; actual: number } } = {};
    for (let month = 1; month <= 12; month++) {
      const baseCol = 3 + (month - 1) * 5;
      monthColumns[month] = {
        lastYear: baseCol,
        budget: baseCol + 1,
        actual: baseCol + 2,
      };
    }

    // ── 1. MonthlyAccounting（集計データ）の保存 ──
    let importCount = 0;
    for (let month = 1; month <= 12; month++) {
      const cols = monthColumns[month];

      let salesRevenue = 0;
      let salesDiscount = 0;
      let costOfSales = 0;
      let grossProfit = 0;
      let marginProfit: number | null = null;
      let marginProfitRate: number | null = null;
      let budgetSales: number | null = null;
      let budgetGrossProfit: number | null = null;
      let budgetMarginProfit: number | null = null;
      let lastYearSalesRevenue: number | null = null;
      let lastYearCostOfSales: number | null = null;
      let lastYearGrossProfit: number | null = null;
      let lastYearMarginProfit: number | null = null;

      let costOfSalesDone = false;
      for (const record of records) {
        const label = (record[0]?.trim() || record[1]?.trim() || '');
        if (!label) continue;

        if (label === '売上高合計') {
          salesRevenue = parseAmount(record[cols.actual]);
          budgetSales = parseAmountNullable(record[cols.budget]);
          lastYearSalesRevenue = parseAmountNullable(record[cols.lastYear]);
        } else if (label === '売上値引・返品') {
          salesDiscount = parseAmount(record[cols.actual]);
        } else if (label === '売上原価' && !costOfSalesDone) {
          costOfSales = parseAmount(record[cols.actual]);
          lastYearCostOfSales = parseAmountNullable(record[cols.lastYear]);
          costOfSalesDone = true;
        } else if (label === '売上総利益') {
          grossProfit = parseAmount(record[cols.actual]);
          budgetGrossProfit = parseAmountNullable(record[cols.budget]);
          lastYearGrossProfit = parseAmountNullable(record[cols.lastYear]);
        } else if (label === '限界利益') {
          marginProfit = parseAmountNullable(record[cols.actual]);
          budgetMarginProfit = parseAmountNullable(record[cols.budget]);
          lastYearMarginProfit = parseAmountNullable(record[cols.lastYear]);
        } else if (label === '限界利益率') {
          marginProfitRate = parseAmountNullable(record[cols.actual]);
        }
      }

      if (salesRevenue > 0 || budgetSales !== null) {
        const grossProfitRate = salesRevenue > 0 ? grossProfit / salesRevenue : 0;
        await prisma.monthlyAccounting.upsert({
          where: { year_month: { year, month } },
          update: {
            salesRevenue, salesDiscount, costOfSales, grossProfit, grossProfitRate,
            marginProfit, marginProfitRate,
            budgetSales, budgetGrossProfit, budgetMarginProfit,
            lastYearSalesRevenue, lastYearCostOfSales, lastYearGrossProfit, lastYearMarginProfit,
          },
          create: {
            year, month,
            salesRevenue, salesDiscount, costOfSales, grossProfit, grossProfitRate,
            marginProfit, marginProfitRate,
            budgetSales, budgetGrossProfit, budgetMarginProfit,
            lastYearSalesRevenue, lastYearCostOfSales, lastYearGrossProfit, lastYearMarginProfit,
          },
        });
        importCount++;
      }
    }

    // ── 2. AccountingLineItem（明細行）の保存 ──
    let lineItemCount = 0;

    for (let index = 2; index < Math.min(records.length, 103); index++) {
      const row = records[index] as string[];

      const rowLabel = row[0]?.trim() || '';
      const category = row[1]?.trim() || '';
      let subcategory = row[2]?.trim() || '';

      if (subcategory === 'a') subcategory = '';
      if (category === 'a') continue;

      let displayCategory = '';
      let displaySubcategory = '';

      if (category) {
        displayCategory = category;
        displaySubcategory = subcategory;
      } else if (subcategory) {
        displayCategory = '';
        displaySubcategory = subcategory;
      } else if (rowLabel) {
        displayCategory = rowLabel;
        displaySubcategory = '';
      } else {
        continue;
      }

      const months = [];
      for (let month = 1; month <= 12; month++) {
        const cols = monthColumns[month];
        months.push({
          month,
          lastYear: parseAmountNullable(row[cols.lastYear]),
          budget: parseAmountNullable(row[cols.budget]),
          actual: parseAmountNullable(row[cols.actual]),
        });
      }

      await prisma.accountingLineItem.upsert({
        where: { year_rowIndex: { year, rowIndex: index } },
        update: {
          category: displayCategory,
          subcategory: displaySubcategory,
          monthsJson: JSON.stringify(months),
        },
        create: {
          year,
          rowIndex: index,
          category: displayCategory,
          subcategory: displaySubcategory,
          monthsJson: JSON.stringify(months),
        },
      });
      lineItemCount++;
    }

    return NextResponse.json({
      success: true,
      message: `${importCount}ヶ月分の集計データと${lineItemCount}行の明細データをインポートしました`,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error('Upload API Error:', error);
    return NextResponse.json(
      { error: 'アップロード処理に失敗しました', detail: msg },
      { status: 500 }
    );
  }
}

function parseAmount(value: string): number {
  if (!value || value === '' || value === '#DIV/0!' || value === '#VALUE!') return 0;
  if (value.includes('E+') || value.includes('e+')) return parseFloat(value);
  if (value.trim().startsWith('(') && value.trim().endsWith(')')) {
    const cleaned = value.replace(/[()¥,\s円]/g, '').replace(/["']/g, '');
    const num = parseFloat(cleaned);
    return isNaN(num) ? 0 : -num;
  }
  const cleaned = value.replace(/[¥,\s円]/g, '');
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

function parseAmountNullable(value: string): number | null {
  if (!value || value.trim() === '' || value === '-') return null;
  return parseAmount(value);
}
