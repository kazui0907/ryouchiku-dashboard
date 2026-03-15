#!/usr/bin/env node
/**
 * gmail-helper.js — gws CLIのGmail impersonationバグ回避用ヘルパー
 *
 * 使い方:
 *   node gmail-helper.js <account> <command> [options]
 *
 * コマンド:
 *   triage [--max=N] [--query=Q]  未読メール一覧
 *   profile                        プロファイル情報
 *   get <messageId>               メール本文取得
 *   send --to=<addr> --subject=<s> --body=<b>  メール送信
 *
 * 例:
 *   node gmail-helper.js ryouchiku@life-time-support.com triage --max=10
 *   node gmail-helper.js ryouchiku@life-time-support.com profile
 */

const GOOGLE_AUTH_LIB = 'C:/Users/info/AppData/Roaming/npm/node_modules/@google/clasp/node_modules/google-auth-library';
const CREDENTIALS_FILE = 'C:/Users/info/.config/gws/credentials.json';

const { GoogleAuth } = require(GOOGLE_AUTH_LIB);
const https = require('https');

const account = process.argv[2];
const command = process.argv[3];
const args = process.argv.slice(4);

if (!account || !command) {
  console.error('使い方: node gmail-helper.js <account> <command> [options]');
  process.exit(1);
}

// 引数パース
function parseArgs(args) {
  const result = {};
  args.forEach(arg => {
    const m = arg.match(/^--([^=]+)=(.*)$/);
    if (m) result[m[1]] = m[2];
    else result[arg.replace(/^--/, '')] = true;
  });
  return result;
}

// 認証クライアント作成
async function getClient(scopes) {
  const key = require(CREDENTIALS_FILE);
  const auth = new GoogleAuth({
    credentials: key,
    scopes,
    clientOptions: { subject: account }
  });
  return auth.getClient();
}

// Gmail API リクエスト
async function gmailRequest(client, path, method = 'GET', body = null) {
  const token = await client.getAccessToken();
  return new Promise((resolve, reject) => {
    const url = new URL(`https://gmail.googleapis.com/gmail/v1/users/me${path}`);
    const options = {
      hostname: url.hostname,
      path: url.pathname + url.search,
      method,
      headers: {
        'Authorization': `Bearer ${token.token}`,
        'Content-Type': 'application/json'
      }
    };
    const req = https.request(options, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch(e) { resolve(data); }
      });
    });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function main() {
  const opts = parseArgs(args);

  try {
    if (command === 'profile') {
      const client = await getClient(['https://www.googleapis.com/auth/gmail.modify']);
      const result = await gmailRequest(client, '/profile');
      console.log(JSON.stringify(result, null, 2));

    } else if (command === 'triage') {
      const max = parseInt(opts.max || opts.m || '10');
      const query = opts.query || opts.q || 'is:unread';
      const client = await getClient(['https://www.googleapis.com/auth/gmail.modify']);

      // メッセージ一覧取得
      const listResult = await gmailRequest(client, `/messages?maxResults=${max}&q=${encodeURIComponent(query)}`);
      if (!listResult.messages || listResult.messages.length === 0) {
        console.log(`📭 該当するメールはありません（クエリ: ${query}）`);
        return;
      }

      // 各メールのヘッダーを取得
      const messages = [];
      for (const msg of listResult.messages) {
        const detail = await gmailRequest(client, `/messages/${msg.id}?format=metadata&metadataHeaders=From&metadataHeaders=Subject&metadataHeaders=Date`);
        const headers = detail.payload?.headers || [];
        const from    = headers.find(h => h.name === 'From')?.value    || '(不明)';
        const subject = headers.find(h => h.name === 'Subject')?.value || '(件名なし)';
        const date    = headers.find(h => h.name === 'Date')?.value    || '';
        messages.push({ id: msg.id, from, subject, date });
      }

      // テーブル表示
      console.log(`\n📬 メール一覧（${account} / クエリ: ${query}）\n`);
      console.log(`${'ID'.padEnd(20)} ${'差出人'.padEnd(30)} ${'件名'.padEnd(40)} 日時`);
      console.log('-'.repeat(110));
      messages.forEach(m => {
        const fromShort    = m.from.length > 28    ? m.from.slice(0, 28) + '..'    : m.from;
        const subjectShort = m.subject.length > 38 ? m.subject.slice(0, 38) + '..' : m.subject;
        console.log(`${m.id.padEnd(20)} ${fromShort.padEnd(30)} ${subjectShort.padEnd(40)} ${m.date}`);
      });
      console.log(`\n合計: ${messages.length}件`);

    } else if (command === 'get') {
      const messageId = opts[0] || args[0];
      if (!messageId) { console.error('メッセージIDを指定してください'); process.exit(1); }
      const client = await getClient(['https://www.googleapis.com/auth/gmail.modify']);
      const result = await gmailRequest(client, `/messages/${messageId}?format=full`);

      const headers = result.payload?.headers || [];
      const from    = headers.find(h => h.name === 'From')?.value    || '';
      const to      = headers.find(h => h.name === 'To')?.value      || '';
      const subject = headers.find(h => h.name === 'Subject')?.value || '';
      const date    = headers.find(h => h.name === 'Date')?.value    || '';

      // 本文取得（base64デコード）
      function extractBody(part) {
        if (!part) return '';
        if (part.mimeType === 'text/plain' && part.body?.data) {
          return Buffer.from(part.body.data.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf-8');
        }
        if (part.parts) {
          for (const p of part.parts) {
            const b = extractBody(p);
            if (b) return b;
          }
        }
        return '';
      }

      console.log(`\n📧 メール詳細\n`);
      console.log(`差出人: ${from}`);
      console.log(`宛先:   ${to}`);
      console.log(`件名:   ${subject}`);
      console.log(`日時:   ${date}`);
      console.log(`\n--- 本文 ---\n`);
      console.log(extractBody(result.payload));

    } else if (command === 'send') {
      const to      = opts.to;
      const subject = opts.subject;
      const body    = opts.body;
      if (!to || !subject || !body) {
        console.error('--to, --subject, --body を指定してください');
        process.exit(1);
      }
      const client = await getClient(['https://www.googleapis.com/auth/gmail.send']);

      const rawEmail = [
        `From: ${account}`,
        `To: ${to}`,
        `Subject: ${subject}`,
        `Content-Type: text/plain; charset=utf-8`,
        ``,
        body
      ].join('\r\n');

      const encoded = Buffer.from(rawEmail).toString('base64').replace(/\+/g, '-').replace(/\//g, '_');
      const result = await gmailRequest(client, '/messages/send', 'POST', { raw: encoded });

      if (result.id) {
        console.log(`✅ 送信完了 (ID: ${result.id})`);
        console.log(`   宛先: ${to}`);
        console.log(`   件名: ${subject}`);
      } else {
        console.log('送信結果:', JSON.stringify(result, null, 2));
      }

    } else {
      console.error(`不明なコマンド: ${command}`);
      process.exit(1);
    }

  } catch (err) {
    console.error('エラー:', err.message);
    process.exit(1);
  }
}

main();
