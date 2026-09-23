import { NextResponse } from "next/server";
import QRCode from "qrcode";
import { normalizeHandle } from "@/lib/handles";

export const runtime = "nodejs";

/** Printable wink code: QR of the public pay page (or any ?p= path). */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const pathParam = searchParams.get("p");
  const handle = normalizeHandle(searchParams.get("h") ?? "");
  if (!pathParam && !handle) return new NextResponse("missing target", { status: 400 });

  const base = process.env.NEXT_PUBLIC_BASE_URL ?? "https://wink.cash";
  const url = pathParam
    ? `${base}${pathParam.startsWith("/") ? pathParam : `/${pathParam}`}`
    : `${base}/@${handle}`;

  const png = await QRCode.toBuffer(url, {
    width: 640,
    margin: 2,
    color: { dark: "#101018", light: "#ffd166" },
  });
  return new NextResponse(new Uint8Array(png), {
    headers: {
      "content-type": "image/png",
      "cache-control": "public, max-age=3600",
    },
  });
}
