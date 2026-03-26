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

export async function GET() {
  const apiKey = process.env.GEMINI_API_KEY;

  // APIキーの存在確認
  if (!apiKey) {
    return NextResponse.json(
      {
        status: 'error',
        error: 'GEMINI_API_KEY が設定されていません',
        hint: 'Vercel Dashboard → Settings → Environment Variables で GEMINI_API_KEY を設定してください',
      },
      { status: 500 }
    );
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

    const prompt = 'テスト通信です。システムが正常に稼働しているか、短く一言で返事をしてください。';
    const result = await model.generateContent(prompt);
    const reply = result.response.text();

    return NextResponse.json({
      status: 'success',
      reply,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error('Gemini API Test Error:', err);
    return NextResponse.json(
      {
        status: 'error',
        error: 'Gemini APIへの接続に失敗しました',
        details: String(err),
      },
      { status: 500 }
    );
  }
}
