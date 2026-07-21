"use client";

import { useCallback, useEffect, useState } from "react";
import type { LicenseValidationListFilter } from "@/lib/license-validation/license-validation-status";
import type { LicenseValidationListItem } from "@/lib/license-validation/map-registration";

type PageInfo = {
  hasNextPage: boolean;
  nextCursor: string | null;
};

export function useLicenseValidations(initialStatus: LicenseValidationListFilter = "all") {
  const [statusFilter, setStatusFilter] =
    useState<LicenseValidationListFilter>(initialStatus);
  const [searchInput, setSearchInput] = useState("");
  const [registrations, setRegistrations] = useState<LicenseValidationListItem[]>([]);
  const [pageInfo, setPageInfo] = useState<PageInfo>({
    hasNextPage: false,
    nextCursor: null,
  });
  const [loadingList, setLoadingList] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPage = useCallback(
    async (options?: { cursor?: string | null; append?: boolean }) => {
      const params = new URLSearchParams();
      if (statusFilter !== "all") {
        params.set("status", statusFilter);
      }
      if (searchInput.trim().length >= 2) {
        params.set("q", searchInput.trim());
      }
      if (options?.cursor) {
        params.set("cursor", options.cursor);
      }

      const res = await fetch(`/api/club/license-validations?${params.toString()}`, {
        credentials: "include",
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(json.error || "Impossible de charger les dossiers");
      }

      const nextItems = (json.registrations ?? []) as LicenseValidationListItem[];
      setRegistrations((current) =>
        options?.append ? [...current, ...nextItems] : nextItems
      );
      setPageInfo({
        hasNextPage: Boolean(json.hasNextPage),
        nextCursor: typeof json.nextCursor === "string" ? json.nextCursor : null,
      });
    },
    [searchInput, statusFilter]
  );

  const reload = useCallback(async () => {
    setLoadingList(true);
    setError(null);
    try {
      await fetchPage();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inconnue");
    } finally {
      setLoadingList(false);
    }
  }, [fetchPage]);

  const loadMore = useCallback(async () => {
    if (!pageInfo.hasNextPage || !pageInfo.nextCursor) {
      return;
    }
    setLoadingMore(true);
    setError(null);
    try {
      await fetchPage({ cursor: pageInfo.nextCursor, append: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inconnue");
    } finally {
      setLoadingMore(false);
    }
  }, [fetchPage, pageInfo.hasNextPage, pageInfo.nextCursor]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return {
    statusFilter,
    setStatusFilter,
    searchInput,
    setSearchInput,
    registrations,
    pageInfo,
    loadingList,
    loadingMore,
    error,
    reload,
    loadMore,
  };
}
