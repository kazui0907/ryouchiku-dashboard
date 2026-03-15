#!/usr/bin/env node
/**
 * calendar-helper.js — gws CLIのCalendar impersonationバグ回避用ヘルパー
 *
 * 使い方:
 *   node calendar-helper.js <account> <command> [options]
 *
 * コマンド:
 *   today                         今日の予定一覧
 *   week                          今週の予定一覧
 *   days [--days=N]               N日分の予定一覧（デフォルト: 7）
 *   insert --summary=<s> --start=<datetime> --end=<datetime> [--location=<l>] [--description=<d>] [--attendee=<email>]
 *                                 予定を作成（--dry-run で確認のみ）
 *
 * 例:
 *   node calendar-helper.js yozawa@life-time-support.com today
 *   node calendar-helper.js yozawa@life-time-support.com week
 *   node calendar-helper.js yozawa@life-time-support.com days --days=14
 *   node calendar-helper.js yozawa@life-time-support.com insert --summary="会議" --start="2026-03-15T10:00:00+09:00" --end="2026-03-15T11:00:00+09:00" --dry-run
 */

const GOOGLE_AUTH_LIB = 'C:/Users/info/AppData/Roaming/npm/node_modules/@google/clasp/node_modules/google-auth-library';
const CREDENTIALS_FILE = 'C:/Users/info/.config/gws/credentials.json';

const { GoogleAuth } = require(GOOGLE_AUTH_LIB);
const https = require('https');

const account = process.argv[2];
const command = process.argv[3];
const args = process.argv.slice(4);

if (!account || !command) {
  console.error('使い方: node calendar-helper.js <account> <command> [options]');
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

// Calendar API リクエスト
async function calendarRequest(client, path, method = 'GET', body = null) {
  const token = await client.getAccessToken();
  return new Promise((resolve, reject) => {
    const url = new URL(`https://www.googleapis.com/calendar/v3${path}`);
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

// 日時フォーマット（JST表示）
function formatDateTime(dateTimeStr, dateStr) {
  if (dateStr && !dateTimeStr) {
    // 終日イベント
    return `${dateStr}（終日）`;
  }
  const dt = new Date(dateTimeStr);
  const jst = new Date(dt.getTime() + (9 * 60 * 60 * 1000));
  const m = jst.toISOString().match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
  return `${m[1]}-${m[2]}-${m[3]} ${m[4]}:${m[5]}`;
}

// 予定を期間で取得して表示
async function listEvents(timeMin, timeMax, label) {
  const client = await getClient(['https://www.googleapis.com/auth/calendar']);
  const params = new URLSearchParams({
    calendarId: 'primary',
    timeMin: timeMin.toISOString(),
    timeMax: timeMax.toISOString(),
    singleEvents: 'true',
    orderBy: 'startTime',
    maxResults: '50'
  });
  const result = await calendarRequest(client, `/calendars/primary/events?${params}`);

  if (result.error) {
    console.error('エラー:', JSON.stringify(result.error, null, 2));
    process.exit(1);
  }

  const items = result.items || [];
  console.log(`\n📅 ${label}の予定（${account}）\n`);

  if (items.length === 0) {
    console.log('  予定はありません');
    return;
  }

  items.forEach(event => {
    const start = formatDateTime(event.start?.dateTime, event.start?.date);
    const end   = formatDateTime(event.end?.dateTime, event.end?.date);
    const title = event.summary || '（タイトルなし）';
    const location = event.location ? `\n     📍 ${event.location}` : '';
    const attendees = event.attendees
      ? `\n     👥 ${event.attendees.map(a => a.email).join(', ')}`
      : '';
    console.log(`  [${start}〜${end}]`);
    console.log(`   📌 ${title}${location}${attendees}`);
    console.log('');
  });
  console.log(`合計: ${items.length}件`);
}

async function main() {
  const opts = parseArgs(args);

  try {
    const now = new Date();

    if (command === 'today') {
      const start = new Date(now);
      start.setHours(0, 0, 0, 0);
      const end = new Date(now);
      end.setHours(23, 59, 59, 999);
      // JST調整
      const jstOffset = 9 * 60 * 60 * 1000;
      const todayJST = new Date(now.getTime() + jstOffset);
      const dateStr = todayJST.toISOString().slice(0, 10);
      await listEvents(
        new Date(`${dateStr}T00:00:00+09:00`),
        new Date(`${dateStr}T23:59:59+09:00`),
        '今日'
      );

    } else if (command === 'week') {
      const jstOffset = 9 * 60 * 60 * 1000;
      const todayJST = new Date(now.getTime() + jstOffset);
      const dateStr = todayJST.toISOString().slice(0, 10);
      const weekEnd = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      const weekEndJST = new Date(weekEnd.getTime() + jstOffset);
      const weekEndStr = weekEndJST.toISOString().slice(0, 10);
      await listEvents(
        new Date(`${dateStr}T00:00:00+09:00`),
        new Date(`${weekEndStr}T23:59:59+09:00`),
        '今週'
      );

    } else if (command === 'days') {
      const days = parseInt(opts.days || opts.d || '7');
      const jstOffset = 9 * 60 * 60 * 1000;
      const todayJST = new Date(now.getTime() + jstOffset);
      const dateStr = todayJST.toISOString().slice(0, 10);
      const endDate = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
      const endDateJST = new Date(endDate.getTime() + jstOffset);
      const endDateStr = endDateJST.toISOString().slice(0, 10);
      await listEvents(
        new Date(`${dateStr}T00:00:00+09:00`),
        new Date(`${endDateStr}T23:59:59+09:00`),
        `今後${days}日間`
      );

    } else if (command === 'insert') {
      const summary     = opts.summary;
      const start       = opts.start;
      const end         = opts.end;
      const location    = opts.location;
      const description = opts.description;
      const attendee    = opts.attendee;
      const dryRun      = opts['dry-run'] || opts.dryRun;

      if (!summary || !start || !end) {
        console.error('--summary, --start, --end は必須です');
        process.exit(1);
      }

      const event = {
        summary,
        start: { dateTime: start, timeZone: 'Asia/Tokyo' },
        end:   { dateTime: end,   timeZone: 'Asia/Tokyo' }
      };
      if (location)    event.location    = location;
      if (description) event.description = description;
      if (attendee)    event.attendees   = [{ email: attendee }];

      console.log('\n📅 作成する予定の確認:\n');
      console.log(`  タイトル: ${summary}`);
      console.log(`  開始:     ${start}`);
      console.log(`  終了:     ${end}`);
      if (location)    console.log(`  場所:     ${location}`);
      if (description) console.log(`  詳細:     ${description}`);
      if (attendee)    console.log(`  参加者:   ${attendee}`);

      if (dryRun) {
        console.log('\n⚠️  --dry-run モード: 予定は作成されていません。');
        console.log('   実際に作成するには --dry-run を外して再実行してください。');
        return;
      }

      const client = await getClient(['https://www.googleapis.com/auth/calendar']);
      const result = await calendarRequest(client, '/calendars/primary/events', 'POST', event);

      if (result.id) {
        console.log(`\n✅ 予定を作成しました (ID: ${result.id})`);
        console.log(`   リンク: ${result.htmlLink}`);
      } else {
        console.log('作成結果:', JSON.stringify(result, null, 2));
      }

    } else {
      console.error(`不明なコマンド: ${command}`);
      console.error('使えるコマンド: today, week, days, insert');
      process.exit(1);
    }

  } catch (err) {
    console.error('エラー:', err.message);
    process.exit(1);
  }
}

main();
