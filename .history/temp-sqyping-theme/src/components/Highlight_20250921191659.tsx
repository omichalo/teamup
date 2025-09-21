import React, { useState, useEffect } from "react";
import { Typography, TypographyProps } from "@mui/material";
import { isServer } from "../utils/environment";

interface HighlightProps extends Omit<TypographyProps, "variant"> {
  children: React.ReactNode;
  variant?: "h1" | "h2" | "h3" | "h4" | "h5" | "h6" | "body1" | "body2";
}

export const Highlight: React.FC<HighlightProps> = ({
  children,
  variant = "h1",
  sx,
  ...props
}) => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Si on est côté serveur
  if (isServer) {
    return (
      <Typography variant={variant} sx={sx} {...props}>
        {children}
      </Typography>
    );
  }

  // Si pas encore monté côté client
  if (!mounted) {
    return (
      <Typography variant={variant} sx={sx} {...props}>
        {children}
      </Typography>
    );
  }

  return (
    <Typography
      variant={variant}
      sx={{
        background: "linear-gradient(45deg, #f1861f 30%, #ff6b35 90%)",
        backgroundClip: "text",
        WebkitBackgroundClip: "text",
        WebkitTextFillColor: "transparent",
        fontWeight: 700,
        ...sx,
      }}
      {...props}
    >
      {children}
    </Typography>
  );
};

export const HighlightH1: React.FC<Omit<HighlightProps, "variant">> = (props) => (
  <Highlight variant="h1" {...props} />
);

export const HighlightH2: React.FC<Omit<HighlightProps, "variant">> = (props) => (
  <Highlight variant="h2" {...props} />
);

export const HighlightH3: React.FC<Omit<HighlightProps, "variant">> = (props) => (
  <Highlight variant="h3" {...props} />
);

export const HighlightTitle: React.FC<Omit<HighlightProps, "variant">> = (props) => (
  <Highlight variant="h4" {...props} />
);