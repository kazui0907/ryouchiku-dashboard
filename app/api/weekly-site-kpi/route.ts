import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const year = parseInt(searchParams.get('year') || '2026');
    const month = parseInt(searchParams.get('month') || '1');

    // CSVと同じ順番（mainItem::subItem）
    const SITE_KPI_ORDER = [
      '問合数::コンバージョン単価', '問合数::ユーザー数', '問合数::指定物件ＳＮＳ投稿数',
      '商談件数::追客架電（商談前）', '商談件数::メイン商材ない人にアクション',
      '受注件数::ロープレ回数',
      '平均限界利益額::MEET商談平均粗利額',
      '平均限界利益額::景山', '平均限界利益額::京屋', '平均限界利益額::中谷',
      '平均限界利益額::熊田', '平均限界利益額::大島', '平均限界利益額::森谷',
      '平均限界利益額::星野', '平均限界利益額::安栗',
      '平均限界利益額::SR商談平均粗利額',
      '平均限界利益額::SR_京屋', '平均限界利益額::SR_熊田',
      '平均限界利益額::SR_星野', '平均限界利益額::SR_安栗',
      '顧客満足向上::ありがとうカード配布数', '顧客満足向上::口コミ回収率',
      '不動産::交渉物件数',
      'IT::商談件数', 'IT::成約率',
    ];

    // データベースから読み込み
    const dbItems = await prisma.weeklySiteKPI.findMany({
      where: { year, month },
    });

    // スプレッドシート順にソート
    dbItems.sort((a, b) => {
      const aKey = `${a.mainItem}::${a.subItem}`;
      const bKey = `${b.mainItem}::${b.subItem}`;
      const ai = SITE_KPI_ORDER.indexOf(aKey);
      const bi = SITE_KPI_ORDER.indexOf(bKey);
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
      const calculateTotal = (mainItem: string, subItem: string, weeks: any[]) => {
        const validWeeks = weeks.filter((w) => w.actual !== null);
        if (validWeeks.length === 0) {
          return { target: null, actual: null, achievementRate: null };
        }

        const itemFullName = subItem || mainItem;

        // 合計型の項目
        const sumItems = [
          'ユーザー数',
          '指定物件ＳＮＸ投稿',
          '指定物件ＳＮＳ投稿',
          'ロープレ回数',
          'ありがとうカード配布数',
          '交渉物件数',
          '商談件数',
        ];

        // 平均型の項目
        const avgItems = [
          'コンバージョン単価',
          '追客架電',
          'メイン商材ない人にアクション',
          'MEET商談平均粗利額',
          'SR商談平均粗利額',
          '口コミ回収率',
        ];

        // 平均型の個人名
        const avgPersonNames = [
          '景山',
          '京屋',
          '中谷',
          '熊田',
          '大島',
          '森谷',
          '星野',
          '安栗',
          'SR_京屋',
          'SR_熊田',
          'SR_星野',
          'SR_安栗',
        ];

        // 最終値型の項目
        const lastItems = ['制約率', '成約率'];

        let totalTarget = null;
        let totalActual = null;
        let totalAchievementRate = null;

        if (lastItems.some((item) => itemFullName.includes(item))) {
          // 最終値
          const lastWeek = validWeeks[validWeeks.length - 1];
          totalTarget = lastWeek.target;
          totalActual = lastWeek.actual;
        } else if (sumItems.some((item) => itemFullName.includes(item))) {
          // 合計
          totalTarget = weeks.reduce((sum, w) => sum + (w.target || 0), 0);
          totalActual = validWeeks.reduce((sum, w) => sum + (w.actual || 0), 0);
        } else if (
          avgItems.some((item) => itemFullName.includes(item)) ||
          avgPersonNames.some((name) => itemFullName.includes(name))
        ) {
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

      const total = calculateTotal(item.mainItem, item.subItem, weeks);

      return {
        name: item.mainItem,
        subName: item.subItem || undefined,
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
    console.error('Weekly Site KPI API Error:', error);
    return NextResponse.json(
      { error: 'データの取得に失敗しました', details: String(error) },
      { status: 500 }
    );
  }
}
