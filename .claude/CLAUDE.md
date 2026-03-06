# 経営ダッシュボード（実時管理会計）

龍竹一生グループの経営管理会計システム。月次会計・週次KPI・予算管理を一元管理するWebアプリ。

---

## 本番環境

| 項目 | URL / 情報 |
|------|------------|
| **Webアプリ** | https://ryouchiku-dashboard.vercel.app/ |
| **管理画面（アップロード）** | https://ryouchiku-dashboard.vercel.app/admin/upload |
| **GitHub** | https://github.com/kazui0907/ryouchiku-dashboard |
| **データベース** | Supabase PostgreSQL（Singaporeリージョン） |
| **ホスティング** | Vercel（GitHubプッシュで自動デプロイ） |

---

## 技術スタック

| 分類 | 技術 |
|------|------|
| フレームワーク | Next.js 16.1.6 (App Router) |
| 言語 | TypeScript 5.x |
| UI | React 19.2.3 / Tailwind CSS 4.x |
| ORM | Prisma 5.22.0 |
| DB | Supabase PostgreSQL |
| チャート | Recharts 3.7.0 |
| CSV解析 | csv-parse 6.1.0 |
| エクスポート | ExcelJS 4.4.0 / jsPDF 4.2.0 |
| アイコン | Lucide React |

---

## ディレクトリ構成

```
./
├── app/                              # Next.js App Router
│   ├── layout.tsx                    # ルートレイアウト（Geistフォント）
│   ├── page.tsx                      # メインダッシュボード
│   ├── accounting/
│   │   └── page.tsx                  # 月次会計一覧（全項目・12ヶ月比較）
│   ├── weekly-kpi/
│   │   └── page.tsx                  # 週次KPI表示（5週分）
│   ├── reports/
│   │   ├── annual/page.tsx           # 年次サマリーレポート
│   │   └── monthly/[year]/[month]/
│   │       └── page.tsx              # 月次レポート（動的ルート）
│   ├── admin/
│   │   ├── upload/page.tsx           # CSVアップロード画面
│   │   ├── weekly-kpi/page.tsx       # 週次KPI手動入力フォーム
│   │   ├── weekly-site-kpi/page.tsx  # 週次現場KPI手動入力フォーム
│   │   └── sync/page.tsx             # データ同期画面
│   └── api/
│       ├── dashboard/route.ts        # GET: 当月・YTD・12ヶ月トレンド
│       ├── accounting/route.ts       # GET: 会計データ
│       ├── accounting-full/route.ts  # GET: 全明細行データ
│       ├── weekly-kpi/route.ts       # GET: 週次KPI（達成率計算込み）
│       ├── weekly-site-kpi/route.ts  # GET: 週次現場KPI（階層構造）
│       ├── reports/
│       │   ├── annual/route.ts       # GET: 年次集計データ
│       │   └── monthly/route.ts      # GET: 月次レポートデータ
│       ├── export/
│       │   ├── excel/route.ts        # GET: Excel出力（年間データ）
│       │   └── pdf/route.ts          # GET: PDF出力（月次レポート）
│       └── admin/
│           ├── upload/route.ts       # POST: CSVアップロード処理
│           ├── weekly-kpi/route.ts   # POST: 週次KPI保存
│           ├── weekly-site-kpi/route.ts # POST: 週次現場KPI保存
│           └── sync/route.ts         # POST: データ同期
├── components/
│   ├── Navbar.tsx                    # ナビゲーションバー
│   ├── ui/
│   │   └── card.tsx                  # Cardコンポーネント群
│   └── charts/
│       ├── MonthlyTrendChart.tsx     # 売上・粗利トレンドグラフ（折れ線）
│       ├── WeeklyKPIChart.tsx        # 週次KPIグラフ
│       └── PersonalKPIChart.tsx      # 個人別KPIグラフ
├── lib/
│   ├── prisma.ts                     # Prismaクライアント（シングルトン）
│   └── utils.ts                      # ユーティリティ関数
├── prisma/
│   └── schema.prisma                 # DBスキーマ定義（6モデル）
├── scripts/
│   ├── import-csv.ts                 # mf資料CSVインポート
│   ├── import-csv-data.ts            # 週次KPI CSVインポート
│   └── import-monthly-forecast.ts   # 月次予測CSVインポート
├── .env                              # 環境変数（DATABASE_URL）
├── package.json
├── tsconfig.json
└── next.config.ts
```

---

## データベーススキーマ（Supabase）

**プロジェクト名**: kanri_kaikei
**管理画面**: https://supabase.com/dashboard

### MonthlyAccounting（月次会計データ）
月次の売上・原価・利益データを格納。1レコード＝1ヶ月。

| フィールド | 説明 |
|-----------|------|
| salesRevenue | 売上高 |
| costOfSales | 売上原価 |
| grossProfit / grossProfitRate | 売上総利益 / 率 |
| marginProfit / marginProfitRate | 限界利益 / 率 |
| operatingProfit | 営業利益 |
| budgetSales / budgetGrossProfit / budgetMarginProfit | 予算値 |
| lastYearSalesRevenue / lastYearGrossProfit / lastYearMarginProfit | 昨年実績 |

### AccountingLineItem（管理会計明細行）
accounting-full画面用の全行データ。`monthsJson`に12ヶ月分をJSON格納。

### WeeklyKPI（週次KPI）
週次KPI（積極版）。1レコード＝1ヶ月×1項目。week1〜week5のTarget/Actual/Rate。

### WeeklySiteKPI（週次現場KPI）
週次現場KPI。mainItem（カテゴリ）+ subItem（詳細）の階層構造。

### PersonalKPI（個人別KPI）
従業員ごとの目標・実績。部門（営業/SR）で区分。

### Budget（予算データ）
月ごとの売上・利益・問合せ・受注の目標値。

---

## ソースデータ（CSVファイル）

Googleドライブ共有ドライブ（ローカルマウント: `G:/共有ドライブ`）のCSVがデータソース。

**パス**: `G:/共有ドライブ/ryouchiku-workspace/group/board of directors/`

| ファイル | 用途 |
|---------|------|
| `【共有用】2026度月次会議用管理会計  - 月次予測.csv` | 月次損益計算書（メインデータ） |
| `【共有用】2026度月次会議用管理会計  - 週次KPI（積極版）.csv` | 週次KPI目標・実績 |
| `【共有用】2026度月次会議用管理会計  - 週次現場KPI（積極版）.csv` | 週次現場KPI |
| `【共有用】2026度月次会議用管理会計  - 貸借対照表.csv` | 貸借対照表 |

### CSVの列構造（月次予測）
- 列0: 行ラベル（売上高合計・限界利益・営業利益など主要項目）
- 列1: 補助科目名（サブカテゴリ）
- 列2: 詳細区分
- 各月5列ずつ: `lastYear(昨年実績)`, `budget(予定数字)`, `actual(実数)`, 昨年対比, 達成率
  - 1月: 列3〜7、2月: 列8〜12、…、12月: 列58〜62

---

## データ更新方法

### 方法1: Web管理画面からアップロード（推奨）
1. https://ryouchiku-dashboard.vercel.app/admin/upload にアクセス
2. `月次予測.csv` をアップロード
3. 12ヶ月分の集計データ＋全明細行が一括保存される

### 方法2: ローカルスクリプト実行
```bash
# 月次予測（MonthlyAccounting + AccountingLineItem）
npx tsx scripts/import-monthly-forecast.ts

# 週次KPI
npx tsx scripts/import-csv-data.ts
```

---

## APIエンドポイント一覧

| エンドポイント | メソッド | パラメータ | 説明 |
|--------------|---------|-----------|------|
| `/api/dashboard` | GET | year, month | ダッシュボード全データ |
| `/api/accounting-full` | GET | year | 全明細行（12ヶ月） |
| `/api/weekly-kpi` | GET | year, month | 週次KPI |
| `/api/weekly-site-kpi` | GET | year, month | 週次現場KPI |
| `/api/reports/monthly` | GET | year, month | 月次レポート |
| `/api/reports/annual` | GET | year | 年次サマリー |
| `/api/export/excel` | GET | year | Excelダウンロード |
| `/api/export/pdf` | GET | year, month | PDFダウンロード |
| `/api/admin/upload` | POST | file (CSV) | CSVアップロード |
| `/api/admin/weekly-kpi` | POST | JSON | 週次KPI手動保存 |
| `/api/admin/weekly-site-kpi` | POST | JSON | 週次現場KPI手動保存 |

---

## ユーティリティ関数（lib/utils.ts）

```typescript
formatCurrency(value)        // ¥1,234,567 形式
formatPercent(value)         // 87.5% 形式（value は 0〜1 の小数）
formatCompactCurrency(value) // ¥44.2M 形式（コンパクト表示）
getAchievementColor(rate)    // 達成率に応じたTailwindクラス
cn(...classes)               // classNames マージ
```

---

## 達成率の色分けルール

| 項目種別 | 緑（良） | 黄（注意） | 赤（悪） |
|---------|---------|---------|---------|
| 収益・利益項目 | ≥100% | 80〜100% | <80% |
| コスト項目 | ≤80% | 80〜100% | >100% |

収益・利益項目の対象: 売上高、売上高合計、法人、一般顧客、限界利益、限界利益率、売上総利益、売上総利益率、営業利益、営業利益率

---

## 環境変数

| 変数名 | 説明 |
|--------|------|
| `DATABASE_URL` | Supabase PostgreSQL接続文字列 |

- **ローカル**: `.env` ファイルに記述
- **本番**: Vercel Dashboard → Settings → Environment Variables

---

## 開発セットアップ（別PCでの手順）

```powershell
# 1. リポジトリをクローン
git clone https://github.com/kazui0907/ryouchiku-dashboard.git
cd ryouchiku-dashboard

# 2. .envファイルを作成（DATABASE_URLを設定）

# 3. 依存パッケージをインストール
npm install

# 4. Prismaクライアントを生成
npx prisma generate

# 5. 開発サーバーを起動
npm run dev
# → http://localhost:3000 でアクセス
```

### デプロイ
```powershell
git add .
git commit -m "変更内容"
git push origin main
# → Vercelが自動デプロイ
```

---

## トラブルシューティング

| 症状 | 対処 |
|------|------|
| `npm install` エラー | `npm cache clean --force` 後に再実行 |
| Prismaエラー | `npx prisma generate` で再生成 |
| DB接続エラー | `.env` の `DATABASE_URL` を確認 / Supabaseのアクティブ状態を確認 |
| ポート3000使用中 | `npm run dev -- -p 3001` |
| アップロードで「接続数超過」エラー | `$transaction` で一括処理済み（再現時はVercelログを確認） |

---

## 注意事項

- `.env` は `.gitignore` で除外済み。Gitにコミットしないこと
- GitHubにプッシュすると Vercel が自動デプロイされる
- CSVを更新したら `/admin/upload` から再アップロードすること
- `marginProfitRate`（限界利益率）はCSVの値をそのまま格納（例: `37.86` = 37.86%）
