-- CreateTable
CREATE TABLE "GrigliaSession" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "key" TEXT NOT NULL,
    "students" TEXT NOT NULL DEFAULT '[]',
    "weights" TEXT NOT NULL DEFAULT '{}',
    "updatedAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "GrigliaSession_key_key" ON "GrigliaSession"("key");
