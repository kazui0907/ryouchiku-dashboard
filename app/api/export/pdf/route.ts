import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const year = parseInt(searchParams.get('year') || '2026');
    const month = parseInt(searchParams.get('month') || '1');

    const data = await prisma.monthlyAccounting.findUnique({
      where: { year_month: { year, month } },
    });

    if (!data) {
      return NextResponse.json(
        { error: 'データが見つかりません' },
        { status: 404 }
      );
    }

    // 簡易的なHTMLレポートを生成
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>月次レポート ${year}年${month}月</title>
        <style>
          body { font-family: sans-serif; margin: 40px; }
          h1 { color: #333; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th, td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
          th { background-color: #f0f0f0; font-weight: bold; }
          .amount { text-align: right; }
          .profit { background-color: #e8f5e9; font-weight: bold; }
        </style>
      </head>
      <body>
        <h1>月次レポート</h1>
        <p>${year}年${month}月</p>

        <table>
          <tr>
            <th>項目</th>
            <th class="amount">金額 (円)</th>
          </tr>
          <tr>
            <td>売上高</td>
            <td class="amount">${data.salesRevenue.toLocaleString()}</td>
          </tr>
          <tr>
            <td>売上値引・返品</td>
            <td class="amount">${((data.salesDiscount || 0) * -1).toLocaleString()}</td>
          </tr>
          <tr>
            <td>売上原価</td>
            <td class="amount">${(data.costOfSales * -1).toLocaleString()}</td>
          </tr>
          <tr class="profit">
            <td>売上総利益</td>
            <td class="amount">${data.grossProfit.toLocaleString()}</td>
          </tr>
          <tr>
            <td>売上総利益率</td>
            <td class="amount">${(data.grossProfitRate * 100).toFixed(2)}%</td>
          </tr>
        </table>
      </body>
      </html>
    `;

    // HTMLをレスポンスとして返す（ブラウザで印刷→PDFとして使用）
    return new NextResponse(html, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
      },
    });
  } catch (error) {
    console.error('PDF Export API Error:', error);
    return NextResponse.json(
      { error: 'エクスポートに失敗しました' },
      { status: 500 }
    );
  }
}
