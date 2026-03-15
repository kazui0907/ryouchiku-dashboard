/**
 * Discord テストメッセージ送信スクリプト
 */

const { Client, GatewayIntentBits } = require('discord.js');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.secrets', 'discord.env') });

const CHANNEL_ID = process.env.DISCORD_CHANNEL_ID;

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages],
});

client.once('ready', async () => {
  console.log(`Logged in as ${client.user.tag}`);

  try {
    const channel = await client.channels.fetch(CHANNEL_ID);

    // メインメッセージを送信
    const mainMessage = await channel.send({
      content: `🔔 **新着メール [M001]**
From: test@example.com
Subject: Discord Bot 動作確認テスト
受信: 2026-03-16 02:20`,
    });

    // スレッドを作成
    const thread = await mainMessage.startThread({
      name: 'M001_テスト様_動作確認テスト',
      autoArchiveDuration: 1440, // 24時間
    });

    // スレッドに詳細を投稿
    await thread.send(`📊 **分類**: ✅ 要返信（テスト）

🏷️ **ラベル提案**: テスト

📝 **返信案**:
─────────────────────────────────
テスト様

お問い合わせいただきありがとうございます。
Discord Botの動作確認テストを承りました。

何かご不明な点がございましたら、お気軽にお問い合わせください。

龍竹一生
─────────────────────────────────

👉 **返信してください**:
  • 「OK」→ この内容で送信
  • 「ラベル:〇〇」→ ラベルを変更
  • 「修正：〇〇」→ 修正指示
  • 「スキップ」→ このメールは処理しない
  • 「削除」→ ゴミ箱に移動`);

    console.log(`Thread created: ${thread.name} (ID: ${thread.id})`);
    console.log('Test message sent successfully!');

  } catch (error) {
    console.error('Error:', error);
  }

  client.destroy();
  process.exit(0);
});

client.login(process.env.DISCORD_BOT_TOKEN);
