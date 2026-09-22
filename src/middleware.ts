import { NextResponse, type NextRequest } from "next/server";

/**
 * wink.cash/@adaeze  →  internally served by /wink/adaeze
 * "@" can't be a route segment in Next.js, so we rewrite it here.
 */
export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const m = pathname.match(/^\/@([a-z0-9_]{1,24})$/i);
  if (m) {
    const url = req.nextUrl.clone();
    url.pathname = `/wink/${m[1].toLowerCase()}`;
    return NextResponse.rewrite(url);
  }
  return NextResponse.next();
}

export const config = {
  // "@" isn't a legal matcher token, so we match everything and filter
  // inside; _next internals are skipped automatically by Next.
  matcher: ["/((?!_next/).*)"],
};
