# Git リポジトリ設定ガイド

このドキュメントでは、プロジェクトをGitHubにプッシュして、チームで共有する手順を説明します。

## 📋 前提条件

- GitHubアカウントがあること
- Gitがインストールされていること

## 🚀 GitHubリポジトリの作成とプッシュ

### ステップ1: GitHubでリポジトリを作成

1. [GitHub](https://github.com) にログイン
2. 右上の「+」→「New repository」をクリック
3. リポジトリ設定:
   - **Repository name**: `ryouchiku-dashboard`
   - **Description**: 龍竹一生 経営ダッシュボード
   - **Visibility**: Private（推奨）
   - **Initialize this repository with**: チェックを外す（空のリポジトリにする）
4. 「Create repository」をクリック

### ステップ2: ローカルリポジトリを準備

現在のプロジェクトディレクトリで以下を実行：

```bash
cd "/Users/kazui/Library/CloudStorage/GoogleDrive-ryouchiku@life-time-support.com/共有ドライブ/ryouchiku-workspace/group/board of directors/ryouchiku-dashboard"

# Git初期化は既に完了しているので、リモートリポジトリを追加
git remote add origin https://github.com/[あなたのユーザー名]/ryouchiku-dashboard.git

# または SSH を使う場合（推奨）
# git remote add origin git@github.com:[あなたのユーザー名]/ryouchiku-dashboard.git
```

### ステップ3: 初回プッシュ

```bash
# 現在の変更を確認
git status

# すべての変更をステージング
git add .

# コミット
git commit -m "Initial commit: プロジェクトセットアップ完了

- Next.js 15 + TypeScript + Prisma
- 週次KPI・現場KPI入力機能実装
- SQLiteデータベース統合
- Git/Google Driveフォルダ構成整理"

# メインブランチの名前を確認・変更（必要に応じて）
git branch -M main

# GitHubにプッシュ
git push -u origin main
```

### ステップ4: 確認

GitHubのリポジトリページをブラウザで開き、ファイルがプッシュされたことを確認

## 🔐 SSH認証の設定（推奨）

HTTPSよりもSSHの方がパスワード入力なしで使えて便利です。

### SSH鍵の生成

```bash
# SSH鍵を生成（既にある場合はスキップ）
ssh-keygen -t ed25519 -C "your_email@example.com"

# SSH-agentを起動
eval "$(ssh-agent -s)"

# SSH鍵を追加
ssh-add ~/.ssh/id_ed25519

# 公開鍵をコピー
cat ~/.ssh/id_ed25519.pub
```

### GitHubにSSH鍵を登録

1. GitHubの Settings → SSH and GPG keys
2. 「New SSH key」をクリック
3. Titleに「Mac」など識別できる名前を入力
4. Keyに公開鍵をペースト
5. 「Add SSH key」をクリック

### SSH接続テスト

```bash
ssh -T git@github.com
# "Hi username! You've successfully authenticated..." と表示されればOK
```

## 👥 チームメンバーの追加

### リポジトリにコラボレーターを追加

1. GitHubのリポジトリページで Settings → Collaborators
2. 「Add people」をクリック
3. メンバーのGitHubユーザー名またはメールアドレスを入力
4. 権限を選択（Admin, Write, Readなど）
5. 招待を送信

### メンバーがリポジトリをクローン

```bash
# HTTPSの場合
git clone https://github.com/[ユーザー名]/ryouchiku-dashboard.git

# SSHの場合
git clone git@github.com:[ユーザー名]/ryouchiku-dashboard.git

cd ryouchiku-dashboard
npm install
cp .env.example .env
npx prisma generate
npm run dev
```

## 🔄 日常的なGitワークフロー

### 新しい機能を開発する

```bash
# 最新コードを取得
git pull origin main

# 新しいブランチを作成
git checkout -b feature/new-feature-name

# コードを編集...

# 変更をステージング
git add .

# コミット
git commit -m "feat: 新機能の説明"

# GitHubにプッシュ
git push origin feature/new-feature-name
```

### プルリクエストを作成

1. GitHubのリポジトリページで「Pull requests」タブ
2. 「New pull request」をクリック
3. baseブランチ: `main`、compareブランチ: `feature/new-feature-name`
4. タイトルと説明を記入
5. 「Create pull request」をクリック
6. レビュー後、「Merge pull request」でマージ

### メインブランチの更新を取り込む

```bash
# メインブランチに切り替え
git checkout main

# 最新コードを取得
git pull origin main

# 作業ブランチに最新コードをマージ
git checkout feature/your-branch
git merge main
```

## ⚠️ 注意事項

### Gitで管理しないもの（.gitignoreに含まれる）

- `node_modules/` - 依存関係（npm installで再生成）
- `.next/` - ビルドキャッシュ
- `.env` - 環境変数（機密情報）
- `prisma/dev.db` - データベースファイル

### Google Driveで管理するもの

- CSVデータファイル
- ドキュメント（セーブポイント、MEMORY.md）
- データベースバックアップ

### コミットメッセージの書き方

Conventional Commitsスタイルを推奨：

```
feat: 新機能追加
fix: バグ修正
docs: ドキュメント更新
style: コードフォーマット
refactor: リファクタリング
test: テスト追加
chore: ビルド・ツール設定変更
```

例：
```bash
git commit -m "feat: 週次KPI入力画面を追加"
git commit -m "fix: ダッシュボードの表示バグを修正"
git commit -m "docs: セットアップガイドを更新"
```

## 🛡 セキュリティ

### .envファイルの管理

- **.envは絶対にGitにコミットしない**
- `.gitignore`に含まれているか確認
- チーム内での共有は別の手段で（1Password、LastPassなど）

### 機密情報のチェック

```bash
# コミット前に機密情報が含まれていないか確認
git diff

# もし誤ってコミットした場合
git reset HEAD~1  # 直前のコミットを取り消し
```

## 📚 参考リンク

- [GitHub ドキュメント](https://docs.github.com/ja)
- [Git 基本コマンド](https://git-scm.com/book/ja/v2)
- [Conventional Commits](https://www.conventionalcommits.org/ja/v1.0.0/)
