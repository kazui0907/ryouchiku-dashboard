---
description: ビルワン請求書を一括ダウンロード・印刷
---

# /billone

ビルワン（Bill One）から届いた請求書のPDFを一括でダウンロードし、印刷します。

## 引数
- `$ARGUMENTS` — 以下のオプションを指定可能:
  - `--days=N` : 過去N日以内の請求書を対象（デフォルト: 7）
  - `--list` : 一覧表示のみ（ダウンロードしない）
  - `--no-print` : ダウンロードのみ（印刷しない）

## 実行手順

1. 環境変数の確認
   - `BILLONE_EMAIL` と `BILLONE_PASSWORD` が設定されているか確認
   - 未設定の場合は `.env` ファイルの作成を案内

2. 請求書メールの検索
   ```bash
   node scripts/billone-invoice-helper.js list $ARGUMENTS
   ```

3. 一覧表示のみの場合はここで終了

4. PDFダウンロード＆印刷
   ```bash
   # 印刷あり
   node scripts/billone-invoice-helper.js print $ARGUMENTS

   # 印刷なし（--no-print が指定された場合）
   node scripts/billone-invoice-helper.js download $ARGUMENTS
   ```

5. 結果を報告
   - ダウンロードした件数
   - 保存先ディレクトリ
   - 印刷した場合はその件数

## 事前準備（初回のみ）

環境変数が未設定の場合、以下を案内してください：

```bash
# .envファイルを作成
cp .env.example .env

# .envを編集してBill Oneの認証情報を入力
# BILLONE_EMAIL=your-email@example.com
# BILLONE_PASSWORD=your-password
```

## エラー対応

- **Gmail APIエラー**: `gws auth status` で認証状態を確認
- **ログインエラー**: Bill Oneの認証情報（.env）を確認
- **ダウンロードエラー**: Bill OneのUI変更の可能性。スクリプトの更新が必要

## 例

```
/billone --days=7
/billone --days=30 --list
/billone --no-print
```
