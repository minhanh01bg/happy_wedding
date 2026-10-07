import { DEMO_PHOTOS } from "./wedding-images";
import { z } from "zod";
import { WEDDING_MUSIC } from "./wedding-music";

export const PALETTES = [
  "rose",
  "sage",
  "wine",
  "sand",
  "midnight",
  "terracotta",
] as const;
export const LAYOUTS = [
  "editorial",
  "botanical",
  "classic",
  "minimal",
  "cinematic",
] as const;
const imageSchema = z
  .string()
  .max(300)
  .regex(
    /^\/(?:images\/[a-zA-Z0-9._-]+|uploads\/weddings\/[a-f0-9-]+\.webp)$/,
    "Hãy tải ảnh lên từ thiết bị",
  );
export const eventSchema = z.strictObject({
  title: z.string().trim().min(2).max(80),
  date: z.iso.datetime({ offset: true }),
  venue: z.string().trim().min(2).max(160),
  address: z.string().trim().min(2).max(300),
});
export const invitationSchema = z
  .strictObject({
    templateId: z.string().min(1),
    slug: z
      .string()
      .trim()
      .regex(
        /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
        "Đường dẫn chỉ gồm chữ thường, số và dấu gạch ngang",
      )
      .min(3)
      .max(80),
    groom: z.string().trim().min(2).max(80),
    bride: z.string().trim().min(2).max(80),
    weddingDate: z.iso.datetime({ offset: true }),
    headline: z.string().trim().max(200),
    story: z.string().trim().max(4000),
    groomParents: z.string().trim().max(300),
    brideParents: z.string().trim().max(300),
    events: z
      .array(eventSchema)
      .min(1)
      .max(4)
      .refine(
        (events) =>
          new Set(events.map((e) => `${e.title}-${e.date}-${e.venue}`)).size ===
          events.length,
        "Các tiệc không được trùng nhau",
      ),
    photos: z
      .array(imageSchema)
      .max(40)
      .refine(
        (photos) => new Set(photos).size === photos.length,
        "Ảnh trong album không được trùng đường dẫn",
      ),
    coverUrl: imageSchema,
    musicUrl: z
      .string()
      .max(300)
      .refine(
        (v) =>
          !v ||
          v === WEDDING_MUSIC.url ||
          /^https:\/\/[a-zA-Z0-9.-]+\/[\w./%?=&+-]+\.(?:mp3|ogg)(?:\?[\w=&%-]+)?$/.test(
            v,
          ),
        "Hãy chọn nhạc có sẵn hoặc dùng đường dẫn HTTPS đến tệp MP3/OGG",
      ),
    giftBank: z
      .string()
      .trim()
      .regex(/^\d{6}$|^$/, "BIN ngân hàng gồm 6 chữ số"),
    giftAccount: z
      .string()
      .trim()
      .regex(/^[A-Za-z0-9]{5,30}$|^$/, "Số tài khoản không hợp lệ"),
    giftName: z.string().trim().max(100),
    brideGiftBank: z
      .string()
      .trim()
      .regex(/^\d{6}$|^$/, "Hãy chọn ngân hàng nhà gái")
      .default(""),
    brideGiftAccount: z
      .string()
      .trim()
      .regex(/^[A-Za-z0-9]{5,30}$|^$/, "Số tài khoản nhà gái không hợp lệ")
      .default(""),
    brideGiftName: z.string().trim().max(100).default(""),
  })
  .superRefine((v, ctx) => {
    if (
      (v.giftBank || v.giftAccount || v.giftName) &&
      !(v.giftBank && v.giftAccount && v.giftName)
    )
      ctx.addIssue({
        code: "custom",
        message: "Điền đủ ngân hàng, số tài khoản và chủ tài khoản",
        path: ["giftBank"],
      });
    if (
      (v.brideGiftBank || v.brideGiftAccount || v.brideGiftName) &&
      !(v.brideGiftBank && v.brideGiftAccount && v.brideGiftName)
    )
      ctx.addIssue({
        code: "custom",
        message: "Điền đủ ngân hàng, số tài khoản và chủ tài khoản nhà gái",
        path: ["brideGiftBank"],
      });
  });
export const responseSchema = z.strictObject({
  clientId: z.uuid(),
  name: z.string().trim().min(2).max(100),
  attendance: z.enum(["attending", "declined", "undecided"]),
  partySize: z.number().int().min(1).max(10),
  eventIndex: z.number().int().min(0).max(3),
  message: z.string().trim().max(1000),
  guestToken: z.string().max(100).optional(),
});
export const planSchema = z.strictObject({
  id: z.string().optional(),
  name: z.string().trim().min(2).max(80),
  description: z.string().trim().max(300),
  price: z.number().int().min(0).max(50_000_000),
  months: z.number().int().min(1).max(60),
  maxPhotos: z.number().int().min(1).max(40),
  premiumTemplates: z.boolean(),
  removeBranding: z.boolean(),
  active: z.boolean(),
  sortOrder: z.number().int().min(0).max(100),
});
export const templateSchema = z.strictObject({
  id: z.string().optional(),
  slug: z.string().regex(/^[a-z0-9-]{3,80}$/),
  name: z.string().trim().min(2).max(80),
  category: z.enum(["Tối giản", "Hoa lá", "Truyền thống", "Hiện đại"]),
  description: z.string().trim().max(300),
  palette: z.enum(PALETTES),
  layout: z.enum(LAYOUTS),
  premium: z.boolean(),
  active: z.boolean(),
  sortOrder: z.number().int().min(0).max(100),
});
export type InvitationInput = z.infer<typeof invitationSchema>;
export type WeddingEvent = z.infer<typeof eventSchema>;
export function readEvents(json: string): WeddingEvent[] {
  return z.array(eventSchema).parse(JSON.parse(json));
}
export function readPhotos(json: string): string[] {
  return z.array(imageSchema).parse(JSON.parse(json));
}
const DATE_FORMATTER = new Intl.DateTimeFormat("vi-VN", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  timeZone: "Asia/Ho_Chi_Minh",
});
const DATETIME_FORMATTER = new Intl.DateTimeFormat("vi-VN", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Asia/Ho_Chi_Minh",
});
const MONEY_FORMATTER = new Intl.NumberFormat("vi-VN", {
  style: "currency",
  currency: "VND",
});
export function dateLabel(date: string | Date, full = false) {
  return (full ? DATETIME_FORMATTER : DATE_FORMATTER).format(new Date(date));
}
export function toLocalDateTime(value: string | Date) {
  return new Date(new Date(value).getTime() + 7 * 3600_000)
    .toISOString()
    .slice(0, 16);
}
export function fromLocalDateTime(value: string) {
  return new Date(`${value}:00+07:00`).toISOString();
}
export function money(value: number) {
  return MONEY_FORMATTER.format(value);
}
export const DEMO_CONTENT: Omit<InvitationInput, "templateId" | "slug"> = {
  groom: "Minh Anh",
  bride: "Ngọc Hà",
  weddingDate: "2027-02-14T04:00:00.000Z",
  headline: "Một đời thương, một đời bên nhau.",
  story:
    "Từ một lần gặp gỡ tình cờ, chúng mình đã cùng nhau đi qua những mùa đầy thương nhớ. Có những chuyến đi, có những ngày bình dị, và có một người luôn chọn ở lại.\n\nHôm nay, chúng mình chọn cùng nhau viết tiếp câu chuyện ấy. Mong bạn có mặt, để ngày vui của chúng mình thêm trọn vẹn.",
  groomParents: "Ông Nguyễn Văn An & Bà Trần Thị Mai",
  brideParents: "Ông Lê Văn Bình & Bà Phạm Thị Lan",
  events: [
    {
      title: "Tiệc cưới nhà trai",
      date: "2027-02-14T04:00:00.000Z",
      venue: "Nhà hàng The Garden",
      address: "Hà Nội — địa điểm minh họa",
    },
    {
      title: "Tiệc cưới nhà gái",
      date: "2027-02-13T04:00:00.000Z",
      venue: "Tư gia nhà gái",
      address: "Bắc Ninh — địa điểm minh họa",
    },
  ],
  photos: DEMO_PHOTOS,
  coverUrl: "/images/couple.jpg",
  musicUrl: WEDDING_MUSIC.url,
  giftBank: "",
  giftAccount: "",
  giftName: "",
  brideGiftBank: "",
  brideGiftAccount: "",
  brideGiftName: "",
};

export const merchantSchema = z
  .strictObject({
    bank: z
      .string()
      .trim()
      .regex(/^\d{6}$|^$/, "Hãy chọn ngân hàng nhận tiền"),
    account: z
      .string()
      .trim()
      .regex(/^[A-Za-z0-9]{5,30}$|^$/, "Số tài khoản không hợp lệ"),
    name: z.string().trim().max(100),
    support: z.string().trim().max(150),
    supportPhone: z
      .string()
      .trim()
      .regex(/^\+?[0-9]{9,15}$|^$/, "Số điện thoại hỗ trợ không hợp lệ")
      .default(""),
    supportEmail: z
      .union([z.email("Email hỗ trợ không hợp lệ"), z.literal("")])
      .default(""),
  })
  .superRefine((input, context) => {
    if (
      (input.bank || input.account || input.name) &&
      !(input.bank && input.account && input.name)
    )
      context.addIssue({
        code: "custom",
        message:
          "Điền đủ ngân hàng, số tài khoản và chủ tài khoản nhận tiền dịch vụ",
        path: ["bank"],
      });
  });
export type MerchantSettings = z.infer<typeof merchantSchema>;
