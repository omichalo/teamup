"use client";

import dynamic from "next/dynamic";
import { Skeleton } from "@mui/material";
import type { ComponentProps } from "react";

const EditorInner = dynamic(
  () =>
    import("@/components/app-suggestions/rich-text/SuggestionRichTextEditorInner").then(
      (module) => module.SuggestionRichTextEditorInner
    ),
  {
    ssr: false,
    loading: () => <Skeleton variant="rounded" height={280} />,
  }
);

export function SuggestionRichTextEditor(
  props: ComponentProps<typeof EditorInner>
) {
  return <EditorInner {...props} />;
}
