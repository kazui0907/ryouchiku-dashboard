"""
ライフアート株式会社 - toB自動営業スクレイパー メイン実行スクリプト

使い方:
    # 全カテゴリ・全エリアで実行
    python main.py

    # 特定エリアのみ
    python main.py --area 埼玉県

    # 特定カテゴリのみ
    python main.py --category ゼネコン

    # ドライラン（スプレッドシートに書き込まない）
    python main.py --dry-run

    # メールアドレス取得をスキップ
    python main.py --skip-email
"""

import argparse
import logging
import sys

from config import TARGET_AREAS, GOOGLE_MAPS_SEARCH_QUERIES
from google_maps_scraper import scrape_google_maps
from website_email_scraper import enrich_leads
from sheets_writer import write_leads


def setup_logging(verbose: bool = False):
    """ログ設定を初期化する。"""
    level = logging.DEBUG if verbose else logging.INFO
    logging.basicConfig(
        level=level,
        format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
    )


def parse_args():
    """コマンドライン引数を解析する。"""
    parser = argparse.ArgumentParser(
        description="ライフアート株式会社 - toB自動営業スクレイパー"
    )
    parser.add_argument(
        "--area",
        type=str,
        default=None,
        help="対象エリア（都道府県名）を1つ指定",
    )
    parser.add_argument(
        "--category",
        type=str,
        default=None,
        help="対象カテゴリ（ゼネコン/不動産/設計事務所/ハウスメーカー）を1つ指定",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="スプレッドシートに書き込まないテストモード",
    )
    parser.add_argument(
        "--skip-email",
        action="store_true",
        help="企業HPからのメールアドレス取得をスキップ",
    )
    parser.add_argument(
        "--verbose",
        action="store_true",
        help="詳細ログを出力",
    )

    return parser.parse_args()


def main():
    args = parse_args()
    setup_logging(args.verbose)

    logger = logging.getLogger("main")
    logger.info("=" * 60)
    logger.info("ライフアート株式会社 - toB自動営業スクレイパー 開始")
    logger.info("=" * 60)

    # 対象エリア
    areas = [args.area] if args.area else TARGET_AREAS

    # 対象カテゴリ
    categories = [args.category] if args.category else list(GOOGLE_MAPS_SEARCH_QUERIES.keys())

    all_leads = []

    # --- Step 1: Google Maps API ---
    logger.info("-" * 40)
    logger.info("Step 1: Google Maps APIからデータ取得")
    logger.info("-" * 40)

    for category in categories:
        try:
            leads = scrape_google_maps(category, areas)
            all_leads.extend(leads)
        except Exception as e:
            logger.error(f"Google Mapsスクレイピングエラー ({category}): {e}")

    logger.info(f"\n取得件数合計: {len(all_leads)}件")

    # 重複除去（会社名ベース）
    seen = set()
    unique_leads = []
    for lead in all_leads:
        name = lead.get("会社名", "")
        if name and name not in seen:
            seen.add(name)
            unique_leads.append(lead)

    logger.info(f"重複除去後: {len(unique_leads)}件")

    # --- Step 2: メールアドレス・代表者名取得 ---
    if not args.skip_email and unique_leads:
        logger.info("-" * 40)
        logger.info("Step 3: 企業HPからメールアドレス・代表者名を取得")
        logger.info("-" * 40)

        unique_leads = enrich_leads(unique_leads)

        email_count = sum(1 for l in unique_leads if l.get("メールアドレス"))
        name_count = sum(1 for l in unique_leads if l.get("代表者名"))
        logger.info(f"メールアドレス取得済み: {email_count}/{len(unique_leads)}件")
        logger.info(f"代表者名取得済み: {name_count}/{len(unique_leads)}件")

    # --- Step 3: スプレッドシート書き込み ---
    logger.info("-" * 40)
    logger.info("Step 4: スプレッドシートに書き込み")
    logger.info("-" * 40)

    if unique_leads:
        written = write_leads(unique_leads, dry_run=args.dry_run)
        logger.info(f"書き込み完了: {written}件")
    else:
        logger.warning("書き込むデータがありません。")

    # --- 結果サマリ ---
    logger.info("=" * 60)
    logger.info("実行結果サマリ")
    logger.info("=" * 60)
    logger.info(f"取得件数: {len(all_leads)}件")
    logger.info(f"重複除去後: {len(unique_leads)}件")
    if not args.skip_email:
        email_count = sum(1 for l in unique_leads if l.get("メールアドレス"))
        name_count = sum(1 for l in unique_leads if l.get("代表者名"))
        logger.info(f"メールアドレス取得済み: {email_count}件")
        logger.info(f"代表者名取得済み: {name_count}件")
    if args.dry_run:
        logger.info("[DRY RUN] スプレッドシートへの書き込みはスキップされました。")
    logger.info("完了。")


if __name__ == "__main__":
    main()
