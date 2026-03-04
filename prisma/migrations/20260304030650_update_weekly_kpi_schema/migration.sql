/*
  Warnings:

  - You are about to drop the column `avgMarginProfit` on the `WeeklyKPI` table. All the data in the column will be lost.
  - You are about to drop the column `constructionOvertime` on the `WeeklyKPI` table. All the data in the column will be lost.
  - You are about to drop the column `inquiryCount` on the `WeeklyKPI` table. All the data in the column will be lost.
  - You are about to drop the column `inquiryTarget` on the `WeeklyKPI` table. All the data in the column will be lost.
  - You are about to drop the column `mainTargetCount` on the `WeeklyKPI` table. All the data in the column will be lost.
  - You are about to drop the column `mainTargetRate` on the `WeeklyKPI` table. All the data in the column will be lost.
  - You are about to drop the column `meetMeetingCount` on the `WeeklyKPI` table. All the data in the column will be lost.
  - You are about to drop the column `meetingSetupRate` on the `WeeklyKPI` table. All the data in the column will be lost.
  - You are about to drop the column `meetingTarget` on the `WeeklyKPI` table. All the data in the column will be lost.
  - You are about to drop the column `orderCount` on the `WeeklyKPI` table. All the data in the column will be lost.
  - You are about to drop the column `orderRate` on the `WeeklyKPI` table. All the data in the column will be lost.
  - You are about to drop the column `orderTarget` on the `WeeklyKPI` table. All the data in the column will be lost.
  - You are about to drop the column `salesOvertime` on the `WeeklyKPI` table. All the data in the column will be lost.
  - You are about to drop the column `srMeetingCount` on the `WeeklyKPI` table. All the data in the column will be lost.
  - You are about to drop the column `weekEndDate` on the `WeeklyKPI` table. All the data in the column will be lost.
  - You are about to drop the column `weekNumber` on the `WeeklyKPI` table. All the data in the column will be lost.
  - You are about to drop the column `weekStartDate` on the `WeeklyKPI` table. All the data in the column will be lost.
  - Added the required column `itemName` to the `WeeklyKPI` table without a default value. This is not possible if the table is not empty.

*/
-- CreateTable
CREATE TABLE "WeeklySiteKPI" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "year" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "mainItem" TEXT NOT NULL,
    "subItem" TEXT NOT NULL,
    "week1Target" REAL,
    "week1Actual" REAL,
    "week1Rate" REAL,
    "week2Target" REAL,
    "week2Actual" REAL,
    "week2Rate" REAL,
    "week3Target" REAL,
    "week3Actual" REAL,
    "week3Rate" REAL,
    "week4Target" REAL,
    "week4Actual" REAL,
    "week4Rate" REAL,
    "week5Target" REAL,
    "week5Actual" REAL,
    "week5Rate" REAL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_WeeklyKPI" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "year" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "itemName" TEXT NOT NULL,
    "week1Target" REAL,
    "week1Actual" REAL,
    "week1Rate" REAL,
    "week2Target" REAL,
    "week2Actual" REAL,
    "week2Rate" REAL,
    "week3Target" REAL,
    "week3Actual" REAL,
    "week3Rate" REAL,
    "week4Target" REAL,
    "week4Actual" REAL,
    "week4Rate" REAL,
    "week5Target" REAL,
    "week5Actual" REAL,
    "week5Rate" REAL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_WeeklyKPI" ("createdAt", "id", "month", "updatedAt", "year") SELECT "createdAt", "id", "month", "updatedAt", "year" FROM "WeeklyKPI";
DROP TABLE "WeeklyKPI";
ALTER TABLE "new_WeeklyKPI" RENAME TO "WeeklyKPI";
CREATE INDEX "WeeklyKPI_year_month_idx" ON "WeeklyKPI"("year", "month");
CREATE UNIQUE INDEX "WeeklyKPI_year_month_itemName_key" ON "WeeklyKPI"("year", "month", "itemName");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "WeeklySiteKPI_year_month_idx" ON "WeeklySiteKPI"("year", "month");

-- CreateIndex
CREATE UNIQUE INDEX "WeeklySiteKPI_year_month_mainItem_subItem_key" ON "WeeklySiteKPI"("year", "month", "mainItem", "subItem");
