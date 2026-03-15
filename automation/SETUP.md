# マネーフォワード自動エクスポート セットアップ手順

## 概要

このスクリプトは、マネーフォワード クラウド会計から月次推移表（損益計算書・貸借対照表）を自動でエクスポートし、ダッシュボードAPIにアップロードします。

### 処理フロー

```
GitHub Actions (手動 or 毎月1日)
    ↓
Playwright でマネーフォワードにログイン
    ↓
メール認証コードを Gmail API で取得
    ↓
レポート → 推移表 → CSV ダウンロード
    ↓
ダッシュボード API にアップロード
    ↓
Slack 通知（オプション）
```

---

## 1. Gmail API の設定

### 1.1 Google Cloud Console でプロジェクト作成

1. [Google Cloud Console](https://console.cloud.google.com/) にアクセス
2. 新しいプロジェクトを作成（例: `mf-automation`）
3. 「APIとサービス」→「ライブラリ」→「Gmail API」を有効化

### 1.2 OAuth 認証情報の作成

1. 「APIとサービス」→「認証情報」→「認証情報を作成」→「OAuthクライアントID」
2. アプリケーションの種類: **デスクトップアプリ**
3. 名前: `MF Automation`
4. 作成後、**クライアントID** と **クライアントシークレット** をメモ

### 1.3 リフレッシュトークンの取得

以下のスクリプトを実行してリフレッシュトークンを取得:

```bash
cd automation
npx tsx get-gmail-token.ts
```

ブラウザで認証後、表示される **リフレッシュトークン** をメモ

---

## 2. GitHub Secrets の設定

GitHub リポジトリの Settings → Secrets and variables → Actions で以下を設定:

| Secret 名 | 説明 | 例 |
|-----------|------|-----|
| `MF_EMAIL` | マネーフォワードのログインメール | user@example.com |
| `MF_PASSWORD` | マネーフォワードのパスワード | ******** |
| `GMAIL_CLIENT_ID` | Google OAuth クライアントID | 123456789.apps.googleusercontent.com |
| `GMAIL_CLIENT_SECRET` | Google OAuth クライアントシークレット | GOCSPX-xxxxx |
| `GMAIL_REFRESH_TOKEN` | Gmail API リフレッシュトークン | 1//xxxxx |
| `DASHBOARD_API_URL` | ダッシュボードのアップロードAPI | https://lts-dashboard.vercel.app/api/admin/upload |
| `API_SECRET` | API認証用シークレット（任意の文字列） | your-secret-key-here |
| `SLACK_WEBHOOK_URL` | Slack通知用（オプション） | https://hooks.slack.com/services/xxx |

### API_SECRET の設定

1. 任意の安全な文字列を生成（例: `openssl rand -hex 32`）
2. GitHub Secrets に `API_SECRET` として設定
3. Vercel の環境変数にも同じ値を `API_SECRET` として設定

---

## 3. Vercel 環境変数の設定

Vercel Dashboard → Project Settings → Environment Variables で追加:

| 変数名 | 値 |
|--------|-----|
| `API_SECRET` | GitHub Secrets と同じ値 |

---

## 4. 実行方法

### 手動実行

1. GitHub リポジトリの「Actions」タブを開く
2. 「マネーフォワード自動エクスポート」を選択
3. 「Run workflow」をクリック
4. オプションを選択して実行

### 定期実行

毎月1日 AM9:00 (JST) に自動実行されます。

### ローカル実行（テスト用）

```bash
cd automation
cp ../.env.example .env.local
# .env.local を編集して認証情報を設定
npm install
npm run export:local
```

---

## 5. トラブルシューティング

### 認証コードが取得できない

- Gmail API の権限を確認（`gmail.readonly` が必要）
- リフレッシュトークンが有効か確認
- マネーフォワードからのメールが迷惑メールに入っていないか確認

### ログインに失敗する

- MF_EMAIL / MF_PASSWORD が正しいか確認
- マネーフォワードの画面構成が変わっていないか確認
- スクリーンショット（artifacts）を確認

### CSVダウンロードに失敗する

- レポート画面の構成が変わっていないか確認
- 対象年度にデータが存在するか確認

### API アップロードに失敗する

- DASHBOARD_API_URL が正しいか確認
- API_SECRET が Vercel と一致しているか確認
- Vercel のログを確認

---

## 6. セキュリティ上の注意

- **認証情報は絶対に Git にコミットしない**
- GitHub Secrets と Vercel 環境変数のみで管理
- API_SECRET は十分な長さ（32文字以上推奨）を使用
- 定期的にパスワード・トークンを更新することを推奨
