"use client";

import { useCallback, useEffect, useRef, useState, type FocusEvent } from "react";
import {
  centsToEurosInput,
  eurosInputToCents,
  sanitizeEurosMonetaryInput,
} from "./payment-draft-helpers";

type Options = {
  amountCents: number | undefined;
  /** Si vrai, 0 € ou vide s'affiche comme champ vide (montants facultatifs). */
  allowEmpty?: boolean;
  selectAllOnFocus?: boolean;
  onTextChange?: (text: string) => void;
};

function centsToDisplayText(amountCents: number | undefined, allowEmpty: boolean): string {
  if (amountCents === undefined || (allowEmpty && amountCents <= 0)) {
    return "";
  }
  return centsToEurosInput(amountCents);
}

export function useEuroMonetaryTextInput({
  amountCents,
  allowEmpty = false,
  selectAllOnFocus = true,
  onTextChange,
}: Options) {
  const [text, setText] = useState(() => centsToDisplayText(amountCents, allowEmpty));
  const isEditingRef = useRef(false);

  useEffect(() => {
    if (!isEditingRef.current) {
      setText(centsToDisplayText(amountCents, allowEmpty));
    }
  }, [amountCents, allowEmpty]);

  const handleFocus = useCallback(
    (event: FocusEvent<HTMLInputElement>) => {
      isEditingRef.current = true;
      if (selectAllOnFocus) {
        event.target.select();
      }
    },
    [selectAllOnFocus]
  );

  const handleChange = useCallback(
    (raw: string) => {
      const next = sanitizeEurosMonetaryInput(raw);
      setText(next);
      onTextChange?.(next);
    },
    [onTextChange]
  );

  const commitText = useCallback(
    (onCommitCents: (cents: number) => void, minCentsOnBlur?: number) => {
      isEditingRef.current = false;
      let cents = eurosInputToCents(text);
      if (minCentsOnBlur != null && cents > 0 && cents < minCentsOnBlur) {
        cents = minCentsOnBlur;
      }
      onCommitCents(cents);
      setText(centsToDisplayText(cents > 0 ? cents : allowEmpty ? undefined : 0, allowEmpty));
    },
    [allowEmpty, text]
  );

  const handleBlur = useCallback(
    (onCommitCents: (cents: number) => void, minCentsOnBlur?: number) => {
      commitText(onCommitCents, minCentsOnBlur);
    },
    [commitText]
  );

  return {
    text,
    handleFocus,
    handleChange,
    handleBlur,
    commitText,
    parseDraftCents: () => eurosInputToCents(text),
  };
}
