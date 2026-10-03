-- Preserve existing gift account as the groom-side account; bride-side is optional.
ALTER TABLE "Invitation" ADD COLUMN "brideGiftBank" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Invitation" ADD COLUMN "brideGiftAccount" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Invitation" ADD COLUMN "brideGiftName" TEXT NOT NULL DEFAULT '';
