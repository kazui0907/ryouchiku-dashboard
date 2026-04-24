/* ************************************************************************** */
/*                                                                            */
/*    migrate-kuchikomi-rename.ts                       :::      ::::::::    */
/*                                                      :+:      :+:    :+:  */
/*    By: Claude (LTS)                                  #+#  +:+       +#+    */
/*                                                    +#+#+#+#+#+   +#+       */
/*    Created: 2026/04/24 by Claude (LTS)             #+#    #+#         */
/*                                                                            */
/*    © Life Time Support Inc.                                           */
/*                                                                            */
/* ************************************************************************** */
//
// 「口コミ回収率」→「口コミ回収件数」へリネームする一回限りのマイグレーション。
//
// 旧仕様では subItem='口コミ回収率' として小数（例: 0.75 = 75%）で保存されていた。
// 新仕様では subItem='口コミ回収件数' として整数（件数）で保存される。
// 単位が変わるため、既存の小数値を残すと「0.75件」のような意味不明な値になる。
//
// このスクリプトは：
// 1. 既存の subItem='口コミ回収率' レコードを '口コミ回収件数' にリネーム
// 2. 同時に week1〜week5 の target/actual をすべて null に初期化（旧％値を破棄）
//    → ユーザーに件数として再入力してもらう
//
// 実行方法:
//   npx tsx scripts/migrate-kuchikomi-rename.ts
//
// 本番DBで実行する場合は DATABASE_URL 環境変数を本番向けにセットしてから実行。
//
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('=== 口コミ回収率 → 口コミ回収件数 マイグレーション ===\n');

  // 1. 影響レコード数を先に確認
  const targets = await prisma.weeklySiteKPI.findMany({
    where: { subItem: '口コミ回収率' },
    select: {
      id: true,
      year: true,
      month: true,
      mainItem: true,
      subItem: true,
      week1Actual: true,
      week2Actual: true,
      week3Actual: true,
      week4Actual: true,
      week5Actual: true,
    },
  });

  console.log(`対象レコード数: ${targets.length}`);
  if (targets.length === 0) {
    console.log('リネーム対象のレコードはありません。既に新名称に移行済みと思われます。');
    return;
  }

  console.log('\n--- 既存データ（リネーム前）---');
  for (const r of targets) {
    const actuals = [r.week1Actual, r.week2Actual, r.week3Actual, r.week4Actual, r.week5Actual];
    console.log(
      `  ${r.year}/${r.month}月 ${r.mainItem}::${r.subItem} | actual週別: [${actuals.join(', ')}]`,
    );
  }

  // 2. リネーム + target/actual 初期化
  const result = await prisma.weeklySiteKPI.updateMany({
    where: { subItem: '口コミ回収率' },
    data: {
      subItem: '口コミ回収件数',
      week1Target: null, week1Actual: null, week1Rate: null,
      week2Target: null, week2Actual: null, week2Rate: null,
      week3Target: null, week3Actual: null, week3Rate: null,
      week4Target: null, week4Actual: null, week4Rate: null,
      week5Target: null, week5Actual: null, week5Rate: null,
    },
  });

  console.log(`\n✅ 完了: ${result.count} 件をリネーム + 週別値を null 初期化しました`);
  console.log('   /admin/weekly-site-kpi 画面で「口コミ回収件数」として件数を再入力してください。');
}

main()
  .catch((e) => {
    console.error('マイグレーション失敗:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
