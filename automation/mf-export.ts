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

// スクリーンショット保存（デバッグ用）
const SCREENSHOT_DIR = path.join(process.cwd(), 'screenshots');

async function saveScreenshot(page: Page, name: string): Promise<void> {
  if (!fs.existsSync(SCREENSHOT_DIR)) {
    fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
  }
  const filename = `${name}_${Date.now()}.png`;
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, filename), fullPage: true });
  console.log(`スクリーンショット保存: ${filename}`);
}

// マネーフォワードにログイン
async function login(page: Page): Promise<void> {
  console.log('マネーフォワードにアクセス中...');

  // マネーフォワードクラウド会計のトップページにアクセス
  // ログインしていない場合は自動的にログインページにリダイレクトされる
  await page.goto('https://biz.moneyforward.com/');

  // ページ読み込み完了を待機
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);  // リダイレクト完了を待機
  await saveScreenshot(page, '01_initial_page');
  console.log('初期ページにアクセスしました');
  console.log('現在のURL:', page.url());

  // ログインページへのリダイレクトを確認
  // すでにログインページにいるか、ログインボタンがあるかを確認
  const currentUrl = page.url();

  if (currentUrl.includes('id.moneyforward.com')) {
    console.log('ログインページにリダイレクトされました');
  } else {
    // ログインボタンを探してクリック
    console.log('ログインボタンを探しています...');
    const loginLinkSelectors = [
      'a:has-text("ログイン")',
      'a[href*="sign_in"]',
      'button:has-text("ログイン")',
      '[data-testid="login"]',
    ];

    let clicked = false;
    for (const selector of loginLinkSelectors) {
      try {
        const link = page.locator(selector).first();
        if (await link.isVisible({ timeout: 3000 })) {
          await link.click();
          clicked = true;
          console.log(`ログインリンクをクリック: ${selector}`);
          break;
        }
      } catch {
        continue;
      }
    }

    if (!clicked) {
      // 直接ログインURLにアクセス
      console.log('ログインリンクが見つからないため、直接ログインURLにアクセス');
      await page.goto('https://id.moneyforward.com/sign_in');
    }

    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
  }

  await saveScreenshot(page, '02_login_page');
  console.log('ログインページのURL:', page.url());

  // メールアドレス入力欄を探す
  console.log('メールアドレス入力欄を探しています...');

  // ページの読み込みを待機
  await page.waitForTimeout(2000);

  // まずページ内の入力要素を確認
  const inputCount = await page.locator('input').count();
  console.log(`ページ内のinput要素数: ${inputCount}`);

  const emailSelectors = [
    'input[type="email"]',
    'input[name="mfid_user[email]"]',
    'input[name="email"]',
    'input[id*="email"]',
    'input[placeholder*="メール"]',
    'input[placeholder*="Email"]',
    'input[autocomplete="email"]',
    'input[autocomplete="username"]',
    '#email',
    '#mfid_user_email',
    'input:visible',  // 表示されているinput
  ];

  let emailInput = null;
  for (const selector of emailSelectors) {
    try {
      const element = page.locator(selector).first();
      if (await element.isVisible({ timeout: 5000 })) {
        emailInput = element;
        console.log(`メールアドレス入力欄を発見: ${selector}`);
        break;
      }
    } catch {
      continue;
    }
  }

  if (!emailInput) {
    await saveScreenshot(page, '02_error_no_email_input');
    // ページのHTMLを出力してデバッグ
    const html = await page.content();
    console.log('ページHTML（最初の3000文字）:', html.substring(0, 3000));
    console.log('現在のURL:', page.url());
    throw new Error('メールアドレス入力欄が見つかりません');
  }

  // メールアドレスを入力
  await emailInput.fill(MF_EMAIL);
  await page.waitForTimeout(500);  // 入力完了を待機
  await saveScreenshot(page, '03_email_entered');
  console.log('メールアドレスを入力しました');

  // ログインボタンを探してクリック
  console.log('ログインボタンを探しています...');

  // ボタン要素を確認
  const buttonCount = await page.locator('button').count();
  console.log(`ページ内のbutton要素数: ${buttonCount}`);

  const submitSelectors = [
    'button:has-text("ログインする")',
    'button:has-text("ログイン")',
    'button:has-text("次へ")',
    'button:has-text("続ける")',
    'button[type="submit"]',
    'input[type="submit"]',
    '[data-testid*="submit"]',
  ];

  let submitted = false;
  for (const selector of submitSelectors) {
    try {
      const btn = page.locator(selector).first();
      if (await btn.isVisible({ timeout: 2000 })) {
        console.log(`ボタンを発見: ${selector}`);
        await btn.click();
        submitted = true;
        console.log(`ボタンをクリックしました: ${selector}`);
        break;
      }
    } catch (e) {
      console.log(`セレクタ "${selector}" は見つかりませんでした`);
      continue;
    }
  }

  if (!submitted) {
    // Enterキーで送信を試行
    console.log('ボタンが見つからないため、Enterキーで送信を試行');
    await page.keyboard.press('Enter');
  }

  // ページ遷移を待機
  console.log('ページ遷移を待機中...');
  await page.waitForTimeout(2000);
  await page.waitForLoadState('networkidle');
  await saveScreenshot(page, '04_after_email_submit');
  console.log('メールアドレス送信後のURL:', page.url());

  // パスワード入力欄または認証コード入力欄を待機
  console.log('パスワードまたは認証コード入力欄を探しています...');

  const passwordSelectors = [
    'input[type="password"]',
    'input[name="mfid_user[password]"]',
    'input[id*="password"]',
    '#password',
  ];

  let passwordInput = null;
  for (const selector of passwordSelectors) {
    try {
      const element = page.locator(selector).first();
      if (await element.isVisible({ timeout: 5000 })) {
        passwordInput = element;
        console.log(`パスワード入力欄を発見: ${selector}`);
        break;
      }
    } catch {
      continue;
    }
  }

  if (!passwordInput) {
    await saveScreenshot(page, '04_error_no_password_input');
    console.log('パスワード入力欄が見つかりません。現在のURL:', page.url());
    // ページのHTMLを出力
    const html = await page.content();
    console.log('ページHTML（最初の3000文字）:', html.substring(0, 3000));
    throw new Error('パスワード入力欄が見つかりません');
  }

  // パスワードを入力
  await passwordInput.fill(MF_PASSWORD);
  await page.waitForTimeout(500);
  await saveScreenshot(page, '05_password_entered');
  console.log('パスワードを入力しました');

  // ログインボタンをクリック
  submitted = false;
  for (const selector of submitSelectors) {
    try {
      const btn = page.locator(selector).first();
      if (await btn.isVisible({ timeout: 2000 })) {
        await btn.click();
        submitted = true;
        console.log(`ログインボタンをクリック: ${selector}`);
        break;
      }
    } catch {
      continue;
    }
  }

  if (!submitted) {
    await page.keyboard.press('Enter');
    console.log('Enterキーで送信を試行');
  }

  await page.waitForTimeout(2000);
  await page.waitForLoadState('networkidle');
  await saveScreenshot(page, '06_after_password_submit');
  console.log('パスワード送信後のURL:', page.url());

  // 認証コード入力画面を待機
  console.log('認証コード入力画面をチェック中...');

  const otpSelectors = [
    'input[name="mfid_user[code]"]',
    'input[placeholder*="認証コード"]',
    'input[placeholder*="確認コード"]',
    'input[id*="code"]',
    'input[type="tel"]',
    'input[inputmode="numeric"]',
    'input[maxlength="6"]',
  ];

  let otpInput = null;
  for (const selector of otpSelectors) {
    try {
      const element = page.locator(selector).first();
      if (await element.isVisible({ timeout: 3000 })) {
        otpInput = element;
        console.log(`認証コード入力欄を発見: ${selector}`);
        break;
      }
    } catch {
      continue;
    }
  }

  if (otpInput) {
    console.log('認証コード入力画面を検出');
    await saveScreenshot(page, '07_otp_required');

    // Gmail APIで認証コードを取得
    const otp = await waitForOTP();

    // 認証コードを入力
    await otpInput.fill(otp);
    await page.waitForTimeout(500);
    await saveScreenshot(page, '08_otp_entered');
    console.log('認証コードを入力しました');

    // 送信
    for (const selector of submitSelectors) {
      try {
        const btn = page.locator(selector).first();
        if (await btn.isVisible({ timeout: 2000 })) {
          await btn.click();
          console.log(`認証コード送信ボタンをクリック: ${selector}`);
          break;
        }
      } catch {
        continue;
      }
    }

    await page.waitForTimeout(2000);
    await page.waitForLoadState('networkidle');
    await saveScreenshot(page, '09_after_otp_submit');
    console.log('認証コード送信後のURL:', page.url());
  } else {
    console.log('認証コード入力は不要でした');
  }

  // ログイン完了を確認（リダイレクト先のURL or 画面要素で判定）
  console.log('ログイン完了を確認中...');
  console.log('現在のURL:', page.url());

  let loginSuccess = false;

  // URLで確認（最大30秒待機）
  try {
    await page.waitForURL('**/biz.moneyforward.com/**', { timeout: 30000 });
    console.log('ログイン完了（URLで確認）:', page.url());
    loginSuccess = true;
  } catch {
    console.log('biz.moneyforward.com へのリダイレクトがタイムアウト');
  }

  if (!loginSuccess) {
    // 要素で確認
    try {
      await page.waitForSelector('nav, [class*="sidebar"], [class*="menu"], header', { timeout: 10000 });
      console.log('ログイン完了（要素で確認）');
      loginSuccess = true;
    } catch {
      console.log('ナビゲーション要素が見つかりません');
    }
  }

  if (!loginSuccess) {
    await saveScreenshot(page, '10_login_failed');
    console.log('ログイン失敗時のURL:', page.url());
    const html = await page.content();
    console.log('ページHTML（最初の3000文字）:', html.substring(0, 3000));
    throw new Error('ログインに失敗しました');
  }

  await saveScreenshot(page, '11_login_success');
  console.log('ログイン完了！最終URL:', page.url());
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
