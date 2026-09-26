import { NextResponse, type NextRequest } from "next/server";

/**
 * - @handle rewrite: /@adaeze → /wink/adaeze
 * - waitlist.winkpay.xyz → serves /waitlist isolated
 * - MAIN SITE CLOSED: winkpay.xyz/* (except /waitlist) → redirect to /waitlist
 *   Only waitlist is public for now. Owner bypass via ?admin=TOKEN or cookie.
 */

const PUBLIC_PATHS = [
  "/waitlist",
  "/api/waitlist/join",
  "/wink", // payment links must be public — non-wink users scanning QR should land here
  "/pay", // merchant QR pay pages public
  "/api/wink", // prepare + confirm for wink payments (guest allowed)
  "/api/bridge", // quote for any-chain payments (guest)
  "/api/resolve", // handle -> wallet resolution for payment
  "/api/send", // send to 0x for guests? keep public for payment flow
  "/api/fund", // demo wallet faucet
  "/api/portfolio", // allow guest? filtered no burner
  "/_next",
  "/favicon",
  "/icon.png",
  "/og-image.png",
  "/robots.txt",
  "/sitemap.xml",
];

const BYPASS_TOKEN = process.env.WAITLIST_BYPASS_TOKEN || "wink-admin-2026"; // set in Vercel env for owner access

export function middleware(req: NextRequest) {
  const { pathname, searchParams } = req.nextUrl;
  const hostname = req.headers.get("host") || "";

  // owner bypass: ?admin=TOKEN or cookie wink_bypass=TOKEN
  const adminQuery = searchParams.get("admin");
  const bypassCookie = req.cookies.get("wink_bypass")?.value;
  const isOwner = adminQuery === BYPASS_TOKEN || bypassCookie === BYPASS_TOKEN;

  if (isOwner) {
    // set cookie for future requests if via query
    if (adminQuery === BYPASS_TOKEN) {
      const res = NextResponse.next();
      res.cookies.set("wink_bypass", BYPASS_TOKEN, { maxAge: 60 * 60 * 24 * 7, path: "/" });
      return res;
    }
    // owner can access everything
    // still handle @ rewrite
    const m = pathname.match(/^\/@([a-z0-9_]{1,24})$/i);
    if (m) {
      const url = req.nextUrl.clone();
      url.pathname = `/wink/${m[1].toLowerCase()}`;
      return NextResponse.rewrite(url);
    }
    return NextResponse.next();
  }

  // waitlist subdomain: always serve waitlist, block real app
  if (hostname.startsWith("waitlist.")) {
    if (PUBLIC_PATHS.some((p) => pathname.startsWith(p)) || pathname === "/") {
      if (pathname === "/") {
        const url = req.nextUrl.clone();
        url.pathname = "/waitlist";
        return NextResponse.rewrite(url);
      }
      return NextResponse.next();
    }
    const url = req.nextUrl.clone();
    url.pathname = "/waitlist";
    return NextResponse.rewrite(url);
  }

  // MAIN SITE CLOSED: only /waitlist is public on apex
  const isPublic = PUBLIC_PATHS.some((p) => pathname.startsWith(p));
  if (!isPublic) {
    // allow @handle rewrite to still redirect to waitlist? No, block.
    // Redirect everything else to /waitlist
    const url = req.nextUrl.clone();
    url.pathname = "/waitlist";
    // keep query for analytics but remove admin param
    return NextResponse.redirect(url);
  }

  // public paths + @handle rewrite for allowed paths
  const m = pathname.match(/^\/@([a-z0-9_]{1,24})$/i);
  if (m) {
    const url = req.nextUrl.clone();
    url.pathname = `/wink/${m[1].toLowerCase()}`;
    return NextResponse.rewrite(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/).*)"],
};
