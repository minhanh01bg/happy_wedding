"use client";
import { useState } from "react";
import type { WeddingTemplate } from "@prisma/client";
import { TemplateCard } from "./template-card";

export function TemplateCatalog({
  templates,
}: {
  templates: WeddingTemplate[];
}) {
  const [category, setCategory] = useState("Tất cả");
  const [search, setSearch] = useState("");
  const filtered = templates.filter(
    (t) =>
      (category === "Tất cả" || t.category === category) &&
      `${t.name} ${t.description}`
        .toLocaleLowerCase("vi")
        .includes(search.toLocaleLowerCase("vi")),
  );
  return (
    <>
      <div className="catalog-toolbar">
        <div
          className="filter-tabs"
          role="group"
          aria-label="Lọc mẫu theo phong cách"
        >
          {["Tất cả", "Tối giản", "Hoa lá", "Truyền thống", "Hiện đại"].map(
            (c) => (
              <button
                key={c}
                aria-pressed={category === c}
                className={category === c ? "active" : ""}
                onClick={() => setCategory(c)}
              >
                {c}
              </button>
            ),
          )}
        </div>
        <input
          aria-label="Tìm mẫu thiệp"
          placeholder="Tìm một tấm thiệp…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>
      <p className="fine">
        {filtered.length} mẫu thiệp · Mỗi mẫu đều có album, lịch tiệc, lời chúc
        & RSVP
      </p>
      <div className="template-grid">
        {filtered.map((t) => (
          <TemplateCard key={t.id} template={t} />
        ))}
      </div>
      {!filtered.length && (
        <div className="empty-state">
          Chưa tìm thấy mẫu phù hợp. Hãy thử phong cách khác.
        </div>
      )}
    </>
  );
}
