-- CreateTable
CREATE TABLE "MonthlyAccounting" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "year" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "salesRevenue" REAL NOT NULL,
    "salesDiscount" REAL,
    "costOfSales" REAL NOT NULL,
    "materialPurchase" REAL,
    "constructionCost" REAL,
    "laborCost" REAL,
    "grossProfit" REAL NOT NULL,
    "grossProfitRate" REAL NOT NULL,
    "marginProfit" REAL,
    "marginProfitRate" REAL,
    "sgaExpenses" REAL,
    "executiveComp" REAL,
    "salesSalary" REAL,
    "adminSalary" REAL,
    "advertisingExp" REAL,
    "operatingProfit" REAL,
    "budgetSales" REAL,
    "budgetProfit" REAL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "WeeklyKPI" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "year" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "weekNumber" INTEGER NOT NULL,
    "weekStartDate" DATETIME NOT NULL,
    "weekEndDate" DATETIME NOT NULL,
    "inquiryCount" INTEGER NOT NULL,
    "inquiryTarget" INTEGER NOT NULL,
    "mainTargetCount" INTEGER,
    "mainTargetRate" REAL,
    "srMeetingCount" INTEGER,
    "meetMeetingCount" INTEGER,
    "meetingTarget" INTEGER,
    "meetingSetupRate" REAL,
    "orderCount" INTEGER,
    "orderTarget" INTEGER,
    "orderRate" REAL,
    "avgMarginProfit" REAL,
    "constructionOvertime" INTEGER,
    "salesOvertime" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "PersonalKPI" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "year" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "weekNumber" INTEGER NOT NULL,
    "weekStartDate" DATETIME NOT NULL,
    "weekEndDate" DATETIME NOT NULL,
    "employeeId" TEXT NOT NULL,
    "employeeName" TEXT NOT NULL,
    "department" TEXT NOT NULL,
    "targetProfit" REAL NOT NULL,
    "actualProfit" REAL,
    "achievementRate" REAL,
    "orderCount" INTEGER,
    "meetingCount" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Budget" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "year" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "salesTarget" REAL NOT NULL,
    "profitTarget" REAL NOT NULL,
    "inquiryTarget" INTEGER NOT NULL,
    "orderTarget" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE INDEX "MonthlyAccounting_year_month_idx" ON "MonthlyAccounting"("year", "month");

-- CreateIndex
CREATE UNIQUE INDEX "MonthlyAccounting_year_month_key" ON "MonthlyAccounting"("year", "month");

-- CreateIndex
CREATE INDEX "WeeklyKPI_year_month_idx" ON "WeeklyKPI"("year", "month");

-- CreateIndex
CREATE UNIQUE INDEX "WeeklyKPI_year_month_weekNumber_key" ON "WeeklyKPI"("year", "month", "weekNumber");

-- CreateIndex
CREATE INDEX "PersonalKPI_year_month_employeeId_idx" ON "PersonalKPI"("year", "month", "employeeId");

-- CreateIndex
CREATE UNIQUE INDEX "PersonalKPI_year_month_weekNumber_employeeId_key" ON "PersonalKPI"("year", "month", "weekNumber", "employeeId");

-- CreateIndex
CREATE INDEX "Budget_year_month_idx" ON "Budget"("year", "month");

-- CreateIndex
CREATE UNIQUE INDEX "Budget_year_month_key" ON "Budget"("year", "month");
