"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ManagedListMedicalCertificateFilter } from "@/lib/club-registration/medical-certificate";
import type { ManagedListAidReceiptFilter } from "@/lib/club-registration/payment/aid-receipt";
import type { ManagedListPpsFollowUpFilter } from "@/lib/club-registration/pps-follow-up";
import type { ManagedListUrlState } from "@/lib/club-registration/managed-list-url-state";
import type { ManagedListStatusFilter } from "@/lib/club-registration/registration-status";
import type { RegistrationSummary } from "./types";

export type ManagedRegistrationsPageInfo = {
  hasNextPage: boolean;
  nextCursor: string | null;
  searchMode: boolean;
  totalMatched: number | null;
};

type ManagedRegistrationsResponse = {
  registrations?: RegistrationSummary[];
  pageInfo?: ManagedRegistrationsPageInfo;
  error?: string;
};

function buildManagedRegistrationsUrl(params: {
  statusFilter: ManagedListStatusFilter;
  medicalCertificateFilter: ManagedListMedicalCertificateFilter;
  ppsFollowUpFilter: ManagedListPpsFollowUpFilter;
  aidReceiptFilter: ManagedListAidReceiptFilter;
  searchQuery: string;
  cursor?: string | null | undefined;
}): string {
  const url = new URL("/api/club/registrations", window.location.origin);
  url.searchParams.set("scope", "managed");
  url.searchParams.set("status", params.statusFilter);
  if (params.medicalCertificateFilter !== "all") {
    url.searchParams.set("medicalCertificate", params.medicalCertificateFilter);
  }
  if (params.ppsFollowUpFilter !== "all") {
    url.searchParams.set("ppsFollowUp", params.ppsFollowUpFilter);
  }
  if (params.aidReceiptFilter !== "all") {
    url.searchParams.set("aidReceipt", params.aidReceiptFilter);
  }
  if (params.searchQuery.trim().length >= 2) {
    url.searchParams.set("q", params.searchQuery.trim());
  }
  if (params.cursor != null && params.cursor.length > 0) {
    url.searchParams.set("cursor", params.cursor);
  }
  return url.pathname + url.search;
}

type InitialState = Pick<
  ManagedListUrlState,
  "statusFilter" | "medicalCertificateFilter" | "ppsFollowUpFilter" | "aidReceiptFilter"
>;

export function useManagedRegistrations(initial?: InitialState) {
  const [statusFilter, setStatusFilter] = useState<ManagedListStatusFilter>(
    initial?.statusFilter ?? "actionable"
  );
  const [medicalCertificateFilter, setMedicalCertificateFilter] =
    useState<ManagedListMedicalCertificateFilter>(
      initial?.medicalCertificateFilter ?? "all"
    );
  const [ppsFollowUpFilter, setPpsFollowUpFilter] =
    useState<ManagedListPpsFollowUpFilter>(initial?.ppsFollowUpFilter ?? "all");
  const [aidReceiptFilter, setAidReceiptFilter] = useState<ManagedListAidReceiptFilter>(
    initial?.aidReceiptFilter ?? "all"
  );
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [registrations, setRegistrations] = useState<RegistrationSummary[]>([]);
  const [pageInfo, setPageInfo] = useState<ManagedRegistrationsPageInfo>({
    hasNextPage: false,
    nextCursor: null,
    searchMode: false,
    totalMatched: null,
  });
  const [loadingList, setLoadingList] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestIdRef = useRef(0);
  const hasLoadedOnceRef = useRef(false);

  useEffect(() => {
    const handle = window.setTimeout(() => {
      setSearchQuery(searchInput.trim());
    }, 300);
    return () => window.clearTimeout(handle);
  }, [searchInput]);

  const fetchPage = useCallback(
    async (options: {
      append: boolean;
      cursor?: string | null;
      status: ManagedListStatusFilter;
      medical: ManagedListMedicalCertificateFilter;
      pps: ManagedListPpsFollowUpFilter;
      aidReceipt: ManagedListAidReceiptFilter;
      query: string;
    }) => {
      const requestId = ++requestIdRef.current;
      if (options.append) {
        setLoadingMore(true);
      } else if (!hasLoadedOnceRef.current) {
        setLoadingList(true);
      }
      setError(null);

      try {
        const res = await fetch(
          buildManagedRegistrationsUrl({
            statusFilter: options.status,
            medicalCertificateFilter: options.medical,
            ppsFollowUpFilter: options.pps,
            aidReceiptFilter: options.aidReceipt,
            searchQuery: options.query,
            cursor: options.cursor,
          }),
          { credentials: "include" }
        );
        const json = (await res.json()) as ManagedRegistrationsResponse;
        if (requestId !== requestIdRef.current) {
          return null;
        }
        if (!res.ok || json.error) {
          throw new Error(json.error || "Impossible de charger les demandes.");
        }

        const nextRegistrations = json.registrations ?? [];
        setRegistrations((current) =>
          options.append ? [...current, ...nextRegistrations] : nextRegistrations
        );
        setPageInfo(
          json.pageInfo ?? {
            hasNextPage: false,
            nextCursor: null,
            searchMode: false,
            totalMatched: null,
          }
        );
        hasLoadedOnceRef.current = true;
        return nextRegistrations;
      } catch (err) {
        if (requestId === requestIdRef.current) {
          setError(err instanceof Error ? err.message : "Erreur de chargement.");
          if (!options.append) {
            setRegistrations([]);
          }
        }
        return null;
      } finally {
        if (requestId === requestIdRef.current) {
          setLoadingList(false);
          setLoadingMore(false);
        }
      }
    },
    []
  );

  const reload = useCallback(async () => {
    return fetchPage({
      append: false,
      status: statusFilter,
      medical: medicalCertificateFilter,
      pps: ppsFollowUpFilter,
      aidReceipt: aidReceiptFilter,
      query: searchQuery,
    });
  }, [aidReceiptFilter, fetchPage, medicalCertificateFilter, ppsFollowUpFilter, searchQuery, statusFilter]);

  useEffect(() => {
    void fetchPage({
      append: false,
      status: statusFilter,
      medical: medicalCertificateFilter,
      pps: ppsFollowUpFilter,
      aidReceipt: aidReceiptFilter,
      query: searchQuery,
    });
  }, [aidReceiptFilter, fetchPage, medicalCertificateFilter, ppsFollowUpFilter, searchQuery, statusFilter]);

  const loadMore = useCallback(async () => {
    if (!pageInfo.hasNextPage || !pageInfo.nextCursor || loadingMore || loadingList) {
      return;
    }
    await fetchPage({
      append: true,
      cursor: pageInfo.nextCursor,
      status: statusFilter,
      medical: medicalCertificateFilter,
      pps: ppsFollowUpFilter,
      aidReceipt: aidReceiptFilter,
      query: searchQuery,
    });
  }, [
    aidReceiptFilter,
    fetchPage,
    loadingList,
    loadingMore,
    medicalCertificateFilter,
    pageInfo.hasNextPage,
    pageInfo.nextCursor,
    ppsFollowUpFilter,
    searchQuery,
    statusFilter,
  ]);

  const patchRegistration = useCallback(
    (id: string, patch: Partial<RegistrationSummary>) => {
      setRegistrations((current) =>
        current.map((registration) =>
          registration.id === id ? { ...registration, ...patch } : registration
        )
      );
    },
    []
  );

  return {
    statusFilter,
    setStatusFilter,
    medicalCertificateFilter,
    setMedicalCertificateFilter,
    ppsFollowUpFilter,
    setPpsFollowUpFilter,
    aidReceiptFilter,
    setAidReceiptFilter,
    searchInput,
    setSearchInput,
    searchQuery,
    registrations,
    pageInfo,
    loadingList,
    loadingMore,
    error,
    setError,
    reload,
    loadMore,
    patchRegistration,
  };
}
