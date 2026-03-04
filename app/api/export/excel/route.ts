import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import ExcelJS from 'exceljs';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const year = parseInt(searchParams.get('year') || '2026');

    // 月次データを取得
    const monthlyData = await prisma.monthlyAccounting.findMany({
      where: { year },
      orderBy: { month: 'asc' },
    });

    // Excelワークブックを作成
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('月次会計データ');

    // ヘッダー行を追加
    worksheet.columns = [
      { header: '月', key: 'month', width: 10 },
      { header: '売上高', key: 'salesRevenue', width: 15 },
      { header: '売上値引', key: 'salesDiscount', width: 15 },
      { header: '売上原価', key: 'costOfSales', width: 15 },
      { header: '売上総利益', key: 'grossProfit', width: 15 },
      { header: '売上総利益率', key: 'grossProfitRate', width: 15 },
    ];

    // データ行を追加
    monthlyData.forEach((item) => {
      worksheet.addRow({
        month: `${item.month}月`,
        salesRevenue: item.salesRevenue,
        salesDiscount: item.salesDiscount || 0,
        costOfSales: item.costOfSales,
        grossProfit: item.grossProfit,
        grossProfitRate: item.grossProfitRate,
      });
    });

    // ヘッダー行のスタイル
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' },
    };

    // 数値列のフォーマット
    ['B', 'C', 'D', 'E'].forEach((col) => {
      worksheet.getColumn(col).numFmt = '#,##0';
    });
    worksheet.getColumn('F').numFmt = '0.00%';

    // Excelファイルをバッファに書き込む
    const buffer = await workbook.xlsx.writeBuffer();

    // レスポンスを返す
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="monthly-report-${year}.xlsx"`,
      },
    });
  } catch (error) {
    console.error('Excel Export API Error:', error);
    return NextResponse.json(
      { error: 'エクスポートに失敗しました' },
      { status: 500 }
    );
  }
}
