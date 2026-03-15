#!/bin/bash
# 2025年12月18日から昨日までのログを取得

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "============================================================"
echo "  Limitless AI ログ取得（2025-12-18〜昨日）"
echo "============================================================"
echo ""

# Pythonパスの確認
PYTHON_PATH=$(which python3)
if [ -z "$PYTHON_PATH" ]; then
    echo "❌ python3 が見つかりません"
    exit 1
fi

cd "$SCRIPT_DIR"

echo "📅 期間: 2025年12月18日 〜 昨日"
echo ""

# 2025-12-18から昨日までのログを取得
$PYTHON_PATH fetch_limitless_logs.py --start-date 2025-12-18 --end-date $(date -v-1d +%Y-%m-%d)

EXIT_CODE=$?

if [ $EXIT_CODE -eq 0 ]; then
    echo ""
    echo "============================================================"
    echo "  ✅ 取得完了"
    echo "============================================================"
    echo ""
    echo "【次のステップ】"
    echo "1. 取得したログを確認:"
    echo "   ls -lh ../../.limitless/raw-logs/"
    echo ""
    echo "2. 経営思想を抽出:"
    echo "   python3 extract_philosophy.py"
    echo ""
else
    echo ""
    echo "============================================================"
    echo "  ❌ エラーが発生しました"
    echo "============================================================"
    echo ""
fi

exit $EXIT_CODE
