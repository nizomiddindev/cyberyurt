import { NextResponse } from "next/server";
import { readChallengeFileBytes } from "@/lib/ctf/loader";

export async function GET(
  _request: Request,
  context: { params: Promise<{ slug: string; filename: string }> },
) {
  const { slug, filename } = await context.params;
  const bytes = readChallengeFileBytes(slug, filename);

  if (!bytes) {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }

  const body = new Uint8Array(bytes.byteLength);
  body.set(bytes);

  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": "application/octet-stream",
      "Content-Disposition": `attachment; filename="${filename.replaceAll('"', "")}"`,
      "Cache-Control": "public, max-age=3600",
    },
  });
}
