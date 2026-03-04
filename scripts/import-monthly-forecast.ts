import { PrismaClient } from '@prisma/client';
import { parse } from 'csv-parse/sync';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

// CSVファイルのパス（親ディレクトリ）
const parentDir = path.resolve(__dirname, '../../');
const csvFile = path.join(parentDir, '【共有用】2026度月次会議用管理会計  - 月次予測.csv');

// 金額をパース（科学的記数法と日本円フォーマットに対応）
function parseAmount(value: string): number {
  if (!value || value.trim() === '' || value === '-') return 0;

  // 科学的記数法の場合
  if (value.includes('E+') || value.includes('e+')) {
    return parseFloat(value);
  }

  // パーセンテージの場合
  if (value.includes('%')) {
    const cleaned = value.replace(/[%\s]/g, '');
    return parseFloat(cleaned) / 100;
  }

  // 括弧で囲まれた負の値（会計フォーマット）の場合
  // 例: (9,386,976) → -9386976
  if (value.trim().startsWith('(') && value.trim().endsWith(')')) {
    const cleaned = value.replace(/[()¥,\s円]/g, '').replace(/["']/g, '');
    const num = parseFloat(cleaned);
    return isNaN(num) ? 0 : -num;
  }

  // 通常の金額（¥記号、カンマを削除）
  const cleaned = value.replace(/[¥,\s円]/g, '').replace(/["']/g, '');
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

async function importMonthlyForecast() {
  console.log('月次予測CSVファイルを読み込んでいます...');

  // CSVファイルを読み込む
  const csvContent = fs.readFileSync(csvFile, 'utf-8');

  // CSVをパース
  const records = parse(csvContent, {
    skip_empty_lines: true,
    relax_column_count: true,
  });

  console.log(`${records.length}行のデータを読み込みました`);

  // ヘッダー行（2行目）を解析して月ごとのカラムインデックスを特定
  // Row 0: 月のラベル (1月, 2月, ...)
  // Row 1: サブヘッダー (昨年実績, 予定数字, 実数, 昨年対比, 達成率)

  const headerRow = records[1]; // 2行目がサブヘッダー

  // 各月のカラム位置を特定
  // 月次データは1月から12月まで、各月5列 (昨年実績, 予定数字, 実数, 昨年対比, 達成率)
  const monthColumns: { [month: number]: { lastYear: number; budget: number; actual: number } } = {};

  // カラムを探索（"昨年実績", "予定数字", "実数" のパターンを探す）
  // 1月は列5から開始、各月5列ずつ増える
  for (let month = 1; month <= 12; month++) {
    const baseCol = 3 + (month - 1) * 5; // 最初の3列は勘定科目等
    monthColumns[month] = {
      lastYear: baseCol,     // 昨年実績
      budget: baseCol + 1,   // 予定数字
      actual: baseCol + 2,   // 実数
    };
  }

  console.log('月ごとのカラムマッピング:', monthColumns);

  // データ行を処理
  // 各勘定科目の行を探す
  const accountMap: { [key: string]: number } = {};

  records.forEach((row: string[], index: number) => {
    if (index < 2) return; // ヘッダー行をスキップ

    // 列0または列1に勘定科目がある可能性
    const accountName = row[0]?.trim() || row[1]?.trim();
    if (accountName) {
      accountMap[accountName] = index;
      // デバッグ: 重要な行を表示
      if (accountName.includes('売上高') || accountName.includes('限界利益') || accountName.includes('売上原価') || accountName.includes('売上総利益')) {
        console.log(`  行${index}: "${accountName}"`);
      }
    }
  });

  console.log('\n見つかった勘定科目の数:', Object.keys(accountMap).length);
  console.log('\n全ての勘定科目（抜粋）:');
  Object.keys(accountMap).forEach((name, idx) => {
    if (idx < 30 || name.includes('営業') || name.includes('利益')) {
      console.log(`  [${accountMap[name]}]: "${name}"`);
    }
  });

  // 各月のデータを処理
  const year = 2026;

  // デバッグ: 売上高合計の行を確認
  if (accountMap['売上高合計']) {
    const testRow = records[accountMap['売上高合計']];
    console.log('\n売上高合計の行データ (最初の10列):', testRow.slice(0, 10));
  }

  for (let month = 1; month <= 12; month++) {
    try {
      const cols = monthColumns[month];

      // 売上高合計の行を取得
      const salesRow = records[accountMap['売上高合計']];
      const salesLastYear = salesRow ? parseAmount(salesRow[cols.lastYear]) : 0;
      const salesBudget = salesRow ? parseAmount(salesRow[cols.budget]) : 0;
      const salesActual = salesRow ? parseAmount(salesRow[cols.actual]) : 0;

      if (month === 1) {
        console.log(`\n1月のデバッグ情報:`);
        console.log(`  列位置: lastYear=${cols.lastYear}, budget=${cols.budget}, actual=${cols.actual}`);
        console.log(`  生データ: [${salesRow?.[cols.lastYear]}, ${salesRow?.[cols.budget]}, ${salesRow?.[cols.actual]}]`);
        console.log(`  パース後: lastYear=${salesLastYear}, budget=${salesBudget}, actual=${salesActual}`);
      }

      // 売上原価の行を取得
      const costRow = records[accountMap['売上原価']];
      const costLastYear = costRow ? parseAmount(costRow[cols.lastYear]) : 0;
      const costActual = costRow ? parseAmount(costRow[cols.actual]) : 0;

      // 限界利益の行を取得
      const marginRow = records[accountMap['限界利益']];
      const marginLastYear = marginRow ? parseAmount(marginRow[cols.lastYear]) : 0;
      const marginBudget = marginRow ? parseAmount(marginRow[cols.budget]) : 0;
      const marginActual = marginRow ? parseAmount(marginRow[cols.actual]) : 0;

      // 限界利益率の行を取得
      const marginRateRow = records[accountMap['限界利益率']];
      const marginRateLastYear = marginRateRow ? parseAmount(marginRateRow[cols.lastYear]) : 0;
      const marginRateBudget = marginRateRow ? parseAmount(marginRateRow[cols.budget]) : 0;
      const marginRateActual = marginRateRow ? parseAmount(marginRateRow[cols.actual]) : 0;

      // 売上総利益の行を取得
      const grossProfitRow = records[accountMap['売上総利益']];
      const grossProfitBudget = grossProfitRow ? parseAmount(grossProfitRow[cols.budget]) : 0;

      // 売上総利益を計算（売上高合計 - 売上原価）
      const grossProfitLastYear = salesLastYear - costLastYear;
      const grossProfitActual = salesActual - costActual;
      const grossProfitRate = salesActual > 0 ? grossProfitActual / salesActual : 0;

      // 営業利益の行を取得
      const operatingProfitRow = records[accountMap['営業利益']];
      const operatingProfitLastYear = operatingProfitRow ? parseAmount(operatingProfitRow[cols.lastYear]) : 0;
      const operatingProfitBudget = operatingProfitRow ? parseAmount(operatingProfitRow[cols.budget]) : 0;
      const operatingProfitActual = operatingProfitRow ? parseAmount(operatingProfitRow[cols.actual]) : 0;

      if (month === 1) {
        console.log(`\n営業利益の生データ（1月）:`)
        console.log(`  行番号: ${accountMap['営業利益']}`);
        console.log(`  生データ: [${operatingProfitRow?.[cols.lastYear]}, ${operatingProfitRow?.[cols.budget]}, ${operatingProfitRow?.[cols.actual]}]`);
        console.log(`  パース後: lastYear=${operatingProfitLastYear}, budget=${operatingProfitBudget}, actual=${operatingProfitActual}`);
      }

      // 予算データまたは昨年実績が存在する場合はデータを処理
      if (salesBudget > 0 || salesLastYear > 0 || salesActual > 0) {
        console.log(`${year}年${month}月のデータを処理中...`);
        console.log(`  売上高: 実績=${salesActual}, 予算=${salesBudget}, 昨年=${salesLastYear}`);
        console.log(`  限界利益: 実績=${marginActual}, 予算=${marginBudget}, 昨年=${marginLastYear}`);
        console.log(`  営業利益: 実績=${operatingProfitActual}, 予算=${operatingProfitBudget}, 昨年=${operatingProfitLastYear}`);

        await prisma.monthlyAccounting.upsert({
          where: { year_month: { year, month } },
          update: {
            salesRevenue: salesActual, // 実数をそのまま使用（0の場合は0）
            costOfSales: costActual,
            grossProfit: grossProfitActual,
            grossProfitRate: grossProfitRate,
            marginProfit: marginActual, // 実数をそのまま使用（0の場合は0）
            marginProfitRate: marginRateActual,
            operatingProfit: operatingProfitActual,

            // 予算データ
            budgetSales: salesBudget,
            budgetGrossProfit: grossProfitBudget,
            budgetMarginProfit: marginBudget,
            budgetOperatingProfit: operatingProfitBudget,

            // 昨年実績
            lastYearSalesRevenue: salesLastYear,
            lastYearCostOfSales: costLastYear,
            lastYearGrossProfit: grossProfitLastYear,
            lastYearMarginProfit: marginLastYear,
            lastYearOperatingProfit: operatingProfitLastYear,
          },
          create: {
            year,
            month,
            salesRevenue: salesActual, // 実数をそのまま使用（0の場合は0）
            costOfSales: costActual,
            grossProfit: grossProfitActual,
            grossProfitRate: grossProfitRate,
            marginProfit: marginActual, // 実数をそのまま使用（0の場合は0）
            marginProfitRate: marginRateActual,
            operatingProfit: operatingProfitActual,

            // 予算データ
            budgetSales: salesBudget,
            budgetGrossProfit: grossProfitBudget,
            budgetMarginProfit: marginBudget,
            budgetOperatingProfit: operatingProfitBudget,

            // 昨年実績
            lastYearSalesRevenue: salesLastYear,
            lastYearCostOfSales: costLastYear,
            lastYearGrossProfit: grossProfitLastYear,
            lastYearMarginProfit: marginLastYear,
            lastYearOperatingProfit: operatingProfitLastYear,
          },
        });

        console.log(`  ✓ ${year}年${month}月のデータを保存しました`);
      }
    } catch (error) {
      console.error(`${year}年${month}月の処理でエラー:`, error);
    }
  }

  console.log('インポート完了！');
}

importMonthlyForecast()
  .catch((error) => {
    console.error('エラーが発生しました:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
