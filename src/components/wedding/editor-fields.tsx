"use client";
import {
  useState,
  type Dispatch,
  type SetStateAction,
  type ChangeEvent,
} from "react";
import type { WeddingTemplate } from "@prisma/client";
import Image from "next/image";
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
          <select
            value={data.templateId}
            onChange={(e) => field("templateId", e.target.value)}
          >
            {templates.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name} · {t.category}
                {t.premium ? " · Cao cấp" : ""}
                {!t.active ? " · Ngừng cung cấp" : ""}
              </option>
            ))}
          </select>
        </label>
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
          <input
            type="url"
            placeholder="https://…/bai-hat.mp3"
            value={data.musicUrl}
            onChange={(e) => field("musicUrl", e.target.value)}
          />
          <small>
            Link HTTPS đến MP3/OGG bạn có quyền sử dụng. Khách chủ động bật
            nhạc.
          </small>
        </label>
        <label>
          BIN ngân hàng nhận quà
          <input
            inputMode="numeric"
            maxLength={6}
            placeholder="970436 (Vietcombank)"
            value={data.giftBank}
            onChange={(e) => field("giftBank", e.target.value)}
          />
          <small>
            Ví dụ: VCB 970436 · BIDV 970418 · MB 970422 · Techcombank 970407.
          </small>
        </label>
        <div className="grid-two">
          <label>
            Số tài khoản
            <input
              value={data.giftAccount}
              maxLength={30}
              onChange={(e) => field("giftAccount", e.target.value)}
            />
          </label>
          <label>
            Chủ tài khoản
            <input
              value={data.giftName}
              maxLength={100}
              onChange={(e) => field("giftName", e.target.value)}
            />
          </label>
        </div>
      </div>
    </section>
  );
}
