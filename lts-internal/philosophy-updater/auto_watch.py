#!/usr/bin/env python3
"""
Limitless AI ログフォルダを監視し、変更があったら自動的に思想を抽出

使用方法:
    python auto_watch.py

停止: Ctrl+C
"""

import os
import time
import subprocess
from pathlib import Path
from datetime import datetime
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler
from dotenv import load_dotenv

# 環境変数の読み込み
load_dotenv()

# パス設定
SCRIPT_DIR = Path(__file__).parent
RAW_LOGS_DIR = SCRIPT_DIR / os.getenv('RAW_LOGS_DIR', '../../.limitless/raw-logs')
WATCH_INTERVAL = int(os.getenv('WATCH_INTERVAL', '60'))


class LogFileHandler(FileSystemEventHandler):
    """ファイル変更を検知するハンドラー"""

    def __init__(self):
        self.last_run = 0
        self.cooldown = WATCH_INTERVAL  # 秒

    def on_created(self, event):
        """新しいファイルが作成された時"""
        if not event.is_directory:
            self._trigger_extraction(f"新しいファイル検出: {Path(event.src_path).name}")

    def on_modified(self, event):
        """ファイルが変更された時"""
        if not event.is_directory:
            self._trigger_extraction(f"ファイル更新検出: {Path(event.src_path).name}")

    def _trigger_extraction(self, reason: str):
        """思想抽出を実行（クールダウン付き）"""
        current_time = time.time()

        # クールダウン期間中は実行しない
        if current_time - self.last_run < self.cooldown:
            print(f"⏳ クールダウン中... (残り {int(self.cooldown - (current_time - self.last_run))}秒)")
            return

        print("\n" + "=" * 60)
        print(f"🔔 {reason}")
        print(f"⏰ {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        print("=" * 60)

        # extract_philosophy.py を実行
        try:
            result = subprocess.run(
                ['python', 'extract_philosophy.py'],
                cwd=SCRIPT_DIR,
                capture_output=True,
                text=True
            )

            print(result.stdout)

            if result.returncode == 0:
                print("✅ 思想抽出完了\n")
            else:
                print(f"❌ エラーが発生しました:\n{result.stderr}\n")

        except Exception as e:
            print(f"❌ 実行エラー: {e}\n")

        self.last_run = current_time


def main():
    """メイン処理"""
    logs_dir = RAW_LOGS_DIR.resolve()

    # ディレクトリが存在しない場合は作成
    logs_dir.mkdir(parents=True, exist_ok=True)

    print("=" * 60)
    print("  🔍 Limitless AI ログ監視システム")
    print("=" * 60)
    print(f"監視ディレクトリ: {logs_dir}")
    print(f"更新間隔: {WATCH_INTERVAL}秒")
    print(f"開始時刻: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 60)
    print("\n監視を開始しました... (停止: Ctrl+C)\n")

    # イベントハンドラーとオブザーバーを設定
    event_handler = LogFileHandler()
    observer = Observer()
    observer.schedule(event_handler, str(logs_dir), recursive=False)
    observer.start()

    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        print("\n\n⏹️  監視を停止しています...")
        observer.stop()

    observer.join()
    print("✅ 監視を終了しました")


if __name__ == "__main__":
    main()
