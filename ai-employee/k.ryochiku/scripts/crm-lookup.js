#!/usr/bin/env node
/**
 * lts-sales-crm 顧客検索・記録スクリプト
 *
 * 使用方法:
 *   # メールアドレスで顧客を検索
 *   node crm-lookup.js --email="customer@example.com"
 *
 *   # 名前で顧客を検索
 *   node crm-lookup.js --name="田中太郎"
 *
 *   # やり取りを記録
 *   node crm-lookup.js --record --email="customer@example.com" --action="メール返信" --summary="見積もりについて回答"
 *
 *   # 顧客一覧を表示
 *   node crm-lookup.js --list --limit=10
 */

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

// lts-sales-crm のパス
const CRM_PATH = '/Users/kazui/scripts/lts-sales-crm';

/**
 * .env ファイルを読み込む
 */
function loadEnv() {
  const envPath = path.join(CRM_PATH, '.env');
  const env = { ...process.env };

  try {
    const envContent = fs.readFileSync(envPath, 'utf-8');
    for (const line of envContent.split('\n')) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const [key, ...valueParts] = trimmed.split('=');
        if (key && valueParts.length > 0) {
          let value = valueParts.join('=');
          // クォートを除去
          if ((value.startsWith('"') && value.endsWith('"')) ||
              (value.startsWith("'") && value.endsWith("'"))) {
            value = value.slice(1, -1);
          }
          env[key] = value;
        }
      }
    }
  } catch (error) {
    console.error('.env読み込みエラー:', error.message);
  }

  return env;
}

/**
 * 一時スクリプトを作成して実行
 */
function executeScript(scriptContent) {
  const tempFile = path.join(CRM_PATH, '_temp_query.mjs');
  const env = loadEnv();

  try {
    // 一時ファイルに書き込み
    fs.writeFileSync(tempFile, scriptContent, 'utf-8');

    // 実行（.envの環境変数を渡す）
    const result = execSync(`cd "${CRM_PATH}" && node "${tempFile}"`, {
      encoding: 'utf-8',
      timeout: 30000,
      env: { ...env, NODE_ENV: 'development' }
    });

    return result;
  } catch (error) {
    if (error.stdout) {
      return error.stdout;
    }
    throw error;
  } finally {
    // 一時ファイルを削除
    try {
      fs.unlinkSync(tempFile);
    } catch {}
  }
}

/**
 * メールアドレスで顧客を検索
 */
function findByEmail(email) {
  const script = `
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  try {
    const contact = await prisma.contact.findFirst({
      where: {
        OR: [
          { email: { contains: '${email}', mode: 'insensitive' } },
          { gmailAlias: { contains: '${email}', mode: 'insensitive' } }
        ]
      },
      include: {
        exchanges: { orderBy: { createdAt: 'desc' }, take: 5 },
        servicePhases: true,
        notes: { orderBy: { createdAt: 'desc' }, take: 3 }
      }
    });
    console.log(JSON.stringify(contact, null, 2));
  } catch (e) {
    console.log(JSON.stringify({ error: e.message }));
  } finally {
    await prisma.$disconnect();
  }
}

main();
`;

  try {
    const result = executeScript(script);
    return JSON.parse(result);
  } catch (error) {
    return { error: error.message };
  }
}

/**
 * 名前で顧客を検索
 */
function findByName(name) {
  const script = `
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  try {
    const contacts = await prisma.contact.findMany({
      where: {
        OR: [
          { name: { contains: '${name}', mode: 'insensitive' } },
          { nameKana: { contains: '${name}', mode: 'insensitive' } }
        ]
      },
      include: {
        servicePhases: true
      },
      take: 10
    });
    console.log(JSON.stringify(contacts, null, 2));
  } catch (e) {
    console.log(JSON.stringify({ error: e.message }));
  } finally {
    await prisma.$disconnect();
  }
}

main();
`;

  try {
    const result = executeScript(script);
    return JSON.parse(result);
  } catch (error) {
    return { error: error.message };
  }
}

/**
 * やり取りを記録
 */
function recordExchange(email, action, summary) {
  const description = `${action}: ${summary}`.replace(/'/g, "\\'");
  const script = `
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  try {
    // まず顧客を検索
    const contact = await prisma.contact.findFirst({
      where: {
        OR: [
          { email: { contains: '${email}', mode: 'insensitive' } },
          { gmailAlias: { contains: '${email}', mode: 'insensitive' } }
        ]
      }
    });

    if (!contact) {
      console.log(JSON.stringify({ error: '顧客が見つかりません', email: '${email}' }));
      return;
    }

    // やり取りを記録
    const exchange = await prisma.exchange.create({
      data: {
        contactId: contact.id,
        description: '${description}',
        direction: 'OUTBOUND'
      }
    });

    // タッチ数を更新
    await prisma.contact.update({
      where: { id: contact.id },
      data: { touchNumber: { increment: 1 } }
    });

    console.log(JSON.stringify({ success: true, exchange, contactId: contact.id }));
  } catch (e) {
    console.log(JSON.stringify({ error: e.message }));
  } finally {
    await prisma.$disconnect();
  }
}

main();
`;

  try {
    const result = executeScript(script);
    return JSON.parse(result);
  } catch (error) {
    return { error: error.message };
  }
}

/**
 * 顧客一覧を取得
 */
function listContacts(limit = 10) {
  const script = `
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  try {
    const contacts = await prisma.contact.findMany({
      orderBy: { updatedAt: 'desc' },
      take: ${limit},
      select: {
        id: true,
        name: true,
        company: true,
        email: true,
        salesPhase: true,
        touchNumber: true,
        updatedAt: true
      }
    });
    console.log(JSON.stringify(contacts, null, 2));
  } catch (e) {
    console.log(JSON.stringify({ error: e.message }));
  } finally {
    await prisma.$disconnect();
  }
}

main();
`;

  try {
    const result = executeScript(script);
    return JSON.parse(result);
  } catch (error) {
    return { error: error.message };
  }
}

// メイン処理
function main() {
  const args = process.argv.slice(2);
  const params = {};

  // 引数パース
  for (const arg of args) {
    if (arg.startsWith('--')) {
      const [key, ...valueParts] = arg.slice(2).split('=');
      params[key] = valueParts.join('=') || true;
    }
  }

  // コマンド分岐
  if (params.record) {
    // やり取りを記録
    if (!params.email || !params.action) {
      console.error('エラー: --email と --action は必須です');
      process.exit(1);
    }
    const result = recordExchange(params.email, params.action, params.summary || '');
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  if (params.list) {
    // 顧客一覧
    const limit = parseInt(params.limit) || 10;
    const result = listContacts(limit);
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  if (params.email) {
    // メールで検索
    const result = findByEmail(params.email);
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  if (params.name) {
    // 名前で検索
    const result = findByName(params.name);
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  // ヘルプ表示
  console.log('使用方法:');
  console.log('  node crm-lookup.js --email="customer@example.com"');
  console.log('  node crm-lookup.js --name="田中太郎"');
  console.log('  node crm-lookup.js --record --email="customer@example.com" --action="メール返信" --summary="内容"');
  console.log('  node crm-lookup.js --list --limit=10');
}

main();
