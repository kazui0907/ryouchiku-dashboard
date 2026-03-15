/**
 * マネーフォワード クラウド会計 自動エクスポートスクリプト
 *
 * ======================================================
 * [保留中] 2026-03-16
 * - MFA認証は通過できるようになった
 * - 事業者選択画面でボタンクリックがうまくいかない
 * - 今後再開する可能性があるため、コードは保持
 * ======================================================
 *
 * 処理フロー:
 * 1. MFにログイン（MFA認証コードは手動入力）
 * 2. レポート → 推移表 → CSVダウンロード
 * 3. ダッシュボードAPIにアップロード
 *
 * 使用方法:
 *   npx tsx automation/mf-export.ts
 *
 * 必要な環境変数:
 *   MF_EMAIL, MF_PASSWORD
 */

import { chromium, Page, Browser } from 'playwright';
import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';

// .envファイルを読み込み
function loadEnv() {
  const envPath = path.join(process.cwd(), '.env');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf-8');
    for (const line of envContent.split('\n')) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const [key, ...valueParts] = trimmed.split('=');
        const value = valueParts.join('=');
        if (key && value && !process.env[key]) {
          process.env[key] = value;
        }
      }
    }
  }
}

loadEnv();

// 環境変数
const MF_EMAIL = process.env.MF_EMAIL!;
const MF_PASSWORD = process.env.MF_PASSWORD!;
const DASHBOARD_API_URL = process.env.DASHBOARD_API_URL || 'https://ryouchiku-dashboard.vercel.app/api/admin/upload';
const API_SECRET = process.env.API_SECRET;

const DOWNLOAD_DIR = path.join(process.cwd(), 'downloads');
const SCREENSHOT_DIR = path.join(process.cwd(), 'screenshots');

// コンソールから入力を受け取る
function prompt(question: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}

// スクリーンショット保存（デバッグ用）
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
  await page.goto('https://biz.moneyforward.com/');

  // ページ読み込み完了を待機
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);
  await saveScreenshot(page, '01_initial_page');
  console.log('初期ページにアクセスしました');
  console.log('現在のURL:', page.url());

  // ログインページへのリダイレクトを確認
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
  await page.waitForTimeout(2000);

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
    'input:visible',
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
    throw new Error('メールアドレス入力欄が見つかりません');
  }

  // メールアドレスを入力
  await emailInput.fill(MF_EMAIL);
  await page.waitForTimeout(500);
  await saveScreenshot(page, '03_email_entered');
  console.log('メールアドレスを入力しました');

  // ログインボタンをクリック
  const submitSelectors = [
    'button:has-text("ログインする")',
    'button:has-text("ログイン")',
    'button:has-text("次へ")',
    'button:has-text("続ける")',
    'button[type="submit"]',
    'input[type="submit"]',
  ];

  let submitted = false;
  for (const selector of submitSelectors) {
    try {
      const btn = page.locator(selector).first();
      if (await btn.isVisible({ timeout: 2000 })) {
        await btn.click();
        submitted = true;
        console.log(`ボタンをクリックしました: ${selector}`);
        break;
      }
    } catch {
      continue;
    }
  }

  if (!submitted) {
    await page.keyboard.press('Enter');
  }

  await page.waitForTimeout(2000);
  await page.waitForLoadState('networkidle');
  await saveScreenshot(page, '04_after_email_submit');
  console.log('メールアドレス送信後のURL:', page.url());

  // パスワード入力欄を探す
  console.log('パスワード入力欄を探しています...');

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
  }

  await page.waitForTimeout(2000);
  await page.waitForLoadState('networkidle');
  await saveScreenshot(page, '06_after_password_submit');
  console.log('パスワード送信後のURL:', page.url());

  // MFA認証コード入力画面をチェック
  console.log('MFA認証コード入力画面をチェック中...');

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
    console.log('\n========================================');
    console.log('MFA認証コードの入力が必要です');
    console.log('メールで届いた6桁の認証コードを確認してください');
    console.log('========================================\n');
    await saveScreenshot(page, '07_otp_required');

    // ユーザーに手動入力を促す
    const otp = await prompt('認証コードを入力してEnterを押してください: ');

    if (!otp || otp.length !== 6) {
      throw new Error('認証コードは6桁の数字で入力してください');
    }

    // 認証コードを入力
    await otpInput.fill(otp);
    await page.waitForTimeout(500);
    await saveScreenshot(page, '08_otp_entered');
    console.log('認証コードを入力しました');

    // 認証するボタンをクリック
    const otpSubmitSelectors = [
      'button:has-text("認証する")',
      'button:has-text("確認")',
      'button:has-text("送信")',
      ...submitSelectors,
    ];

    let otpSubmitted = false;
    for (const selector of otpSubmitSelectors) {
      try {
        const btn = page.locator(selector).first();
        if (await btn.isVisible({ timeout: 2000 })) {
          await btn.click();
          otpSubmitted = true;
          console.log(`認証コード送信ボタンをクリック: ${selector}`);
          break;
        }
      } catch {
        continue;
      }
    }

    if (!otpSubmitted) {
      console.log('認証ボタンが見つからないため、Enterキーで送信');
      await page.keyboard.press('Enter');
    }

    await page.waitForTimeout(2000);
    await page.waitForLoadState('networkidle');
    await saveScreenshot(page, '09_after_otp_submit');
    console.log('認証コード送信後のURL:', page.url());
  } else {
    console.log('MFA認証コード入力は不要でした');
  }

  // 事業者選択画面のチェック
  console.log('事業者選択画面をチェック中...');
  await page.waitForTimeout(3000);
  await page.waitForLoadState('networkidle');

  if (page.url().includes('loginable_office_selection') || page.url().includes('office_selection')) {
    console.log('事業者選択画面を検出');
    await saveScreenshot(page, '10_office_selection');

    // ページの読み込みを待機
    await page.waitForTimeout(2000);

    // 事業者番号 5668-7415 を選択
    try {
      // 様々なセレクタを試行
      const buttonSelectors = [
        'button:has-text("選択する")',
        'input[type="submit"][value*="選択"]',
        'a:has-text("選択する")',
        '[role="button"]:has-text("選択")',
        '.btn:has-text("選択")',
      ];

      let clicked = false;
      for (const selector of buttonSelectors) {
        try {
          const buttons = page.locator(selector);
          const count = await buttons.count();
          console.log(`セレクタ "${selector}" で ${count} 件のボタンを発見`);

          if (count > 0) {
            // 最初のボタン（5668-7415）をクリック
            await buttons.first().click();
            console.log(`事業者を選択しました (${selector})`);
            clicked = true;
            break;
          }
        } catch {
          continue;
        }
      }

      if (!clicked) {
        // テキストで直接クリック
        console.log('ボタンセレクタで見つからないため、テキストでクリック試行');
        await page.getByText('選択する').first().click();
        console.log('テキストで事業者を選択しました');
      }

      await page.waitForTimeout(3000);
      await page.waitForLoadState('networkidle');
    } catch (e) {
      console.log('事業者選択でエラー:', e);
      await saveScreenshot(page, '10_office_selection_error');
    }
  }

  // ログイン完了を確認
  console.log('ログイン完了を確認中...');
  console.log('現在のURL:', page.url());

  let loginSuccess = false;

  // URLで確認（最大30秒待機）
  try {
    await page.waitForURL('**/accounting.moneyforward.com/**', { timeout: 30000 });
    console.log('ログイン完了（URLで確認）:', page.url());
    loginSuccess = true;
  } catch {
    console.log('accounting.moneyforward.com へのリダイレクトを待機中...');
  }

  if (!loginSuccess) {
    // biz.moneyforward.comでも確認
    try {
      await page.waitForURL('**/biz.moneyforward.com/**', { timeout: 10000 });
      console.log('ログイン完了（biz URLで確認）:', page.url());
      loginSuccess = true;
    } catch {
      console.log('biz.moneyforward.com へのリダイレクトもタイムアウト');
    }
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
  const requiredEnvs = ['MF_EMAIL', 'MF_PASSWORD'];
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
      headless: false,  // ブラウザを表示（MFA手動入力のため）
      slowMo: 100,      // 操作を少し遅くして見やすく
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

    console.log('\n========================================');
    console.log('処理完了！');
    console.log('========================================\n');

    // 完了後、ユーザーがブラウザを確認できるよう少し待機
    await prompt('Enterを押すとブラウザを閉じます...');

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
