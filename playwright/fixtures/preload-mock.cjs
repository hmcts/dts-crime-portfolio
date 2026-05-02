/**
 * Node `--require` preload that intercepts outbound traffic to
 * `*.api.sanity.io` (or `*.apicdn.sanity.io`) and redirects it to the
 * local fixture server identified by the `SANITY_MOCK_PROXY` env var.
 *
 * Two transports are patched:
 *
 *  1. `http.request` / `https.request` — the @sanity/client default
 *     under the Node.js condition imports `get-it`, which uses these
 *     directly.
 *  2. `globalThis.fetch` — under the `react-server` export condition
 *     (Next.js App Router server components, server actions, route
 *     handlers) get-it falls back to the browser entry which uses
 *     `fetch()`. Without this patch, the Server Action that records
 *     a previewSession would hit the real Sanity API and fail with 401.
 *
 * Playwright's `page.route()` cannot see this traffic because it
 * originates inside the Next.js process, not the browser.
 */

/* eslint-disable @typescript-eslint/no-require-imports */
"use strict";

(function installSanityMockPreload() {
  const proxyUrl = process.env.SANITY_MOCK_PROXY;
  if (!proxyUrl) {
    // Preload was loaded but no mock target is configured. Leave the
    // runtime untouched — the build still has to run somewhere.
    return;
  }

  const http = require("http");
  const https = require("https");
  const { URL } = require("url");

  // One log line per process so we can verify the preload is active.
  console.log(`[sanity-mock-preload] active, redirecting *.api.sanity.io to ${proxyUrl}`);

  const target = new URL(proxyUrl);
  const targetIsHttps = target.protocol === "https:";
  const targetHost = target.hostname;
  const targetPort = Number(target.port) || (targetIsHttps ? 443 : 80);

  function isSanityHost(hostname) {
    if (!hostname) return false;
    const lower = String(hostname).toLowerCase();
    return (
      lower.endsWith(".api.sanity.io") ||
      lower === "api.sanity.io" ||
      lower.endsWith(".apicdn.sanity.io") ||
      lower === "apicdn.sanity.io"
    );
  }

  function rewriteRequestOptions(options, originalHostname) {
    const rewritten = Object.assign({}, options);
    rewritten.protocol = targetIsHttps ? "https:" : "http:";
    rewritten.hostname = targetHost;
    rewritten.host = `${targetHost}:${targetPort}`;
    rewritten.port = targetPort;
    rewritten.headers = Object.assign({}, options.headers || {});
    rewritten.headers["x-sanity-mock-host"] = originalHostname;
    // Drop the SNI hint and any explicit agent — talking to localhost.
    delete rewritten.servername;
    rewritten.rejectUnauthorized = false;
    rewritten.agent = false;
    return rewritten;
  }

  function patchHttp(mod, name) {
    const original = mod[name];
    mod[name] = function patched(...args) {
      let options;
      let callback;
      if (typeof args[0] === "string" || args[0] instanceof URL) {
        const url = typeof args[0] === "string" ? new URL(args[0]) : args[0];
        if (typeof args[1] === "function") {
          options = {};
          callback = args[1];
        } else {
          options = args[1] || {};
          callback = args[2];
        }
        options = Object.assign(
          {
            protocol: url.protocol,
            hostname: url.hostname,
            host: url.host,
            port: url.port || (url.protocol === "https:" ? 443 : 80),
            path: `${url.pathname}${url.search}`,
          },
          options,
        );
      } else {
        options = args[0] || {};
        callback = args[1];
      }

      const hostname = options.hostname || options.host;
      if (isSanityHost(hostname)) {
        const rewritten = rewriteRequestOptions(options, hostname);
        const targetRequest = targetIsHttps ? https.request : http.request;
        const targetModule = targetIsHttps ? https : http;
        return targetRequest.call(targetModule, rewritten, callback);
      }

      return original.apply(this, args);
    };
  }

  patchHttp(http, "request");
  patchHttp(https, "request");
  http.get = function get(...args) {
    const req = http.request(...args);
    req.end();
    return req;
  };
  https.get = function get(...args) {
    const req = https.request(...args);
    req.end();
    return req;
  };

  // -- fetch() interception ---------------------------------------------
  //
  // Wrap globalThis.fetch so any URL whose host matches isSanityHost is
  // rewritten to the local fixture server. We replace the URL outright
  // rather than going through middleware so that the Sanity client's
  // wire format (path, query, headers, body) is preserved verbatim.

  const originalFetch = globalThis.fetch;
  if (typeof originalFetch === "function") {
    globalThis.fetch = function patchedFetch(input, init) {
      try {
        let url;
        let method;
        if (typeof input === "string") {
          url = new URL(input);
        } else if (input instanceof URL) {
          url = new URL(input.toString());
        } else if (input && typeof input === "object" && "url" in input) {
          // Request instance.
          url = new URL(input.url);
          method = input.method;
        }

        if (url && isSanityHost(url.hostname)) {
          const rewrittenUrl = new URL(url.toString());
          rewrittenUrl.protocol = targetIsHttps ? "https:" : "http:";
          rewrittenUrl.hostname = targetHost;
          rewrittenUrl.port = String(targetPort);

          const headers = new Headers((init && init.headers) || (input && input.headers) || {});
          headers.set("x-sanity-mock-host", url.hostname);

          // Reconstruct init/body. If `input` was a Request, lift its
          // body — Request's body is a stream so we let the user-agent
          // handle pass-through.
          if (input && typeof input === "object" && "url" in input && !init) {
            return originalFetch(rewrittenUrl.toString(), {
              method: input.method,
              headers,
              body: input.body,
              // @ts-expect-error duplex required when streaming a body in undici
              duplex: input.body ? "half" : undefined,
              signal: input.signal,
              redirect: input.redirect,
            });
          }
          return originalFetch(rewrittenUrl.toString(), {
            ...(init || {}),
            method: method ?? (init && init.method),
            headers,
          });
        }
      } catch {
        // Fall through to original fetch if anything goes wrong with
        // URL parsing — better to let the call go than to break the run.
      }
      return originalFetch(input, init);
    };
  }
})();
