"""
ライフアート株式会社 - toB自動営業システム 設定ファイル
"""

# --- Google Sheets 設定 ---
# スプレッドシートのIDは新規作成後にここに記入する
SPREADSHEET_ID = "1YRhG-5jwspIomY9Udzg6gR1uzpJt2n3jnTkLkihWTxI"
SHEET_NAME = "リード一覧"

# GCP サービスアカウントのJSONキーファイルパス
SERVICE_ACCOUNT_JSON = "credentials.json"  # TODO: サービスアカウントキーを配置

# --- スクレイピング対象エリア ---
TARGET_AREAS = [
    "東京都",
    "神奈川県",
    "千葉県",
    "埼玉県",
]

# --- Google Maps API 設定 ---
GOOGLE_MAPS_API_KEY = "AIzaSyDAq2i7_NL0epytEQqi6XfbLjr-eubjHDE"

# Google Maps 検索クエリ（カテゴリ → 検索キーワードのリスト）
# 複数クエリで検索し、重複除去で網羅性を高める
GOOGLE_MAPS_SEARCH_QUERIES = {
    "ゼネコン": [
        "総合建設会社",
        "建設会社 ゼネコン",
        "建築工事会社",
    ],
    "不動産": [
        "不動産会社 賃貸管理",
        "不動産管理会社",
        "ビル管理会社 プロパティマネジメント",
    ],
    "設計事務所": [
        "建築設計事務所",
        "設計事務所 建築デザイン",
        "インテリアデザイン事務所",
    ],
    "ハウスメーカー": [
        "ハウスメーカー 注文住宅",
        "工務店 新築",
        "住宅メーカー 分譲住宅",
    ],
}

# --- スクレイピング設定 ---
# リクエスト間の待機時間（秒）- サーバーへの負荷軽減
REQUEST_DELAY = 2.0

# 1回の実行で取得する最大件数（カテゴリ × エリアあたり）
MAX_RESULTS_PER_SEARCH = 50

# User-Agent
USER_AGENT = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
    "AppleWebKit/537.36 (KHTML, like Gecko) "
    "Chrome/120.0.0.0 Safari/537.36"
)

# メールアドレス取得時のタイムアウト（秒）
EMAIL_SCRAPE_TIMEOUT = 10

# --- スプレッドシート列マッピング（A=1, B=2, ...） ---
COL_COMPANY = 1       # A: 会社名
COL_CATEGORY = 2      # B: 業種分類
COL_REPRESENTATIVE = 3 # C: 代表者名
COL_ADDRESS = 4       # D: 所在地
COL_TEL = 5           # E: TEL
COL_EMAIL = 6         # F: メールアドレス
COL_HP_URL = 7        # G: HP URL
COL_SOURCE = 8        # H: 取得元
COL_SCRAPED_DATE = 9  # I: 取得日
COL_SUBJECT = 10      # J: メール件名
COL_BODY = 11         # K: メール本文
COL_STATUS = 12       # L: ステータス
COL_SENT_DATE = 13    # M: 送信日
COL_REACTION = 14     # N: 反応
COL_REACTION_MEMO = 15 # O: 反応メモ
COL_PHASE = 16        # P: 営業フェーズ
COL_NEXT_ACTION = 17  # Q: 次のアクション
COL_FOLLOW_DATE = 18  # R: フォロー予定日
COL_FOLLOW_COUNT = 19 # S: フォロー回数
COL_MEMO = 20         # T: 備考

# ヘッダー行（1行目）
HEADER_ROW = [
    "会社名", "業種分類", "代表者名", "所在地", "TEL",
    "メールアドレス", "HP URL", "取得元", "取得日",
    "メール件名", "メール本文", "ステータス", "送信日",
    "反応", "反応メモ", "営業フェーズ", "次のアクション",
    "フォロー予定日", "フォロー回数", "備考",
]
