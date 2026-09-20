"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@mui/material";
import ThumbUpAltOutlinedIcon from "@mui/icons-material/ThumbUpAltOutlined";
import ThumbUpAltIcon from "@mui/icons-material/ThumbUpAlt";

type Props = {
  suggestionId: string;
  kind: "improvement" | "problem";
  visibility: string;
  supportCount: number;
  disabled?: boolean;
  onCountChange?: (count: number) => void;
};

export function SuggestionSupportButton({
  suggestionId,
  kind,
  visibility,
  supportCount,
  disabled = false,
  onCountChange,
}: Props) {
  const [supported, setSupported] = useState(false);
  const [count, setCount] = useState(supportCount);
  const [busy, setBusy] = useState(false);

  const canSupport = kind === "improvement" && visibility === "public";

  useEffect(() => {
    setCount(supportCount);
  }, [supportCount]);

  useEffect(() => {
    if (!canSupport) {
      return;
    }
    let cancelled = false;
    const load = async () => {
      try {
        const response = await fetch(
          `/api/club/suggestions/${suggestionId}/supports`,
          { credentials: "include" }
        );
        if (!response.ok || cancelled) {
          return;
        }
        const payload = (await response.json()) as {
          supported?: boolean;
          supportCount?: number;
        };
        if (typeof payload.supported === "boolean") {
          setSupported(payload.supported);
        }
        if (typeof payload.supportCount === "number") {
          setCount(payload.supportCount);
        }
      } catch {
        // ignore
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [canSupport, suggestionId]);

  const toggle = useCallback(async () => {
    if (!canSupport || busy) {
      return;
    }
    setBusy(true);
    try {
      const response = await fetch(
        `/api/club/suggestions/${suggestionId}/supports`,
        {
          method: supported ? "DELETE" : "POST",
          credentials: "include",
        }
      );
      const payload = (await response.json().catch(() => ({}))) as {
        supported?: boolean;
        supportCount?: number;
        error?: string;
      };
      if (!response.ok) {
        return;
      }
      if (typeof payload.supported === "boolean") {
        setSupported(payload.supported);
      }
      if (typeof payload.supportCount === "number") {
        setCount(payload.supportCount);
        onCountChange?.(payload.supportCount);
      }
    } finally {
      setBusy(false);
    }
  }, [busy, canSupport, onCountChange, suggestionId, supported]);

  if (!canSupport) {
    return null;
  }

  return (
    <Button
      variant={supported ? "contained" : "outlined"}
      size="small"
      startIcon={supported ? <ThumbUpAltIcon /> : <ThumbUpAltOutlinedIcon />}
      onClick={() => void toggle()}
      disabled={disabled || busy}
    >
      Ça m&apos;intéresse ({count})
    </Button>
  );
}
