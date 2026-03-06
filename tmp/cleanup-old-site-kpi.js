// 古い名称の週次現場KPIレコードをDBから削除するスクリプト
const https = require('https');

// 削除対象：旧名称のmainItem/subItemの組み合わせ
const OLD_ENTRIES = [
  // 旧: 新規商談平均粗利額（受注件数配下・平均限界利益額配下の両方）
  { mainItem: '受注件数', subItem: '新規商談平均粗利額' },
  { mainItem: '受注件数', subItem: '景山' },
  { mainItem: '受注件数', subItem: '京屋' },
  { mainItem: '受注件数', subItem: '中谷' },
  { mainItem: '受注件数', subItem: '熊田' },
  { mainItem: '受注件数', subItem: '大島' },
  { mainItem: '受注件数', subItem: '森谷' },
  { mainItem: '受注件数', subItem: '星野' },
  { mainItem: '受注件数', subItem: '安栗' },
  { mainItem: '受注件数', subItem: 'SR' },
  // 旧: 平均限界利益額配下の旧名称
  { mainItem: '平均限界利益額', subItem: '新規商談平均粗利額' },
  { mainItem: '平均限界利益額', subItem: 'SR' },
];

function deleteData(path, body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const options = {
      hostname: 'ryouchiku-dashboard.vercel.app',
      path, method: 'DELETE',
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
  const year = 2026;
  for (let month = 1; month <= 12; month++) {
    for (const entry of OLD_ENTRIES) {
      const result = await deleteData('/api/admin/weekly-site-kpi', { year, month, ...entry });
      if (result.status !== 200 && result.status !== 404) {
        console.log(`${month}月 ${entry.mainItem}/${entry.subItem}: ${result.status}`, result.body);
      }
    }
    console.log(`${month}月 完了`);
  }
  console.log('削除完了');
}

main().catch(console.error);
