"use client";

import React, { useEffect, useState } from "react";
import { Typography, TypographyProps, styled } from "@mui/material";
import { isServer } from "../utils/environment";

// Props du composant Highlight
interface HighlightProps extends Omit<TypographyProps, "variant"> {
  variant?: "h1" | "h2" | "h3" | "h4" | "h5" | "h6" | "highlightTitle";
  highlightColor?: string;
  highlightOpacity?: number;
  highlightHeight?: string;
  children: React.ReactNode;
}

// Composant styled pour le surlignage
const HighlightedText = styled(Typography, {
  shouldForwardProp: (prop) => {
    const excludedProps = [
      "highlightColor",
      "highlightOpacity",
      "highlightHeight",
    ];
    return excludedProps.indexOf(prop as string) === -1;
  },
})<{
  highlightColor?: string;
  highlightOpacity?: number;
  highlightHeight?: string;
}>(
  ({
    theme,
    highlightColor,
    highlightOpacity = 0.3,
    highlightHeight = "0.3em",
  }) => ({
    position: "relative",
    display: "inline-block",
    "&::after": {
      content: '""',
      position: "absolute",
      bottom: "0.2em",
      left: "0",
      right: "0",
      height: highlightHeight,
      backgroundColor: highlightColor || theme.palette.secondary.main,
      opacity: highlightOpacity,
      zIndex: -1,
      borderRadius: "2px",
      transition: "all 0.2s ease-in-out",
    },
    "&:hover::after": {
      opacity: Math.min(highlightOpacity + 0.1, 0.5),
      transform: "scaleY(1.1)",
    },
  })
);

/**
 * Composant Highlight pour créer des titres avec effet de surlignage
 *
 * @example
 * ```tsx
 * <Highlight variant="h1" highlightColor="#f1861f">
 *   Mon titre surligné
 * </Highlight>
 * ```
 */
export const Highlight: React.FC<HighlightProps> = ({
  variant = "highlightTitle",
  highlightColor,
  highlightOpacity = 0.3,
  highlightHeight = "0.3em",
  children,
  sx,
  ...props
}) => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    if (!canUseHooks) return;
    setMounted(true);
  }, []);

  // Si on est côté serveur ou qu'on ne peut pas utiliser les hooks
  if (isServer || !canUseHooks) {
    return (
      <Typography variant={variant} sx={sx} {...props}>
        {children}
      </Typography>
    );
  }

  // Si on n'est pas encore monté côté client
  if (!mounted) {
    return (
      <Typography variant={variant} sx={sx} {...props}>
        {children}
      </Typography>
    );
  }

  return (
    <HighlightedText
      variant={variant}
      highlightColor={highlightColor}
      highlightOpacity={highlightOpacity}
      highlightHeight={highlightHeight}
      sx={sx}
      {...props}
    >
      {children}
    </HighlightedText>
  );
};

// Variantes prédéfinies pour faciliter l'utilisation
export const HighlightH1: React.FC<Omit<HighlightProps, "variant">> = (
  props
) => <Highlight variant="h1" {...props} />;

export const HighlightH2: React.FC<Omit<HighlightProps, "variant">> = (
  props
) => <Highlight variant="h2" {...props} />;

export const HighlightH3: React.FC<Omit<HighlightProps, "variant">> = (
  props
) => <Highlight variant="h3" {...props} />;

export const HighlightTitle: React.FC<Omit<HighlightProps, "variant">> = (
  props
) => <Highlight variant="highlightTitle" {...props} />;

// Export par défaut
export default Highlight;
