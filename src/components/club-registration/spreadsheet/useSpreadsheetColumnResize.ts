"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { SpreadsheetColumnId } from "@/lib/club-registration/spreadsheet/column-ids";
import {
  getSpreadsheetColumnWidth,
  MAX_SPREADSHEET_COLUMN_WIDTH,
  MIN_SPREADSHEET_COLUMN_WIDTH,
  type SpreadsheetColumnWidths,
} from "@/lib/club-registration/spreadsheet/format-context";
import type { RegistrationsSpreadsheetPreferences } from "@/lib/club-registration/spreadsheet/preferences";

type ResizeSession = {
  columnId: SpreadsheetColumnId;
  startX: number;
  startWidth: number;
};

export function useSpreadsheetColumnResize(
  preferences: RegistrationsSpreadsheetPreferences,
  savePreferences: (next: RegistrationsSpreadsheetPreferences) => Promise<void>
) {
  const [columnWidths, setColumnWidths] = useState<SpreadsheetColumnWidths>(
    preferences.columnWidths ?? {}
  );
  const sessionRef = useRef<ResizeSession | null>(null);
  const preferencesRef = useRef(preferences);

  useEffect(() => {
    preferencesRef.current = preferences;
    setColumnWidths(preferences.columnWidths ?? {});
  }, [preferences]);

  const getColumnWidth = useCallback(
    (columnId: SpreadsheetColumnId) => getSpreadsheetColumnWidth(columnId, columnWidths),
    [columnWidths]
  );

  const startResize = useCallback(
    (columnId: SpreadsheetColumnId, clientX: number) => {
      sessionRef.current = {
        columnId,
        startX: clientX,
        startWidth: getSpreadsheetColumnWidth(columnId, columnWidths),
      };

      const handleMouseMove = (event: MouseEvent) => {
        const session = sessionRef.current;
        if (!session) return;
        const delta = event.clientX - session.startX;
        const nextWidth = Math.min(
          MAX_SPREADSHEET_COLUMN_WIDTH,
          Math.max(MIN_SPREADSHEET_COLUMN_WIDTH, session.startWidth + delta)
        );
        setColumnWidths((current) => ({
          ...current,
          [session.columnId]: nextWidth,
        }));
      };

      const handleMouseUp = () => {
        const session = sessionRef.current;
        sessionRef.current = null;
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
        document.body.style.cursor = "";
        document.body.style.userSelect = "";

        if (!session) return;

        setColumnWidths((current) => {
          const nextWidths = {
            ...current,
            [session.columnId]: getSpreadsheetColumnWidth(session.columnId, current),
          };
          void savePreferences({
            ...preferencesRef.current,
            columnWidths: nextWidths,
          });
          return nextWidths;
        });
      };

      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    },
    [columnWidths, savePreferences]
  );

  return { getColumnWidth, startResize };
}
