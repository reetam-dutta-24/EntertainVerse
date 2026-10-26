import { readUpload } from "@/lib/services/upload.service";

type RouteContext = { params: Promise<{ path: string[] }> };

/**
 * GET /uploads/... — serves a user upload from file storage (S3 with several servers).
 * A file that's in this server's public/ folder is served by Next before this route runs.
 */
export async function GET(_request: Request, context: RouteContext) {
  const file = await readUpload((await context.params).path);
  if (!file) return new Response("Not found", { status: 404 });

  return new Response(file.body, {
    headers: {
      "Content-Type": file.contentType,
      ...(file.size !== undefined && { "Content-Length": String(file.size) }),
      // File names are random and never reused, so a copy can be kept for a long time.
      "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
      // Never let a browser sniff an upload into HTML or script.
      "X-Content-Type-Options": "nosniff",
    },
  });
}
