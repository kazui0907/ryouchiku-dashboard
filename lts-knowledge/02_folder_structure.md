# 02 フォルダ構成と命名規則 — Folder Structure & Naming Conventions

> **データとコードを明確に分離し、どこに何があるかを全員が即座に把握できる状態を維持する。**

---

## 1. 二つのストレージの役割分担

| ストレージ | 場所 | 置くもの | 置かないもの |
|-----------|------|----------|--------------|
| **Git（Dドライブ）** | `D:/scripts/` | ソースコード、n8nのJSONワークフロー、設定ファイル（`.env.example` など）、AIへの指示書（`CLAUDE.md`, `MEMORY.md`） | 人間用のドキュメント、スプレッドシート、画像・動画 |
| **Drive（Gドライブ）** | `G:/マイドライブ/` | 人間が読む資料、スプレッドシート、提案書、メディアファイル | ソースコード、秘密鍵、`.env` ファイル |

> **重要:** 本番の `.env` ファイル（API キーなどの秘密情報）はいかなる場合もGitにコミットしてはいけません。

---

## 2. Git（Dドライブ）のフォルダ構成

```
D:/scripts/
├── lts-knowledge/           # 全社共通ルールブック（このリポジトリ）
├── lts-internal/            # 社内ツール・スクリプト（philosophy-updater 等）
├── lts-sales-crm/           # 営業CRM（GAS）
├── it-homepage/             # ITソリューション部 Webサイト
├── lifeart-sales-auto/      # ライフアート 営業自動化スクレイパー
├── ryouchiku-dashboard/     # 経営ダッシュボード（Next.js）
├── gws-cli/                 # Google Workspace CLI ツール（Rust製）
├── {client-id}/             # 各クライアントのプロジェクト（例: sky-connect）
│   ├── n8n/                 # n8nワークフローのJSON
│   ├── scripts/             # 自動化スクリプト
│   └── README.md
└── ...
```

> ⚠️ **重要:** `D:/scripts/` 直下の各フォルダは、**それぞれが独立したGitリポジトリ**です。全体を1つのリポジトリにまとめることはしません。

> 📋 **クライアントリポジトリの命名規則・作成タイミング・テンプレートは `05_client_repo_rules.md` を参照。**

### 現在のGitHubリポジトリ一覧（2026-03-07時点）

| ローカルフォルダ | GitHubリポジトリ | 公開設定 | 用途 |
|-----------------|-----------------|---------|------|
| `lts-knowledge/` | `kazui0907/lts-knowledge` | Private | 全社共通ルールブック |
| `lts-internal/` | `kazui0907/lts-internal` | Private | 社内ツール・スクリプト |
| `lts-sales-crm/` | `kazui0907/lts-sales-crm` | Private | 営業CRM |
| `it-homepage/` | `kazui0907/it-homepage` | Private | ITソリューション部HP |
| `lifeart-sales-auto/` | `kazui0907/lifeart-sales-auto` | Private | ライフアート営業自動化 |
| `ryouchiku-dashboard/` | `kazui0907/ryouchiku-dashboard` | Private | 経営ダッシュボード |
| `gws-cli/` | `kazui0907/gws-cli` | Private | Google Workspace CLI |

---

## 3. Drive（Gドライブ）のフォルダ構成

階層は **最大2〜3段階** に抑え、フラットに保つ。

```
G:/マイドライブ/
├── 01_社内管理/            # 総務、経理、人事など社内向け資料
├── 02_自社事業(LTS)/       # LTS自社サービス・マーケティング資料
├── 03_グループ会社/        # グループ各社との共有資料
└── 04_clients/             # クライアント別資料
    ├── sky-connect_Sky Connect/
    ├── {client-id}_{正式クライアント名}/
    └── ...
```

---

## 4. 命名規則

### 4-1. プロジェクト・クライアントID（最重要）

**形式:** `半角英小文字` と `ハイフン（-）` のみを使用

```
OK: sky-connect, ltd-yamada, abc-corp
NG: SkyConnect, sky_connect, SKY-CONNECT, スカイコネクト
```

**このIDはGitのリポジトリ名とDriveのフォルダ名で必ず一致させる。**

| Git リポジトリ | Drive フォルダ |
|---------------|---------------|
| `D:/scripts/sky-connect/` | `04_clients/sky-connect_Sky Connect/` |

### 4-2. ファイル名

| 種類 | 形式 | 例 |
|------|------|----|
| ドキュメント（Markdown） | `{連番}_{内容}.md` | `01_company_mindset.md` |
| スクリプト | `snake_case.py` / `kebab-case.js` | `send_report.py` |
| n8nワークフロー | `{機能}_{バージョン}.json` | `line_notify_v2.json` |
| スプレッドシート | `{日付}_{内容}` | `2026-03-_顧客リスト` |

### 4-3. 禁止事項

- スペース（半角・全角とも）をファイル名・フォルダ名に使わない
- 日本語をGitのリポジトリ名・フォルダ名に使わない
- `new`, `最新版`, `修正済み`, `コピー` などの曖昧な接尾語を使わない（バージョン管理はGitで行う）

---

*最終更新: 2026-03-07*
