"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Autocomplete,
  createFilterOptions,
  TextField,
  type FilterOptionsState,
} from "@mui/material";
import { readJsonResponse } from "@/lib/http/read-json-response";
import {
  formatSuggestionCategoryLabel,
  isValidSuggestionCategory,
  listDefaultSuggestionCategoryOptions,
  normalizeSuggestionCategory,
  type SuggestionCategoryOption,
} from "@/lib/app-suggestions/categories";

type SuggestionCategoryFieldProps = {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  required?: boolean;
  autoFocus?: boolean;
};

type CategoryOption = SuggestionCategoryOption & {
  inputValue?: string;
};

const filter = createFilterOptions<CategoryOption>();

export function SuggestionCategoryField({
  value,
  onChange,
  disabled = false,
  required = false,
  autoFocus = false,
}: SuggestionCategoryFieldProps) {
  const [options, setOptions] = useState<CategoryOption[]>(
    listDefaultSuggestionCategoryOptions()
  );
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const loadCategories = async () => {
      setLoading(true);
      try {
        const response = await fetch("/api/club/suggestions/categories", {
          credentials: "include",
        });
        const payload = await readJsonResponse<{
          categories?: SuggestionCategoryOption[];
        }>(response);

        if (!response.ok || cancelled) {
          return;
        }

        setOptions(payload.categories ?? listDefaultSuggestionCategoryOptions());
      } catch {
        // Les catégories par défaut restent disponibles hors ligne.
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void loadCategories();

    return () => {
      cancelled = true;
    };
  }, []);

  const selectedValue = useMemo<CategoryOption | string | null>(() => {
    if (!value) {
      return null;
    }

    return (
      options.find((option) => option.value === value) ?? {
        value,
        label: formatSuggestionCategoryLabel(value),
      }
    );
  }, [options, value]);

  const handleFilterOptions = (
    categoryOptions: CategoryOption[],
    params: FilterOptionsState<CategoryOption>
  ) => {
    const filtered = filter(categoryOptions, params);
    const inputValue = params.inputValue.trim();

    if (
      inputValue.length >= 2 &&
      !categoryOptions.some(
        (option) =>
          option.label.localeCompare(inputValue, "fr", { sensitivity: "base" }) ===
            0 ||
          option.value.localeCompare(inputValue, "fr", { sensitivity: "base" }) ===
            0
      )
    ) {
      filtered.push({
        value: normalizeSuggestionCategory(inputValue),
        label: `Ajouter « ${inputValue} »`,
        inputValue,
      });
    }

    return filtered;
  };

  return (
    <Autocomplete
      freeSolo
      options={options}
      loading={loading}
      value={selectedValue}
      onChange={(_event, newValue) => {
        if (typeof newValue === "string") {
          const normalized = normalizeSuggestionCategory(newValue);
          onChange(isValidSuggestionCategory(normalized) ? normalized : "");
          return;
        }

        if (!newValue) {
          onChange("");
          return;
        }

        const normalized = normalizeSuggestionCategory(
          newValue.inputValue ?? newValue.value
        );
        onChange(isValidSuggestionCategory(normalized) ? normalized : "");
      }}
      getOptionLabel={(option) => {
        if (typeof option === "string") {
          return formatSuggestionCategoryLabel(option);
        }
        if (option.inputValue) {
          return option.inputValue;
        }
        return option.label;
      }}
      isOptionEqualToValue={(option, selected) => {
        const optionValue = typeof option === "string" ? option : option.value;
        const selectedValue =
          typeof selected === "string" ? selected : selected.value;
        return optionValue === selectedValue;
      }}
      filterOptions={handleFilterOptions}
      renderInput={(params) => {
        const { size, InputLabelProps, ...restParams } = params;
        return (
          <TextField
            {...restParams}
            size={size ?? "medium"}
            label="Catégorie"
            placeholder="Sélectionnez ou saisissez une catégorie"
            required={required}
            autoFocus={autoFocus}
            // @ts-expect-error InputLabelProps types mismatch from Autocomplete
            InputLabelProps={InputLabelProps}
          />
        );
      }}
      disabled={disabled}
    />
  );
}
