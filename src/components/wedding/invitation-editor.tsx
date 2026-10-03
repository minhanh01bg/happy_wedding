"use client";
import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { WeddingTemplate } from "@prisma/client";
import { Save } from "lucide-react";
import { invitationSchema, type InvitationInput } from "@/lib/wedding";
import { TemplateArtwork } from "./template-card";
import { post } from "./client";
import {
  IdentityFields,
  StoryFields,
  EventFields,
  PhotoFields,
  ExtraFields,
} from "./editor-fields";

export function InvitationEditor({
  initial,
  templates,
  id,
  version = 1,
  maxPhotos = 12,
  selectedPlan,
}: {
  initial: InvitationInput;
  templates: WeddingTemplate[];
  id?: string;
  version?: number;
  maxPhotos?: number;
  selectedPlan?: string;
}) {
  const router = useRouter();
  const [data, setData] = useState(initial);
  const currentVersion = useRef(version);
  const uploadRequest = useRef(0);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const template =
    templates.find((t) => t.id === data.templateId) || templates[0];
  function field<K extends keyof InvitationInput>(
    key: K,
    value: InvitationInput[K],
  ) {
    setData((d) => ({ ...d, [key]: value }));
  }
  function eventField(
    index: number,
    key: keyof InvitationInput["events"][number],
    value: string,
  ) {
    setData((d) => ({
      ...d,
      events: d.events.map((event, i) =>
        i === index ? { ...event, [key]: value } : event,
      ),
    }));
  }
  async function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const parsed = invitationSchema.safeParse(data);
      if (!parsed.success) throw new Error(parsed.error.issues[0].message);
      const result = await post<{ data: { id: string; version: number } }>(
        "/api/wedding/invitations",
        {
          invitation: parsed.data,
          ...(id ? { id, version: currentVersion.current } : {}),
        },
      );
      currentVersion.current = result.data.version;
      setMessage("Đã lưu thiệp. Bạn có thể xem thử trước khi xuất bản.");
      if (!id)
        router.push(
          selectedPlan
            ? `/dashboard/orders/new?invitation=${result.data.id}&plan=${selectedPlan}`
            : `/dashboard/${result.data.id}`,
        );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Chưa lưu được thiệp");
    } finally {
      setBusy(false);
    }
  }
  async function upload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !id || busy || uploading) return;
    const requestId = ++uploadRequest.current;
    setError("");
    setUploading(true);
    try {
      if (file.size > 5 * 1024 * 1024) throw new Error("Ảnh tối đa 5 MB");
      if (data.photos.length >= maxPhotos)
        throw new Error(`Gói hiện tại tối đa ${maxPhotos} ảnh`);
      const response = await fetch(`/api/wedding/upload?invitationId=${id}`, {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
      });
      if (!response.ok) {
        const failure = await response.json();
        throw new Error(failure.message || "Chưa tải được ảnh");
      }
      const result = await response.json();
      setData((d) => ({ ...d, photos: [...d.photos, result.data.url] }));
      setMessage("Ảnh đã tải lên. Hãy lưu thiệp để áp dụng.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Chưa tải được ảnh");
    } finally {
      if (requestId === uploadRequest.current) {
        setUploading(false);
        e.target.value = "";
      }
    }
  }
  return (
    <div className="editor-grid">
      <form className="panel" onSubmit={save}>
        <IdentityFields data={data} templates={templates} field={field} />
        <StoryFields data={data} field={field} />
        <EventFields data={data} field={field} eventField={eventField} />
        <PhotoFields
          data={data}
          setData={setData}
          field={field}
          upload={upload}
          id={id}
          maxPhotos={maxPhotos}
          uploading={uploading}
          busy={busy}
        />
        <ExtraFields data={data} field={field} />
        {error && (
          <p className="notice error" role="alert" style={{ marginTop: 20 }}>
            {error}
          </p>
        )}
        {message && (
          <p className="notice success" role="status" style={{ marginTop: 20 }}>
            {message}
          </p>
        )}
        <div className="editor-actions">
          <button type="submit" disabled={busy || uploading}>
            <Save size={16} />
            {busy ? "Đang lưu…" : id ? "Lưu thay đổi" : "Lưu bản nháp"}
          </button>
          {id && (
            <Link
              className="button secondary"
              href={`/dashboard/${id}/preview`}
            >
              Xem thử thiệp đã lưu
            </Link>
          )}
        </div>
      </form>
      <aside className="panel editor-preview">
        <p className="eyebrow" style={{ marginBottom: 20 }}>
          PHONG CÁCH ĐÃ CHỌN
        </p>
        <TemplateArtwork template={template} />
        <h3>
          {data.groom} & {data.bride}
        </h3>
        <p>
          {template.name} · Đây là hình minh họa phong cách mẫu.
          <br />
          Xem thiệp đầy đủ để thấy nội dung đã lưu.
        </p>
        {id && (
          <Link className="button secondary" href={`/dashboard/${id}/preview`}>
            Mở bản xem thử
          </Link>
        )}
        <p className="fine">Các thay đổi chỉ áp dụng khi bạn bấm lưu.</p>
      </aside>
    </div>
  );
}
