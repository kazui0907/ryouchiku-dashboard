# ソースデータ（CSVファイル）

Googleドライブ共有ドライブ（ローカルマウント: `G:/共有ドライブ`）のCSVがデータソース。

**パス**: `G:/共有ドライブ/ryouchiku-workspace/group/board of directors/`

## CSVファイル一覧

| ファイル | 用途 |
|---------|------|
| `【共有用】2026度月次会議用管理会計  - 月次予測.csv` | 月次損益計算書（メインデータ） |
| `【共有用】2026度月次会議用管理会計  - 週次KPI（積極版）.csv` | 週次KPI目標・実績 |
| `【共有用】2026度月次会議用管理会計  - 週次現場KPI（積極版）.csv` | 週次現場KPI |
| `【共有用】2026度月次会議用管理会計  - 貸借対照表.csv` | 貸借対照表 |

---

## CSVの列構造（月次予測）

- 列0: 行ラベル（売上高合計・限界利益・営業利益など主要項目）
- 列1: 補助科目名（サブカテゴリ）
- 列2: 詳細区分
- 各月5列ずつ: `lastYear(昨年実績)`, `budget(予定数字)`, `actual(実数)`, 昨年対比, 達成率
  - 1月: 列3〜7、2月: 列8〜12、...、12月: 列58〜62

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
