# LTS 社内ツール ルールブック

## プロジェクト概要

株式会社ライフタイムサポートの社内自動化ツール群。
龍竹一生の思考ログ（Limitless AI）を自動取得・蓄積・分析するシステムが中心。

## ツール構成

```
lts-internal/
├── docs/                          ← 設計ドキュメント・コスト比較
│   ├── ai-cost-comparison.md
│   ├── limitless-ai-auto-export.md
│   ├── limitless-ai-setup.md
│   └── REBUILD_PROMPT.md
└── philosophy-updater/            ← 経営思想抽出システム（メインツール）
    ├── fetch_limitless_logs.py    ← Limitless AI API からログ取得
    ├── limitless_auto_export.py   ← 自動エクスポート（定期実行用）
    ├── extract_philosophy.py      ← AI による経営思想抽出
    ├── auto_watch.py              ← ファイル変更監視・自動実行
    ├── test_limitless_api.py      ← API 接続テスト
    ├── requirements.txt           ← Python 依存パッケージ
    └── setup_cron.sh              ← cron 設定スクリプト
```

## 技術スタック

- **言語:** Python 3.x
- **AI:** Gemini 2.5 Flash（低コスト優先）/ Claude API（高品質が必要な場合）
- **外部サービス:** Limitless AI API、Google Sheets API
- **実行環境:** ローカル Windows（定期実行は Windows タスクスケジューラ）

## AI モデル選択基準

| ケース | 推奨モデル | 理由 |
|--------|-----------|------|
| 日常的な思想抽出（週1回以上） | Gemini 2.5 Flash | コスト約0.2円/回（Claude の50分の1） |
| 高品質な分析・重要な出力 | Claude Sonnet 4.6 | 精度優先 |

詳細: `docs/ai-cost-comparison.md` 参照

## セットアップ

```bash
cd philosophy-updater
pip install -r requirements.txt
# 初回セットアップは LIMITLESS_SETUP.md を参照
```

## 作業ルール

- スクリプトを変更したら必ず `test_limitless_api.py` で接続確認する
- API キーは `.env` ファイルで管理し、絶対に Git にコミットしない
- 新しいスクリプトを追加する場合は `docs/` に設計ドキュメントも追加する
- このリポジトリは社内専用（Private リポジトリ必須）

---

## クレデンシャル管理ルール

**トークン・APIキーを取得/受領した場合は、必ず `lts-knowledge/06_credentials.md` に記録すること。**

- 記録内容: サービス名・用途・キーの値・取得日・有効期限
- トークンやAPIキーが必要になった場合は、まず `lts-knowledge/06_credentials.md` を確認してから質問する
