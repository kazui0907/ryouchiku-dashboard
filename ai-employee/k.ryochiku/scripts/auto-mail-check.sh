#!/bin/bash
# LTS Mail Auto-Check Script
# Claude Codeを起動してメール処理を実行

# 環境変数を読み込み
export PATH="/usr/local/bin:/opt/homebrew/bin:$PATH"

# 作業ディレクトリ
WORK_DIR="/Users/kazui/scripts/ai-employee/k.ryochiku"
LOG_FILE="$WORK_DIR/logs/auto-mail.log"

# ログディレクトリ作成
mkdir -p "$WORK_DIR/logs"

# タイムスタンプ
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')

echo "[$TIMESTAMP] === Auto Mail Check Started ===" >> "$LOG_FILE"

# Claude Codeを実行（--print モードで非対話実行、権限チェックをスキップ）
cd "$WORK_DIR"
claude --print --dangerously-skip-permissions "メール自動処理を実行してください。Google Driveの指示ファイルを確認し、承認済みメールの送信、修正指示への対応、新着メールの処理を行ってください。" >> "$LOG_FILE" 2>&1

TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')
echo "[$TIMESTAMP] === Auto Mail Check Completed ===" >> "$LOG_FILE"
echo "" >> "$LOG_FILE"
