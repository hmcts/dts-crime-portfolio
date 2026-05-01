export type AppEnvironment = "production" | "preview" | "local";

/**
 * Resolved application environment. Defaults to `production` when the
 * `APP_ENVIRONMENT` env var is unset or unrecognised, so a misconfigured
 * deployment fails closed (preview-auth becomes inert, the upstream proxy
 * is the only identity source).
 */
export function getAppEnvironment(): AppEnvironment {
  const env = process.env.APP_ENVIRONMENT;
  if (env === "preview" || env === "local") return env;
  return "production";
}

export function isPreviewEnvironment(): boolean {
  return getAppEnvironment() !== "production";
}
