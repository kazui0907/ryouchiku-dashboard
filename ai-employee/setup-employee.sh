#!/bin/bash
# ============================================================
#  LTS AI Employee — 新社員AI組織セットアップ
#  使い方: bash setup-employee.sh
# ============================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
bash "$SCRIPT_DIR/_template/setup/wizard.sh"
