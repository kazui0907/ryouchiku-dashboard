#!/usr/bin/env python3
"""
Limitless AI APIからログを自動取得するスクリプト

使用方法:
    # 過去7日間のログを取得（週次実行用）
    python fetch_limitless_logs.py

    # 2025-12-18から昨日までのログを取得
    python fetch_limitless_logs.py --start-date 2025-12-18 --end-date 2026-03-03

    # カスタム期間
    python fetch_limitless_logs.py --start-date 2025-12-01 --end-date 2026-03-04
"""

import os
import sys
import json
import requests
import argparse
import time
from datetime import datetime, timedelta
from pathlib import Path
from dotenv import load_dotenv

# 環境変数の読み込み
load_dotenv()

# 設定
SCRIPT_DIR = Path(__file__).parent
RAW_LOGS_DIR = SCRIPT_DIR / os.getenv('RAW_LOGS_DIR', '../../.limitless/raw-logs')
API_KEY = os.getenv('LIMITLESS_API_KEY')

# Limitless AI API設定
LIMITLESS_API_BASE = "https://api.limitless.ai"
LIMITLESS_API_ENDPOINT = f"{LIMITLESS_API_BASE}/v1/lifelogs"


def fetch_logs(start_date: datetime, end_date: datetime) -> list:
    """Limitless AI APIからログを取得（ページネーション対応、途中保存機能付き）"""

    if not API_KEY:
        raise ValueError("LIMITLESS_API_KEY が設定されていません")

    print(f"📅 期間: {start_date.strftime('%Y-%m-%d')} 〜 {end_date.strftime('%Y-%m-%d')}")
    print(f"🌐 API接続中...")

    headers = {
        "X-API-Key": API_KEY,
        "Content-Type": "application/json"
    }

    # ISO-8601形式に変換
    start_iso = start_date.isoformat()
    end_iso = end_date.isoformat()

    all_lifelogs = []
    cursor = None
    page = 1
    max_retries = 3

    try:
        while True:
            retry_count = 0
            success = False

            while retry_count < max_retries and not success:
                try:
                    print(f"  ページ {page} 取得中...", end="", flush=True)

                    params = {
                        "start": start_iso,
                        "end": end_iso,
                        "limit": 10,  # 最大値
                        "direction": "asc"  # 古い順
                    }

                    if cursor:
                        params["cursor"] = cursor

                    response = requests.get(
                        LIMITLESS_API_ENDPOINT,
                        headers=headers,
                        params=params,
                        timeout=60  # 30秒から60秒に延長
                    )

                    response.raise_for_status()
                    data = response.json()

                    # lifelogsを取得
                    lifelogs = data.get("data", {}).get("lifelogs", [])
                    all_lifelogs.extend(lifelogs)

                    print(f" {len(lifelogs)} 件 (合計 {len(all_lifelogs)} 件)")

                    # 次のカーソルを確認
                    next_cursor = data.get("meta", {}).get("lifelogs", {}).get("nextCursor")

                    if not next_cursor or len(lifelogs) == 0:
                        success = True
                        break

                    cursor = next_cursor
                    page += 1
                    success = True

                    # API負荷軽減のため少し待機
                    time.sleep(0.5)

                except requests.exceptions.Timeout:
                    retry_count += 1
                    if retry_count < max_retries:
                        print(f" タイムアウト、リトライ {retry_count}/{max_retries}...")
                        time.sleep(2)
                    else:
                        print(f" タイムアウト（最大リトライ回数到達）")
                        raise

                except requests.exceptions.RequestException as e:
                    retry_count += 1
                    if retry_count < max_retries:
                        print(f" エラー、リトライ {retry_count}/{max_retries}...")
                        time.sleep(2)
                    else:
                        print(f" エラー（最大リトライ回数到達）")
                        raise

            if not success or not next_cursor or len(lifelogs) == 0:
                break

        print(f"✓ API接続成功 - 合計 {len(all_lifelogs)} 件取得")
        return all_lifelogs

    except Exception as e:
        # エラー時でも取得済みデータを返す
        if all_lifelogs:
            print(f"\n⚠️  エラーが発生しましたが、{len(all_lifelogs)} 件は取得済みです")
            print(f"   取得済みデータを保存します...")
            return all_lifelogs
        else:
            raise


def save_logs(lifelogs: list, start_date: datetime, end_date: datetime, partial: bool = False) -> Path:
    """取得したログを保存"""

    logs_dir = RAW_LOGS_DIR.resolve()
    logs_dir.mkdir(parents=True, exist_ok=True)

    # ファイル名の生成
    if (end_date - start_date).days <= 7:
        # 週次取得の場合
        filename = f"limitless_{end_date.strftime('%Y%m%d')}.txt"
    else:
        # 期間指定の場合
        filename = f"limitless_{start_date.strftime('%Y%m%d')}_to_{end_date.strftime('%Y%m%d')}.txt"

    if partial:
        # 部分取得の場合はファイル名に追記
        filename = filename.replace('.txt', '_partial.txt')

    output_path = logs_dir / filename

    # データの整形と保存
    with open(output_path, 'w', encoding='utf-8') as f:
        f.write(f"# Limitless AI ログ (Lifelogs)\n")
        f.write(f"# 取得日時: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
        f.write(f"# 期間: {start_date.strftime('%Y-%m-%d')} 〜 {end_date.strftime('%Y-%m-%d')}\n")
        f.write(f"# 件数: {len(lifelogs)}\n")
        if partial:
            f.write(f"# 状態: 部分取得（途中でエラー発生）\n")
        f.write("\n")
        f.write("=" * 80 + "\n\n")

        for i, lifelog in enumerate(lifelogs, 1):
            lifelog_id = lifelog.get('id', 'unknown')
            title = lifelog.get('title', '(タイトルなし)')
            markdown = lifelog.get('markdown', '')
            start_time = lifelog.get('startTime', '')
            end_time = lifelog.get('endTime', '')
            is_starred = lifelog.get('isStarred', False)

            f.write(f"## [{i}/{len(lifelogs)}] {title}\n\n")

            if start_time:
                f.write(f"**開始**: {start_time}\n")
            if end_time:
                f.write(f"**終了**: {end_time}\n")
            if is_starred:
                f.write(f"**スター**: ⭐\n")

            f.write(f"**ID**: {lifelog_id}\n\n")

            if markdown:
                f.write(f"{markdown}\n")
            else:
                f.write("(内容なし)\n")

            f.write("\n" + "-" * 80 + "\n\n")

    status = "（部分）" if partial else ""
    print(f"💾 保存: {filename} ({len(lifelogs)} Lifelogs{status})")
    return output_path


def main():
    """メイン処理"""
    parser = argparse.ArgumentParser(description='Limitless AI ログ取得')
    parser.add_argument('--days', type=int, default=7, help='過去N日間のログを取得（デフォルト: 7）')
    parser.add_argument('--start-date', type=str, help='開始日（YYYY-MM-DD形式）')
    parser.add_argument('--end-date', type=str, help='終了日（YYYY-MM-DD形式）')

    args = parser.parse_args()

    print("=" * 60)
    print("  Limitless AI ログ自動取得")
    print("=" * 60)

    # 期間の設定
    if args.start_date and args.end_date:
        start_date = datetime.strptime(args.start_date, '%Y-%m-%d')
        end_date = datetime.strptime(args.end_date, '%Y-%m-%d')
    else:
        end_date = datetime.now()
        start_date = end_date - timedelta(days=args.days)

    partial = False

    try:
        # 1. ログ取得
        lifelogs = fetch_logs(start_date, end_date)

        if not lifelogs:
            print("\n⚠️  データが見つかりませんでした")
            print("   指定期間にLifelogが存在しない可能性があります")
            return 0

    except Exception as e:
        print("\n" + "=" * 60)
        print("  ❌ エラーが発生しました")
        print("=" * 60)
        print(f"\n{e}")
        print("\n【トラブルシューティング】")
        print("1. APIキーが正しいか確認: .env の LIMITLESS_API_KEY")
        print(f"   現在のAPIキー: {API_KEY[:20] if API_KEY else '(未設定)'}...")
        print("2. 期間指定が正しいか確認")
        print("3. Limitless AIダッシュボードでAPIキーの有効性を確認")
        print("   https://www.limitless.ai/developers")
        print("\n取得済みデータがある場合は保存されています。")

        return 1

    # 2. 保存
    output_path = save_logs(lifelogs, start_date, end_date, partial)

    print("\n" + "=" * 60)
    print("  ✅ 処理完了")
    print("=" * 60)
    print(f"\n保存先: {output_path}")
    print(f"取得件数: {len(lifelogs)} Lifelogs")

    return 0


if __name__ == "__main__":
    sys.exit(main())
