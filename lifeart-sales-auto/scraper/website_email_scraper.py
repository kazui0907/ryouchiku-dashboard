"""
企業HPからメールアドレスと代表者名を取得するスクレイパー
各企業のウェブサイトにアクセスし、問い合わせページや会社概要から情報を抽出する。

代表者名の取得優先順位:
  1. 代表取締役社長 / 社長
  2. 代表取締役 / 代表者
  3. その他の役員名（取締役、専務など）
  4. 担当者名（問い合わせ窓口など）
  → 見つからなければ空文字（メール送信時は「ご担当者様」にフォールバック）
"""

import re
import logging
import time
from urllib.parse import urljoin, urlparse

import requests
from bs4 import BeautifulSoup

from config import (
    USER_AGENT,
    EMAIL_SCRAPE_TIMEOUT,
    REQUEST_DELAY,
)

logger = logging.getLogger(__name__)

# メールアドレス抽出用の正規表現
EMAIL_PATTERN = re.compile(
    r"[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}"
)

# 除外するメールアドレスパターン（画像ファイルやダミー等）
EXCLUDE_PATTERNS = [
    r".*\.(png|jpg|jpeg|gif|svg|webp|ico)$",
    r"^(example|test|sample|dummy|noreply|no-reply)@",
    r".*@(example\.com|test\.com|sentry\.io|sentry-next\.wixpress\.com|wixpress\.com)",
    r"^wixpress@",
]

# メール情報が含まれやすいページのパス
CONTACT_PATHS = [
    "/contact",
    "/contact/",
    "/inquiry",
    "/inquiry/",
    "/about",
    "/about/",
    "/company",
    "/company/",
    "/company/outline",
    "/company/profile",
    "/corporate",
    "/corporate/",
    "/profile",
    "/profile/",
    "/access",
    "/access/",
    # 日本語URL対応
    "/お問い合わせ",
    "/会社概要",
    "/アクセス",
    "/会社案内",
    "/企業情報",
]

# リンクテキストでコンタクトページを見つけるキーワード
CONTACT_LINK_KEYWORDS = [
    "お問い合わせ", "問い合わせ", "問合せ", "お問合せ",
    "contact", "inquiry",
    "会社概要", "会社情報", "会社案内", "企業情報", "企業概要",
    "about", "about us", "company",
    "代表挨拶", "代表メッセージ", "社長挨拶", "社長メッセージ",
    "アクセス", "access",
]

# --- 代表者名抽出用の定義 ---

# テーブルやdlから人名を探すときのヘッダーキーワード（優先度順）
# 優先度: 数字が小さいほど「社長に近い」
NAME_KEYWORDS_PRIORITY = [
    (1, ["代表取締役社長", "代表取締役 社長"]),
    (2, ["社長"]),
    (3, ["代表取締役", "代表者", "代表"]),
    (4, ["取締役", "専務", "常務", "役員"]),
    (5, ["担当者", "担当", "責任者", "窓口"]),
]

# 名前として明らかにおかしい文字列を除外するパターン
NAME_EXCLUDE_PATTERNS = [
    r"^[\d\s\-\(\)（）]+$",       # 数字・記号だけ
    r"^https?://",                  # URL
    r"@",                           # メールアドレス
    r"^〒",                         # 郵便番号
    r"^\d{2,4}年",                  # 日付
    r"^(株式会社|有限会社|合同会社)", # 会社名
    r"^(設立|資本金|事業内容|許可)",  # テーブルの別項目
]

# 肩書プレフィックスを除去する正規表現
TITLE_PREFIX_PATTERN = re.compile(
    r"^(代表取締役社長|代表取締役|代表社員|代表者|代表|"
    r"取締役社長|取締役|社長|専務|常務|会長|CEO|COO|"
    r"担当者|担当|責任者)\s*[：:\s]*"
)


def is_valid_email(email: str) -> bool:
    """有効なメールアドレスか判定する。"""
    email_lower = email.lower()

    for pattern in EXCLUDE_PATTERNS:
        if re.match(pattern, email_lower):
            return False

    # 長すぎるメールアドレスは除外
    if len(email) > 100:
        return False

    return True


def extract_emails_from_html(html: str) -> list[str]:
    """HTMLテキストからメールアドレスを抽出する。"""
    raw_emails = EMAIL_PATTERN.findall(html)
    valid_emails = [e for e in raw_emails if is_valid_email(e)]

    # 重複除去（順序保持）
    seen = set()
    unique_emails = []
    for email in valid_emails:
        lower = email.lower()
        if lower not in seen:
            seen.add(lower)
            unique_emails.append(email)

    return unique_emails


def find_contact_pages(soup: BeautifulSoup, base_url: str) -> list[str]:
    """ページ内のリンクからコンタクトページのURLを収集する。"""
    contact_urls = []
    parsed_base = urlparse(base_url)

    for a_tag in soup.find_all("a", href=True):
        href = a_tag["href"]
        link_text = a_tag.get_text(strip=True).lower()

        # リンクテキストでマッチ
        text_match = any(kw in link_text for kw in CONTACT_LINK_KEYWORDS)

        # URLパスでマッチ
        full_url = urljoin(base_url, href)
        parsed_url = urlparse(full_url)
        path_match = any(parsed_url.path.lower().endswith(p) for p in CONTACT_PATHS)

        if (text_match or path_match) and parsed_url.netloc == parsed_base.netloc:
            if full_url not in contact_urls:
                contact_urls.append(full_url)

    return contact_urls[:5]  # 最大5ページまで


def _is_valid_person_name(text: str) -> bool:
    """人名として妥当な文字列かを判定する。"""
    text = text.strip()
    if not text or len(text) < 2 or len(text) > 30:
        return False
    for pattern in NAME_EXCLUDE_PATTERNS:
        if re.search(pattern, text):
            return False
    return True


def _clean_person_name(raw: str) -> str:
    """肩書プレフィックスを除去して人名部分だけ返す。"""
    name = TITLE_PREFIX_PATTERN.sub("", raw).strip()
    # 末尾の不要な文字を除去
    name = re.sub(r"[（\(].*$", "", name).strip()
    return name


def _find_names_in_table(soup: BeautifulSoup) -> list[tuple[int, str]]:
    """
    テーブル（table > tr > th/td）から人名候補を抽出する。
    Returns: [(優先度, 名前), ...]
    """
    found = []
    for table in soup.find_all("table"):
        rows = table.find_all("tr")
        for row in rows:
            cells = row.find_all(["th", "td"])
            if len(cells) < 2:
                continue
            header = cells[0].get_text(strip=True)
            value_raw = cells[1].get_text(strip=True)

            for priority, keywords in NAME_KEYWORDS_PRIORITY:
                if any(kw in header for kw in keywords):
                    name = _clean_person_name(value_raw)
                    if _is_valid_person_name(name):
                        found.append((priority, name))
                    break
    return found


def _find_names_in_dl(soup: BeautifulSoup) -> list[tuple[int, str]]:
    """
    定義リスト（dl > dt/dd）から人名候補を抽出する。
    """
    found = []
    for dt in soup.find_all("dt"):
        header = dt.get_text(strip=True)
        dd = dt.find_next_sibling("dd")
        if not dd:
            continue
        value_raw = dd.get_text(strip=True)

        for priority, keywords in NAME_KEYWORDS_PRIORITY:
            if any(kw in header for kw in keywords):
                name = _clean_person_name(value_raw)
                if _is_valid_person_name(name):
                    found.append((priority, name))
                break
    return found


def _find_names_in_div_pairs(soup: BeautifulSoup) -> list[tuple[int, str]]:
    """
    div等のラベル+値ペアから人名候補を抽出する。
    よくあるパターン:
      <div class="label">代表取締役</div><div class="value">田中太郎</div>
      <span>代表</span><span>田中太郎</span>
    """
    found = []
    for tag in soup.find_all(["div", "span", "p", "li"]):
        text = tag.get_text(strip=True)
        if len(text) > 20:
            continue

        for priority, keywords in NAME_KEYWORDS_PRIORITY:
            if any(kw in text for kw in keywords):
                # 同じタグ内に名前が含まれている場合（例: "代表取締役 田中太郎"）
                name = _clean_person_name(text)
                if _is_valid_person_name(name) and name != text:
                    found.append((priority, name))
                    break

                # 次の兄弟要素に名前がある場合
                sibling = tag.find_next_sibling()
                if sibling:
                    sibling_text = sibling.get_text(strip=True)
                    name = _clean_person_name(sibling_text)
                    if _is_valid_person_name(name):
                        found.append((priority, name))
                break
    return found


def _find_names_in_greeting(soup: BeautifulSoup) -> list[tuple[int, str]]:
    """
    「代表挨拶」「社長メッセージ」セクションから名前を探す。
    よくあるパターン:
      <p>代表取締役 田中太郎</p>
      <div class="greeting-name">田中太郎</div>
    """
    found = []

    # class名やidに「greeting」「message」「ceo」を含む要素を探す
    greeting_selectors = [
        "[class*='greeting']", "[class*='message']", "[class*='ceo']",
        "[class*='president']", "[class*='representative']",
        "[id*='greeting']", "[id*='message']", "[id*='ceo']",
    ]
    for selector in greeting_selectors:
        for elem in soup.select(selector):
            text = elem.get_text(strip=True)
            for priority, keywords in NAME_KEYWORDS_PRIORITY[:3]:  # 社長系のみ
                if any(kw in text for kw in keywords):
                    name = _clean_person_name(text)
                    if _is_valid_person_name(name):
                        found.append((priority, name))
                    break

    return found


def extract_representative_name(soup: BeautifulSoup) -> str:
    """
    会社概要ページから代表者名を抽出する。

    複数の方法で探し、最も優先度の高い（社長に近い）名前を返す。
    見つからなければ空文字を返す。
    """
    all_candidates = []

    # 方法1: テーブル（最も信頼性が高い）
    all_candidates.extend(_find_names_in_table(soup))

    # 方法2: 定義リスト（dl/dt/dd）
    all_candidates.extend(_find_names_in_dl(soup))

    # 方法3: div等のペア構造
    all_candidates.extend(_find_names_in_div_pairs(soup))

    # 方法4: 代表挨拶セクション
    all_candidates.extend(_find_names_in_greeting(soup))

    if not all_candidates:
        return ""

    # 優先度順にソートして最も社長に近い名前を返す
    all_candidates.sort(key=lambda x: x[0])
    best_priority, best_name = all_candidates[0]

    logger.debug(f"代表者名候補: {all_candidates} → 採用: {best_name}（優先度{best_priority}）")
    return best_name


def scrape_website_email(url: str) -> dict:
    """
    企業HPからメールアドレスと代表者名を取得する。

    Args:
        url: 企業HPのURL

    Returns:
        {"email": str, "representative": str}
    """
    result = {"email": "", "representative": ""}

    if not url or not url.startswith("http"):
        return result

    session = requests.Session()
    session.headers.update({"User-Agent": USER_AGENT})

    try:
        # まずトップページを取得
        resp = session.get(url, timeout=EMAIL_SCRAPE_TIMEOUT, allow_redirects=True)
        resp.raise_for_status()
        resp.encoding = resp.apparent_encoding

        soup = BeautifulSoup(resp.text, "lxml")

        # トップページからメール・代表者名を抽出
        emails = extract_emails_from_html(resp.text)
        representative = extract_representative_name(soup)

        # トップページで見つからない情報があれば、サブページを探す
        need_email = not emails
        need_name = not representative
        if need_email or need_name:
            contact_urls = find_contact_pages(soup, url)

            for contact_url in contact_urls:
                try:
                    time.sleep(REQUEST_DELAY * 0.5)
                    contact_resp = session.get(contact_url, timeout=EMAIL_SCRAPE_TIMEOUT)
                    contact_resp.raise_for_status()
                    contact_resp.encoding = contact_resp.apparent_encoding

                    contact_soup = BeautifulSoup(contact_resp.text, "lxml")

                    if need_email:
                        page_emails = extract_emails_from_html(contact_resp.text)
                        emails.extend(page_emails)
                        if emails:
                            need_email = False

                    if need_name:
                        name = extract_representative_name(contact_soup)
                        if name:
                            representative = name
                            need_name = False

                    if not need_email and not need_name:
                        break

                except requests.RequestException:
                    continue

        # mailto: リンクからも取得を試みる
        if not emails:
            mailto_links = soup.select("a[href^='mailto:']")
            for link in mailto_links:
                mailto = link["href"].replace("mailto:", "").split("?")[0].strip()
                if is_valid_email(mailto):
                    emails.append(mailto)

        if emails:
            result["email"] = emails[0]  # 最初の有効なメールアドレスを使用

        if representative:
            result["representative"] = representative

    except requests.RequestException as e:
        logger.debug(f"HP取得エラー ({url}): {e}")
    except Exception as e:
        logger.debug(f"解析エラー ({url}): {e}")

    return result


def enrich_leads(leads: list[dict]) -> list[dict]:
    """
    企業リストにメールアドレスと代表者名を追加する。

    Args:
        leads: 企業情報の辞書リスト（HP URLが含まれるもの）

    Returns:
        メールアドレス・代表者名が追加された企業情報リスト
    """
    total = len(leads)
    email_count = 0
    name_count = 0

    for i, lead in enumerate(leads):
        hp_url = lead.get("HP URL", "")

        if not hp_url:
            continue

        logger.info(f"[{i + 1}/{total}] HP解析: {lead.get('会社名', '不明')} ({hp_url})")

        info = scrape_website_email(hp_url)

        if info["email"] and not lead.get("メールアドレス"):
            lead["メールアドレス"] = info["email"]
            email_count += 1

        if info["representative"] and not lead.get("代表者名"):
            lead["代表者名"] = info["representative"]
            name_count += 1
            logger.info(f"  → 代表者名取得: {info['representative']}")

        time.sleep(REQUEST_DELAY)

    logger.info(f"HP解析完了: メール {email_count}/{total}件, 代表者名 {name_count}/{total}件")
    return leads
