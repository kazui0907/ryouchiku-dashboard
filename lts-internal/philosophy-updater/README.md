# 経営思想自動抽出システム

Limitless AI のログから龍竹一生の経営思想・理念を自動抽出し、CLAUDE.md に反映するシステムです。

## 🎯 自動化の全体像

```
Limitless AI
  ↓ API（週次自動取得）
.limitless/raw-logs/
  ↓ Gemini 分析
経営思想抽出
  ↓ 自動更新
CLAUDE.md
```

**完全自動化**: 週に1回、何もしなくてもシステム全体が最新の経営思想で更新されます。

## 🚀 クイックスタート（Limitless AI自動取得）

**APIキーが設定済みの場合:**

### 1. 依存関係のインストール

```bash
cd scripts/philosophy-updater
pip install -r requirements.txt
```

### 2. 初回実行（過去3ヶ月分）

```bash
./fetch_initial_3months.sh
```

### 3. 週次自動実行の設定

```bash
./setup_cron.sh
```

これで**完全自動化**が完成します。詳細は [LIMITLESS_SETUP.md](LIMITLESS_SETUP.md) を参照。

---

## 🛠️ 従来のセットアップ（手動ログ配置）

### 1. 依存関係のインストール

```bash
cd scripts/philosophy-updater
pip install -r requirements.txt
```

### 2. 環境変数の設定

`.env.example` をコピーして `.env` を作成：

```bash
cp .env.example .env
```

`.env` を編集して、Gemini API キーを設定：

```bash
# デフォルト: Gemini（コスパ重視）
AI_PROVIDER=gemini
GOOGLE_API_KEY=AIzaSy-xxxxxxxxxxxxx
GEMINI_MODEL=gemini-2.5-flash-002

# オプション: Claude（高品質）
# AI_PROVIDER=claude
# ANTHROPIC_API_KEY=sk-ant-api03-xxxxx
# CLAUDE_MODEL=claude-sonnet-4-20250514
```

## 📝 使用方法

### パターン1: 手動実行

Limitless AI のログを `.limitless/raw-logs/` に配置してから実行：

```bash
python extract_philosophy.py
```

### パターン2: 自動監視（推奨）

ログフォルダを監視し、ファイルが追加・更新されたら自動で思想を抽出：

```bash
python auto_watch.py
```

停止する場合は `Ctrl+C`

## 📁 ファイル構成

```
scripts/philosophy-updater/
├── extract_philosophy.py   # メイン処理（思想抽出）
├── auto_watch.py           # ファイル監視・自動実行
├── requirements.txt        # Python依存関係
├── .env.example            # 環境変数サンプル
├── .env                    # 環境変数（Git管理外）
└── README.md               # このファイル
```

## 🤖 AIプロバイダーの選択

このシステムは**Gemini**と**Claude**の両方に対応しています。

### Gemini 2.5 Flash（デフォルト・推奨）

**メリット:**
- コスパ優秀（Claudeの約1/10のコスト）
- 高速なレスポンス
- 日本語処理に強い
- 定期実行に最適

**設定方法:**
```bash
AI_PROVIDER=gemini
GOOGLE_API_KEY=your_api_key_here
GEMINI_MODEL=gemini-2.5-flash-002
```

### Claude Sonnet（オプション・高品質）

**メリット:**
- より深い思想抽出
- 複雑な哲学的思考の理解
- 構造化出力の安定性

**設定方法:**
```bash
AI_PROVIDER=claude
ANTHROPIC_API_KEY=your_api_key_here
CLAUDE_MODEL=claude-sonnet-4-20250514
```

### 推奨設定

- **日常的な抽出**: Gemini 2.5 Flash（コスパ重視）
- **重要な決定前**: Claude Sonnet（品質重視）
- **両方試す**: 環境変数 `AI_PROVIDER` を切り替えて比較

## 🔄 処理フロー

```
Limitless AI
    ↓
.limitless/raw-logs/  ← ログファイル配置
    ↓
auto_watch.py (監視) または extract_philosophy.py (手動)
    ↓
Claude API で分析
    ↓
.limitless/philosophy-extract/philosophy_YYYYMMDD_HHMMSS.md
    ↓
CLAUDE.md の経営理念セクションを更新
```

## 📊 抽出される思想カテゴリ

1. **ビジョン・ミッション**: 何を目指しているのか
2. **事業方針・戦略**: 各事業の位置づけ
3. **顧客価値の定義**: 顧客に提供する価値
4. **意思決定基準**: 判断の軸
5. **組織文化・価値観**: チーム・組織の作り方
6. **技術・システムに対する考え方**: IT/AI の活用方針

## ⚙️ 設定のカスタマイズ

`.env` ファイルで以下を調整できます：

```bash
# Claude API設定
ANTHROPIC_API_KEY=sk-ant-api03-xxxxx

# ファイル監視設定
WATCH_INTERVAL=60  # 変更検知後の実行間隔（秒）

# パス設定（通常は変更不要）
RAW_LOGS_DIR=../../.limitless/raw-logs
PHILOSOPHY_EXTRACT_DIR=../../.limitless/philosophy-extract
CLAUDE_MD_PATH=../../CLAUDE.md
```

## 🔐 セキュリティ

- `.env` ファイルは `.gitignore` で除外されています
- Limitless AI のログ（個人的な会話）は Git にコミットされません
- 抽出された「思想」のみが CLAUDE.md に反映されます

## 🐛 トラブルシューティング

### エラー: `GOOGLE_API_KEY not found` / `ANTHROPIC_API_KEY not found`

→ `.env` ファイルに API キーが設定されているか確認
→ `AI_PROVIDER` の値（gemini または claude）に対応する API キーが設定されているか確認

### エラー: `No module named 'anthropic'`

→ 依存関係をインストール: `pip install -r requirements.txt`

### ログが検出されない

→ `.limitless/raw-logs/` にファイルが配置されているか確認

---

**作成日**: 2026-03-04
**管理者**: 龍竹一生
