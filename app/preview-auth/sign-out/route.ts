import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { COOKIE_NAME } from "@/lib/preview-auth/cookie";
import { isPreviewEnvironment } from "@/lib/preview-auth/environment";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!isPreviewEnvironment()) {
    return new NextResponse(null, { status: 404 });
  }
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
  return NextResponse.redirect(new URL("/preview-auth", request.url));
}

export function GET() {
  return new NextResponse(null, { status: 405, headers: { Allow: "POST" } });
}
