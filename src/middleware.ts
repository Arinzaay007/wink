import { NextResponse, type NextRequest } from "next/server";

/**
 * - wink.cash/@adaeze  →  internally served by /wink/adaeze
 * - waitlist.winkpay.xyz → serves /waitlist isolated page (no exposure of real app)
 */
export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const hostname = req.headers.get("host") || "";

  // waitlist subdomain isolation: waitlist.winkpay.xyz or waitlist.localhost
  if (hostname.startsWith("waitlist.")) {
    // allow api for waitlist join and static assets, everything else -> /waitlist
    if (pathname.startsWith("/api/waitlist") || pathname.startsWith("/_next") || pathname.startsWith("/favicon")) {
      return NextResponse.next();
    }
    if (pathname === "/waitlist" || pathname === "/") {
      if (pathname === "/") {
        const url = req.nextUrl.clone();
        url.pathname = "/waitlist";
        return NextResponse.rewrite(url);
      }
      return NextResponse.next();
    }
    // block exposure of real pages on waitlist subdomain — redirect to waitlist
    const url = req.nextUrl.clone();
    url.pathname = "/waitlist";
    return NextResponse.rewrite(url);
  }

  const m = pathname.match(/^\/@([a-z0-9_]{1,24})$/i);
  if (m) {
    const url = req.nextUrl.clone();
    url.pathname = `/wink/${m[1].toLowerCase()}`;
    return NextResponse.rewrite(url);
  }
  return NextResponse.next();
}

export const config = {
  // "!" isn't a legal matcher token, so we match everything and filter
  // inside; _next internals are skipped automatically by Next.
  matcher: ["/((?!_next/).*)"],
};
