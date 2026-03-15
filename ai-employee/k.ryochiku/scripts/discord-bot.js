/**
 * LTS Mail Assistant - Discord Bot
 *
 * ユーザーからの返信をGoogle Driveに保存する常駐Bot
 *
 * 機能:
 * - スレッド内のメッセージを監視
 * - 「OK」「修正：〇〇」「ラベル:〇〇」などの指示を検出
 * - Google Drive の対応フォルダに指示を保存
 */

const { Client, GatewayIntentBits, Partials } = require('discord.js');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.secrets', 'discord.env') });

// 設定
const GOOGLE_DRIVE_BASE = '/Users/kazui/Library/CloudStorage/GoogleDrive-ryouchiku@life-time-support.com/マイドライブ/LTS-Mail-System';
const THREADS_DIR = path.join(GOOGLE_DRIVE_BASE, 'threads');

// Discord Client初期化
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMessageTyping,
  ],
  partials: [Partials.Channel, Partials.Message],
});

// ログ出力
function log(message) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${message}`);
}

// スレッド名からメールIDを抽出（例: "M001_田中様_AI経営講座" → "M001"）
function extractMailId(threadName) {
  const match = threadName.match(/^(M\d+)/);
  return match ? match[1] : null;
}

// 指示タイプを判定
function parseInstruction(content) {
  const text = content.trim();

  // OK（承認）
  if (/^(OK|ok|おk|オッケー|オーケー|はい|送信|送って)$/i.test(text)) {
    return { type: 'approved', value: null };
  }

  // ラベル変更
  const labelMatch = text.match(/^ラベル[:：\s]*(.+)$/);
  if (labelMatch) {
    return { type: 'label_change', value: labelMatch[1].trim() };
  }

  // 修正指示
  const revisionMatch = text.match(/^修正[:：\s]*(.+)$/s);
  if (revisionMatch) {
    return { type: 'needs_revision', value: revisionMatch[1].trim() };
  }

  // スキップ
  if (/^(スキップ|skip|無視|対応不要)$/i.test(text)) {
    return { type: 'skipped', value: null };
  }

  // 削除
  if (/^(削除|ゴミ箱|trash|delete)$/i.test(text)) {
    return { type: 'trash', value: null };
  }

  // 保留
  if (/^(保留|後で|あとで|pending)$/i.test(text)) {
    return { type: 'hold', value: null };
  }

  return null;
}

// Google Driveのスレッドフォルダを検索
function findThreadFolder(mailId) {
  if (!fs.existsSync(THREADS_DIR)) {
    return null;
  }

  const folders = fs.readdirSync(THREADS_DIR);
  const matchingFolder = folders.find(f => f.startsWith(mailId + '_'));

  if (matchingFolder) {
    return path.join(THREADS_DIR, matchingFolder);
  }
  return null;
}

// status.jsonを更新
function updateStatus(folderPath, newStatus, additionalData = {}) {
  const statusPath = path.join(folderPath, 'status.json');

  let status = {};
  if (fs.existsSync(statusPath)) {
    status = JSON.parse(fs.readFileSync(statusPath, 'utf8'));
  }

  status.status = newStatus;
  status.updated_at = new Date().toISOString();
  status.updated_via = 'discord';
  Object.assign(status, additionalData);

  fs.writeFileSync(statusPath, JSON.stringify(status, null, 2));
  log(`Updated status: ${folderPath} → ${newStatus}`);
}

// instructions.mdを保存
function saveInstructions(folderPath, instructions) {
  const instructionsPath = path.join(folderPath, 'instructions.md');

  const content = `# 修正指示

**受信日時**: ${new Date().toISOString()}
**送信元**: Discord

## 指示内容

${instructions}
`;

  fs.writeFileSync(instructionsPath, content);
  log(`Saved instructions: ${folderPath}`);
}

// label_proposal.jsonを更新
function updateLabelProposal(folderPath, newLabel) {
  const labelPath = path.join(folderPath, 'label_proposal.json');

  let labelData = {};
  if (fs.existsSync(labelPath)) {
    labelData = JSON.parse(fs.readFileSync(labelPath, 'utf8'));
  }

  labelData.label = newLabel;
  labelData.updated_at = new Date().toISOString();
  labelData.updated_via = 'discord';

  fs.writeFileSync(labelPath, JSON.stringify(labelData, null, 2));
  log(`Updated label proposal: ${folderPath} → ${newLabel}`);
}

// Botの準備完了
client.once('ready', () => {
  log(`Bot is ready! Logged in as ${client.user.tag}`);
  log(`Monitoring Google Drive: ${THREADS_DIR}`);
});

// メッセージ受信
client.on('messageCreate', async (message) => {
  // Bot自身のメッセージは無視
  if (message.author.bot) return;

  // スレッド内のメッセージのみ処理
  if (!message.channel.isThread()) return;

  const threadName = message.channel.name;
  const mailId = extractMailId(threadName);

  if (!mailId) {
    log(`Could not extract mail ID from thread: ${threadName}`);
    return;
  }

  log(`Received message in thread ${threadName} (${mailId}): ${message.content}`);

  // 指示を解析
  const instruction = parseInstruction(message.content);

  if (!instruction) {
    log(`No valid instruction found in message`);
    return;
  }

  // Google Driveのフォルダを検索
  const folderPath = findThreadFolder(mailId);

  if (!folderPath) {
    log(`Thread folder not found for ${mailId}`);
    await message.reply(`このメール（${mailId}）の処理フォルダが見つかりませんでした。`);
    return;
  }

  // 指示タイプに応じて処理
  try {
    switch (instruction.type) {
      case 'approved':
        updateStatus(folderPath, 'approved');
        await message.reply('承認しました。次回のClaude Code実行時に送信されます。');
        break;

      case 'label_change':
        updateLabelProposal(folderPath, instruction.value);
        updateStatus(folderPath, 'approved');
        await message.reply(`ラベルを「${instruction.value}」に変更して承認しました。`);
        break;

      case 'needs_revision':
        saveInstructions(folderPath, instruction.value);
        updateStatus(folderPath, 'needs_revision');
        await message.reply('修正指示を保存しました。次回のClaude Code実行時に修正版を作成します。');
        break;

      case 'skipped':
        updateStatus(folderPath, 'skipped');
        await message.reply('このメールの処理をスキップしました。');
        break;

      case 'trash':
        updateStatus(folderPath, 'approved', { trash_request: true });
        await message.reply('削除リクエストを保存しました。次回のClaude Code実行時にゴミ箱に移動します。');
        break;

      case 'hold':
        updateStatus(folderPath, 'hold');
        await message.reply('このメールを保留にしました。');
        break;
    }
  } catch (error) {
    log(`Error processing instruction: ${error.message}`);
    await message.reply(`エラーが発生しました: ${error.message}`);
  }
});

// エラーハンドリング
client.on('error', (error) => {
  log(`Discord client error: ${error.message}`);
});

// Bot起動
const token = process.env.DISCORD_BOT_TOKEN;
if (!token) {
  console.error('DISCORD_BOT_TOKEN is not set in .secrets/discord.env');
  process.exit(1);
}

log('Starting Discord Bot...');
client.login(token);
