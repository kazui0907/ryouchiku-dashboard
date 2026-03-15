#!/usr/bin/env node
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

/**
 * billone-invoice-helper.js — Bill One請求書PDF一括ダウンロード・印刷（スプレッドシート管理版）
 *
 * 使い方:
 *   node billone-invoice-helper.js [command] [options]
 *
 * コマンド:
 *   list [--days=N]              過去N日分の請求書メール一覧を表示（デフォルト: 7日）
 *   list --unprinted             未印刷の請求書一覧を表示
 *   download [--days=N]          過去N日分の請求書PDFをダウンロード
 *   download --unprinted         未印刷の請求書をすべてダウンロード
 *   print [--days=N]             ダウンロード後に印刷
 *   print --unprinted            未印刷の請求書をすべてダウンロード＆印刷
 *   sync [--days=N]              スプレッドシートに請求書情報を同期（ダウンロードなし）
 *   sync --mark-printed          過去分を「印刷済」としてマーク（初回セットアップ用）
 *
 * 環境変数:
 *   BILLONE_EMAIL          Bill Oneログイン用メールアドレス
 *   BILLONE_PASSWORD       Bill Oneログイン用パスワード
 *   BILLONE_SPREADSHEET_ID 請求書管理スプレッドシートのID
 *
 * 例:
 *   node billone-invoice-helper.js list --days=30
 *   node billone-invoice-helper.js list --unprinted
 *   node billone-invoice-helper.js download --unprinted
 *   node billone-invoice-helper.js print --unprinted
 *   node billone-invoice-helper.js sync --days=30 --mark-printed
 */

const { chromium } = require('playwright');
const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

// 設定
const CONFIG = {
  gwsAccount: 'ryouchiku@life-time-support.com',
  downloadDir: path.join(__dirname, '..', 'downloads', 'invoices'),
  billOneBaseUrl: 'https://life-time-support.app.bill-one.com',
  billOneLoginUrl: 'https://life-time-support.app.bill-one.com/login',
  spreadsheetId: process.env.BILLONE_SPREADSHEET_ID,
  sheetName: '請求書一覧',
};

// ステータス定義
const STATUS = {
  UNPROCESSED: '未処理',
  DOWNLOADED: 'ダウンロード済',
  PRINTED: '印刷済',
};

// 引数パース
function parseArgs(args) {
  const result = { command: args[0] || 'list' };
  args.slice(1).forEach(arg => {
    const m = arg.match(/^--([^=]+)=(.*)$/);
    if (m) result[m[1]] = m[2];
    else if (arg.startsWith('--')) result[arg.slice(2)] = true;
  });
  return result;
}

// スプレッドシートからデータを取得
async function getSpreadsheetData() {
  if (!CONFIG.spreadsheetId) {
    console.log('⚠️  BILLONE_SPREADSHEET_ID が設定されていません');
    return [];
  }

  try {
    const result = execSync(
      `gws sheets spreadsheets values get --params '{"spreadsheetId": "${CONFIG.spreadsheetId}", "range": "A:H"}'`,
      { encoding: 'utf-8', timeout: 30000 }
    );
    const data = JSON.parse(result);
    const rows = data.values || [];

    // ヘッダー行をスキップしてオブジェクト配列に変換
    if (rows.length <= 1) return [];

    return rows.slice(1).map(row => ({
      invoiceId: row[0] || '',
      vendor: row[1] || '',
      receivedDate: row[2] || '',
      amount: row[3] || '',
      dueDate: row[4] || '',
      downloadedAt: row[5] || '',
      printedAt: row[6] || '',
      status: row[7] || STATUS.UNPROCESSED,
    }));
  } catch (err) {
    console.error('スプレッドシート取得エラー:', err.message);
    return [];
  }
}

// スプレッドシートに行を追加
async function appendToSpreadsheet(invoices) {
  if (!CONFIG.spreadsheetId || invoices.length === 0) return;

  const values = invoices.map(inv => [
    inv.invoiceId,
    inv.vendor,
    inv.receivedDate,
    inv.amount,
    inv.dueDate,
    inv.downloadedAt || '',
    inv.printedAt || '',
    inv.status || STATUS.UNPROCESSED,
  ]);

  const jsonBody = JSON.stringify({ values });

  try {
    execSync(
      `gws sheets spreadsheets values append --params '{"spreadsheetId": "${CONFIG.spreadsheetId}", "range": "A:H", "valueInputOption": "RAW", "insertDataOption": "INSERT_ROWS"}' --json '${jsonBody.replace(/'/g, "'\\''")}'`,
      { encoding: 'utf-8', timeout: 30000 }
    );
    console.log(`📝 ${invoices.length}件をスプレッドシートに追加しました`);
  } catch (err) {
    console.error('スプレッドシート追加エラー:', err.message);
  }
}

// スプレッドシートの行を更新
async function updateSpreadsheetRow(rowIndex, updates) {
  if (!CONFIG.spreadsheetId) return;

  // rowIndex は0始まり（ヘッダー除く）、シートは2行目から
  const sheetRow = rowIndex + 2;

  // 更新するセル範囲と値を構築
  const values = [[
    updates.invoiceId,
    updates.vendor,
    updates.receivedDate,
    updates.amount,
    updates.dueDate,
    updates.downloadedAt || '',
    updates.printedAt || '',
    updates.status,
  ]];

  const jsonBody = JSON.stringify({ values });

  try {
    execSync(
      `gws sheets spreadsheets values update --params '{"spreadsheetId": "${CONFIG.spreadsheetId}", "range": "A${sheetRow}:H${sheetRow}", "valueInputOption": "RAW"}' --json '${jsonBody.replace(/'/g, "'\\''")}'`,
      { encoding: 'utf-8', timeout: 30000 }
    );
  } catch (err) {
    console.error(`スプレッドシート更新エラー (行${sheetRow}):`, err.message);
  }
}

// メールのsnippetから取引先名を抽出
function extractVendorName(snippet) {
  // パターン: 「取引先 : XXX」または「XXX 様から受領した」
  const match1 = snippet.match(/取引先\s*[:：]\s*([^\s]+)/);
  if (match1) return match1[1];

  const match2 = snippet.match(/([^\s]+)\s+様から受領した/);
  if (match2) return match2[1];

  return '';
}

// メールのsnippetから金額を抽出
function extractAmount(snippet) {
  const match = snippet.match(/請求金額\s*[:：]\s*(JPY\s*)?([0-9,]+)/);
  if (match) return match[2];
  return '';
}

// メールのsnippetから支払期日を抽出
function extractDueDate(snippet) {
  const match = snippet.match(/支払期日\s*[:：]\s*(\d{4}\/\d{1,2}\/\d{1,2})/);
  if (match) return match[1];
  return '';
}

// Gmailから請求書通知メールを取得
async function getInvoiceEmails(days = 7) {
  const afterDate = new Date();
  afterDate.setDate(afterDate.getDate() - days);
  const afterStr = afterDate.toISOString().split('T')[0].replace(/-/g, '/');

  const query = `from:bill-one.com subject:請求書 after:${afterStr}`;

  try {
    const result = execSync(
      `gws gmail users messages list --params '{"userId": "me", "q": "${query}", "maxResults": 50}'`,
      { encoding: 'utf-8', timeout: 30000 }
    );
    const data = JSON.parse(result);

    if (!data.messages || data.messages.length === 0) {
      console.log(`📭 過去${days}日間に請求書通知メールはありません`);
      return [];
    }

    // 各メールの詳細を取得
    const emails = [];
    for (const msg of data.messages) {
      const detail = execSync(
        `gws gmail users messages get --params '{"userId": "me", "id": "${msg.id}", "format": "full"}'`,
        { encoding: 'utf-8', timeout: 30000 }
      );
      const mailData = JSON.parse(detail);

      // メール本文からURLを抽出
      const invoiceUrl = extractInvoiceUrl(mailData);
      const subject = mailData.payload?.headers?.find(h => h.name === 'Subject')?.value || '';
      const date = mailData.payload?.headers?.find(h => h.name === 'Date')?.value || '';
      const snippet = mailData.snippet || '';

      if (invoiceUrl) {
        const invoiceId = invoiceUrl.split('/').pop();
        emails.push({
          id: msg.id,
          subject,
          date,
          snippet,
          invoiceUrl,
          invoiceId,
          vendor: extractVendorName(snippet),
          amount: extractAmount(snippet),
          dueDate: extractDueDate(snippet),
          receivedDate: new Date(date).toISOString().split('T')[0],
        });
      }
    }

    return emails;
  } catch (err) {
    console.error('Gmail取得エラー:', err.message);
    return [];
  }
}

// メール本文から請求書URLを抽出
function extractInvoiceUrl(mailData) {
  const parts = mailData.payload?.parts || [mailData.payload];

  for (const part of parts) {
    if (part.body?.data) {
      const decoded = Buffer.from(part.body.data.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf-8');
      // URLを抽出: https://xxx.app.bill-one.com/recipient/invoice/UUID
      const match = decoded.match(/https:\/\/[^\/]+\.app\.bill-one\.com\/recipient\/invoice\/[a-f0-9-]+/i);
      if (match) return match[0];
    }
    if (part.parts) {
      const found = extractInvoiceUrl({ payload: { parts: part.parts } });
      if (found) return found;
    }
  }
  return null;
}

// Bill Oneにログインしてセッションを取得
async function loginToBillOne(browser) {
  const email = process.env.BILLONE_EMAIL;
  const password = process.env.BILLONE_PASSWORD;

  if (!email || !password) {
    throw new Error('環境変数 BILLONE_EMAIL と BILLONE_PASSWORD を設定してください');
  }

  const context = await browser.newContext({
    acceptDownloads: true,
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  });
  const page = await context.newPage();

  console.log('🔐 Bill Oneにログイン中...');

  // ベースURLにアクセス（ログインページにリダイレクトされる）
  await page.goto(CONFIG.billOneBaseUrl);
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(2000);

  // Step 1: メールアドレス入力（bill-one.auth.sansan.com）
  await page.waitForSelector('input#username, input[name="username"], input[type="email"]', { timeout: 15000 });
  const emailInput = page.locator('input#username, input[name="username"], input[type="email"]').first();
  await emailInput.fill(email);
  console.log('  📧 メールアドレス入力完了');

  // NEXTボタンをクリック
  await page.waitForTimeout(500);
  const nextButton = page.locator('button:has-text("NEXT"), button:has-text("次へ"), button[type="submit"]').first();
  await nextButton.click();
  console.log('  ➡️ NEXTクリック');

  // Step 2: パスワード入力欄を待機
  await page.waitForSelector('input[type="password"]', { timeout: 15000 });
  await page.waitForTimeout(500);
  const passwordInput = page.locator('input[type="password"]').first();
  await passwordInput.fill(password);
  console.log('  🔑 パスワード入力完了');

  // ログイン/サインインボタンをクリック
  await page.waitForTimeout(500);
  const loginButton = page.locator('button[type="submit"], button:has-text("SIGN IN"), button:has-text("ログイン"), button:has-text("サインイン")').first();
  await loginButton.click();
  console.log('  🚀 サインインクリック');

  // ログイン完了を待つ（app.bill-one.comに戻るまで）
  await page.waitForURL(/.*app\.bill-one\.com.*/, { timeout: 30000 });
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(2000);

  console.log('✅ ログイン成功');

  return { context, page };
}

// 請求書PDFをダウンロード
async function downloadInvoicePdf(page, invoiceUrl, invoiceId) {
  const pdfPath = path.join(CONFIG.downloadDir, `invoice-${invoiceId}.pdf`);

  // すでにダウンロード済みの場合はスキップ
  if (fs.existsSync(pdfPath)) {
    console.log(`⏭️  スキップ（ダウンロード済み）: ${invoiceId}`);
    return pdfPath;
  }

  console.log(`📥 ダウンロード中: ${invoiceId}`);

  // 直接PDFのAPIエンドポイントにアクセス
  const pdfApiUrl = `${CONFIG.billOneBaseUrl}/api/invoice/recipient/invoices/internal-share/${invoiceId}/pdf`;

  try {
    // APIからPDFをダウンロード
    const response = await page.request.get(pdfApiUrl);

    if (response.ok()) {
      const buffer = await response.body();
      fs.writeFileSync(pdfPath, buffer);
      console.log(`✅ ダウンロード完了: ${pdfPath}`);
      return pdfPath;
    } else {
      console.log(`⚠️  API応答エラー (${response.status()}): フォールバックを試みます`);
    }
  } catch (err) {
    console.log(`⚠️  APIダウンロードエラー: ${err.message}`);
  }

  // フォールバック: ページにアクセスしてPDFを保存
  await page.goto(invoiceUrl);
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);

  // embed要素からPDF URLを取得
  const embedSrc = await page.$eval('embed[type="application/pdf"]', el => el.src).catch(() => null);

  if (embedSrc) {
    try {
      const response = await page.request.get(embedSrc);
      if (response.ok()) {
        const buffer = await response.body();
        fs.writeFileSync(pdfPath, buffer);
        console.log(`✅ ダウンロード完了（embed経由）: ${pdfPath}`);
        return pdfPath;
      }
    } catch (err) {
      console.log(`⚠️  embed PDFダウンロードエラー: ${err.message}`);
    }
  }

  // 最終フォールバック: ページをPDFとして保存
  console.log('⚠️  PDFを直接取得できません。ページをPDFとして保存します。');
  await page.pdf({ path: pdfPath, format: 'A4' });
  return pdfPath;
}

// PDFを印刷
async function printPdf(pdfPath) {
  console.log(`🖨️  印刷中: ${path.basename(pdfPath)}`);
  try {
    // macOSの場合はlpコマンドを使用
    execSync(`lp "${pdfPath}"`, { stdio: 'pipe' });
    console.log(`✅ 印刷ジョブを送信しました`);
    return true;
  } catch (err) {
    console.error(`❌ 印刷エラー: ${err.message}`);
    return false;
  }
}

// メイン処理
async function main() {
  const args = parseArgs(process.argv.slice(2));
  const days = parseInt(args.days || '7');
  const command = args.command;
  const unprintedOnly = args.unprinted === true;
  const markPrinted = args['mark-printed'] === true;

  console.log(`\n📋 Bill One 請求書ヘルパー`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

  // スプレッドシートIDの確認
  if (!CONFIG.spreadsheetId) {
    console.log('⚠️  警告: BILLONE_SPREADSHEET_ID が設定されていません');
    console.log('   スプレッドシート管理機能は無効です\n');
  }

  // 請求書メールを取得
  console.log(`📬 過去${days}日分の請求書通知メールを検索中...\n`);
  const emails = await getInvoiceEmails(days);

  if (emails.length === 0) {
    console.log('処理する請求書がありません。');
    return;
  }

  // スプレッドシートのデータを取得
  const sheetData = await getSpreadsheetData();
  const existingIds = new Set(sheetData.map(row => row.invoiceId));

  // 新規の請求書をスプレッドシートに追加
  const newInvoices = emails.filter(e => !existingIds.has(e.invoiceId));
  if (newInvoices.length > 0 && CONFIG.spreadsheetId) {
    // --mark-printed の場合は「印刷済」として追加
    const initialStatus = markPrinted ? STATUS.PRINTED : STATUS.UNPROCESSED;
    const statusLabel = markPrinted ? '印刷済' : '未処理';
    console.log(`\n📝 ${newInvoices.length}件の新規請求書を「${statusLabel}」としてスプレッドシートに追加します...\n`);
    await appendToSpreadsheet(newInvoices.map(e => ({
      invoiceId: e.invoiceId,
      vendor: e.vendor,
      receivedDate: e.receivedDate,
      amount: e.amount,
      dueDate: e.dueDate,
      printedAt: markPrinted ? new Date().toISOString() : '',
      status: initialStatus,
    })));
  }

  // 再度スプレッドシートデータを取得（追加後）
  const updatedSheetData = CONFIG.spreadsheetId ? await getSpreadsheetData() : [];

  // 対象の請求書を決定
  let targetInvoices;
  if (unprintedOnly && CONFIG.spreadsheetId) {
    // 未印刷のもののみ対象
    const unprintedIds = new Set(
      updatedSheetData
        .filter(row => row.status !== STATUS.PRINTED)
        .map(row => row.invoiceId)
    );
    targetInvoices = emails.filter(e => unprintedIds.has(e.invoiceId));
    console.log(`\n🔍 未印刷の請求書: ${targetInvoices.length}件\n`);
  } else {
    targetInvoices = emails;
  }

  // sync コマンド: スプレッドシート同期のみ
  if (command === 'sync') {
    // --mark-printed の場合、既存の未処理レコードも印刷済に更新
    if (markPrinted && CONFIG.spreadsheetId) {
      const unprintedRows = updatedSheetData
        .map((row, index) => ({ ...row, index }))
        .filter(row => row.status !== STATUS.PRINTED);

      if (unprintedRows.length > 0) {
        console.log(`\n🔄 ${unprintedRows.length}件の既存レコードを「印刷済」に更新中...`);
        const printedAt = new Date().toISOString();
        for (const row of unprintedRows) {
          row.printedAt = printedAt;
          row.status = STATUS.PRINTED;
          await updateSpreadsheetRow(row.index, row);
        }
        console.log(`✅ 更新完了`);
      }
    }

    console.log(`\n✅ スプレッドシート同期完了`);
    console.log(`   全請求書: ${emails.length}件`);
    console.log(`   新規追加: ${newInvoices.length}件`);
    if (markPrinted) {
      console.log(`   ステータス: 印刷済としてマーク`);
    }
    return;
  }

  // list コマンド: 一覧表示のみ
  if (command === 'list') {
    console.log(`\n📄 請求書一覧（${targetInvoices.length}件）\n`);
    console.log('ID'.padEnd(40) + 'ステータス'.padEnd(14) + '取引先');
    console.log('─'.repeat(80));

    for (const e of targetInvoices) {
      const sheetRow = updatedSheetData.find(r => r.invoiceId === e.invoiceId);
      const status = sheetRow?.status || STATUS.UNPROCESSED;
      const statusIcon = status === STATUS.PRINTED ? '✅' : status === STATUS.DOWNLOADED ? '📥' : '⏳';
      console.log(`${e.invoiceId.padEnd(40)} ${statusIcon} ${status.padEnd(10)} ${e.vendor || e.snippet.slice(0, 30)}`);
    }

    if (unprintedOnly) {
      console.log(`\n💡 ダウンロード＆印刷するには: node billone-invoice-helper.js print --unprinted`);
    } else {
      console.log(`\n💡 未印刷のみ表示: node billone-invoice-helper.js list --unprinted`);
      console.log(`💡 ダウンロードするには: node billone-invoice-helper.js download --days=${days}`);
    }
    return;
  }

  // download / print コマンド: PDFをダウンロード
  if (targetInvoices.length === 0) {
    console.log('処理対象の請求書がありません。');
    return;
  }

  console.log(`\n📥 ${targetInvoices.length}件の請求書PDFをダウンロードします...\n`);

  // ダウンロードディレクトリ確認
  if (!fs.existsSync(CONFIG.downloadDir)) {
    fs.mkdirSync(CONFIG.downloadDir, { recursive: true });
  }

  const browser = await chromium.launch({ headless: true });

  try {
    const { context, page } = await loginToBillOne(browser);

    const downloadedFiles = [];
    const now = new Date().toISOString();

    for (const invoice of targetInvoices) {
      try {
        const pdfPath = await downloadInvoicePdf(page, invoice.invoiceUrl, invoice.invoiceId);
        if (pdfPath) {
          downloadedFiles.push({ ...invoice, pdfPath });

          // スプレッドシートを更新
          if (CONFIG.spreadsheetId) {
            const rowIndex = updatedSheetData.findIndex(r => r.invoiceId === invoice.invoiceId);
            if (rowIndex >= 0) {
              updatedSheetData[rowIndex].downloadedAt = now;
              updatedSheetData[rowIndex].status = STATUS.DOWNLOADED;
              await updateSpreadsheetRow(rowIndex, updatedSheetData[rowIndex]);
            }
          }
        }
      } catch (err) {
        console.error(`❌ ダウンロードエラー (${invoice.invoiceId}): ${err.message}`);
      }
    }

    await context.close();

    console.log(`\n✅ ダウンロード完了: ${downloadedFiles.length}/${targetInvoices.length}件`);
    console.log(`📁 保存先: ${CONFIG.downloadDir}\n`);

    // print コマンド: 印刷
    if (command === 'print' && downloadedFiles.length > 0) {
      console.log(`\n🖨️  ${downloadedFiles.length}件のPDFを印刷します...\n`);

      let printed = 0;
      const printedAt = new Date().toISOString();

      for (const invoice of downloadedFiles) {
        if (await printPdf(invoice.pdfPath)) {
          printed++;

          // スプレッドシートを更新
          if (CONFIG.spreadsheetId) {
            const rowIndex = updatedSheetData.findIndex(r => r.invoiceId === invoice.invoiceId);
            if (rowIndex >= 0) {
              updatedSheetData[rowIndex].printedAt = printedAt;
              updatedSheetData[rowIndex].status = STATUS.PRINTED;
              await updateSpreadsheetRow(rowIndex, updatedSheetData[rowIndex]);
            }
          }
        }
      }

      console.log(`\n✅ 印刷完了: ${printed}/${downloadedFiles.length}件\n`);
    }

  } finally {
    await browser.close();
  }
}

main().catch(err => {
  console.error('エラー:', err.message);
  process.exit(1);
});
