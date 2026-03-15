# LTS AI Employee — AI組織システム

各社員が自分だけのAI会社を経営できる仕組みです。
社長エージェント（オーケストレーター）が部門サブエージェントに仕事を委任します。

---

## 構造

```
ai-employee/
├── README.md               ← このファイル
├── setup-employee.sh       ← 新社員の追加（ウィザード起動）
├── _template/              ← テンプレート（変更不要）
│   ├── CLAUDE.md           ← 社長エージェントテンプレート
│   ├── MEMORY.md           ← 永続メモリテンプレート
│   ├── .claude/
│   │   ├── settings.json
│   │   └── agents/         ← 部門エージェントテンプレート
│   │       ├── dept-sales.md
│   │       ├── dept-it.md
│   │       ├── dept-strategy.md
│   │       ├── dept-finance.md
│   │       ├── dept-ops.md
│   │       ├── dept-hr.md
│   │       └── dept-marketing.md
│   └── setup/
│       └── wizard.sh       ← ウィザード本体
└── k.ryochiku/             ← 社員フォルダ（例）
    ├── CLAUDE.md           ← この社員の社長エージェント
    ├── MEMORY.md           ← 永続メモリ
    └── .claude/
        ├── settings.json
        └── agents/         ← この社員の部門エージェント
            ├── dept-sales.md
            ├── dept-it.md
            ├── dept-strategy.md
            ├── dept-finance.md
            └── dept-ops.md
```

---

## 新しい社員を追加する方法

```bash
bash /d/scripts/ai-employee/setup-employee.sh
```

質問に答えるだけで自動的にフォルダとエージェントが作成されます。

**質問内容（全7問＋部門設定）:**
1. 社員ID（例: m.tanaka）
2. 氏名（日本語）
3. 会社名
4. 役職
5. 業種・ビジネス説明
6. 主な責任領域
7. よく使うツール
8. 部門の選択（営業/業務推進/財務/マーケ/人事/IT/経営企画）
9. 各部門のコンテキスト（任意）

---

## 使い方

```bash
# 社員のAI組織を起動する
cd /d/scripts/ai-employee/k.ryochiku
claude
```

Claude Codeを起動すると、その社員の**社長エージェント**として動作します。
タスクを話しかけると、自動的に適切な部門エージェントに委任されます。

**例:**
- 「sky-connectへの提案メールを作って」→ 営業部エージェントに委任
- 「n8nで請求書自動化を設計して」→ ITソリューション部エージェントに委任
- 「Q4の事業計画を作って」→ 経営企画部エージェントに委任

---

## 部門エージェント一覧

| 部門 | ファイル名 | 主な担当 |
|------|----------|---------|
| 営業部 | `dept-sales.md` | 顧客開拓・提案・商談管理 |
| 業務推進部 | `dept-ops.md` | 社内フロー・手順書・議事録 |
| 財務・経理部 | `dept-finance.md` | 収支・請求・予算 |
| マーケティング部 | `dept-marketing.md` | コンテンツ・SNS・集客 |
| 人事・採用部 | `dept-hr.md` | 採用・育成・組織設計 |
| ITソリューション部 | `dept-it.md` | 自動化・ツール開発・GWS |
| 経営企画部 | `dept-strategy.md` | KPI・事業計画・意思決定 |

---

## カスタマイズ

各社員フォルダの以下のファイルを編集してAIをより賢くできます：

- **`CLAUDE.md`**: 社長エージェントの指示書（役割・委任ルール・コンテキスト）
- **`MEMORY.md`**: 永続メモリ（進行中プロジェクト・重要な決定事項）
- **`.claude/agents/dept-*.md`**: 各部門エージェントの専門知識・指示書

---

*LTS AI Employee System — 2026-03-11 構築*
