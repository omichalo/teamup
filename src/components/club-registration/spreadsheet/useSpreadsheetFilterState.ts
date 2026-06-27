"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { PaymentStatusId } from "@/lib/club-registration/payment-constants";
import type { RegistrationStatus } from "@/lib/club-registration/registration-status";
import type { RegistrationsSpreadsheetPreferences } from "@/lib/club-registration/spreadsheet/preferences";
import {
  EMPTY_SPREADSHEET_QUICK_FILTERS,
  getSpreadsheetSavedView,
  resolveActiveSavedViewId,
  type SpreadsheetQuickFilters,
  type SpreadsheetSavedViewId,
} from "@/lib/club-registration/spreadsheet/quick-filters";
import type { SpreadsheetColumnFilters } from "@/lib/club-registration/spreadsheet/row-processing";

type SavePreferences = (next: RegistrationsSpreadsheetPreferences) => Promise<void>;

function cloneQuickFilters(filters: SpreadsheetQuickFilters): SpreadsheetQuickFilters {
  return {
    registrationStatuses: [...filters.registrationStatuses],
    paymentStatuses: [...filters.paymentStatuses],
    medicalCertificateStatuses: [...filters.medicalCertificateStatuses],
  };
}

export function useSpreadsheetFilterState(
  preferences: RegistrationsSpreadsheetPreferences,
  savePreferences: SavePreferences,
  urlBootstrap?: {
    viewId?: SpreadsheetSavedViewId;
    searchQuery?: string;
  }
) {
  const [searchQuery, setSearchQuery] = useState("");
  const [columnFilters, setColumnFilters] = useState<SpreadsheetColumnFilters>({});
  const [showColumnFilters, setShowColumnFilters] = useState(false);
  const [quickFilters, setQuickFilters] = useState<SpreadsheetQuickFilters>(
    EMPTY_SPREADSHEET_QUICK_FILTERS
  );
  const [activeViewId, setActiveViewId] = useState<SpreadsheetSavedViewId | null>("all");
  const initializedRef = useRef(false);
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (initializedRef.current) {
      return;
    }
    const viewId = urlBootstrap?.viewId ?? preferences.activeViewId ?? "all";
    const view = getSpreadsheetSavedView(viewId);
    setQuickFilters(cloneQuickFilters(view.quickFilters));
    setActiveViewId(viewId);
    if (urlBootstrap?.searchQuery) {
      setSearchQuery(urlBootstrap.searchQuery);
    }
    initializedRef.current = true;
  }, [preferences.activeViewId, urlBootstrap?.searchQuery, urlBootstrap?.viewId]);

  const persistActiveView = useCallback(
    async (viewId: SpreadsheetSavedViewId | null) => {
      if ((preferences.activeViewId ?? null) === viewId) {
        return;
      }
      await savePreferences({
        ...preferences,
        activeViewId: viewId,
      });
    },
    [preferences, savePreferences]
  );

  const applySavedView = useCallback(
    async (viewId: SpreadsheetSavedViewId) => {
      const view = getSpreadsheetSavedView(viewId);
      setQuickFilters(cloneQuickFilters(view.quickFilters));
      setSearchQuery("");
      setColumnFilters({});
      setActiveViewId(viewId);
      await persistActiveView(viewId);
    },
    [persistActiveView]
  );

  const updateQuickFilters = useCallback(
    (updater: (current: SpreadsheetQuickFilters) => SpreadsheetQuickFilters) => {
      setQuickFilters((current) => {
        const next = updater(current);
        const resolvedViewId = resolveActiveSavedViewId(next);
        setActiveViewId(resolvedViewId);
        void persistActiveView(resolvedViewId);
        return next;
      });
    },
    [persistActiveView]
  );

  const toggleRegistrationStatusFilter = useCallback(
    (status: RegistrationStatus) => {
      updateQuickFilters((current) => {
        const selected = current.registrationStatuses.includes(status);
        return {
          ...current,
          registrationStatuses: selected
            ? current.registrationStatuses.filter((value) => value !== status)
            : [...current.registrationStatuses, status],
        };
      });
    },
    [updateQuickFilters]
  );

  const togglePaymentStatusFilter = useCallback(
    (status: PaymentStatusId) => {
      updateQuickFilters((current) => {
        const selected = current.paymentStatuses.includes(status);
        return {
          ...current,
          paymentStatuses: selected
            ? current.paymentStatuses.filter((value) => value !== status)
            : [...current.paymentStatuses, status],
        };
      });
    },
    [updateQuickFilters]
  );

  const clearAllFilters = useCallback(async () => {
    setSearchQuery("");
    setColumnFilters({});
    setQuickFilters(cloneQuickFilters(EMPTY_SPREADSHEET_QUICK_FILTERS));
    setActiveViewId("all");
    await persistActiveView("all");
  }, [persistActiveView]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "/" || event.metaKey || event.ctrlKey || event.altKey) {
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
      event.preventDefault();
      searchInputRef.current?.focus();
      searchInputRef.current?.select();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return {
    searchQuery,
    setSearchQuery,
    columnFilters,
    setColumnFilters,
    showColumnFilters,
    setShowColumnFilters,
    quickFilters,
    activeViewId,
    searchInputRef,
    applySavedView,
    toggleRegistrationStatusFilter,
    togglePaymentStatusFilter,
    clearAllFilters,
  };
}
