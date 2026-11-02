import { randomUUID } from "node:crypto";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import sharp from "sharp";

import { DEMO_CONTENT } from "@/lib/wedding";
import { prisma } from "@/server/db/prisma";
import {
  confirmPayment,
  createServiceOrder,
  publishInvitation,
  saveInvitation,
} from "@/server/wedding/service";

/**
 * Fake invitations and photos for the link preview tests (og:image and the
 * page metadata). Names come from DEMO_CONTENT; photos are flat colours.
 */
export const SLUG = "test-wedding";
export const COVER =
  "/uploads/weddings/3f2a1b4c-5d6e-4f70-8a9b-0c1d2e3f4a5b.webp";
export const ALBUM_PHOTO =
  "/uploads/weddings/9e8d7c6b-5a49-4382-9716-a5b4c3d2e1f0.webp";
const templateId = "test-template";
const planId = "test-plan";

export async function clean() {
  await prisma.weddingUpload.deleteMany();
  await prisma.guestResponse.deleteMany();
  await prisma.weddingGuest.deleteMany();
  await prisma.weddingPayment.deleteMany();
  await prisma.serviceOrder.deleteMany();
  await prisma.invitation.deleteMany();
  await prisma.weddingTemplate.deleteMany();
  await prisma.servicePlan.deleteMany();
  await prisma.customerAccount.deleteMany();
}

/** Clean tables plus one owner, template and plan; returns the owner's ID. */
export async function seedCatalog() {
  await clean();
  const accountId = (
    await prisma.customerAccount.create({
      data: {
        phoneNormalized: "+84912345678",
        displayName: "Owner",
        passwordHash: "unused",
      },
    })
  ).id;
  await prisma.weddingTemplate.create({
    data: {
      id: templateId,
      slug: "test",
      name: "Test",
      category: "Tối giản",
      description: "Test",
    },
  });
  await prisma.servicePlan.create({
    data: {
      id: planId,
      name: "Essential",
      description: "Test",
      price: 199000,
      months: 12,
      maxPhotos: 12,
      premiumTemplates: false,
      removeBranding: false,
    },
  });
  return accountId;
}

export async function draft(
  accountId: string,
  content: { coverUrl?: string; photos?: string[] } = {},
) {
  return saveInvitation(accountId, {
    ...DEMO_CONTENT,
    templateId,
    slug: SLUG,
    coverUrl: COVER,
    ...content,
  });
}

/** A paid, published invitation: what /w/[slug] shows to anyone. */
export async function published(
  accountId: string,
  content?: Parameters<typeof draft>[1],
) {
  const invitation = await draft(accountId, content);
  const order = await createServiceOrder(
    accountId,
    invitation.id,
    planId,
    randomUUID(),
  );
  await confirmPayment(
    order.id,
    `manual:${randomUUID()}`,
    order.total,
    "manual",
  );
  await publishInvitation(accountId, invitation.id, true);
  return invitation;
}

/** A fake photo: a flat colour with one darker block, so it is not uniform. */
export function photo(width: number, height: number) {
  return sharp({
    create: { width, height, channels: 3, background: "#c9a27e" },
  }).composite([
    {
      input: {
        create: {
          width: Math.round(width / 3),
          height: Math.round(height / 3),
          channels: 3,
          background: "#5b3a29",
        },
      },
      top: Math.round(height / 6),
      left: Math.round(width / 3),
    },
  ]);
}

/** A temporary project folder with public/uploads/weddings/. */
export async function makeProject() {
  const project = await mkdtemp(path.join(tmpdir(), "share-image-"));
  await resetProject(project);
  return project;
}

export async function resetProject(project: string) {
  await rm(path.join(project, "public"), { recursive: true, force: true });
  await rm(path.join(project, ".cache"), { recursive: true, force: true });
  await mkdir(path.join(project, "public", "uploads", "weddings"), {
    recursive: true,
  });
}

/** Writes a fake upload at `url` (a /uploads/weddings/… path) under `project`. */
export async function writeUpload(
  project: string,
  url = COVER,
  width = 900,
  height = 1350,
) {
  const file = path.join(project, "public", url);
  await writeFile(
    file,
    await photo(width, height).webp({ quality: 80 }).toBuffer(),
  );
  return file;
}
