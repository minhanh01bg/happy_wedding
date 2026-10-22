-- CreateTable
CREATE TABLE "WeddingUpload" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "invitationId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "bytes" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "WeddingUpload_invitationId_fkey" FOREIGN KEY ("invitationId") REFERENCES "Invitation" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "WeddingUpload_filename_key" ON "WeddingUpload"("filename");

-- CreateIndex
CREATE INDEX "WeddingUpload_invitationId_idx" ON "WeddingUpload"("invitationId");

-- CreateIndex
CREATE INDEX "WeddingUpload_accountId_createdAt_idx" ON "WeddingUpload"("accountId", "createdAt");

