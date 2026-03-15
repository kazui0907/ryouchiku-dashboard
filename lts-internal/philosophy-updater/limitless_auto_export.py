#!/usr/bin/env python3
"""
Limitless AI からログを自動取得するスクリプト（Selenium版）

注意: このスクリプトはLimitless AIの仕様に応じてカスタマイズが必要です
"""

import os
import time
from datetime import datetime
from pathlib import Path
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC

# 設定
LIMITLESS_URL = "https://app.limitless.ai"  # 実際のURLに変更
LIMITLESS_EMAIL = os.getenv("LIMITLESS_EMAIL")
LIMITLESS_PASSWORD = os.getenv("LIMITLESS_PASSWORD")
DOWNLOAD_DIR = Path(__file__).parent / "../../.limitless/raw-logs"

def setup_driver():
    """Chrome ドライバーを設定"""
    options = webdriver.ChromeOptions()
    # ダウンロード先を設定
    prefs = {
        "download.default_directory": str(DOWNLOAD_DIR.resolve()),
        "download.prompt_for_download": False,
    }
    options.add_experimental_option("prefs", prefs)
    # ヘッドレスモード（バックグラウンド実行）
    # options.add_argument("--headless")

    return webdriver.Chrome(options=options)

def login(driver):
    """Limitless AI にログイン"""
    driver.get(LIMITLESS_URL)

    # ログインフォームの待機とログイン処理
    # 注意: 実際のセレクタに変更が必要
    email_input = WebDriverWait(driver, 10).until(
        EC.presence_of_element_located((By.ID, "email"))
    )
    email_input.send_keys(LIMITLESS_EMAIL)

    password_input = driver.find_element(By.ID, "password")
    password_input.send_keys(LIMITLESS_PASSWORD)

    login_button = driver.find_element(By.XPATH, "//button[text()='Log in']")
    login_button.click()

    # ログイン完了を待機
    time.sleep(3)

def export_logs(driver):
    """ログをエクスポート"""
    # 設定ページに移動
    # 注意: 実際のナビゲーションに変更が必要
    settings_link = WebDriverWait(driver, 10).until(
        EC.presence_of_element_located((By.XPATH, "//a[contains(text(), 'Settings')]"))
    )
    settings_link.click()

    # エクスポートボタンをクリック
    export_button = WebDriverWait(driver, 10).until(
        EC.presence_of_element_located((By.XPATH, "//button[contains(text(), 'Export')]"))
    )
    export_button.click()

    # エクスポート完了を待機
    time.sleep(5)

    print("✓ ログのエクスポート完了")

def main():
    """メイン処理"""
    print("=" * 60)
    print("  Limitless AI 自動ログ取得")
    print("=" * 60)

    if not LIMITLESS_EMAIL or not LIMITLESS_PASSWORD:
        print("❌ 環境変数 LIMITLESS_EMAIL と LIMITLESS_PASSWORD を設定してください")
        return

    driver = None
    try:
        driver = setup_driver()
        print("🌐 Limitless AI にアクセス中...")

        login(driver)
        print("✓ ログイン完了")

        export_logs(driver)

        print("\n✅ 処理完了")

    except Exception as e:
        print(f"❌ エラー: {e}")

    finally:
        if driver:
            driver.quit()

if __name__ == "__main__":
    main()
