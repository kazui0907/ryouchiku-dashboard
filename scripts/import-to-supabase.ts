/* ************************************************************************** */
/*                                                                            */
/*    import-to-supabase.ts                             :::      ::::::::    */
/*                                                      :+:      :+:    :+:  */
/*    By: Claude (LTS)                                  #+#  +:+       +#+    */
/*                                                    +#+#+#+#+#+   +#+       */
/*    Created: 2026/03/26 10:44 by Claude (LTS)       #+#    #+#         */
/*    Updated: 2026/03/26 10:44 by Claude (LTS)       ###   ########      */
/*                                                                            */
/*    © Life Time Support Inc.                                           */
/*                                                                            */
/* ************************************************************************** */
import { PrismaClient } from '@prisma/client';
import { parse } from 'csv-parse/sync';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

// 金額文字列をパース
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

async function importMonthlyAccounting() {
  console.log('月次会計データをインポート中...');

  const csvPath = path.resolve(__dirname, '../../【共有用】2026度月次会議用管理会計  - 月次予測.csv');
  const csvContent = fs.readFileSync(csvPath, 'utf-8');
  const records = parse(csvContent, {
    skip_empty_lines: true,
    relax_column_count: true,
  });

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

  // 特定の行からデータを抽出する関数
  const findRow = (keyword: string) => {
    return records.find((row: string[]) => {
      const label = row[1]?.trim() || row[0]?.trim();
      return label && label.includes(keyword);
    });
  };

  const salesRow = findRow('売上高合計');
  const discountRow = findRow('売上値引・返品');
  const costRow = findRow('売上原価合計');
  const grossProfitRow = findRow('売上総利益');

  let importCount = 0;

  for (let month = 1; month <= 12; month++) {
    const cols = monthColumns[month];

    const salesRevenue = salesRow ? parseAmount(salesRow[cols.actual]) : 0;
    const salesDiscount = discountRow ? parseAmount(discountRow[cols.actual]) : 0;
    const costOfSales = costRow ? parseAmount(costRow[cols.actual]) : 0;
    const grossProfit = grossProfitRow ? parseAmount(grossProfitRow[cols.actual]) : 0;

    const budgetSales = salesRow ? parseAmount(salesRow[cols.budget]) : null;
    const lastYearSalesRevenue = salesRow ? parseAmount(salesRow[cols.lastYear]) : null;
    const budgetGrossProfit = grossProfitRow ? parseAmount(grossProfitRow[cols.budget]) : null;
    const lastYearGrossProfit = grossProfitRow ? parseAmount(grossProfitRow[cols.lastYear]) : null;

    // 実績がある月のみインポート
    if (salesRevenue > 0 || budgetSales) {
      const grossProfitRate = salesRevenue > 0 ? grossProfit / salesRevenue : 0;

      await prisma.monthlyAccounting.upsert({
        where: { year_month: { year, month } },
        update: {
          salesRevenue,
          salesDiscount,
          costOfSales,
          grossProfit,
          grossProfitRate,
          budgetSales,
          budgetGrossProfit,
          lastYearSalesRevenue,
          lastYearGrossProfit,
        },
        create: {
          year,
          month,
          salesRevenue,
          salesDiscount,
          costOfSales,
          grossProfit,
          grossProfitRate,
          budgetSales,
          budgetGrossProfit,
          lastYearSalesRevenue,
          lastYearGrossProfit,
        },
      });

      console.log(`  ${month}月: 売上=${salesRevenue.toLocaleString()}円, 粗利=${grossProfit.toLocaleString()}円`);
      importCount++;
    }
  }

  console.log(`✓ ${importCount}ヶ月分のデータをインポートしました\n`);
}

async function importAccountingLineItems() {
  console.log('管理会計明細行をインポート中...');

  const csvPath = path.resolve(__dirname, '../../【共有用】2026度月次会議用管理会計  - 月次予測.csv');
  const csvContent = fs.readFileSync(csvPath, 'utf-8');
  const records = parse(csvContent, {
    skip_empty_lines: true,
    relax_column_count: true,
  });

  const year = 2026;

  // 月ごとのカラム位置
  const monthColumns: { [month: number]: { lastYear: number; budget: number; actual: number } } = {};
  for (let month = 1; month <= 12; month++) {
    const baseCol = 3 + (month - 1) * 5;
    monthColumns[month] = {
      lastYear: baseCol,
      budget: baseCol + 1,
      actual: baseCol + 2,
    };
  }

  let lineItemCount = 0;

  for (let index = 2; index < Math.min(records.length, 103); index++) {
    const row = records[index];

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

  console.log(`✓ ${lineItemCount}行の明細データをインポートしました\n`);
}

async function main() {
  console.log('=== Supabaseへのデータインポート開始 ===\n');

  try {
    await importMonthlyAccounting();
    await importAccountingLineItems();
    console.log('=== すべてのインポートが完了しました ===');
  } catch (error) {
    console.error('エラーが発生しました:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main();
