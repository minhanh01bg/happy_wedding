// @vitest-environment node
import { mkdir, mkdtemp, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import {
  parseRange,
  serveUpload,
  uploadContentType,
  WEDDING_UPLOAD_DIR,
} from "@/app/uploads/serve-upload";
import { GET, HEAD } from "@/app/uploads/weddings/[file]/route";
import { logger } from "@/lib/logger";

const PHOTO = "6f1c2a4e-1d2b-4c3d-8e9f-0a1b2c3d4e5f.webp";
const SONG = "0b9c8d7e-6f5a-4b3c-9d2e-1f0a9b8c7d6e.mp3";
const photoBytes = Buffer.from("RIFF\0\0\0\0WEBPVP8 fake photo bytes");
const songBytes = Buffer.from(Array.from({ length: 100 }, (_, index) => index));

let project: string;
let root: string;
let outside: string;

function get(name: string, headers: Record<string, string> = {}) {
  return GET(
    new Request(`http://127.0.0.1:3200/uploads/weddings/${name}`, {
      headers,
    }),
    { params: Promise.resolve({ file: name }) },
  );
}

beforeAll(async () => {
  project = await mkdtemp(path.join(tmpdir(), "uploads-route-"));
  root = path.join(project, WEDDING_UPLOAD_DIR);
  outside = path.join(project, "secret");
  await mkdir(root, { recursive: true });
  await mkdir(outside);
  await writeFile(path.join(root, PHOTO), photoBytes);
  await writeFile(path.join(root, SONG), songBytes);
  await writeFile(path.join(outside, "leak.webp"), "outside the folder");
  await writeFile(path.join(project, "public", "uploads", "up.webp"), "up");
  await symlink(path.join(outside, "leak.webp"), path.join(root, "out.webp"));
  await symlink(path.join(root, PHOTO), path.join(root, "alias.webp"));
  await mkdir(path.join(root, "folder.webp"));
  await writeFile(path.join(root, "page.html"), "<script>1</script>");
  // The route reads the folder under the working directory, as the upload
  // routes write it.
  vi.spyOn(process, "cwd").mockReturnValue(project);
});

afterAll(async () => {
  vi.restoreAllMocks();
  await rm(project, { recursive: true, force: true });
});

describe("uploadContentType", () => {
  it("maps the upload extensions and nothing else", () => {
    expect(uploadContentType(PHOTO)).toBe("image/webp");
    expect(uploadContentType("a.jpg")).toBe("image/jpeg");
    expect(uploadContentType("a.jpeg")).toBe("image/jpeg");
    expect(uploadContentType("a.png")).toBe("image/png");
    expect(uploadContentType(SONG)).toBe("audio/mpeg");
    for (const name of [
      "a.svg",
      "a.html",
      "a.WEBP",
      "a",
      ".webp",
      ".hidden.webp",
      "a.b.webp",
      "../a.webp",
      "a/b.webp",
      "a\\b.webp",
      "a.webp\0",
      "a.webp ",
      "%2e%2e.webp",
      `${"x".repeat(129)}.webp`,
    ])
      expect(uploadContentType(name), name).toBeNull();
  });
});

describe("parseRange", () => {
  it("reads one byte range and clamps its end to the file", () => {
    expect(parseRange("bytes=0-9", 100)).toEqual({ start: 0, end: 9 });
    expect(parseRange("bytes=90-", 100)).toEqual({ start: 90, end: 99 });
    expect(parseRange("bytes=-5", 100)).toEqual({ start: 95, end: 99 });
    expect(parseRange("bytes=-500", 100)).toEqual({ start: 0, end: 99 });
    expect(parseRange("bytes=50-5000", 100)).toEqual({ start: 50, end: 99 });
  });

  it("ignores a missing, malformed or multiple range", () => {
    for (const header of [
      null,
      "",
      "bytes=-",
      "bytes=9-0",
      "bytes=0-1,4-5",
      "items=0-1",
      "bytes=a-b",
    ])
      expect(parseRange(header, 100), String(header)).toBeNull();
  });

  it("flags a range past the end as unsatisfiable", () => {
    expect(parseRange("bytes=100-", 100)).toBe("unsatisfiable");
    expect(parseRange("bytes=-0", 100)).toBe("unsatisfiable");
    expect(parseRange("bytes=0-", 0)).toBe("unsatisfiable");
    expect(parseRange("bytes=999999999999999-", 100)).toBe("unsatisfiable");
  });
});

describe("GET /uploads/weddings/[file]", () => {
  it("serves a photo written after start with its type and long cache", async () => {
    const response = await get(PHOTO);
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("image/webp");
    expect(response.headers.get("x-content-type-options")).toBe("nosniff");
    expect(response.headers.get("cache-control")).toBe(
      "public, max-age=31536000, immutable",
    );
    expect(response.headers.get("accept-ranges")).toBe("bytes");
    expect(response.headers.get("content-length")).toBe(
      String(photoBytes.length),
    );
    expect(Buffer.from(await response.arrayBuffer())).toEqual(photoBytes);
  });

  it("answers a Range request on an MP3 with 206 and the slice", async () => {
    const response = await get(SONG, { range: "bytes=10-19" });
    expect(response.status).toBe(206);
    expect(response.headers.get("content-type")).toBe("audio/mpeg");
    expect(response.headers.get("content-range")).toBe("bytes 10-19/100");
    expect(response.headers.get("content-length")).toBe("10");
    expect(Buffer.from(await response.arrayBuffer())).toEqual(
      songBytes.subarray(10, 20),
    );
  });

  it("answers a range past the end with 416", async () => {
    const response = await get(SONG, { range: "bytes=100-" });
    expect(response.status).toBe(416);
    expect(response.headers.get("content-range")).toBe("bytes */100");
    expect(await response.text()).toBe("");
  });

  it("sends the whole file when the range is ignored", async () => {
    const response = await get(SONG, { range: "bytes=0-1,5-6" });
    expect(response.status).toBe(200);
    expect(Buffer.from(await response.arrayBuffer())).toEqual(songBytes);
  });

  it("refuses traversal, other folders, symlinks and unknown types", async () => {
    for (const name of [
      "../up.webp",
      "../../secret/leak.webp",
      "..%2Fup.webp",
      "out.webp",
      "alias.webp",
      "folder.webp",
      "page.html",
      "missing.webp",
    ]) {
      const response = await get(name);
      expect(response.status, name).toBe(404);
      expect(response.headers.get("cache-control"), name).toBe("no-store");
      expect(response.headers.get("content-type"), name).toBe(
        "text/plain; charset=utf-8",
      );
      expect(await response.text(), name).toBe("Not Found");
    }
  });

  it("answers HEAD with the headers and no body", async () => {
    const response = await HEAD(
      new Request(`http://127.0.0.1:3200/uploads/weddings/${SONG}`, {
        method: "HEAD",
        headers: { range: "bytes=0-9" },
      }),
      { params: Promise.resolve({ file: SONG }) },
    );
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("audio/mpeg");
    expect(response.headers.get("content-length")).toBe("100");
    expect(response.body).toBeNull();
  });

  it("returns 500 with a correlation ID when the disk fails", async () => {
    const error = vi.spyOn(logger, "error").mockImplementation(() => {});
    // Missing names are 404; an unreadable file is a real failure.
    const unreadable = path.join(root, "locked.webp");
    await writeFile(unreadable, "x", { mode: 0o000 });
    const response = await serveUpload(
      new Request("http://127.0.0.1:3200/uploads/weddings/locked.webp"),
      "locked.webp",
      { root },
    );
    if (process.getuid?.() === 0) {
      // root ignores file modes; nothing to assert on this host.
      expect(response.status).toBe(200);
    } else {
      expect(response.status).toBe(500);
      expect(await response.text()).toMatch(/^Internal Server Error \(.+\)$/);
      expect(error).toHaveBeenCalledWith(
        "upload_serve_error",
        expect.objectContaining({ errorCode: "EACCES" }),
      );
    }
    error.mockRestore();
  });
});
