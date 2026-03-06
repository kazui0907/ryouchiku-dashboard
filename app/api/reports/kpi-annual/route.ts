import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// ---- 数字KPI -------------------------------------------------------

const KPI_ORDER = [
  '問合件数', 'メインターゲット数', 'メインターゲット率', 'meta広告問合せ',
  'SR商談件数', 'MEET商談件数', '商談設定率', '受注件数', '受注率',
  '平均限界粗利単価', '施工部残業時間', '営業部残業時間',
];

const KPI_SUM_ITEMS   = ['問合件数', 'メインターゲット数', 'meta広告問合せ', 'SR商談件数', 'MEET商談件数', '施工部残業時間', '営業部残業時間'];
const KPI_AVG_ITEMS   = ['メインターゲット率', '商談設定率', '受注率', '平均限界粗利単価'];
const KPI_LAST_ITEMS  = ['受注件数'];

function aggregateWeeks(
  itemName: string,
  weeks: { target: number | null; actual: number | null }[],
): { target: number | null; actual: number | null; rate: number | null } {
  const valid = weeks.filter((w) => w.actual !== null);
  if (valid.length === 0) return { target: null, actual: null, rate: null };

  let target: number | null = null;
  let actual: number | null = null;

  if (KPI_LAST_ITEMS.some((n) => itemName.includes(n))) {
    const last = valid[valid.length - 1];
    target = last.target;
    actual = last.actual;
  } else if (KPI_AVG_ITEMS.some((n) => itemName.includes(n))) {
    const tgt = weeks.filter((w) => w.target !== null);
    target = tgt.length > 0 ? tgt.reduce((s, w) => s + (w.target ?? 0), 0) / tgt.length : null;
    actual = valid.reduce((s, w) => s + (w.actual ?? 0), 0) / valid.length;
  } else {
    // デフォルト合計（sumItems + その他）
    target = weeks.reduce((s, w) => s + (w.target ?? 0), 0);
    actual = valid.reduce((s, w) => s + (w.actual ?? 0), 0);
  }

  void KPI_SUM_ITEMS; // suppress unused warning
  const rate = target != null && target !== 0 && actual != null ? actual / target : null;
  return { target, actual, rate };
}

// ---- 現場KPI -------------------------------------------------------

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

const SITE_AVG_ITEMS = [
  'コンバージョン単価', 'MEET商談平均粗利額', 'SR商談平均粗利額',
  '景山', '京屋', '中谷', '熊田', '大島', '森谷', '星野', '安栗',
  'SR_京屋', 'SR_熊田', 'SR_星野', 'SR_安栗',
  '追客架電（商談前）', 'メイン商材ない人にアクション', '口コミ回収率', '成約率',
];

function aggregateSiteWeeks(
  subItem: string,
  weeks: { target: number | null; actual: number | null }[],
): { target: number | null; actual: number | null; rate: number | null } {
  const valid = weeks.filter((w) => w.actual !== null);
  if (valid.length === 0) return { target: null, actual: null, rate: null };

  let target: number | null = null;
  let actual: number | null = null;

  if (SITE_AVG_ITEMS.includes(subItem)) {
    const tgt = weeks.filter((w) => w.target !== null);
    target = tgt.length > 0 ? tgt.reduce((s, w) => s + (w.target ?? 0), 0) / tgt.length : null;
    actual = valid.reduce((s, w) => s + (w.actual ?? 0), 0) / valid.length;
  } else {
    target = weeks.reduce((s, w) => s + (w.target ?? 0), 0);
    actual = valid.reduce((s, w) => s + (w.actual ?? 0), 0);
  }

  const rate = target != null && target !== 0 && actual != null ? actual / target : null;
  return { target, actual, rate };
}

// ---- ハンドラ -------------------------------------------------------

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const year = parseInt(searchParams.get('year') || '2026');

    // 12ヶ月分を一括取得
    const [weeklyRows, siteRows] = await Promise.all([
      prisma.weeklyKPI.findMany({ where: { year }, orderBy: [{ month: 'asc' }, { itemName: 'asc' }] }),
      prisma.weeklySiteKPI.findMany({ where: { year }, orderBy: [{ month: 'asc' }, { mainItem: 'asc' }, { subItem: 'asc' }] }),
    ]);

    // ---- 数字KPI: item → month → monthly aggregate --------------------
    // 全item名を収集（KPI_ORDER順）
    const weeklyItemSet = new Set(weeklyRows.map((r) => r.itemName));
    const weeklyItems = KPI_ORDER.filter((n) => weeklyItemSet.has(n));
    // KPI_ORDERにない項目を末尾に追加
    for (const r of weeklyRows) {
      if (!weeklyItems.includes(r.itemName)) weeklyItems.push(r.itemName);
    }

    const weeklyMonthly: Record<string, Array<{ month: number; target: number | null; actual: number | null; rate: number | null }>> = {};
    for (const itemName of weeklyItems) {
      weeklyMonthly[itemName] = Array.from({ length: 12 }, (_, i) => {
        const month = i + 1;
        const row = weeklyRows.find((r) => r.itemName === itemName && r.month === month);
        if (!row) return { month, target: null, actual: null, rate: null };
        const weeks = [1, 2, 3, 4, 5].map((w) => ({
          target: row[`week${w}Target` as keyof typeof row] as number | null,
          actual: row[`week${w}Actual` as keyof typeof row] as number | null,
        }));
        return { month, ...aggregateWeeks(itemName, weeks) };
      });
    }

    // ---- 現場KPI: key → month → monthly aggregate -------------------
    const siteKeySet = new Set(siteRows.map((r) => `${r.mainItem}::${r.subItem}`));
    const siteKeys = SITE_KPI_ORDER.filter((k) => siteKeySet.has(k));
    for (const r of siteRows) {
      const k = `${r.mainItem}::${r.subItem}`;
      if (!siteKeys.includes(k)) siteKeys.push(k);
    }

    const siteItems = siteKeys.map((k) => {
      const [mainItem, subItem] = k.split('::');
      return { mainItem, subItem, key: k };
    });

    const siteMonthly: Record<string, Array<{ month: number; target: number | null; actual: number | null; rate: number | null }>> = {};
    for (const { mainItem, subItem, key } of siteItems) {
      siteMonthly[key] = Array.from({ length: 12 }, (_, i) => {
        const month = i + 1;
        const row = siteRows.find((r) => r.mainItem === mainItem && r.subItem === subItem && r.month === month);
        if (!row) return { month, target: null, actual: null, rate: null };
        const weeks = [1, 2, 3, 4, 5].map((w) => ({
          target: row[`week${w}Target` as keyof typeof row] as number | null,
          actual: row[`week${w}Actual` as keyof typeof row] as number | null,
        }));
        return { month, ...aggregateSiteWeeks(subItem, weeks) };
      });
    }

    return NextResponse.json({
      year,
      weeklyKPI: { items: weeklyItems, monthly: weeklyMonthly },
      siteKPI:   { items: siteItems,   monthly: siteMonthly },
    });
  } catch (error) {
    console.error('KPI Annual API Error:', error);
    return NextResponse.json({ error: 'データの取得に失敗しました' }, { status: 500 });
  }
}
