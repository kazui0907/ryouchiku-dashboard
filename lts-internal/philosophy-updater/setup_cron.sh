#!/bin/bash
# Limitless AI ログ自動取得のcron設定スクリプト

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

echo "============================================================"
echo "  Limitless AI 自動取得 - cron設定"
echo "============================================================"
echo ""
echo "このスクリプトは以下を設定します："
echo "  - 毎週日曜 9:00 にLimitless AIログを自動取得"
echo "  - 取得後、自動的に経営思想を抽出"
echo ""
echo "現在のパス: $SCRIPT_DIR"
echo ""

# Pythonパスの確認
PYTHON_PATH=$(which python3)
if [ -z "$PYTHON_PATH" ]; then
    echo "❌ python3 が見つかりません"
    exit 1
fi
echo "✓ Python: $PYTHON_PATH"

# cronエントリの生成
CRON_ENTRY_FETCH="0 9 * * 0 cd $SCRIPT_DIR && $PYTHON_PATH fetch_limitless_logs.py >> $PROJECT_ROOT/.limitless/logs/fetch.log 2>&1"
CRON_ENTRY_EXTRACT="10 9 * * 0 cd $SCRIPT_DIR && $PYTHON_PATH extract_philosophy.py >> $PROJECT_ROOT/.limitless/logs/extract.log 2>&1"

echo ""
echo "以下のcronエントリを追加します："
echo ""
echo "【1】Limitless AIログ取得（毎週日曜 9:00）"
echo "$CRON_ENTRY_FETCH"
echo ""
echo "【2】経営思想抽出（毎週日曜 9:10）"
echo "$CRON_ENTRY_EXTRACT"
echo ""

# ログディレクトリの作成
mkdir -p "$PROJECT_ROOT/.limitless/logs"
echo "✓ ログディレクトリ作成: .limitless/logs/"

# 確認
read -p "cronに追加しますか？ (y/n): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "キャンセルしました"
    exit 0
fi

# 既存のcrontabを取得
TEMP_CRON=$(mktemp)
crontab -l > "$TEMP_CRON" 2>/dev/null || true

# 重複チェック
if grep -q "fetch_limitless_logs.py" "$TEMP_CRON"; then
    echo "⚠️  すでにcronに登録されています。更新しますか？"
    read -p "(y/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        # 既存のエントリを削除
        grep -v "fetch_limitless_logs.py" "$TEMP_CRON" > "${TEMP_CRON}.tmp"
        grep -v "extract_philosophy.py" "${TEMP_CRON}.tmp" > "$TEMP_CRON"
        rm "${TEMP_CRON}.tmp"
    else
        echo "キャンセルしました"
        rm "$TEMP_CRON"
        exit 0
    fi
fi

# cronエントリを追加
echo "" >> "$TEMP_CRON"
echo "# Limitless AI 自動取得 - 龍竹一生システム" >> "$TEMP_CRON"
echo "$CRON_ENTRY_FETCH" >> "$TEMP_CRON"
echo "$CRON_ENTRY_EXTRACT" >> "$TEMP_CRON"

# crontabに設定
crontab "$TEMP_CRON"
rm "$TEMP_CRON"

echo ""
echo "============================================================"
echo "  ✅ cron設定完了"
echo "============================================================"
echo ""
echo "【設定内容】"
echo "  - 毎週日曜 9:00: Limitless AIログ自動取得"
echo "  - 毎週日曜 9:10: 経営思想自動抽出"
echo ""
echo "【確認方法】"
echo "  crontab -l"
echo ""
echo "【ログ確認】"
echo "  tail -f $PROJECT_ROOT/.limitless/logs/fetch.log"
echo "  tail -f $PROJECT_ROOT/.limitless/logs/extract.log"
echo ""
echo "【手動実行でテスト】"
echo "  cd $SCRIPT_DIR"
echo "  python3 fetch_limitless_logs.py"
echo ""
