"""
Google Maps Places API スクレイパー
Google Maps APIを使用して企業情報を取得する。
"""

import logging
import time

import requests

from config import (
    GOOGLE_MAPS_API_KEY,
    GOOGLE_MAPS_SEARCH_QUERIES,
    TARGET_AREAS,
    REQUEST_DELAY,
    MAX_RESULTS_PER_SEARCH,
)

logger = logging.getLogger(__name__)

PLACES_TEXT_SEARCH_URL = "https://maps.googleapis.com/maps/api/place/textsearch/json"
PLACES_DETAIL_URL = "https://maps.googleapis.com/maps/api/place/details/json"


def search_places(query: str, area: str) -> list[dict]:
    """
    Google Maps Text Search APIで企業を検索する。

    Args:
        query: 検索キーワード
        area: エリア名（都道府県）

    Returns:
        Google Mapsの検索結果リスト
    """
    if not GOOGLE_MAPS_API_KEY:
        logger.warning("Google Maps APIキーが設定されていません。スキップします。")
        return []

    full_query = f"{query} {area}"
    params = {
        "query": full_query,
        "key": GOOGLE_MAPS_API_KEY,
        "language": "ja",
    }

    all_results = []

    try:
        resp = requests.get(PLACES_TEXT_SEARCH_URL, params=params, timeout=15)
        resp.raise_for_status()
        data = resp.json()

        if data.get("status") != "OK":
            logger.warning(f"Google Maps API エラー: {data.get('status')} - {data.get('error_message', '')}")
            return []

        all_results.extend(data.get("results", []))

        # next_page_tokenでページネーション（最大3ページ = 60件）
        while data.get("next_page_token") and len(all_results) < MAX_RESULTS_PER_SEARCH:
            time.sleep(2)  # next_page_tokenの有効化待ち
            params["pagetoken"] = data["next_page_token"]
            params.pop("query", None)

            resp = requests.get(PLACES_TEXT_SEARCH_URL, params=params, timeout=15)
            resp.raise_for_status()
            data = resp.json()

            if data.get("status") != "OK":
                break

            all_results.extend(data.get("results", []))

    except requests.RequestException as e:
        logger.warning(f"Google Maps API リクエストエラー: {e}")

    return all_results[:MAX_RESULTS_PER_SEARCH]


def get_place_details(place_id: str) -> dict:
    """
    Place Details APIで詳細情報を取得する。

    Args:
        place_id: Google Maps の place_id

    Returns:
        企業の詳細情報
    """
    if not GOOGLE_MAPS_API_KEY:
        return {}

    params = {
        "place_id": place_id,
        "key": GOOGLE_MAPS_API_KEY,
        "language": "ja",
        "fields": "name,formatted_address,formatted_phone_number,website,rating,business_status",
    }

    try:
        resp = requests.get(PLACES_DETAIL_URL, params=params, timeout=15)
        resp.raise_for_status()
        data = resp.json()

        if data.get("status") == "OK":
            return data.get("result", {})

    except requests.RequestException as e:
        logger.warning(f"Place Details API エラー: {e}")

    return {}


def parse_maps_result(place: dict, category: str, details: dict | None = None) -> dict:
    """
    Google Mapsの検索結果を統一フォーマットに変換する。

    Args:
        place: Text Search APIの結果
        category: 業種分類
        details: Place Details APIの結果（オプション）

    Returns:
        統一フォーマットの企業情報辞書
    """
    company = {
        "会社名": place.get("name", ""),
        "業種分類": category,
        "所在地": place.get("formatted_address", ""),
        "取得元": "Google Maps",
    }

    if details:
        company["TEL"] = details.get("formatted_phone_number", "")
        company["HP URL"] = details.get("website", "")
    else:
        # Text Searchの結果だけでは電話番号・HPは取れないことが多い
        company["TEL"] = ""
        company["HP URL"] = ""

    return company


def scrape_google_maps(category: str, areas: list[str] | None = None, fetch_details: bool = True) -> list[dict]:
    """
    Google Maps APIから指定カテゴリ・エリアの企業情報を取得する。
    カテゴリごとに複数の検索クエリを使い、網羅性を高める。

    Args:
        category: ターゲット業種キー
        areas: 対象エリアリスト（Noneの場合はconfigから取得）
        fetch_details: 各企業の詳細情報も取得するか

    Returns:
        企業情報の辞書リスト
    """
    queries = GOOGLE_MAPS_SEARCH_QUERIES.get(category, [category])
    if isinstance(queries, str):
        queries = [queries]
    if areas is None:
        areas = TARGET_AREAS

    all_results = []
    seen_place_ids = set()  # place_idで重複排除（詳細API節約）

    for query in queries:
        for area in areas:
            logger.info(f"Google Maps検索: {query} / {area}")
            places = search_places(query, area)

            new_count = 0
            for place in places:
                place_id = place.get("place_id", "")
                if place_id in seen_place_ids:
                    continue
                seen_place_ids.add(place_id)

                details = None
                if fetch_details and place_id:
                    details = get_place_details(place_id)
                    time.sleep(REQUEST_DELAY)

                company = parse_maps_result(place, category, details)
                all_results.append(company)
                new_count += 1

            logger.info(f"  → {len(places)}件取得（新規: {new_count}件）")
            time.sleep(REQUEST_DELAY)

    # 会社名でも重複除去（place_idが異なる同名企業の対策）
    seen_names = set()
    unique_results = []
    for item in all_results:
        key = item.get("会社名", "")
        if key and key not in seen_names:
            seen_names.add(key)
            unique_results.append(item)

    logger.info(f"Google Maps合計: {len(unique_results)}件（重複除去後）")
    return unique_results


def scrape_all_categories(areas: list[str] | None = None) -> list[dict]:
    """全カテゴリの企業情報を取得する。"""
    all_results = []

    for category in GOOGLE_MAPS_SEARCH_QUERIES:
        results = scrape_google_maps(category, areas)
        all_results.extend(results)

    return all_results
