"use client";

import { useCallback, useRef, useState } from "react";
import { readJsonResponse } from "@/lib/http/read-json-response";
import type {
  AppSuggestionDetail,
  AppSuggestionSummary,
  SuggestionCategory,
  SuggestionDomain,
  SuggestionKind,
} from "@/lib/app-suggestions/types";

export type SuggestionsPageInfo = {
  hasNextPage: boolean;
  nextCursor: string | null;
};

type SuggestionsListResponse = {
  suggestions: AppSuggestionSummary[];
  pageInfo: SuggestionsPageInfo;
  viewer: { isMaintainer: boolean; isClubReferent?: boolean };
};

type SuggestionDetailResponse = {
  suggestion: AppSuggestionDetail;
  viewer: {
    isMaintainer: boolean;
    isClubReferent?: boolean;
    canEditContent: boolean;
    canTriage?: boolean;
    canModerate?: boolean;
    canSeeInternal?: boolean;
  };
};

export function useSuggestionsList() {
  const [suggestions, setSuggestions] = useState<AppSuggestionSummary[]>([]);
  const [pageInfo, setPageInfo] = useState<SuggestionsPageInfo>({
    hasNextPage: false,
    nextCursor: null,
  });
  const [isMaintainer, setIsMaintainer] = useState(false);
  const [isClubReferent, setIsClubReferent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("open");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [kindFilter, setKindFilter] = useState<string>("all");
  const [mineOnly, setMineOnly] = useState(false);
  const [waitingOnFilter, setWaitingOnFilter] = useState<"all" | "handlers">(
    "all"
  );
  const [lastRefreshedAt, setLastRefreshedAt] = useState<Date | null>(null);

  const loadSuggestions = useCallback(
    async (options?: { cursor?: string | null; append?: boolean }) => {
      setLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams();
        if (statusFilter !== "all") {
          params.set("status", statusFilter);
        }
        if (categoryFilter !== "all") {
          params.set("category", categoryFilter);
        }
        if (kindFilter !== "all") {
          params.set("kind", kindFilter);
        }
        if (mineOnly) {
          params.set("mine", "1");
        }
        if (waitingOnFilter !== "all") {
          params.set("waitingOn", waitingOnFilter);
        }
        if (options?.cursor) {
          params.set("cursor", options.cursor);
        }

        const response = await fetch(`/api/club/suggestions?${params.toString()}`, {
          credentials: "include",
        });
        const payload = await readJsonResponse<
          SuggestionsListResponse & { error?: string }
        >(response);

        if (!response.ok) {
          throw new Error(payload.error || "Impossible de charger les retours");
        }

        setSuggestions((current) =>
          options?.append
            ? [...current, ...payload.suggestions]
            : payload.suggestions
        );
        setPageInfo(payload.pageInfo);
        setIsMaintainer(payload.viewer.isMaintainer);
        setIsClubReferent(payload.viewer.isClubReferent === true);
        setLastRefreshedAt(new Date());
      } catch (loadError) {
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Impossible de charger les retours"
        );
      } finally {
        setLoading(false);
      }
    },
    [categoryFilter, kindFilter, mineOnly, statusFilter, waitingOnFilter]
  );

  return {
    suggestions,
    pageInfo,
    isMaintainer,
    isClubReferent,
    loading,
    error,
    statusFilter,
    setStatusFilter,
    categoryFilter,
    setCategoryFilter,
    kindFilter,
    setKindFilter,
    mineOnly,
    setMineOnly,
    waitingOnFilter,
    setWaitingOnFilter,
    lastRefreshedAt,
    loadSuggestions,
    setSuggestions,
  };
}

export function useSuggestionDetail() {
  const [detail, setDetail] = useState<AppSuggestionDetail | null>(null);
  const [viewer, setViewer] = useState({
    isMaintainer: false,
    isClubReferent: false,
    canEditContent: false,
    canTriage: false,
    canModerate: false,
    canSeeInternal: false,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const detailRequestRef = useRef(0);

  const loadDetail = useCallback(async (id: string, options?: { silent?: boolean }) => {
    const requestSeq = ++detailRequestRef.current;

    if (!options?.silent) {
      setLoading(true);
      setDetail(null);
    }
    setError(null);

    try {
      const response = await fetch(`/api/club/suggestions/${id}`, {
        credentials: "include",
      });
      const payload = await readJsonResponse<
        SuggestionDetailResponse & { error?: string }
      >(response);

      if (requestSeq !== detailRequestRef.current) {
        return;
      }

      if (!response.ok) {
        throw new Error(payload.error || "Impossible de charger l'idée");
      }

      setDetail(payload.suggestion);
      setViewer({
        isMaintainer: payload.viewer.isMaintainer,
        isClubReferent: payload.viewer.isClubReferent === true,
        canEditContent: payload.viewer.canEditContent,
        canTriage: payload.viewer.canTriage === true,
        canModerate: payload.viewer.canModerate === true,
        canSeeInternal: payload.viewer.canSeeInternal === true,
      });
    } catch (loadError) {
      if (requestSeq !== detailRequestRef.current) {
        return;
      }
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Impossible de charger l'idée"
      );
      if (!options?.silent) {
        setDetail(null);
      }
    } finally {
      if (requestSeq === detailRequestRef.current && !options?.silent) {
        setLoading(false);
      }
    }
  }, []);

  const createSuggestion = useCallback(
    async (input: {
      title: string;
      description: string;
      kind: SuggestionKind;
      domain: SuggestionDomain;
      category: SuggestionCategory;
    }) => {
      const response = await fetch("/api/club/suggestions", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      const payload = await readJsonResponse<{ id?: string; error?: string }>(
        response
      );

      if (!response.ok) {
        throw new Error(payload.error || "Impossible de créer l'idée");
      }

      return payload.id as string;
    },
    []
  );

  const addComment = useCallback(async (id: string, body: string) => {
    const response = await fetch(`/api/club/suggestions/${id}/comments`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body }),
    });
    const payload = await readJsonResponse<
      SuggestionDetailResponse & { error?: string }
    >(response);

    if (!response.ok) {
      throw new Error(payload.error || "Impossible d'ajouter le commentaire");
    }

    setDetail(payload.suggestion);
    return payload.suggestion;
  }, []);

  const patchAuthor = useCallback(
    async (
      id: string,
      patch: Partial<{
        title: string;
        description: string;
        category: SuggestionCategory;
      }>
    ) => {
      const response = await fetch(`/api/club/suggestions/${id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      const payload = await readJsonResponse<
        SuggestionDetailResponse & { error?: string }
      >(response);

      if (!response.ok) {
        throw new Error(payload.error || "Impossible de mettre à jour l'idée");
      }

      setDetail(payload.suggestion);
      return payload.suggestion;
    },
    []
  );

  const patchMaintainer = useCallback(
    async (
      id: string,
      patch: Partial<{
        status: AppSuggestionDetail["status"];
        priority: AppSuggestionDetail["priority"];
        waitingOn: AppSuggestionDetail["waitingOn"];
        maintainerNote: string | null;
        githubIssueUrl: string | null;
      }>
    ) => {
      const response = await fetch(`/api/club/suggestions/${id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scope: "maintainer", ...patch }),
      });
      const payload = await readJsonResponse<
        SuggestionDetailResponse & { error?: string }
      >(response);

      if (!response.ok) {
        throw new Error(payload.error || "Impossible de mettre à jour le triage");
      }

      setDetail(payload.suggestion);
      return payload.suggestion;
    },
    []
  );

  return {
    detail,
    viewer,
    loading,
    error,
    loadDetail,
    createSuggestion,
    addComment,
    patchAuthor,
    patchMaintainer,
    setDetail,
  };
}
