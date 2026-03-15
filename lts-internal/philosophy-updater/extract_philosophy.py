#!/usr/bin/env python3
"""
Limitless AI ログから龍竹一生の思想・経営理念を抽出するスクリプト

使用方法:
    python extract_philosophy.py
"""

import os
import json
from datetime import datetime
from pathlib import Path
from typing import List, Dict
from dotenv import load_dotenv

# 環境変数の読み込み
load_dotenv()

# パス設定
SCRIPT_DIR = Path(__file__).parent
RAW_LOGS_DIR = SCRIPT_DIR / os.getenv('RAW_LOGS_DIR', '../../.limitless/raw-logs')
PHILOSOPHY_EXTRACT_DIR = SCRIPT_DIR / os.getenv('PHILOSOPHY_EXTRACT_DIR', '../../.limitless/philosophy-extract')
CLAUDE_MD_PATH = SCRIPT_DIR / os.getenv('CLAUDE_MD_PATH', '../../CLAUDE.md')

# AI設定
AI_PROVIDER = os.getenv('AI_PROVIDER', 'gemini').lower()


def initialize_ai_client():
    """AIクライアントを初期化"""
    if AI_PROVIDER == 'gemini':
        import google.generativeai as genai
        api_key = os.getenv('GOOGLE_API_KEY')
        if not api_key:
            raise ValueError("GOOGLE_API_KEY が設定されていません")
        genai.configure(api_key=api_key)
        model_name = os.getenv('GEMINI_MODEL', 'gemini-1.5-flash')
        model = genai.GenerativeModel(model_name)
        print(f"🤖 AI: Google Gemini ({model_name})")
        return ('gemini', model)

    elif AI_PROVIDER == 'claude':
        from anthropic import Anthropic
        api_key = os.getenv('ANTHROPIC_API_KEY')
        if not api_key:
            raise ValueError("ANTHROPIC_API_KEY が設定されていません")
        client = Anthropic(api_key=api_key)
        model_name = os.getenv('CLAUDE_MODEL', 'claude-sonnet-4-20250514')
        print(f"🤖 AI: Anthropic Claude ({model_name})")
        return ('claude', client, model_name)

    else:
        raise ValueError(f"未対応のAI_PROVIDER: {AI_PROVIDER}")


def read_all_logs() -> str:
    """raw-logs/内の全ファイルを読み込んで統合"""
    logs_dir = RAW_LOGS_DIR.resolve()

    if not logs_dir.exists():
        print(f"⚠️  ログディレクトリが見つかりません: {logs_dir}")
        return ""

    all_text = []
    file_count = 0

    for file_path in sorted(logs_dir.glob('*')):
        if file_path.is_file() and not file_path.name.startswith('.'):
            try:
                with open(file_path, 'r', encoding='utf-8') as f:
                    content = f.read()
                    all_text.append(f"# ファイル: {file_path.name}\n{content}\n")
                    file_count += 1
                    print(f"✓ 読み込み: {file_path.name} ({len(content)} 文字)")
            except Exception as e:
                print(f"✗ 読み込みエラー: {file_path.name} - {e}")

    print(f"\n📄 合計 {file_count} ファイル読み込み完了")
    return "\n\n".join(all_text)


def extract_philosophy_with_gemini(model, logs_text: str) -> Dict[str, str]:
    """Gemini APIを使って思想を抽出"""

    if not logs_text.strip():
        print("⚠️  ログデータが空です")
        return {}

    print("\n🤖 Gemini AI分析を開始...")

    prompt = f"""あなたは経営コンサルタントです。以下は、龍竹一生（りゅうたけ かずき）が日常的に話している内容を記録したログです。

このログから、以下のカテゴリに分けて「龍竹一生の経営思想・理念」を抽出してください：

1. **ビジョン・ミッション**: 何を目指しているのか、どんな未来を創りたいのか
2. **事業方針・戦略**: 各事業をどう位置づけ、どう成長させるか
3. **顧客価値の定義**: 顧客にどんな価値を提供したいのか
4. **意思決定基準**: 判断に迷った時、何を軸に決めるか
5. **組織文化・価値観**: チームや組織をどう作りたいか
6. **技術・システムに対する考え方**: ITやAIをどう活用するか

**重要な注意事項**:
- 日常会話や雑談は除外してください
- 具体的な個人名や固有名詞は一般化してください
- 「〜と言っていた」ではなく、「〜という考え方」として記述
- 箇条書きでまとめてください

---

# ログデータ

{logs_text[:50000]}  # トークン制限のため最初の50000文字のみ

---

JSON形式で以下のように返してください（必ずJSONのみを返してください）：

{{
  "vision": "ビジョン・ミッションの内容",
  "strategy": "事業方針・戦略の内容",
  "customer_value": "顧客価値の定義",
  "decision_criteria": "意思決定基準",
  "culture": "組織文化・価値観",
  "technology": "技術・システムに対する考え方"
}}
"""

    try:
        response = model.generate_content(
            prompt,
            generation_config={
                'temperature': 0.7,
                'top_p': 0.95,
                'top_k': 40,
                'max_output_tokens': 8192,
            }
        )

        result_text = response.text

        # JSONパース試行
        try:
            # コードブロックを除去
            if "```json" in result_text:
                result_text = result_text.split("```json")[1].split("```")[0]
            elif "```" in result_text:
                result_text = result_text.split("```")[1].split("```")[0]

            philosophy = json.loads(result_text.strip())
            print("✓ Gemini AI分析完了")
            return philosophy
        except json.JSONDecodeError as e:
            print(f"⚠️  JSON解析失敗: {e}")
            print(f"生データ:\n{result_text[:500]}")
            return {"raw_output": result_text}

    except Exception as e:
        print(f"✗ Gemini AI分析エラー: {e}")
        return {}


def extract_philosophy_with_claude(client, model_name: str, logs_text: str) -> Dict[str, str]:
    """Claude APIを使って思想を抽出"""

    if not logs_text.strip():
        print("⚠️  ログデータが空です")
        return {}

    print("\n🤖 Claude AI分析を開始...")

    prompt = f"""あなたは経営コンサルタントです。以下は、龍竹一生（りゅうたけ かずき）が日常的に話している内容を記録したログです。

このログから、以下のカテゴリに分けて「龍竹一生の経営思想・理念」を抽出してください：

1. **ビジョン・ミッション**: 何を目指しているのか、どんな未来を創りたいのか
2. **事業方針・戦略**: 各事業をどう位置づけ、どう成長させるか
3. **顧客価値の定義**: 顧客にどんな価値を提供したいのか
4. **意思決定基準**: 判断に迷った時、何を軸に決めるか
5. **組織文化・価値観**: チームや組織をどう作りたいか
6. **技術・システムに対する考え方**: ITやAIをどう活用するか

**重要な注意事項**:
- 日常会話や雑談は除外してください
- 具体的な個人名や固有名詞は一般化してください
- 「〜と言っていた」ではなく、「〜という考え方」として記述
- 箇条書きでまとめてください

---

# ログデータ

{logs_text[:50000]}  # トークン制限のため最初の50000文字のみ

---

JSON形式で以下のように返してください：

{{
  "vision": "ビジョン・ミッションの内容",
  "strategy": "事業方針・戦略の内容",
  "customer_value": "顧客価値の定義",
  "decision_criteria": "意思決定基準",
  "culture": "組織文化・価値観",
  "technology": "技術・システムに対する考え方"
}}
"""

    try:
        response = client.messages.create(
            model=model_name,
            max_tokens=4096,
            messages=[{"role": "user", "content": prompt}]
        )

        result_text = response.content[0].text

        # JSONパース試行
        try:
            # コードブロックを除去
            if "```json" in result_text:
                result_text = result_text.split("```json")[1].split("```")[0]
            elif "```" in result_text:
                result_text = result_text.split("```")[1].split("```")[0]

            philosophy = json.loads(result_text.strip())
            print("✓ Claude AI分析完了")
            return philosophy
        except json.JSONDecodeError:
            print("⚠️  JSON解析失敗、テキストとして保存します")
            return {"raw_output": result_text}

    except Exception as e:
        print(f"✗ Claude AI分析エラー: {e}")
        return {}


def save_philosophy(philosophy: Dict[str, str]) -> Path:
    """抽出した思想を保存"""
    extract_dir = PHILOSOPHY_EXTRACT_DIR.resolve()
    extract_dir.mkdir(parents=True, exist_ok=True)

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    output_file = extract_dir / f"philosophy_{timestamp}.md"

    with open(output_file, 'w', encoding='utf-8') as f:
        f.write(f"# 龍竹一生 経営思想・理念\n\n")
        f.write(f"**抽出日時**: {datetime.now().strftime('%Y年%m月%d日 %H:%M:%S')}\n")
        f.write(f"**使用AI**: {AI_PROVIDER.upper()}\n\n")
        f.write("---\n\n")

        category_names = {
            "vision": "## 🎯 ビジョン・ミッション",
            "strategy": "## 📊 事業方針・戦略",
            "customer_value": "## 💎 顧客価値の定義",
            "decision_criteria": "## ⚖️ 意思決定基準",
            "culture": "## 🌱 組織文化・価値観",
            "technology": "## 🔧 技術・システムに対する考え方"
        }

        for key, title in category_names.items():
            if key in philosophy:
                f.write(f"{title}\n\n")
                f.write(f"{philosophy[key]}\n\n")

        # raw_outputがある場合
        if "raw_output" in philosophy:
            f.write("## 📝 抽出結果（生データ）\n\n")
            f.write(philosophy["raw_output"])

    print(f"\n💾 思想データを保存: {output_file.name}")
    return output_file


def update_claude_md(philosophy: Dict[str, str]):
    """CLAUDE.mdの経営理念セクションを更新"""
    claude_md_path = CLAUDE_MD_PATH.resolve()

    if not claude_md_path.exists():
        print(f"⚠️  CLAUDE.mdが見つかりません: {claude_md_path}")
        return

    with open(claude_md_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # 経営理念セクションの構築
    philosophy_section = f"""## 🎯 経営理念・事業方針（最上位概念）

> **自動生成**: このセクションは Limitless AI ログから自動抽出されています
> **最終更新**: {datetime.now().strftime('%Y年%m月%d日 %H:%M:%S')}
> **使用AI**: {AI_PROVIDER.upper()}

### ビジョン・ミッション
{philosophy.get('vision', '（未抽出）')}

### 事業方針・戦略
{philosophy.get('strategy', '（未抽出）')}

### 顧客価値の定義
{philosophy.get('customer_value', '（未抽出）')}

### 意思決定基準
{philosophy.get('decision_criteria', '（未抽出）')}

### 組織文化・価値観
{philosophy.get('culture', '（未抽出）')}

### 技術・システムに対する考え方
{philosophy.get('technology', '（未抽出）')}

---

"""

    # 既存の経営理念セクションを置き換え、または新規追加
    if "## 🎯 経営理念・事業方針（最上位概念）" in content:
        # 既存セクションを更新
        start = content.find("## 🎯 経営理念・事業方針（最上位概念）")
        # 次の ## セクションを探す
        next_section = content.find("\n## ", start + 10)
        if next_section != -1:
            # 次のセクションの直前の --- を含めて置き換え
            end_marker = content.rfind("\n---\n", start, next_section)
            if end_marker != -1:
                end = end_marker + 5  # "\n---\n" の長さ
            else:
                end = next_section
        else:
            # 最後のセクションの場合
            end = len(content)

        new_content = content[:start] + philosophy_section + content[end:]
    else:
        # 新規追加（タイトルの後に挿入）
        lines = content.split('\n')
        insert_pos = 0
        for i, line in enumerate(lines):
            if line.startswith('# '):
                # タイトル行の後の "---" を探す
                for j in range(i + 1, min(i + 10, len(lines))):
                    if lines[j].strip() == '---':
                        insert_pos = j + 1
                        break
                break

        lines.insert(insert_pos, '\n' + philosophy_section)
        new_content = '\n'.join(lines)

    # 書き込み
    with open(claude_md_path, 'w', encoding='utf-8') as f:
        f.write(new_content)

    print(f"✓ CLAUDE.md を更新しました")


def main():
    """メイン処理"""
    print("=" * 60)
    print("  Limitless AI → 経営思想抽出システム")
    print("=" * 60)

    # AI初期化
    try:
        ai_info = initialize_ai_client()
    except Exception as e:
        print(f"\n❌ AI初期化エラー: {e}")
        return

    # 1. ログ読み込み
    logs_text = read_all_logs()

    if not logs_text:
        print("\n❌ ログファイルが見つかりませんでした")
        print(f"   ログを {RAW_LOGS_DIR.resolve()} に配置してください")
        return

    # 2. AI分析
    if ai_info[0] == 'gemini':
        philosophy = extract_philosophy_with_gemini(ai_info[1], logs_text)
    elif ai_info[0] == 'claude':
        philosophy = extract_philosophy_with_claude(ai_info[1], ai_info[2], logs_text)
    else:
        print("\n❌ 未対応のAIプロバイダー")
        return

    if not philosophy:
        print("\n❌ 思想の抽出に失敗しました")
        return

    # 3. 保存
    save_philosophy(philosophy)

    # 4. CLAUDE.md更新
    update_claude_md(philosophy)

    print("\n" + "=" * 60)
    print("  ✅ 処理完了")
    print("=" * 60)


if __name__ == "__main__":
    main()
