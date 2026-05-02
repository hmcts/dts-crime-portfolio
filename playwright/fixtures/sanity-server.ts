import { createServer, type Server, type IncomingMessage, type ServerResponse } from "http";
import { URL } from "url";

/**
 * Local HTTP server that impersonates the Sanity API for the e2e suite.
 *
 * The Next.js process under test redirects all `*.api.sanity.io` traffic
 * here via the `playwright/fixtures/preload-mock.cjs` Node preload (set on
 * the webServer's `NODE_OPTIONS`). Tests configure the responses for the
 * upcoming GROQ queries by POSTing to `/__set-fixtures`. Each query is
 * matched by GROQ-fragment substring; mutations always resolve with
 * `{ transactionId: "fake" }` so the previewSession audit write never
 * blocks the sign-in flow.
 *
 * The control endpoints are unauthenticated and only listen on
 * `127.0.0.1`, so they never collide with real Sanity traffic.
 */

export interface SanityFixtureEntry {
  fragment: string;
  result: unknown;
  /**
   * Optional GROQ-parameter constraints. The fixture only matches when
   * every key here equals the corresponding value in the request's
   * `params`. Empty arrays match an empty / missing parameter. Used to
   * disambiguate the "list with no filters" vs "list with stage=pilot"
   * case where the GROQ string is identical.
   */
  paramsEqual?: Record<string, unknown>;
}

interface InternalState {
  fixtures: SanityFixtureEntry[];
  fallback: unknown;
  mutationResult: unknown;
  unmatched: string[];
}

const DEFAULT_STATE: InternalState = {
  fixtures: [],
  fallback: null,
  mutationResult: { transactionId: "fake" },
  unmatched: [],
};

let server: Server | undefined;
const state: InternalState = { ...DEFAULT_STATE, fixtures: [] };

export async function startSanityFixtureServer(port: number): Promise<Server> {
  if (server) return server;
  server = createServer(handle);
  await new Promise<void>((resolve, reject) => {
    server!.once("error", reject);
    server!.listen(port, "127.0.0.1", () => resolve());
  });
  return server;
}

export async function stopSanityFixtureServer(): Promise<void> {
  if (!server) return;
  await new Promise<void>((resolve) => {
    server!.close(() => resolve());
  });
  server = undefined;
}

function handle(request: IncomingMessage, response: ServerResponse): void {
  const url = new URL(request.url ?? "/", "http://127.0.0.1");
  const method = request.method ?? "GET";

  if (url.pathname === "/__set-fixtures" && method === "POST") {
    return readJson(request, (err, body) => {
      if (err) return jsonResponse(response, 400, { error: err.message });
      const next = body as Partial<InternalState> | undefined;
      state.fixtures = next?.fixtures ?? [];
      state.fallback = next?.fallback ?? null;
      state.mutationResult = next?.mutationResult ?? { transactionId: "fake" };
      state.unmatched = [];
      jsonResponse(response, 200, { ok: true });
    });
  }

  if (url.pathname === "/__unmatched" && method === "GET") {
    return jsonResponse(response, 200, { unmatched: state.unmatched });
  }

  if (url.pathname === "/__health") {
    return jsonResponse(response, 200, { ok: true });
  }

  // Mutation endpoint — Sanity uses POST /v.../data/mutate/<dataset>.
  if (url.pathname.includes("/data/mutate/")) {
    return readBody(request, () => {
      jsonResponse(response, 200, state.mutationResult);
    });
  }

  // Listen / live endpoints — return an empty event-stream-ish body so any
  // accidental subscription completes immediately rather than hanging.
  if (url.pathname.includes("/data/listen/") || url.pathname.includes("/live/events/")) {
    return jsonResponse(response, 200, { result: null });
  }

  if (url.pathname.includes("/data/query/")) {
    return handleQuery(url, request, response);
  }

  // Unknown path — let the test author know.
  state.unmatched.push(`${method} ${url.pathname}`);
  jsonResponse(response, 200, { result: state.fallback });
}

function handleQuery(url: URL, request: IncomingMessage, response: ServerResponse): void {
  const method = request.method ?? "GET";
  const matchAndRespond = (query: string, params: Record<string, unknown>) => {
    for (const entry of state.fixtures) {
      if (!query.includes(entry.fragment)) continue;
      if (entry.paramsEqual) {
        const ok = Object.entries(entry.paramsEqual).every(([key, expected]) =>
          deepEqual(params[key], expected),
        );
        if (!ok) continue;
      }
      return jsonResponse(response, 200, { result: entry.result });
    }
    state.unmatched.push(`${method} ${url.pathname} :: ${query.slice(0, 200)}`);
    return jsonResponse(response, 200, { result: state.fallback });
  };

  if (method === "GET") {
    const query = url.searchParams.get("query") ?? "";
    const params: Record<string, unknown> = {};
    for (const [key, value] of url.searchParams.entries()) {
      if (key.startsWith("$")) {
        try {
          params[key.slice(1)] = JSON.parse(value);
        } catch {
          params[key.slice(1)] = value;
        }
      }
    }
    return matchAndRespond(query, params);
  }

  return readJson(request, (err, body) => {
    if (err) return jsonResponse(response, 400, { error: err.message });
    const parsed = body as { query?: string; params?: Record<string, unknown> } | undefined;
    matchAndRespond(parsed?.query ?? "", parsed?.params ?? {});
  });
}

function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    return a.every((value, index) => deepEqual(value, b[index]));
  }
  if (a && b && typeof a === "object" && typeof b === "object") {
    const aKeys = Object.keys(a as Record<string, unknown>);
    const bKeys = Object.keys(b as Record<string, unknown>);
    if (aKeys.length !== bKeys.length) return false;
    return aKeys.every((key) =>
      deepEqual(
        (a as Record<string, unknown>)[key],
        (b as Record<string, unknown>)[key],
      ),
    );
  }
  return false;
}

function readBody(request: IncomingMessage, onDone: (raw: string) => void): void {
  const chunks: Buffer[] = [];
  request.on("data", (chunk: Buffer) => chunks.push(chunk));
  request.on("end", () => onDone(Buffer.concat(chunks).toString("utf8")));
}

function readJson(
  request: IncomingMessage,
  onDone: (err: Error | null, body?: unknown) => void,
): void {
  readBody(request, (raw) => {
    if (!raw) return onDone(null, {});
    try {
      onDone(null, JSON.parse(raw));
    } catch (err) {
      onDone(err as Error);
    }
  });
}

function jsonResponse(response: ServerResponse, status: number, body: unknown): void {
  const payload = JSON.stringify(body);
  response.writeHead(status, {
    "content-type": "application/json",
    "content-length": Buffer.byteLength(payload),
  });
  response.end(payload);
}
