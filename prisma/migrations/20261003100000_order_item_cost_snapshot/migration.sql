-- Preserve unknown historical costs; never backfill from today's product cost.
ALTER TABLE "OrderItem" ADD COLUMN "costPriceSnapshot" INTEGER;
