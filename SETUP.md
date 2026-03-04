# セットアップガイド

## フォルダ構成ルール

### 📦 Git管理（このリポジトリ）
```
ryouchiku-dashboard/
├── app/                 # Next.jsアプリケーションコード
├── components/          # Reactコンポーネント
├── lib/                 # ユーティリティ関数
├── prisma/
│   ├── schema.prisma   # データベーススキーマ
│   └── migrations/     # マイグレーション履歴
├── scripts/            # スクリプト（import-csv-data.tsなど）
├── public/             # 静的ファイル
├── .env.example        # 環境変数テンプレート
└── package.json        # 依存関係
```

### 📁 Google Drive管理
```
Google Drive/共有ドライブ/ryouchiku-workspace/
└── data/
    ├── csv/                                    # 元データCSV
    │   ├── 週次KPI（積極版）.csv
    │   ├── 週次現場KPI（積極版）.csv
    │   └── Panel4データ.csv
    ├── documents/                              # ドキュメント
    │   ├── savepoint_YYYYMMDD.md              # セーブポイント
    │   └── MEMORY.md                           # プロジェクトメモリ
    └── backups/                                # バックアップ
        └── database/
            └── dev_YYYYMMDD.db                # データベースバックアップ
```

## 🚀 初回セットアップ

### 1. リポジトリのクローン

#### Macの場合
```bash
cd ~/Projects
git clone <リポジトリURL> ryouchiku-dashboard
cd ryouchiku-dashboard
```

#### Windowsの場合
```powershell
cd C:\Projects
git clone <リポジトリURL> ryouchiku-dashboard
cd ryouchiku-dashboard
```

### 2. 依存関係のインストール
```bash
npm install
```

### 3. 環境変数の設定
```bash
# .env.exampleをコピー
cp .env.example .env

# .envファイルを必要に応じて編集
```

### 4. データベースのセットアップ

#### 新規セットアップの場合
```bash
# マイグレーション実行（空のデータベース作成）
npx prisma migrate deploy

# Prisma Client生成
npx prisma generate
```

#### 既存データをインポートする場合
```bash
# Google DriveからCSVファイルを取得して、適切な場所に配置してから
npx tsx scripts/import-csv-data.ts
```

### 5. 開発サーバー起動
```bash
npm run dev
```

ブラウザで http://localhost:3000 にアクセス

## 🔄 チーム開発ワークフロー

### プルリクエストを作成する前
```bash
# 最新コードを取得
git pull origin main

# ブランチを作成
git checkout -b feature/your-feature-name

# 変更をコミット
git add .
git commit -m "feat: 機能の説明"

# プッシュ
git push origin feature/your-feature-name
```

### マージ後
```bash
# メインブランチに戻る
git checkout main

# 最新コードを取得
git pull origin main

# 依存関係を更新（package.jsonが変更された場合）
npm install

# データベーススキーマを更新（prisma/schema.prismaが変更された場合）
npx prisma migrate deploy
npx prisma generate

# 開発サーバー起動
npm run dev
```

## 📊 データ管理

### CSVデータの配置
元データCSVは**Google Drive**の以下に配置：
```
Google Drive/共有ドライブ/ryouchiku-workspace/data/csv/
```

### データベースファイル
- 開発環境の `prisma/dev.db` は**Gitで管理しない**
- 各開発者が独自のデータベースを持つ
- バックアップはGoogle Driveの `data/backups/database/` に保存

### データベースのバックアップ
```bash
# 手動バックアップ（任意のタイミング）
cp prisma/dev.db "G:\共有ドライブ\ryouchiku-workspace\data\backups\database\dev_$(date +%Y%m%d).db"
```

## 🛠 よく使うコマンド

```bash
# 開発サーバー起動
npm run dev

# ビルド
npm run build

# 本番環境実行
npm start

# Prisma Studio起動（データベースGUI）
npx prisma studio

# データベースマイグレーション
npx prisma migrate dev --name migration_name

# Prisma Client再生成
npx prisma generate

# CSVインポート
npx tsx scripts/import-csv-data.ts
```

## ⚠️ 注意事項

### Google Driveとの使い分け
- **コード**: Git管理（このリポジトリ）
- **データCSV**: Google Drive
- **ドキュメント**: Google Drive
- **データベース**: 各環境で独立（バックアップはGoogle Drive）

### node_modulesについて
- `.gitignore`に含まれているため、Gitで管理されない
- 各環境で `npm install` を実行してインストール
- Mac/Windows間で互換性問題が発生しない

### データベースについて
- 開発環境では各自が独立したSQLiteを使用
- 本番環境ではPostgreSQLなどを検討
- データの共有はCSVエクスポート/インポートで対応

## 🔐 セキュリティ

### .envファイル
- **絶対にGitにコミットしない**
- `.env.example` をテンプレートとして使用
- 本番環境の認証情報は別途管理

### 機密情報
- API キー、パスワードなどは `.env` に記載
- チームメンバーとは安全な方法で共有（1Password、LastPassなど）

## 📝 トラブルシューティング

### ビルドエラーが出る
```bash
# キャッシュをクリア
rm -rf .next node_modules package-lock.json
npm install
npm run dev
```

### Prismaエラーが出る
```bash
# Prisma Clientを再生成
npx prisma generate

# マイグレーションを再実行
npx prisma migrate deploy
```

### ポート3000が使用中
```bash
# プロセスを確認
lsof -i :3000  # Mac/Linux
netstat -ano | findstr :3000  # Windows

# プロセスを停止してから再起動
npm run dev
```
