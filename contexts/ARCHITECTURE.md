# アーキテクチャ

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

## APIエンドポイント

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

## 環境変数

| 変数名 | 説明 |
|--------|------|
| `DATABASE_URL` | Supabase PostgreSQL接続文字列 |

- **ローカル**: `.env` ファイルに記述
- **本番**: Vercel Dashboard → Settings → Environment Variables
