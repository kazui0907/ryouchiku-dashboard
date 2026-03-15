#!/bin/bash
# 初回実行: 過去3ヶ月分のLimitless AIログを取得

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "============================================================"
echo "  初回実行: 過去3ヶ月分のログ取得"
echo "============================================================"
echo ""
echo "過去3ヶ月分のLimitless AIログをAPI経由で取得します。"
echo ""

# Pythonパスの確認
PYTHON_PATH=$(which python3)
if [ -z "$PYTHON_PATH" ]; then
    echo "❌ python3 が見つかりません"
    exit 1
fi

# 実行確認
read -p "実行しますか？ (y/n): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "キャンセルしました"
    exit 0
fi

cd "$SCRIPT_DIR"

echo ""
echo "📥 過去90日間のログを取得中..."
echo ""

# 過去90日間のログを取得
$PYTHON_PATH fetch_limitless_logs.py --days 90

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
    echo "3. 結果を確認:"
    echo "   cat ../../CLAUDE.md | head -50"
    echo ""
else
    echo ""
    echo "============================================================"
    echo "  ❌ エラーが発生しました"
    echo "============================================================"
    echo ""
    echo "【トラブルシューティング】"
    echo "1. エラーメッセージを確認して、APIエンドポイントを調整"
    echo "2. Limitless AIのドキュメントでAPI仕様を確認"
    echo "3. 手動で実行してデバッグ:"
    echo "   python3 fetch_limitless_logs.py --days 90"
    echo ""
fi

exit $EXIT_CODE
