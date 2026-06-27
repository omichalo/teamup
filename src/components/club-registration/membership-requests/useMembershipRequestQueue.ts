"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ManagedListStatusFilter } from "@/lib/club-registration/registration-status";
import { MANAGED_LIST_STATUS_FILTER_OPTIONS } from "@/lib/club-registration/registration-status";
import {
  getQueueMetrics,
  pickAdjacentRegistrationId,
  resolveSelectionAfterQueueReload,
  type QueueAdvanceMode,
  type QueueReloadResult,
} from "./queue-navigation";
import type { RegistrationSummary } from "./types";

type ReloadFn = () => Promise<RegistrationSummary[] | null>;

export function useMembershipRequestQueue(
  registrations: RegistrationSummary[],
  selectedId: string | null,
  setSelectedId: (id: string | null) => void,
  reload: ReloadFn,
  statusFilter: ManagedListStatusFilter
) {
  const [sessionProcessedIds, setSessionProcessedIds] = useState<Set<string>>(() => new Set());
  const [sessionViewedIds, setSessionViewedIds] = useState<Set<string>>(() => new Set());
  const [queueJustCompleted, setQueueJustCompleted] = useState(false);
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  const { position, total, remaining, selectedIndex } = useMemo(
    () => getQueueMetrics(registrations, selectedId),
    [registrations, selectedId]
  );

  const filterLabel = useMemo(() => {
    return (
      MANAGED_LIST_STATUS_FILTER_OPTIONS.find((option) => option.value === statusFilter)?.label ??
      "File courante"
    );
  }, [statusFilter]);

  useEffect(() => {
    if (registrations.length > 0) {
      setQueueJustCompleted(false);
    }
  }, [registrations.length]);

  useEffect(() => {
    if (!selectedId) {
      return;
    }
    setSessionViewedIds((current) => {
      if (current.has(selectedId)) {
        return current;
      }
      const next = new Set(current);
      next.add(selectedId);
      return next;
    });
  }, [selectedId]);

  const goToPrevious = useCallback(() => {
    const nextId = pickAdjacentRegistrationId(selectedId, registrations, "previous");
    if (nextId && nextId !== selectedId) {
      setSelectedId(nextId);
      setQueueJustCompleted(false);
    }
  }, [registrations, selectedId, setSelectedId]);

  const goToNext = useCallback(() => {
    const nextId = pickAdjacentRegistrationId(selectedId, registrations, "next");
    if (nextId && nextId !== selectedId) {
      setSelectedId(nextId);
      setQueueJustCompleted(false);
    }
  }, [registrations, selectedId, setSelectedId]);

  const handleListReload = useCallback(
    async (options?: { advance?: QueueAdvanceMode }): Promise<QueueReloadResult> => {
      const mode = options?.advance ?? "never";
      const previousId = selectedId;
      const previousIndex = selectedIndex >= 0 ? selectedIndex : 0;
      const nextList = (await reload()) ?? [];

      if (!previousId) {
        const nextId = nextList[0]?.id ?? null;
        setSelectedId(nextId);
        setQueueJustCompleted(false);
        return { nextId, advanced: false };
      }

      const nextId = resolveSelectionAfterQueueReload(
        previousId,
        previousIndex,
        nextList,
        mode
      );
      const advanced = nextId !== previousId;

      if (mode !== "never" && advanced) {
        setSessionProcessedIds((current) => {
          const next = new Set(current);
          next.add(previousId);
          return next;
        });
      }

      setSelectedId(nextId);
      setQueueJustCompleted(mode !== "never" && advanced && nextId === null);

      return { nextId, advanced };
    },
    [reload, selectedId, selectedIndex, setSelectedId]
  );

  const canGoPrevious =
    selectedIndex > 0 && pickAdjacentRegistrationId(selectedId, registrations, "previous") !== selectedId;
  const canGoNext =
    selectedIndex >= 0 &&
    selectedIndex < registrations.length - 1 &&
    pickAdjacentRegistrationId(selectedId, registrations, "next") !== selectedId;

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) {
        return;
      }

      const target = event.target;
      if (
        target instanceof HTMLElement &&
        (target.isContentEditable ||
          target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT")
      ) {
        return;
      }

      if (event.key === "/") {
        event.preventDefault();
        searchInputRef.current?.focus();
        searchInputRef.current?.select();
        return;
      }

      if (event.key === "j" || event.key === "J" || event.key === "ArrowDown") {
        event.preventDefault();
        goToNext();
        return;
      }

      if (event.key === "k" || event.key === "K" || event.key === "ArrowUp") {
        event.preventDefault();
        goToPrevious();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [goToNext, goToPrevious]);

  return {
    position,
    total,
    remaining,
    filterLabel,
    canGoPrevious,
    canGoNext,
    sessionProcessedCount: sessionProcessedIds.size,
    sessionViewedIds,
    queueJustCompleted,
    searchInputRef,
    goToPrevious,
    goToNext,
    handleListReload,
  };
}

export type { QueueAdvanceMode, QueueReloadResult };
