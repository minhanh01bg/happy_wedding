/** Catalog looks share wedding data and actions, while retaining their own composition. */
export type InvitationDesign = {
  key: string;
  motif: string;
  opening: "doors" | "curtain" | "letter";
  artPhoto: boolean;
};
const designs: Record<string, InvitationDesign> = {
  "editorial:rose": {
    key: "loi-yeu",
    motif: "♡",
    opening: "doors",
    artPhoto: false,
  },
  "botanical:sage": {
    key: "vuon-thuong",
    motif: "❦",
    opening: "doors",
    artPhoto: false,
  },
  "classic:wine": {
    key: "song-hy",
    motif: "囍",
    opening: "doors",
    artPhoto: false,
  },
  "editorial:sand": {
    key: "ngay-chung-doi",
    motif: "&",
    opening: "letter",
    artPhoto: true,
  },
  "classic:midnight": {
    key: "dem-sao",
    motif: "✧",
    opening: "doors",
    artPhoto: false,
  },
  "botanical:terracotta": {
    key: "nang-thu",
    motif: "❦",
    opening: "doors",
    artPhoto: false,
  },
  "minimal:sand": {
    key: "loi-hen",
    motif: "&",
    opening: "letter",
    artPhoto: false,
  },
  "minimal:rose": {
    key: "thu-tinh",
    motif: "♡",
    opening: "letter",
    artPhoto: true,
  },
  "cinematic:midnight": {
    key: "khoanh-khac",
    motif: "✧",
    opening: "curtain",
    artPhoto: true,
  },
  "cinematic:terracotta": {
    key: "ben-nhau",
    motif: "♡",
    opening: "curtain",
    artPhoto: true,
  },
};
export function invitationDesign(template: {
  layout: string;
  palette: string;
}): InvitationDesign {
  return (
    designs[`${template.layout}:${template.palette}`] ?? {
      key: template.layout,
      motif: template.layout === "classic" ? "囍" : "♡",
      opening:
        template.layout === "cinematic"
          ? "curtain"
          : template.layout === "minimal"
            ? "letter"
            : "doors",
      artPhoto: template.layout === "cinematic",
    }
  );
}
