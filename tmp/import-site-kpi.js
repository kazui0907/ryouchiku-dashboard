const fs = require('fs');
const https = require('https');
const { parse } = require('csv-parse/sync');

// CSV上の名前 → DB保存名のマッピング
const SUBITEM_RENAME = {
  '新規商談平均粗利額': 'MEET商談平均粗利額',
  'SR': 'SR商談平均粗利額',
};

const SITE_KPI_STRUCTURE = [
  { mainItem: '問合数', subItems: ['コンバージョン単価', 'ユーザー数', '指定物件ＳＮＳ投稿数', '指定物件ＳＮＸ投稿'] },
  { mainItem: '商談件数', subItems: ['追客架電（商談前）', 'メイン商材ない人にアクション'] },  // CSVの全角カッコと一致
  { mainItem: '受注件数', subItems: ['ロープレ回数'] },
  {
    mainItem: '平均限界利益額',
    subItems: ['MEET商談平均粗利額', '景山', '京屋', '中谷', '熊田', '大島', '森谷', '星野', '安栗', 'SR商談平均粗利額', 'SR_京屋', 'SR_熊田', 'SR_星野', 'SR_安栗'],
  },
  { mainItem: '顧客満足向上', subItems: ['ありがとうカード配布数', '口コミ回収率'] },  // CSVと一致
  { mainItem: '不動産', subItems: ['交渉物件数'] },
  { mainItem: 'IT', subItems: ['商談件数', '成約率'] },
];

const ALL_MAIN_ITEMS = SITE_KPI_STRUCTURE.map(s => s.mainItem);

function isKnownSubItem(mainItem, subItemName) {
  const struct = SITE_KPI_STRUCTURE.find(s => s.mainItem === mainItem);
  if (!struct) return false;
  return struct.subItems.includes(subItemName);
}

function parseVal(value) {
  if (!value || value.trim() === '' || value === '#DIV/0!' || value === '#VALUE!') return null;
  const cleaned = value.replace(/%/g, '').replace(/,/g, '').trim();
  if (cleaned === '' || cleaned === '-') return null;
  const num = parseFloat(cleaned);
  return isNaN(num) ? null : num;
}

function parsePercent(value) {
  const v = parseVal(value);
  return v !== null ? v / 100 : null;
}

const csvPath = 'G:/共有ドライブ/ryouchiku-workspace/group/board of directors/【共有用】2026度月次会議用管理会計  - 週次現場KPI（積極版）.csv';
const text = fs.readFileSync(csvPath, 'utf-8');
const records = parse(text, { columns: false, skip_empty_lines: false, bom: true });

const year = 2026;
let currentMonth = 0;
let currentMainItem = '';
let afterSR = false; // SRの次の京屋・熊田・星野・安栗はSR配下として扱う
const SR_SUB = ['京屋', '熊田', '星野', '安栗'];
const monthData = {};

for (const record of records) {
  const col0 = record[0]?.trim() || '';
  const col1Raw = record[1] || '';
  const col1 = col1Raw.replace(/^[\s\u3000]+/, '').trim();

  const monthMatch = col0.match(/^(\d+)月$/);
  if (monthMatch) {
    currentMonth = parseInt(monthMatch[1]);
    currentMainItem = '';
    afterSR = false;
    if (!monthData[currentMonth]) monthData[currentMonth] = [];
    continue;
  }

  if (currentMonth === 0) continue;

  if (col0 && ALL_MAIN_ITEMS.includes(col0)) {
    currentMainItem = col0;
    afterSR = false;
  }

  if (!currentMainItem || !col1) continue;

  // CSV上の名前をDB保存名に変換
  const mappedName = SUBITEM_RENAME[col1] || col1;

  // SRの後の京屋・熊田・星野・安栗はSR_プレフィックスをつける
  let subItemName;
  if (currentMainItem === '平均限界利益額') {
    if (mappedName === 'SR商談平均粗利額') {
      afterSR = true;
      subItemName = 'SR商談平均粗利額';
    } else if (afterSR && SR_SUB.includes(col1)) {
      subItemName = `SR_${col1}`;
      // SR配下を全部処理したら終了
      if (col1 === '安栗') afterSR = false;
    } else {
      if (afterSR) continue; // SR後の未知行はスキップ
      subItemName = mappedName;
    }
  } else {
    subItemName = mappedName;
  }

  if (!isKnownSubItem(currentMainItem, subItemName)) continue;

  // 既に同じ(mainItem, subItem)があればスキップ（重複防止）
  const existing = monthData[currentMonth].find(d => d.mainItem === currentMainItem && d.subItem === subItemName);
  if (existing) continue;

  const isPercent = col1.includes('率') || col1.includes('架電') || col1.includes('アクション') || col1.includes('成約');
  const p = isPercent ? parsePercent : parseVal;

  monthData[currentMonth].push({
    mainItem: currentMainItem,
    subItem: subItemName,
    weeks: {
      week1: { target: p(record[2]), actual: p(record[3]) },
      week2: { target: p(record[5]), actual: p(record[6]) },
      week3: { target: p(record[8]), actual: p(record[9]) },
      week4: { target: p(record[11]), actual: p(record[12]) },
      week5: { target: p(record[14]), actual: p(record[15]) },
    }
  });
}

function postData(path, body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const options = {
      hostname: 'ryouchiku-dashboard.vercel.app',
      path, method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) },
      timeout: 30000
    };
    const req = https.request(options, (res) => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(d) }); }
        catch { resolve({ status: res.statusCode, body: d }); }
      });
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

async function main() {
  // 各月のデータをプレビュー
  const months = Object.keys(monthData).map(Number).sort((a, b) => a - b);
  for (const month of months) {
    const items = monthData[month];
    console.log(`${month}月: ${items.length}件`);
    items.forEach(i => console.log(`  ${i.mainItem} / ${i.subItem}`));
  }

  const readline = require('readline').createInterface({ input: process.stdin, output: process.stdout });
  readline.question('\nインポートしますか？ (y/N): ', async (ans) => {
    readline.close();
    if (ans.toLowerCase() !== 'y') { console.log('キャンセルしました'); return; }

    for (const month of months) {
      const items = monthData[month];
      if (items.length === 0) continue;
      const result = await postData('/api/admin/weekly-site-kpi', { year, month, items, mode: 'import' });
      console.log(`${month}月 (${items.length}件):`, result.status, result.body.message || result.body.error);
    }
    console.log('週次現場KPIインポート完了');
  });
}

main().catch(console.error);
