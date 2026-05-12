-- CreateTable
CREATE TABLE "Test" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "filePath" TEXT NOT NULL,
    "classe" TEXT NOT NULL,
    "materia" TEXT NOT NULL,
    "uda" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "TestVersion" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "testId" INTEGER NOT NULL,
    "hash" TEXT NOT NULL,
    "data" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "valid" BOOLEAN NOT NULL,
    "errors" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TestVersion_testId_fkey" FOREIGN KEY ("testId") REFERENCES "Test" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Submission" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "testId" INTEGER NOT NULL,
    "testVersionId" INTEGER NOT NULL,
    "studentName" TEXT,
    "answers" TEXT NOT NULL,
    "score" REAL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Submission_testId_fkey" FOREIGN KEY ("testId") REFERENCES "Test" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Submission_testVersionId_fkey" FOREIGN KEY ("testVersionId") REFERENCES "TestVersion" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Test_filePath_key" ON "Test"("filePath");

-- CreateIndex
CREATE INDEX "Test_classe_materia_uda_idx" ON "Test"("classe", "materia", "uda");

-- CreateIndex
CREATE INDEX "TestVersion_testId_idx" ON "TestVersion"("testId");

-- CreateIndex
CREATE UNIQUE INDEX "TestVersion_testId_hash_key" ON "TestVersion"("testId", "hash");

-- CreateIndex
CREATE INDEX "Submission_testId_idx" ON "Submission"("testId");

-- CreateIndex
CREATE INDEX "Submission_testVersionId_idx" ON "Submission"("testVersionId");
