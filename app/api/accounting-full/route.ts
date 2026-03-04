import { NextResponse } from 'next/server';
import { parse } from 'csv-parse/sync';
import * as fs from 'fs';
import * as path from 'path';

// 金額をパース
function parseAmount(value: string): number | null {
  if (!value || value.trim() === '' || value === '-') return null;

  if (value.includes('E+') || value.includes('e+')) {
    return parseFloat(value);
  }

  if (value.includes('%')) {
    const cleaned = value.replace(/[%\s]/g, '');
    return parseFloat(cleaned) / 100;
  }

  if (value.trim().startsWith('(') && value.trim().endsWith(')')) {
    const cleaned = value.replace(/[()¥,\s円]/g, '').replace(/["']/g, '');
    const num = parseFloat(cleaned);
    return isNaN(num) ? null : -num;
  }

  const cleaned = value.replace(/[¥,\s円]/g, '').replace(/["']/g, '');
  const num = parseFloat(cleaned);
  return isNaN(num) ? null : num;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const year = parseInt(searchParams.get('year') || '2026');

    const parentDir = path.resolve(process.cwd(), '../');
    const csvFile = path.join(parentDir, '【共有用】2026度月次会議用管理会計  - 月次予測.csv');

    const csvContent = fs.readFileSync(csvFile, 'utf-8');
    const records = parse(csvContent, {
      skip_empty_lines: true,
      relax_column_count: true,
    });

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

    // 全ての項目を取得
    const items: Array<{
      category: string;
      subcategory: string;
      rowIndex: number;
      months: Array<{
        month: number;
        lastYear: number | null;
        budget: number | null;
        actual: number | null;
      }>;
    }> = [];

    records.forEach((row: string[], index: number) => {
      if (index < 2) return; // ヘッダー行をスキップ
      if (index >= 103) return; // 103行目以降は無視

      const rowLabel = row[0]?.trim() || ''; // A列：大カテゴリや集計項目
      const category = row[1]?.trim() || '';  // B列：勘定科目
      let subcategory = row[2]?.trim() || ''; // C列：補助科目

      // "a"マーカーは完全に無視
      if (subcategory === 'a') {
        subcategory = '';
      }
      if (category === 'a') {
        return; // B列が"a"の場合はスキップ
      }

      // B列またはC列に項目名がある場合はそれを使用、どちらも空の場合はA列を使用
      let displayCategory = '';
      let displaySubcategory = '';

      if (category) {
        // B列に項目名がある場合
        displayCategory = category;
        displaySubcategory = subcategory;
      } else if (subcategory) {
        // C列のみに項目名がある場合
        displayCategory = '';
        displaySubcategory = subcategory;
      } else if (rowLabel) {
        // B列もC列も空で、A列に項目名がある場合
        displayCategory = rowLabel;
        displaySubcategory = '';
      } else {
        // すべて空の場合はスキップ
        return;
      }

      // 12ヶ月分のデータを取得
      const months = [];
      for (let month = 1; month <= 12; month++) {
        const cols = monthColumns[month];
        months.push({
          month,
          lastYear: parseAmount(row[cols.lastYear]),
          budget: parseAmount(row[cols.budget]),
          actual: parseAmount(row[cols.actual]),
        });
      }

      items.push({
        category: displayCategory,
        subcategory: displaySubcategory,
        rowIndex: index,
        months,
      });
    });

    return NextResponse.json({
      year,
      items,
    });
  } catch (error) {
    console.error('Accounting Full API Error:', error);
    return NextResponse.json(
      { error: 'データの取得に失敗しました', details: String(error) },
      { status: 500 }
    );
  }
}
