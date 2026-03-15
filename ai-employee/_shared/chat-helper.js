#!/usr/bin/env node
/**
 * chat-helper.js — gws CLIのChat impersonationバグ回避用ヘルパー
 *
 * 使い方:
 *   node chat-helper.js <account> <command> [options]
 *
 * コマンド:
 *   spaces                              参加スペース一覧
 *   messages <spaceId> [--max=N]        スペースの最新メッセージ取得
 *   search --date=YYYY-MM-DD           特定日のメッセージを全スペース横断検索
 *
 * 例:
 *   node chat-helper.js yozawa@life-time-support.com spaces
 *   node chat-helper.js yozawa@life-time-support.com messages SPACE_ID --max=20
 *   node chat-helper.js yozawa@life-time-support.com search --date=2026-03-12
 */

const GOOGLE_AUTH_LIB = 'C:/Users/info/AppData/Roaming/npm/node_modules/@google/clasp/node_modules/google-auth-library';
const CREDENTIALS_FILE = 'C:/Users/info/.config/gws/credentials.json';

const { GoogleAuth } = require(GOOGLE_AUTH_LIB);
const https = require('https');

const account = process.argv[2];
const command = process.argv[3];
const args = process.argv.slice(4);

if (!account || !command) {
  console.error('使い方: node chat-helper.js <account> <command> [options]');
  process.exit(1);
}

function parseArgs(args) {
  const result = { positional: [] };
  args.forEach(arg => {
    const m = arg.match(/^--([^=]+)=(.*)$/);
    if (m) result[m[1]] = m[2];
    else if (arg.startsWith('--')) result[arg.replace(/^--/, '')] = true;
    else result.positional.push(arg);
  });
  return result;
}

async function getClient(scopes) {
  const key = require(CREDENTIALS_FILE);
  const auth = new GoogleAuth({
    credentials: key,
    scopes,
    clientOptions: { subject: account }
  });
  return auth.getClient();
}

async function chatRequest(client, path) {
  const token = await client.getAccessToken();
  return new Promise((resolve, reject) => {
    const url = new URL(`https://chat.googleapis.com/v1${path}`);
    const options = {
      hostname: url.hostname,
      path: url.pathname + url.search,
      method: 'GET',
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
    req.end();
  });
}

// 日時を見やすくフォーマット（JST）
function formatTime(isoStr) {
  if (!isoStr) return '';
  const dt = new Date(isoStr);
  const jst = new Date(dt.getTime() + (9 * 60 * 60 * 1000));
  const m = jst.toISOString().match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
  return `${m[2]}/${m[3]} ${m[4]}:${m[5]}`;
}

async function main() {
  const opts = parseArgs(args);

  try {
    if (command === 'spaces') {
      const client = await getClient([
        'https://www.googleapis.com/auth/chat.spaces.readonly'
      ]);
      const result = await chatRequest(client, '/spaces?pageSize=50');

      if (result.error) {
        console.error('エラー:', JSON.stringify(result.error, null, 2));
        process.exit(1);
      }

      const spaces = result.spaces || [];
      console.log(`\n💬 参加スペース一覧（${account}）\n`);

      if (spaces.length === 0) {
        console.log('  参加しているスペースはありません');
        return;
      }

      console.log(`${'スペースID'.padEnd(20)} ${'タイプ'.padEnd(12)} 名前`);
      console.log('-'.repeat(70));
      spaces.forEach(s => {
        const id = s.name.replace('spaces/', '');
        const type = s.type === 'ROOM' ? 'ルーム' : s.type === 'DM' ? 'DM' : s.type === 'GROUP_CHAT' ? 'グループ' : s.type;
        const name = s.displayName || '（DM）';
        console.log(`${id.padEnd(20)} ${type.padEnd(12)} ${name}`);
      });
      console.log(`\n合計: ${spaces.length}件`);

    } else if (command === 'messages') {
      const spaceId = opts.positional[0];
      if (!spaceId) {
        console.error('スペースIDを指定してください');
        console.error('例: node chat-helper.js account messages SPACE_ID');
        process.exit(1);
      }
      const max = parseInt(opts.max || '20');
      const client = await getClient([
        'https://www.googleapis.com/auth/chat.messages.readonly'
      ]);

      const spaceName = spaceId.startsWith('spaces/') ? spaceId : `spaces/${spaceId}`;
      const result = await chatRequest(client, `/${spaceName}/messages?pageSize=${max}`);

      if (result.error) {
        console.error('エラー:', JSON.stringify(result.error, null, 2));
        process.exit(1);
      }

      const messages = result.messages || [];
      console.log(`\n💬 メッセージ一覧（スペース: ${spaceId}）\n`);

      if (messages.length === 0) {
        console.log('  メッセージはありません');
        return;
      }

      messages.forEach(msg => {
        const time = formatTime(msg.createTime);
        const sender = msg.sender?.displayName || msg.sender?.name || '不明';
        const text = msg.text || msg.formattedText || '（添付ファイルなど）';
        const textShort = text.length > 200 ? text.slice(0, 200) + '...' : text;
        console.log(`[${time}] ${sender}:`);
        console.log(`  ${textShort.replace(/\n/g, '\n  ')}`);
        console.log('');
      });
      console.log(`合計: ${messages.length}件`);

    } else if (command === 'search') {
      // 特定日のメッセージを全スペース横断で検索
      const dateStr = opts.date;
      if (!dateStr) {
        console.error('--date=YYYY-MM-DD を指定してください');
        console.error('例: node chat-helper.js account search --date=2026-03-12');
        process.exit(1);
      }

      const client = await getClient([
        'https://www.googleapis.com/auth/chat.spaces.readonly',
        'https://www.googleapis.com/auth/chat.messages.readonly'
      ]);

      // スペース一覧取得
      const spacesResult = await chatRequest(client, '/spaces?pageSize=50');
      const spaces = spacesResult.spaces || [];

      if (spaces.length === 0) {
        console.log('参加しているスペースはありません');
        return;
      }

      // 日付フィルター設定（JST基準）
      const filterStart = `${dateStr}T00:00:00+09:00`;
      const filterEnd = new Date(new Date(dateStr + 'T00:00:00+09:00').getTime() + 24 * 60 * 60 * 1000);
      const filterEndStr = filterEnd.toISOString().replace('Z', '+09:00');
      const filter = encodeURIComponent(`createTime > "${filterStart}" AND createTime < "${dateStr}T23:59:59+09:00"`);

      console.log(`\n🔍 ${dateStr} のメッセージ検索（${account}）\n`);

      let totalMessages = 0;

      for (const space of spaces) {
        const spaceId = space.name;
        const displayName = space.displayName || '(DM)';
        try {
          const msgs = await chatRequest(client, `/${spaceId}/messages?pageSize=50&filter=${filter}`);
          if (msgs.messages && msgs.messages.length > 0) {
            console.log(`\n📌 【${displayName}】（${msgs.messages.length}件）`);
            console.log('-'.repeat(60));
            for (const msg of msgs.messages) {
              const time = formatTime(msg.createTime);
              const sender = msg.sender?.displayName || msg.sender?.name || '不明';
              const text = (msg.text || msg.formattedText || '(添付等)').replace(/\n/g, ' ');
              const textShort = text.length > 200 ? text.slice(0, 200) + '...' : text;
              console.log(`[${time}] ${sender}: ${textShort}`);
            }
            totalMessages += msgs.messages.length;
          }
        } catch(e) {
          // skip errors for individual spaces
        }
      }

      console.log(`\n=== 検索完了: ${totalMessages}件（${spaces.length}スペース検索） ===`);

    } else {
      console.error(`不明なコマンド: ${command}`);
      console.error('使えるコマンド: spaces, messages, search');
      process.exit(1);
    }

  } catch (err) {
    console.error('エラー:', err.message);
    process.exit(1);
  }
}

main();
