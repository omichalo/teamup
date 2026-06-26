"use client";

import type { ReactNode } from "react";
import type { Editor } from "@tiptap/react";
import {
  FormatBold,
  FormatItalic,
  FormatListBulleted,
  FormatListNumbered,
  FormatUnderlined,
  Image as ImageIcon,
  InsertEmoticon,
  Link as LinkIcon,
} from "@mui/icons-material";
import {
  Box,
  IconButton,
  Popover,
  Stack,
  Tooltip,
} from "@mui/material";
import EmojiPicker, { type EmojiClickData } from "emoji-picker-react";
import { useRef, useState } from "react";

type SuggestionRichTextToolbarProps = {
  editor: Editor | null;
  onUploadImage: (file: File) => Promise<string>;
  disabled?: boolean;
};

function ToolbarButton({
  title,
  active,
  disabled,
  onClick,
  children,
}: {
  title: string;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <Tooltip title={title}>
      <span>
        <IconButton
          size="small"
          color={active ? "primary" : "default"}
          disabled={disabled === true}
          onClick={onClick}
        >
          {children}
        </IconButton>
      </span>
    </Tooltip>
  );
}

export function SuggestionRichTextToolbar({
  editor,
  onUploadImage,
  disabled = false,
}: SuggestionRichTextToolbarProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const emojiButtonRef = useRef<HTMLButtonElement>(null);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  if (!editor) {
    return null;
  }

  const handleImageSelect = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) {
      return;
    }

    setUploadingImage(true);
    try {
      const url = await onUploadImage(file);
      editor.chain().focus().setImage({ src: url, alt: file.name }).run();
    } finally {
      setUploadingImage(false);
    }
  };

  const handleAddLink = () => {
    const previousUrl = editor.getAttributes("link").href as string | undefined;
    const url = window.prompt("Adresse du lien", previousUrl ?? "https://");
    if (url === null) {
      return;
    }
    if (url.trim() === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  };

  const handleEmojiClick = (emoji: EmojiClickData) => {
    editor.chain().focus().insertContent(emoji.emoji).run();
    setEmojiOpen(false);
  };

  const isDisabled = disabled || uploadingImage;

  return (
    <Box
      sx={{
        borderBottom: 1,
        borderColor: "divider",
        px: 0.5,
        py: 0.25,
      }}
    >
      <Stack direction="row" spacing={0.25} alignItems="center" flexWrap="wrap">
        <ToolbarButton
          title="Gras"
          active={editor.isActive("bold")}
          disabled={isDisabled}
          onClick={() => editor.chain().focus().toggleBold().run()}
        >
          <FormatBold fontSize="small" />
        </ToolbarButton>
        <ToolbarButton
          title="Italique"
          active={editor.isActive("italic")}
          disabled={isDisabled}
          onClick={() => editor.chain().focus().toggleItalic().run()}
        >
          <FormatItalic fontSize="small" />
        </ToolbarButton>
        <ToolbarButton
          title="Souligné"
          active={editor.isActive("underline")}
          disabled={isDisabled}
          onClick={() => editor.chain().focus().toggleUnderline().run()}
        >
          <FormatUnderlined fontSize="small" />
        </ToolbarButton>
        <ToolbarButton
          title="Liste à puces"
          active={editor.isActive("bulletList")}
          disabled={isDisabled}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        >
          <FormatListBulleted fontSize="small" />
        </ToolbarButton>
        <ToolbarButton
          title="Liste numérotée"
          active={editor.isActive("orderedList")}
          disabled={isDisabled}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
        >
          <FormatListNumbered fontSize="small" />
        </ToolbarButton>
        <ToolbarButton
          title="Lien"
          active={editor.isActive("link")}
          disabled={isDisabled}
          onClick={handleAddLink}
        >
          <LinkIcon fontSize="small" />
        </ToolbarButton>
        <ToolbarButton
          title="Image"
          disabled={isDisabled}
          onClick={() => fileInputRef.current?.click()}
        >
          <ImageIcon fontSize="small" />
        </ToolbarButton>
        <Tooltip title="Emoji">
          <span>
            <IconButton
              ref={emojiButtonRef}
              size="small"
              disabled={isDisabled}
              onClick={() => setEmojiOpen(true)}
            >
              <InsertEmoticon fontSize="small" />
            </IconButton>
          </span>
        </Tooltip>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          hidden
          onChange={(event) => void handleImageSelect(event)}
        />
      </Stack>

      <Popover
        open={emojiOpen}
        anchorEl={emojiButtonRef.current}
        onClose={() => setEmojiOpen(false)}
        anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
      >
        <EmojiPicker onEmojiClick={handleEmojiClick} searchPlaceHolder="Rechercher" />
      </Popover>
    </Box>
  );
}
