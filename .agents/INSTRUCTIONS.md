# 経営ダッシュボード（実時管理会計）

龍竹一生グループの経営管理会計システム。月次会計・週次KPI・予算管理を一元管理するWebアプリ。

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
