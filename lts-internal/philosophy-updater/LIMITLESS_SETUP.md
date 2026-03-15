# Limitless AI 自動取得セットアップガイド

Limitless AI APIを使った週次自動取得システムの完全ガイドです。

---

## ✅ セットアップ完了状況

- [x] APIキー設定済み
- [ ] 依存関係インストール
- [ ] 初回実行（過去3ヶ月分）
- [ ] cron設定（週次自動実行）
- [ ] 動作確認

---

## 🚀 クイックスタート

### 1. 依存関係のインストール

```bash
cd scripts/philosophy-updater
pip install -r requirements.txt
```

### 2. 初回実行（過去3ヶ月分のデータ取得）

```bash
./fetch_initial_3months.sh
```

または手動で：

```bash
python fetch_limitless_logs.py --days 90
```

### 3. cron設定（週次自動実行）

```bash
./setup_cron.sh
```

これで**毎週日曜 9:00に自動実行**されます。

---

## 📁 3ヶ月分のデータの配置場所

### API経由で自動取得する場合（推奨）

上記の「初回実行」を実行すれば、自動的に以下に保存されます：

```
.limitless/raw-logs/limitless_YYYYMMDD_to_YYYYMMDD.txt
```

### 手動でエクスポートしたファイルがある場合

すでにLimitless AIから手動でエクスポートしたファイルがある場合は、以下に配置してください：

```bash
# 配置先ディレクトリ
cd /Users/kazui/Documents/ryouchiku-systems/.limitless/raw-logs/

# ファイルをコピー
cp ~/Downloads/limitless-export-*.txt .
```

**対応ファイル形式:**
- `.txt` - テキストファイル
- `.md` - Markdownファイル
- `.json` - JSONファイル

**複数ファイルがある場合:**

全て `.limitless/raw-logs/` に配置してください。自動的に全ファイルを読み込みます：

```bash
# 例：複数ファイルを一括コピー
cp ~/Downloads/limitless-2025-*.txt .limitless/raw-logs/
cp ~/Downloads/limitless-2026-*.txt .limitless/raw-logs/
```

---

## 🔄 完全自動化フロー

設定完了後の動作：

```
毎週日曜 9:00
  ↓
【1】Limitless AI APIからログ取得
  → .limitless/raw-logs/ に保存
  ↓
【2】auto_watch.py が変更検知（または 9:10に自動実行）
  ↓
【3】Gemini で経営思想を抽出
  ↓
【4】CLAUDE.md を自動更新
```

---

## 📝 手動実行コマンド

### 過去7日間のログを取得（週次実行用）

```bash
cd scripts/philosophy-updater
python fetch_limitless_logs.py
```

### 過去3ヶ月のログを取得

```bash
python fetch_limitless_logs.py --days 90
```

### カスタム期間を指定

```bash
python fetch_limitless_logs.py --start-date 2025-12-01 --end-date 2026-03-04
```

### 経営思想の抽出

```bash
python extract_philosophy.py
```

---

## 🛠️ トラブルシューティング

### エラー: `LIMITLESS_API_KEY not found`

**.env を確認:**

```bash
cat .env | grep LIMITLESS_API_KEY
```

設定されていない場合は追加：

```bash
echo "LIMITLESS_API_KEY=sk-83c082a6-1383-4dea-951c-a22434423434" >> .env
```

### エラー: `404 Not Found` または `Endpoint not found`

**APIエンドポイントが正しくない可能性があります。**

1. Limitless AIの公式ドキュメントでAPIエンドポイントを確認
2. `.env` に正しいエンドポイントを設定：

```bash
# .env に追加
LIMITLESS_API_ENDPOINT=https://api.limitless.ai/v1/YOUR_CORRECT_ENDPOINT
```

3. `fetch_limitless_logs.py` の 24行目を編集：

```python
LIMITLESS_API_ENDPOINT = os.getenv('LIMITLESS_API_ENDPOINT', 'https://api.limitless.ai/v1/transcripts')
```

### エラー: `401 Unauthorized`

APIキーが無効です。Limitless AIのダッシュボードで新しいAPIキーを発行してください。

### データが取得できているか確認

```bash
# 取得したファイルを確認
ls -lh ../../.limitless/raw-logs/

# ファイルの中身を確認
head -20 ../../.limitless/raw-logs/limitless_*.txt
```

---

## 🔍 ログ確認

### 自動取得のログ

```bash
tail -f ../../.limitless/logs/fetch.log
```

### 思想抽出のログ

```bash
tail -f ../../.limitless/logs/extract.log
```

### cron実行状況の確認

```bash
# cronの設定を確認
crontab -l

# システムログを確認（macOS）
log show --predicate 'process == "cron"' --last 1h
```

---

## ⚙️ 設定ファイル

### .env

```bash
# Limitless AI API設定
LIMITLESS_API_KEY=sk-83c082a6-1383-4dea-951c-a22434423434

# AI API設定（経営思想抽出用）
AI_PROVIDER=gemini
GOOGLE_API_KEY=AIzaSyCUXoWBQVWNTNcKdkUMG7a2lizn9M4sqVc
GEMINI_MODEL=gemini-2.5-flash-002
```

---

## 📊 動作確認手順

### ステップ1: 手動でログ取得

```bash
cd scripts/philosophy-updater
python fetch_limitless_logs.py --days 7
```

成功すれば `.limitless/raw-logs/` にファイルが作成されます。

### ステップ2: 手動で思想抽出

```bash
python extract_philosophy.py
```

成功すれば `CLAUDE.md` の経営理念セクションが更新されます。

### ステップ3: 更新を確認

```bash
head -80 ../../CLAUDE.md
```

「## 🎯 経営理念・事業方針（最上位概念）」セクションに思想が抽出されていれば成功。

### ステップ4: cron設定

```bash
./setup_cron.sh
```

### ステップ5: cron動作確認（次の日曜まで待つ）

次の日曜日 9:00以降にログを確認：

```bash
tail -f ../../.limitless/logs/fetch.log
tail -f ../../.limitless/logs/extract.log
```

---

## 🎯 次のステップ

1. **初回実行**を完了する
   ```bash
   ./fetch_initial_3months.sh
   ```

2. **cron設定**を完了する
   ```bash
   ./setup_cron.sh
   ```

3. **動作確認**をする
   - 手動実行でテスト
   - ログファイルの確認
   - CLAUDE.mdの更新確認

4. **完全自動化**の完成
   - 毎週自動でログ取得
   - 毎週自動で思想抽出
   - CLAUDE.mdが常に最新

---

## 💡 Tips

### ファイル監視を常時起動

cron設定の代わりに、ファイル監視を常時起動することもできます：

```bash
# バックグラウンドで起動
cd scripts/philosophy-updater
nohup python auto_watch.py > ../../.limitless/logs/auto_watch.log 2>&1 &

# プロセス確認
ps aux | grep auto_watch.py

# 停止
pkill -f auto_watch.py
```

この場合、ログが保存されると即座に思想抽出が実行されます。

---

**作成日**: 2026-03-04
**管理者**: 龍竹一生
