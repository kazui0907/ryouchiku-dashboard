/* ************************************************************************** */
/*                                                                            */
/*    backup-db-json.ts                                 :::      ::::::::    */
/*                                                      :+:      :+:    :+:  */
/*    By: Claude (LTS)                                  #+#  +:+       +#+    */
/*                                                    +#+#+#+#+#+   +#+       */
/*    Created: 2026/04/24 by Claude (LTS)             #+#    #+#         */
/*                                                                            */
/*    © Life Time Support Inc.                                           */
/*                                                                            */
/* ************************************************************************** */
//
// Prisma経由で全テーブルをJSONにdumpするバックアップスクリプト。
// pg_dumpが使えない環境でも .env の DATABASE_URL だけで動く。
// Pooler 接続でも動作する（prepared statements不要のため）。
//
// 実行方法:
//   cd /Users/apple/scripts/ryouchiku-dashboard
//   npx tsx scripts/backup-db-json.ts
//
// 出力: backups/json-{YYYYMMDD-HHMMSS}/{モデル名}.json
//
// 復元時は scripts/restore-db-json.ts（別途必要なら作成）で読み戻す。
//
import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

// .env を自動ロード（Node 20.12+ の process.loadEnvFile）
// これにより `npx tsx scripts/backup-db-json.ts` だけで DATABASE_URL を読み込める
try {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (process as any).loadEnvFile?.('.env');
} catch {
  // .env がない／既にロード済みなら無視
}

const prisma = new PrismaClient();

// schema.prisma に定義されている全モデル
// 新モデル追加時はここに追記すること
const MODELS = [
  'monthlyAccounting',
  'weeklyKPI',
  'weeklySiteKPI',
  'personalKPI',
  'accountingLineItem',
  'balanceSheet',
  'budget',
] as const;

async function main() {
  const timestamp = new Date()
    .toISOString()
    .replace(/[:.]/g, '-')
    .replace('T', '-')
    .substring(0, 19);

  const backupDir = path.join(process.cwd(), 'backups', `json-${timestamp}`);
  fs.mkdirSync(backupDir, { recursive: true });

  console.log(`\n=== Prisma JSON バックアップ開始 ===`);
  console.log(`出力先: ${backupDir}\n`);

  const summary: Record<string, number> = {};
  let totalRows = 0;

  for (const model of MODELS) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const records = await (prisma as any)[model].findMany();
      const filePath = path.join(backupDir, `${model}.json`);
      fs.writeFileSync(
        filePath,
        JSON.stringify(records, null, 2),
        'utf-8',
      );
      summary[model] = records.length;
      totalRows += records.length;
      console.log(`  ✅ ${model}: ${records.length} 件 → ${path.basename(filePath)}`);
    } catch (err) {
      console.error(`  ❌ ${model}: 失敗`, err);
      summary[model] = -1;
    }
  }

  // メタデータも保存（復元時の整合性チェック用）
  const metadata = {
    backupAt: new Date().toISOString(),
    prismaVersion: require('@prisma/client/package.json').version,
    rowCounts: summary,
    totalRows,
  };
  fs.writeFileSync(
    path.join(backupDir, '_metadata.json'),
    JSON.stringify(metadata, null, 2),
    'utf-8',
  );

  console.log(`\n=== 完了 ===`);
  console.log(`合計: ${totalRows} 行を保存`);
  console.log(`ディレクトリ: ${backupDir}`);
  console.log(`\n復元は scripts/restore-db-json.ts（必要時に作成）でdir指定して実行。`);
}

main()
  .catch((e) => {
    console.error('\nバックアップ失敗:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
