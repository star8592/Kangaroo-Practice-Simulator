import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

/**
 * The public AMC8 order-entry page is not a redemption handler.
 * Strip query strings at the server boundary before Next renders RSC flight
 * data: Next serializes a request's original search params even when a page
 * component doesn't consume them.
 *
 * The actual paid claim service is separate and must replace this guard
 * atomically when enabled and independently verified.
 */
export function proxy(request: NextRequest) {
  if (request.nextUrl.search) {
    const clean = request.nextUrl.clone();
    clean.search = "";
    clean.hash = "";
    const response = NextResponse.redirect(clean, 303);
    response.headers.set("Cache-Control", "private, no-store");
    response.headers.set("Referrer-Policy", "no-referrer");
    return response;
  }
  const response = NextResponse.next();
  response.headers.set("Cache-Control", "private, no-store");
  response.headers.set("Referrer-Policy", "no-referrer");
  return response;
}

export const config = {
  matcher: ["/marketplace/claim"],
};
