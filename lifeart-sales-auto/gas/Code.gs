/**
 * ライフアート株式会社 - toB自動営業システム
 * GASサーバーサイドコード（参考コピー）
 *
 * 本番コードはスプレッドシートにコンテナバインドして使用する。
 * このファイルはバージョン管理用の参考コピー。
 *
 * スプレッドシート列構成（A〜T、20列）:
 *   A: 会社名, B: 業種分類, C: 代表者名, D: 所在地, E: TEL,
 *   F: メールアドレス, G: HP URL, H: 取得元, I: 取得日,
 *   J: メール件名, K: メール本文, L: ステータス, M: 送信日,
 *   N: 反応, O: 反応メモ, P: 営業フェーズ, Q: 次のアクション,
 *   R: フォロー予定日, S: フォロー回数, T: 備考
 */

// --- 定数 ---
var SHEET_NAME = "リード一覧";
var HISTORY_SHEET_NAME = "送信履歴";
var SENDER_EMAIL = "info@life-art2011.com";
var SENDER_NAME = "ライフアート株式会社 齋藤";

// 送信履歴シートの列（A〜I）
var HIST = {
  SENT_DATE: 0,    // A: 送信日時
  LEAD_ROW: 1,     // B: リード行番号
  COMPANY: 2,      // C: 会社名
  DISPLAY_NAME: 3, // D: 宛名
  EMAIL: 4,        // E: メールアドレス
  SUBJECT: 5,      // F: 件名
  BODY: 6,         // G: 本文
  SEND_TYPE: 7,    // H: 送信種別（初回/フォロー）
  FOLLOW_NUM: 8,   // I: フォロー回数
};
var HISTORY_HEADER = [
  "送信日時", "リード行番号", "会社名", "宛名",
  "メールアドレス", "件名", "本文", "送信種別", "フォロー回数",
];

// 列インデックス（0始まり）
var COL = {
  COMPANY: 0,       // A
  CATEGORY: 1,      // B
  REPRESENTATIVE: 2, // C
  ADDRESS: 3,       // D
  TEL: 4,           // E
  EMAIL: 5,         // F
  HP_URL: 6,        // G
  SOURCE: 7,        // H
  SCRAPED_DATE: 8,  // I
  SUBJECT: 9,       // J
  BODY: 10,         // K
  STATUS: 11,       // L
  SENT_DATE: 12,    // M
  REACTION: 13,     // N
  REACTION_MEMO: 14, // O
  PHASE: 15,        // P
  NEXT_ACTION: 16,  // Q
  FOLLOW_DATE: 17,  // R
  FOLLOW_COUNT: 18, // S
  MEMO: 19,         // T
};


/**
 * Web UIを提供する
 */
function doGet() {
  return HtmlService.createHtmlOutputFromFile("Index")
    .setTitle("ライフアート 営業管理")
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}


/**
 * リード一覧を取得する
 * @returns {Array<Object>} リードデータの配列
 */
function getLeads() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
  if (!sheet) {
    throw new Error("シート「" + SHEET_NAME + "」が見つかりません。");
  }

  var lastRow = sheet.getLastRow();
  if (lastRow <= 1) return [];

  var data = sheet.getRange(2, 1, lastRow - 1, 20).getValues();
  var leads = [];

  for (var i = 0; i < data.length; i++) {
    var row = data[i];
    // 会社名が空の行はスキップ
    if (!row[COL.COMPANY]) continue;

    var repName = row[COL.REPRESENTATIVE] || "";
    // 宛名: 代表者名があれば「○○様」、なければ「ご担当者様」
    var displayName = repName ? repName + " 様" : "ご担当者様";

    leads.push({
      row: i + 2, // スプレッドシートの行番号（1始まり）
      company: row[COL.COMPANY] || "",
      category: row[COL.CATEGORY] || "",
      representative: repName,
      displayName: displayName,
      address: row[COL.ADDRESS] || "",
      tel: row[COL.TEL] || "",
      email: row[COL.EMAIL] || "",
      hpUrl: row[COL.HP_URL] || "",
      source: row[COL.SOURCE] || "",
      scrapedDate: row[COL.SCRAPED_DATE] ? Utilities.formatDate(new Date(row[COL.SCRAPED_DATE]), "Asia/Tokyo", "yyyy-MM-dd") : "",
      subject: row[COL.SUBJECT] || "",
      body: row[COL.BODY] || "",
      status: row[COL.STATUS] || "未送信",
      sentDate: row[COL.SENT_DATE] ? Utilities.formatDate(new Date(row[COL.SENT_DATE]), "Asia/Tokyo", "yyyy-MM-dd HH:mm") : "",
      reaction: row[COL.REACTION] || "",
      reactionMemo: row[COL.REACTION_MEMO] || "",
      phase: row[COL.PHASE] || "リード",
      nextAction: row[COL.NEXT_ACTION] || "",
      followDate: row[COL.FOLLOW_DATE] ? Utilities.formatDate(new Date(row[COL.FOLLOW_DATE]), "Asia/Tokyo", "yyyy-MM-dd") : "",
      followCount: row[COL.FOLLOW_COUNT] || 0,
      memo: row[COL.MEMO] || "",
    });
  }

  return leads;
}


/**
 * メール件名・本文を更新する
 * @param {number} row - スプレッドシートの行番号
 * @param {string} subject - 件名
 * @param {string} body - 本文
 * @returns {Object} 結果
 */
function updateEmail(row, subject, body) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
  if (!sheet) throw new Error("シートが見つかりません。");

  sheet.getRange(row, COL.SUBJECT + 1).setValue(subject);
  sheet.getRange(row, COL.BODY + 1).setValue(body);

  // ステータスを「下書き済」に更新（まだ送信されていない場合）
  var currentStatus = sheet.getRange(row, COL.STATUS + 1).getValue();
  if (currentStatus === "未送信" || !currentStatus) {
    sheet.getRange(row, COL.STATUS + 1).setValue("下書き済");
  }

  return { success: true, message: "メール文面を保存しました。" };
}


/**
 * ステータスを更新する
 * @param {number} row - スプレッドシートの行番号
 * @param {string} status - 新しいステータス
 * @returns {Object} 結果
 */
function updateStatus(row, status) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
  if (!sheet) throw new Error("シートが見つかりません。");

  sheet.getRange(row, COL.STATUS + 1).setValue(status);

  return { success: true, message: "ステータスを「" + status + "」に更新しました。" };
}


/**
 * 営業フェーズを更新する
 * @param {number} row - スプレッドシートの行番号
 * @param {string} phase - 新しいフェーズ
 * @returns {Object} 結果
 */
function updatePhase(row, phase) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
  if (!sheet) throw new Error("シートが見つかりません。");

  sheet.getRange(row, COL.PHASE + 1).setValue(phase);

  return { success: true, message: "営業フェーズを「" + phase + "」に更新しました。" };
}


/**
 * メールを送信する
 * @param {number} row - スプレッドシートの行番号
 * @returns {Object} 結果
 */
function sendEmail(row) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
  if (!sheet) throw new Error("シートが見つかりません。");

  var data = sheet.getRange(row, 1, 1, 20).getValues()[0];
  var email = data[COL.EMAIL];
  var subject = data[COL.SUBJECT];
  var body = data[COL.BODY];
  var status = data[COL.STATUS];

  // バリデーション
  if (!email) {
    return { success: false, message: "メールアドレスが設定されていません。" };
  }
  if (!subject || !body) {
    return { success: false, message: "件名または本文が空です。" };
  }
  if (status === "送信済み") {
    return { success: false, message: "既に送信済みです。" };
  }

  try {
    GmailApp.sendEmail(email, subject, body, {
      name: SENDER_NAME,
      replyTo: SENDER_EMAIL,
    });

    // フォロー回数をインクリメント
    var followCount = data[COL.FOLLOW_COUNT] || 0;
    var newFollowCount = Number(followCount) + 1;

    // ステータス更新
    sheet.getRange(row, COL.STATUS + 1).setValue("送信済み");
    sheet.getRange(row, COL.SENT_DATE + 1).setValue(new Date());
    sheet.getRange(row, COL.FOLLOW_COUNT + 1).setValue(newFollowCount);

    // 送信履歴に記録
    var company = data[COL.COMPANY];
    var repName = data[COL.REPRESENTATIVE] || "";
    var displayName = repName ? repName + " 様" : "ご担当者様";
    var sendType = newFollowCount <= 1 ? "初回" : "フォロー";

    logSendHistory(row, company, displayName, email, subject, body, sendType, newFollowCount);

    return { success: true, message: company + " へのメールを送信しました。" };

  } catch (e) {
    sheet.getRange(row, COL.STATUS + 1).setValue("エラー");
    sheet.getRange(row, COL.MEMO + 1).setValue("送信エラー: " + e.message);
    return { success: false, message: "送信エラー: " + e.message };
  }
}


/**
 * 複数のメールを一括送信する
 * @param {Array<number>} rows - 送信対象の行番号配列
 * @returns {Object} 結果
 */
function bulkSend(rows) {
  var successCount = 0;
  var errorCount = 0;
  var errors = [];

  for (var i = 0; i < rows.length; i++) {
    var result = sendEmail(rows[i]);
    if (result.success) {
      successCount++;
    } else {
      errorCount++;
      errors.push(rows[i] + "行目: " + result.message);
    }

    // Gmail送信レート制限を避けるため少し待つ
    if (i < rows.length - 1) {
      Utilities.sleep(1000);
    }
  }

  var message = successCount + "件送信完了";
  if (errorCount > 0) {
    message += "（" + errorCount + "件エラー）";
  }

  return { success: errorCount === 0, message: message, errors: errors };
}


/**
 * ステータスを「送信許可」に一括更新する
 * @param {Array<number>} rows - 対象の行番号配列
 * @returns {Object} 結果
 */
function bulkApprove(rows) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
  if (!sheet) throw new Error("シートが見つかりません。");

  var count = 0;
  for (var i = 0; i < rows.length; i++) {
    var currentStatus = sheet.getRange(rows[i], COL.STATUS + 1).getValue();
    if (currentStatus !== "送信済み") {
      sheet.getRange(rows[i], COL.STATUS + 1).setValue("送信許可");
      count++;
    }
  }

  return { success: true, message: count + "件を「送信許可」に更新しました。" };
}


/**
 * 反応情報を更新する
 * @param {number} row - スプレッドシートの行番号
 * @param {string} reaction - 反応タイプ（返信あり/開封のみ/なし）
 * @param {string} memo - 反応メモ
 * @returns {Object} 結果
 */
function updateReaction(row, reaction, memo) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
  if (!sheet) throw new Error("シートが見つかりません。");

  sheet.getRange(row, COL.REACTION + 1).setValue(reaction);
  if (memo) {
    sheet.getRange(row, COL.REACTION_MEMO + 1).setValue(memo);
  }

  return { success: true, message: "反応情報を更新しました。" };
}


// ============================================================
// 送信履歴
// ============================================================

/**
 * 送信履歴シートを取得する（なければ作成）
 * @returns {Worksheet} 送信履歴シート
 */
function getHistorySheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(HISTORY_SHEET_NAME);

  if (!sheet) {
    sheet = ss.insertSheet(HISTORY_SHEET_NAME);
    sheet.appendRow(HISTORY_HEADER);
    // ヘッダー行を太字・背景色付きに
    var headerRange = sheet.getRange(1, 1, 1, HISTORY_HEADER.length);
    headerRange.setFontWeight("bold");
    headerRange.setBackground("#f8f9fa");
    // 列幅の調整
    sheet.setColumnWidth(HIST.SENT_DATE + 1, 160);  // 送信日時
    sheet.setColumnWidth(HIST.COMPANY + 1, 200);     // 会社名
    sheet.setColumnWidth(HIST.SUBJECT + 1, 300);     // 件名
    sheet.setColumnWidth(HIST.BODY + 1, 500);        // 本文
    sheet.setFrozenRows(1);
  }

  return sheet;
}


/**
 * 送信履歴を記録する
 * @param {number} leadRow - リード一覧の行番号
 * @param {string} company - 会社名
 * @param {string} displayName - 宛名
 * @param {string} email - メールアドレス
 * @param {string} subject - 件名
 * @param {string} body - 本文
 * @param {string} sendType - 送信種別（初回/フォロー）
 * @param {number} followNum - フォロー回数
 */
function logSendHistory(leadRow, company, displayName, email, subject, body, sendType, followNum) {
  var histSheet = getHistorySheet_();

  var record = [
    new Date(),     // 送信日時
    leadRow,        // リード行番号
    company,        // 会社名
    displayName,    // 宛名
    email,          // メールアドレス
    subject,        // 件名
    body,           // 本文
    sendType,       // 送信種別
    followNum,      // フォロー回数
  ];

  histSheet.appendRow(record);
}


/**
 * 特定リードの送信履歴を取得する
 * @param {number} leadRow - リード一覧の行番号
 * @returns {Array<Object>} 送信履歴の配列（新しい順）
 */
function getSendHistory(leadRow) {
  var histSheet;
  try {
    histSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(HISTORY_SHEET_NAME);
  } catch (e) {
    return [];
  }
  if (!histSheet) return [];

  var lastRow = histSheet.getLastRow();
  if (lastRow <= 1) return [];

  var data = histSheet.getRange(2, 1, lastRow - 1, HISTORY_HEADER.length).getValues();
  var history = [];

  for (var i = 0; i < data.length; i++) {
    var row = data[i];
    if (Number(row[HIST.LEAD_ROW]) === Number(leadRow)) {
      history.push({
        sentDate: row[HIST.SENT_DATE] ? Utilities.formatDate(new Date(row[HIST.SENT_DATE]), "Asia/Tokyo", "yyyy-MM-dd HH:mm") : "",
        company: row[HIST.COMPANY] || "",
        displayName: row[HIST.DISPLAY_NAME] || "",
        email: row[HIST.EMAIL] || "",
        subject: row[HIST.SUBJECT] || "",
        body: row[HIST.BODY] || "",
        sendType: row[HIST.SEND_TYPE] || "",
        followNum: row[HIST.FOLLOW_NUM] || 0,
      });
    }
  }

  // 新しい順に並べ替え
  history.reverse();
  return history;
}


// ============================================================
// スクレイピング機能（GAS-native）
// ============================================================

var SCRAPING_CONFIG = {
  GOOGLE_MAPS_API_KEY: "AIzaSyDAq2i7_NL0epytEQqi6XfbLjr-eubjHDE",

  AREAS: ["東京都", "神奈川県", "千葉県", "埼玉県"],

  SEARCH_QUERIES: {
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
  },

  // メール除外パターン
  EXCLUDED_EMAIL_PATTERNS: [
    /^info@example\./i,
    /^test@/i,
    /^admin@/i,
    /^webmaster@/i,
    /^postmaster@/i,
    /^noreply@/i,
    /^no-reply@/i,
    /@sampleserver\./i,
    /@example\./i,
    /\.png$/i,
    /\.jpg$/i,
    /\.gif$/i,
    /\.svg$/i,
  ],

  // コンタクトページのパターン
  CONTACT_PAGE_PATHS: [
    "contact", "inquiry", "toiawase", "otoiawase",
    "ask", "form", "mail", "email",
  ],

  // 代表者名キーワード（優先度順）
  REP_KEYWORDS: ["代表取締役", "代表者", "社長", "代表"],

  // 5分制限（1分マージン）
  TIME_LIMIT_MS: 5 * 60 * 1000,
};


/**
 * Google Maps Text Search APIで企業を検索する
 * @param {string} query - 検索クエリ
 * @param {string} area - エリア名
 * @returns {Array<Object>} 検索結果
 */
function searchGoogleMaps_(query, area) {
  var fullQuery = query + " " + area;
  var results = [];
  var pageToken = null;

  for (var page = 0; page < 3; page++) {
    var params = {
      query: fullQuery,
      key: SCRAPING_CONFIG.GOOGLE_MAPS_API_KEY,
      language: "ja",
      region: "jp",
    };
    if (pageToken) {
      params.pagetoken = pageToken;
    }

    var url = "https://maps.googleapis.com/maps/api/place/textsearch/json?" + buildQueryString_(params);

    try {
      var response = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
      var json = JSON.parse(response.getContentText());

      if (json.status !== "OK" && json.status !== "ZERO_RESULTS") {
        Logger.log("Maps API error: " + json.status + " - " + (json.error_message || ""));
        break;
      }

      if (json.results) {
        for (var i = 0; i < json.results.length; i++) {
          results.push(json.results[i]);
        }
      }

      pageToken = json.next_page_token || null;
      if (!pageToken) break;

      // next_page_tokenが有効になるまで待機
      Utilities.sleep(2000);
    } catch (e) {
      Logger.log("Maps API fetch error: " + e.message);
      break;
    }
  }

  return results;
}


/**
 * Google Maps Place Details APIで詳細情報を取得する
 * @param {string} placeId - Place ID
 * @returns {Object|null} 詳細情報
 */
function getPlaceDetails_(placeId) {
  var params = {
    place_id: placeId,
    key: SCRAPING_CONFIG.GOOGLE_MAPS_API_KEY,
    language: "ja",
    fields: "name,formatted_address,formatted_phone_number,website,place_id",
  };
  var url = "https://maps.googleapis.com/maps/api/place/details/json?" + buildQueryString_(params);

  try {
    var response = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
    var json = JSON.parse(response.getContentText());

    if (json.status === "OK" && json.result) {
      return json.result;
    }
  } catch (e) {
    Logger.log("Place Details error: " + e.message);
  }
  return null;
}


/**
 * URLクエリ文字列を構築する
 * @param {Object} params - パラメータオブジェクト
 * @returns {string} クエリ文字列
 */
function buildQueryString_(params) {
  var parts = [];
  for (var key in params) {
    parts.push(encodeURIComponent(key) + "=" + encodeURIComponent(params[key]));
  }
  return parts.join("&");
}


/**
 * HTMLからメールアドレスを抽出する
 * @param {string} html - HTMLコンテンツ
 * @returns {Array<string>} メールアドレスの配列
 */
function extractEmailsFromHtml_(html) {
  if (!html) return [];

  var pattern = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g;
  var matches = html.match(pattern);
  if (!matches) return [];

  var unique = {};
  var result = [];
  for (var i = 0; i < matches.length; i++) {
    var email = matches[i].toLowerCase();
    if (unique[email]) continue;

    // 除外パターンチェック
    var excluded = false;
    for (var j = 0; j < SCRAPING_CONFIG.EXCLUDED_EMAIL_PATTERNS.length; j++) {
      if (SCRAPING_CONFIG.EXCLUDED_EMAIL_PATTERNS[j].test(email)) {
        excluded = true;
        break;
      }
    }
    if (excluded) continue;

    // 画像ファイル拡張子で終わるものを除外
    if (/\.(png|jpg|jpeg|gif|svg|webp|ico|css|js)$/i.test(email)) continue;

    unique[email] = true;
    result.push(email);
  }
  return result;
}


/**
 * HTMLから代表者名を抽出する
 * @param {string} html - HTMLコンテンツ
 * @returns {string} 代表者名（見つからない場合は空文字）
 */
function extractRepresentativeName_(html) {
  if (!html) return "";

  var keywords = SCRAPING_CONFIG.REP_KEYWORDS;

  for (var k = 0; k < keywords.length; k++) {
    var keyword = keywords[k];

    // <th>代表取締役</th><td>名前</td> パターン
    var thPattern = new RegExp(
      "<th[^>]*>[^<]*" + keyword + "[^<]*<\\/th>\\s*<td[^>]*>([^<]+)<\\/td>",
      "i"
    );
    var thMatch = html.match(thPattern);
    if (thMatch) {
      var name = cleanRepName_(thMatch[1]);
      if (name) return name;
    }

    // <dt>代表取締役</dt><dd>名前</dd> パターン
    var dtPattern = new RegExp(
      "<dt[^>]*>[^<]*" + keyword + "[^<]*<\\/dt>\\s*<dd[^>]*>([^<]+)<\\/dd>",
      "i"
    );
    var dtMatch = html.match(dtPattern);
    if (dtMatch) {
      var name2 = cleanRepName_(dtMatch[1]);
      if (name2) return name2;
    }

    // 「代表取締役　○○ ○○」テキストパターン
    var textPattern = new RegExp(
      keyword + "[\\s\u3000:：]+([\\u4E00-\\u9FFF\\u3040-\\u309F\\u30A0-\\u30FF]{1,6}[\\s\u3000]*[\\u4E00-\\u9FFF\\u3040-\\u309F\\u30A0-\\u30FF]{1,6})",
      "i"
    );
    var textMatch = html.match(textPattern);
    if (textMatch) {
      var name3 = cleanRepName_(textMatch[1]);
      if (name3) return name3;
    }
  }

  return "";
}


/**
 * 代表者名をクリーニングする
 * @param {string} raw - 生の名前文字列
 * @returns {string} クリーンな名前（無効な場合は空文字）
 */
function cleanRepName_(raw) {
  if (!raw) return "";
  var name = raw.replace(/[\s\u3000]+/g, " ").trim();

  // 無効な名前を除外
  if (name.length < 2 || name.length > 12) return "";
  if (/^[a-zA-Z0-9\s]+$/.test(name)) return "";
  if (/あいさつ|採用|募集|会社概要|事業内容|お問い合わせ|view/i.test(name)) return "";

  return name;
}


/**
 * 企業HPからメールアドレスと代表者名を取得する
 * @param {string} url - 企業のURL
 * @returns {Object} {email: string, representative: string}
 */
function scrapeWebsiteInfo_(url) {
  var result = { email: "", representative: "" };
  if (!url) return result;

  // URLの正規化
  if (url.indexOf("http") !== 0) {
    url = "https://" + url;
  }

  try {
    // トップページ取得
    var response = UrlFetchApp.fetch(url, {
      muteHttpExceptions: true,
      followRedirects: true,
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
      validateHttpsCertificates: false,
    });

    var code = response.getResponseCode();
    if (code >= 400) return result;

    var html = response.getContentText();

    // トップページからメールと代表者名を探す
    var emails = extractEmailsFromHtml_(html);
    if (emails.length > 0) result.email = emails[0];

    var rep = extractRepresentativeName_(html);
    if (rep) result.representative = rep;

    // メールが見つからなければコンタクトページを探す
    if (!result.email) {
      var contactUrls = findContactPageUrls_(html, url);
      for (var i = 0; i < contactUrls.length && i < 3; i++) {
        try {
          Utilities.sleep(500);
          var subResp = UrlFetchApp.fetch(contactUrls[i], {
            muteHttpExceptions: true,
            followRedirects: true,
            headers: {
              "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            },
            validateHttpsCertificates: false,
          });
          if (subResp.getResponseCode() < 400) {
            var subHtml = subResp.getContentText();
            var subEmails = extractEmailsFromHtml_(subHtml);
            if (subEmails.length > 0) {
              result.email = subEmails[0];
              break;
            }
            // 代表者名がまだなければサブページからも探す
            if (!result.representative) {
              var subRep = extractRepresentativeName_(subHtml);
              if (subRep) result.representative = subRep;
            }
          }
        } catch (e) {
          // サブページのエラーは無視
        }
      }
    }

    // 代表者名がまだ見つからなければ「会社概要」ページを探す
    if (!result.representative) {
      var aboutUrls = findAboutPageUrls_(html, url);
      for (var i = 0; i < aboutUrls.length && i < 2; i++) {
        try {
          Utilities.sleep(500);
          var aboutResp = UrlFetchApp.fetch(aboutUrls[i], {
            muteHttpExceptions: true,
            followRedirects: true,
            headers: {
              "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            },
            validateHttpsCertificates: false,
          });
          if (aboutResp.getResponseCode() < 400) {
            var aboutHtml = aboutResp.getContentText();
            var aboutRep = extractRepresentativeName_(aboutHtml);
            if (aboutRep) {
              result.representative = aboutRep;
              // ついでにメールも探す
              if (!result.email) {
                var aboutEmails = extractEmailsFromHtml_(aboutHtml);
                if (aboutEmails.length > 0) result.email = aboutEmails[0];
              }
              break;
            }
          }
        } catch (e) {
          // 無視
        }
      }
    }

  } catch (e) {
    Logger.log("Website scrape error for " + url + ": " + e.message);
  }

  return result;
}


/**
 * HTMLからコンタクトページのURLを探す
 * @param {string} html - HTMLコンテンツ
 * @param {string} baseUrl - ベースURL
 * @returns {Array<string>} コンタクトページのURL配列
 */
function findContactPageUrls_(html, baseUrl) {
  var urls = [];
  var linkPattern = /<a\s[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  var match;

  while ((match = linkPattern.exec(html)) !== null) {
    var href = match[1];
    var text = match[2].replace(/<[^>]+>/g, "").trim();

    var isContact = false;

    // リンクテキストにお問い合わせ系キーワードが含まれるか
    if (/お問い合わせ|問い合わせ|お問合せ|問合せ|contact|inquiry|メール/i.test(text)) {
      isContact = true;
    }

    // URLパスにコンタクト系キーワードが含まれるか
    if (!isContact) {
      var hrefLower = href.toLowerCase();
      for (var i = 0; i < SCRAPING_CONFIG.CONTACT_PAGE_PATHS.length; i++) {
        if (hrefLower.indexOf(SCRAPING_CONFIG.CONTACT_PAGE_PATHS[i]) !== -1) {
          isContact = true;
          break;
        }
      }
    }

    if (isContact) {
      var fullUrl = resolveUrl_(baseUrl, href);
      if (fullUrl && urls.indexOf(fullUrl) === -1) {
        urls.push(fullUrl);
      }
    }
  }

  return urls;
}


/**
 * HTMLから会社概要ページのURLを探す
 * @param {string} html - HTMLコンテンツ
 * @param {string} baseUrl - ベースURL
 * @returns {Array<string>} 会社概要ページのURL配列
 */
function findAboutPageUrls_(html, baseUrl) {
  var urls = [];
  var linkPattern = /<a\s[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  var match;

  while ((match = linkPattern.exec(html)) !== null) {
    var href = match[1];
    var text = match[2].replace(/<[^>]+>/g, "").trim();

    var isAbout = false;
    if (/会社概要|会社案内|about|company|profile|corporate/i.test(text)) {
      isAbout = true;
    }
    if (!isAbout && /about|company|profile|corporate|gaiyou/i.test(href.toLowerCase())) {
      isAbout = true;
    }

    if (isAbout) {
      var fullUrl = resolveUrl_(baseUrl, href);
      if (fullUrl && urls.indexOf(fullUrl) === -1) {
        urls.push(fullUrl);
      }
    }
  }

  return urls;
}


/**
 * 相対URLを絶対URLに解決する
 * @param {string} baseUrl - ベースURL
 * @param {string} href - 解決するURL
 * @returns {string|null} 絶対URL
 */
function resolveUrl_(baseUrl, href) {
  if (!href || href.indexOf("javascript:") === 0 || href.indexOf("mailto:") === 0 || href === "#") {
    return null;
  }
  if (href.indexOf("http") === 0) {
    return href;
  }
  // ベースURLの末尾スラッシュを処理
  var base = baseUrl.replace(/\/$/, "");
  if (href.indexOf("/") === 0) {
    // ルート相対パス
    var origin = base.match(/^https?:\/\/[^\/]+/);
    if (origin) return origin[0] + href;
  }
  return base + "/" + href;
}


/**
 * UIから呼ばれるメインスクレイピング関数
 * @param {string} area - エリア名
 * @param {string} category - 業種カテゴリ
 * @returns {Object} 実行結果
 */
function runScraping(area, category) {
  var startTime = new Date().getTime();
  var log = [];

  log.push("開始: " + area + " × " + category);

  // バリデーション
  var queries = SCRAPING_CONFIG.SEARCH_QUERIES[category];
  if (!queries) {
    return { success: false, message: "無効なカテゴリ: " + category, log: log };
  }
  if (SCRAPING_CONFIG.AREAS.indexOf(area) === -1) {
    return { success: false, message: "無効なエリア: " + area, log: log };
  }

  // シート取得
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
  if (!sheet) {
    return { success: false, message: "シート「" + SHEET_NAME + "」が見つかりません。", log: log };
  }

  // 既存データの会社名を取得（重複チェック用）
  var existingNames = getExistingCompanyNames_(sheet);

  // Phase 1: Google Maps API検索
  log.push("Phase 1: Google Maps API検索...");
  var allPlaces = [];
  var seenPlaceIds = {};

  for (var q = 0; q < queries.length; q++) {
    // タイムアウトチェック
    if (new Date().getTime() - startTime > SCRAPING_CONFIG.TIME_LIMIT_MS) {
      log.push("タイムアウト: 検索フェーズで時間切れ");
      break;
    }

    log.push("  検索: " + queries[q] + " " + area);
    var results = searchGoogleMaps_(queries[q], area);
    var newCount = 0;

    for (var r = 0; r < results.length; r++) {
      var place = results[r];
      var pid = place.place_id;

      // place_idで重複排除
      if (seenPlaceIds[pid]) continue;
      seenPlaceIds[pid] = true;

      // 既存データとの重複チェック（会社名）
      var placeName = place.name || "";
      if (existingNames[placeName]) {
        log.push("    スキップ（既存）: " + placeName);
        continue;
      }

      allPlaces.push(place);
      newCount++;
    }
    log.push("  → " + results.length + "件取得、新規" + newCount + "件");
  }

  log.push("検索完了: 新規" + allPlaces.length + "件");

  if (allPlaces.length === 0) {
    var elapsed = Math.round((new Date().getTime() - startTime) / 1000);
    return {
      success: true,
      message: "新規の企業は見つかりませんでした。",
      total: 0,
      emailCount: 0,
      repCount: 0,
      elapsed: elapsed,
      log: log,
    };
  }

  // Phase 2: Place Details + HP解析
  log.push("Phase 2: 詳細取得 & HP解析...");
  var leads = [];
  var emailCount = 0;
  var repCount = 0;

  for (var i = 0; i < allPlaces.length; i++) {
    // タイムアウトチェック
    if (new Date().getTime() - startTime > SCRAPING_CONFIG.TIME_LIMIT_MS) {
      log.push("タイムアウト: " + i + "/" + allPlaces.length + "件処理済みで中断");
      break;
    }

    var place = allPlaces[i];
    var details = getPlaceDetails_(place.place_id);

    var lead = {
      company: (details && details.name) || place.name || "",
      category: category,
      representative: "",
      address: (details && details.formatted_address) || place.formatted_address || "",
      tel: (details && details.formatted_phone_number) || "",
      email: "",
      hpUrl: (details && details.website) || "",
      source: "Google Maps API",
      scrapedDate: new Date(),
    };

    // HPからメール・代表者名取得
    if (lead.hpUrl) {
      var webInfo = scrapeWebsiteInfo_(lead.hpUrl);
      lead.email = webInfo.email;
      lead.representative = webInfo.representative;
    }

    if (lead.email) emailCount++;
    if (lead.representative) repCount++;

    leads.push(lead);

    if ((i + 1) % 10 === 0) {
      log.push("  " + (i + 1) + "/" + allPlaces.length + "件処理済み");
    }
  }

  // Phase 3: スプレッドシートに書き込み
  log.push("Phase 3: スプレッドシートに書き込み...");
  addLeadsToSheet_(sheet, leads);

  var elapsed = Math.round((new Date().getTime() - startTime) / 1000);
  log.push("完了: " + leads.length + "件書き込み、" + elapsed + "秒");

  return {
    success: true,
    message: leads.length + "件の企業情報を取得しました。",
    total: leads.length,
    emailCount: emailCount,
    repCount: repCount,
    elapsed: elapsed,
    log: log,
  };
}


/**
 * 既存の会社名マップを取得する
 * @param {Sheet} sheet - スプレッドシート
 * @returns {Object} 会社名のマップ
 */
function getExistingCompanyNames_(sheet) {
  var map = {};
  var lastRow = sheet.getLastRow();
  if (lastRow <= 1) return map;

  var names = sheet.getRange(2, COL.COMPANY + 1, lastRow - 1, 1).getValues();
  for (var i = 0; i < names.length; i++) {
    var name = names[i][0];
    if (name) map[name] = true;
  }
  return map;
}


/**
 * リードをスプレッドシートに書き込む
 * @param {Sheet} sheet - スプレッドシート
 * @param {Array<Object>} leads - リードデータの配列
 */
function addLeadsToSheet_(sheet, leads) {
  if (leads.length === 0) return;

  var rows = [];
  for (var i = 0; i < leads.length; i++) {
    var lead = leads[i];
    var row = new Array(20);
    row[COL.COMPANY] = lead.company;
    row[COL.CATEGORY] = lead.category;
    row[COL.REPRESENTATIVE] = lead.representative;
    row[COL.ADDRESS] = lead.address;
    row[COL.TEL] = lead.tel;
    row[COL.EMAIL] = lead.email;
    row[COL.HP_URL] = lead.hpUrl;
    row[COL.SOURCE] = lead.source;
    row[COL.SCRAPED_DATE] = lead.scrapedDate;
    row[COL.SUBJECT] = "";
    row[COL.BODY] = "";
    row[COL.STATUS] = "未送信";
    row[COL.SENT_DATE] = "";
    row[COL.REACTION] = "";
    row[COL.REACTION_MEMO] = "";
    row[COL.PHASE] = "リード";
    row[COL.NEXT_ACTION] = "";
    row[COL.FOLLOW_DATE] = "";
    row[COL.FOLLOW_COUNT] = 0;
    row[COL.MEMO] = "";
    rows.push(row);
  }

  var lastRow = sheet.getLastRow();
  sheet.getRange(lastRow + 1, 1, rows.length, 20).setValues(rows);
}


/**
 * UIにスクレイピングの設定情報を返す
 * @returns {Object} エリア・カテゴリの選択肢
 */
function getScrapingConfig() {
  return {
    areas: SCRAPING_CONFIG.AREAS,
    categories: Object.keys(SCRAPING_CONFIG.SEARCH_QUERIES),
  };
}
