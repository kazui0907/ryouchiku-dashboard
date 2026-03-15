# Limitless AI ログの自動取得ガイド

週に1回、Limitless AIからログを自動取得する方法をまとめました。

---

## 🎯 目標

Limitless AIのログを週次で自動的に `.limitless/raw-logs/` に保存し、経営思想抽出システムが自動実行できるようにする。

---

## 📋 方法の選択フローチャート

```
Limitless AIに自動エクスポート機能がある？
  ├─ YES → 【方法1】組み込み機能を使う（最も簡単）
  └─ NO → Limitless AIにAPIがある？
      ├─ YES → 【方法2】APIで自動取得（推奨）
      └─ NO → 手動エクスポート + 自動化
          ├─ 【方法3】macOSショートカット（GUI自動化）
          ├─ 【方法4】AppleScript（macOS）
          └─ 【方法5】Selenium（ブラウザ自動化）
```

---

## 方法1: Limitless AI の組み込み機能（推奨・確認必要）

### 確認手順

1. Limitless AIアプリを開く
2. 設定（Settings）→ データエクスポート（Data Export）
3. 以下の機能があるか確認：
   - **自動エクスポート**の設定
   - **定期実行**（Weekly、Daily等）
   - **エクスポート先フォルダ**の指定

### 設定方法（機能がある場合）

```
エクスポート先: /Users/kazui/Documents/ryouchiku-systems/.limitless/raw-logs
頻度: 週次（毎週日曜 9:00など）
フォーマット: テキスト または Markdown
```

**これができれば完了！** 他の方法は不要です。

---

## 方法2: Limitless AI API（推奨・APIがある場合）

### API の確認

1. Limitless AIの公式ドキュメントを確認
   - https://limitless.ai/docs
   - https://app.limitless.ai/settings/api

2. APIキーの取得

3. 以下のスクリプトを作成・実行

```python
#!/usr/bin/env python3
# scripts/philosophy-updater/limitless_api_fetch.py

import os
import requests
from datetime import datetime, timedelta
from pathlib import Path

API_KEY = os.getenv("LIMITLESS_API_KEY")
API_URL = "https://api.limitless.ai/v1/logs"  # 実際のエンドポイント
OUTPUT_DIR = Path(__file__).parent / "../../.limitless/raw-logs"

def fetch_logs():
    """過去7日間のログを取得"""
    end_date = datetime.now()
    start_date = end_date - timedelta(days=7)

    response = requests.get(
        API_URL,
        headers={"Authorization": f"Bearer {API_KEY}"},
        params={
            "start_date": start_date.isoformat(),
            "end_date": end_date.isoformat()
        }
    )

    if response.status_code == 200:
        # ログを保存
        filename = f"limitless_{datetime.now().strftime('%Y%m%d')}.txt"
        output_path = OUTPUT_DIR / filename

        with open(output_path, 'w', encoding='utf-8') as f:
            f.write(response.text)

        print(f"✓ ログ保存: {filename}")
        return True
    else:
        print(f"✗ APIエラー: {response.status_code}")
        return False

if __name__ == "__main__":
    fetch_logs()
```

### cron で週次実行

```bash
# crontab -e
# 毎週日曜 9:00 に実行
0 9 * * 0 cd /Users/kazui/Documents/ryouchiku-systems/scripts/philosophy-updater && /usr/bin/python3 limitless_api_fetch.py
```

---

## 方法3: macOS ショートカット（GUI自動化）

### セットアップ

1. **ショートカットアプリ**を開く

2. **新規ショートカット**を作成
   - 名前: 「Limitless Log Export」

3. **アクション追加**:
   ```
   1. アプリケーションを開く → Limitless
   2. 待機 → 3秒
   3. メニューバー項目をクリック → File > Export
   4. 待機 → 2秒
   5. テキスト入力 → /Users/kazui/Documents/ryouchiku-systems/.limitless/raw-logs
   6. キーを押す → Enter
   7. 待機 → 5秒
   8. アプリケーションを終了 → Limitless
   ```

4. **自動実行設定**（macOS Ventura以降）
   - 「オートメーション」タブ
   - 「時刻」トリガー → 毎週日曜 9:00

---

## 方法4: AppleScript（macOS）

```applescript
-- scripts/limitless-auto-export.scpt

tell application "Limitless"
    activate
    delay 2

    -- メニューからエクスポートを選択
    tell application "System Events"
        tell process "Limitless"
            click menu item "Export..." of menu "File" of menu bar 1
            delay 1

            -- ファイル保存ダイアログ
            keystroke "/Users/kazui/Documents/ryouchiku-systems/.limitless/raw-logs"
            delay 0.5
            keystroke return
        end tell
    end tell

    delay 3
    quit
end tell
```

### 実行

```bash
# 手動実行
osascript ~/Documents/ryouchiku-systems/scripts/limitless-auto-export.scpt

# cron で週次実行
# crontab -e
0 9 * * 0 osascript ~/Documents/ryouchiku-systems/scripts/limitless-auto-export.scpt
```

---

## 方法5: Selenium（ブラウザ自動化）

Limitless AIがWebアプリの場合に使用。

### セットアップ

```bash
cd scripts/philosophy-updater
pip install selenium
brew install --cask chromedriver  # macOS
```

### .env に認証情報追加

```bash
LIMITLESS_EMAIL=your_email@example.com
LIMITLESS_PASSWORD=your_password
```

### 実行

```bash
python limitless_auto_export.py
```

スクリプトは既に作成済み: `scripts/philosophy-updater/limitless_auto_export.py`

**注意**: Limitless AIの実際のHTML構造に合わせてカスタマイズが必要です。

---

## 🔄 完全自動化フロー

すべてを組み合わせると：

```bash
# 毎週日曜 9:00
1. Limitless AI からログ自動取得
   ↓
2. .limitless/raw-logs/ に保存
   ↓
3. auto_watch.py が変更検知
   ↓
4. extract_philosophy.py が自動実行
   ↓
5. CLAUDE.md が自動更新
```

### crontab 設定例

```bash
# crontab -e

# 毎週日曜 9:00 - Limitless AIログ取得
0 9 * * 0 cd /Users/kazui/Documents/ryouchiku-systems/scripts/philosophy-updater && /usr/bin/python3 limitless_api_fetch.py

# 毎週日曜 9:10 - 思想抽出（取得完了後）
10 9 * * 0 cd /Users/kazui/Documents/ryouchiku-systems/scripts/philosophy-updater && /usr/bin/python3 extract_philosophy.py
```

または、`auto_watch.py` を常時起動しておけば、ログ保存後に自動実行されます：

```bash
# バックグラウンドで常時監視
cd scripts/philosophy-updater
nohup python auto_watch.py > logs/auto_watch.log 2>&1 &
```

---

## 🛠️ トラブルシューティング

### Limitless AI の仕様が不明

**対応策**:
1. Limitless AIのサポートに問い合わせ
   - 「APIはありますか？」
   - 「自動エクスポート機能はありますか？」

2. 公式ドキュメント・コミュニティを確認
   - https://limitless.ai/docs
   - Discord/Slack コミュニティ

### macOS の権限エラー

AppleScriptやショートカットで自動化する場合：

1. システム設定 → プライバシーとセキュリティ
2. アクセシビリティ
3. ターミナル、ショートカット、Python を許可

---

## 📝 推奨アプローチ

### ステップ1: まず確認

Limitless AIアプリで以下を確認してください：

1. **設定に「自動エクスポート」機能があるか**
2. **API機能があるか**（Settings → API）

### ステップ2: 実装

- 自動エクスポート機能がある → **方法1**（最も簡単）
- APIがある → **方法2**（最も安定）
- どちらもない → **方法3または4**（macOS自動化）

---

## 💡 次のステップ

1. **Limitless AIの機能を確認**
   - アプリの設定を開いて自動エクスポート機能を探す

2. **最適な方法を選択**
   - 上記のフローチャートに従って選択

3. **テスト実行**
   - 手動で一度実行してみる

4. **自動化設定**
   - cron または macOS ショートカットで週次実行

どの方法が可能か、一緒に確認しましょう！

---

**作成日**: 2026-03-04
**管理者**: 龍竹一生
