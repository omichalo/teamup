"use client";

import { useEffect, useMemo, useRef } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  buildSpreadsheetPathWithParams,
  parseSpreadsheetUrlState,
} from "@/lib/club-registration/spreadsheet/spreadsheet-url-state";
import type { SpreadsheetSavedViewId } from "@/lib/club-registration/spreadsheet/quick-filters";
import type { SpreadsheetSort } from "@/lib/club-registration/spreadsheet/row-processing";

type SyncInput = {
  viewId: SpreadsheetSavedViewId | null;
  searchQuery: string;
  sort: SpreadsheetSort;
  openRegistrationId: string | null;
};

export function useSpreadsheetUrlSync() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const hydratedRef = useRef(false);

  const initial = useMemo(() => parseSpreadsheetUrlState(searchParams), [searchParams]);

  const syncToUrl = (input: SyncInput) => {
    if (!hydratedRef.current) {
      return;
    }
    const nextPath = buildSpreadsheetPathWithParams({
      viewId: input.viewId,
      searchQuery: input.searchQuery,
      sort: input.sort,
      openRegistrationId: input.openRegistrationId,
    });
    const currentPath =
      pathname +
      (searchParams.toString() ? `?${searchParams.toString()}` : "");
    if (nextPath !== currentPath) {
      router.replace(nextPath, { scroll: false });
    }
  };

  useEffect(() => {
    hydratedRef.current = true;
  }, []);

  return { initial, syncToUrl };
}
