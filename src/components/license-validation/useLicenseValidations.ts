"use client";

import { useCallback, useEffect, useState } from "react";
import type {
  LicenseValidationListFilter,
} from "@/lib/license-validation/license-validation-status";
import { matchesLicenseStatusFilter } from "@/lib/license-validation/license-validation-status";
import type { LicenseValidationPaymentListFilter } from "@/lib/license-validation/payment-status-filter";
import { matchesPaymentStatusFilter } from "@/lib/license-validation/payment-status-filter";
import type { LicenseValidationListItem } from "@/lib/license-validation/map-registration";
import { registrationMatchesLicenseValidationSearch } from "@/lib/license-validation/search-registrations";

type PageInfo = {
  hasNextPage: boolean;
  nextCursor: string | null;
};

function toListItem(item: LicenseValidationListItem): LicenseValidationListItem {
  return {
    id: item.id,
    firstName: item.firstName,
    lastName: item.lastName,
    adherentEmail: item.adherentEmail,
    birthDate: item.birthDate,
    ffttLicense: item.ffttLicense,
    licenseValidationStatus: item.licenseValidationStatus,
    wantsCompetitorExtras: item.wantsCompetitorExtras,
    paymentStatus: item.paymentStatus,
    status: item.status,
    submittedAt: item.submittedAt,
  };
}

export function useLicenseValidations(initialStatus: LicenseValidationListFilter = "all") {
  const [statusFilter, setStatusFilter] =
    useState<LicenseValidationListFilter>(initialStatus);
  const [paymentStatusFilter, setPaymentStatusFilter] =
    useState<LicenseValidationPaymentListFilter>("paid");
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
      if (paymentStatusFilter !== "all") {
        params.set("paymentStatus", paymentStatusFilter);
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
    [paymentStatusFilter, searchInput, statusFilter]
  );

  const reload = useCallback(async (options?: { silent?: boolean }) => {
    const silent = Boolean(options?.silent);
    if (!silent) {
      setLoadingList(true);
    }
    setError(null);
    try {
      await fetchPage();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inconnue");
    } finally {
      if (!silent) {
        setLoadingList(false);
      }
    }
  }, [fetchPage]);

  const applyRegistrationUpdate = useCallback(
    (item: LicenseValidationListItem) => {
      const listItem = toListItem(item);
      const keep =
        matchesLicenseStatusFilter(listItem, statusFilter) &&
        matchesPaymentStatusFilter(listItem.paymentStatus, paymentStatusFilter) &&
        registrationMatchesLicenseValidationSearch(listItem, searchInput);

      setRegistrations((current) => {
        const index = current.findIndex((row) => row.id === listItem.id);
        if (!keep) {
          return index === -1 ? current : current.filter((row) => row.id !== listItem.id);
        }
        if (index === -1) {
          return current;
        }
        const next = [...current];
        next[index] = listItem;
        return next;
      });
    },
    [paymentStatusFilter, searchInput, statusFilter]
  );

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
    paymentStatusFilter,
    setPaymentStatusFilter,
    searchInput,
    setSearchInput,
    registrations,
    pageInfo,
    loadingList,
    loadingMore,
    error,
    reload,
    applyRegistrationUpdate,
    loadMore,
  };
}
