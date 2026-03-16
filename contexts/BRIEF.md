# プロジェクト概要

龍竹一生グループの経営管理会計システム。月次損益計算書・週次KPI・予算管理を一元管理し、Webダッシュボードで可視化する。

CSVファイル（Googleドライブ共有ドライブ上）をデータソースとし、Web管理画面またはローカルスクリプトでDBに取り込む。Vercel上でホスティングし、GitHubプッシュで自動デプロイされる。

---

## 本番環境

| 項目 | URL / 情報 |
|------|------------|
| **Webアプリ** | https://ryouchiku-dashboard.vercel.app/ |
| **管理画面（アップロード）** | https://ryouchiku-dashboard.vercel.app/admin/upload |
| **GitHub** | https://github.com/LTS0907/ryouchiku-dashboard |
| **データベース** | Supabase PostgreSQL（Singaporeリージョン） |
| **ホスティング** | Vercel（GitHubプッシュで自動デプロイ） |

---

## 注意事項

- `.env` は `.gitignore` で除外済み。Gitにコミットしないこと
- GitHubにプッシュすると Vercel が自動デプロイされる
- CSVを更新したら `/admin/upload` から再アップロードすること
- `marginProfitRate`（限界利益率）はCSVの値をそのまま格納（例: `37.86` = 37.86%）
