/**
 * Gmail API リフレッシュトークン取得スクリプト
 *
 * 使い方:
 * 1. GMAIL_CLIENT_ID と GMAIL_CLIENT_SECRET を環境変数に設定
 * 2. npx tsx get-gmail-token.ts を実行
 * 3. ブラウザで認証
 * 4. 表示されるリフレッシュトークンをコピー
 */

import { google } from 'googleapis';
import * as http from 'http';
import * as url from 'url';

const CLIENT_ID = process.env.GMAIL_CLIENT_ID;
const CLIENT_SECRET = process.env.GMAIL_CLIENT_SECRET;
const REDIRECT_PORT = 3333;
const REDIRECT_URI = `http://localhost:${REDIRECT_PORT}/callback`;

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error('環境変数 GMAIL_CLIENT_ID と GMAIL_CLIENT_SECRET を設定してください');
  console.log('\n例:');
  console.log('export GMAIL_CLIENT_ID="your-client-id"');
  console.log('export GMAIL_CLIENT_SECRET="your-client-secret"');
  process.exit(1);
}

const oauth2Client = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);

// 認可URL生成
const authUrl = oauth2Client.generateAuthUrl({
  access_type: 'offline',
  scope: ['https://www.googleapis.com/auth/gmail.readonly'],
  prompt: 'consent', // 常にリフレッシュトークンを取得
});

console.log('以下のURLをブラウザで開いて認証してください:\n');
console.log(authUrl);
console.log('\n認証後、自動的にリダイレクトされます...\n');

// コールバックサーバー
const server = http.createServer(async (req, res) => {
  if (!req.url?.startsWith('/callback')) {
    res.writeHead(404);
    res.end('Not Found');
    return;
  }

  const parsedUrl = url.parse(req.url, true);
  const code = parsedUrl.query.code as string;

  if (!code) {
    res.writeHead(400);
    res.end('認可コードがありません');
    return;
  }

  try {
    const { tokens } = await oauth2Client.getToken(code);

    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(`
      <html>
        <body style="font-family: sans-serif; padding: 40px;">
          <h1>✅ 認証成功</h1>
          <p>このウィンドウを閉じて、ターミナルを確認してください。</p>
        </body>
      </html>
    `);

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ 認証成功！');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('\n以下の値を GitHub Secrets に設定してください:\n');
    console.log('GMAIL_REFRESH_TOKEN:');
    console.log(tokens.refresh_token);
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    server.close();
    process.exit(0);
  } catch (error) {
    console.error('トークン取得エラー:', error);
    res.writeHead(500);
    res.end('トークン取得に失敗しました');
    server.close();
    process.exit(1);
  }
});

server.listen(REDIRECT_PORT, () => {
  console.log(`コールバックサーバーを起動しました (ポート ${REDIRECT_PORT})`);
});
