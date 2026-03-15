#!/usr/bin/env python3
"""
Limitless AI APIの動作確認スクリプト

正しいエンドポイントを探すためのテストツール
"""

import os
import requests
from dotenv import load_dotenv

load_dotenv()

API_KEY = os.getenv('LIMITLESS_API_KEY')

# 試すエンドポイント候補
ENDPOINTS = [
    "https://api.limitless.ai/v1/conversations",
    "https://api.limitless.ai/v1/transcripts",
    "https://api.limitless.ai/v1/recordings",
    "https://api.limitless.ai/v1/memories",
    "https://api.limitless.ai/v1/notes",
    "https://api.limitless.ai/conversations",
    "https://api.limitless.ai/transcripts",
]

print("=" * 60)
print("  Limitless AI API エンドポイント確認")
print("=" * 60)
print(f"\nAPIキー: {API_KEY[:20]}..." if API_KEY else "APIキーが設定されていません")
print("\n各エンドポイントを試しています...\n")

headers = {
    "Authorization": f"Bearer {API_KEY}",
    "Content-Type": "application/json"
}

for endpoint in ENDPOINTS:
    try:
        print(f"試行中: {endpoint}")
        response = requests.get(endpoint, headers=headers, timeout=10)

        if response.status_code == 200:
            print(f"  ✅ 成功! (200 OK)")
            print(f"  レスポンス例:\n  {response.text[:200]}...")
            print()
        elif response.status_code == 404:
            print(f"  ❌ 404 Not Found")
        elif response.status_code == 401:
            print(f"  ❌ 401 Unauthorized (APIキーが無効)")
        else:
            print(f"  ⚠️  ステータス: {response.status_code}")
            print(f"  レスポンス: {response.text[:200]}")
        print()

    except Exception as e:
        print(f"  ❌ エラー: {e}\n")

print("=" * 60)
print("\n【次のステップ】")
print("1. 上記で成功したエンドポイントを確認")
print("2. Limitless AIの公式ドキュメントを確認:")
print("   - ダッシュボードのAPI設定ページ")
print("   - https://limitless.ai/docs (または類似のURL)")
print("3. 正しいエンドポイントを .env に設定:")
print("   LIMITLESS_API_ENDPOINT=https://api.limitless.ai/v1/正しいパス")
print()
