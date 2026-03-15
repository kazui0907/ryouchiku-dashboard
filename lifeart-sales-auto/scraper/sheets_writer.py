"""
Google Sheets 書き込みモジュール
スクレイピング結果をGoogleスプレッドシートに書き込む。
"""

import logging
from datetime import datetime

import gspread
from google.oauth2.service_account import Credentials

from config import (
    SPREADSHEET_ID,
    SHEET_NAME,
    SERVICE_ACCOUNT_JSON,
    HEADER_ROW,
    COL_COMPANY,
    COL_CATEGORY,
    COL_REPRESENTATIVE,
    COL_ADDRESS,
    COL_TEL,
    COL_EMAIL,
    COL_HP_URL,
    COL_SOURCE,
    COL_SCRAPED_DATE,
    COL_STATUS,
    COL_PHASE,
    COL_FOLLOW_COUNT,
)

logger = logging.getLogger(__name__)

SCOPES = [
    "https://www.googleapis.com/auth/spreadsheets",
    "https://www.googleapis.com/auth/drive",
]


def get_sheets_client() -> gspread.Client:
    """認証済みのgspreadクライアントを取得する。"""
    creds = Credentials.from_service_account_file(SERVICE_ACCOUNT_JSON, scopes=SCOPES)
    return gspread.authorize(creds)


def get_or_create_sheet(client: gspread.Client) -> gspread.Worksheet:
    """
    対象のスプレッドシート・ワークシートを取得する。
    ヘッダー行がなければ作成する。
    """
    if not SPREADSHEET_ID:
        raise ValueError(
            "SPREADSHEET_ID が設定されていません。"
            "config.py の SPREADSHEET_ID にスプレッドシートIDを設定してください。"
        )

    spreadsheet = client.open_by_key(SPREADSHEET_ID)

    try:
        worksheet = spreadsheet.worksheet(SHEET_NAME)
    except gspread.WorksheetNotFound:
        worksheet = spreadsheet.add_worksheet(title=SHEET_NAME, rows=1000, cols=20)
        logger.info(f"ワークシート「{SHEET_NAME}」を作成しました。")

    # ヘッダー行の確認・作成
    first_row = worksheet.row_values(1)
    if not first_row or first_row[0] != HEADER_ROW[0]:
        worksheet.update("A1", [HEADER_ROW])
        logger.info("ヘッダー行を作成しました。")

    return worksheet


def get_existing_companies(worksheet: gspread.Worksheet) -> set[str]:
    """既存の会社名セットを取得する（重複登録防止用）。"""
    try:
        company_col = worksheet.col_values(COL_COMPANY)
        return set(company_col[1:])  # ヘッダー行を除外
    except Exception:
        return set()


def lead_to_row(lead: dict) -> list[str]:
    """企業情報辞書をスプレッドシートの行データに変換する。"""
    today = datetime.now().strftime("%Y-%m-%d")

    row = [""] * len(HEADER_ROW)
    row[COL_COMPANY - 1] = lead.get("会社名", "")
    row[COL_CATEGORY - 1] = lead.get("業種分類", "")
    row[COL_REPRESENTATIVE - 1] = lead.get("代表者名", "")
    row[COL_ADDRESS - 1] = lead.get("所在地", "")
    row[COL_TEL - 1] = lead.get("TEL", "")
    row[COL_EMAIL - 1] = lead.get("メールアドレス", "")
    row[COL_HP_URL - 1] = lead.get("HP URL", "")
    row[COL_SOURCE - 1] = lead.get("取得元", "")
    row[COL_SCRAPED_DATE - 1] = today
    row[COL_STATUS - 1] = "未送信"
    row[COL_PHASE - 1] = "リード"
    row[COL_FOLLOW_COUNT - 1] = "0"

    return row


def write_leads(leads: list[dict], dry_run: bool = False) -> int:
    """
    企業リストをスプレッドシートに書き込む。

    Args:
        leads: 企業情報の辞書リスト
        dry_run: Trueの場合はスプレッドシートに書き込まない（テスト用）

    Returns:
        書き込み件数
    """
    if dry_run:
        logger.info("[DRY RUN] スプレッドシートへの書き込みをスキップします。")
        for lead in leads:
            logger.info(f"  → {lead.get('会社名', '不明')} / {lead.get('メールアドレス', 'なし')}")
        return len(leads)

    client = get_sheets_client()
    worksheet = get_or_create_sheet(client)
    existing = get_existing_companies(worksheet)

    new_rows = []
    skipped = 0

    for lead in leads:
        company_name = lead.get("会社名", "")

        # 重複チェック
        if company_name in existing:
            logger.debug(f"重複スキップ: {company_name}")
            skipped += 1
            continue

        row = lead_to_row(lead)
        new_rows.append(row)
        existing.add(company_name)

    if not new_rows:
        logger.info("新規データなし（全て既存データと重複）。")
        return 0

    # バッチ書き込み
    last_row = len(worksheet.col_values(COL_COMPANY))
    start_row = last_row + 1
    end_row = start_row + len(new_rows) - 1
    end_col = chr(ord("A") + len(HEADER_ROW) - 1)

    cell_range = f"A{start_row}:{end_col}{end_row}"
    worksheet.update(cell_range, new_rows)

    logger.info(f"スプレッドシート書き込み完了: {len(new_rows)}件（スキップ: {skipped}件）")
    return len(new_rows)
