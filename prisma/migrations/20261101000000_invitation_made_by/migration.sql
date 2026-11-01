-- Optional maker's credit shown at the foot of the invitation; empty keeps the studio line.
ALTER TABLE "Invitation" ADD COLUMN "madeBy" TEXT NOT NULL DEFAULT '';
