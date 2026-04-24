/* ************************************************************************** */
/*                                                                            */
/*    restore-db-json.ts                                :::      ::::::::    */
/*                                                      :+:      :+:    :+:  */
/*    By: Claude (LTS)                                  #+#  +:+       +#+    */
/*                                                    +#+#+#+#+#+   +#+       */
/*    Created: 2026/04/24 by Claude (LTS)             #+#    #+#         */
/*                                                                            */
/*    © Life Time Support Inc.                                           */
/*                                                                            */
/* ************************************************************************** */
//
// backup-db-json.ts で取得したバックアップを DB に書き戻す復元スクリプト。
//
// ⚠️ 警告: このスクリプトは対象テーブルを一度全削除してからバックアップ内容を流し込む。
//         間違った DATABASE_URL を向いていると本番データが消える！
//         実行前に必ず DATABASE_URL を目視確認し、確認プロンプトで yes を入力すること。
//
// 実行方法:
//   cd /Users/apple/scripts/ryouchiku-dashboard
//   npx tsx scripts/restore-db-json.ts backups/json-2026-04-24-22-00-00
//
import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';

const prisma = new PrismaClient();

const MODELS = [
  'monthlyAccounting',
  'weeklyKPI',
  'weeklySiteKPI',
  'personalKPI',
  'accountingLineItem',
  'balanceSheet',
  'budget',
] as const;

function ask(q: string): Promise<string> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => rl.question(q, (ans) => { rl.close(); resolve(ans.trim()); }));
}

async function main() {
  const backupDir = process.argv[2];
  if (!backupDir) {
    console.error('使い方: npx tsx scripts/restore-db-json.ts <backupディレクトリのパス>');
    console.error('例   : npx tsx scripts/restore-db-json.ts backups/json-2026-04-24-22-00-00');
    process.exit(1);
  }

  const absDir = path.resolve(backupDir);
  if (!fs.existsSync(absDir)) {
    console.error(`指定ディレクトリが存在しません: ${absDir}`);
    process.exit(1);
  }

  // メタデータ表示
  const metaPath = path.join(absDir, '_metadata.json');
  if (fs.existsSync(metaPath)) {
    const meta = JSON.parse(fs.readFileSync(metaPath, 'utf-8'));
    console.log('\n=== バックアップメタデータ ===');
    console.log(`  取得日時: ${meta.backupAt}`);
    console.log(`  Prisma : ${meta.prismaVersion}`);
    console.log(`  合計行 : ${meta.totalRows}`);
    console.log(`  内訳   :`);
    for (const [m, c] of Object.entries(meta.rowCounts)) {
      console.log(`    - ${m}: ${c}`);
    }
  }

  // 現在の接続先を表示（最後の確認用）
  const currentUrl = process.env.DATABASE_URL || '';
  const maskedHost = currentUrl.replace(/\/\/[^@]+@/, '//***@').slice(0, 120);
  console.log('\n=== 接続先（DATABASE_URL）===');
  console.log(`  ${maskedHost}...`);

  console.log('\n⚠️  以下のテーブルを一度すべて削除してから、バックアップ内容を書き戻します:');
  for (const m of MODELS) console.log(`    - ${m}`);

  const ans = await ask('\n本当に実行しますか？ "yes" と入力して Enter: ');
  if (ans !== 'yes') {
    console.log('中止しました。');
    process.exit(0);
  }

  console.log('\n=== 復元開始 ===');

  // 外部キー制約がないモデル構成なので、順序は任意。
  // 逆順で delete → 順序で create の方が安全（将来FK追加時のため）。
  for (const model of [...MODELS].reverse()) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await (prisma as any)[model].deleteMany({});
      console.log(`  🗑  ${model}: ${result.count} 件削除`);
    } catch (err) {
      console.error(`  ❌ ${model} 削除失敗:`, err);
      process.exit(1);
    }
  }

  for (const model of MODELS) {
    const filePath = path.join(absDir, `${model}.json`);
    if (!fs.existsSync(filePath)) {
      console.log(`  ⏭  ${model}: バックアップファイルなしスキップ`);
      continue;
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const records: any[] = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    if (records.length === 0) {
      console.log(`  ⏭  ${model}: 0 件（スキップ）`);
      continue;
    }
    // Date 文字列を Date オブジェクトに戻す
    for (const r of records) {
      for (const key of Object.keys(r)) {
        if (typeof r[key] === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(r[key])) {
          r[key] = new Date(r[key]);
        }
      }
    }
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await (prisma as any)[model].createMany({ data: records, skipDuplicates: false });
      console.log(`  ✅ ${model}: ${result.count} 件復元`);
    } catch (err) {
      console.error(`  ❌ ${model} 復元失敗:`, err);
      process.exit(1);
    }
  }

  console.log('\n=== 復元完了 ===');
}

main()
  .catch((e) => {
    console.error('\n復元失敗:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
