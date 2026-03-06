import { PrismaClient } from '@prisma/client';
import { parse } from 'csv-parse/sync';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

const CSV_PATH = path.join(
  'G:/共有ドライブ/ryouchiku-workspace/group/board of directors',
  '【共有用】2026度月次会議用管理会計  - 貸借対照表.csv',
);

// 年度（ヘッダー行1列目が空なので手動指定）
const YEAR = 2026;
// CSVの月列: col3=1月, col4=2月, ... col13=11月（現時点で11ヶ月分）
const MONTH_COL_START = 3;
const MONTH_COUNT = 12; // 取りに行く列数（データがなければ0扱い）

// 合計行のラベル → DBフィールドのマッピング
const TARGET_ROWS: Record<string, keyof Omit<Parameters<typeof prisma.balanceSheet.upsert>[0]['create'], 'year' | 'month'>> = {
  '現金及び預金合計': 'cash',
  '売上債権合計':     'receivables',
  '棚卸資産合計':     'inventory',
  '流動資産合計':     'currentAssets',
  '有形固定資産合計': 'tangibleAssets',
  '固定資産合計':     'fixedAssets',
  '資産の部合計':     'totalAssets',
  '仕入債務合計':     'payables',
  '流動負債合計':     'currentLiabilities',
  '固定負債合計':     'fixedLiabilities',
  '負債の部合計':     'totalLiabilities',
  '純資産の部合計':   'netAssets',
};

function parseAmount(value: string): number | null {
  if (!value || value.trim() === '' || value === '-') return null;
  const s = value.replace(/[¥,\s]/g, '').replace(/["']/g, '');
  if (s === '' || s === '0') return 0;
  // 括弧＝負数
  const m = s.match(/^\((.+)\)$/);
  if (m) return -(parseFloat(m[1]) || 0);
  const n = parseFloat(s);
  return isNaN(n) ? null : n;
}

async function main() {
  console.log(`貸借対照表CSVをインポート: ${YEAR}年度`);

  const csvContent = fs.readFileSync(CSV_PATH, 'utf8');
  const rows: string[][] = parse(csvContent, { relax_quotes: true, skip_empty_lines: false });

  // 月ごとのデータを収集: monthly[month-1][field] = value
  const monthly: Record<string, number | null>[] = Array.from({ length: MONTH_COUNT }, () => ({}));

  for (const row of rows) {
    const label = (row[0] || '').trim();
    if (!TARGET_ROWS[label]) continue;
    const field = TARGET_ROWS[label];
    for (let m = 0; m < MONTH_COUNT; m++) {
      const colIdx = MONTH_COL_START + m;
      const val = parseAmount(row[colIdx] || '');
      monthly[m][field] = val;
    }
  }

  let saved = 0;
  for (let m = 0; m < MONTH_COUNT; m++) {
    const monthData = monthly[m];
    // 全フィールドがnullなら当月データなし → スキップ
    if (Object.values(monthData).every((v) => v === null || v === undefined)) {
      console.log(`  ${m + 1}月: データなし、スキップ`);
      continue;
    }

    await prisma.balanceSheet.upsert({
      where: { year_month: { year: YEAR, month: m + 1 } },
      update: monthData,
      create: { year: YEAR, month: m + 1, ...monthData },
    });
    console.log(`  ${m + 1}月: 保存完了 (総資産 ${monthData.totalAssets != null ? Math.round(monthData.totalAssets / 10000) + '万' : 'n/a'})`);
    saved++;
  }

  console.log(`\n完了: ${saved}ヶ月分を保存しました`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
