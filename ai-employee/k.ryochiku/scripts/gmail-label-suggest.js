#!/usr/bin/env node
/**
 * Gmail ラベル提案・学習スクリプト
 *
 * 使用方法:
 *   # ラベル提案を取得
 *   node gmail-label-suggest.js --email="sender@example.com" --subject="件名" --body="本文"
 *
 *   # 学習履歴に保存
 *   node gmail-label-suggest.js --save --email="sender@example.com" --label="ラベル名" --labelId="LABEL_ID"
 *
 *   # 学習履歴を表示
 *   node gmail-label-suggest.js --list
 *
 *   # ラベル一覧を取得
 *   node gmail-label-suggest.js --labels
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// 設定
const DATA_DIR = path.join(__dirname, '..', '.claude', 'data');
const HISTORY_FILE = path.join(DATA_DIR, 'label-history.json');

// キーワードマッピング（メール内容からラベルを推測）
const KEYWORD_MAPPING = [
  { keywords: ['経営講座', 'AI講座', 'AIセミナー', '生成AI講座'], label: '研修関係/AI経営講座' },
  { keywords: ['日創研', '田舞塾', '業績アップ'], label: '研修関係/日創研' },
  { keywords: ['42tokyo', 'フォーティーツー', '42Tokyo'], label: '研修関係/42tokyo' },
  { keywords: ['ランチェスター'], label: '研修関係/ランチェスター' },
  { keywords: ['ランドマーク'], label: '研修関係/ランドマーク' },
  { keywords: ['カクシン'], label: '研修関係/カクシン' },
  { keywords: ['legaseed', 'レガシード'], label: '研修関係/legaseed' },
  { keywords: ['リフォーム産業新聞'], label: '研修関係/リフォーム産業新聞' },
  { keywords: ['埼玉県産業振興公社'], label: '研修関係/(埼玉県産業振興公社' },
  { keywords: ['経営研究会'], label: '経営研究会/2026年' },
  { keywords: ['助成金', '補助金', '人材開発支援'], label: '補助金/助成金' },
  { keywords: ['無人ビジネス', '無人店舗'], label: '補助金/助成金/無人ビジネス' },
  { keywords: ['Google Workspace', 'GWS', 'グーグルワークスペース'], label: 'システム関連/Google Workspace' },
  { keywords: ['チャットボット', 'チャットBOT', 'LINE連携', '自動応答'], label: 'システム関連/チャットBOT' },
  { keywords: ['セールスフォース', 'Salesforce'], label: 'システム関連/セールスフォース' },
  { keywords: ['見積', '請求', '契約', '発注', 'IT導入', '内製化', 'マーケティング支援'], label: 'IT事業' },
  { keywords: ['採用', '求人', '面接', '応募'], label: '採用' },
  { keywords: ['ビルワン', 'Bill One', 'billone'], label: 'ビルワン' },
  { keywords: ['ECサイト', 'ネットショップ', 'オンラインストア'], label: 'ECサイト' },
  { keywords: ['不動産', '物件', '賃貸'], label: '不動産事業' },
  { keywords: ['海外進出', '海外展開', 'グローバル'], label: '海外進出' },
  { keywords: ['方針発表会', '経営方針'], label: '方針発表会' },
  { keywords: ['椎名'], label: '椎名' },
  { keywords: ['買い物', '購入', '注文'], label: '買い物' },
];

// 学習履歴を読み込み
function loadHistory() {
  try {
    if (fs.existsSync(HISTORY_FILE)) {
      const data = fs.readFileSync(HISTORY_FILE, 'utf-8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('履歴読み込みエラー:', error.message);
  }
  return {};
}

// 学習履歴を保存
function saveHistory(history) {
  try {
    // ディレクトリがなければ作成
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(HISTORY_FILE, JSON.stringify(history, null, 2), 'utf-8');
    return true;
  } catch (error) {
    console.error('履歴保存エラー:', error.message);
    return false;
  }
}

// メールアドレスを正規化（小文字化、空白除去）
function normalizeEmail(email) {
  return email.toLowerCase().trim();
}

// 学習履歴から提案を取得
function suggestFromHistory(email) {
  const history = loadHistory();
  const normalizedEmail = normalizeEmail(email);

  if (history[normalizedEmail]) {
    return {
      source: 'history',
      label: history[normalizedEmail].label,
      labelId: history[normalizedEmail].labelId,
      count: history[normalizedEmail].count,
      lastUsed: history[normalizedEmail].lastUsed
    };
  }
  return null;
}

// キーワードから提案を取得
function suggestFromKeywords(subject, body) {
  const text = `${subject || ''} ${body || ''}`.toLowerCase();

  for (const mapping of KEYWORD_MAPPING) {
    for (const keyword of mapping.keywords) {
      if (text.includes(keyword.toLowerCase())) {
        return {
          source: 'keyword',
          label: mapping.label,
          matchedKeyword: keyword
        };
      }
    }
  }

  return null;
}

// ラベル提案を取得
function suggest(email, subject, body) {
  // 1. 学習履歴から検索
  const historyResult = suggestFromHistory(email);
  if (historyResult) {
    return historyResult;
  }

  // 2. キーワードから検索
  const keywordResult = suggestFromKeywords(subject, body);
  if (keywordResult) {
    return keywordResult;
  }

  // 3. デフォルト
  return {
    source: 'default',
    label: 'その他'
  };
}

// 学習履歴に保存
function saveToHistory(email, label, labelId) {
  const history = loadHistory();
  const normalizedEmail = normalizeEmail(email);
  const today = new Date().toISOString().split('T')[0];

  if (history[normalizedEmail]) {
    // 既存エントリを更新
    history[normalizedEmail].label = label;
    history[normalizedEmail].labelId = labelId;
    history[normalizedEmail].lastUsed = today;
    history[normalizedEmail].count = (history[normalizedEmail].count || 0) + 1;
  } else {
    // 新規エントリ
    history[normalizedEmail] = {
      label: label,
      labelId: labelId,
      lastUsed: today,
      count: 1
    };
  }

  return saveHistory(history);
}

// Gmailラベル一覧を取得
function getGmailLabels() {
  try {
    const result = execSync('gws gmail users labels list --params \'{"userId": "me"}\'', {
      encoding: 'utf-8',
      timeout: 30000
    });
    const data = JSON.parse(result);
    return data.labels
      .filter(l => l.type === 'user')
      .map(l => ({ id: l.id, name: l.name }))
      .sort((a, b) => a.name.localeCompare(b.name, 'ja'));
  } catch (error) {
    console.error('Gmailラベル取得エラー:', error.message);
    return [];
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
  if (params.list) {
    // 学習履歴を表示
    const history = loadHistory();
    console.log(JSON.stringify(history, null, 2));
    return;
  }

  if (params.labels) {
    // Gmailラベル一覧を表示
    const labels = getGmailLabels();
    console.log(JSON.stringify(labels, null, 2));
    return;
  }

  if (params.save) {
    // 学習履歴に保存
    if (!params.email || !params.label) {
      console.error('エラー: --email と --label は必須です');
      process.exit(1);
    }
    const success = saveToHistory(params.email, params.label, params.labelId || '');
    if (success) {
      console.log(JSON.stringify({
        success: true,
        email: params.email,
        label: params.label
      }));
    } else {
      console.error('保存に失敗しました');
      process.exit(1);
    }
    return;
  }

  // ラベル提案
  if (!params.email) {
    console.error('エラー: --email は必須です');
    console.error('使用方法:');
    console.error('  node gmail-label-suggest.js --email="sender@example.com" --subject="件名" --body="本文"');
    console.error('  node gmail-label-suggest.js --save --email="sender@example.com" --label="ラベル名"');
    console.error('  node gmail-label-suggest.js --list');
    console.error('  node gmail-label-suggest.js --labels');
    process.exit(1);
  }

  const result = suggest(params.email, params.subject, params.body);
  console.log(JSON.stringify(result, null, 2));
}

main();
