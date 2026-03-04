# 龍竹一生 経営ダッシュボード

Next.js + TypeScript + Prisma + SQLite で構築された経営ダッシュボードアプリケーション

> **⚠️ 重要**: このプロジェクトはGitで管理されています。データファイル（CSV）とドキュメントはGoogle Driveで管理します。詳細は [SETUP.md](./SETUP.md) を参照してください。

## 機能一覧

### 1. グラフ機能
- **月次推移グラフ**: 過去12ヶ月の売上高と売上総利益の推移を折れ線グラフで表示
- **週次KPIグラフ**: 今月の問合件数・受注件数の週別推移を折れ線グラフで表示

### 2. 詳細画面
- **月次レポート詳細**: 損益計算書形式で月次データを詳細表示
- **年次サマリー**: 年間の売上高・利益・平均利益率と月別詳細テーブル

### 3. データ更新機能
- **CSVアップロード**: Google Sheetsからエクスポートしたファイルをアップロードして更新
- **Google Sheets自動同期**: スプレッドシートから自動でデータ取得（準備中）

### 4. エクスポート機能
- **Excelエクスポート**: 年間の月次データをExcelファイルでダウンロード
- **PDFエクスポート**: 今月のレポートをPDF形式で出力

### 5. ナビゲーション
- トップナビゲーションバーで各機能に簡単アクセス
- エクスポートボタンで即座にファイル出力

## 技術スタック

- **フロントエンド**: Next.js 14 (App Router), TypeScript, Tailwind CSS
- **グラフ**: Recharts
- **バックエンド**: Next.js API Routes
- **データベース**: Prisma + SQLite
- **エクスポート**: ExcelJS, jsPDF

## 🚀 クイックスタート

### 初回セットアップ

```bash
# 1. リポジトリをクローン
git clone <リポジトリURL>
cd ryouchiku-dashboard

# 2. 依存関係をインストール
npm install

# 3. 環境変数を設定
cp .env.example .env

# 4. データベースをセットアップ
npx prisma migrate deploy
npx prisma generate

# 5. 開発サーバーを起動
npm run dev
```

ブラウザで http://localhost:3000 を開く

**詳細なセットアップ手順は [SETUP.md](./SETUP.md) を参照してください。**

## 📁 フォルダ構成

### Git管理（このリポジトリ）
- アプリケーションコード
- データベーススキーマ
- スクリプト

### Google Drive管理
```
Google Drive/共有ドライブ/ryouchiku-workspace/data/
├── csv/                  # 元データCSV
├── documents/            # ドキュメント、セーブポイント
└── backups/             # データベースバックアップ
```

## 使い方

### ダッシュボードの閲覧

- トップページで当月のサマリー、週次KPI、グラフを確認できます

### データの更新

1. **CSVアップロード**: ナビゲーションから「CSVアップロード」を選択
   - Google Sheetsから「ファイル → ダウンロード → CSV」でエクスポート
   - ファイルを選択してアップロード

2. **Google Sheets同期**: ナビゲーションから「データ同期」を選択
   - 「今すぐ同期」ボタンをクリック（準備中）

### レポートの出力

1. **Excel**: ナビゲーションの「エクスポート」→「Excel (年間データ)」
   - 年間の月次データがExcel形式でダウンロードされます

2. **PDF**: ナビゲーションの「エクスポート」→「PDF (今月レポート)」
   - 今月のレポートがHTMLで開き、ブラウザの印刷機能でPDF化できます

## ディレクトリ構成

```
ryouchiku-dashboard/
├── app/
│   ├── admin/
│   │   ├── sync/              # Google Sheets同期画面
│   │   └── upload/            # CSVアップロード画面
│   ├── api/
│   │   ├── admin/
│   │   │   ├── sync/          # 同期API
│   │   │   └── upload/        # アップロードAPI
│   │   ├── dashboard/         # ダッシュボードAPI
│   │   ├── export/
│   │   │   ├── excel/         # Excelエクスポート
│   │   │   └── pdf/           # PDFエクスポート
│   │   └── reports/
│   │       ├── annual/        # 年次サマリーAPI
│   │       └── monthly/       # 月次レポートAPI
│   ├── reports/
│   │   ├── annual/            # 年次サマリー画面
│   │   └── monthly/[year]/[month]/  # 月次レポート詳細画面
│   └── page.tsx               # メインダッシュボード
├── components/
│   ├── charts/
│   │   ├── MonthlyTrendChart.tsx    # 月次推移グラフ
│   │   ├── PersonalKPIChart.tsx     # 個人別KPIグラフ
│   │   └── WeeklyKPIChart.tsx       # 週次KPIグラフ
│   ├── ui/
│   │   └── card.tsx                 # UIコンポーネント
│   └── Navbar.tsx                   # ナビゲーションバー
├── lib/
│   ├── prisma.ts              # Prismaクライアント
│   └── utils.ts               # ユーティリティ関数
├── prisma/
│   ├── schema.prisma          # データベーススキーマ
│   ├── migrations/            # マイグレーション履歴
│   └── dev.db                 # SQLiteデータベース
└── scripts/
    └── import-csv.ts          # CSVインポートスクリプト
```

## トラブルシューティング

### データが表示されない

1. データベースが初期化されているか確認
   ```bash
   npx prisma studio
   ```

2. CSVデータをインポート
   ```bash
   npm run db:seed
   ```

### グラフが表示されない

- ブラウザのコンソールでエラーを確認
- データベースに月次データが入っているか確認

## 今後の拡張予定

- Google Sheets API自動同期の完全実装
- 個人別KPI詳細画面の実装
- 認証機能の強化（NextAuth.js）
- リアルタイムデータ更新
- モバイルアプリ対応

## ライセンス

Private - 龍竹一生専用
