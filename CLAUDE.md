# 龍竹一生 経営ダッシュボード ルールブック

## プロジェクト概要

龍竹一生（株式会社ライフタイムサポート代表）の経営管理ダッシュボード。
売上・予実・財務データをリアルタイムで可視化する社内向け Next.js アプリ。

## 技術スタック

| レイヤー | 技術 |
|---------|------|
| フレームワーク | Next.js 16（App Router） |
| 言語 | TypeScript |
| UI | Tailwind CSS + Recharts（グラフ）|
| ORM / DB | Prisma + SQLite |
| データインポート | CSV / Excel（scripts/ 以下） |
| パッケージマネージャ | npm |

## ディレクトリ構成

```
LTS-dashboard/
├── app/                    ← Next.js App Router ページ
│   ├── page.tsx            ← トップ（ダッシュボード）
│   ├── accounting/         ← 経理
│   ├── admin/              ← 管理
│   ├── balance-sheet/      ← 貸借対照表
│   └── reports/            ← レポート
├── components/             ← 共通UIコンポーネント
├── lib/                    ← ユーティリティ・型定義
├── prisma/                 ← DB スキーマ・マイグレーション
├── scripts/                ← データインポートスクリプト
└── public/                 ← 静的ファイル
```

## 開発コマンド

```bash
npm run dev                  # 開発サーバー起動（http://localhost:3000）
npm run build                # 本番ビルド（prisma generate も同時実行）
npm run db:seed              # CSV からデータをインポート
npm run db:import-forecast   # 月次予算データをインポート
```

## 作業ルール

### DB・スキーマ変更
- `prisma/schema.prisma` を変更したら必ず `npx prisma migrate dev` を実行する
- マイグレーションファイルは Git にコミットする

### データインポート
- CSV/Excel の形式が変わった場合は `scripts/` 以下のスクリプトも合わせて修正する
- インポート前に必ずバックアップを取ること

### コンポーネント設計
- 共通 UI は `components/` に配置し、ページ固有の UI は各 `app/` サブディレクトリ内に置く
- グラフは Recharts を使用する（他のグラフライブラリを追加しない）

### デプロイ
- このアプリは社内専用（インターネット非公開）
- 本番反映前に龍竹の確認を取る

## GitHub リポジトリ

- **リポジトリ:** `LTS0907/ryouchiku-dashboard`
- **ローカルパス:** `/Users/kazui/scripts/LTS-dashboard`
- **本番URL:** https://ryouchiku-dashboard.vercel.app/

---

## Git 運用ルール

**ファイルを編集したら、必ず git commit & push すること。**

- CLAUDE.md・コード・設定ファイルなど、種類を問わずすべての変更が対象
- 編集作業が完了したら、その場で `git add` → `git commit` → `git push` まで実行する
- 「後でまとめて push」は禁止。編集のたびに即座に push する
- Claude Code が自律的に実行すること（ユーザーに push を依頼しない）

---

## クレデンシャル管理ルール

**トークン・APIキーを取得/受領した場合は、必ず `lts-knowledge/06_credentials.md` に記録すること。**

- 記録内容: サービス名・用途・キーの値・取得日・有効期限
- トークンやAPIキーが必要になった場合は、まず `lts-knowledge/06_credentials.md` を確認してから質問する
