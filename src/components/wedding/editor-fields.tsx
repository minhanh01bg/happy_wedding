"use client";
import { DropdownField } from "@/components/kit/dropdown-field";
import { WEDDING_MUSIC } from "@/lib/wedding-music";
import { BankSelect } from "./bank-select";
import {
  useState,
  type Dispatch,
  type SetStateAction,
  type ChangeEvent,
} from "react";
import type { WeddingTemplate } from "@prisma/client";
import Image from "next/image";
import Link from "next/link";
import { Plus, Upload } from "lucide-react";
import {
  toLocalDateTime,
  fromLocalDateTime,
  type InvitationInput,
} from "@/lib/wedding";

type FieldProps = {
  data: InvitationInput;
  templates: WeddingTemplate[];
  field: <K extends keyof InvitationInput>(
    key: K,
    value: InvitationInput[K],
  ) => void;
  eventField: (
    index: number,
    key: keyof InvitationInput["events"][number],
    value: string,
  ) => void;
  setData: Dispatch<SetStateAction<InvitationInput>>;
  upload: (event: ChangeEvent<HTMLInputElement>) => Promise<void>;
  id?: string;
  maxPhotos: number;
  uploading: boolean;
  busy: boolean;
};

export function IdentityFields({
  data,
  templates,
  field,
}: Pick<FieldProps, "data" | "templates" | "field">) {
  return (
    <section className="form-section">
      <h2>01. Nét riêng của bạn</h2>
      <div className="form-stack">
        <label>
          Mẫu thiệp
          <DropdownField
            aria-label="Mẫu thiệp"
            value={data.templateId}
            onValueChange={(value) => {
              if (value !== null) field("templateId", value);
            }}
            options={templates.map((t) => ({
              value: t.id,
              label: `${t.name} · ${t.category}${t.premium ? " · Cao cấp" : ""}${!t.active ? " · Ngừng cung cấp" : ""}`,
            }))}
          />
        </label>
        {templates.find((t) => t.id === data.templateId)?.active && (
          <Link
            className="text-link"
            target="_blank"
            rel="noopener noreferrer"
            href={`/preview/${templates.find((t) => t.id === data.templateId)!.slug}`}
          >
            Xem thiệp minh họa của mẫu đang chọn ↗
          </Link>
        )}
        <label>
          Đường dẫn thiệp
          <input
            value={data.slug}
            onChange={(e) => field("slug", e.target.value)}
            required
            pattern="[a-z0-9]+(-[a-z0-9]+)*"
            minLength={3}
            maxLength={80}
            placeholder="ten-chu-re-ten-co-dau"
          />
          <small>
            Đường dẫn /w/{data.slug || "ten-cua-hai-ban"} · Chữ thường, số và
            dấu gạch ngang.
          </small>
        </label>
        <div className="grid-two">
          <label>
            Chú rể
            <input
              required
              minLength={2}
              maxLength={80}
              value={data.groom}
              onChange={(e) => field("groom", e.target.value)}
            />
          </label>
          <label>
            Cô dâu
            <input
              required
              minLength={2}
              maxLength={80}
              value={data.bride}
              onChange={(e) => field("bride", e.target.value)}
            />
          </label>
        </div>
        <label>
          Ngày giờ cưới chính (giờ Việt Nam)
          <input
            type="datetime-local"
            required
            value={data.weddingDate ? toLocalDateTime(data.weddingDate) : ""}
            onChange={(e) =>
              field(
                "weddingDate",
                e.target.value ? fromLocalDateTime(e.target.value) : "",
              )
            }
          />
        </label>
        <label>
          Lời mở đầu
          <input
            maxLength={200}
            value={data.headline}
            onChange={(e) => field("headline", e.target.value)}
          />
        </label>
      </div>
    </section>
  );
}

export function StoryFields({
  data,
  field,
}: Pick<FieldProps, "data" | "field">) {
  return (
    <section className="form-section">
      <h2>02. Câu chuyện & gia đình</h2>
      <div className="form-stack">
        <label>
          Câu chuyện của hai bạn
          <textarea
            maxLength={4000}
            rows={6}
            value={data.story}
            onChange={(e) => field("story", e.target.value)}
          />
        </label>
        <label>
          Gia đình nhà trai
          <input
            maxLength={300}
            value={data.groomParents}
            onChange={(e) => field("groomParents", e.target.value)}
          />
        </label>
        <label>
          Gia đình nhà gái
          <input
            maxLength={300}
            value={data.brideParents}
            onChange={(e) => field("brideParents", e.target.value)}
          />
        </label>
      </div>
    </section>
  );
}

export function EventFields({
  data,
  field,
  eventField,
}: Pick<FieldProps, "data" | "field" | "eventField">) {
  const [eventKeys, setEventKeys] = useState(() =>
    data.events.map(() => crypto.randomUUID()),
  );
  return (
    <section className="form-section">
      <h2>03. Lịch tiệc hai nhà</h2>
      {data.events.map((event, i) => (
        <fieldset className="editor-event" key={eventKeys[i]}>
          <legend>Tiệc {i + 1}</legend>
          <div>
            <span>Thông tin tiệc</span>
            {data.events.length > 1 && (
              <button
                type="button"
                className="secondary"
                onClick={() => {
                  setEventKeys((keys) =>
                    keys.filter((_, index) => index !== i),
                  );
                  field(
                    "events",
                    data.events.filter((_, index) => index !== i),
                  );
                }}
              >
                Bỏ tiệc
              </button>
            )}
          </div>
          <label>
            Tên tiệc
            <input
              required
              minLength={2}
              maxLength={80}
              value={event.title}
              onChange={(e) => eventField(i, "title", e.target.value)}
            />
          </label>
          <label>
            Ngày giờ (giờ Việt Nam)
            <input
              type="datetime-local"
              required
              value={event.date ? toLocalDateTime(event.date) : ""}
              onChange={(e) =>
                eventField(
                  i,
                  "date",
                  e.target.value ? fromLocalDateTime(e.target.value) : "",
                )
              }
            />
          </label>
          <label>
            Địa điểm
            <input
              required
              minLength={2}
              maxLength={160}
              value={event.venue}
              onChange={(e) => eventField(i, "venue", e.target.value)}
            />
          </label>
          <label>
            Địa chỉ
            <input
              required
              minLength={2}
              maxLength={300}
              value={event.address}
              onChange={(e) => eventField(i, "address", e.target.value)}
            />
          </label>
        </fieldset>
      ))}
      {data.events.length < 4 && (
        <button
          className="secondary small"
          type="button"
          onClick={() => {
            setEventKeys((keys) => [...keys, crypto.randomUUID()]);
            field("events", [
              ...data.events,
              {
                title: "Tiệc cưới",
                date: data.weddingDate,
                venue: "",
                address: "",
              },
            ]);
          }}
        >
          <Plus size={15} />
          Thêm một tiệc
        </button>
      )}
    </section>
  );
}

export function PhotoFields({
  data,
  setData,
  field,
  upload,
  id,
  maxPhotos,
  uploading,
  busy,
}: Pick<
  FieldProps,
  | "data"
  | "setData"
  | "field"
  | "upload"
  | "id"
  | "maxPhotos"
  | "uploading"
  | "busy"
>) {
  return (
    <section className="form-section">
      <h2>04. Những khoảnh khắc đẹp</h2>
      <p className="fine">
        {data.photos.length}/{maxPhotos} ảnh · JPEG, PNG, WebP, tối đa 5 MB/ảnh.
        Chọn ảnh để làm ảnh bìa.
      </p>
      {!id && (
        <p className="notice" style={{ marginTop: 15 }}>
          Lưu bản nháp trước để tải ảnh của hai bạn lên.
        </p>
      )}
      <label style={{ marginTop: 18 }}>
        <span className="inline-actions">
          <Upload size={15} />
          {uploading ? "Đang tải ảnh…" : "Thêm ảnh từ thiết bị"}
        </span>
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={upload}
          disabled={!id || uploading || busy || data.photos.length >= maxPhotos}
        />
      </label>
      <div className="editor-photos">
        {data.photos.map((url, i) => (
          <div className="photo-thumb" key={url}>
            <Image src={url} alt={`Ảnh album ${i + 1}`} fill sizes="200px" />
            <button
              type="button"
              aria-label={`Xóa ảnh ${i + 1}`}
              onClick={() =>
                setData((d) => ({
                  ...d,
                  photos: d.photos.filter((_, n) => n !== i),
                  coverUrl:
                    d.coverUrl === url
                      ? d.photos.find((_, n) => n !== i) || "/images/couple.jpg"
                      : d.coverUrl,
                }))
              }
            >
              ×
            </button>
            <button
              className="cover-pick"
              type="button"
              onClick={() => field("coverUrl", url)}
            >
              {data.coverUrl === url ? "✓ Ảnh bìa" : "Làm ảnh bìa"}
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}

export function ExtraFields({
  data,
  field,
}: Pick<FieldProps, "data" | "field">) {
  return (
    <section className="form-section">
      <h2>05. Một chút âm nhạc & quà mừng</h2>
      <div className="form-stack">
        <label>
          Nhạc nền (không bắt buộc)
          <DropdownField
            aria-label="Chọn nhạc nền"
            value={
              !data.musicUrl
                ? "none"
                : data.musicUrl === WEDDING_MUSIC.url
                  ? "builtin"
                  : "custom"
            }
            onValueChange={(value) => {
              if (value !== null)
                field(
                  "musicUrl",
                  value === "builtin"
                    ? WEDDING_MUSIC.url
                    : value === "none"
                      ? ""
                      : "https://",
                );
            }}
            options={[
              { value: "none", label: "Không dùng nhạc" },
              { value: "builtin", label: WEDDING_MUSIC.title },
              { value: "custom", label: "Dùng bài hát riêng" },
            ]}
          />
          {data.musicUrl && data.musicUrl !== WEDDING_MUSIC.url && (
            <input
              type="url"
              aria-label="Đường dẫn bài hát riêng"
              placeholder="https://…/bai-hat.mp3"
              value={data.musicUrl}
              onChange={(e) => field("musicUrl", e.target.value)}
            />
          )}
          <small>
            Nhạc phát khi khách chọn mở thiệp kèm nhạc. Khách có thể tắt hoặc
            chỉnh âm lượng bất cứ lúc nào. Với bài riêng, dùng link HTTPS đến
            MP3/OGG bạn có quyền sử dụng.
          </small>
        </label>
        <p className="fine">
          Không bắt buộc. Bạn có thể thêm riêng tài khoản nhà trai và nhà gái,
          hoặc chỉ một bên. Kiểm tra đúng chủ tài khoản trước khi gửi thiệp.
        </p>
        {(
          [
            {
              side: "Nhà trai",
              bank: "giftBank",
              account: "giftAccount",
              name: "giftName",
            },
            {
              side: "Nhà gái",
              bank: "brideGiftBank",
              account: "brideGiftAccount",
              name: "brideGiftName",
            },
          ] as const
        ).map(({ side, bank, account, name }) => (
          <fieldset key={side} className="form-stack">
            <legend>Tài khoản mừng cưới {side.toLowerCase()}</legend>
            <label>
              Ngân hàng {side.toLowerCase()}
              <BankSelect
                value={data[bank]}
                aria-label={`Ngân hàng ${side.toLowerCase()}`}
                onValueChange={(value) => field(bank, value || "")}
              />
            </label>
            <div className="grid-two">
              <label>
                Số tài khoản {side.toLowerCase()}
                <input
                  value={data[account]}
                  maxLength={30}
                  autoComplete="off"
                  onChange={(e) => field(account, e.target.value)}
                />
              </label>
              <label>
                Chủ tài khoản {side.toLowerCase()}
                <input
                  value={data[name]}
                  maxLength={100}
                  onChange={(e) => field(name, e.target.value)}
                />
              </label>
            </div>
          </fieldset>
        ))}
      </div>
    </section>
  );
}
