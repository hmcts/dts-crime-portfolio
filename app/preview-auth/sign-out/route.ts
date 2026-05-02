import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { withRequestLogging } from "@/lib/logging/withLogging";
import { COOKIE_NAME } from "@/lib/preview-auth/cookie";
import { isPreviewEnvironment } from "@/lib/preview-auth/environment";

export const dynamic = "force-dynamic";

async function handlePost() {
  if (!isPreviewEnvironment()) {
    return new NextResponse(null, { status: 404 });
  }
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
  // Relative Location so the browser resolves against the public URL
  // it actually called. `NextResponse.redirect(new URL(..., request.url))`
  // leaks the runtime's internal host (e.g. https://localhost:10000 on
  // Render) when the platform terminates TLS at an upstream proxy.
  return new NextResponse(null, {
    status: 303,
    headers: { Location: "/preview-auth" },
  });
}

function handleGet() {
  return new NextResponse(null, { status: 405, headers: { Allow: "POST" } });
}

export const POST = withRequestLogging(handlePost);
export const GET = withRequestLogging(handleGet);
