"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ManagedListMedicalCertificateFilter } from "@/lib/club-registration/medical-certificate";
import type { ManagedListAidReceiptFilter } from "@/lib/club-registration/payment/aid-receipt";
import type { ManagedListPaymentSupplementFilter } from "@/lib/club-registration/payment/supplement-managed-filter";
import type { ManagedListPpsFollowUpFilter } from "@/lib/club-registration/pps-follow-up";
import type { ManagedListCriteriumFederalFilter } from "@/lib/club-registration/criterium-federal-follow-up";
import type { ManagedListJerseyFollowUpFilter } from "@/lib/club-registration/jersey-follow-up";
import type { ManagedListRegistrationCertificateFollowUpFilter } from "@/lib/club-registration/registration-certificate-follow-up";
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
  criteriumFederalFilter: ManagedListCriteriumFederalFilter;
  jerseyFollowUpFilter: ManagedListJerseyFollowUpFilter;
  registrationCertificateFollowUpFilter: ManagedListRegistrationCertificateFollowUpFilter;
  aidReceiptFilter: ManagedListAidReceiptFilter;
  paymentSupplementFilter: ManagedListPaymentSupplementFilter;
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
  if (params.criteriumFederalFilter !== "all") {
    url.searchParams.set("criteriumFederal", params.criteriumFederalFilter);
  }
  if (params.jerseyFollowUpFilter !== "all") {
    url.searchParams.set("jerseyFollowUp", params.jerseyFollowUpFilter);
  }
  if (params.registrationCertificateFollowUpFilter !== "all") {
    url.searchParams.set("registrationCertificateFollowUp", params.registrationCertificateFollowUpFilter);
  }
  if (params.aidReceiptFilter !== "all") {
    url.searchParams.set("aidReceipt", params.aidReceiptFilter);
  }
  if (params.paymentSupplementFilter !== "all") {
    url.searchParams.set("paymentSupplement", params.paymentSupplementFilter);
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
  | "statusFilter"
  | "medicalCertificateFilter"
  | "ppsFollowUpFilter"
  | "criteriumFederalFilter"
  | "jerseyFollowUpFilter"
  | "registrationCertificateFollowUpFilter"
  | "aidReceiptFilter"
  | "paymentSupplementFilter"
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
  const [criteriumFederalFilter, setCriteriumFederalFilter] =
    useState<ManagedListCriteriumFederalFilter>(initial?.criteriumFederalFilter ?? "all");
  const [jerseyFollowUpFilter, setJerseyFollowUpFilter] =
    useState<ManagedListJerseyFollowUpFilter>(initial?.jerseyFollowUpFilter ?? "all");
  const [registrationCertificateFollowUpFilter, setRegistrationCertificateFollowUpFilter] =
    useState<ManagedListRegistrationCertificateFollowUpFilter>(
      initial?.registrationCertificateFollowUpFilter ?? "all"
    );
  const [aidReceiptFilter, setAidReceiptFilter] = useState<ManagedListAidReceiptFilter>(
    initial?.aidReceiptFilter ?? "all"
  );
  const [paymentSupplementFilter, setPaymentSupplementFilter] =
    useState<ManagedListPaymentSupplementFilter>(initial?.paymentSupplementFilter ?? "all");
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
      criterium: ManagedListCriteriumFederalFilter;
      jersey: ManagedListJerseyFollowUpFilter;
      attestation: ManagedListRegistrationCertificateFollowUpFilter;
      aidReceipt: ManagedListAidReceiptFilter;
      paymentSupplement: ManagedListPaymentSupplementFilter;
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
            criteriumFederalFilter: options.criterium,
            jerseyFollowUpFilter: options.jersey,
            registrationCertificateFollowUpFilter: options.attestation,
            aidReceiptFilter: options.aidReceipt,
            paymentSupplementFilter: options.paymentSupplement,
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
      criterium: criteriumFederalFilter,
      jersey: jerseyFollowUpFilter,
      attestation: registrationCertificateFollowUpFilter,
      aidReceipt: aidReceiptFilter,
      paymentSupplement: paymentSupplementFilter,
      query: searchQuery,
    });
  }, [
    aidReceiptFilter,
    criteriumFederalFilter,
    fetchPage,
    jerseyFollowUpFilter,
    paymentSupplementFilter,
    registrationCertificateFollowUpFilter,
    medicalCertificateFilter,
    ppsFollowUpFilter,
    searchQuery,
    statusFilter,
  ]);

  useEffect(() => {
    void fetchPage({
      append: false,
      status: statusFilter,
      medical: medicalCertificateFilter,
      pps: ppsFollowUpFilter,
      criterium: criteriumFederalFilter,
      jersey: jerseyFollowUpFilter,
      attestation: registrationCertificateFollowUpFilter,
      aidReceipt: aidReceiptFilter,
      paymentSupplement: paymentSupplementFilter,
      query: searchQuery,
    });
  }, [
    aidReceiptFilter,
    criteriumFederalFilter,
    fetchPage,
    jerseyFollowUpFilter,
    paymentSupplementFilter,
    registrationCertificateFollowUpFilter,
    medicalCertificateFilter,
    ppsFollowUpFilter,
    searchQuery,
    statusFilter,
  ]);

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
      criterium: criteriumFederalFilter,
      jersey: jerseyFollowUpFilter,
      attestation: registrationCertificateFollowUpFilter,
      aidReceipt: aidReceiptFilter,
      paymentSupplement: paymentSupplementFilter,
      query: searchQuery,
    });
  }, [
    aidReceiptFilter,
    fetchPage,
    jerseyFollowUpFilter,
    paymentSupplementFilter,
    registrationCertificateFollowUpFilter,
    loadingList,
    loadingMore,
    medicalCertificateFilter,
    pageInfo.hasNextPage,
    pageInfo.nextCursor,
    ppsFollowUpFilter,
    criteriumFederalFilter,
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
    criteriumFederalFilter,
    setCriteriumFederalFilter,
    jerseyFollowUpFilter,
    setJerseyFollowUpFilter,
    registrationCertificateFollowUpFilter,
    setRegistrationCertificateFollowUpFilter,
    aidReceiptFilter,
    setAidReceiptFilter,
    paymentSupplementFilter,
    setPaymentSupplementFilter,
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
