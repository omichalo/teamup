"use client";

import { useEffect } from "react";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import Underline from "@tiptap/extension-underline";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Box } from "@mui/material";
import { SuggestionRichTextToolbar } from "@/components/app-suggestions/rich-text/SuggestionRichTextToolbar";
import { getSuggestionRichTextEditorSurfaceSx } from "@/components/app-suggestions/rich-text/SuggestionRichTextContent";
import { uploadSuggestionImageFile } from "@/components/app-suggestions/rich-text/upload-suggestion-image";
import { useSuggestionEditorImageCleanup } from "@/components/app-suggestions/rich-text/use-suggestion-editor-image-cleanup";

type SuggestionRichTextEditorInnerProps = {
  value: string;
  onChange: (html: string) => void;
  disabled?: boolean;
  placeholder?: string;
  minHeight?: number;
  onImageUploaded?: (url: string) => void;
};

export function SuggestionRichTextEditorInner({
  value,
  onChange,
  disabled = false,
  placeholder = "Décrivez librement votre idée : contexte, besoin, exemples, captures…",
  minHeight = 220,
  onImageUploaded,
}: SuggestionRichTextEditorInnerProps) {
  const { handleChange, syncHtml } = useSuggestionEditorImageCleanup(onChange);

  const editor = useEditor({
    immediatelyRender: false,
    editable: !disabled,
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
      }),
      Underline,
      Link.configure({
        openOnClick: false,
        autolink: true,
        defaultProtocol: "https",
      }),
      Image.configure({
        inline: false,
        allowBase64: false,
      }),
      Placeholder.configure({ placeholder }),
    ],
    content: value,
    onUpdate: ({ editor: currentEditor }) => {
      handleChange(currentEditor.getHTML());
    },
  });

  useEffect(() => {
    syncHtml(value);
  }, [syncHtml, value]);

  useEffect(() => {
    if (!editor) {
      return;
    }
    const currentHtml = editor.getHTML();
    if (value !== currentHtml) {
      editor.commands.setContent(value, { emitUpdate: false });
      syncHtml(value);
    }
  }, [editor, syncHtml, value]);

  useEffect(() => {
    if (!editor) {
      return;
    }
    editor.setEditable(!disabled);
  }, [disabled, editor]);

  return (
    <Box sx={getSuggestionRichTextEditorSurfaceSx(minHeight)}>
      <SuggestionRichTextToolbar
        editor={editor}
        onUploadImage={async (file) => {
          const url = await uploadSuggestionImageFile(file);
          onImageUploaded?.(url);
          return url;
        }}
        disabled={disabled}
      />
      <EditorContent editor={editor} />
    </Box>
  );
}
