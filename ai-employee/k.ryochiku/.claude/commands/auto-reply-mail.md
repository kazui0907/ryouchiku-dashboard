---
description: Discord連携のメール自動処理（cron実行用）
---

# /auto-reply-mail

**Discord連携版のメール自動処理コマンド。**
cron（launchd）から定期実行され、Discordを通じてユーザーと非同期でやり取りする。

## 対象メール

**⚠️ 未読メールのみが対象**
- `/auto-reply-mail` は未読メール（`is:unread`）のみを処理
- 既読メールは対象外（手動で `/reply-mail` を使用）
- これにより、既に確認済みのメールが重複通知されることを防ぐ

## 概要

このコマンドは以下の3フェーズで動作:

1. **Phase 1: 指示処理** — Google Driveの指示ファイルを確認し、承認済みメールの送信・修正指示への対応
2. **Phase 2: 新着メール処理** — Gmailから新着メールを取得し、Discordに通知
3. **Phase 3: サマリー通知** — 未処理メールの一覧を通知

## パス定義

```
GOOGLE_DRIVE_BASE: /Users/kazui/Library/CloudStorage/GoogleDrive-ryouchiku@life-time-support.com/マイドライブ/LTS-Mail-System
THREADS_DIR: ${GOOGLE_DRIVE_BASE}/threads
PROCESSED_DIR: ${GOOGLE_DRIVE_BASE}/processed
CONFIG_DIR: ${GOOGLE_DRIVE_BASE}/config
SECRETS_DIR: /Users/kazui/scripts/ai-employee/k.ryochiku/.secrets
DATA_DIR: /Users/kazui/scripts/ai-employee/k.ryochiku/.claude/data
```

## 実行手順

### 0. 初期化

```bash
# Discord設定を読み込み
cat /Users/kazui/scripts/ai-employee/k.ryochiku/.secrets/discord.env

# 学習ルールを読み込み
cat /Users/kazui/scripts/ai-employee/k.ryochiku/.claude/data/reply-learnings.json
cat /Users/kazui/scripts/ai-employee/k.ryochiku/.claude/data/label-rules.json
```

---

## Phase 1: 指示処理

Google Driveの `threads/` フォルダをスキャンし、ユーザーからの指示を処理する。

### 1.1 スレッドフォルダのスキャン

```bash
ls -la "/Users/kazui/Library/CloudStorage/GoogleDrive-ryouchiku@life-time-support.com/マイドライブ/LTS-Mail-System/threads/"
```

各フォルダの `status.json` を確認:

```bash
cat "${THREADS_DIR}/M001_xxx/status.json"
```

### 1.2 ステータス別の処理

#### status: "approved"（承認済み）

1. **メール送信を実行**
   ```bash
   # draft.md から返信内容を取得
   cat "${THREADS_DIR}/M001_xxx/draft.md"

   # original.json からスレッドID・宛先を取得
   cat "${THREADS_DIR}/M001_xxx/original.json"

   # メール送信（スレッドに返信）
   gws gmail users messages send --params '{"userId": "me", "threadId": "THREAD_ID"}' --json '{
     "raw": "BASE64_ENCODED_REPLY"
   }'
   ```

2. **ラベル適用**
   ```bash
   cat "${THREADS_DIR}/M001_xxx/label_proposal.json"
   gws gmail users messages modify --params '{"userId": "me", "id": "MESSAGE_ID"}' --json '{
     "addLabelIds": ["LABEL_ID"],
     "removeLabelIds": ["INBOX"]
   }'
   ```

3. **trash_request がある場合はゴミ箱へ**
   ```bash
   gws gmail users messages trash --params '{"userId": "me", "id": "MESSAGE_ID"}'
   ```

4. **Discordに完了通知**
   - 対応するスレッドに「✅ 送信完了 + ラベル適用」を投稿

5. **ステータス更新 & アーカイブ**
   ```bash
   # status.json を "sent" に更新
   # フォルダを processed/ に移動
   mv "${THREADS_DIR}/M001_xxx" "${PROCESSED_DIR}/"
   ```

#### status: "needs_revision"（修正待ち）

1. **修正指示を読み取り**
   ```bash
   cat "${THREADS_DIR}/M001_xxx/instructions.md"
   ```

2. **reply-learnings.json に学習内容を追記**
   ```bash
   # 新しいルールを追加
   # ID: L00X（次の連番）
   # category: 修正指示の内容に応じて
   # rule: 一般化したルール
   # lesson_learned: 元の修正指示
   ```

3. **draft.md を再生成**
   - 修正指示を反映した新しい返信案を作成
   - original.json の元メール情報を参照

4. **Discordスレッドに修正版を投稿**
   ```
   🔄 修正版を作成しました:

   ─────────────────────────────────
   （修正後の返信案）
   ─────────────────────────────────

   👉 返信してください:
     • 「OK」→ この内容で送信
     • 「修正：〇〇」→ さらに修正
   ```

5. **ステータスを "pending" に戻す**

#### status: "skipped"（スキップ）

1. フォルダを processed/ に移動
2. メールは受信トレイに残す

#### status: "hold"（保留）

1. 何もしない（次回以降に処理）

#### status: "pending"（待機中）

1. 何もしない（ユーザーの返信待ち）

---

## Phase 2: 新着メール処理

### 2.1 新着メールの取得

```bash
# 受信トレイの未読メールのみを検索（プロモーション・ソーシャル・保留を除外）
gws gmail users messages list --params '{"userId": "me", "q": "in:inbox is:unread -label:_hold/today -label:_auto-mail-processed -category:promotions -category:social", "maxResults": 10}'
```

**重要: `/auto-reply-mail` は未読メールのみが対象**
- `is:unread` を指定して未読メールのみを取得
- 既読メールは処理対象外（手動で `/reply-mail` を使用）
- これにより、既に確認済みのメールが重複して通知されることを防ぐ

**`_auto-mail-processed` ラベルについて:**
- Discord連携で処理中のメールに付与するラベル
- このラベルがあるメールは再度取得されない
- 送信完了時に除去される

### 2.2 各メールの処理

既存の `/reply-mail` と同じ分類ロジックを使用:
- ✅ 今すぐ返信: 顧客問い合わせ、日程調整
- ⏸️ 保留: ビジネス提案、要調査案件
- ❌ 返信不要: 自動通知、広告、メルマガ

### 2.3 メールごとにGoogle Driveフォルダを作成

```bash
# フォルダ名: M{連番}_{送信者名}_{件名の一部}
mkdir -p "${THREADS_DIR}/M002_田中様_AI経営講座"
```

作成するファイル:

**status.json:**
```json
{
  "status": "pending",
  "created_at": "2026-03-16T14:30:00+09:00",
  "mail_id": "MESSAGE_ID",
  "thread_id": "THREAD_ID",
  "discord_thread_id": null,
  "classification": "reply_needed"
}
```

**original.json:**
```json
{
  "message_id": "MESSAGE_ID",
  "thread_id": "THREAD_ID",
  "from": "tanaka@example.com",
  "from_name": "田中太郎",
  "to": "ryouchiku@life-time-support.com",
  "subject": "AI経営講座について",
  "date": "2026-03-16T14:30:00+09:00",
  "body_text": "本文...",
  "body_html": "<html>..."
}
```

**draft.md:**
```markdown
田中様

お問い合わせいただきありがとうございます。
AI経営講座について、ご説明させていただきます。
...

龍竹一生
```

**label_proposal.json:**
```json
{
  "label": "IT事業",
  "label_id": "LABEL_ID",
  "reason": "AI経営講座に関する問い合わせ"
}
```

### 2.4 処理中ラベルを付与

```bash
# _auto-mail-processed ラベルを付与（重複処理防止）
gws gmail users messages modify --params '{"userId": "me", "id": "MESSAGE_ID"}' --json '{
  "addLabelIds": ["AUTO_MAIL_PROCESSED_LABEL_ID"]
}'
```

### 2.5 Discordに通知

**メインチャンネルに投稿（スレッド作成トリガー）:**

```
🔔 新着メール [M002]
From: tanaka@example.com
Subject: AI経営講座について
受信: 2026-03-16 14:30
```

**スレッドを作成して詳細を投稿:**

スレッド名: `M002_田中様_AI経営講座`

```
📊 分類: ✅ 要返信（顧客問い合わせ）

🏷️ ラベル提案: IT事業

📝 返信案:
─────────────────────────────────
田中様

お問い合わせいただきありがとうございます。
AI経営講座について、ご説明させていただきます。
...

龍竹一生
─────────────────────────────────

👉 返信してください:
  • 「OK」→ この内容で送信
  • 「ラベル:〇〇」→ ラベルを変更
  • 「修正：〇〇」→ 修正指示
  • 「スキップ」→ このメールは処理しない
  • 「削除」→ ゴミ箱に移動
  • 「保留」→ 後で対応
```

**status.json にDiscordスレッドIDを保存:**
```json
{
  "discord_thread_id": "THREAD_ID"
}
```

### 2.6 返信不要メールの処理

返信不要と分類されたメールは:
1. ラベル提案を含めてDiscordに通知
2. ユーザーが「OK」で承認するまで待機
3. 承認後にラベル適用＆受信トレイから除外

---

## Phase 3: サマリー通知

### 3.1 未処理スレッドの集計

```bash
# threads/ 内のフォルダを確認
for dir in "${THREADS_DIR}"/*; do
  cat "$dir/status.json"
done
```

### 3.2 サマリーを投稿（未処理がある場合のみ）

```
📊 メール処理サマリー（2026-03-16 15:00）

⏳ 承認待ち: 3件
  • M001_田中様_AI経営講座
  • M002_鈴木様_見積もり依頼
  • M003_山田様_日程調整

🔄 修正待ち: 1件
  • M004_佐藤様_協業提案

✅ 処理完了: 2件（今回）

💡 Discordスレッドで返信してください
```

---

## ナレッジ蓄積

### 修正指示からの学習

ユーザーが「修正：〇〇」と指示した場合、`reply-learnings.json` に新規ルールを追加:

```json
{
  "id": "L005",
  "category": "文体",
  "rule": "返信文はフランクな文体で作成する",
  "detail": "「〜いただけますでしょうか」より「〜お願いします」のようなシンプルな表現を使用",
  "added": "2026-03-16",
  "trigger": ["すべて"],
  "lesson_learned": "ユーザーからの修正指示: もっとフランクな文体にして"
}
```

### ラベル変更からの学習

ユーザーが「ラベル:〇〇」と指示した場合、`label-history.json` に送信者とラベルの紐付けを保存。

---

## 並行運用

| コマンド | 用途 | Discord連携 |
|---------|------|-------------|
| `/reply-mail` | ターミナルで直接メール処理 | なし（従来通り） |
| `/auto-reply-mail` | Discord連携の自動処理 | あり |

両コマンドは**同じナレッジファイルを共有**:
- `reply-learnings.json`
- `label-rules.json`
- `label-history.json`

---

## Discord Bot について

Discord Botは別プロセスで常駐し、ユーザーの返信をGoogle Driveに保存する:

- `scripts/discord-bot.js` — 常駐スクリプト
- `npm run discord-bot` — 起動コマンド

Bot は以下の指示を認識:
- 「OK」→ status を "approved" に
- 「ラベル:〇〇」→ label_proposal を更新 + "approved"
- 「修正：〇〇」→ instructions.md を保存 + "needs_revision"
- 「スキップ」→ status を "skipped" に
- 「削除」→ trash_request フラグ + "approved"
- 「保留」→ status を "hold" に

---

## エラー処理

### Gmail APIエラー
```bash
gws auth status
```
認証が切れている場合は `gws auth login` を実行。

### Google Drive同期エラー
- フォルダが見つからない場合は再作成
- ファイル競合の場合は最新を優先

### Discord APIエラー
- Bot Tokenの有効性を確認
- チャンネルIDの正確性を確認

---

## ログ出力

すべての処理は以下にログ出力:
```
/Users/kazui/scripts/ai-employee/k.ryochiku/logs/auto-mail.log
```

ログフォーマット:
```
[2026-03-16 15:00:00] Phase 1: 指示処理開始
[2026-03-16 15:00:01] M001: status=approved → メール送信
[2026-03-16 15:00:05] M001: 送信完了、ラベル適用
[2026-03-16 15:00:10] Phase 2: 新着メール処理開始
[2026-03-16 15:00:15] 新着メール: 3件取得
...
```
