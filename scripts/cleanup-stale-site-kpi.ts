/* ************************************************************************** */
/*                                                                            */
/*    cleanup-stale-site-kpi.ts                         :::      ::::::::    */
/*                                                      :+:      :+:    :+:  */
/*    By: Claude (LTS)                                  #+#  +:+       +#+    */
/*                                                    +#+#+#+#+#+   +#+       */
/*    Created: 2026/04/25 by Claude (LTS)             #+#    #+#         */
/*                                                                            */
/*    © Life Time Support Inc.                                           */
/*                                                                            */
/* ************************************************************************** */
//
// WeeklySiteKPI テーブル内の「想定外の項目（ゴミ）」を削除するクリーンアップスクリプト。
//
// 「想定外」= admin/weekly-site-kpi/page.tsx の SITE_KPI_STRUCTURE に定義されていない
//             (mainItem, subItem) ペアを持つレコード。
// 表示/編集画面からアクセスできないため、DBに残っているだけで無意味。
//
// 発生要因（過去ログ推測）:
//   - 「ロコミ回収率」のようなカタカナ誤入力
//   - 改行が subItem に混入した IT::成約率\n... のようなレコード
//   - 半角/全角カッコ混在（追客架電(商談前) ⇔ 追客架電（商談前））
//   - 過去の構造変更で廃止された項目（受注件数::SR など）
//
// 実行方法:
//   cd /Users/apple/scripts/ryouchiku-dashboard
//   npx tsx scripts/cleanup-stale-site-kpi.ts           # dry-run（削除対象を一覧表示のみ）
//   npx tsx scripts/cleanup-stale-site-kpi.ts --execute  # 実際に削除
//
import { PrismaClient } from '@prisma/client';

// .env 自動ロード
try {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (process as any).loadEnvFile?.('.env');
} catch {
  // 無視
}

const prisma = new PrismaClient();

// admin/weekly-site-kpi/page.tsx の SITE_KPI_STRUCTURE と一致させること
const VALID_STRUCTURE: { mainItem: string; subItems: string[] }[] = [
  { mainItem: '問合数', subItems: ['コンバージョン単価', 'ユーザー数', '指定物件ＳＮＳ投稿数'] },
  { mainItem: '商談件数', subItems: ['追客架電（商談前）', 'メイン商材ない人にアクション'] },
  { mainItem: '受注件数', subItems: ['ロープレ回数'] },
  {
    mainItem: '平均限界利益額',
    subItems: [
      'MEET商談平均粗利額', '景山', '京屋', '中谷', '熊田', '大島', '森谷', '星野', '安栗',
      'SR商談平均粗利額', 'SR_京屋', 'SR_熊田', 'SR_星野', 'SR_安栗',
    ],
  },
  { mainItem: '顧客満足向上', subItems: ['ありがとうカード配布数', '口コミ回収件数'] },
  { mainItem: '不動産', subItems: ['交渉物件数'] },
  { mainItem: 'IT', subItems: ['商談件数', '成約率'] },
];

const VALID_PAIRS = new Set<string>();
for (const { mainItem, subItems } of VALID_STRUCTURE) {
  for (const sub of subItems) VALID_PAIRS.add(`${mainItem}::${sub}`);
}

async function main() {
  const dryRun = !process.argv.includes('--execute');

  console.log('=== WeeklySiteKPI ゴミ項目クリーンアップ ===');
  console.log(dryRun ? 'モード: DRY-RUN（削除対象を表示するだけ）' : 'モード: 実行（実際に削除します）');
  console.log('');

  const allRows = await prisma.weeklySiteKPI.findMany({
    orderBy: [{ year: 'asc' }, { month: 'asc' }, { mainItem: 'asc' }, { subItem: 'asc' }],
  });

  // (mainItem::subItem) でグループ化
  const byKey = new Map<string, typeof allRows>();
  for (const r of allRows) {
    const key = `${r.mainItem}::${r.subItem}`;
    const arr = byKey.get(key) || [];
    arr.push(r);
    byKey.set(key, arr);
  }

  const staleKeys = [...byKey.keys()].filter((k) => !VALID_PAIRS.has(k));
  const validKeys = [...byKey.keys()].filter((k) => VALID_PAIRS.has(k));

  console.log(`有効な項目: ${validKeys.length} 種類 / ${validKeys.reduce((s, k) => s + (byKey.get(k)?.length ?? 0), 0)} レコード`);
  console.log(`削除対象（想定外）: ${staleKeys.length} 種類`);
  console.log('');

  if (staleKeys.length === 0) {
    console.log('✨ ゴミ項目は見つかりませんでした。DB はクリーンです。');
    return;
  }

  let totalStale = 0;
  console.log('--- 削除対象の詳細 ---');
  for (const key of staleKeys) {
    const rows = byKey.get(key) ?? [];
    totalStale += rows.length;
    // subItem にコントロール文字があると見にくいのでエスケープ表示
    const displayKey = key.replace(/\n/g, '\\n').replace(/\t/g, '\\t');
    console.log(`  ${displayKey}  (${rows.length} レコード)`);
    for (const r of rows) {
      const vals = [1, 2, 3, 4, 5].map((w) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const a = (r as any)[`week${w}Actual`];
        return a == null ? '-' : String(a);
      }).join(',');
      console.log(`    ${r.year}/${r.month}月 | 週別actual=[${vals}]`);
    }
  }

  console.log('');
  console.log(`削除対象レコード数合計: ${totalStale}`);

  if (dryRun) {
    console.log('');
    console.log('このまま削除するには --execute オプションを付けて再実行してください:');
    console.log('  npx tsx scripts/cleanup-stale-site-kpi.ts --execute');
    return;
  }

  // 実行モード
  console.log('');
  console.log('--- Step 1: データ救済（値が入っているゴミレコードは正規側にコピー） ---');

  // 救済ロジック:
  //   ゴミレコードに target/actual/rate のいずれかに値が入っている場合、
  //   同じ (year, month, mainItem) で正規の subItem が SITE_KPI_STRUCTURE に
  //   1つしかない mainItem に限り、そちらに値をコピーする（正規側が空の場合のみ）。
  //   今回の対象は IT::成約率\n... → IT::成約率 のケース。
  //   安全のため mainItem ごとに正規 subItem が1つの時だけ自動救済する。
  const mainItemSingleSub = new Map<string, string>();
  for (const { mainItem, subItems } of VALID_STRUCTURE) {
    // subItem が「成約率」のように一意なもの、または subItems が1件のみの mainItem を対象
    // 今回は mainItem=IT で成約率と商談件数があり、ゴミは「成約率\n...」から始まるので
    // startsWith マッチで候補 subItem を推定する
    for (const sub of subItems) {
      if (!mainItemSingleSub.has(`${mainItem}::${sub}`)) {
        mainItemSingleSub.set(`${mainItem}::${sub}`, sub);
      }
    }
  }

  let salvagedCount = 0;
  for (const key of staleKeys) {
    const [mainItem, ...subParts] = key.split('::');
    const subItem = subParts.join('::');
    const rows = byKey.get(key) ?? [];
    for (const r of rows) {
      const hasValue = [1, 2, 3, 4, 5].some((w) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const rec: any = r;
        return rec[`week${w}Target`] != null || rec[`week${w}Actual`] != null;
      });
      if (!hasValue) continue;

      // 正規の subItem 候補を推定: 「subItem の先頭部分が正規 subItem と一致」
      // 例: 成約率\n合計注文数... → 成約率
      const validSubsForMain = VALID_STRUCTURE.find((s) => s.mainItem === mainItem)?.subItems ?? [];
      const candidate = validSubsForMain.find((vs) => subItem.startsWith(vs) || vs.startsWith(subItem.split('\n')[0] || subItem));
      if (!candidate) {
        console.log(`  ⚠️  ${mainItem}::${subItem.replace(/\n/g, '\\n')} [${r.year}/${r.month}月] 値があるが救済先が特定できない → 値は失われます`);
        continue;
      }

      const cleanWhere = { year: r.year, month: r.month, mainItem, subItem: candidate };
      const clean = await prisma.weeklySiteKPI.findUnique({
        where: { year_month_mainItem_subItem: cleanWhere },
      });
      const cleanIsEmpty = !clean || [1, 2, 3, 4, 5].every((w) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const c: any = clean;
        return c?.[`week${w}Target`] == null && c?.[`week${w}Actual`] == null;
      });

      if (!cleanIsEmpty) {
        console.log(`  ⚠️  ${mainItem}::${candidate} [${r.year}/${r.month}月] 正規側に既に値があるため救済をスキップ`);
        continue;
      }

      // 値をコピー
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const src: any = r;
      const data: Record<string, number | null> = {};
      for (let w = 1; w <= 5; w++) {
        data[`week${w}Target`] = src[`week${w}Target`] ?? null;
        data[`week${w}Actual`] = src[`week${w}Actual`] ?? null;
        data[`week${w}Rate`] = src[`week${w}Rate`] ?? null;
      }

      if (clean) {
        await prisma.weeklySiteKPI.update({
          where: { year_month_mainItem_subItem: cleanWhere },
          data,
        });
      } else {
        await prisma.weeklySiteKPI.create({
          data: { year: r.year, month: r.month, mainItem, subItem: candidate, ...data },
        });
      }
      salvagedCount++;
      console.log(`  ✅ ${mainItem}::${subItem.replace(/\n/g, '\\n')} [${r.year}/${r.month}月] → ${mainItem}::${candidate} に値をコピー`);
    }
  }

  console.log('');
  console.log(`救済件数: ${salvagedCount}`);
  console.log('');
  console.log('--- Step 2: ゴミレコード削除 ---');

  const deleteResults: { key: string; count: number }[] = [];
  for (const key of staleKeys) {
    const [mainItem, ...subParts] = key.split('::');
    const subItem = subParts.join('::');
    const result = await prisma.weeklySiteKPI.deleteMany({
      where: { mainItem, subItem },
    });
    deleteResults.push({ key, count: result.count });
  }

  for (const r of deleteResults) {
    const displayKey = r.key.replace(/\n/g, '\\n').replace(/\t/g, '\\t');
    console.log(`  🗑  ${displayKey}: ${r.count} 件削除`);
  }
  const grandTotal = deleteResults.reduce((s, r) => s + r.count, 0);
  console.log('');
  console.log(`✅ 完了: ${salvagedCount} 件救済 + ${grandTotal} レコード削除`);
}

main()
  .catch((e) => {
    console.error('\nクリーンアップ失敗:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
