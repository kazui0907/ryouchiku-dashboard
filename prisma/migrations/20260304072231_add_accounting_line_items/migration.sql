-- CreateTable
CREATE TABLE "AccountingLineItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "year" INTEGER NOT NULL,
    "rowIndex" INTEGER NOT NULL,
    "category" TEXT NOT NULL,
    "subcategory" TEXT NOT NULL,
    "monthsJson" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE INDEX "AccountingLineItem_year_idx" ON "AccountingLineItem"("year");

-- CreateIndex
CREATE UNIQUE INDEX "AccountingLineItem_year_rowIndex_key" ON "AccountingLineItem"("year", "rowIndex");
