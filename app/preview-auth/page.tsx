import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";

import { recordPreviewAuthRejection, recordPreviewSession } from "@/lib/preview-auth/audit";
import {
  COOKIE_NAME,
  COOKIE_MAX_AGE_SECONDS,
  signCookieValue,
} from "@/lib/preview-auth/cookie";
import {
  ALLOWED_PREVIEW_AUTH_DOMAINS,
  formatAllowedDomainsForCopy,
} from "@/lib/preview-auth/email-domain";
import { isPreviewEnvironment } from "@/lib/preview-auth/environment";
import { decideSignInAction } from "@/lib/preview-auth/sign-in-decision";

import { SignInForm } from "./sign-in-form";

export const dynamic = "force-dynamic";

async function signIn(formData: FormData) {
  "use server";
  if (!isPreviewEnvironment()) {
    return;
  }
  const decision = decideSignInAction({
    rawEmailField: formData.get("email"),
    rawNextField: formData.get("next"),
  });

  if (decision.kind === "reject-format") {
    recordPreviewAuthRejection(decision.rawEmail, "invalid-format");
    redirect(
      `/preview-auth?error=invalid&next=${encodeURIComponent(decision.next)}&email=${encodeURIComponent(decision.rawEmail)}`,
    );
  }
  if (decision.kind === "reject-domain") {
    recordPreviewAuthRejection(decision.rawEmail, "disallowed-domain");
    redirect(
      `/preview-auth?error=domain&next=${encodeURIComponent(decision.next)}&email=${encodeURIComponent(decision.rawEmail)}`,
    );
  }

  const { email, next } = decision;
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

interface PageProps {
  searchParams: Promise<{ error?: string; next?: string; email?: string }>;
}

export default async function PreviewAuthPage({ searchParams }: PageProps) {
  if (!isPreviewEnvironment()) {
    notFound();
  }
  const { error, next = "/", email: rejectedEmail = "" } = await searchParams;

  const allowedDomainsCopy = formatAllowedDomainsForCopy();
  const initialError =
    error === "domain"
      ? rejectedEmail
        ? `Sign-in is limited to ${allowedDomainsCopy} emails. The address you entered (${rejectedEmail}) uses a different domain.`
        : `Sign-in is limited to ${allowedDomainsCopy} emails.`
      : error === "invalid"
        ? "Please enter a valid email address."
        : null;

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
      <SignInForm
        action={signIn}
        next={next}
        initialError={initialError}
        allowedDomains={[...ALLOWED_PREVIEW_AUTH_DOMAINS]}
      />
    </main>
  );
}
