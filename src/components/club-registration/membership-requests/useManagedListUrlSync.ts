"use client";

import { useCallback, useEffect, useRef } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  buildManagedListPath,
  managedListUrlStatesEqual,
  parseManagedListUrlState,
  type ManagedListUrlState,
} from "@/lib/club-registration/managed-list-url-state";

export function useManagedListUrlSync() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const hydratedRef = useRef(false);
  const searchParamsRef = useRef(searchParams);
  const initialRef = useRef(parseManagedListUrlState(searchParams));

  searchParamsRef.current = searchParams;

  useEffect(() => {
    hydratedRef.current = true;
  }, []);

  const syncToUrl = useCallback(
    (input: ManagedListUrlState) => {
      if (!hydratedRef.current) {
        return;
      }

      const currentState = parseManagedListUrlState(searchParamsRef.current);
      if (managedListUrlStatesEqual(input, currentState)) {
        return;
      }

      router.replace(buildManagedListPath(pathname, input), { scroll: false });
    },
    [pathname, router]
  );

  return {
    initial: initialRef.current,
    syncToUrl,
  };
}
