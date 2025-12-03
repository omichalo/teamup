"use client";

import React from "react";
import { TextField, TextFieldProps } from "@mui/material";

interface SearchInputProps extends Omit<TextFieldProps, "onChange"> {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export const SearchInput: React.FC<SearchInputProps> = ({
  value,
  onChange,
  placeholder = "Rechercher...",
  ...rest
}) => {
  return (
    <TextField
      fullWidth
      size="small"
      placeholder={placeholder}
      value={value}
      onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
        onChange(event.target.value)
      }
      {...rest}
    />
  );
};
