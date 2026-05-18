"use client";

import { useEffect, useState } from "react";
import { Autocomplete, TextField, Typography } from "@mui/material";
import type { HTMLAttributes } from "react";
import type { BanFeature, ParsedBanAddress } from "@/lib/geocoding/ban";
import { banFeatureToParsedAddress } from "@/lib/geocoding/ban";
import { filterBanFeaturesByQuery } from "@/lib/geocoding/ban-query-filter";

type Props = {
  onAddressSelected: (a: { addressLine1: string; postalCode: string; city: string }) => void;
  /** Libellé visible du champ (accessibilité) */
  label?: string;
  placeholder?: string;
  /** Texte d’aide sous le champ (FormHelperText) */
  helperText?: string;
  disabled?: boolean;
};

const DEFAULT_LABEL = "Rechercher votre adresse";
const DEFAULT_PLACEHOLDER = "Ex. 12 rue Victor Hugo, Paris";

export function AddressBanSearch({
  onAddressSelected,
  label = DEFAULT_LABEL,
  placeholder = DEFAULT_PLACEHOLDER,
  helperText,
  disabled = false,
}: Props) {
  const [input, setInput] = useState("");
  const [debounced, setDebounced] = useState("");
  const [options, setOptions] = useState<ParsedBanAddress[]>([]);
  const [loading, setLoading] = useState(false);
  const [resetKey, setResetKey] = useState(0);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(input), 350);
    return () => clearTimeout(t);
  }, [input]);

  useEffect(() => {
    if (debounced.length < 3) {
      setOptions([]);
      setLoadError(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setLoadError(null);
    void (async () => {
      try {
        const res = await fetch(
          `/api/geocode/ban?q=${encodeURIComponent(debounced)}`,
          { credentials: "include" }
        );
        const data = (await res.json()) as { features?: BanFeature[]; error?: string };
        if (!res.ok) {
          if (!cancelled) {
            setOptions([]);
            setLoadError(data.error ?? "Recherche impossible");
          }
          return;
        }
        const raw = data.features ?? [];
        const features = filterBanFeaturesByQuery(debounced, raw);
        const parsed = features
          .map((f, i) => banFeatureToParsedAddress(f, i))
          .filter((x): x is ParsedBanAddress => x !== null)
          .map((p, rowIndex) => ({
            ...p,
            /* Clé liste React : garantit l’unicité même si la BAN renvoie le même libellé deux fois */
            optionId: `r${rowIndex}-${p.optionId}`,
          }));
        if (!cancelled) {
          setOptions(parsed);
        }
      } catch {
        if (!cancelled) {
          setOptions([]);
          setLoadError("Recherche impossible");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [debounced]);

  return (
    <div>
      <Autocomplete
        key={resetKey}
        disabled={disabled}
        options={options}
        getOptionLabel={(o) => o.label}
        getOptionKey={(option) => option.optionId}
        isOptionEqualToValue={(a, b) => a.optionId === b.optionId}
        renderOption={(props, option) => {
          const { key, ...rest } = props as HTMLAttributes<HTMLLIElement> & {
            key: string;
          };
          return (
            <li key={key} {...rest}>
              {option.label}
            </li>
          );
        }}
        filterOptions={(x) => x}
        inputValue={input}
        onInputChange={(_, value, reason) => {
          if (reason === "input" || reason === "clear") {
            setInput(value);
          }
        }}
        value={null}
        onChange={(_, v) => {
          if (v) {
            onAddressSelected({
              addressLine1: v.addressLine1,
              postalCode: v.postalCode,
              city: v.city,
            });
            setInput("");
            setResetKey((k) => k + 1);
          }
        }}
        loading={loading}
        noOptionsText={
          debounced.length < 3
            ? "Au moins 3 caractères"
            : loading
              ? "Recherche…"
              : "Aucun résultat"
        }
        renderInput={(params) => {
          const { size, InputLabelProps, inputProps, ...restParams } = params;
          return (
            <TextField
              {...restParams}
              inputProps={{
                ...inputProps,
                name: "clubRegistrationAddressSearch",
                autoComplete: "off",
              }}
              size={size ?? "medium"}
              label={label}
              placeholder={placeholder}
              helperText={helperText}
              // @ts-expect-error InputLabelProps types mismatch from Autocomplete
              InputLabelProps={InputLabelProps}
            />
          );
        }}
      />
      {loadError ? (
        <Typography variant="caption" color="error" sx={{ display: "block", mt: 0.5 }}>
          {loadError}
        </Typography>
      ) : null}
    </div>
  );
}
