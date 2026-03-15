#!/bin/bash
# ============================================================
#  LTS AI Employee セットアップウィザード
#  新しい社員のAI組織を対話形式で構築します
# ============================================================

set -e

TEMPLATE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)/_template"
AI_EMPLOYEE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
TODAY=$(date +"%Y-%m-%d")

# カラー定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m' # No Color

echo ""
echo -e "${CYAN}============================================================${NC}"
echo -e "${CYAN}${BOLD}  LTS AI Employee セットアップウィザード${NC}"
echo -e "${CYAN}  あなただけのAI組織を構築します${NC}"
echo -e "${CYAN}============================================================${NC}"
echo ""

# ============================================================
# Phase 1: 社員情報の入力
# ============================================================
echo -e "${BOLD}【Phase 1】 社員情報の入力${NC}"
echo ""

while true; do
  read -p "$(echo -e "${YELLOW}[1/7]${NC} 社員ID（英小文字・ドット可 例: k.ryochiku）: ")" EMPLOYEE_ID
  if [[ "$EMPLOYEE_ID" =~ ^[a-z][a-z0-9._-]*$ ]]; then
    break
  else
    echo -e "${RED}  ⚠ 半角英小文字・数字・ドット・ハイフンのみ使用できます${NC}"
  fi
done

# 既存チェック
if [ -d "$AI_EMPLOYEE_DIR/$EMPLOYEE_ID" ]; then
  echo -e "${RED}  ⚠ '$EMPLOYEE_ID' フォルダは既に存在します。別のIDを使用するか、既存フォルダを削除してください。${NC}"
  exit 1
fi

read -p "$(echo -e "${YELLOW}[2/7]${NC} 氏名（日本語 例: 龍竹一生）: ")" EMPLOYEE_NAME_JP
read -p "$(echo -e "${YELLOW}[3/7]${NC} 会社名（例: 株式会社ライフタイムサポート）: ")" COMPANY_NAME
read -p "$(echo -e "${YELLOW}[4/7]${NC} 役職（例: 代表取締役・ITコンサルタント）: ")" TITLE
read -p "$(echo -e "${YELLOW}[5/7]${NC} 業種・ビジネスの説明（1〜2文）: ")" BUSINESS_TYPE
read -p "$(echo -e "${YELLOW}[6/7]${NC} 主な責任領域（カンマ区切り 例: 経営判断,営業,IT管理）: ")" RESPONSIBILITIES
read -p "$(echo -e "${YELLOW}[7/7]${NC} よく使うツール（カンマ区切り 例: n8n,Google Workspace,Claude Code）: ")" TOOLS_USED

echo ""
read -p "$(echo -e "${YELLOW}[追加]${NC} 会社・業務の詳細コンテキスト（長文OK、Enterのみでスキップ）: ")" COMPANY_CONTEXT

echo ""

# ============================================================
# Phase 2: 部門の選択
# ============================================================
echo -e "${BOLD}【Phase 2】 部門の選択${NC}"
echo ""
echo "この社員のAI組織に含める部門を選択してください。"
echo -e "${CYAN}（番号をスペース区切りで入力 例: 1 2 6）${NC}"
echo ""
echo "  1) 営業部 (sales)          — 顧客開拓・提案・商談管理"
echo "  2) 業務推進部 (ops)         — 社内フロー・タスク管理・手順書"
echo "  3) 財務・経理部 (finance)   — 収支・請求・予算管理"
echo "  4) マーケティング部 (mkt)   — コンテンツ・SNS・集客"
echo "  5) 人事・採用部 (hr)        — 採用・育成・組織設計"
echo "  6) ITソリューション部 (it)  — 自動化・ツール開発・GWS管理"
echo "  7) 経営企画部 (strategy)    — KPI・事業計画・意思決定サポート"
echo ""
read -p "選択 > " DEPT_SELECTION

echo ""

# 選択された部門リストの構築
SELECTED_DEPTS=()
DEPT_TABLE=""
for num in $DEPT_SELECTION; do
  case $num in
    1) SELECTED_DEPTS+=("sales");     DEPT_TABLE="${DEPT_TABLE}| 営業部 | \`dept-sales\` | 顧客開拓・提案書・商談管理・CRM |\n" ;;
    2) SELECTED_DEPTS+=("ops");       DEPT_TABLE="${DEPT_TABLE}| 業務推進部 | \`dept-ops\` | 社内フロー・タスク管理・手順書・議事録 |\n" ;;
    3) SELECTED_DEPTS+=("finance");   DEPT_TABLE="${DEPT_TABLE}| 財務・経理部 | \`dept-finance\` | 請求書・収支・予算・価格設定 |\n" ;;
    4) SELECTED_DEPTS+=("marketing"); DEPT_TABLE="${DEPT_TABLE}| マーケティング部 | \`dept-marketing\` | SNS・コンテンツ・広告・ブランディング |\n" ;;
    5) SELECTED_DEPTS+=("hr");        DEPT_TABLE="${DEPT_TABLE}| 人事・採用部 | \`dept-hr\` | 採用・育成・評価制度・組織設計 |\n" ;;
    6) SELECTED_DEPTS+=("it");        DEPT_TABLE="${DEPT_TABLE}| ITソリューション部 | \`dept-it\` | 自動化・n8n・GAS・API連携・GWS管理 |\n" ;;
    7) SELECTED_DEPTS+=("strategy");  DEPT_TABLE="${DEPT_TABLE}| 経営企画部 | \`dept-strategy\` | KPI・事業計画・市場調査・意思決定サポート |\n" ;;
  esac
done

FULL_DEPT_TABLE="| 部門 | エージェント名 | 担当領域 |\n|------|--------------|----------|\n${DEPT_TABLE}"

# ============================================================
# Phase 3: 部門別コンテキストの入力（選択した部門のみ）
# ============================================================
echo -e "${BOLD}【Phase 3】 部門別コンテキストの入力${NC}"
echo ""
echo "選択した各部門の詳細を教えてください（Enterのみでスキップ可）。"
echo ""

SALES_CONTEXT=""; IT_CONTEXT=""; STRATEGY_CONTEXT=""
FINANCE_CONTEXT=""; OPS_CONTEXT=""; HR_CONTEXT=""; MARKETING_CONTEXT=""

for dept in "${SELECTED_DEPTS[@]}"; do
  case $dept in
    sales)
      read -p "$(echo -e "${YELLOW}[営業部]${NC} 主なターゲット顧客・営業スタイルを教えてください: ")" SALES_CONTEXT ;;
    it)
      read -p "$(echo -e "${YELLOW}[ITソリューション部]${NC} 主な技術領域・クライアントのIT支援内容: ")" IT_CONTEXT ;;
    strategy)
      read -p "$(echo -e "${YELLOW}[経営企画部]${NC} 経営上の主な課題・重視しているKPI: ")" STRATEGY_CONTEXT ;;
    finance)
      read -p "$(echo -e "${YELLOW}[財務・経理部]${NC} 主な収益モデル・管理している費目: ")" FINANCE_CONTEXT ;;
    ops)
      read -p "$(echo -e "${YELLOW}[業務推進部]${NC} 改善したい業務フロー・使用中のタスク管理ツール: ")" OPS_CONTEXT ;;
    hr)
      read -p "$(echo -e "${YELLOW}[人事・採用部]${NC} 採用状況・組織規模・文化: ")" HR_CONTEXT ;;
    marketing)
      read -p "$(echo -e "${YELLOW}[マーケティング部]${NC} 主な発信チャネル・ターゲット: ")" MARKETING_CONTEXT ;;
  esac
done

echo ""

# ============================================================
# Phase 4: 確認
# ============================================================
echo -e "${BOLD}【Phase 4】 設定確認${NC}"
echo ""
echo -e "${CYAN}============================================================${NC}"
echo -e " 社員フォルダ: ${BOLD}$AI_EMPLOYEE_DIR/$EMPLOYEE_ID/${NC}"
echo -e " 氏名:         ${BOLD}$EMPLOYEE_NAME_JP${NC}"
echo -e " 会社:         ${BOLD}$COMPANY_NAME${NC}"
echo -e " 役職:         ${BOLD}$TITLE${NC}"
echo -e " 部門数:       ${BOLD}${#SELECTED_DEPTS[@]} 部門${NC}（${SELECTED_DEPTS[*]}）"
echo -e "${CYAN}============================================================${NC}"
echo ""
read -p "以上の設定でAI組織を作成しますか？ (y/n) > " CONFIRM

if [[ "$CONFIRM" != "y" && "$CONFIRM" != "Y" ]]; then
  echo "キャンセルしました。"
  exit 0
fi

echo ""
echo -e "${GREEN}作成中...${NC}"
echo ""

# ============================================================
# Phase 5: ファイル生成
# ============================================================
EMPLOYEE_DIR="$AI_EMPLOYEE_DIR/$EMPLOYEE_ID"
mkdir -p "$EMPLOYEE_DIR/.claude/agents"

# sed用のエスケープ関数
escape_sed() {
  echo "$1" | sed 's/[\/&]/\\&/g' | sed 's/$/\\n/' | tr -d '\n' | sed 's/\\n$//'
}

ESC_NAME=$(escape_sed "$EMPLOYEE_NAME_JP")
ESC_ID=$(escape_sed "$EMPLOYEE_ID")
ESC_COMPANY=$(escape_sed "$COMPANY_NAME")
ESC_TITLE=$(escape_sed "$TITLE")
ESC_BUSINESS=$(escape_sed "$BUSINESS_TYPE")
ESC_RESP=$(escape_sed "$RESPONSIBILITIES")
ESC_TOOLS=$(escape_sed "$TOOLS_USED")
ESC_CONTEXT=$(escape_sed "${COMPANY_CONTEXT:-（未設定）}")
ESC_TABLE=$(echo -e "$FULL_DEPT_TABLE")
ESC_DATE=$(escape_sed "$TODAY")

# CLAUDE.md を生成
sed \
  -e "s/{{EMPLOYEE_NAME_JP}}/$ESC_NAME/g" \
  -e "s/{{EMPLOYEE_ID}}/$ESC_ID/g" \
  -e "s/{{COMPANY_NAME}}/$ESC_COMPANY/g" \
  -e "s/{{TITLE}}/$ESC_TITLE/g" \
  -e "s/{{BUSINESS_TYPE}}/$ESC_BUSINESS/g" \
  -e "s/{{RESPONSIBILITIES}}/$ESC_RESP/g" \
  -e "s/{{TOOLS_USED}}/$ESC_TOOLS/g" \
  -e "s/{{COMPANY_CONTEXT}}/$ESC_CONTEXT/g" \
  "$TEMPLATE_DIR/CLAUDE.md" > "$EMPLOYEE_DIR/CLAUDE.md"

# 部門テーブルを CLAUDE.md に挿入（sedでは改行難しいのでPythonで処理）
python3 - <<PYEOF
import re

with open('$EMPLOYEE_DIR/CLAUDE.md', 'r', encoding='utf-8') as f:
    content = f.read()

dept_table = """$FULL_DEPT_TABLE"""

content = content.replace('{{DEPARTMENT_TABLE}}', dept_table)

with open('$EMPLOYEE_DIR/CLAUDE.md', 'w', encoding='utf-8') as f:
    f.write(content)
PYEOF

# MEMORY.md を生成
sed \
  -e "s/{{EMPLOYEE_NAME_JP}}/$ESC_NAME/g" \
  -e "s/{{DATE}}/$ESC_DATE/g" \
  "$TEMPLATE_DIR/MEMORY.md" > "$EMPLOYEE_DIR/MEMORY.md"

# settings.json をコピー
cp "$TEMPLATE_DIR/.claude/settings.json" "$EMPLOYEE_DIR/.claude/settings.json"

# 選択した部門エージェントをコピー・カスタマイズ
for dept in "${SELECTED_DEPTS[@]}"; do
  AGENT_SRC="$TEMPLATE_DIR/.claude/agents/dept-${dept}.md"
  AGENT_DST="$EMPLOYEE_DIR/.claude/agents/dept-${dept}.md"

  if [ ! -f "$AGENT_SRC" ]; then
    echo -e "${YELLOW}  ⚠ テンプレートが見つかりません: dept-${dept}.md（スキップ）${NC}"
    continue
  fi

  # コンテキストの設定
  case $dept in
    sales)     DEPT_CTX="${SALES_CONTEXT:-（追記予定）}" ;;
    it)        DEPT_CTX="${IT_CONTEXT:-（追記予定）}" ;;
    strategy)  DEPT_CTX="${STRATEGY_CONTEXT:-（追記予定）}" ;;
    finance)   DEPT_CTX="${FINANCE_CONTEXT:-（追記予定）}" ;;
    ops)       DEPT_CTX="${OPS_CONTEXT:-（追記予定）}" ;;
    hr)        DEPT_CTX="${HR_CONTEXT:-（追記予定）}" ;;
    marketing) DEPT_CTX="${MARKETING_CONTEXT:-（追記予定）}" ;;
  esac

  ESC_DEPT_CTX=$(escape_sed "$DEPT_CTX")
  DEPT_UPPER=$(echo "$dept" | tr '[:lower:]' '[:upper:]')

  sed \
    -e "s/{{EMPLOYEE_NAME_JP}}/$ESC_NAME/g" \
    -e "s/{{COMPANY_NAME}}/$ESC_COMPANY/g" \
    -e "s/{{SALES_CONTEXT}}/$ESC_DEPT_CTX/g" \
    -e "s/{{IT_CONTEXT}}/$ESC_DEPT_CTX/g" \
    -e "s/{{STRATEGY_CONTEXT}}/$ESC_DEPT_CTX/g" \
    -e "s/{{FINANCE_CONTEXT}}/$ESC_DEPT_CTX/g" \
    -e "s/{{OPS_CONTEXT}}/$ESC_DEPT_CTX/g" \
    -e "s/{{HR_CONTEXT}}/$ESC_DEPT_CTX/g" \
    -e "s/{{MARKETING_CONTEXT}}/$ESC_DEPT_CTX/g" \
    "$AGENT_SRC" > "$AGENT_DST"

  echo -e "  ${GREEN}✓${NC} dept-${dept}.md を作成"
done

# ============================================================
# 完了メッセージ
# ============================================================
echo ""
echo -e "${GREEN}============================================================${NC}"
echo -e "${GREEN}${BOLD}  AI組織の構築が完了しました！${NC}"
echo -e "${GREEN}============================================================${NC}"
echo ""
echo -e " ${BOLD}フォルダ:${NC} $EMPLOYEE_DIR"
echo ""
echo -e " ${BOLD}使い方:${NC}"
echo -e "   cd $EMPLOYEE_DIR"
echo -e "   claude"
echo ""
echo -e " Claude Codeを起動すると、${BOLD}$EMPLOYEE_NAME_JP さんの社長エージェント${NC}として"
echo -e " 動作し、選択した部門に自動的に仕事を委任します。"
echo ""
echo -e " ${YELLOW}ヒント:${NC} CLAUDE.md や MEMORY.md を編集して"
echo -e "         より詳細なコンテキストを追加するとAIがより賢く動きます。"
echo ""
