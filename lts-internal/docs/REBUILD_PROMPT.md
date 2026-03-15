# 龍竹一生システム統合リポジトリ - 再構築プロンプト

**作成日**: 2026-03-04
**対象環境**: Windows / Mac 両対応
**管理方式**: GitHub + Google Drive ハイブリッド型

---

## 概要

このプロンプトは、龍竹一生が運営する全事業のシステムをゼロから再構築するための完全な仕様書です。Windows環境でも動作するように設計されています。

---

## システム構成（3つのプロジェクト）

### 1. ライフタイムサポート 営業CRMシステム
- **場所**: `group/it-solution/sales-automation/`
- **用途**: 名刺交換した見込み客への営業メール自動化
- **顧客数**: 約100件

### 2. ライフアート toB自動営業システム
- **場所**: `group/life-art/sales-auto/`
- **用途**: 建設・不動産業界へのtoB営業（スクレイピング + メール送信）

### 3. 経営思想自動抽出システム
- **場所**: `scripts/philosophy-updater/`
- **用途**: Limitless AIからの経営思想抽出 → CLAUDE.md自動更新

---

# プロジェクト1: ライフタイムサポート 営業CRMシステム

## 会社情報

```
会社名: 株式会社ライフタイムサポート
代表: 龍竹一生（りょうちく かずい）
TEL: 070-1298-0180
Email: ryouchiku@life-time-support.com
受賞: 2025年 埼玉DX大賞受賞
背景: リフォーム会社を20年経営する現役社長。42Tokyo卒業。非IT出身ゆえの「現場目線」DX支援が強み。
```

## サービス一覧（5サービス）

### サービス1: 生成AI活用セミナー
- キャッチ: 「その繰り返し作業、AIで自動化しませんか？」
- 内容: プログラミング不要。3ヶ月でPC初心者でも業務を劇的に効率化できるセミナー。
- 料金:
  - エントリープラン: 15万円/名（全3日間 16時間）
  - スタンダードプラン: 20万円/名（全5日間 20時間）
  - 人材開発支援助成金で最大75%補助 → 実質負担 3.75万円〜
- ターゲット: 従業員5〜50名規模の企業、社長、経営者、総務部長、人事部長、業務改善担当

### サービス2: IT内製化サポート
- キャッチ: 「採用するよりパートナーを持つ賢い選択。」
- 内容: 貴社専属のエンジニアとして、必要な時に必要な分だけシステム開発・業務改善をサポート。
- 料金:
  - Light: 月額15万円（月1回MTG、月20時間稼働）
  - Standard: 月額20万円（月2回MTG、月30時間稼働）★推奨
  - Pro: 月額30万円（月2回MTG、月60時間稼働）
- 実績:
  - 不動産業界: レインズ情報の自動収集・選定 → 年間528時間削減
  - 事務・EC: 帳票自動作成・印刷 → 年間約1,000万円相当コスト削減
  - 顧客対応: LINE対応自動化 → 年間180時間削減 + 顧客満足度UP

### サービス3: デバイス販売（PC・タブレット）
- キャッチ: 「Amazonよりも安い。そのコスト、見直しませんか？」
- 内容: ノートPC・デスクトップPCをAmazon より低価格で提供。
- ターゲット: PC更新・入れ替えを検討している企業、総務部長、経理部長

### サービス4: WEBマーケティングサポート
- キャッチ: 「机上の空論ではない、より実践的な集客サポートを。」
- 内容:
  - Google広告運用代行（広告費の20%）
  - LLMO対策（完全成果報酬 1日1,000円）
- 実績: WEB集客のみで月間200件以上の問い合わせを獲得

### サービス5: 生成AIパーソナルトレーニング
- キャッチ: 「どんなにIT音痴でも、AIを使って仕事ができるようになります。」
- 内容: 1回5時間のマンツーマン〜少人数制の完全オーダーメイド講座
- 料金:
  - 1名: 12万円/人
  - 2名: 9万円/人
  - 3名: 7万円/人（最もお得）
- ターゲット: 経営者・個人事業主・フリーランス

## サービス判定ロジック

| 顧客タイプ | メインで紹介するサービス |
|---|---|
| 個人事業主・フリーランス・士業（法人格なし） | **AIパーソナルトレーニング** を中心に全サービスを紹介 |
| それ以外（法人所属の全員） | **生成AI活用セミナー** を中心に全サービスを紹介 |

### 個人事業主の判定基準
- 会社名に「株式会社」「有限会社」「合同会社」等の法人格がない
- 屋号のみ（例: 松一、Catch a time studio）
- 士業の個人事務所（例: 社労士事務所、税理士事務所）
- 肩書きに「フリーランス」「個人事業主」を含む

## CRMスプレッドシート設計（32列: A〜AF）

**スプレッドシートID**: `1ziKikGgjVmDS4BlUfMGQH2rfqGN03I1_Tb5gC1HcZBw`

| 列 | 項目名 | 用途 |
|---|---|---|
| A | 会社名 | 基本情報 |
| B | 部署 | 基本情報 |
| C | 役職 | AI判定の主要入力 |
| D | 氏名 | メール宛名 |
| E | メールアドレス | 送信先 |
| F | 郵便番号 | 基本情報 |
| G | 住所 | 基本情報 |
| H | ホームページURL | AI判定の補助入力 |
| I | 会社電話番号 | 連絡先 |
| J | 携帯電話番号 | 連絡先 |
| K | FAX | 連絡先 |
| L | その他 | 補足情報 |
| M | 読み込み日 | 登録日時 |
| N | 出会いやコメント | 手動メモ |
| O | 推奨サービス | AI判定結果 |
| P | 推奨理由 | 判定根拠 |
| Q | メール件名 | 下書き |
| R | メール本文（下書き） | 下書き |
| S | メール送信ステータス | 送信管理 |
| T | 初回送信日 | 送信記録 |
| U | 次回フォロー文 | 下書き |
| V | 次回フォローステータス | 送信管理 |
| W | 次回フォロー予定日 | 送信記録 |
| X | 営業フェーズ | パイプライン |
| Y | 次のアクション | タスク管理 |
| Z | 最終更新日 | 更新履歴 |
| AA | 名刺ファイルURL | 原本参照 |
| AB | タッチ番号 | フォロー進捗（0〜7） |
| AC | 連絡手段 | メール/LINE/両方 |
| AD | 最終反応日 | 相手から最後に反応があった日 |
| AE | 反応メモ | 返信内容や反応の概要 |
| AF | LINE送信テキスト | LINEで送る用のテキスト |

## ステータス定義

### メール送信ステータス（S列）
- 未送信: まだ下書きが生成されていない
- 下書き済: AIが下書きを生成済み、確認待ち
- 送信許可: 龍竹が確認・承認済み、送信待ち
- 送信済み: メール送信完了
- 初回送信済: 既存顧客（移行データ）

### 営業フェーズ（X列）
- リード: 初期接触段階
- アポ調整: 商談日程の調整中
- 商談設定: 商談日確定
- 打ち合わせ完了: 商談実施済み
- 提案中: 見積・提案書提出済み
- 受注: 成約
- 失注: 不成約
- 保留: 時期未定で保留
- 育成中: フォロー中（タッチ1-6の途中）
- 関心あり: 何らかの反応あり
- 長期育成: フォロー6回完了、反応なし

## 6段階フォローアップ設計（価値提供型 × 150日）

| タッチ | 日数 | チャネル | コンテンツタイプ |
|-------|------|---------|---------------|
| 1 | 3日後 | メール | 軽い確認+補足 |
| 2 | 10日後 | メール | 事例紹介 |
| 3 | 21日後 | メール/LINE | 補助金・助成金情報 |
| 4 | 45日後 | メール | セミナー案内/無料相談 |
| 5 | 90日後 | メール/LINE | 新規事例or季節トピック |
| 6 | 150日後 | メール | 最終フォロー |

## 営業メッセージ作成ルール

### トーン＆マナー
- 「押し売り感」を出さない
- 専門用語は使いすぎない。使う場合は必ず平易な言葉で補足
- 「一緒に解決しましょう」というパートナー感
- 実績・数字を必ず入れる（288万円削減、528時間削減 等）
- 敬語は丁寧語（です・ます調）で統一
- 文章は短く区切る（1文は60文字以内を目安）
- 絵文字は使わない

### メッセージ構成
1. 共感の一文 - 相手の役職・業種から想定される課題に触れる
2. 自己紹介 - 龍竹一生 / 株式会社ライフタイムサポート
3. 提案するサービスと根拠
4. 実績・数字 - 類似事例の成果を1つ添える
5. 次のアクション - 「まずは15分のオンライン相談はいかがでしょうか？」

## 技術スタック

- **データソース**: Googleスプレッドシート
- **サーバーサイド**: Google Apps Script（スプレッドシートにコンテナバインド）
- **フロントエンド**: HTML/CSS/JavaScript（GASウェブアプリ）
- **自動化エンジン**: n8n
- **AI判定**: Claude API
- **メール送信**: Gmail（GAS経由）

## 必要なファイル

```
group/it-solution/sales-automation/
├── CLAUDE.md                    # プロジェクトルールブック
├── crm-new/
│   ├── CLAUDE.md                # CRMシステム詳細
│   └── Index.html               # Web UI（GASウェブアプリのフロント）
└── 営業CRM.gsheet              # スプレッドシート（GASコードがコンテナバインド）
```

### Code.gs の主要関数（GASにコンテナバインド）

```javascript
// 必須関数
function doGet()              // Web UIを提供
function getCustomers()       // 顧客一覧を取得
function updateEmail(row, subject, body)  // メール文面を更新
function updateStatus(row, status)        // ステータスを更新
function sendEmail(row)       // メールを送信
function bulkSend(rows)       // 複数のメールを一括送信
```

---

# プロジェクト2: ライフアート toB自動営業システム

## 会社情報

```
会社名: ライフアート株式会社
代表取締役: 齋藤 信也
所在地: 〒340-0002 埼玉県草加市青柳5-35-20 グリーンルーム1F
TEL: 048-948-6381
Email: info@life-art2011.com
HP: https://life-art2011.com/
建設業許可: 埼玉知事許可（般一29）第70623号
```

## 事業内容

- クロス工事（壁紙張替え・新築クロス施工）
- 床工事（フローリング・クッションフロア・タイル）
- リフォーム（内装全般）
- ハウスクリーニング（退去後・入居前）

## 強み

1. 一級技能士在籍 - 国家資格保有の熟練職人
2. 13年以上の実績 - 2011年創業
3. スピード対応 - 短納期でも高品質
4. 一都三県対応 - 東京・神奈川・千葉・埼玉
5. 建設業許可取得 - 正規許可業者

## ターゲット企業（4カテゴリ）

| 種別 | 検索クエリ |
|------|----------|
| ゼネコン | 総合建設会社, 建設会社 ゼネコン, 建築工事会社 |
| 不動産 | 不動産会社 賃貸管理, 不動産管理会社, ビル管理会社 |
| 設計事務所 | 建築設計事務所, 設計事務所 建築デザイン, インテリアデザイン事務所 |
| ハウスメーカー | ハウスメーカー 注文住宅, 工務店 新築, 住宅メーカー 分譲住宅 |

## CRMスプレッドシート設計（20列: A〜T）

**スプレッドシートID**: `1YRhG-5jwspIomY9Udzg6gR1uzpJt2n3jnTkLkihWTxI`
**シート名**: リード一覧

| 列 | 項目名 |
|----|--------|
| A | 会社名 |
| B | 業種分類 |
| C | 代表者名 |
| D | 所在地 |
| E | TEL |
| F | メールアドレス |
| G | HP URL |
| H | 取得元 |
| I | 取得日 |
| J | メール件名 |
| K | メール本文 |
| L | ステータス |
| M | 送信日 |
| N | 反応 |
| O | 反応メモ |
| P | 営業フェーズ |
| Q | 次のアクション |
| R | フォロー予定日 |
| S | フォロー回数 |
| T | 備考 |

## メールテンプレート（ゼネコン向け例）

```
件名: 【内装工事】協力会社のご提案｜ライフアート株式会社

{代表者名}様

突然のご連絡失礼いたします。
内装仕上げ工事を専門とするライフアート株式会社の齋藤と申します。

御社のホームページを拝見し、{会社名}様の建設事業に大変感銘を受けました。

弊社は埼玉県草加市を拠点に、一都三県でクロス工事・床工事を中心とした内装仕上げ工事を手がけております。

■ 弊社の強み
・一級技能士在籍による高品質な施工
・創業13年、豊富な施工実績
・短納期でも品質を落とさないスピード対応
・建設業許可取得（埼玉知事許可（般一29）第70623号）

御社の現場で内装工事の協力会社をお探しの際に、お力になれればと存じます。
まずはご挨拶かねて、お打ち合わせのお時間をいただけますと幸いです。

何卒よろしくお願い申し上げます。

━━━━━━━━━━━━━━━━━━━━
ライフアート株式会社
代表取締役 齋藤 信也
〒340-0002 埼玉県草加市青柳5-35-20 グリーンルーム1F
TEL: 048-948-6381
Email: info@life-art2011.com
HP: https://life-art2011.com/
━━━━━━━━━━━━━━━━━━━━
```

## 技術スタック

### スクレイピング（Python）

**必須パッケージ（requirements.txt）**:
```
requests>=2.31.0
beautifulsoup4>=4.12.0
selenium>=4.15.0
gspread>=5.12.0
google-auth>=2.23.0
google-auth-oauthlib>=1.1.0
lxml>=4.9.0
```

### GAS（スプレッドシート連携）

スプレッドシートにコンテナバインドされたGASコード

### Web UI

GASウェブアプリとしてデプロイ

## ファイル構成

```
group/life-art/sales-auto/
├── CLAUDE.md                    # ルールブック
├── scraper/
│   ├── requirements.txt         # Python依存パッケージ
│   ├── config.py                # 設定（エリア、業種、APIキー等）
│   ├── main.py                  # メイン実行スクリプト
│   ├── google_maps_scraper.py   # Google Maps API検索
│   ├── website_email_scraper.py # 企業HPからメール・代表者名取得
│   └── sheets_writer.py         # スプレッドシート書き込み
└── gas/
    ├── Code.gs                  # GASサーバーサイド
    └── Index.html               # 管理Web UI
```

## Python スクレイパーの主要機能

### config.py
```python
# Google Maps API キー
GOOGLE_MAPS_API_KEY = "AIzaSy..."

# 対象エリア
TARGET_AREAS = ["東京都", "神奈川県", "千葉県", "埼玉県"]

# 検索クエリ（カテゴリ別）
GOOGLE_MAPS_SEARCH_QUERIES = {
    "ゼネコン": ["総合建設会社", ...],
    "不動産": ["不動産会社 賃貸管理", ...],
    "設計事務所": ["建築設計事務所", ...],
    "ハウスメーカー": ["ハウスメーカー 注文住宅", ...],
}
```

### main.py 使い方
```bash
# 全カテゴリ・全エリアで実行
python main.py

# 特定エリアのみ
python main.py --area 埼玉県

# 特定カテゴリのみ
python main.py --category ゼネコン

# ドライラン（スプレッドシートに書き込まない）
python main.py --dry-run

# メールアドレス取得をスキップ
python main.py --skip-email
```

### GAS 主要関数

```javascript
function doGet()              // Web UIを提供
function getLeads()           // リード一覧を取得
function updateEmail(row, subject, body)  // メール文面を更新
function updateStatus(row, status)        // ステータスを更新
function sendEmail(row)       // メールを送信
function bulkSend(rows)       // 複数のメールを一括送信
function runScraping(area, category)  // GASからスクレイピング実行
function getSendHistory(leadRow)      // 送信履歴を取得
```

---

# プロジェクト3: 経営思想自動抽出システム

## 概要

Limitless AI のログから龍竹一生の経営思想・理念を自動抽出し、CLAUDE.md に反映するシステム。

## 処理フロー

```
Limitless AI
  ↓ API（週次自動取得）
.limitless/raw-logs/
  ↓ Gemini/Claude 分析
経営思想抽出
  ↓ 自動更新
CLAUDE.md
```

## 抽出される思想カテゴリ

1. ビジョン・ミッション
2. 事業方針・戦略
3. 顧客価値の定義
4. 意思決定基準
5. 組織文化・価値観
6. 技術・システムに対する考え方

## 技術スタック

**必須パッケージ（requirements.txt）**:
```
google-generativeai>=0.8.0
anthropic>=0.40.0
python-dotenv>=1.0.0
watchdog>=3.0.0
requests>=2.31.0
```

## 環境変数（.env.example）

```bash
# AI API設定
AI_PROVIDER=gemini  # gemini または claude

# Gemini API設定（デフォルト）
GOOGLE_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-2.5-flash-002

# Claude API設定（オプション）
ANTHROPIC_API_KEY=your_anthropic_api_key_here
CLAUDE_MODEL=claude-sonnet-4-20250514

# Limitless API設定
LIMITLESS_API_KEY=your_limitless_api_key_here

# ファイル監視設定
WATCH_INTERVAL=60
AUTO_UPDATE=true

# パス設定
RAW_LOGS_DIR=../../.limitless/raw-logs
PHILOSOPHY_EXTRACT_DIR=../../.limitless/philosophy-extract
CLAUDE_MD_PATH=../../CLAUDE.md
```

## ファイル構成

```
scripts/philosophy-updater/
├── extract_philosophy.py   # メイン処理（思想抽出）
├── auto_watch.py           # ファイル監視・自動実行
├── fetch_limitless_logs.py # Limitless API からログ取得
├── fetch_initial_3months.sh # 初回実行（過去3ヶ月分）
├── setup_cron.sh           # 週次自動実行の設定
├── requirements.txt        # Python依存関係
├── .env.example            # 環境変数サンプル
├── .env                    # 環境変数（Git管理外）
├── LIMITLESS_SETUP.md      # Limitless AI セットアップガイド
└── README.md               # このプロジェクトのREADME
```

---

# Windows 対応ガイドライン

## パス区切り文字

- Windows: `\`（バックスラッシュ）
- Mac/Linux: `/`（スラッシュ）

**対応方法**: `os.path.join()` または `pathlib.Path` を使用

```python
# 悪い例
path = "scripts/philosophy-updater/config.py"

# 良い例
from pathlib import Path
path = Path("scripts") / "philosophy-updater" / "config.py"

# または
import os
path = os.path.join("scripts", "philosophy-updater", "config.py")
```

## シェルスクリプト → Python/PowerShell 変換

Mac用の `.sh` スクリプトは、Windows用に以下のいずれかに変換:

1. **Python スクリプト**（クロスプラットフォーム推奨）
2. **PowerShell スクリプト** (`.ps1`)
3. **バッチファイル** (`.bat`)

## 環境変数の読み込み

```python
from dotenv import load_dotenv
import os

# .env ファイルを読み込み
load_dotenv()

# 環境変数を取得
api_key = os.getenv("GOOGLE_API_KEY")
```

## cron → タスクスケジューラ

Mac の cron は、Windows では「タスクスケジューラ」に相当:

```powershell
# PowerShellでタスクスケジューラに登録する例
$action = New-ScheduledTaskAction -Execute "python" -Argument "C:\path\to\script.py"
$trigger = New-ScheduledTaskTrigger -Weekly -DaysOfWeek Monday -At 9am
Register-ScheduledTask -TaskName "PhilosophyUpdater" -Action $action -Trigger $trigger
```

## 文字エンコーディング

```python
# ファイル読み書き時は明示的に UTF-8 を指定
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)
```

## Python 仮想環境

```bash
# Mac
python3 -m venv venv
source venv/bin/activate

# Windows (PowerShell)
python -m venv venv
.\venv\Scripts\Activate.ps1

# Windows (コマンドプロンプト)
python -m venv venv
venv\Scripts\activate.bat
```

## Selenium WebDriver

```python
from selenium import webdriver
from selenium.webdriver.chrome.service import Service
import platform

# OSに応じてドライバーパスを設定
if platform.system() == "Windows":
    driver_path = "C:/path/to/chromedriver.exe"
else:
    driver_path = "/usr/local/bin/chromedriver"

service = Service(driver_path)
driver = webdriver.Chrome(service=service)
```

---

# Google Drive 共有ドライブ情報

```
共有ドライブ名: ryouchiku-workspace
URL: https://drive.google.com/drive/folders/0ALObQKP4ll2vUk9PVA
フォルダID: 0ALObQKP4ll2vUk9PVA
アカウント: ryouchiku@life-time-support.com
```

## MCP（Model Context Protocol）でのアクセス

```javascript
// ファイル一覧
mcp__google__drive_files_list({ parent_id: "0ALObQKP4ll2vUk9PVA" })

// スプレッドシート読み取り
mcp__google__sheets_values_get({
  spreadsheet_id: "1ziKikGgjVmDS4BlUfMGQH2rfqGN03I1_Tb5gC1HcZBw",
  range: "シート1!A1:Z100"
})

// スプレッドシート書き込み
mcp__google__sheets_values_update({
  spreadsheet_id: "...",
  range: "シート1!O2:P2",
  values: [["生成AI活用セミナー", "理由..."]]
})
```

---

# セキュリティルール

## 絶対にGitにコミットしてはいけないファイル

- `credentials.json`
- `.env`, `.env.local`
- `**/client_secret_*.json`
- `**/*-key-*.json`
- `**/token.json`

## .gitignore 必須項目

```gitignore
# 環境変数
.env
.env.local
.env.*.local

# 認証情報
credentials.json
client_secret_*.json
*-key-*.json
token.json
service_account.json

# Python
__pycache__/
*.py[cod]
venv/
.venv/

# Node.js
node_modules/

# OS
.DS_Store
Thumbs.db

# Limitless AI ログ（プライバシー）
.limitless/raw-logs/
```

---

# Git運用ルール

## ブランチ戦略

- `main`: 本番環境
- `develop`: 開発環境
- `feature/[機能名]`: 機能開発用

## コミットメッセージフォーマット

```
[種類] 変更内容の要約

詳細な説明（必要に応じて）
```

**種類**:
- `[add]` 新機能追加
- `[fix]` バグ修正
- `[update]` 既存機能の更新
- `[refactor]` リファクタリング
- `[docs]` ドキュメント更新
- `[config]` 設定変更

---

# 連絡先

```
龍竹一生
Email: ryouchiku@life-time-support.com
TEL: 070-1298-0180
```

---

**このプロンプトを使って、Windows環境でもMac環境でも動作するシステムを1から構築してください。**
