"""
iタウンページスクレイパー
対象企業の会社名、住所、TEL、HP URL、代表者名をiタウンページから取得する。
"""

import re
import time
import logging
from urllib.parse import quote_plus, urljoin

import requests
from bs4 import BeautifulSoup

from config import (
    ITOWN_SEARCH_KEYWORDS,
    TARGET_CITIES,
    REQUEST_DELAY,
    MAX_RESULTS_PER_SEARCH,
    USER_AGENT,
)

logger = logging.getLogger(__name__)

BASE_URL = "https://itp.ne.jp"
SEARCH_URL = f"{BASE_URL}/result/"


def build_search_url(keyword: str, area: str, page: int = 1) -> str:
    """iタウンページの検索URLを生成する。"""
    params = f"?keyword={quote_plus(keyword)}&area={quote_plus(area)}"
    if page > 1:
        params += f"&page={page}"
    return SEARCH_URL + params


def _extract_representative_from_detail(detail_soup: BeautifulSoup) -> str:
    """iタウンページの詳細ページから代表者名を抽出する。"""
    # テーブル内の「代表者名」「代表」等のラベルを探す
    for table in detail_soup.find_all("table"):
        rows = table.find_all("tr")
        for row in rows:
            cells = row.find_all(["th", "td"])
            if len(cells) >= 2:
                header = cells[0].get_text(strip=True)
                if any(kw in header for kw in ["代表者", "代表取締役", "代表", "社長"]):
                    value = cells[1].get_text(strip=True)
                    # 肩書プレフィックスを除去
                    value = re.sub(
                        r"^(代表取締役社長|代表取締役|代表者|代表|社長)\s*[：:\s]*",
                        "", value
                    ).strip()
                    if value and len(value) >= 2 and len(value) <= 20:
                        return value

    # dl > dt/dd パターン
    for dt in detail_soup.find_all("dt"):
        header = dt.get_text(strip=True)
        if any(kw in header for kw in ["代表者", "代表取締役", "代表", "社長"]):
            dd = dt.find_next_sibling("dd")
            if dd:
                value = dd.get_text(strip=True)
                value = re.sub(
                    r"^(代表取締役社長|代表取締役|代表者|代表|社長)\s*[：:\s]*",
                    "", value
                ).strip()
                if value and len(value) >= 2 and len(value) <= 20:
                    return value

    return ""


def parse_listing(soup: BeautifulSoup) -> list[dict]:
    """検索結果ページから企業情報を抽出する。"""
    results = []

    # iタウンページの検索結果はdiv.normalResultsData等で取得
    entries = soup.select("div.normalResultsBox")
    if not entries:
        # 別のセレクタを試す
        entries = soup.select("div.searchResultLi")

    for entry in entries:
        company = {}

        # 会社名 + 詳細ページURL
        name_tag = entry.select_one("a.heading") or entry.select_one("h2 a") or entry.select_one(".companyName a")
        if name_tag:
            company["会社名"] = name_tag.get_text(strip=True)
            href = name_tag.get("href", "")
            if href and not href.startswith("http"):
                href = urljoin(BASE_URL, href)
            company["_detail_url"] = href
        else:
            name_tag = entry.select_one("h2") or entry.select_one(".companyName")
            if name_tag:
                company["会社名"] = name_tag.get_text(strip=True)
            else:
                continue  # 会社名が取れなければスキップ

        # 住所
        addr_tag = entry.select_one(".address") or entry.select_one("p.data--address")
        if addr_tag:
            company["所在地"] = addr_tag.get_text(strip=True)

        # 電話番号
        tel_tag = entry.select_one(".telephoneNumber") or entry.select_one("p.data--tel")
        if tel_tag:
            company["TEL"] = tel_tag.get_text(strip=True)

        # HPリンク
        hp_tag = entry.select_one("a.homepageLink") or entry.select_one("a[href*='http']")
        if hp_tag and hp_tag.get("href", "").startswith("http"):
            company["HP URL"] = hp_tag["href"]

        results.append(company)

    return results


def scrape_itown(category: str, prefecture: str, cities: list[str] | None = None) -> list[dict]:
    """
    iタウンページから指定カテゴリ・エリアの企業情報を取得する。

    Args:
        category: ターゲット業種キー（ゼネコン/不動産/設計事務所/ハウスメーカー）
        prefecture: 都道府県名
        cities: 市区町村リスト（Noneの場合はconfigから取得）

    Returns:
        企業情報の辞書リスト
    """
    keyword = ITOWN_SEARCH_KEYWORDS.get(category, category)
    if cities is None:
        cities = TARGET_CITIES.get(prefecture, [prefecture])

    all_results = []
    session = requests.Session()
    session.headers.update({"User-Agent": USER_AGENT})

    for city in cities:
        area = f"{prefecture}{city}" if city not in prefecture else city
        logger.info(f"iタウンページ検索: {keyword} / {area}")

        page = 1
        city_results = []

        while len(city_results) < MAX_RESULTS_PER_SEARCH:
            url = build_search_url(keyword, area, page)

            try:
                resp = session.get(url, timeout=15)
                resp.raise_for_status()
            except requests.RequestException as e:
                logger.warning(f"リクエストエラー ({url}): {e}")
                break

            soup = BeautifulSoup(resp.text, "lxml")
            listings = parse_listing(soup)

            if not listings:
                break

            for item in listings:
                item["業種分類"] = category
                item["取得元"] = "iタウンページ"
                item.setdefault("所在地", area)

                # 詳細ページから代表者名を取得
                detail_url = item.pop("_detail_url", "")
                if detail_url:
                    try:
                        time.sleep(REQUEST_DELAY * 0.5)
                        detail_resp = session.get(detail_url, timeout=15)
                        detail_resp.raise_for_status()
                        detail_soup = BeautifulSoup(detail_resp.text, "lxml")
                        rep_name = _extract_representative_from_detail(detail_soup)
                        if rep_name:
                            item["代表者名"] = rep_name
                            logger.debug(f"  代表者名取得: {item['会社名']} → {rep_name}")
                    except requests.RequestException:
                        pass

                city_results.append(item)

            # 次ページの存在確認
            next_link = soup.select_one("a.nextPage") or soup.select_one("li.next a")
            if not next_link:
                break

            page += 1
            time.sleep(REQUEST_DELAY)

        all_results.extend(city_results)
        logger.info(f"  → {len(city_results)}件取得")

        time.sleep(REQUEST_DELAY)

    # 重複除去（会社名 + TEL で判定）
    seen = set()
    unique_results = []
    for item in all_results:
        key = (item.get("会社名", ""), item.get("TEL", ""))
        if key not in seen:
            seen.add(key)
            unique_results.append(item)

    logger.info(f"iタウンページ合計: {len(unique_results)}件（重複除去後）")
    return unique_results


def scrape_all_categories(prefectures: list[str] | None = None) -> list[dict]:
    """
    全カテゴリ・全エリアの企業情報を取得する。

    Args:
        prefectures: 対象都道府県リスト（Noneの場合は全エリア）

    Returns:
        企業情報の辞書リスト
    """
    if prefectures is None:
        prefectures = list(TARGET_CITIES.keys())

    all_results = []

    for category in ITOWN_SEARCH_KEYWORDS:
        for pref in prefectures:
            results = scrape_itown(category, pref)
            all_results.extend(results)

    return all_results
