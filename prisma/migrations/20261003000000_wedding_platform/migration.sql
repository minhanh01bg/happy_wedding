-- CreateTable
CREATE TABLE "CustomerAccount" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "phoneNormalized" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "phoneVerifiedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "disabledAt" DATETIME
);

-- CreateTable
CREATE TABLE "CustomerSession" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "accountId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" DATETIME,
    "revokedAt" DATETIME,
    CONSTRAINT "CustomerSession_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "CustomerAccount" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AdminIdentity" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "username" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'owner',
    "passwordHash" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "disabledAt" DATETIME
);

-- CreateTable
CREATE TABLE "AdminSession" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "identityId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "identityVersion" INTEGER NOT NULL DEFAULT 1,
    "expiresAt" DATETIME NOT NULL,
    "idleExpiresAt" DATETIME NOT NULL,
    "lastSeenAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" DATETIME,
    CONSTRAINT "AdminSession_identityId_fkey" FOREIGN KEY ("identityId") REFERENCES "AdminIdentity" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AdminAuditEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "identityId" TEXT,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "metadata" TEXT,
    "ipAddress" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AdminAuditEvent_identityId_fkey" FOREIGN KEY ("identityId") REFERENCES "AdminIdentity" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Setting" (
    "key" TEXT NOT NULL PRIMARY KEY,
    "value" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "WeddingTemplate" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "palette" TEXT NOT NULL DEFAULT 'rose',
    "layout" TEXT NOT NULL DEFAULT 'editorial',
    "premium" BOOLEAN NOT NULL DEFAULT false,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "ServicePlan" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "price" INTEGER NOT NULL,
    "months" INTEGER NOT NULL DEFAULT 12,
    "maxPhotos" INTEGER NOT NULL DEFAULT 12,
    "premiumTemplates" BOOLEAN NOT NULL DEFAULT false,
    "removeBranding" BOOLEAN NOT NULL DEFAULT false,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Invitation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ownerId" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "groom" TEXT NOT NULL,
    "bride" TEXT NOT NULL,
    "weddingDate" DATETIME NOT NULL,
    "headline" TEXT NOT NULL DEFAULT 'Một đời thương, một đời bên nhau.',
    "story" TEXT NOT NULL DEFAULT '',
    "groomParents" TEXT NOT NULL DEFAULT '',
    "brideParents" TEXT NOT NULL DEFAULT '',
    "eventsJson" TEXT NOT NULL DEFAULT '[]',
    "photosJson" TEXT NOT NULL DEFAULT '[]',
    "coverUrl" TEXT NOT NULL DEFAULT '/images/couple.jpg',
    "musicUrl" TEXT NOT NULL DEFAULT '',
    "giftBank" TEXT NOT NULL DEFAULT '',
    "giftAccount" TEXT NOT NULL DEFAULT '',
    "giftName" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'draft',
    "isDemo" BOOLEAN NOT NULL DEFAULT false,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Invitation_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "CustomerAccount" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Invitation_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "WeddingTemplate" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ServiceOrder" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "invitationId" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "planName" TEXT NOT NULL,
    "total" INTEGER NOT NULL,
    "months" INTEGER NOT NULL,
    "maxPhotos" INTEGER NOT NULL,
    "premiumTemplates" BOOLEAN NOT NULL,
    "removeBranding" BOOLEAN NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "paymentNote" TEXT NOT NULL DEFAULT '',
    "paidAt" DATETIME,
    "expiresAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ServiceOrder_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "CustomerAccount" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ServiceOrder_invitationId_fkey" FOREIGN KEY ("invitationId") REFERENCES "Invitation" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ServiceOrder_planId_fkey" FOREIGN KEY ("planId") REFERENCES "ServicePlan" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "WeddingPayment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "orderId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "transactionId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "receivedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "WeddingPayment_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "ServiceOrder" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "WeddingGuest" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "invitationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "group" TEXT NOT NULL DEFAULT 'Bạn bè',
    "token" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "WeddingGuest_invitationId_fkey" FOREIGN KEY ("invitationId") REFERENCES "Invitation" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "GuestResponse" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "invitationId" TEXT NOT NULL,
    "guestId" TEXT,
    "clientId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "attendance" TEXT NOT NULL,
    "partySize" INTEGER NOT NULL DEFAULT 1,
    "eventIndex" INTEGER NOT NULL DEFAULT 0,
    "message" TEXT NOT NULL DEFAULT '',
    "wishStatus" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "GuestResponse_invitationId_fkey" FOREIGN KEY ("invitationId") REFERENCES "Invitation" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "GuestResponse_guestId_fkey" FOREIGN KEY ("guestId") REFERENCES "WeddingGuest" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "CustomerAccount_phoneNormalized_key" ON "CustomerAccount"("phoneNormalized");

-- CreateIndex
CREATE UNIQUE INDEX "CustomerSession_tokenHash_key" ON "CustomerSession"("tokenHash");

-- CreateIndex
CREATE INDEX "CustomerSession_accountId_expiresAt_idx" ON "CustomerSession"("accountId", "expiresAt");

-- CreateIndex
CREATE INDEX "CustomerSession_expiresAt_idx" ON "CustomerSession"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "AdminIdentity_username_key" ON "AdminIdentity"("username");

-- CreateIndex
CREATE INDEX "AdminIdentity_disabledAt_idx" ON "AdminIdentity"("disabledAt");

-- CreateIndex
CREATE UNIQUE INDEX "AdminSession_tokenHash_key" ON "AdminSession"("tokenHash");

-- CreateIndex
CREATE INDEX "AdminSession_identityId_expiresAt_idx" ON "AdminSession"("identityId", "expiresAt");

-- CreateIndex
CREATE INDEX "AdminSession_tokenHash_revokedAt_idx" ON "AdminSession"("tokenHash", "revokedAt");

-- CreateIndex
CREATE INDEX "AdminSession_expiresAt_idx" ON "AdminSession"("expiresAt");

-- CreateIndex
CREATE INDEX "AdminAuditEvent_createdAt_idx" ON "AdminAuditEvent"("createdAt");

-- CreateIndex
CREATE INDEX "AdminAuditEvent_entityType_entityId_idx" ON "AdminAuditEvent"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "AdminAuditEvent_identityId_createdAt_idx" ON "AdminAuditEvent"("identityId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "WeddingTemplate_slug_key" ON "WeddingTemplate"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Invitation_slug_key" ON "Invitation"("slug");

-- CreateIndex
CREATE INDEX "Invitation_ownerId_createdAt_idx" ON "Invitation"("ownerId", "createdAt");

-- CreateIndex
CREATE INDEX "Invitation_status_weddingDate_idx" ON "Invitation"("status", "weddingDate");

-- CreateIndex
CREATE UNIQUE INDEX "ServiceOrder_code_key" ON "ServiceOrder"("code");

-- CreateIndex
CREATE UNIQUE INDEX "ServiceOrder_clientId_key" ON "ServiceOrder"("clientId");

-- CreateIndex
CREATE INDEX "ServiceOrder_accountId_createdAt_idx" ON "ServiceOrder"("accountId", "createdAt");

-- CreateIndex
CREATE INDEX "ServiceOrder_invitationId_status_expiresAt_idx" ON "ServiceOrder"("invitationId", "status", "expiresAt");

-- CreateIndex
CREATE INDEX "ServiceOrder_status_createdAt_idx" ON "ServiceOrder"("status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "WeddingPayment_transactionId_key" ON "WeddingPayment"("transactionId");

-- CreateIndex
CREATE UNIQUE INDEX "WeddingGuest_token_key" ON "WeddingGuest"("token");

-- CreateIndex
CREATE INDEX "WeddingGuest_invitationId_createdAt_idx" ON "WeddingGuest"("invitationId", "createdAt");

-- CreateIndex
CREATE INDEX "GuestResponse_invitationId_createdAt_idx" ON "GuestResponse"("invitationId", "createdAt");

-- CreateIndex
CREATE INDEX "GuestResponse_invitationId_wishStatus_idx" ON "GuestResponse"("invitationId", "wishStatus");

-- CreateIndex
CREATE UNIQUE INDEX "GuestResponse_invitationId_clientId_key" ON "GuestResponse"("invitationId", "clientId");

