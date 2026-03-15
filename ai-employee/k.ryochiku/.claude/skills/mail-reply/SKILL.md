# メール返信スキル

未返信メールに対してAIが返信文を作成し、オーナー承認後に送信。
送信後は適切なラベルに振り分けて受信トレイを整理します。

## 基本情報

| 項目 | 値 |
|------|-----|
| 対象アカウント | ryouchiku@life-time-support.com |
| 返信対象 | 全種類（問い合わせ / 既存顧客 / 見積・請求） |
| 送信方式 | AI作成 → オーナー承認 → 自動送信 |
| 参照情報源 | メールスレッド + lts-sales-crm + philosophy.md |

---

## 基本思考の反映ルール

### 参照ファイル

```
/Users/kazui/scripts/ai-employee/_shared/philosophy.md
```

### 反映方法

| カテゴリ | 反映対象 |
|---------|---------|
| 顧客価値の定義 | 提案内容の軸、価値の伝え方 |
| 意思決定基準 | 回答の判断、優先順位の付け方 |
| 技術観 | IT/AI関連の説明スタンス |
| ビジョン | 会社としての方向性の伝え方 |

### 反映しないこと

- **文体**: ビジネスメールの敬語は維持
- **表現**: 「IT音痴」などの口語表現は使わない
- **長文化**: 基本思考を説明的に書かない

### 反映例

**philosophy.md:**
```
顧客価値の定義: 自走できる組織を作る
意思決定基準: 将来の自走を見据えて提案
```

**NG（文体に反映）:**
```
貴社が自走できる組織になれるよう、伴走型でサポートします！
```

**OK（考え方に反映）:**
```
今回の導入後は、御社だけで運用・改善いただける形で
ご提案させていただきます。
```

---

## 返信文生成ルール

### トーンガイドライン

| 顧客フェーズ | トーン |
|-------------|-------|
| リード（初回問い合わせ） | 丁寧・歓迎・ヒアリング重視 |
| ヒアリング中 | 傾聴・確認・整理 |
| 提案中 | 具体的・メリット明示・次ステップ明確 |
| 商談中 | 柔軟・迅速・条件調整 |
| 既存顧客 | 親しみやすさ・感謝・継続サポート |

### 署名テンプレート

```
龍竹一生（りょうちく かずい）
株式会社ライフタイムサポート
TEL: 070-1298-0180
Email: ryouchiku@life-time-support.com
```

### 文字数目安

- 初回返信: 200〜400文字
- フォローアップ: 150〜300文字
- 簡単な確認: 100〜200文字

---

## ラベル振り分けルール

### 学習データ

```
/Users/kazui/scripts/ai-employee/k.ryochiku/.claude/data/label-history.json
```

### データ構造

```json
{
  "tanaka@example.com": {
    "label": "研修関係/AI経営講座",
    "labelId": "Label_1624214853273048516",
    "lastUsed": "2026-03-14",
    "count": 5
  }
}
```

### 振り分けロジック

1. **学習履歴を検索** — 送信者アドレスで過去のラベルを確認
2. **履歴あり** → 過去のラベルを第一候補として提案
3. **履歴なし** → メール内容（件名・本文）を分析して提案
4. **確定後** → 学習履歴を更新

### 分析時のキーワードマッピング

| キーワード | 提案ラベル |
|-----------|-----------|
| 経営講座, AI講座, セミナー | 研修関係/AI経営講座 |
| 日創研, 田舞塾, 業績アップ | 研修関係/日創研 |
| 42tokyo, フォーティーツー | 研修関係/42tokyo |
| 見積, 請求, 契約, 発注 | IT事業 |
| 助成金, 補助金, 人材開発 | 補助金/助成金 |
| Google, Workspace, GWS | システム関連/Google Workspace |
| チャットボット, LINE, 自動応答 | システム関連/チャットBOT |
| 採用, 求人, 面接 | 採用 |

---

## CRM連携

### 検索

```bash
node /Users/kazui/scripts/ai-employee/k.ryochiku/scripts/crm-lookup.js \
  --email="送信者メールアドレス"
```

### 取得情報

- `name`: 顧客名
- `company`: 会社名
- `salesPhase`: 現在のフェーズ（LEAD, INTERESTED, APPOINTMENT, etc.）
- `exchanges`: 過去のやり取り履歴
- `servicePhases`: サービス別フェーズ
- `notes`: メモ

### 記録

```bash
node /Users/kazui/scripts/ai-employee/k.ryochiku/scripts/crm-lookup.js \
  --record \
  --email="送信者メールアドレス" \
  --action="メール返信" \
  --summary="返信内容の要約"
```

---

## Gmail API操作

### メール一覧取得

```bash
gws gmail users messages list --params '{
  "userId": "me",
  "q": "in:inbox is:unread",
  "maxResults": 10
}'
```

### メール本文取得

```bash
gws gmail users messages get --params '{
  "userId": "me",
  "id": "MESSAGE_ID",
  "format": "full"
}'
```

### スレッド取得

```bash
gws gmail users threads get --params '{
  "userId": "me",
  "id": "THREAD_ID"
}'
```

### メール送信（返信）

```bash
gws gmail users messages send --params '{
  "userId": "me"
}' --body '{
  "raw": "BASE64_ENCODED_EMAIL",
  "threadId": "THREAD_ID"
}'
```

### ラベル操作

```bash
# ラベル一覧取得
gws gmail users labels list --params '{"userId": "me"}'

# ラベル付与 + INBOX解除
gws gmail users messages modify --params '{
  "userId": "me",
  "id": "MESSAGE_ID"
}' --body '{
  "addLabelIds": ["LABEL_ID"],
  "removeLabelIds": ["INBOX"]
}'
```

---

## エラーハンドリング

| エラー | 対応 |
|-------|------|
| Gmail認証エラー | `gws auth status` で確認、`gws auth login` で再認証 |
| CRM接続エラー | `lts-sales-crm/.env` の DATABASE_URL を確認 |
| ラベルID不明 | `gws gmail users labels list` でIDを確認 |
| 送信失敗 | エラー内容を表示し、手動送信を案内 |

---

## 処理フロー図

```
┌─────────────────┐
│  /reply-mail    │
└────────┬────────┘
         ▼
┌─────────────────┐
│ philosophy.md   │──── 基本思考を読み込み
│ を読み込み      │
└────────┬────────┘
         ▼
┌─────────────────┐
│ 未返信メール    │──── Gmail API で取得
│ を取得          │
└────────┬────────┘
         ▼
┌─────────────────┐
│ 顧客情報照合    │──── lts-sales-crm で検索
│ (CRM)           │
└────────┬────────┘
         ▼
┌─────────────────┐
│ 返信文生成      │──── 基本思考 + CRM + スレッド
│                 │     文体はビジネスメール維持
└────────┬────────┘
         ▼
┌─────────────────┐
│ オーナー確認    │──── 送信 / 編集 / スキップ
└────────┬────────┘
         ▼
┌─────────────────┐
│ 送信実行        │──── Gmail API で送信
│ + CRM記録       │
└────────┬────────┘
         ▼
┌─────────────────┐
│ ラベル振り分け  │──── 学習履歴 or AI分析
│                 │     OK / 変更する / 残す
└────────┬────────┘
         ▼
┌─────────────────┐
│ 学習履歴更新    │──── label-history.json
└────────┬────────┘
         ▼
┌─────────────────┐
│ 完了報告        │
└─────────────────┘
```
