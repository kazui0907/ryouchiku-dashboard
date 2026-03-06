import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import { parse } from 'csv-parse/sync';

const prisma = new PrismaClient();

// CSVファイルのパス(親ディレクトリ)
const csvDir = path.join(__dirname, '../../');

// 金額文字列をパース (¥13,052,960 → 13052960)
function parseAmount(value: string | null | undefined): number {
  if (!value || value === '' || value === '#DIV/0!' || value === '#VALUE!') return 0;

  // 科学的記数法のチェック (例: 1.09E+08)
  if (value.includes('E+') || value.includes('e+')) {
    return parseFloat(value);
  }

  // 通常の金額表記
  const cleaned = value.replace(/[¥,\s円]/g, '');
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

// パーセント文字列をパース (87.5% → 0.875)
function parsePercent(value: string | null | undefined): number {
  if (!value || value === '' || value === '#DIV/0!' || value === '#VALUE!') return 0;
  const cleaned = value.replace('%', '');
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num / 100;
}

// 整数をパース
function parseInt(value: string | null | undefined): number {
  if (!value || value === '' || value === '#DIV/0!' || value === '#VALUE!') return 0;
  const cleaned = value.replace(/[,\s]/g, '');
  const num = Number(cleaned);
  return isNaN(num) ? 0 : Math.round(num);
}

// MF資料CSVから月次会計データをインポート
async function importMonthlyAccounting() {
  console.log('月次会計データのインポート中...');

  const csvPath = path.join(csvDir, '【共有用】2026度月次会議用管理会計  - mf資料.csv');
  const fileContent = fs.readFileSync(csvPath, 'utf-8');
  const records = parse(fileContent, {
    columns: false,
    skip_empty_lines: true,
    encoding: 'utf-8',
    bom: true
  });

  // ヘッダー行を取得 (1月, 2月, ...)
  const headers = records[0];
  const months = headers.slice(3).filter((h: string) => h); // 3列目以降が月データ

  // データを月ごとに処理
  for (let monthIdx = 0; monthIdx < months.length; monthIdx++) {
    const month = monthIdx + 1; // 1月 = 1
    const colIdx = monthIdx + 3; // CSVの列インデックス

    // 各行からデータを取得
    let salesRevenue = 0;
    let salesDiscount = 0;
    let costOfSales = 0;
    let grossProfit = 0;
    let sgaExpenses = 0;

    for (const record of records) {
      const label = record[1]; // 勘定科目

      if (!label) continue;

      if (label === '売上高') {
        salesRevenue = parseAmount(record[colIdx]);
      } else if (label === '売上値引・返品') {
        salesDiscount = parseAmount(record[colIdx]);
      } else if (label.includes('売上高合計')) {
        salesRevenue = parseAmount(record[colIdx]);
      } else if (label.includes('売上原価合計')) {
        costOfSales = parseAmount(record[colIdx]);
      } else if (label.includes('売上総利益')) {
        grossProfit = parseAmount(record[colIdx]);
      }
    }

    const grossProfitRate = salesRevenue > 0 ? grossProfit / salesRevenue : 0;

    await prisma.monthlyAccounting.upsert({
      where: { year_month: { year: 2026, month } },
      update: {
        salesRevenue,
        salesDiscount,
        costOfSales,
        grossProfit,
        grossProfitRate,
      },
      create: {
        year: 2026,
        month,
        salesRevenue,
        salesDiscount,
        costOfSales,
        grossProfit,
        grossProfitRate,
      },
    });
  }

  console.log(`✓ 月次会計データ ${months.length}ヶ月分をインポートしました`);
}

// 週次KPICSVからデータをインポート
async function importWeeklyKPI() {
  console.log('週次KPIデータのインポート中...');

  const csvPath = path.join(csvDir, '【共有用】2026度月次会議用管理会計  - 週次KPI（積極版）.csv');
  const fileContent = fs.readFileSync(csvPath, 'utf-8');
  const records = parse(fileContent, {
    columns: false,
    skip_empty_lines: true,
    encoding: 'utf-8',
    bom: true
  });

  let count = 0;
  let currentYear = 2026;
  let currentMonth = 1;
  let weekNumber = 1;

  for (let i = 0; i < records.length; i++) {
    const record = records[i];

    // 月のヘッダー行を検出 (例: "1月", "2月")
    if (record[0] && record[0].match(/^(\d+)月$/)) {
      const match = record[0].match(/^(\d+)月$/);
      currentMonth = parseInt(match?.[1]);
      weekNumber = 1;
      continue;
    }

    // KPIデータ行
    const kpiName = record[0];
    if (!kpiName || kpiName.includes('予定') || kpiName.includes('実数')) continue;

    if (kpiName === '問合件数') {
      // 週次データを取得 (予定、実数、達成率のセット)
      for (let weekIdx = 0; weekIdx < 5; weekIdx++) {
        const baseCol = 1 + (weekIdx * 3); // 各週は3列(予定、実数、達成率)
        const target = parseInt(record[baseCol]);
        const actual = parseInt(record[baseCol + 1]);

        if (target === 0 && actual === 0) continue;

        // 週の開始日と終了日を計算(仮の日付)
        const weekStartDate = new Date(currentYear, currentMonth - 1, 1 + (weekIdx * 7));
        const weekEndDate = new Date(currentYear, currentMonth - 1, 7 + (weekIdx * 7));

        await prisma.weeklyKPI.upsert({
          where: {
            year_month_weekNumber: {
              year: currentYear,
              month: currentMonth,
              weekNumber: weekIdx + 1,
            },
          },
          update: {
            inquiryCount: actual,
            inquiryTarget: target,
          },
          create: {
            year: currentYear,
            month: currentMonth,
            weekNumber: weekIdx + 1,
            weekStartDate,
            weekEndDate,
            inquiryCount: actual,
            inquiryTarget: target,
          },
        });

        count++;
      }
    }
  }

  console.log(`✓ 週次KPIデータ ${count}件をインポートしました`);
}

// メイン実行
async function main() {
  try {
    console.log('データインポート開始...\n');

    await importMonthlyAccounting();
    await importWeeklyKPI();

    console.log('\n✓ すべてのデータのインポートが完了しました');
  } catch (error) {
    console.error('エラーが発生しました:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
