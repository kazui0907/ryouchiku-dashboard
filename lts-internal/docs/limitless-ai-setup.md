# Limitless AI ログと経営思想抽出システムのセットアップガイド

このガイドでは、Limitless AI のログから経営思想を自動抽出するシステムの設定方法を説明します。

---

## 📋 前提条件

- Python 3.8 以上がインストールされていること
- Google Gemini API キー（推奨）または Claude API キー（Anthropic）を取得済みであること
- Limitless AI デバイスからログをエクスポートできること

---

## 🚀 初期セットアップ

### 1. リポジトリのクローン

```bash
git clone [リポジトリURL]
cd ryouchiku-systems
```

### 2. Python環境のセットアップ

```bash
cd scripts/philosophy-updater
pip install -r requirements.txt
```

または仮想環境を使う場合：

```bash
cd scripts/philosophy-updater
python -m venv venv
source venv/bin/activate  # Windowsの場合: venv\Scripts\activate
pip install -r requirements.txt
```

### 3. 環境変数の設定

`.env.example` をコピーして `.env` を作成：

```bash
cp .env.example .env
```

`.env` を編集して Gemini API キーを設定：

```bash
# デフォルト: Gemini（コスパ重視）
AI_PROVIDER=gemini
GOOGLE_API_KEY=AIzaSy-xxxxxxxxxxxxx
GEMINI_MODEL=gemini-2.5-flash-002

# オプション: Claude（高品質）
# AI_PROVIDER=claude
# ANTHROPIC_API_KEY=sk-ant-api03-xxxxx

WATCH_INTERVAL=60
AUTO_UPDATE=true
```

**APIキーの取得方法:**

- **Gemini API**: https://aistudio.google.com/apikey にアクセスして「Create API key」をクリック
- **Claude API**: https://console.anthropic.com/ にアクセスして「API Keys」から作成

---

## 📥 Limitless AI ログのエクスポート

### Limitless AI からのエクスポート手順

1. Limitless AI アプリを開く
2. 設定 > データエクスポート を選択
3. エクスポート形式を「テキスト」または「Markdown」に設定
4. エクスポート期間を選択（例：過去1週間、過去1ヶ月）
5. エクスポート実行

### エクスポートしたファイルの配置

エクスポートされたファイルを `.limitless/raw-logs/` に配置：

```bash
# 例：ダウンロードフォルダから移動
cp ~/Downloads/limitless-export-2026-03-04.txt .limitless/raw-logs/
```

または、Limitless AI の自動エクスポート先を `.limitless/raw-logs/` に設定することも可能です。

---

## 🔄 思想抽出の実行

### パターン1: 手動実行

ログファイルを配置した後、手動で実行：

```bash
cd scripts/philosophy-updater
python extract_philosophy.py
```

実行結果：
- `.limitless/philosophy-extract/philosophy_YYYYMMDD_HHMMSS.md` に抽出結果が保存
- `CLAUDE.md` の経営理念セクションが自動更新

### パターン2: 自動監視（推奨）

ログフォルダを常時監視し、ファイルが追加・更新されたら自動実行：

```bash
cd scripts/philosophy-updater
python auto_watch.py
```

**バックグラウンドで実行する場合（macOS/Linux）：**

```bash
nohup python auto_watch.py > logs/auto_watch.log 2>&1 &
```

**停止する場合：**

```bash
# フォアグラウンド実行の場合
Ctrl + C

# バックグラウンド実行の場合
ps aux | grep auto_watch.py
kill [プロセスID]
```

---

## 📊 動作確認

### 1. ログファイルの確認

```bash
ls -l .limitless/raw-logs/
```

ファイルが存在することを確認します。

### 2. 手動実行でテスト

```bash
cd scripts/philosophy-updater
python extract_philosophy.py
```

以下のような出力が表示されれば成功：

```
============================================================
  Limitless AI → 経営思想抽出システム
============================================================

✓ 読み込み: limitless-export-2026-03-04.txt (12345 文字)

📄 合計 1 ファイル読み込み完了

🤖 AI分析を開始...
✓ AI分析完了

💾 思想データを保存: philosophy_20260304_120000.md
✓ CLAUDE.md を更新しました

============================================================
  ✅ 処理完了
============================================================
```

### 3. CLAUDE.md の確認

```bash
head -50 CLAUDE.md
```

「## 🎯 経営理念・事業方針（最上位概念）」セクションに思想が抽出されていることを確認します。

---

## 🛠️ トラブルシューティング

### エラー: `GOOGLE_API_KEY not found` / `ANTHROPIC_API_KEY not found`

**原因**: `.env` ファイルに API キーが設定されていない

**解決方法**:
1. `.env` ファイルが存在するか確認: `ls -la .env`
2. `.env` ファイルを開いて `AI_PROVIDER` に対応する API キーが設定されているか確認
   - `AI_PROVIDER=gemini` の場合: `GOOGLE_API_KEY` が必要
   - `AI_PROVIDER=claude` の場合: `ANTHROPIC_API_KEY` が必要
3. API キーが正しいか確認（各コンソールで確認）

### エラー: `No module named 'anthropic'`

**原因**: Python パッケージがインストールされていない

**解決方法**:
```bash
pip install -r requirements.txt
```

### ログファイルが検出されない

**原因**: ファイルが正しい場所に配置されていない

**解決方法**:
1. `.limitless/raw-logs/` ディレクトリが存在するか確認
   ```bash
   ls -la .limitless/raw-logs/
   ```
2. ファイルが配置されているか確認
3. ファイル名が `.` で始まっていないか確認（隠しファイルは無視されます）

### AI分析がうまくいかない

**原因**: ログデータが少ない、または思想に関する内容が含まれていない

**解決方法**:
1. より長期間のログをエクスポート
2. 事業や経営に関する会話が含まれているか確認
3. `.limitless/philosophy-extract/` の最新ファイルを確認して、AI の出力を確認

---

## 🔄 定期実行の設定（オプション）

### macOS/Linux: cron で定期実行

1. crontab を編集：
   ```bash
   crontab -e
   ```

2. 以下を追加（毎日午前9時に実行）：
   ```cron
   0 9 * * * cd /Users/kazui/Documents/ryouchiku-systems/scripts/philosophy-updater && /usr/bin/python3 extract_philosophy.py >> /tmp/philosophy_extract.log 2>&1
   ```

### systemd でサービス化（Linux）

1. サービスファイルを作成：
   ```bash
   sudo nano /etc/systemd/system/philosophy-watcher.service
   ```

2. 以下を記述：
   ```ini
   [Unit]
   Description=Limitless AI Philosophy Extraction Watcher
   After=network.target

   [Service]
   Type=simple
   User=kazui
   WorkingDirectory=/Users/kazui/Documents/ryouchiku-systems/scripts/philosophy-updater
   ExecStart=/usr/bin/python3 auto_watch.py
   Restart=always

   [Install]
   WantedBy=multi-user.target
   ```

3. サービスを有効化：
   ```bash
   sudo systemctl enable philosophy-watcher
   sudo systemctl start philosophy-watcher
   ```

---

## 📚 関連ドキュメント

- [Limitless AI ログディレクトリの README](.limitless/README.md)
- [思想抽出スクリプトの README](scripts/philosophy-updater/README.md)
- [CLAUDE.md](CLAUDE.md) - システム全体のルールブック

---

## 💡 ベストプラクティス

1. **定期的なログのエクスポート**
   - 週に1回程度、Limitless AI からログをエクスポート
   - 自動監視を有効にしておく

2. **抽出結果のレビュー**
   - 月に1回、`.limitless/philosophy-extract/` の最新ファイルを確認
   - 不要な内容が含まれていないかチェック

3. **CLAUDE.md の手動調整**
   - AI が抽出した思想を、必要に応じて手動で調整・整理
   - より明確な表現に書き換える

4. **バックアップ**
   - `.limitless/philosophy-extract/` は Git にコミットしない設定
   - 重要な抽出結果は別途バックアップを推奨

---

**作成日**: 2026-03-04
**最終更新**: 2026-03-04
**管理者**: 龍竹一生
