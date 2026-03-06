import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

// CSVファイルのパス（Google Drive data/csv フォルダ）
const baseDir = '/Users/kazui/Library/CloudStorage/GoogleDrive-ryouchiku@life-time-support.com/共有ドライブ/ryouchiku-workspace/data/csv';
const weeklyKpiCsvPath = path.join(baseDir, '【共有用】2026度月次会議用管理会計  - 週次KPI（積極版）.csv');
const weeklySiteKpiCsvPath = path.join(baseDir, '【共有用】2026度月次会議用管理会計  - 週次現場KPI（積極版）.csv');

// 値をパース（空文字、null、undefinedをnullに、それ以外を数値に変換）
function parseValue(value: string | number | null | undefined): number | null {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'number') return value;

  // パーセント記号を削除
  const cleaned = value.replace(/%/g, '').replace(/,/g, '').trim();
  if (cleaned === '' || cleaned === '#DIV/0!') return null;

  const num = parseFloat(cleaned);
  return isNaN(num) ? null : num;
}

// パーセント値を小数に変換（例: 87.5% → 0.875）
function parsePercentage(value: string | null | undefined): number | null {
  if (value === null || value === undefined || value === '') return null;
  const cleaned = value.replace(/%/g, '').replace(/,/g, '').trim();
  if (cleaned === '' || cleaned === '#DIV/0!') return null;
  const num = parseFloat(cleaned);
  return isNaN(num) ? null : num / 100;
}

// 週次KPI（積極版）のインポート
async function importWeeklyKpi() {
  console.log('週次KPI（積極版）のインポートを開始...');

  const csvContent = fs.readFileSync(weeklyKpiCsvPath, 'utf-8');
  const lines = csvContent.split('\n');

  const kpiItems = [
    '問合件数',
    'メインターゲット数',
    'メインターゲット率',
    'meta広告問合せ',
    'SR商談件数',
    'MEET商談件数',
    '商談設定率',
    '受注件数',
    '受注率',
    '平均限界粗利単価',
    '施工部残業時間',
    '営業部残業時間',
  ];

  // 月ごとのデータを処理
  const monthData: { [month: number]: { [itemName: string]: any } } = {};

  let currentMonth = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const columns = line.split(',');

    // 月のヘッダーを検出（1月、2月、3月...）
    if (columns[0] && columns[0].match(/^(\d+)月$/)) {
      const match = columns[0].match(/^(\d+)月$/);
      if (match) {
        currentMonth = parseInt(match[1]);
        monthData[currentMonth] = {};
        console.log(`${currentMonth}月のデータを処理中...`);
        continue;
      }
    }

    // KPI項目の行を処理
    if (currentMonth > 0 && columns[0]) {
      const itemName = columns[0].trim();

      if (kpiItems.includes(itemName)) {
        // パーセント項目かどうかを判定
        const isPercentageItem = itemName.includes('率');

        const data: any = {
          itemName,
          week1Target: null,
          week1Actual: null,
          week2Target: null,
          week2Actual: null,
          week3Target: null,
          week3Actual: null,
          week4Target: null,
          week4Actual: null,
          week5Target: null,
          week5Actual: null,
        };

        // 各週のデータを抽出
        // 第1週: columns[1], columns[2]
        // 第2週: columns[4], columns[5]
        // 第3週: columns[7], columns[8]
        // 第4週: columns[10], columns[11]
        // 第5週: columns[13], columns[14]

        if (isPercentageItem) {
          data.week1Target = parsePercentage(columns[1]);
          data.week1Actual = parsePercentage(columns[2]);
          data.week2Target = parsePercentage(columns[4]);
          data.week2Actual = parsePercentage(columns[5]);
          data.week3Target = parsePercentage(columns[7]);
          data.week3Actual = parsePercentage(columns[8]);
          data.week4Target = parsePercentage(columns[10]);
          data.week4Actual = parsePercentage(columns[11]);
          data.week5Target = parsePercentage(columns[13]);
          data.week5Actual = parsePercentage(columns[14]);
        } else {
          data.week1Target = parseValue(columns[1]);
          data.week1Actual = parseValue(columns[2]);
          data.week2Target = parseValue(columns[4]);
          data.week2Actual = parseValue(columns[5]);
          data.week3Target = parseValue(columns[7]);
          data.week3Actual = parseValue(columns[8]);
          data.week4Target = parseValue(columns[10]);
          data.week4Actual = parseValue(columns[11]);
          data.week5Target = parseValue(columns[13]);
          data.week5Actual = parseValue(columns[14]);
        }

        monthData[currentMonth][itemName] = data;
      }
    }
  }

  // データベースに保存
  for (const [month, items] of Object.entries(monthData)) {
    const monthNum = parseInt(month);
    console.log(`${monthNum}月のデータを保存中...`);

    // 既存データを削除
    await prisma.weeklyKPI.deleteMany({
      where: { year: 2026, month: monthNum },
    });

    // 新しいデータを作成
    for (const [itemName, data] of Object.entries(items)) {
      await prisma.weeklyKPI.create({
        data: {
          year: 2026,
          month: monthNum,
          itemName: data.itemName,
          week1Target: data.week1Target,
          week1Actual: data.week1Actual,
          week1Rate: null,
          week2Target: data.week2Target,
          week2Actual: data.week2Actual,
          week2Rate: null,
          week3Target: data.week3Target,
          week3Actual: data.week3Actual,
          week3Rate: null,
          week4Target: data.week4Target,
          week4Actual: data.week4Actual,
          week4Rate: null,
          week5Target: data.week5Target,
          week5Actual: data.week5Actual,
          week5Rate: null,
        },
      });
    }

    console.log(`${monthNum}月のデータを保存しました (${Object.keys(items).length}件)`);
  }
}

// 週次現場KPI（積極版）のインポート
async function importWeeklySiteKpi() {
  console.log('週次現場KPI（積極版）のインポートを開始...');

  const csvContent = fs.readFileSync(weeklySiteKpiCsvPath, 'utf-8');
  const lines = csvContent.split('\n');

  const siteKpiStructure = [
    { mainItem: '問合数', subItems: ['コンバージョン単価', 'ユーザー数', '指定物件ＳＮＳ投稿数'] },
    { mainItem: '商談件数', subItems: ['追客架電（商談前）', 'メイン商材ない人にアクション'] },
    { mainItem: '受注件数', subItems: ['ロープレ回数', '新規商談平均粗利額', '景山', '京屋', '中谷', '熊田', '大島', '森谷', '星野', '安栗', 'SR'] },
    { mainItem: '顧客満足向上', subItems: ['ありがとうカード配布数', '口コミ回収率'] },
    { mainItem: '不動産', subItems: ['交渉物件数'] },
    { mainItem: 'IT', subItems: ['商談件数', '成約率'] },
  ];

  // 月ごとのデータを処理
  const monthData: { [month: number]: Array<any> } = {};

  let currentMonth = 0;
  let currentMainItem = '';

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const columns = line.split(',');

    // 月のヘッダーを検出（1月、2月、3月...）
    if (columns[0] && columns[0].match(/^(\d+)月$/)) {
      const match = columns[0].match(/^(\d+)月$/);
      if (match) {
        currentMonth = parseInt(match[1]);
        monthData[currentMonth] = [];
        console.log(`${currentMonth}月のデータを処理中...`);
        continue;
      }
    }

    // KPI項目の行を処理
    if (currentMonth > 0) {
      // メイン項目を検出
      if (columns[0] && columns[0].trim() !== '') {
        const mainItem = columns[0].trim();
        const structure = siteKpiStructure.find(s => s.mainItem === mainItem);
        if (structure) {
          currentMainItem = mainItem;
        }
      }

      // サブ項目を検出
      if (currentMainItem && columns[1] && columns[1].trim() !== '') {
        const subItem = columns[1].trim();
        const structure = siteKpiStructure.find(s => s.mainItem === currentMainItem);

        if (structure && structure.subItems.some(si => subItem.includes(si) || si.includes(subItem))) {
          // パーセント項目かどうかを判定
          const isPercentageItem = subItem.includes('架電') || subItem.includes('アクション') || subItem.includes('率');

          const data: any = {
            mainItem: currentMainItem,
            subItem: subItem,
            week1Target: null,
            week1Actual: null,
            week2Target: null,
            week2Actual: null,
            week3Target: null,
            week3Actual: null,
            week4Target: null,
            week4Actual: null,
            week5Target: null,
            week5Actual: null,
          };

          // 各週のデータを抽出
          if (isPercentageItem) {
            data.week1Target = parsePercentage(columns[2]);
            data.week1Actual = parsePercentage(columns[3]);
            data.week2Target = parsePercentage(columns[5]);
            data.week2Actual = parsePercentage(columns[6]);
            data.week3Target = parsePercentage(columns[8]);
            data.week3Actual = parsePercentage(columns[9]);
            data.week4Target = parsePercentage(columns[11]);
            data.week4Actual = parsePercentage(columns[12]);
            data.week5Target = parsePercentage(columns[14]);
            data.week5Actual = parsePercentage(columns[15]);
          } else {
            data.week1Target = parseValue(columns[2]);
            data.week1Actual = parseValue(columns[3]);
            data.week2Target = parseValue(columns[5]);
            data.week2Actual = parseValue(columns[6]);
            data.week3Target = parseValue(columns[8]);
            data.week3Actual = parseValue(columns[9]);
            data.week4Target = parseValue(columns[11]);
            data.week4Actual = parseValue(columns[12]);
            data.week5Target = parseValue(columns[14]);
            data.week5Actual = parseValue(columns[15]);
          }

          monthData[currentMonth].push(data);
        }
      }
    }
  }

  // データベースに保存
  for (const [month, items] of Object.entries(monthData)) {
    const monthNum = parseInt(month);
    console.log(`${monthNum}月のデータを保存中...`);

    // 既存データを削除
    await prisma.weeklySiteKPI.deleteMany({
      where: { year: 2026, month: monthNum },
    });

    // 重複を除去
    const uniqueItems = new Map<string, any>();
    for (const data of items) {
      const key = `${data.mainItem}::${data.subItem}`;
      if (!uniqueItems.has(key)) {
        uniqueItems.set(key, data);
      }
    }

    // 新しいデータを作成
    for (const data of uniqueItems.values()) {
      await prisma.weeklySiteKPI.create({
        data: {
          year: 2026,
          month: monthNum,
          mainItem: data.mainItem,
          subItem: data.subItem,
          week1Target: data.week1Target,
          week1Actual: data.week1Actual,
          week1Rate: null,
          week2Target: data.week2Target,
          week2Actual: data.week2Actual,
          week2Rate: null,
          week3Target: data.week3Target,
          week3Actual: data.week3Actual,
          week3Rate: null,
          week4Target: data.week4Target,
          week4Actual: data.week4Actual,
          week4Rate: null,
          week5Target: data.week5Target,
          week5Actual: data.week5Actual,
          week5Rate: null,
        },
      });
    }

    console.log(`${monthNum}月のデータを保存しました (${uniqueItems.size}件)`);
  }
}

// メイン処理
async function main() {
  try {
    console.log('CSVデータのインポートを開始します...\n');

    await importWeeklyKpi();
    console.log('\n週次KPI（積極版）のインポートが完了しました\n');

    await importWeeklySiteKpi();
    console.log('\n週次現場KPI（積極版）のインポートが完了しました\n');

    console.log('全てのインポートが完了しました！');
  } catch (error) {
    console.error('エラーが発生しました:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main();
