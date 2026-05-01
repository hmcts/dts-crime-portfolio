/**
 * Shared helpers for toggling and setting URL filter params. Used by the
 * portfolio filter UI client components so the toggle/set logic lives in
 * one place and is unit-testable.
 */

export function readMultiParam(params: URLSearchParams, key: string): string[] {
  return params
    .getAll(key)
    .flatMap((entry) => entry.split(","))
    .map((entry) => entry.trim())
    .filter(Boolean);
}

export function toggleMultiParam(
  params: URLSearchParams,
  key: string,
  value: string,
): URLSearchParams {
  const current = readMultiParam(params, key);
  const exists = current.includes(value);
  const next = exists ? current.filter((v) => v !== value) : [...current, value];
  return writeMultiParam(params, key, next);
}

export function writeMultiParam(
  params: URLSearchParams,
  key: string,
  values: string[],
): URLSearchParams {
  const result = new URLSearchParams(params);
  result.delete(key);
  if (values.length > 0) {
    result.set(key, values.join(","));
  }
  return result;
}

export function setSingleParam(
  params: URLSearchParams,
  key: string,
  value: string,
): URLSearchParams {
  const result = new URLSearchParams(params);
  if (value) {
    result.set(key, value);
  } else {
    result.delete(key);
  }
  return result;
}
