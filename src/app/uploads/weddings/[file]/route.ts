import { serveUpload } from "@/app/uploads/serve-upload";

// Reads the disk on every request: the folder changes after the build.
export const dynamic = "force-dynamic";

type Context = { params: Promise<{ file: string }> };

export async function GET(request: Request, context: Context) {
  return serveUpload(request, (await context.params).file);
}

export async function HEAD(request: Request, context: Context) {
  return serveUpload(request, (await context.params).file, {
    withBody: false,
  });
}
