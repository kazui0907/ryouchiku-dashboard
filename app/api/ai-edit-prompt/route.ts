/* ************************************************************************** */
/*                                                                            */
/*    route.ts                                          :::      ::::::::    */
/*                                                      :+:      :+:    :+:  */
/*    By: Claude (LTS)                                  #+#  +:+       +#+    */
/*                                                    +#+#+#+#+#+   +#+       */
/*    Created: 2026/03/26 10:44 by Claude (LTS)       #+#    #+#         */
/*    Updated: 2026/03/26 10:44 by Claude (LTS)       ###   ########      */
/*                                                                            */
/*    © Life Time Support Inc.                                           */
/*                                                                            */
/* ************************************************************************** */
import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

export async function POST(request: Request) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return NextResponse.json({ error: 'GEMINI_API_KEY が設定されていません' }, { status: 500 });

  const { currentInstructions, editRequest } = await request.json();

  if (!currentInstructions || !editRequest) {
    return NextResponse.json({ error: 'currentInstructions と editRequest は必須です' }, { status: 400 });
  }

  const metaPrompt = `あなたはAIプロンプトエンジニアです。
以下の「現在のプロンプト指示文」を、「修正依頼」の内容に沿って書き直してください。

ルール：
- 元の意図を尊重しつつ、修正依頼の内容を反映させる
- 日本語で書く
- プロンプト指示文のみを出力する（説明文や前置きは一切不要）

現在のプロンプト指示文：
\`\`\`
${currentInstructions}
\`\`\`

修正依頼：
${editRequest}`;

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
    const result = await model.generateContent(metaPrompt);
    const newInstructions = result.response.text().trim();
    return NextResponse.json({ newInstructions });
  } catch (err) {
    console.error('Gemini Edit Prompt Error:', err);
    return NextResponse.json({ error: 'プロンプト修正に失敗しました', details: String(err) }, { status: 500 });
  }
}
