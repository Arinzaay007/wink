import { NextResponse, type NextRequest } from "next/server";

/**
 * Real business mode — open to world:
 * - @handle rewrite: /@adaeze → /wink/adaeze
 * - waitlist.winkpay.xyz → serves /waitlist isolated
 * - winkpay.xyz/* → open, no redirect to waitlist
 * - Payment links /wink/* and /pay/* public for non-wink users scanning QR
 */

const BYPASS_TOKEN = process.env.WAITLIST_BYPASS_TOKEN || "wink-admin-2026";

export function middleware(req: NextRequest) {
  const { pathname, searchParams } = req.nextUrl;
  const hostname = req.headers.get("host") || "";

  // owner bypass cookie set via ?admin=TOKEN (kept for team)
  const adminQuery = searchParams.get("admin");
  if (adminQuery === BYPASS_TOKEN) {
    const res = NextResponse.next();
    res.cookies.set("wink_bypass", BYPASS_TOKEN, { maxAge: 60 * 60 * 24 * 7, path: "/" });
    // handle @ rewrite even for owner
    const m = pathname.match(/^\/@([a-z0-9_]{1,24})$/i);
    if (m) {
      const url = req.nextUrl.clone();
      url.pathname = `/wink/${m[1].toLowerCase()}`;
      return NextResponse.rewrite(url);
    }
    return res;
  }

  // waitlist subdomain: always serve waitlist
  if (hostname.startsWith("waitlist.")) {
    if (pathname === "/") {
      const url = req.nextUrl.clone();
      url.pathname = "/waitlist";
      return NextResponse.rewrite(url);
    }
    if (pathname.startsWith("/waitlist") || pathname.startsWith("/api/waitlist") || pathname.startsWith("/_next") || pathname === "/favicon.ico" || pathname === "/icon.png" || pathname === "/og-image.png") {
      return NextResponse.next();
    }
    const url = req.nextUrl.clone();
    url.pathname = "/waitlist";
    return NextResponse.rewrite(url);
  }

  // @handle rewrite for apex and www
  const m = pathname.match(/^\/@([a-z0-9_]{1,24})$/i);
  if (m) {
    const url = req.nextUrl.clone();
    url.pathname = `/wink/${m[1].toLowerCase()}`;
    return NextResponse.rewrite(url);
  }

  // open to world — no redirect to waitlist
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/).*)"],
};
