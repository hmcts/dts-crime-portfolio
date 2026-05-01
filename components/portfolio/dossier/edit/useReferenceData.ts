"use client";

import { useEffect, useState } from "react";

import type { ReferenceData } from "@/lib/portfolio/referenceData";

interface State {
  data: ReferenceData | null;
  error: string | null;
  loading: boolean;
}

/**
 * Lazy-loaded reference-data fetch shared by the inline editors. The hook
 * fires on the first render of any editor that asks for it and caches the
 * result for the lifetime of the page. Spec: openspec/specs/reference-data
 * /spec.md (the dropdown lynchpin endpoint).
 */
export function useReferenceData(enabled: boolean): State {
  const [state, setState] = useState<State>({
    data: null,
    error: null,
    loading: false,
  });

  useEffect(() => {
    if (!enabled || state.data || state.loading) return;
    let cancelled = false;
    setState((prev) => ({ ...prev, loading: true, error: null }));
    fetch("/api/portfolios/reference-data")
      .then((response) => {
        if (!response.ok) throw new Error(`Status ${response.status}`);
        return response.json() as Promise<ReferenceData>;
      })
      .then((data) => {
        if (cancelled) return;
        setState({ data, error: null, loading: false });
      })
      .catch((cause: unknown) => {
        if (cancelled) return;
        setState({
          data: null,
          error: cause instanceof Error ? cause.message : "Failed to load reference data",
          loading: false,
        });
      });
    return () => {
      cancelled = true;
    };
  }, [enabled, state.data, state.loading]);

  return state;
}
