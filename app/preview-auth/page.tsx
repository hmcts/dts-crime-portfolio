import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";

import { isValidEmail } from "@/lib/auth/resolver";
import { recordPreviewSession } from "@/lib/preview-auth/audit";
import {
  COOKIE_NAME,
  COOKIE_MAX_AGE_SECONDS,
  signCookieValue,
} from "@/lib/preview-auth/cookie";
import { isPreviewEnvironment } from "@/lib/preview-auth/environment";

export const dynamic = "force-dynamic";

async function signIn(formData: FormData) {
  "use server";
  if (!isPreviewEnvironment()) {
    return;
  }
  const rawEmail = String(formData.get("email") ?? "").trim();
  const next = sanitiseNext(String(formData.get("next") ?? "/"));
  if (!isValidEmail(rawEmail)) {
    redirect(`/preview-auth?error=invalid&next=${encodeURIComponent(next)}`);
  }
  const email = rawEmail.toLowerCase();
  const value = await signCookieValue(email);
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, value, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: COOKIE_MAX_AGE_SECONDS,
  });
  await recordPreviewSession(email);
  redirect(next);
}

function sanitiseNext(value: string): string {
  // Only allow same-origin paths; never honour a fully qualified URL.
  if (!value.startsWith("/")) return "/";
  if (value.startsWith("//")) return "/";
  return value;
}

interface PageProps {
  searchParams: Promise<{ error?: string; next?: string }>;
}

export default async function PreviewAuthPage({ searchParams }: PageProps) {
  if (!isPreviewEnvironment()) {
    notFound();
  }
  const { error, next = "/" } = await searchParams;

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center p-8">
      <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
        Preview environment — not production. Test data only.
      </div>
      <h1 className="mt-6 text-2xl font-semibold tracking-tight">Sign in to the preview</h1>
      <p className="mt-2 text-sm text-neutral-600">
        Enter the email you want to be identified as. There is no password — this is an
        internal preview, not a production sign-in.
      </p>
      <form action={signIn} className="mt-6 flex flex-col gap-3">
        <input type="hidden" name="next" value={next} />
        <label className="text-sm font-medium text-neutral-700" htmlFor="email">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          className="rounded-md border border-neutral-300 px-3 py-2 text-sm"
        />
        {error === "invalid" && (
          <p className="text-sm text-red-700">Please enter a valid email address.</p>
        )}
        <button
          type="submit"
          className="mt-2 rounded-md bg-neutral-900 px-3 py-2 text-sm font-medium text-white hover:bg-neutral-800"
        >
          Continue
        </button>
      </form>
    </main>
  );
}
