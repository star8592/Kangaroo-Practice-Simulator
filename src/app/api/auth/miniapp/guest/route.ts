import { NextResponse } from "next/server";
import { createGuestSessionToken, userFromSessionToken } from "@/lib/auth";

export async function POST() {
  const accessToken = createGuestSessionToken();
  const user = userFromSessionToken(accessToken);
  return NextResponse.json({ ok: true, guest: true, user, accessToken });
}
