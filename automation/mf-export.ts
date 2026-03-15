/**
 * マネーフォワード クラウド会計 自動エクスポートスクリプト
 *
 * 処理フロー:
 * 1. MFにログイン（メール認証コード対応）
 * 2. レポート → 推移表 → CSVダウンロード
 * 3. ダッシュボードAPIにアップロード
 */

import { chromium, Page, Browser } from 'playwright';
import { google } from 'googleapis';
import * as fs from 'fs';
import * as path from 'path';

// 環境変数
const MF_EMAIL = process.env.MF_EMAIL!;
const MF_PASSWORD = process.env.MF_PASSWORD!;
const GMAIL_CLIENT_ID = process.env.GMAIL_CLIENT_ID!;
const GMAIL_CLIENT_SECRET = process.env.GMAIL_CLIENT_SECRET!;
const GMAIL_REFRESH_TOKEN = process.env.GMAIL_REFRESH_TOKEN!;
const DASHBOARD_API_URL = process.env.DASHBOARD_API_URL || 'https://lts-dashboard.vercel.app/api/admin/upload';
const API_SECRET = process.env.API_SECRET;

const DOWNLOAD_DIR = path.join(process.cwd(), 'downloads');

// Gmail APIクライアント初期化
function getGmailClient() {
  const oauth2Client = new google.auth.OAuth2(
    GMAIL_CLIENT_ID,
    GMAIL_CLIENT_SECRET
  );
  oauth2Client.setCredentials({
    refresh_token: GMAIL_REFRESH_TOKEN,
  });
  return google.gmail({ version: 'v1', auth: oauth2Client });
}

// マネーフォワードからの認証コードメールを待機・取得
async function waitForOTP(maxWaitMs = 120000): Promise<string> {
  const gmail = getGmailClient();
  const startTime = Date.now();
  const checkInterval = 5000; // 5秒ごとにチェック

  console.log('認証コードメールを待機中...');

  while (Date.now() - startTime < maxWaitMs) {
    try {
      // 直近5分以内のマネーフォワードからのメールを検索
      const res = await gmail.users.messages.list({
        userId: 'me',
        q: 'from:noreply@moneyforward.com subject:認証コード newer_than:5m',
        maxResults: 1,
      });

      if (res.data.messages && res.data.messages.length > 0) {
        const messageId = res.data.messages[0].id!;
        const message = await gmail.users.messages.get({
          userId: 'me',
          id: messageId,
          format: 'full',
        });

        // メール本文から6桁の認証コードを抽出
        const body = getMessageBody(message.data);
        const otpMatch = body.match(/\b(\d{6})\b/);

        if (otpMatch) {
          console.log('認証コードを取得しました');

          // 使用済みメールを既読にする（重複防止）
          await gmail.users.messages.modify({
            userId: 'me',
            id: messageId,
            requestBody: {
              removeLabelIds: ['UNREAD'],
            },
          });

          return otpMatch[1];
        }
      }
    } catch (error) {
      console.error('Gmail API エラー:', error);
    }

    await new Promise(resolve => setTimeout(resolve, checkInterval));
  }

  throw new Error('認証コードメールのタイムアウト');
}

// メール本文を取得
function getMessageBody(message: any): string {
  const payload = message.payload;

  if (payload.body?.data) {
    return Buffer.from(payload.body.data, 'base64').toString('utf-8');
  }

  if (payload.parts) {
    for (const part of payload.parts) {
      if (part.mimeType === 'text/plain' && part.body?.data) {
        return Buffer.from(part.body.data, 'base64').toString('utf-8');
      }
      if (part.parts) {
        for (const subPart of part.parts) {
          if (subPart.mimeType === 'text/plain' && subPart.body?.data) {
            return Buffer.from(subPart.body.data, 'base64').toString('utf-8');
          }
        }
      }
    }
  }

  return '';
}

// マネーフォワードにログイン
async function login(page: Page): Promise<void> {
  console.log('マネーフォワードにアクセス中...');

  await page.goto('https://biz.moneyforward.com/');

  // ログインボタンをクリック
  await page.click('text=ログイン');

  // メールアドレス入力
  await page.waitForSelector('input[type="email"], input[name="mfid_user[email]"]');
  await page.fill('input[type="email"], input[name="mfid_user[email]"]', MF_EMAIL);
  await page.click('button[type="submit"], input[type="submit"]');

  // パスワード入力
  await page.waitForSelector('input[type="password"]');
  await page.fill('input[type="password"]', MF_PASSWORD);
  await page.click('button[type="submit"], input[type="submit"]');

  // 認証コード入力画面を待機
  try {
    await page.waitForSelector('input[name="mfid_user[code]"], input[placeholder*="認証コード"]', { timeout: 10000 });

    console.log('認証コード入力画面を検出');

    // Gmail APIで認証コードを取得
    const otp = await waitForOTP();

    // 認証コードを入力
    await page.fill('input[name="mfid_user[code]"], input[placeholder*="認証コード"]', otp);
    await page.click('button[type="submit"], input[type="submit"]');
  } catch (e) {
    // 認証コードが不要な場合はスキップ
    console.log('認証コード入力は不要でした');
  }

  // ログイン完了を確認
  await page.waitForSelector('[class*="dashboard"], [class*="home"], nav', { timeout: 30000 });
  console.log('ログイン完了');
}

// 推移表CSVをダウンロード
async function downloadCSV(page: Page, type: 'pl' | 'bs'): Promise<string> {
  console.log(`${type === 'pl' ? '損益計算書' : '貸借対照表'}の推移表をダウンロード中...`);

  // レポートメニューへ移動
  await page.click('text=レポート');

  // 推移表を選択
  await page.waitForSelector('text=推移表');
  await page.click('text=推移表');

  // 損益計算書 or 貸借対照表を選択
  if (type === 'pl') {
    await page.click('text=損益計算書');
  } else {
    await page.click('text=貸借対照表');
  }

  // 月次推移を選択
  await page.click('text=月次');

  // CSVエクスポートボタンを探してクリック
  const downloadPromise = page.waitForEvent('download');

  // エクスポートボタン（アイコンやテキストで探す）
  const exportButton = await page.locator('button:has-text("エクスポート"), button:has-text("CSV"), [aria-label*="エクスポート"], [aria-label*="CSV"]').first();
  await exportButton.click();

  // CSVを選択（メニューが出る場合）
  try {
    await page.click('text=CSV', { timeout: 3000 });
  } catch {
    // 直接ダウンロードの場合はスキップ
  }

  const download = await downloadPromise;
  const filePath = path.join(DOWNLOAD_DIR, `${type}_${Date.now()}.csv`);
  await download.saveAs(filePath);

  console.log(`ダウンロード完了: ${filePath}`);
  return filePath;
}

// ダッシュボードAPIにアップロード
async function uploadToAPI(filePath: string, year: number): Promise<void> {
  console.log('ダッシュボードAPIにアップロード中...');

  const fileContent = fs.readFileSync(filePath);
  const formData = new FormData();
  formData.append('file', new Blob([fileContent]), path.basename(filePath));
  formData.append('year', year.toString());

  const headers: Record<string, string> = {};
  if (API_SECRET) {
    headers['X-API-Secret'] = API_SECRET;
  }

  const response = await fetch(DASHBOARD_API_URL, {
    method: 'POST',
    body: formData,
    headers,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`API エラー: ${response.status} - ${errorText}`);
  }

  const result = await response.json();
  console.log('アップロード成功:', result.message);
}

// スクリーンショット保存（デバッグ用）
async function saveScreenshot(page: Page, name: string): Promise<void> {
  const screenshotDir = path.join(process.cwd(), 'screenshots');
  if (!fs.existsSync(screenshotDir)) {
    fs.mkdirSync(screenshotDir, { recursive: true });
  }
  await page.screenshot({ path: path.join(screenshotDir, `${name}_${Date.now()}.png`) });
}

// メイン処理
async function main() {
  // 必須環境変数チェック
  const requiredEnvs = ['MF_EMAIL', 'MF_PASSWORD', 'GMAIL_CLIENT_ID', 'GMAIL_CLIENT_SECRET', 'GMAIL_REFRESH_TOKEN'];
  for (const env of requiredEnvs) {
    if (!process.env[env]) {
      throw new Error(`環境変数 ${env} が設定されていません`);
    }
  }

  // ダウンロードディレクトリ作成
  if (!fs.existsSync(DOWNLOAD_DIR)) {
    fs.mkdirSync(DOWNLOAD_DIR, { recursive: true });
  }

  let browser: Browser | null = null;

  try {
    console.log('ブラウザを起動中...');
    browser = await chromium.launch({
      headless: true,
    });

    const context = await browser.newContext({
      acceptDownloads: true,
      locale: 'ja-JP',
    });

    const page = await context.newPage();

    // ログイン
    await login(page);
    await saveScreenshot(page, 'after_login');

    // 現在の年度を取得（4月始まり会計年度）
    const now = new Date();
    const fiscalYear = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;

    // 損益計算書をダウンロード・アップロード
    const plFile = await downloadCSV(page, 'pl');
    await saveScreenshot(page, 'after_pl_download');
    await uploadToAPI(plFile, fiscalYear);

    // 貸借対照表をダウンロード・アップロード
    const bsFile = await downloadCSV(page, 'bs');
    await saveScreenshot(page, 'after_bs_download');
    await uploadToAPI(bsFile, fiscalYear);

    console.log('処理完了！');
  } catch (error) {
    console.error('エラーが発生しました:', error);

    // エラー時のスクリーンショット
    if (browser) {
      const pages = browser.contexts()[0]?.pages();
      if (pages && pages[0]) {
        await saveScreenshot(pages[0], 'error');
      }
    }

    process.exit(1);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

main();
