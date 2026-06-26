"use client";

import { Box } from "@mui/material";
import type { SuggestionRichTextFormat } from "@/lib/app-suggestions/rich-text";

const richTextContentSx = {
  "& p": { margin: 0, mb: 1.5 },
  "& p:last-child": { mb: 0 },
  "& ul, & ol": { pl: 3, my: 1.5 },
  "& img": {
    maxWidth: "100%",
    height: "auto",
    borderRadius: 1,
    my: 1,
  },
  "& a": {
    color: "primary.main",
    textDecoration: "underline",
  },
  "& blockquote": {
    borderLeft: "3px solid",
    borderColor: "divider",
    pl: 2,
    my: 1.5,
    color: "text.secondary",
  },
  "& h2, & h3": {
    mt: 1,
    mb: 1,
    fontWeight: 600,
  },
};

type SuggestionRichTextContentProps = {
  html: string;
  format: SuggestionRichTextFormat;
};

export function SuggestionRichTextContent({
  html,
  format,
}: SuggestionRichTextContentProps) {
  if (format !== "html") {
    return (
      <Box component="div" sx={{ whiteSpace: "pre-wrap" }}>
        {html}
      </Box>
    );
  }

  if (!html.trim()) {
    return null;
  }

  return (
    <Box
      component="div"
      sx={richTextContentSx}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

export function getSuggestionRichTextEditorSurfaceSx(minHeight = 220) {
  return {
    border: 1,
    borderColor: "divider",
    borderRadius: 1,
    bgcolor: "background.paper",
    "& .ProseMirror": {
      minHeight,
      outline: "none",
      px: 1.5,
      py: 1.25,
      ...richTextContentSx,
    },
    "& .ProseMirror p.is-editor-empty:first-of-type::before": {
      color: "text.disabled",
      content: "attr(data-placeholder)",
      float: "left",
      height: 0,
      pointerEvents: "none",
    },
  };
}
