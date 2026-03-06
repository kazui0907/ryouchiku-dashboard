import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const year = parseInt(searchParams.get('year') || '2026');
    const month = parseInt(searchParams.get('month') || '1');

    // スプレッドシートと同じ順番
    const KPI_ORDER = [
      '問合件数', 'メインターゲット数', 'メインターゲット率', 'meta広告問合せ',
      'SR商談件数', 'MEET商談件数', '商談設定率', '受注件数', '受注率',
      '平均限界粗利単価', '施工部残業時間', '営業部残業時間',
    ];

    // データベースから読み込み
    const dbItems = await prisma.weeklyKPI.findMany({
      where: { year, month },
    });

    // スプレッドシート順にソート
    dbItems.sort((a, b) => {
      const ai = KPI_ORDER.indexOf(a.itemName);
      const bi = KPI_ORDER.indexOf(b.itemName);
      if (ai === -1 && bi === -1) return 0;
      if (ai === -1) return 1;
      if (bi === -1) return -1;
      return ai - bi;
    });

    // KPI項目を整形
    const kpiItems = dbItems.map((item) => {
      const weeks = [];

      // 各週のデータを構築
      for (let w = 1; w <= 5; w++) {
        const target = item[`week${w}Target` as keyof typeof item] as number | null;
        const actual = item[`week${w}Actual` as keyof typeof item] as number | null;

        // データがある週のみ追加
        if (target !== null || actual !== null) {
          const achievementRate =
            target !== null && target !== 0 && actual !== null
              ? actual / target
              : null;

          weeks.push({
            week: w,
            target,
            actual,
            achievementRate,
          });
        }
      }

      // 累計計算方法を項目ごとに設定
      const calculateTotal = (itemName: string, weeks: any[]) => {
        const validWeeks = weeks.filter((w) => w.actual !== null);
        if (validWeeks.length === 0) {
          return { target: null, actual: null, achievementRate: null };
        }

        // 合計型の項目
        const sumItems = [
          '問合件数',
          'メインターゲット数',
          'meta広告問合せ',
          'SR商談件数',
          'MEET商談件数',
          '施工部残業時間',
          '営業部残業時間',
        ];

        // 平均型の項目
        const avgItems = [
          'メインターゲット率',
          '商談設定率',
          '受注率',
          '平均限界粗利単価',
        ];

        // 最終値型の項目
        const lastItems = ['受注件数'];

        let totalTarget = null;
        let totalActual = null;
        let totalAchievementRate = null;

        if (sumItems.some((item) => itemName.includes(item))) {
          // 合計
          totalTarget = weeks.reduce((sum, w) => sum + (w.target || 0), 0);
          totalActual = validWeeks.reduce((sum, w) => sum + (w.actual || 0), 0);
        } else if (avgItems.some((item) => itemName.includes(item))) {
          // 平均
          const targetWeeks = weeks.filter((w) => w.target !== null);
          if (targetWeeks.length > 0) {
            totalTarget =
              targetWeeks.reduce((sum, w) => sum + w.target, 0) /
              targetWeeks.length;
          }
          totalActual =
            validWeeks.reduce((sum, w) => sum + w.actual, 0) /
            validWeeks.length;
        } else if (lastItems.some((item) => itemName.includes(item))) {
          // 最終値
          const lastWeek = validWeeks[validWeeks.length - 1];
          totalTarget = lastWeek.target;
          totalActual = lastWeek.actual;
        } else {
          // デフォルトは合計
          totalTarget = weeks.reduce((sum, w) => sum + (w.target || 0), 0);
          totalActual = validWeeks.reduce((sum, w) => sum + (w.actual || 0), 0);
        }

        // 達成率を計算
        if (
          totalTarget !== null &&
          totalTarget !== 0 &&
          totalActual !== null
        ) {
          totalAchievementRate = totalActual / totalTarget;
        }

        return {
          target: totalTarget,
          actual: totalActual,
          achievementRate: totalAchievementRate,
        };
      };

      const total = calculateTotal(item.itemName, weeks);

      return {
        name: item.itemName,
        weeks,
        total,
      };
    });

    return NextResponse.json({
      year,
      month,
      items: kpiItems,
    });
  } catch (error) {
    console.error('Weekly KPI API Error:', error);
    return NextResponse.json(
      { error: 'データの取得に失敗しました', details: String(error) },
      { status: 500 }
    );
  }
}
