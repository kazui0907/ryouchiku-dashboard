import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { parse } from 'csv-parse/sync';
import iconv from 'iconv-lite';

// ---- 数値パース -------------------------------------------------------

function parseNum(v: string | undefined | null): number | null {
  if (!v) return null;
  const s = v.replace(/[¥,\s"']/g, '').trim();
  if (s === '' || s === '-') return null;
  const n = parseFloat(s);
  return isNaN(n) ? null : n;
}

function parseNumZ(v: string | undefined | null): number {
  return parseNum(v) ?? 0;
}

// ---- CSV読み込み（Shift-JIS対応）--------------------------------------

function decodeCSV(buffer: Buffer): string[][] {
  // BOMチェック
  const isUTF8BOM = buffer[0] === 0xef && buffer[1] === 0xbb && buffer[2] === 0xbf;
  const text = isUTF8BOM
    ? buffer.toString('utf8')
    : iconv.decode(buffer, 'Shift_JIS');

  return parse(text, {
    columns: false,
    skip_empty_lines: false,
    relax_quotes: true,
    relax_column_count: true,
  }) as string[][];
}

// ---- ファイル種別判定 -------------------------------------------------

function detectType(rows: string[][]): 'pl' | 'bs' | 'unknown' {
  for (let i = 0; i < Math.min(rows.length, 10); i++) {
    const col0 = (rows[i][0] || '').trim();
    if (col0 === '売上高') return 'pl';
    if (col0 === '資産の部') return 'bs';
  }
  return 'unknown';
}

// ---- 損益計算書パース -------------------------------------------------

const PL_SUMMARY_LABELS = [
  '売上高合計', '売上原価合計', '売上総利益',
  '販売費及び一般管理費合計', '営業利益',
];
// 限界利益 = 売上総利益 + 労務費 + 労務費賞与（固定費を除いた変動利益）
const PL_ACCOUNT_LABELS = ['労務費', '労務費賞与'];

async function parsePL(rows: string[][], year: number) {
  // 集計行を抽出（col3〜col14 = 1月〜12月）
  const summary: Record<string, (number | null)[]> = {};
  // 勘定科目行（col1）を抽出
  const accounts: Record<string, (number | null)[]> = {};
  for (const row of rows) {
    const col0 = (row[0] || '').trim();
    const col1 = (row[1] || '').trim();
    if (PL_SUMMARY_LABELS.includes(col0)) {
      summary[col0] = Array.from({ length: 12 }, (_, i) => parseNum(row[i + 3]));
    }
    if (PL_ACCOUNT_LABELS.includes(col1) && !accounts[col1]) {
      accounts[col1] = Array.from({ length: 12 }, (_, i) => parseNum(row[i + 3]));
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const txOps: any[] = [];
  let importCount = 0;
  let lineItemCount = 0;

  // 1. MonthlyAccounting（月次サマリー）
  for (let month = 1; month <= 12; month++) {
    const idx = month - 1;
    const salesRevenue  = summary['売上高合計']?.[idx]                    ?? 0;
    const costOfSales   = summary['売上原価合計']?.[idx]                   ?? 0;
    const grossProfit   = summary['売上総利益']?.[idx]                     ?? 0;
    const sgaExpenses   = summary['販売費及び一般管理費合計']?.[idx]       ?? null;
    const operatingProfit = summary['営業利益']?.[idx]                     ?? null;
    const grossProfitRate = salesRevenue > 0 ? grossProfit / salesRevenue : 0;

    // 限界利益 = 売上総利益 + 労務費 + 労務費賞与（固定人件費を変動費から除外）
    const laborCost  = accounts['労務費']?.[idx]   ?? 0;
    const laborBonus = accounts['労務費賞与']?.[idx] ?? 0;
    const marginProfit     = grossProfit + laborCost + laborBonus;
    const marginProfitRate = salesRevenue > 0 ? marginProfit / salesRevenue : 0;

    // データが全くない月はスキップ
    if (salesRevenue === 0 && grossProfit === 0 && operatingProfit === null) continue;

    txOps.push(
      prisma.monthlyAccounting.upsert({
        where: { year_month: { year, month } },
        update: {
          salesRevenue, costOfSales, grossProfit, grossProfitRate,
          marginProfit, marginProfitRate,
          sgaExpenses, operatingProfit,
        },
        create: {
          year, month,
          salesRevenue, costOfSales, grossProfit, grossProfitRate,
          marginProfit, marginProfitRate,
          sgaExpenses, operatingProfit,
        },
      })
    );
    importCount++;
  }

  // 2. AccountingLineItem（明細行）
  // ヘッダー行をスキップしつつ、値を持つ行を保存
  let rowIndex = 0;
  let currentSection = '';
  for (const row of rows.slice(1)) {
    rowIndex++;
    const col0 = (row[0] || '').trim();
    const col1 = (row[1] || '').trim();
    const col2 = (row[2] || '').trim();

    // セクションヘッダー（例: "売上高", "売上原価"）- 値なし行はスキップ
    if (col0 && !col1 && !col2) {
      currentSection = col0;
      continue;
    }

    // カテゴリ・補助科目を決定
    let category = '';
    let subcategory = '';
    if (col0) {
      // 合計行（例: "売上高合計"）
      category = col0;
    } else if (col1) {
      category = col1;
      subcategory = col2;
    } else if (col2) {
      category = currentSection;
      subcategory = col2;
    } else {
      continue;
    }

    // 月次データ（col3〜col14 = 1月〜12月）
    const months = Array.from({ length: 12 }, (_, i) => ({
      month: i + 1,
      lastYear: null as number | null,
      budget: null as number | null,
      actual: parseNum(row[i + 3]),
    }));

    // 全月データなしの行はスキップ
    if (months.every(m => m.actual === null)) continue;

    txOps.push(
      prisma.accountingLineItem.upsert({
        where: { year_rowIndex: { year, rowIndex } },
        update: { category, subcategory, monthsJson: JSON.stringify(months) },
        create: { year, rowIndex, category, subcategory, monthsJson: JSON.stringify(months) },
      })
    );
    lineItemCount++;
  }

  await prisma.$transaction(txOps, { timeout: 60000 });
  return { importCount, lineItemCount };
}

// ---- 貸借対照表パース -------------------------------------------------

const BS_FIELD_MAP: Record<string, string> = {
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

async function parseBS(rows: string[][], year: number) {
  const summary: Record<string, (number | null)[]> = {};
  for (const row of rows) {
    const label = (row[0] || '').trim();
    if (BS_FIELD_MAP[label]) {
      summary[label] = Array.from({ length: 12 }, (_, i) => parseNum(row[i + 3]));
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const txOps: any[] = [];
  let importCount = 0;

  for (let month = 1; month <= 12; month++) {
    const idx = month - 1;
    const totalAssets = summary['資産の部合計']?.[idx] ?? null;
    if (totalAssets === null) continue; // データなし月はスキップ

    const data = Object.fromEntries(
      Object.entries(BS_FIELD_MAP).map(([label, field]) => [
        field,
        summary[label]?.[idx] ?? null,
      ])
    );

    txOps.push(
      prisma.balanceSheet.upsert({
        where: { year_month: { year, month } },
        update: data,
        create: { year, month, ...data },
      })
    );
    importCount++;
  }

  await prisma.$transaction(txOps, { timeout: 30000 });
  return { importCount };
}

// ---- メインハンドラ ---------------------------------------------------

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const yearStr = formData.get('year') as string;

    if (!file) {
      return NextResponse.json({ error: 'ファイルが選択されていません' }, { status: 400 });
    }
    const year = parseInt(yearStr || '2025');
    if (isNaN(year) || year < 2000 || year > 2100) {
      return NextResponse.json({ error: '年度が正しくありません' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const rows = decodeCSV(buffer);

    if (rows.length === 0) {
      return NextResponse.json({ error: 'CSVファイルが空です' }, { status: 400 });
    }

    const type = detectType(rows);

    if (type === 'pl') {
      const { importCount, lineItemCount } = await parsePL(rows, year);
      return NextResponse.json({
        success: true,
        message: `損益計算書: ${year}年度 ${importCount}ヶ月分の集計データと${lineItemCount}行の明細データをインポートしました`,
      });
    }

    if (type === 'bs') {
      const { importCount } = await parseBS(rows, year);
      return NextResponse.json({
        success: true,
        message: `貸借対照表: ${year}年度 ${importCount}ヶ月分をインポートしました`,
      });
    }

    return NextResponse.json(
      { error: 'CSVの種類を判定できませんでした。マネーフォワードからエクスポートした「損益計算書_月次推移」または「貸借対照表_月次推移」のCSVをアップロードしてください' },
      { status: 400 }
    );
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error('Upload API Error:', error);
    return NextResponse.json(
      { error: 'アップロード処理に失敗しました', detail: msg },
      { status: 500 }
    );
  }
}

// ---- 後方互換（不要だが参照エラー防止）-------------------------------
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function _unused() { return parseNumZ; }
