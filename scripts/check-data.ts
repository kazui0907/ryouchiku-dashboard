import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkData() {
  const data = await prisma.monthlyAccounting.findMany({
    where: { year: 2026 },
    orderBy: { month: 'asc' },
    select: {
      month: true,
      salesRevenue: true,
      budgetSales: true,
      lastYearSalesRevenue: true,
      marginProfit: true,
      budgetMarginProfit: true,
      lastYearMarginProfit: true,
    },
  });

  console.log('\n2026年のデータ確認:\n');
  data.forEach((item) => {
    console.log(`${item.month}月:`);
    console.log(`  売上高: ${item.salesRevenue.toLocaleString()}`);
    console.log(`  予算売上: ${item.budgetSales?.toLocaleString() || 'null'}`);
    console.log(`  昨年売上: ${item.lastYearSalesRevenue?.toLocaleString() || 'null'}`);
    console.log(`  限界利益: ${item.marginProfit?.toLocaleString() || 'null'}`);
    console.log(`  予算限界利益: ${item.budgetMarginProfit?.toLocaleString() || 'null'}`);
    console.log(`  昨年限界利益: ${item.lastYearMarginProfit?.toLocaleString() || 'null'}`);
    console.log('');
  });
}

checkData()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
